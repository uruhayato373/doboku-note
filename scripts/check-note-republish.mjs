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
//   node scripts/check-note-republish.mjs --baseline [--since <ref>]
//       中央state に現ハッシュを記録して in-sync 化。--since 指定時は <ref>..HEAD で変更された記事は
//       「live=旧本文」なので ref時点の旧ハッシュを記録し drift として残す（正直な初期化）。
//
// これは surfacer であって pre-commit ゲートではない（ソース修正→後で公開の間のドリフトは正常）。

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { bodyHash, tagsHashFile, tagsHashRaw, loadState, saveState, STATE } from './lib/note-republish-hash.mjs';

const ROOT = 'docs/note';
const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const BASELINE = args.includes('--baseline');
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
    const out = execFileSync('git', ['-c', 'core.quotepath=false', 'diff', '--name-only', `${SINCE}..HEAD`], { encoding: 'utf8' });
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
const synced = [], drift = [], unknown = [];
let baselined = 0;
for (const f of files) {
  const raw = readFileSync(f, 'utf8');
  { const u = fm(raw, 'noteUrl'); if (!u || u === 'TBD') continue; } // 未公開ドラフト(noteUrl 無し/TBD)は対象外
  const cur = bodyHash(raw);
  const rec = st.hashes[f];

  if (BASELINE) {
    if (SINCE && changedSet.has(f)) {
      // ref以降に変更＝live は旧本文。ref時点の旧ハッシュを記録し drift として出す。新規記事は unknown。
      let old = null;
      try { old = bodyHash(execFileSync('git', ['show', `${SINCE}:${f}`], { encoding: 'utf8' })); } catch { /* ref時点に無い */ }
      if (old && old !== cur) { st.hashes[f] = old; baselined++; drift.push(f); }
      else if (old) { st.hashes[f] = cur; baselined++; synced.push(f); }
      else unknown.push(f);
      continue;
    }
    st.hashes[f] = cur; baselined++; synced.push(f);
    continue;
  }

  if (!rec) unknown.push(f);
  else if (rec === cur) synced.push(f);
  else drift.push(f);
}

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

if (BASELINE) { st.updatedAt = new Date().toISOString().slice(0, 10); saveState(st); }

if (JSON_OUT) {
  console.log(JSON.stringify({
    synced: synced.length, drift: drift.length, unknown: unknown.length, driftFiles: drift, unknownFiles: unknown,
    tagSynced: tagSynced.length, tagDrift: tagDrift.length, tagUnknown: tagUnknown.length, tagDriftFiles: tagDrift, tagUnknownFiles: tagUnknown,
  }, null, 2));
  process.exit(0);
}
if (BASELINE) {
  console.log(`[check-note-republish] 本文 baseline=${baselined}（drift=${drift.length}）／タグ baseline=${tagBaselined}（drift=${tagDrift.length}）${SINCE ? ` (--since ${SINCE})` : ''}`);
  console.log(`  state: ${STATE}`);
  process.exit(0);
}
console.log(`[check-note-republish] 公開記事=${synced.length + drift.length + unknown.length}  synced=${synced.length}  要再公開(本文drift)=${drift.length}  未初期化=${unknown.length}`);
console.log(`[check-note-republish] タグ: 公開=${tagSynced.length + tagDrift.length + tagUnknown.length}  synced=${tagSynced.length}  要再公開(タグdrift)=${tagDrift.length}  未初期化=${tagUnknown.length}`);
if (drift.length) {
  console.log('\n■ 要再公開（本文が公開時から変更）:');
  for (const f of drift) console.log('  ' + f.replace(/^docs\/note\//, '').replace(/\/article\.md$/, ''));
}
if (tagDrift.length) {
  console.log('\n■ 要再公開（ハッシュタグが公開時から変更）:');
  for (const f of tagDrift) console.log('  ' + f.replace(/^docs\/note\//, ''));
}
if (unknown.length) console.log(`\n□ 本文未初期化 ${unknown.length}件（baseline で初期化するか要再公開判断）`);
if (tagUnknown.length) console.log(`□ タグ未初期化 ${tagUnknown.length}件（baseline で初期化）`);
process.exit(0);
