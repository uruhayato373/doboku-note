#!/usr/bin/env node
// note 導線 L3 CTA 配線スクリプト（config 駆動・冪等・既存非破壊）。
//
// 各記事の「冒頭（最初の H2 の前）」にパック動線、「末尾」に同資格 L2 もくじへの
// 回遊 CTA を冪等マーカー付きで挿入する。再実行しても重複しない。
//
// 真実源: .claude/config/note-funnel.json / docs/reference/note-funnel-architecture.md
//
// 使い方:
//   node scripts/wire-note-funnel-cta.mjs --exam tankan            # dry-run（既定）
//   node scripts/wire-note-funnel-cta.mjs --exam tankan --apply    # 適用
//
// 設計原則: 追加のみ（既存 CTA・おすすめ記事は壊さない）。LF で書き出す。

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = JSON.parse(readFileSync(join(ROOT, '.claude/config/note-funnel.json'), 'utf8'));

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const examKey = (() => { const i = args.indexOf('--exam'); return i >= 0 ? args[i + 1] : null; })();

if (!examKey || !CONFIG.exams[examKey]) {
  console.error('使い方: node scripts/wire-note-funnel-cta.mjs --exam <key> [--apply]');
  console.error('exam keys: ' + Object.keys(CONFIG.exams).join(', '));
  process.exit(2);
}

const ex = CONFIG.exams[examKey];
if (!ex.L2.noteId) {
  console.error(`[skip] exam "${examKey}" は L2 もくじ未構築（config の exams.${examKey}.L2.noteId が空）。先に L2 を作成・公開してください。`);
  process.exit(0);
}
if (!ex.topCta.text && !ex.bottomCta.text) {
  console.error(`[skip] exam "${examKey}" は CTA 文面が未設定（config の topCta.text / bottomCta.text）。`);
  process.exit(0);
}

const baseDir = join(ROOT, ex.articleGlob);
const exclude = new Set(ex.excludeDirs || []);

// 再帰的に article.md を収集する（magazines/ 配下と excludeDirs・もくじ自身は除外）。
// 土木のような入れ子（1級土木/2級土木/{slug}/article.md）にも対応する。
function collectArticles(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (e.name === 'magazines' || exclude.has(e.name)) continue;
      out.push(...collectArticles(join(dir, e.name)));
    } else if (e.name === 'article.md') {
      out.push(dir);
    }
  }
  return out;
}
const articleDirs = collectArticles(baseDir);

let topN = 0, botN = 0, skipTop = 0, skipBot = 0;
for (const adir of articleDirs) {
  const d = { name: adir.slice(baseDir.length + 1) || adir };
  const f = join(adir, 'article.md');
  if (!existsSync(f)) continue;
  let raw = readFileSync(f, 'utf8');
  // 先頭 UTF-8 BOM を除去してから FM 判定（BOM 付きだと ^--- が非マッチ＝NO-FM 無音スキップになる。
  // 2026-07-05 に civil の 2 記事が BOM で wire を素通り→D1 未配線だった再発防止）。除去分は書き出しにも反映＝ハイジーン改善。
  let hadBom = false;
  if (raw.charCodeAt(0) === 0xFEFF) { raw = raw.slice(1); hadBom = true; }
  const m = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  if (!m) { console.log('NO-FM ' + d.name); continue; }
  const head = raw.slice(0, m[0].length);
  let body = raw.slice(m[0].length);
  const actions = [];

  // ナビ/入口記事は冒頭パック CTA を付けない（無料→有料の導線思想に反するため）
  const topExcluded = (ex.topCtaExcludeDirs || []).some(x => d.name === x || d.name.endsWith('/' + x));
  // ディレクトリ接頭辞で冒頭パック CTA を差し替える（例: 2級土木/ 配下は 2級バンクへ）。
  // 資格別セグメントの下の「サブ資格別」上げ導線に対応。マーカーは共通（cta:pack-top）。
  const ovr = (ex.topCtaOverrides || []).find(o => d.name.startsWith(o.dirPrefix));
  const topText = ovr ? ovr.text : ex.topCta.text;
  const topMarker = ovr ? (ovr.marker || ex.topCta.marker) : ex.topCta.marker;
  if (topText && !topExcluded && !body.includes(topMarker)) {
    const h2 = body.search(/^##\s/m);
    if (h2 >= 0) { body = body.slice(0, h2) + topText + '\n\n' + body.slice(h2); actions.push('TOP'); topN++; }
    else { actions.push('TOP-skip(noH2)'); skipTop++; }
  } else if (topText) { skipTop++; }

  if (ex.bottomCta.text && !body.includes(ex.bottomCta.marker)) {
    body = body.replace(/\s*$/, '') + '\n\n---\n\n' + ex.bottomCta.text + '\n';
    actions.push('BOTTOM'); botN++;
  } else if (ex.bottomCta.text) { skipBot++; }

  if (actions.length && APPLY) writeFileSync(f, head + body);
  if (actions.length) console.log((APPLY ? '[apply] ' : '[dry] ') + d.name + ' :: ' + actions.join(','));
}
console.log(`\nexam=${examKey} files=${articleDirs.length} TOP+${topN} BOTTOM+${botN} skipTop=${skipTop} skipBot=${skipBot} mode=${APPLY ? 'APPLY' : 'DRY'}`);
if (!APPLY) console.log('（--apply で適用）');
