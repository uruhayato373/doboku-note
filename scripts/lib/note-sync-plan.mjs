// note-sync-plan.mjs — 公開済み note 記事ごとに「何が未反映か」と「なぜ止まっているか」を 1 か所で決める。
//
// note の記事は本文・カバー・タグを別々の道具で直すと、そのたびにエディタを開いて「更新する」を押すことになる。
// ここで記事単位に未反映のもの（parts）をまとめ、note-update-body --sync が 1 回の更新で全部を反映する。
// 週次の note-sync-routine（Mac）・管理画面（/content/note-sync）・CLI（note-sync-plan）が同じ判定を使う。
//
// 材料（すべてオフライン。note の公開 API は見ない）:
//   本文・タグ・設定・画像/PDF … check-note-republish --json（再公開台帳 note-republish-hashes.json との差）
//   カバー                     … 台帳の coverHashes × 描画入力（note-cover-inventory）× デザイン版
//   中断                       … .claude/state/note-update-aborted.json
// note 上に今カバーが付いているか（画像が消えた等）は公開 API が要るので、CI の check-note-sync が見る。
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseNoteArticle } from './note-frontmatter.mjs';
import { extractBodyImages } from './note-images.mjs';
import { loadNoteCoverInventory } from './note-cover-inventory.mjs';
import { coverInputHash, designVersions, readLedger, sameImage } from './note-cover-live.mjs';

const ABORT_LEDGER = '.claude/state/note-update-aborted.json';
const DRIVE_MANIFEST = '.claude/state/assets/drive-manifest.json';
// 保存前に止まる中断（エディタの本文を汚さない）＝自動で再試行してよい。note-update-body もこの集合を使う。
//   img-settle / img-lost … 画像の CDN 確定待ちで止まった　pdf-missing … 貼り直す PDF が手元に無い（本文を触る前）
//   cover-failed … カバーの差し替えを確認できない（本文を触る前。次回また差し替える）　tags-unreadable … タグを読めない（保存前）
export const SAFE_ABORTS = new Set(['img-settle', 'img-lost', 'pdf-missing', 'cover-failed', 'tags-unreadable']);

/** 止まっている理由の語彙。label＝管理画面の表示、action＝直し方（人が読む 1 行）。 */
export const BLOCKERS = {
  aborted: { label: '前回の更新が途中で止まった', action: 'note の公開ページを確認し、問題なければ note-update-body --sync --article <path> --force-retry --commit' },
  'trial-guard': { label: '会員特典マガジン内の無料記事（公開範囲の指定が要る）', action: '誰でも読めるなら frontmatter に memberTrial: bottom、全文を会員限定にするなら memberTrial: lock を書く' },
  'image-missing': { label: '本文の画像ファイルが手元に無い', action: '画像を記事の img/ に戻す（意図して外すなら本文から画像行を消す）' },
  boundary: { label: '有料境界の基準にする見出しが本文に無い', action: 'frontmatter の paidBoundary に境界の直後に来る H2 の先頭（正規表現）を書く' },
  meta: { label: '題名・価格・有料/無料の設定が変わった', action: '価格は node scripts/note-article-price-sweep.mjs で反映してから同期する（題名は同期の note-update-body が frontmatter の title を反映する）' },
};

function readAborted(root) {
  try { return JSON.parse(readFileSync(join(root, ABORT_LEDGER), 'utf8')).aborted || []; } catch { return []; }
}

/** Drive vault に預けてある配布 PDF がある記事 dir（記事 dir 直下か pdf/ 配下）。 */
export function drivePdfDirs(root) {
  const dirs = new Set();
  try {
    for (const k of Object.keys(JSON.parse(readFileSync(join(root, DRIVE_MANIFEST), 'utf8')).entries || {})) {
      if (!/\.pdf$/i.test(k)) continue;
      const d = dirname(k);
      dirs.add(d.endsWith('/pdf') ? dirname(d) : d);
    }
  } catch { /* 台帳が無ければ原稿と手元だけで判断する */ }
  return dirs;
}

function republishReport(root) {
  const out = execFileSync(process.execPath, ['scripts/check-note-republish.mjs', '--json'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return JSON.parse(out);
}

/**
 * 記事 1 本の状態。純関数（テストから直接呼ぶ）。
 * @param {{ bodyReason: string|null, assetDrift: boolean, tagDrift: boolean, metaDrift: boolean, coverReason: string|null,
 *           abort: {reason: string}|null, imageMissing: string[], pdfPending: boolean, pdfLocal: boolean,
 *           memberTrial?: string|null, boundaryMissing?: boolean }} s
 * @returns {{ parts: string[], reasons: object, status: 'synced'|'ready'|'blocked', blocker: string|null, needsPdfPull: boolean }}
 */
export function classifySync(s) {
  const reasons = {};
  if (s.bodyReason) reasons.body = s.bodyReason;
  else if (s.assetDrift) reasons.body = 'asset'; // 本文の画像・PDF の中身だけが変わった＝本文ごと上げ直す
  if (s.coverReason) reasons.cover = s.coverReason;
  if (s.tagDrift) reasons.tags = 'drift';
  const parts = Object.keys(reasons);
  if (s.metaDrift) return { parts, reasons, status: 'blocked', blocker: 'meta', needsPdfPull: false };
  if (!parts.length) return { parts, reasons, status: 'synced', blocker: null, needsPdfPull: false };
  // 会員特典の公開範囲は frontmatter の memberTrial を書けば解消する（中断台帳は次の成功で消える）
  const trialResolved = s.abort?.reason === 'trial-guard' && s.memberTrial;
  if (s.abort && !SAFE_ABORTS.has(s.abort.reason) && !trialResolved) {
    const blocker = s.abort.reason === 'trial-guard' ? 'trial-guard' : s.abort.reason === 'boundary' ? 'boundary' : 'aborted';
    return { parts, reasons, status: 'blocked', blocker, needsPdfPull: false };
  }
  if (reasons.body && s.boundaryMissing) return { parts, reasons, status: 'blocked', blocker: 'boundary', needsPdfPull: false };
  if (reasons.body && s.imageMissing.length) return { parts, reasons, status: 'blocked', blocker: 'image-missing', needsPdfPull: false };
  // PDF を配る記事の本文更新は、live の添付を貼り直すために PDF の実体が手元に要る。Mac の週次は Drive から取り寄せる。
  const needsPdfPull = Boolean(reasons.body && s.pdfPending && !s.pdfLocal);
  return { parts, reasons, status: 'ready', blocker: null, needsPdfPull };
}

/**
 * 公開済み全記事の同期計画。
 * @returns {Promise<{ items: object[], counts: object, design: object }>}
 */
export async function buildSyncPlan(root = process.cwd()) {
  const rep = republishReport(root);
  const bodySet = new Map();
  for (const f of rep.driftFiles || []) bodySet.set(f, 'drift');
  for (const f of rep.unjudgedDriftFiles || []) bodySet.set(f, 'drift');
  for (const f of rep.unknownFiles || []) bodySet.set(f, 'unrecorded');
  const asset = new Set(rep.assetDriftFiles || []);
  const meta = new Set(rep.metaDriftFiles || []);
  // タグの drift は hashtags*.txt のパスで出る。記事パスへ引き直す（hashtags-II1.txt → article-II1.md）。
  const tagArticles = new Set((rep.tagDriftFiles || []).map((p) => p.replace(/hashtags(-[^/]+)?\.txt$/, (_, s) => `article${s || ''}.md`)));

  const { targets } = await loadNoteCoverInventory(root);
  const ledger = readLedger();
  const design = designVersions(root);
  const aborted = new Map(readAborted(root).map((a) => [a.noteId, a]));
  const drivePdf = drivePdfDirs(root);

  const items = [];
  for (const t of targets) {
    if (t.kind !== 'article' || !t.noteId) continue;
    const path = t.source;
    let a;
    try { a = parseNoteArticle(join(root, path)); } catch { continue; }
    if (!a.data.noteUrl && !a.data.noteId) continue;
    const rec = ledger.articles[path];
    const coverReason = !rec || rec.noteKey !== t.noteId ? 'unrecorded'
      : rec.design !== design.article ? 'design'
        : rec.inputHash !== coverInputHash(t) ? 'input' : null;
    const bodyReason = bodySet.get(path) || null;
    const imageMissing = bodyReason || asset.has(path)
      ? extractBodyImages(a.body, dirname(join(root, path))).missing.filter((m) => m.includes('ファイル無し'))
      : [];
    const c = classifySync({
      bodyReason, assetDrift: asset.has(path), tagDrift: tagArticles.has(path), metaDrift: meta.has(path), coverReason,
      abort: aborted.get(t.noteId) || null, imageMissing, // 原稿が PDF に触れていなくても、Drive に預けた配布 PDF があれば note に添付がある（2026-09-29 工事21 で実測）
      pdfPending: a.pdfPromise || a.localPdfs.length > 0 || drivePdf.has(dirname(path)), pdfLocal: a.localPdfs.length > 0,
      memberTrial: a.data.memberTrial || null, boundaryMissing: a.notePricing === 'paid' && !hasBoundaryHeading(a.body, a.paidBoundary),
    });
    items.push({
      path, noteId: t.noteId, title: a.data.title || (a.body.match(/^#\s+(.+)$/m) || [])[1] || path,
      exam: path.split('/')[2] || '', pricing: a.notePricing || (a.isPaid ? 'paid' : 'free'), images: a.imageCount,
      ...c, abort: aborted.get(t.noteId) || null, imageMissing,
    });
  }
  return { items, counts: countPlan(items), design };
}

/** 状態・部品・止まっている理由ごとの件数。 */
export function countPlan(items) {
  const counts = { synced: 0, ready: 0, blocked: 0, pdfPull: 0, parts: { body: 0, cover: 0, tags: 0 }, blockers: {} };
  for (const i of items) {
    counts[i.status]++;
    if (i.needsPdfPull) counts.pdfPull++;
    if (i.status !== 'synced') for (const p of i.parts) counts.parts[p]++;
    if (i.blocker) counts.blockers[i.blocker] = (counts.blockers[i.blocker] || 0) + 1;
  }
  return counts;
}

/** 有料記事の本文を貼り替えると、境界を paidBoundary（既定: 試験問題|予想問題）の H2 の直前へ引き直す。その H2 が無いと保存前に止まる。 */
export function hasBoundaryHeading(body, paidBoundary) {
  const re = new RegExp('^##\\s+(' + (paidBoundary || '試験問題|予想問題') + ')');
  return String(body).split('\n').some((l) => re.test(l.trim()));
}

/**
 * note の公開 API で読んだ今のカバーを計画へ足す（CI の check-note-sync と Mac の週次が使う）。
 * カバーが無い → no-cover、台帳に記録した画像と違う → live-changed を cover の理由にする。取得できなかった記事は触らない。
 * @param {{items: object[]}} plan buildSyncPlan の戻り値（items を書き換える）
 * @param {Record<string, {eyecatch?: string|null, error?: string}>} liveArticles fetchLiveArticles の戻り値（記事パス→状態）
 */
export function withLiveCovers(plan, liveArticles) {
  const ledger = readLedger();
  let changed = 0;
  for (const item of plan.items) {
    const live = liveArticles[item.path];
    if (!live || live.error || item.reasons.cover) continue;
    const rec = ledger.articles[item.path];
    const reason = !live.eyecatch ? no-cover : rec && sameImage(rec.liveUrl, live.eyecatch) === false ? live-changed : null;
    if (!reason) continue;
    item.reasons.cover = reason;
    item.parts = Object.keys(item.reasons);
    if (item.status === synced) item.status = ready;
    changed++;
  }
  return changed;
}

/** 週次が 1 回に流す順番: 本文を伴わないもの（速い）→ 画像なしの本文 → 画像ありの本文。 */
export function orderForRun(items) {
  const weight = (i) => (!i.parts.includes('body') ? 0 : i.images ? 2 : 1);
  return items.filter((i) => i.status === 'ready').sort((a, b) => weight(a) - weight(b) || a.path.localeCompare(b.path));
}

