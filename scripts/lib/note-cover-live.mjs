// note-cover-live.mjs — note 上のカバー（記事 eyecatch・マガジン cover）が最新かを判定する共有ロジック。
//
// 判定の材料は 3 つだけ:
//   1. 対象一覧と描画入力 … note-cover-inventory（生成器と同じ入力・同じポーズ）
//   2. 台帳 … .claude/state/note-republish-hashes.json の coverHashes / magazineCovers（記事単位の再公開台帳に統合）。
//      登録した画像のデザイン版・入力ハッシュ・sha256・登録直後に note API で読んだ画像 URL を 1 件ずつ持つ
//   3. note の公開 API … 今 note に出ている画像 URL
// 手元の PNG の有無は見ない（カバー PNG は Git 管理外で、置いてある checkout とない checkout がある）。
//
// 使うのは CI の check-note-sync（判定だけ）・Mac の週次 note-sync-routine（マガジンの登録）・lib/note-sync-plan（記事の反映計画）。
// 同じ判定を 2 か所に書かないため、どちらもこのファイルの planCoverWork を呼ぶ。
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { fetchNoteDetails, fetchCreatorMagazines } from './note-api.mjs';
import { parseNoteText } from './note-meta.mjs';
import { readCoverRecords, saveCoverRecords } from './note-republish-hash.mjs';
import { NOTE_CREATOR } from './site-identity.mjs';

const TOKENS_PATH = '.claude/knowledge/design-system/note-cover-tokens.json';
// note掲載文.txt が live の説明文と一致しないマガジンは src/lib/note-magazines.ts の noteUrl で同定する
const MAGAZINE_KEY_OVERRIDE = { 'magazine:river-consultant': 'm32132ecb3033', 'magazine:general-contractor': 'm32aaa137f22e' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** デザイン版（記事・マガジン別）。見た目を変えたら note-cover-tokens.json の designVersion を上げる＝全件が再登録対象になる。 */
export function designVersions(root) {
  const v = JSON.parse(readFileSync(join(root, TOKENS_PATH), 'utf8')).designVersion;
  if (!v?.article || !v?.magazine) throw new Error(`${TOKENS_PATH} に designVersion.article / designVersion.magazine が無い`);
  return v;
}

/**
 * 描画入力のハッシュ。文言・色が変われば変わる。ポーズは含めない——ポーズは同じ資格の直前の対象で決まるので、
 * 記事を 1 本足すと後ろの記事のポーズがずれることがあり、含めると内容の変わらない記事まで大量に再登録になる。
 */
export function coverInputHash(target) {
  const { poseSelection, ...input } = target.input;
  return createHash('sha256').update(JSON.stringify(input)).digest('hex').slice(0, 16);
}

/** 台帳（記事・マガジンのカバー記録）。root は互換のための引数で、台帳は cwd 相対の再公開台帳を読む。 */
export function readLedger() {
  return readCoverRecords();
}

export function writeLedger(_root, ledger) {
  saveCoverRecords(ledger);
}

/** 登録直後に呼ぶ。liveUrl は note API で読み直した URL（読めなければ記録しない＝次回また対象になる）。 */
export function recordCover(ledger, target, { design, noteKey, liveUrl, sha256 }) {
  const entry = { noteKey, design, inputHash: coverInputHash(target), sha256, liveUrl, registeredAt: new Date().toISOString() };
  if (target.kind === 'article') ledger.articles[target.key] = entry;
  else ledger.magazines[target.key] = { ...entry, magazineDir: target.imagePath.replace(/\/_cover\.png$/, '') };
}

/** 記事の公開状態とカバー URL。取得失敗は error 付きで返す（空の記事として扱わない）。 */
export async function fetchLiveArticles(targets, { delayMs = 250, onProgress } = {}) {
  const out = {};
  const list = targets.filter((t) => t.kind === 'article' && t.noteId);
  for (const [i, t] of list.entries()) {
    const r = await fetchNoteDetails(t.noteId, { retries: 2 });
    const d = r.data;
    out[t.key] = d
      ? { noteKey: t.noteId, status: d.status, isDraft: d.is_draft, isReserved: d.is_reserved, publishAt: d.publish_at, price: d.price, eyecatch: d.eyecatch || null }
      : { noteKey: t.noteId, error: r.error };
    if (onProgress && (i + 1) % 100 === 0) onProgress(i + 1, list.length);
    await sleep(delayMs);
  }
  return out;
}

/**
 * マガジン対象を公開マガジンへ同定する。台帳に noteKey があればそれを使い、無ければ note掲載文.txt の説明文の
 * 先頭一致（25 字以上）→ 手当て表の順。同定できないものは reason 付きで返す。
 */
export async function fetchLiveMagazines(root, targets, ledger) {
  const live = await fetchCreatorMagazines(NOTE_CREATOR);
  const byKey = new Map(live.map((m) => [m.key, m]));
  const norm = (s) => (s || '').normalize('NFKC').replace(/\s+/g, '');
  const prefix = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };
  const out = {};
  for (const t of targets.filter((x) => x.kind === 'magazine')) {
    const dir = t.imagePath.replace(/\/_cover\.png$/, '');
    let hit = byKey.get(ledger.magazines[t.key]?.noteKey) || byKey.get(t.noteKey) || null;
    const txtPath = join(root, dir, 'note掲載文.txt');
    if (!hit && existsSync(txtPath)) {
      const desc = norm(parseNoteText(readFileSync(txtPath, 'utf8')).description);
      let best = null; let score = 0;
      for (const m of live) { const s = prefix(desc, norm(m.description)); if (s > score) { score = s; best = m; } }
      if (score >= 25) hit = best;
    }
    if (!hit && MAGAZINE_KEY_OVERRIDE[t.key]) hit = byKey.get(MAGAZINE_KEY_OVERRIDE[t.key]) || null;
    out[t.key] = hit
      ? { noteKey: hit.key, status: hit.status, price: hit.price, cover: hit.cover, magazineDir: dir }
      : { noteKey: null, magazineDir: dir, reason: existsSync(txtPath) ? 'note掲載文.txt が公開一覧に一致しない' : 'note掲載文.txt が無い' };
  }
  // 同じ公開マガジンへ 2 つ以上が同定されたら、どちらも登録しない（取り違えて上書きしない）
  const seen = new Map();
  for (const [k, v] of Object.entries(out)) if (v.noteKey) seen.set(v.noteKey, [...(seen.get(v.noteKey) || []), k]);
  for (const keys of seen.values()) if (keys.length > 1) for (const k of keys) out[k] = { noteKey: null, magazineDir: out[k].magazineDir, reason: `同定が重複（${keys.join(' / ')}）` };
  return out;
}

/**
 * 対象ごとに「最新／要登録／保留」を決める。
 *   pending.reason: no-cover（note にカバーが無い）/ unrecorded（台帳に無い）/ design（デザイン版が古い）/
 *                   input（文言・色が変わった）/ live-changed（台帳の登録後に note 側の画像が変わった）
 *   hold.reason: 未公開・予約・API 取得失敗・マガジン未同定など、登録しようがないもの
 */
export function planCoverWork({ targets, ledger, design, liveArticles, liveMagazines }) {
  const ok = []; const pending = []; const hold = [];
  for (const t of targets) {
    const isArticle = t.kind === 'article';
    const live = isArticle ? liveArticles[t.key] : liveMagazines[t.key];
    const base = { key: t.key, kind: t.kind };
    if (isArticle) {
      if (!t.noteId) { hold.push({ ...base, reason: t.noteStatus === 'draft' ? '下書き（noteId 無し）' : 'noteId 無し（未公開）' }); continue; }
      if (!live || live.error) { hold.push({ ...base, noteKey: t.noteId, reason: `公開 API で取得できない（${live?.error || '未取得'}）` }); continue; }
      if (live.isReserved) { hold.push({ ...base, noteKey: t.noteId, reason: `予約公開中（${live.publishAt}）` }); continue; }
      if (live.isDraft || live.status !== 'published') { hold.push({ ...base, noteKey: t.noteId, reason: `status=${live.status}` }); continue; }
    } else {
      if (!live?.noteKey) { hold.push({ ...base, reason: live?.reason || '公開マガジンに同定できない' }); continue; }
      if (live.status && live.status !== 'public') { hold.push({ ...base, noteKey: live.noteKey, reason: `status=${live.status}` }); continue; }
    }
    const noteKey = isArticle ? t.noteId : live.noteKey;
    const liveUrl = isArticle ? live.eyecatch : live.cover;
    const rec = (isArticle ? ledger.articles : ledger.magazines)[t.key];
    const want = { design: design[t.kind], inputHash: coverInputHash(t) };
    const item = { ...base, noteKey, liveUrl, imagePath: t.imagePath, source: t.source };
    let reason = null;
    if (!liveUrl) reason = 'no-cover';
    else if (!rec || rec.noteKey !== noteKey) reason = 'unrecorded';
    else if (rec.design !== want.design) reason = 'design';
    else if (rec.inputHash !== want.inputHash) reason = 'input';
    else if (sameImage(rec.liveUrl, liveUrl) === false) reason = 'live-changed';
    (reason ? pending : ok).push(reason ? { ...item, reason } : item);
  }
  return { ok, pending, hold };
}

// note の画像 URL はクエリ（幅・品質）が付いたり外れたりするので、パス部分で比べる
export function sameImage(a, b) {
  if (!a || !b) return null;
  const path = (u) => { try { return new URL(u).pathname; } catch { return u; } };
  return path(a) === path(b);
}

export function summarize(plan) {
  const count = (xs, f) => xs.reduce((m, x) => ({ ...m, [f(x)]: (m[f(x)] || 0) + 1 }), {});
  return {
    ok: count(plan.ok, (x) => x.kind),
    pending: count(plan.pending, (x) => `${x.kind}:${x.reason}`),
    hold: count(plan.hold, (x) => x.kind),
  };
}
