#!/usr/bin/env node
// check-cce-essay.mjs — コンクリート主任技士 小論文（テーマ別 note 教材＋出題履歴ブロック）の決定的ゲート。
//
// 真実源: config/cce-essay-history.json（出題履歴・テーマ分類・模範答案の型と字数帯）。
// 判定ロジックは scripts/lib/cce-essay.mjs に集約・tests/check-cce-essay.test.mjs で固定。
//
// A. テーマ別教材 = content/note/コンクリート主任技士/**/article.md のうち frontmatter に cceEssayTheme を持つ記事
//   H1 cceEssayTheme が SSOT themes に実在 / H2 cceSourceYears が SSOT の出題年と一致
//   H3 `## 模範答案` と (1)〜(4) の `###` / H4 各パートの字数帯 / H5 (3) に 8 立場の `####`
//   H6 各立場で組み立てた答案の総字数 / H7 問題文の再現節なし / H8 価格直書きなし / H9 paidBoundary 実在
//   立場別記事（cceEssayPersona あり・1立場×1テーマ）: H5 は立場が SSOT にあり (3) に立場見出しが無いこと、
//   H10 は answerModel.personaArticle.requiredH2、H12 は同じテーマの他の立場と (1)・(4) が同じ文面でないこと
// B. 出題履歴ブロック = content/site/concrete-chief-engineer/** と content/note/コンクリート主任技士/** で
//   `cce-essay-history:start` マーカーを持つファイル。マーカー間が SSOT の生成結果と一致すること（--fix で書き換え）。
//
// 使い方:
//   node scripts/check-cce-essay.mjs                  # 全件（CI 用）
//   node scripts/check-cce-essay.mjs --staged         # staged のみ（pre-commit 用）
//   node scripts/check-cce-essay.mjs <path...>        # 指定ファイル（writer/qa の返却前ゲート）
//   node scripts/check-cce-essay.mjs --fix            # 出題履歴ブロックを SSOT から再生成
// exit: 0 合格 / 1 違反あり / 2 検査不成立（全件モードで対象 0 件）
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import matter from 'gray-matter';
import { evaluateCceEssay, extractAnswerParts, extractHistoryBlocks, findSharedPersonaParts, syncHistoryBlock } from './lib/cce-essay.mjs';
import { writeMdxFile } from '../.claude/scripts/lib/mdx-io.mjs';
import { datasetPath } from './lib/datasets.mjs';

const ROOTS = ['content/note/コンクリート主任技士', 'content/site/concrete-chief-engineer'];
const SSOT = datasetPath('config.cce-essay-history');
const STAGED = process.argv.includes('--staged');
const FIX = process.argv.includes('--fix');
const explicit = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const isTarget = (f) => /(^|\/)(article(-[^/]+)?\.md|[^/]+\.mdx)$/.test(f);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (isTarget(e)) out.push(p.split('\\').join('/'));
  }
  return out;
}

const history = JSON.parse(readFileSync(SSOT, 'utf8'));
let files;
if (explicit.length) files = explicit;
else if (STAGED) {
  let staged = [];
  try {
    staged = execFileSync('git', ['-c', 'core.quotepath=false', 'diff', '--cached', '--name-only', '--diff-filter=ACM'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
      .split('\n').map((s) => s.trim()).filter(Boolean);
  } catch { staged = []; }
  // SSOT 自体が staged なら全件を再検査する（履歴ブロックの追従漏れを止める）
  files = staged.includes(SSOT) ? ROOTS.flatMap((r) => walk(r)) : staged.filter((f) => ROOTS.some((r) => f.startsWith(`${r}/`)) && isTarget(f) && existsSync(f));
} else files = ROOTS.flatMap((r) => walk(r));

const missing = files.filter((f) => !existsSync(f));
if (missing.length) {
  for (const f of missing) console.error(`[check-cce-essay] ファイルが無い: ${f}`);
  process.exit(2);
}

// 立場別記事（cceEssayPersona）の (1)・(4) を同じテーマの他の立場と突き合わせるため、検査対象に関わらず全件を読む
const personaEntries = ROOTS.flatMap((r) => walk(r)).flatMap((file) => {
  const { data, content } = matter(readFileSync(file, 'utf8'));
  if (data.cceEssayPersona === undefined || data.cceEssayTheme === undefined) return [];
  return [{ file, theme: data.cceEssayTheme, persona: data.cceEssayPersona, parts: extractAnswerParts(content, history) }];
});
const sharedByFile = new Map();
for (const hit of findSharedPersonaParts(personaEntries, history)) {
  if (!sharedByFile.has(hit.file)) sharedByFile.set(hit.file, []);
  sharedByFile.get(hit.file).push(hit);
}

let essays = 0;
let blocks = 0;
let violations = 0;
for (const file of files) {
  const raw = readFileSync(file, 'utf8');
  const { data, content } = matter(raw);

  if (data.cceEssayTheme !== undefined) {
    essays++;
    const r = evaluateCceEssay(content, data, history);
    for (const hit of sharedByFile.get(file) || []) r.errors.push(`H12: ${hit.key === 'title' ? '(1) 表題' : '(4) 今後の技術的対策・展望'}が同じテーマの ${hit.other} と同じ文面（立場ごとに書く）`);
    const work = typeof r.counts.work === 'number' ? [r.counts.work] : Object.values(r.counts.work || {});
    const range = work.length ? `(3) ${Math.min(...work)}〜${Math.max(...work)} 字` : '(3) -';
    const label = data.cceEssayPersona ? `${data.cceEssayTheme}／${data.cceEssayPersona}` : data.cceEssayTheme;
    console.log(`${r.errors.length ? '✗' : '✓'} ${file} — ${label} / (2) ${r.counts.situation ?? '-'} 字 / ${range} / (4) ${r.counts.action ?? '-'} 字`);
    for (const e of r.errors) console.log(`    ✗ ${e}`);
    if (r.errors.length) violations++;
  }

  const found = extractHistoryBlocks(raw).length;
  if (found) {
    blocks += found;
    const synced = syncHistoryBlock(raw, history);
    if (synced === raw) console.log(`✓ ${file} — 出題履歴ブロック ${found} 件は SSOT と一致`);
    else if (FIX) { writeMdxFile(file, synced); console.log(`↻ ${file} — 出題履歴ブロックを SSOT から再生成`); }
    else { console.log(`✗ ${file} — 出題履歴ブロックが SSOT と不一致（node scripts/check-cce-essay.mjs --fix）`); violations++; }
  }
}

const mode = explicit.length ? '指定' : STAGED ? 'staged' : '全件';
if (essays + blocks === 0) {
  console.log(`[check-cce-essay] 対象 0 件（${mode}・cceEssayTheme 記事も出題履歴ブロックも無い）— 検査していない`);
  process.exit(mode === '全件' ? 2 : 0);
}
console.log(`[check-cce-essay] ${violations ? '✗' : '✓'} ${mode}: 小論文教材 ${essays} 件・出題履歴ブロック ${blocks} 件を実検査 / 違反 ${violations} 件`);
process.exitCode = violations ? 1 : 0;
