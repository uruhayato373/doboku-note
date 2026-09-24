#!/usr/bin/env node
// note 再公開ドリフト検出（source-hash dirty-flag）。
// 公開済み記事（frontmatter に noteUrl あり）の「現ソース本文ハッシュ」を、公開時に記録した
// ハッシュ（中央state: .claude/state/note-republish-hashes.json・path→hash）と突合し、
// 変わっていれば「要再公開」を surface する。CTA に限らず全本文変更を捕捉。
//
// 運用の真実源: .claude/knowledge/reference/note-funnel-architecture.md（ソース→ライブ非同期）。
//   funnel D5(CTAのlive反映) を補完し、blockquote/cover-body/UTM 等の本文変更も追う。
// 限界: note.com 上で直接編集した変更（ソース経由でない）は捕捉外＝verify-note-status/D5(live)の領域。
//
// 使い方:
//   node scripts/check-note-republish.mjs                 # レポート（surfacer・exit 0）
//   node scripts/check-note-republish.mjs --json          # 機械可読（admin/weekly 用）
//   node scripts/check-note-republish.mjs --baseline-meta-asset
//       meta(価格/境界/カバー定義) と asset(PDF/カバー画像) のトラックだけを現状で初期化する。
//       本文・タグの drift 状態は触らない。**新トラック追加時は --baseline を使わないこと**
//       （--baseline は現ソース=live と仮定するため未反映記事の drift を消してしまう）。
//   node scripts/check-note-republish.mjs --baseline [--since <ref>]
//       中央state に現ハッシュを記録して in-sync 化。--since 指定時は <ref>..HEAD で変更された記事は
//       「live=旧本文」なので ref時点の旧ハッシュを記録し drift として残す（正直な初期化）。
//   node scripts/check-note-republish.mjs --record-canon
//       等価判定用の canon（記録時の版の canonBodyHash）を台帳 canonHashes に書き足す。同期済みは現本文から、
//       drift は git 履歴で復元した記録時の版から作る。本文・タグの drift 状態は変えない。浅い clone の CI は
//       履歴を引けないので、ローカルで一度回して台帳を commit しておく（以後の公開は recordPublishedHash が書く）。
//
// 本文 drift のうち、記録時の版との差分が旧 /docs → 新 URL（public/_redirects の対応・クエリ保持）の
// 張り替えだけのものは「301 等価」として要再公開から外して別に数える。本番は旧 /docs を 301 で同じ行き先へ
// 転送するので、再公開しなくても live は壊れていない（2026-09-24: PR #598 で要再公開が 674 本になり、
// 本当に要る 404 修正の 1 本が埋もれた・DN-0297）。記録時の版が分からない記事は判定不能として要再公開に残す。
//
// これは surfacer であって pre-commit ゲートではない（ソース修正→後で公開の間のドリフトは正常）。

import { readFileSync, readdirSync, existsSync, writeSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { bodyHash, canonBodyHash, canonEntry, classifyBodyDrift, tagsHashFile, tagsHashRaw, metaHash, assetHash, loadState, saveState, STATE } from './lib/note-republish-hash.mjs';
import { findRecordedVersions } from './lib/note-republish-history.mjs';
import { loadSiteRoutes } from './lib/site-links.mjs';
import { todayJst } from './lib/jst-date.mjs';

const ROOT = 'content/note';
const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const BASELINE = args.includes('--baseline');
// meta/asset トラックだけを初期化する。本文・タグの drift 状態は一切触らない。
// --baseline は「現ソース＝live」と仮定するため、**未反映の記事を反映済みと誤記録する**
// （2026-08-03 に実際にやってしまい、未反映 176 本の drift を消した）。新トラックを後から
// 足すときは全体 baseline ではなくこちらを使う。
const BASELINE_META_ASSET = args.includes('--baseline-meta-asset');
const RECORD_CANON = args.includes('--record-canon');
const SINCE = (() => { const i = args.indexOf('--since'); return i >= 0 ? args[i + 1] : null; })();

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name).replaceAll('\\', '/'); // Windows の \ を state キー(/)に正規化
    if (name.isDirectory()) walk(p, acc);
    // 型別ファイル（article-II1.md 等）も対象。BK-02〜11 は大半がこの形式で、
    // article.md のみを見ていた頃はドリフト検出から丸ごと漏れていた（2026-07-28 修正）。
    // 下の articleForTags() が hashtags-II1.txt → article-II1.md を解決しているのと整合させる。
    else if (/^article(-[^/\\]+)?\.md$/.test(name.name)) acc.push(p);
  }
  return acc;
}
function fm(raw, key) {
  const m = raw.match(new RegExp('^' + key + ':\\s*(.*)$', 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
}

let changedSet = null, changedTagSet = null;
if (SINCE) {
  try {
    const out = execFileSync('git', ['-c', 'core.quotepath=false', 'diff', '--name-only', `${SINCE}..HEAD`], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
    const all = out.split('\n').map((s) => s.trim());
    changedSet = new Set(all.filter((s) => /\/article(-[^/]+)?\.md$/.test(s)));
    changedTagSet = new Set(all.filter((s) => /(^|\/)hashtags(-[^/]+)?\.txt$/.test(s)));
  } catch (e) {
    console.error(`[check-note-republish] --since ${SINCE} の git diff に失敗: ${e.message}`);
    process.exit(2);
  }
}

const st = loadState();
const files = walk(ROOT);
const routes = loadSiteRoutes();
const canonState = (st.canonHashes ||= {});
const setCanon = (f, e) => { if (e) canonState[f] = e; else delete canonState[f]; };
let canonRecorded = 0;
const synced = [], drift = [], unknown = [];
// 本文 hash が記録と違う記事。ループ後に「要再公開」と「301 等価」に分ける
const driftCand = [];
// live 影響メタ（価格/有料境界/カバー定義）とアセット（PDF・カバー画像）は本文 hash に入らない。
// 本文を1文字も変えずに価格や PDF を差し替えると「要再公開」が立たず、購入者が古い実体を受け取り続ける。
const metaDrift = [], metaUnknown = [], assetDrift = [], assetUnknown = [];
let baselined = 0;
for (const f of files) {
  const raw = readFileSync(f, 'utf8');
  { const u = fm(raw, 'noteUrl'); if (!u || u === 'TBD') continue; } // 未公開ドラフト(noteUrl 無し/TBD)は対象外
  const cur = bodyHash(raw);
  const rec = st.hashes[f];

  if (BASELINE_META_ASSET) {
    // 本文・タグには触れず meta/asset のみ現状で初期化（以後の変更は全て検知される）
    (st.metaHashes ||= {})[f] = metaHash(raw);
    (st.assetHashes ||= {})[f] = assetHash(f);
    baselined++;
    continue;
  }
  if (BASELINE) {
    if (SINCE && changedSet.has(f)) {
      // ref以降に変更＝live は旧本文。ref時点の旧ハッシュを記録し drift として出す。新規記事は unknown。
      let oldRaw = null;
      try { oldRaw = execFileSync('git', ['show', `${SINCE}:${f}`], { encoding: 'utf8' }); } catch { /* ref時点に無い */ }
      const old = oldRaw == null ? null : bodyHash(oldRaw);
      if (old && old !== cur) { st.hashes[f] = old; setCanon(f, canonEntry(oldRaw, routes)); baselined++; drift.push(f); }
      else if (old) { st.hashes[f] = cur; setCanon(f, canonEntry(raw, routes)); baselined++; synced.push(f); }
      else unknown.push(f);
      continue;
    }
    st.hashes[f] = cur;
    setCanon(f, canonEntry(raw, routes));
    (st.metaHashes ||= {})[f] = metaHash(raw);
    (st.assetHashes ||= {})[f] = assetHash(f);
    baselined++; synced.push(f);
    continue;
  }

  if (!rec) unknown.push(f);
  else if (rec === cur) {
    synced.push(f);
    if (RECORD_CANON && routes.loaded && canonState[f]?.of !== cur) { setCanon(f, canonEntry(raw, routes)); canonRecorded++; }
  }
  else driftCand.push({ file: f, rec, cur, curCanon: routes.loaded ? canonBodyHash(raw, routes) : null });

  // meta / asset は本文とは独立トラック（反映手段が別: 価格は note-edit、PDF は note-attach-file、
  // カバーは note-update-cover）。同じ記事が同時に複数トラックで drift しうる。
  const mCur = metaHash(raw);
  const mRec = (st.metaHashes || {})[f];
  if (mRec === undefined) metaUnknown.push(f); else if (mRec !== mCur) metaDrift.push(f);

  const aCur = assetHash(f);
  const aRec = (st.assetHashes || {})[f];
  if (aRec === undefined) { if (aCur !== 'none') assetUnknown.push(f); }
  else if (aRec !== aCur) assetDrift.push(f);
}

// ---- 本文 drift の等価判定（記録時の版との差分が旧 /docs → 新 URL の張り替えだけか） ----
// 記録時の版の canon は台帳 canonHashes（of が一致するときだけ）を使い、無ければ git 履歴から版を復元する。
const equivalent = [], unjudged = [];
let historyAvailable = null, canonFromHistory = 0;
if (driftCand.length && routes.loaded) {
  const need = driftCand.filter((c) => canonState[c.file]?.of !== c.rec);
  let found = new Map();
  if (need.length) ({ available: historyAvailable, found } = findRecordedVersions(need.map(({ file, rec }) => ({ file, rec }))));
  for (const c of driftCand) {
    let recCanon = canonState[c.file]?.of === c.rec ? canonState[c.file].canon : null;
    if (!recCanon && found.has(c.file)) {
      const e = canonEntry(found.get(c.file), routes);
      recCanon = e.canon;
      canonFromHistory++;
      if (RECORD_CANON) { canonState[c.file] = e; canonRecorded++; }
    }
    const kind = classifyBodyDrift({ rec: c.rec, cur: c.cur, recCanon, curCanon: c.curCanon });
    if (kind === 'equivalent') equivalent.push(c.file);
    else { drift.push(c.file); if (kind === 'unjudged') unjudged.push(c.file); }
  }
} else {
  // _redirects を読めないと張り替えの対応が分からない＝全件判定不能として要再公開に残す
  for (const c of driftCand) { drift.push(c.file); unjudged.push(c.file); }
}
const unjudgedReason = !routes.loaded
  ? 'public/_redirects を読めない'
  : historyAvailable === false
    ? '浅い clone で git 履歴が無い（--record-canon を回した台帳が要る）'
    : '記録時の版が git 履歴に見つからない（移動・履歴の切り詰め）';

// ---- タグ再公開ドリフト（hashtags*.txt 単位・本文とは独立トラック） ----
function walkTags(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name).replaceAll('\\', '/');
    if (name.isDirectory()) walkTags(p, acc);
    else if (/^hashtags(-[^/]+)?\.txt$/.test(name.name)) acc.push(p);
  }
  return acc;
}
// hashtags ファイル → 対応 article ファイル（hashtags-II1.txt → article-II1.md、hashtags.txt → article.md）
function articleForTags(hp) {
  const dir = hp.replace(/\/[^/]+$/, '');
  const m = hp.replace(/^.*\//, '').match(/^hashtags(-[^.]+)?\.txt$/);
  const cand = `${dir}/article${m && m[1] ? m[1] : ''}.md`;
  return existsSync(cand) ? cand : null;
}

const tagState = (st.tagHashes ||= {});
const tagSynced = [], tagDrift = [], tagUnknown = [];
let tagBaselined = 0;
for (const hp of walkTags(ROOT)) {
  const art = articleForTags(hp);
  if (!art) continue;
  { const u = fm(readFileSync(art, 'utf8'), 'noteUrl'); if (!u || u === 'TBD') continue; } // 未公開(noteUrl 無し/TBD)は対象外（次回公開時にタグ適用）
  const cur = tagsHashFile(hp);
  if (cur == null) continue;
  const rec = tagState[hp];
  if (BASELINE) {
    if (SINCE && changedTagSet && changedTagSet.has(hp)) {
      let old = null;
      try { old = tagsHashRaw(execFileSync('git', ['show', `${SINCE}:${hp}`], { encoding: 'utf8' })); } catch { /* ref時点に無い */ }
      if (old && old !== cur) { tagState[hp] = old; tagBaselined++; tagDrift.push(hp); }
      else if (old) { tagState[hp] = cur; tagBaselined++; tagSynced.push(hp); }
      else tagUnknown.push(hp);
      continue;
    }
    tagState[hp] = cur; tagBaselined++; tagSynced.push(hp);
    continue;
  }
  if (!rec) tagUnknown.push(hp);
  else if (rec === cur) tagSynced.push(hp);
  else tagDrift.push(hp);
}

if (BASELINE || BASELINE_META_ASSET) { st.updatedAt = todayJst(); saveState(st); }
else if (RECORD_CANON) {
  // canon は同期状態を変えないので updatedAt は触らない（台帳を並行で書く ops-write との衝突を減らす）
  saveState(st);
  if (!JSON_OUT) console.log(`[check-note-republish] canon を記録 ${canonRecorded} 件（同期済みは現本文から・drift は git 履歴から ${canonFromHistory} 件復元）／台帳の canon ${Object.keys(canonState).length} 件`);
}
if (BASELINE_META_ASSET) {
  console.log(`[check-note-republish] meta/asset のみ baseline=${baselined} 件（本文・タグの drift 状態は不変）`);
  console.log(`  state: ${STATE}`);
  console.log('  注意: 初期化時点で live とズレているメタ/アセットは検知できない（以後の変更は全て検知される）');
  process.exit(0);
}

if (JSON_OUT) {
  // **console.log + process.exit は組み合わせてはいけない**（stdout がパイプのとき非同期書き込みになり、
  // exit が保留分を捨てる）。この JSON は 67KB あり、execFileSync 経由だと 4,822 文字で切れて
  // 「Unterminated string in JSON」になっていた（2026-08-20、管理画面の要再公開列で発覚）。
  // 同期書き込み（writeSync）にして取りこぼしを構造的に無くす。
  writeSync(1, JSON.stringify({
    synced: synced.length, drift: drift.length, unknown: unknown.length, driftFiles: drift, unknownFiles: unknown,
    // drift には入れない（再公開不要）。unjudged は drift に含めたうえでの内訳
    equivalentDrift: equivalent.length, equivalentDriftFiles: equivalent,
    unjudgedDrift: unjudged.length, unjudgedDriftFiles: unjudged, unjudgedReason: unjudged.length ? unjudgedReason : null,
    tagSynced: tagSynced.length, tagDrift: tagDrift.length, tagUnknown: tagUnknown.length, tagDriftFiles: tagDrift, tagUnknownFiles: tagUnknown,
    metaDrift: metaDrift.length, metaUnknown: metaUnknown.length, metaDriftFiles: metaDrift, metaUnknownFiles: metaUnknown,
    assetDrift: assetDrift.length, assetUnknown: assetUnknown.length, assetDriftFiles: assetDrift, assetUnknownFiles: assetUnknown,
  }, null, 2) + '\n');
  process.exit(0);
}
if (BASELINE) {
  console.log(`[check-note-republish] 本文 baseline=${baselined}（drift=${drift.length}）／タグ baseline=${tagBaselined}（drift=${tagDrift.length}）${SINCE ? ` (--since ${SINCE})` : ''}`);
  console.log(`  state: ${STATE}`);
  process.exit(0);
}
console.log(`[check-note-republish] 公開記事=${synced.length + drift.length + equivalent.length + unknown.length}  synced=${synced.length}  要再公開(本文drift)=${drift.length}  301等価(張り替えだけ)=${equivalent.length}  未初期化=${unknown.length}`);
if (unjudged.length) console.log(`[check-note-republish]   うち等価を判定できず要再公開に残した=${unjudged.length}（${unjudgedReason}）`);
console.log(`[check-note-republish] タグ: 公開=${tagSynced.length + tagDrift.length + tagUnknown.length}  synced=${tagSynced.length}  要再公開(タグdrift)=${tagDrift.length}  未初期化=${tagUnknown.length}`);
console.log(`[check-note-republish] メタ(価格/境界/カバー定義): drift=${metaDrift.length}  未初期化=${metaUnknown.length}／アセット(本文画像/PDF/カバー): drift=${assetDrift.length}  未初期化=${assetUnknown.length}`);
if (drift.length) {
  console.log('\n■ 要再公開（本文が公開時から変更）:');
  for (const f of drift) console.log('  ' + f.replace(/^content\/note\//, '').replace(/\/article\.md$/, ''));
}
if (equivalent.length) {
  console.log(`\n□ 301 等価 ${equivalent.length} 本（live は旧 /docs リンクのままだが、本番の 301 で同じ行き先へ転送され UTM も残る。再公開は不要で、次に本文を直して再公開するときに一緒に反映される。一覧は --json の equivalentDriftFiles）`);
}
if (tagDrift.length) {
  console.log('\n■ 要再公開（ハッシュタグが公開時から変更）:');
  for (const f of tagDrift) console.log('  ' + f.replace(/^content\/note\//, ''));
}
if (metaDrift.length) {
  console.log('\n■ 要反映（価格/有料境界/カバー定義が公開時から変更）:');
  for (const f of metaDrift) console.log('  ' + f.replace(/^content\/note\//, '').replace(/\/article\.md$/, ''));
  console.log('  → 価格/境界: note-update-body --commit --boundary-h2 / note-article-price-sweep、カバー: note-update-cover --commit');
}
if (assetDrift.length) {
  console.log('\n■ 要反映（本文画像・PDF 添付・カバー画像の実体が変更）:');
  for (const f of assetDrift) console.log('  ' + f.replace(/^content\/note\//, '').replace(/\/article\.md$/, ''));
  console.log('  → 本文画像: note-update-body --commit（毎回アップロードし直す）、PDF: note-attach-file --commit（差し替えは note 側の旧カード削除が要る）、カバー: note-update-cover --commit');
}
if (unknown.length) console.log(`\n□ 本文未初期化 ${unknown.length}件（baseline で初期化するか要再公開判断）`);
if (metaUnknown.length) console.log(`□ メタ未初期化 ${metaUnknown.length}件（baseline で初期化）`);
if (assetUnknown.length) console.log(`□ アセット未初期化 ${assetUnknown.length}件（baseline で初期化）`);
if (tagUnknown.length) console.log(`□ タグ未初期化 ${tagUnknown.length}件（baseline で初期化）`);
// 末尾で process.exit(0) を呼ばない（上と同じ理由。自然終了なら stdout は必ず flush される）
