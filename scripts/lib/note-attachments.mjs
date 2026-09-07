/**
 * note-attachments.mjs
 * ---------------------------------------------------------------------------
 * 「その note 記事に添付されているべき配布 PDF」の期待値と、保存で添付を落とさないための
 * ゲート判定を1か所に集める。
 *
 * なぜ共通化するか: 期待値の算出（記事 dir の PDF ∪ 退避台帳）は check-note-attachments が
 * 持っていたが、**保存を伴う編集経路**（価格変更・境界再設定）は期待値を一切見ずに保存して
 * いた。片側だけが正しいと「実査は緑なのに、次の保存で消える」が起きる（2026-09-05
 * nded084d4f646 の添付喪失）。判定を共有し、どちらの経路も同じ規則で動かす。
 *
 * ここに置くのは **決定的な純関数**（fs 読み取りを含むが、ブラウザには触れない）だけ。
 * Playwright の計測は呼び出し側が行い、その数値をここへ渡して判定する。
 * ---------------------------------------------------------------------------
 */
import { readdirSync, readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { PDF_PROMISE_RE } from './note-frontmatter.mjs';

/** 型別 article-II1.md 等を落とさない（`join()` の `\` 区切りに引っかからないようファイル名で判定する）。 */
export const ARTICLE_RE = /^article(-[^/\\]+)?\.md$/;

const TYPE_PDF = { II1: /-II-1-/, II2: /-II-2-/, III: /-III-/ };

// 配布 PDF は DN-0111 Phase 4-D で Git 追跡から外し、2026-09-05 に Google Drive vault（人 tier）
// へ移した。ディスクを readdir するだけでは CI・新規 clone で「実体が無い」になるため、
// 退避台帳（sha256 付き）に載っているものは「在る」と数える。
const manifestCache = new Map();
function manifestPdfsByDir(root) {
  if (manifestCache.has(root)) return manifestCache.get(root);
  const byDir = new Map();
  for (const file of ['manifest.json', 'drive-manifest.json']) {
    let m;
    try { m = JSON.parse(readFileSync(join(root, '.claude/state/assets', file), 'utf8')); } catch { continue; }
    for (const [logical, e] of Object.entries(m.entries || {})) {
      if (e.group !== 'note-delivery-pdf' || !e.sha256 || typeof e.bytes !== 'number') continue;
      const abs = join(root, logical);
      const d = dirname(abs);
      if (!byDir.has(d)) byDir.set(d, []);
      byDir.get(d).push(abs);
    }
  }
  manifestCache.set(root, byDir);
  return byDir;
}

/** dir 直下の PDF を「ディスク実体 ∪ 退避台帳」で列挙する。 */
export function pdfsIn(dir, root) {
  const disk = existsSync(dir) ? readdirSync(dir).filter((f) => /\.pdf$/i.test(f)).map((f) => join(dir, f)) : [];
  return [...new Set([...disk, ...(manifestPdfsByDir(root).get(dir) || [])])];
}

/** 記事ファイルに対して「添付されているべき PDF」を実体から決める（frontmatter に依存しない）。 */
export function expectedPdfs(file, { root }) {
  const dir = dirname(file);
  const name = file.split(/[\\/]/).pop();
  const here = pdfsIn(dir, root);
  const nested = pdfsIn(join(dir, 'pdf'), root);
  const type = (name.match(/^article-(.+)\.md$/) || [])[1];
  if (type && TYPE_PDF[type]) {
    const hit = here.find((p) => TYPE_PDF[type].test(p.split(/[\\/]/).pop()));
    return hit ? [hit] : [];
  }
  // 型別 article がある dir の素の article.md は、型別の PDF を自分のものと見なさない
  if (!type) {
    const siblingTyped = readdirSync(dir).some((f) => /^article-.+\.md$/.test(f));
    if (siblingTyped) return nested;
  }
  return [...here, ...nested];
}

/** content/note 配下の article*.md を再帰列挙する（globSync は Node22+ のため使わない）。 */
export function walkArticles(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkArticles(p, acc);
    else if (ARTICLE_RE.test(e.name)) acc.push(p);
  }
  return acc;
}

export function frontmatterValue(raw, key) {
  const block = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  return (block.match(new RegExp('^' + key + ':\\s*(?:"(.*?)"|\'(.*?)\'|(.+?))\\s*$', 'm')) || []).slice(1).find(Boolean) || '';
}

/**
 * 公開済み記事の noteId → 期待添付 の対応表。保存を伴う経路が noteId しか持たないため、
 * 記事ファイルを引き当てて期待値を出せるようにする。
 */
export function expectationsByNoteId({ root, base = join(root, 'content/note') }) {
  const map = new Map();
  if (!existsSync(base)) return map;
  for (const file of walkArticles(base)) {
    const raw = readFileSync(file, 'utf8');
    const noteId = frontmatterValue(raw, 'noteId');
    if (!noteId) continue;
    const status = frontmatterValue(raw, 'noteStatus');
    if (status && status !== 'published') continue;
    const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---/, '');
    map.set(noteId, {
      file: relative(root, file).replace(/\\/g, '/'),
      expected: expectedPdfs(file, { root }).map((p) => relative(root, p).replace(/\\/g, '/')),
      promises: PDF_PROMISE_RE.test(body),
    });
  }
  return map;
}

/**
 * 保存**前**のゲート。エディタで実測した添付数が期待を下回るなら保存しない。
 * 目的は「壊れた状態のエディタを正として上書きすること」を止めること。
 * 期待が 0 件の記事（配布 PDF が無い）は通す。
 * @param {{expected:number, before:number}} args
 */
export function evaluatePreSaveGate({ expected, before }) {
  if (!Number.isFinite(expected) || !Number.isFinite(before)) {
    return { ok: false, reason: '添付数を計測できていない（保存に進まない）' };
  }
  if (expected > 0 && before < expected) {
    return { ok: false, reason: `保存前の添付が期待を下回る ${before}/${expected}（エディタが壊れている疑い）` };
  }
  return { ok: true, reason: expected > 0 ? `保存前の添付 ${before}/${expected} を確認` : '配布 PDF なし' };
}

/** 保存**後**の照合。減っていたら負債として記録する（保存は済んでいるので検出＋記録が仕事）。 */
export function evaluatePostSaveGate({ before, after }) {
  if (!Number.isFinite(before) || !Number.isFinite(after)) {
    return { ok: false, reason: '保存後の添付数を計測できていない' };
  }
  if (after < before) return { ok: false, reason: `添付が減少 ${before}→${after}` };
  return { ok: true, reason: `添付 ${before} 件維持` };
}

/**
 * live 実査の暫定不足が「本当に不足」か「取り逃し（偽陰性）」かを、確定パスへ回すかで決める。
 * 全件走査は待ちが短く、遅い記事で添付カードの描画に間に合わないことがある。
 */
export function needsConfirm({ live, want }) {
  return Number.isFinite(live) && Number.isFinite(want) && live < want;
}

/**
 * 添付を失った/失いかけた事実を負債として残す。
 * 「保存していないから無害」は live に限った話で、放置すると次の実行が「添付なし」を正として
 * 保存してしまう。check-note-delivery-due が未解消を surface する。
 */
export function recordAttachmentLoss({ root, noteId, reason, dropped = [] }) {
  const lossPath = join(root, '.claude/state/note-attachment-loss.json');
  try {
    const j = existsSync(lossPath) ? JSON.parse(readFileSync(lossPath, 'utf8')) : { pending: [] };
    j.pending = (j.pending || []).filter((x) => x.noteId !== noteId);
    j.pending.push({
      noteId, at: new Date().toISOString(), reason, dropped,
      note: '再添付するまで負債。note-attach-batch 成功時に自動で消える',
    });
    mkdirSync(dirname(lossPath), { recursive: true });
    writeFileSync(lossPath, JSON.stringify(j, null, 2) + '\n');
    return { ok: true, path: lossPath };
  } catch (e) {
    return { ok: false, path: lossPath, error: e.message };
  }
}
