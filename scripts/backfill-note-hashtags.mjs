#!/usr/bin/env node
// note ハッシュタグ 90 未満のファイルを、同トピックの関連タグで 90 以上へ補充する。
//
// 方針（ハルシネーション禁止）: 新語を創作せず、実在タグのみプールして借用する。
//   優先1 = 同マガジン/同ディレクトリの兄弟 hashtags（最もトピック特化）
//   優先2 = 同カテゴリ（技術士総監/技術士建設部門/1級・2級土木 等）の 90+ ファイル（試験一般で関連）
//   既存タグは保持し、重複を避けて TARGET まで追加。note-publish の 99 打ち切りに配慮し TARGET=93。
//   space 区切り単一行の不良も、行を空白分割して正規化（1 行 1 タグ）してから補充する。
//
// 使い方:
//   node scripts/backfill-note-hashtags.mjs            # dry-run（変更予定を表示・書き込まない）
//   node scripts/backfill-note-hashtags.mjs --apply    # 実書き込み（1 行 1 タグ・# 接頭辞）

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'content/note';
const TARGET = 93;
const APPLY = process.argv.includes('--apply');

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/^hashtags(-[^/]+)?\.txt$/.test(e)) out.push(p.split('\\').join('/'));
  }
  return out;
}

// ファイル → タグ配列（# 除去・空白分割で正規化・重複除去・順序保持）。
function parseTags(file) {
  const seen = new Set();
  const out = [];
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    // 1 行に空白区切りで複数タグが入っている不良も分割して拾う。
    for (const raw of line.split(/\s+/)) {
      const t = raw.trim().replace(/^#/, '');
      if (!t) continue;
      if (seen.has(t)) continue;
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

const catOf = (f) => f.replace(`${ROOT}/`, '').split('/')[0];
// マガジンディレクトリ（magazines/<mag> 配下）を返す。非マガジンは記事親ディレクトリ。
function clusterOf(f) {
  const rel = f.replace(`${ROOT}/`, '');
  const parts = rel.split('/');
  const mi = parts.indexOf('magazines');
  if (mi >= 0 && parts[mi + 1]) return parts.slice(0, mi + 2).join('/'); // <cat>/magazines/<mag>
  return parts.slice(0, -1).join('/'); // 記事ディレクトリ
}

const files = walk(ROOT);
const all = files.map((f) => ({ f, cat: catOf(f), cluster: clusterOf(f), tags: parseTags(f) }));

// カテゴリ別の頻度プール（90+ ファイルのタグを頻度集計）。
const catPool = {};
for (const r of all) {
  if (r.tags.length < 90) continue;
  const m = (catPool[r.cat] ||= new Map());
  for (const t of r.tags) m.set(t, (m.get(t) || 0) + 1);
}
// クラスタ別の頻度プール（同マガジン/同ディレクトリの全ファイル）。
const clusterPool = {};
for (const r of all) {
  const m = (clusterPool[r.cluster] ||= new Map());
  for (const t of r.tags) m.set(t, (m.get(t) || 0) + 1);
}
const ranked = (map) => [...map.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]);

const under = all.filter((r) => r.tags.length < 90);
let fixed = 0;
const report = [];
for (const r of under) {
  const have = new Set(r.tags);
  const before = r.tags.length;
  const add = [];
  const push = (list) => {
    for (const t of list) {
      if (r.tags.length + add.length >= TARGET) break;
      if (have.has(t) || add.includes(t)) continue;
      add.push(t);
    }
  };
  push(ranked(clusterPool[r.cluster] || new Map()).filter((t) => !have.has(t))); // 兄弟優先
  push(ranked(catPool[r.cat] || new Map())); // カテゴリ補完
  const final = [...r.tags, ...add];
  report.push({ f: r.f, before, after: final.length, added: add.length, short: final.length < 90 });
  if (APPLY) writeFileSync(r.f, final.map((t) => `#${t}`).join('\n') + '\n');
  if (final.length >= 90) fixed++;
}

const stillShort = report.filter((x) => x.short);
console.log(`=== backfill-note-hashtags (${APPLY ? 'APPLY' : 'dry-run'}) ===`);
console.log(`対象(90未満): ${under.length} / 90到達: ${fixed} / 到達せず: ${stillShort.length}`);
console.log(`平均追加タグ数: ${Math.round(report.reduce((s, x) => s + x.added, 0) / (report.length || 1))}`);
if (stillShort.length) {
  console.log('\n■ プール不足で90未満のまま（要手動）:');
  for (const x of stillShort) console.log(`  ${x.after} / 90  ${x.f.replace(`${ROOT}/`, '')}`);
}
console.log('\n例（先頭5件 before→after）:');
for (const x of report.slice(0, 5)) console.log(`  ${x.before}→${x.after} (+${x.added})  ${x.f.replace(`${ROOT}/`, '')}`);
if (!APPLY) console.log('\n--apply で書き込み。');
