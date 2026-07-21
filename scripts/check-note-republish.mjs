#!/usr/bin/env node
// note 再公開ドリフト検出（source-hash dirty-flag）。
// 公開済み記事（frontmatter に noteUrl あり）の「現ソース本文ハッシュ」を、公開時に記録した
// ハッシュ（中央state: .claude/state/note-republish-hashes.json・path→hash）と突合し、
// 変わっていれば「要再公開」を surface する。CTA に限らず全本文変更を捕捉。
//
// 運用の真実源: docs/reference/note-funnel-architecture.md（ソース→ライブ非同期）。
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
import { bodyHash, loadState, saveState, STATE } from './lib/note-republish-hash.mjs';

const ROOT = 'docs/note';
const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const BASELINE = args.includes('--baseline');
const SINCE = (() => { const i = args.indexOf('--since'); return i >= 0 ? args[i + 1] : null; })();

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) walk(p, acc);
    else if (name.name === 'article.md') acc.push(p);
  }
  return acc;
}
function fm(raw, key) {
  const m = raw.match(new RegExp('^' + key + ':\\s*(.*)$', 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
}

let changedSet = null;
if (SINCE) {
  try {
    const out = execFileSync('git', ['-c', 'core.quotepath=false', 'diff', '--name-only', `${SINCE}..HEAD`], { encoding: 'utf8' });
    changedSet = new Set(out.split('\n').map((s) => s.trim()).filter((s) => s.endsWith('/article.md')));
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
  if (!fm(raw, 'noteUrl')) continue; // 未公開ドラフトは対象外
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

if (BASELINE) { st.updatedAt = new Date().toISOString().slice(0, 10); saveState(st); }

if (JSON_OUT) {
  console.log(JSON.stringify({ synced: synced.length, drift: drift.length, unknown: unknown.length, driftFiles: drift, unknownFiles: unknown }, null, 2));
  process.exit(0);
}
if (BASELINE) {
  console.log(`[check-note-republish] baseline 記録=${baselined} → synced=${synced.length} 要再公開(drift)=${drift.length} 未初期化(新規)=${unknown.length}${SINCE ? ` (--since ${SINCE})` : ''}`);
  console.log(`  state: ${STATE}`);
  process.exit(0);
}
console.log(`[check-note-republish] 公開記事=${synced.length + drift.length + unknown.length}  synced=${synced.length}  要再公開(drift)=${drift.length}  未初期化=${unknown.length}`);
if (drift.length) {
  console.log('\n■ 要再公開（ソース本文が公開時から変更されている）:');
  for (const f of drift) console.log('  ' + f.replace(/^docs\/note\//, '').replace(/\/article\.md$/, ''));
}
if (unknown.length) console.log(`\n□ 未初期化 ${unknown.length}件（notePublishedHash 未記録・baseline で初期化するか要再公開判断）`);
process.exit(0);
