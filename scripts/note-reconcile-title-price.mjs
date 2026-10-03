#!/usr/bin/env node
/**
 * note-reconcile-title-price.mjs — note 商品の題名・価格を、公開中の note と照合して原稿（正本）へ揃える準備をする
 * ---------------------------------------------------------------------------
 * 正本は原稿（2026-10-01 決定）。記事＝frontmatter の title / price（見出し 1 は title と同じ）、マガジン＝note-magazines.ts の noteTitle / price。
 * note の値は原稿へ取り込まない。食い違いを見つけたら「note へ未反映」に戻し、原稿の値で note を上げ直させる。
 *
 *   題名が違う → 再公開台帳の titleHashes を外す（live-mismatch）→ 週次の Mac note-sync-routine が
 *                note-update-body --sync の title 部品で原稿の題名を note へ反映する（自動）
 *   価格が違う → metaHashes を外す → 同期計画で「止まっている（価格）」になる → 人が note-article-price-sweep で原稿の価格を反映する
 *                （売上に直結するので自動では書かない）
 *   マガジンの noteTitle が違う → 報告だけ（note-edit-magazine で原稿の名前を反映する）
 *
 * 原稿の中だけで直すもの: 公開済みなのに title / price が無い記事は note の値で埋める（欠けた正本を作るだけ）、見出し 1 を title に揃える。
 * 見出し 1 は note の本文に載らない（公開・更新とも除く）ので、揃えても本文の再公開は要らない（同期済みだった記事は本文の記録も進める）。
 *
 * --adopt-live: 一回きりの整理用。note の値を正として原稿の title / price とマガジンの noteTitle を書き換える（2026-10-01 に 1 度だけ使った）。
 *
 * 週次: .github/workflows/note-live-audit.yml が --commit で回して develop へ commit する。
 * 取得は note 公開 API（curl --ssl-no-revoke・認証不要）。記事の取得失敗が 20% を超えるかマガジン一覧が取れなければ検査不成立で exit 1。
 *
 * 使い方:
 *   node scripts/note-reconcile-title-price.mjs              # dry-run
 *   node scripts/note-reconcile-title-price.mjs --commit     # 原稿の欠け・見出し 1 を直し、食い違いを「note へ未反映」に戻す
 *   node scripts/note-reconcile-title-price.mjs --adopt-live --commit   # note を正として原稿を書き換える（一回きりの整理）
 * ---------------------------------------------------------------------------
 */
import { readFileSync, readdirSync, writeFileSync, writeSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { bodyHash, canonBodyHash, metaHash, titleHash, TITLE_LIVE_MISMATCH, loadState, saveState } from './lib/note-republish-hash.mjs';
import { loadSiteRoutes } from './lib/site-links.mjs';
import { todayJst } from './lib/jst-date.mjs';
import { NOTE_CREATOR as CREATOR } from './lib/site-identity.mjs';

const args = process.argv.slice(2);
const COMMIT = args.includes('--commit');
const ADOPT_LIVE = args.includes('--adopt-live');
const JSON_OUT = args.includes('--json');
const FILTER = args.includes('--filter') ? args[args.indexOf('--filter') + 1] : null;
const ROOT = 'content/note';
const SOT = 'src/lib/note-magazines.ts';
const THROTTLE_MS = 250;
const MAX_FETCH_FAIL_RATE = 0.2;

function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name).replaceAll('\\', '/');
    if (e.isDirectory()) walk(p, acc);
    else if (/^article(-[^/\\]+)?\.md$/.test(e.name)) acc.push(p);
  }
  return acc;
}
const sleep = (ms) => spawnSync(process.execPath, ['-e', `setTimeout(()=>{},${ms})`]);
function curlJson(url) {
  let last = 'unknown';
  for (let a = 0; a < 4; a++) {
    const r = spawnSync('curl', ['-sS', '-m', '30', '--ssl-no-revoke', '-H', 'User-Agent: Mozilla/5.0', '-H', 'Accept: application/json', url], { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
    const b = (r.stdout || '').trim();
    if (b.startsWith('{')) {
      try { const d = JSON.parse(b).data; if (d) return { data: d }; last = 'data なし'; } catch (e) { last = `parse: ${e.message}`; }
    } else last = (r.stderr || '').trim().split('\n')[0] || `non-json (${b.slice(0, 40)})`;
    sleep(1200 * (a + 1));
  }
  return { error: last };
}

const toLf = (s) => s.replace(/\r\n?/g, '\n');
const fmBlock = (src) => src.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? null;
/** frontmatter を除いた本文（LF の文字列から）。frontmatter が無ければ全体 */
const bodyOf = (src) => src.replace(/^---\n[\s\S]*?\n---\n?/, '');
// note-publish / note-update-body の fmField と同じ読み方（引用符の中をそのまま読む）
const fmField = (fm, k) => (fm.match(new RegExp('^' + k + ':\\s*(?:"(.*?)"|\'(.*?)\'|(.+?))\\s*$', 'm')) || []).slice(1).find(Boolean) || '';
const quote = (s) => (s.includes('"') ? `'${s.replace(/'/g, "''")}'` : `"${s}"`);

/** frontmatter の欄を置き換える（無ければ noteId → noteUrl → 末尾の順にその直後へ足す）。LF で扱う */
function setField(src, key, val) {
  const fm = fmBlock(src);
  const line = `${key}: ${val}`;
  const re = new RegExp(`^${key}:.*$`, 'm');
  let next;
  if (re.test(fm)) next = fm.replace(re, line);
  else {
    const anchor = ['noteId', 'noteUrl'].map((k) => new RegExp(`^(${k}:.*)$`, 'm')).find((r) => r.test(fm));
    next = anchor ? fm.replace(anchor, `$1\n${line}`) : `${fm}\n${line}`;
  }
  return src.replace(`---\n${fm}\n---`, `---\n${next}\n---`);
}

// ---- 記事 ----
const targets = [];
for (const f of walk(ROOT)) {
  if (FILTER && !f.includes(FILTER)) continue;
  const raw = readFileSync(f, 'utf8');
  const fm = fmBlock(toLf(raw));
  if (!fm) continue;
  const id = fmField(fm, 'noteId') || fmField(fm, 'noteUrl').match(/n[0-9a-f]{10,}/)?.[0];
  if (!id) continue; // 未公開
  targets.push({ f, raw, fm, id });
}

const st = loadState();
const routes = loadSiteRoutes();
st.titleHashes ||= {};
st.metaHashes ||= {};
const r = { checked: targets.length, fetchFail: 0, edited: [], toPush: [], pending: [], titleRecorded: 0 };
targets.forEach((t, i) => {
  if (i) sleep(THROTTLE_MS);
  if (!JSON_OUT && i && i % 100 === 0) process.stderr.write(`  ...${i}/${targets.length}\n`);
  const { data, error } = curlJson(`https://note.com/api/v3/notes/${t.id}`);
  if (!data) { r.fetchFail++; if (!JSON_OUT) console.error(`  取得失敗 ${t.f}: ${error}`); return; }
  const liveName = String(data.name ?? '').trim();
  const livePrice = Number(data.price ?? 0);
  const paid = fmField(t.fm, 'notePricing') === 'paid';
  const curTitle = fmField(t.fm, 'title');
  const curPrice = Number(fmField(t.fm, 'price')) || 0;

  // 原稿の中で直すもの（欠けた正本を埋める・--adopt-live なら note の値で上書き・見出し 1 を揃える）
  const changes = [];
  let title = curTitle;
  let price = curPrice;
  if (liveName && (!curTitle || (ADOPT_LIVE && curTitle !== liveName))) { title = liveName; changes.push(`題名 ${curTitle ? `「${curTitle}」→` : 'を埋めた'}「${liveName}」`); }
  if (paid && livePrice > 0 && (!curPrice || (ADOPT_LIVE && curPrice !== livePrice))) { price = livePrice; changes.push(`価格 ${curPrice ? `¥${curPrice}→` : 'を埋めた '}¥${livePrice}`); }
  const lf = toLf(t.raw);
  const h1 = bodyOf(lf).match(/^#\s+(.+?)\s*$/m)?.[1] ?? null;
  const fixH1 = Boolean(h1 && title && h1 !== title);
  if (fixH1) changes.push(`見出し 1 を題名に揃えた（${h1}）`);

  let next = t.raw;
  if (changes.length) {
    r.edited.push({ f: t.f, changes });
    let s = lf;
    if (title !== curTitle) s = setField(s, 'title', quote(title));
    if (price !== curPrice) s = setField(s, 'price', String(price));
    if (fixH1) { const body = bodyOf(s); s = s.slice(0, s.length - body.length) + body.replace(/^#\s+.+$/m, `# ${title}`); }
    next = /\r\n/.test(t.raw) ? s.replace(/\n/g, '\r\n') : s;
    if (COMMIT) {
      const metaWasSynced = st.metaHashes[t.f] !== undefined && st.metaHashes[t.f] === metaHash(t.raw);
      const bodyWasSynced = st.hashes?.[t.f] !== undefined && st.hashes[t.f] === bodyHash(t.raw);
      writeFileSync(t.f, next);
      // 原稿へ入れた値は note と同じなので、変更前に同期済みだった記録は進める（未反映の変更は隠さない）
      if (metaWasSynced && (!paid || price === livePrice)) st.metaHashes[t.f] = metaHash(next);
      if (fixH1 && bodyWasSynced) st.hashes[t.f] = bodyHash(next);
      // 301 等価（再公開不要）だった記事は等価の記録も進める（見出し 1 は note に載らないので等価は保たれる）
      const canon = st.canonHashes?.[t.f];
      if (fixH1 && !bodyWasSynced && routes.loaded && canon && canon.of === st.hashes?.[t.f] && canon.canon === canonBodyHash(t.raw, routes)) canon.canon = canonBodyHash(next, routes);
    }
  }

  // 原稿が正: 原稿と note の食い違いは「note へ未反映」に戻す
  const tRec = st.titleHashes[t.f];
  const tCur = titleHash(next);
  if (title && title !== liveName) {
    if (tRec !== undefined && tRec !== tCur) r.pending.push({ f: t.f, what: `題名 原稿「${title}」が note へ未反映（note「${liveName}」）` });
    else { r.toPush.push({ f: t.f, what: `題名 原稿「${title}」≠ note「${liveName}」→ 同期で原稿の題名を反映する` }); if (COMMIT) st.titleHashes[t.f] = TITLE_LIVE_MISMATCH; }
  } else if (title && COMMIT && tRec !== tCur) { st.titleHashes[t.f] = tCur; r.titleRecorded++; }

  if (paid && price && livePrice !== price) {
    const mRec = st.metaHashes[t.f];
    if (mRec !== undefined && mRec !== metaHash(next)) r.pending.push({ f: t.f, what: `価格 原稿¥${price} が note へ未反映（note¥${livePrice}）` });
    else { r.toPush.push({ f: t.f, what: `価格 原稿¥${price} ≠ note¥${livePrice} → 同期で止める（note-article-price-sweep で原稿の価格を反映する）` }); if (COMMIT) st.metaHashes[t.f] = TITLE_LIVE_MISMATCH; }
  }
});

// ---- マガジン（noteTitle）----
const mags = { checked: 0, differs: [], missingOnNote: [], adopted: 0 };
let magFetchOk = true;
if (!FILTER) {
  const live = new Map();
  for (let page = 1; page <= 20; page++) {
    const { data } = curlJson(`https://note.com/api/v2/creators/${CREATOR}/contents?kind=magazine&page=${page}`);
    if (!data) { magFetchOk = false; break; }
    for (const m of data.contents ?? []) live.set(m.key, String(m.name ?? '').trim());
    if (data.isLastPage || !(data.contents ?? []).length) break;
  }
  if (magFetchOk && live.size) {
    const raw = readFileSync(SOT, 'utf8');
    const src = toLf(raw).replace(/\n {2}'([a-z0-9-]+)': \{\n([\s\S]*?)\n {2}\},/g, (whole, id, body) => {
      const key = body.match(/noteUrl:\s*'https:\/\/note\.com\/[^/]+\/m\/(m[0-9a-f]+)'/)?.[1];
      if (!key || /\n {4}retiredAt:/.test('\n' + body)) return whole;
      mags.checked++;
      const name = live.get(key);
      if (!name) { mags.missingOnNote.push(id); return whole; }
      const cur = body.match(/\n {4}noteTitle: '((?:[^'\\]|\\.)*)',/)?.[1]?.replace(/\\(.)/g, '$1');
      if (cur === name) return whole;
      mags.differs.push({ id, source: cur ?? null, live: name });
      // 原稿が正なので書き換えるのは「無い」ときと --adopt-live のときだけ
      if (cur !== undefined && !ADOPT_LIVE) return whole;
      mags.adopted++;
      const esc = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return cur === undefined
        ? whole.replace(/(\n {4}noteUrl:[^\n]*)/, `$1\n    noteTitle: '${esc}',`)
        : whole.replace(/\n {4}noteTitle: '(?:[^'\\]|\\.)*',/, `\n    noteTitle: '${esc}',`);
    });
    if (COMMIT && mags.adopted) writeFileSync(SOT, /\r\n/.test(raw) ? src.replace(/\n/g, '\r\n') : src);
  } else magFetchOk = false;
}

if (COMMIT) { st.updatedAt = todayJst(); saveState(st); }

const inspected = r.checked - r.fetchFail;
const notConclusive = (r.checked > 0 && r.fetchFail / r.checked > MAX_FETCH_FAIL_RATE) || !magFetchOk;
if (JSON_OUT) {
  writeSync(1, JSON.stringify({ mode: ADOPT_LIVE ? 'adopt-live' : 'source-wins', articles: { ...r, inspected }, magazines: { ...mags, fetched: magFetchOk }, notConclusive }, null, 2) + '\n');
} else {
  const show = (label, list, fmt) => {
    console.log(`\n${label}: ${list.length} 件`);
    for (const x of list.slice(0, 40)) console.log(`  - ${fmt(x)}`);
    if (list.length > 40) console.log(`  …ほか ${list.length - 40} 件（--json で全件）`);
  };
  show(COMMIT ? '原稿を直した記事' : '原稿を直す予定の記事', r.edited, (x) => `${x.f}\n      ${x.changes.join('\n      ')}`);
  show(COMMIT ? 'note へ反映し直す対象にした（原稿が正）' : 'note へ反映し直す対象にする予定（原稿が正）', r.toPush, (x) => `${x.f}  ${x.what}`);
  show('原稿の変更が note へ未反映のまま（同期待ち）', r.pending, (x) => `${x.f}  ${x.what}`);
  show(ADOPT_LIVE ? 'noteTitle を note に合わせたマガジン' : 'noteTitle が note と違うマガジン（原稿が正・note-edit-magazine で反映する）', mags.differs, (x) => `${x.id}  原稿「${x.source ?? '（なし）'}」 note「${x.live}」`);
  if (mags.missingOnNote.length) show('note に無いマガジン（retiredAt を付けるか確認）', mags.missingOnNote, (x) => x);
  console.log(`\n[note-reconcile-title-price] ${ADOPT_LIVE ? 'note を正として取り込み' : '原稿が正'} / 記事 公開済み ${r.checked} 本・実検査 ${inspected} 本（取得失敗 ${r.fetchFail}）/ マガジン ${magFetchOk ? `${mags.checked} 件を照合` : '取得失敗（未照合）'}${COMMIT ? ` / 題名の記録 ${r.titleRecorded} 本` : '（dry-run・--commit で直す）'}`);
}
if (notConclusive) {
  console.error(`[note-reconcile-title-price] ✗ 検査不成立: 記事の取得失敗 ${r.fetchFail}/${r.checked} 本（上限 ${MAX_FETCH_FAIL_RATE * 100}%）${magFetchOk ? '' : '・マガジン一覧を取得できない'}`);
  process.exit(1);
}
