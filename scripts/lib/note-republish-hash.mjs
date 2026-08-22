// note 再公開ドリフト検出の共有ロジック（副作用なし・CLI から分離）。
// check-note-republish.mjs（surfacer）と note-publish.mjs / note-update-body.mjs（公開時記録）が共用。
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { todayJst } from './jst-date.mjs';

export const STATE = '.claude/state/note-republish-hashes.json';

// 公開実体に対応する本文ハッシュ。frontmatter を除いた本文を正規化して sha256(先頭16桁)。
// CTA マーカーは含めたまま（本文/CTA いずれの変更も要再公開として捕捉する）。
export function bodyHash(raw) {
  let s = raw.replace(/^﻿/, '');
  s = s.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
  s = s.replace(/\r\n/g, '\n');
  s = s.split('\n').map((l) => l.replace(/\s+$/, '')).join('\n');
  s = s.replace(/\n{3,}/g, '\n\n').trim();
  return createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);
}

export function loadState() {
  if (!existsSync(STATE)) return { version: 1, hashes: {} };
  try { return JSON.parse(readFileSync(STATE, 'utf8')); } catch { return { version: 1, hashes: {} }; }
}
export function saveState(st) {
  mkdirSync(dirname(STATE), { recursive: true });
  writeFileSync(STATE, JSON.stringify(st, null, 2) + '\n');
}

// 公開/フル本文更新スクリプトが「live へ反映成功した」直後に呼ぶ。当該記事の現本文ハッシュを記録し in-sync 化。
// filePath = content/note/.../article.md（リポジトリ相対）。best-effort（失敗しても公開処理は妨げない）。
// 注意: CTA だけを追記する note-append-cta は本文全体を反映しないため呼ばない（フル反映のみ in-sync 化）。
export function recordPublishedHash(filePath) {
  try {
    const key = String(filePath).replaceAll('\\', '/'); // Windows の \ を state キー(/)に正規化（重複キー防止）
    const raw = readFileSync(key, 'utf8');
    const st = loadState();
    st.hashes[key] = bodyHash(raw);
    st.updatedAt = todayJst();
    saveState(st);
    return true;
  } catch { return false; }
}

// ---- ハッシュタグ再公開ドリフト（本文とは別トラック。tagHashes: {hashtagsPath→hash}） ----
// タグはハッシュタグファイル（hashtags.txt / 型別 hashtags-<type>.txt）に持ち、本文 hash には含まれない。
// note-publish が公開時にタグを適用するため、公開時にこのタグ hash を記録し in-sync 化する。
// note-update-body はタグを適用しないので呼ばない（本文のみ反映）。

// タグ集合の正規化 hash。行/空白で分割し # 除去・重複除去・ソート（順序非依存）。
export function tagsHashRaw(raw) {
  const seen = new Set();
  for (const line of String(raw).split(/\r?\n/)) {
    for (const tok of line.split(/\s+/)) {
      const t = tok.trim().replace(/^#/, '');
      if (t) seen.add(t);
    }
  }
  const norm = [...seen].sort().join('\n');
  return createHash('sha256').update(norm, 'utf8').digest('hex').slice(0, 16);
}

// hashtags ファイルパス → タグ hash（読めなければ null）。
export function tagsHashFile(hashtagsPath) {
  try { return tagsHashRaw(readFileSync(String(hashtagsPath).replaceAll('\\', '/'), 'utf8')); }
  catch { return null; }
}

// hashtags ファイルの現タグ hash を tagHashes に記録し in-sync 化。best-effort。
export function recordPublishedTagHash(hashtagsPath) {
  try {
    const key = String(hashtagsPath).replaceAll('\\', '/');
    const h = tagsHashFile(key);
    if (h == null) return false;
    const st = loadState();
    (st.tagHashes ||= {})[key] = h;
    st.updatedAt = todayJst();
    saveState(st);
    return true;
  } catch { return false; }
}

// ---- live 影響メタ（frontmatter）ドリフト（metaHashes: {articlePath→hash}） ----
// 本文 hash は frontmatter を丸ごと落とすため、**note 上の見え方を変えるメタ変更が検知できなかった**。
// 実際に live を変えるのは次の 5 つだけ。noteUrl/noteId/notePublishedAt/noteStatus は
// 「公開した結果」なので含めない（含めると公開直後に必ず drift になる）。
//   coverTitle … note のカバー見出し（cover 画像の再生成 → note-update-cover で反映）
//   cover      … カバー生成パラメータ一式（同上）
//   price      … 価格（note-article-price-sweep / note-edit）
//   notePricing… 有料/無料（同上）
//   paidBoundary … 有料境界の基準 H2（note-update-body --boundary-h2）
const LIVE_META_KEYS = ['notePricing', 'price', 'paidBoundary', 'coverTitle', 'cover'];

/** frontmatter から live 影響キーだけを抜き出して正規化ハッシュ。cover は複数行ブロックなので行継続も拾う。 */
export function metaHash(raw) {
  const m = String(raw).replace(/^\ufeff/, '').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return createHash('sha256').update('', 'utf8').digest('hex').slice(0, 16);
  const lines = m[1].replace(/\r\n/g, '\n').split('\n');
  const picked = [];
  let capturing = false;
  for (const line of lines) {
    const key = (line.match(/^([a-zA-Z0-9_]+):/) || [])[1];
    if (key) capturing = LIVE_META_KEYS.includes(key);
    else if (!/^\s/.test(line)) capturing = false; // インデントされていない継続行は別要素
    if (capturing) picked.push(line.replace(/\s+$/, ''));
  }
  return createHash('sha256').update(picked.join('\n'), 'utf8').digest('hex').slice(0, 16);
}

// ---- アセット（本文画像・PDF 添付・カバー画像）ドリフト（assetHashes: {articlePath→hash}） ----
// note へ載る「ファイルの実体」は markdown に現れない。同じパス・同じ記法のまま**中身だけ**
// 差し替えると本文ハッシュが変わらず、live には古い画像/PDF が残り続ける。
//   - 本文画像: note-update-body が毎回アップロードし直す（insertImagesAtPlaceholders）
//   - PDF:      note-attach-file で添付
//   - カバー:   note-update-cover で差し替え
// 対象は「本文が実際に参照している画像」＋「記事 dir/pdf/ 配下の PDF」＋「img/cover.*」。
// dir 全走査にしないのは、未使用ファイルの増減で偽の drift を出さないため。
const PDF_RE = /\.pdf$/i;
const COVER_RE = /^cover\.(png|jpe?g|webp)$/i;

/** 本文から参照されている画像の相対パス（![](...) と <img src="...">・外部 URL は除く）。 */
export function referencedImages(raw) {
  const body = String(raw).replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
  const out = new Set();
  for (const m of body.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)) out.add(m[1]);
  for (const m of body.matchAll(/<img[^>]*\ssrc=["']([^"']+)["']/g)) out.add(m[1]);
  return [...out].filter((u) => !/^https?:\/\//.test(u));
}

/** 記事パス → live へ持ち込むファイル実体の内容ハッシュ（対象が無ければ 'none'）。 */
export function assetHash(articlePath) {
  const key = String(articlePath).replaceAll('\\', '/');
  const dir = dirname(key);
  const parts = [];
  const add = (label, abs) => {
    try { parts.push(`${label}:${createHash('sha256').update(readFileSync(abs)).digest('hex').slice(0, 16)}`); }
    catch { parts.push(`${label}:MISSING`); } // 参照しているのにファイルが無い＝それ自体ドリフト
  };
  // 1. 本文が参照している画像
  try {
    for (const rel of referencedImages(readFileSync(key, 'utf8')).sort()) {
      add(`body/${rel}`, rel.startsWith('/') ? `.${rel}` : `${dir}/${rel}`);
    }
  } catch { /* 読めなければ後段だけで判定 */ }
  // 2. PDF（記事 dir 直下と dir/pdf）と 3. カバー（img/）
  for (const sub of ['', 'pdf', 'img']) {
    const d = sub ? `${dir}/${sub}` : dir;
    if (!existsSync(d)) continue;
    let names; try { names = readdirSync(d).sort(); } catch { continue; }
    for (const n of names) {
      const isPdf = PDF_RE.test(n);
      const isCover = sub === 'img' && COVER_RE.test(n);
      if (!isPdf && !isCover) continue;
      add(`${sub}/${n}`, `${d}/${n}`);
    }
  }
  return parts.length ? createHash('sha256').update(parts.join('|'), 'utf8').digest('hex').slice(0, 16) : 'none';
}

/** meta / asset の現ハッシュを記録して in-sync 化。反映系スクリプトが成功直後に呼ぶ。 */
export function recordPublishedMetaHash(filePath) {
  try {
    const key = String(filePath).replaceAll('\\', '/');
    const st = loadState();
    (st.metaHashes ||= {})[key] = metaHash(readFileSync(key, 'utf8'));
    st.updatedAt = todayJst();
    saveState(st);
    return true;
  } catch { return false; }
}
export function recordPublishedAssetHash(filePath) {
  try {
    const key = String(filePath).replaceAll('\\', '/');
    const st = loadState();
    (st.assetHashes ||= {})[key] = assetHash(key);
    st.updatedAt = todayJst();
    saveState(st);
    return true;
  } catch { return false; }
}
