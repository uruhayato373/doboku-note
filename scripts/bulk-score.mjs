#!/usr/bin/env node
/**
 * バルク自動採点スクリプト
 *
 * 未採点のキーワードページを5軸ルーブリックで機械的に採点し、
 * quality-scores.json にマージする。
 *
 * Usage:
 *   node scripts/bulk-score.mjs              # 未採点ページのみ採点
 *   node scripts/bulk-score.mjs --all        # 全ページを再採点
 *   node scripts/bulk-score.mjs --dry-run    # 採点結果を表示するが保存しない
 *   node scripts/bulk-score.mjs --summary    # 保存済みスコアの集計のみ
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, basename, dirname } from 'node:path';
import { execSync } from 'node:child_process';

const POSTS_DIR = 'content/site/pe-comprehensive-management';
const SCORES_PATH = '.claude/state/quality-scores.json';

const WEIGHTS = {
  structure: 0.30,
  mobile: 0.25,
  principle: 0.20,
  reference: 0.15,
  linking: 0.10,
};

// ── CLI ─────────────────────────────────────────────────────────────────────

const allMode = process.argv.includes('--all');
const dryRun = process.argv.includes('--dry-run');
const summaryOnly = process.argv.includes('--summary');

// ── ヘルパー ────────────────────────────────────────────────────────────────

function loadScores() {
  if (!existsSync(SCORES_PATH)) {
    return { version: 1, scored_at: new Date().toISOString(), pages: {} };
  }
  return JSON.parse(readFileSync(SCORES_PATH, 'utf8'));
}

function saveScores(data) {
  data.scored_at = new Date().toISOString();
  writeFileSync(SCORES_PATH, JSON.stringify(data, null, 2) + '\n');
}

function getKeywordSlugs() {
  const slugs = [];
  if (!existsSync(POSTS_DIR)) return slugs;
  for (const entry of readdirSync(POSTS_DIR)) {
    const mdx = join(POSTS_DIR, entry, 'article.mdx');
    if (!existsSync(mdx)) continue;
    const content = readFileSync(mdx, 'utf8');
    if (content.includes('group: keyword') || /tags:\s*\n\s*-\s*keyword/.test(content)) {
      slugs.push(entry);
    }
  }
  return slugs.sort();
}

// ── lint-mdx-mobile.mjs 実行 ───────────────────────────────────────────────

function runLint(filePath) {
  try {
    const output = execSync(`node .claude/scripts/lint-mdx-mobile.mjs "${filePath}" 2>&1`, {
      encoding: 'utf8',
      timeout: 30000,
    });
    return parseLintOutput(output);
  } catch (e) {
    // lint がエラーで終了しても stdout には結果がある
    return parseLintOutput(e.stdout || '');
  }
}

function parseLintOutput(output) {
  const lines = output.split('\n');
  let high = 0, medium = 0, low = 0;
  const cat9Violations = [];

  for (const line of lines) {
    // 個別違反行のみカウント（Summary 行を除外）
    if (/^\[HIGH\]/.test(line)) high++;
    if (/^\[MEDIUM\]/.test(line)) medium++;
    if (/^\[LOW\]/.test(line)) low++;
    // カテゴリ9のルール違反を検出
    const ruleMatch = line.match(/\[(9-\d)\]/);
    if (ruleMatch) cat9Violations.push(ruleMatch[1]);
  }

  return { high, medium, low, cat9Violations };
}

// ── 5軸機械採点 ─────────────────────────────────────────────────────────────

function scorePage(slug) {
  const mdxPath = join(POSTS_DIR, slug, 'article.mdx');
  const content = readFileSync(mdxPath, 'utf8');
  const lines = content.split(/\r?\n/);

  // frontmatter を抽出
  const fm = extractFrontmatter(content);
  // 本文（frontmatter 後）
  const bodyStart = content.indexOf('---', content.indexOf('---') + 3);
  const body = bodyStart > 0 ? content.substring(bodyStart + 3) : content;

  // lint 実行
  const lint = runLint(mdxPath);

  const scores = {
    structure: scoreStructure(fm, body, lines),
    mobile: scoreMobile(lint),
    principle: scorePrinciple(lint, body),
    reference: scoreReference(body),
    linking: scoreLinking(fm, body),
  };

  // 加重スコア
  let weighted = 0;
  for (const [axis, score] of Object.entries(scores)) {
    weighted += score * WEIGHTS[axis];
  }

  // 0点クランプ
  if (Object.values(scores).some(s => s === 0)) {
    weighted = Math.min(weighted, 1.0);
  }

  weighted = Math.round(weighted * 100) / 100;

  // 弱点軸
  const weak_axes = Object.entries(scores)
    .filter(([_, s]) => s <= 1)
    .map(([axis]) => axis);

  return { slug, scores, weighted, weak_axes };
}

function extractFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const fm = {};
  const lines = match[1].split(/\r?\n/);
  for (const line of lines) {
    const kv = line.match(/^(\w[\w-]*):\s*(.+)/);
    if (kv) fm[kv[1]] = kv[2].replace(/^['"]|['"]$/g, '');
  }
  return fm;
}

function scoreStructure(fm, body, lines) {
  // frontmatter 必須6項目
  const required = ['title', 'seoTitle', 'description', 'category', 'tags', 'published'];
  const fmComplete = required.every(k => {
    // tags は配列なので特殊
    if (k === 'tags') return body.includes('tags:') || lines.some(l => l.includes('tags:'));
    return fm[k] !== undefined;
  });
  if (!fmComplete) return 0;

  // セクション順序チェック
  const hasToha = /^##\s.*とは/.test(body) || /^##\s.*とは/.test(lines.join('\n'));
  const hasIchizuke = body.includes('## 総合技術監理における位置づけ');
  const hasSankou = body.includes('## 参考資料');

  if (!hasIchizuke && !hasSankou) return 1;

  // 順序: 位置づけ が 参考資料 より前
  if (hasIchizuke && hasSankou) {
    const ichiIdx = body.indexOf('## 総合技術監理における位置づけ');
    const sankouIdx = body.indexOf('## 参考資料');
    if (ichiIdx < sankouIdx) return 3;
    return 2; // 逆順
  }

  return 2; // 片方だけある
}

function scoreMobile(lint) {
  if (lint.high >= 2) return 0;
  if (lint.high === 1 || lint.medium >= 3) return 1;
  if (lint.medium >= 1) return 2;
  return 3;
}

function scorePrinciple(lint, body) {
  // カテゴリ9の重大違反
  const critical9 = lint.cat9Violations.filter(v => ['9-1', '9-3', '9-5', '9-6'].includes(v));
  if (critical9.length > 0) return 0;

  // ExamPoint の数をチェック
  const examPointCount = (body.match(/<ExamPoint/g) || []).length;
  if (examPointCount >= 3) return 0;

  // 9-2 (ExamPoint 位置) があれば軽微
  if (lint.cat9Violations.includes('9-2')) return 2;

  // ExamPoint が概念説明後に配置されているか（簡易チェック）
  if (examPointCount === 0) return 2; // ExamPoint なし = やや弱い

  return 3;
}

function scoreReference(body) {
  // ## 参考資料 セクションを抽出
  const refMatch = body.match(/## 参考資料\s*\r?\n([\s\S]*?)(?=\r?\n## |\r?\n# |$)/);
  if (!refMatch) return 0;

  const refSection = refMatch[1];
  const links = [...refSection.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g)];

  if (links.length === 0) return 0;
  if (links.length === 1) {
    // 1件のみ → トップページチェック
    const url = links[0][2];
    if (isTopPage(url)) return 1;
    return 1; // 1件のみは常に1点
  }

  // 公的/民間の分類
  let hasPublic = false;
  let hasPrivate = false;
  for (const [, , url] of links) {
    if (isTopPage(url)) continue; // トップページはカウントしない
    if (isPublicDomain(url)) hasPublic = true;
    else hasPrivate = true;
  }

  if (hasPublic && hasPrivate) return 3;
  if (hasPublic || hasPrivate) return 2;
  return 1;
}

function isPublicDomain(url) {
  return /\.(go\.jp|or\.jp|ac\.jp|lg\.jp|ed\.jp)\b/.test(url) ||
    /\bnrc\.gov\b/.test(url) ||
    /\bgoogle\.com\/.*architecture/.test(url);
}

function isTopPage(url) {
  // ドメイン直下のトップページ判定
  try {
    const u = new URL(url);
    return u.pathname === '/' || u.pathname === '';
  } catch {
    return false;
  }
}

function scoreLinking(fm, body) {
  const hasSection = fm.section !== undefined;
  const hasIchizuke = body.includes('## 総合技術監理における位置づけ');

  // 内部リンクの数
  const internalLinks = (body.match(/\[([^\]]+)\]\(\/docs\/[^)]+\)/g) || []).length;

  if (!hasSection && !hasIchizuke) return 0;
  if (!hasIchizuke) return 1;

  if (hasSection && hasIchizuke && internalLinks >= 3) return 3;
  if (internalLinks >= 1) return 2;
  return 1;
}

// ── メイン ───────────────────────────────────────────────────────────────────

function main() {
  const data = loadScores();
  const allSlugs = getKeywordSlugs();

  if (summaryOnly) {
    printSummary(data, allSlugs);
    return;
  }

  const scoredSet = new Set(Object.keys(data.pages));
  const targets = allMode
    ? allSlugs
    : allSlugs.filter(s => !scoredSet.has(s));

  console.log(`bulk-score: ${targets.length} ページを採点します（全 ${allSlugs.length} ページ中）\n`);

  if (targets.length === 0) {
    console.log('全ページ採点済みです。--summary で結果を確認できます。');
    return;
  }

  let done = 0;
  const newResults = [];

  for (const slug of targets) {
    const result = scorePage(slug);
    newResults.push(result);

    if (!dryRun) {
      data.pages[slug] = {
        slug,
        scores: result.scores,
        weighted: result.weighted,
        weak_axes: result.weak_axes,
        scored_at: new Date().toISOString(),
        scoring_method: 'auto',
      };
    }

    done++;
    if (done % 50 === 0) {
      process.stderr.write(`  ... ${done}/${targets.length}\n`);
    }
  }

  // 結果集計
  const pass = newResults.filter(r => r.weighted >= 2.0).length;
  const fail = newResults.filter(r => r.weighted < 2.0).length;

  console.log(`\n=== 採点結果 ===`);
  console.log(`合格 (weighted >= 2.0): ${pass} 件`);
  console.log(`不合格 (weighted < 2.0): ${fail} 件`);
  console.log(`合格率: ${(pass / newResults.length * 100).toFixed(1)}%\n`);

  // スコア分布
  console.log('weighted 分布:');
  const bins = { '0.0-1.0': 0, '1.0-1.5': 0, '1.5-2.0': 0, '2.0-2.5': 0, '2.5-3.0': 0 };
  for (const r of newResults) {
    if (r.weighted < 1.0) bins['0.0-1.0']++;
    else if (r.weighted < 1.5) bins['1.0-1.5']++;
    else if (r.weighted < 2.0) bins['1.5-2.0']++;
    else if (r.weighted < 2.5) bins['2.0-2.5']++;
    else bins['2.5-3.0']++;
  }
  for (const [range, count] of Object.entries(bins)) {
    const bar = '#'.repeat(Math.round(count / 2));
    console.log(`  ${range}: ${String(count).padStart(4)} ${bar}`);
  }

  // 不合格リスト
  if (fail > 0) {
    console.log(`\n不合格ページ (${fail} 件):`);
    const failPages = newResults
      .filter(r => r.weighted < 2.0)
      .sort((a, b) => a.weighted - b.weighted);
    for (const r of failPages) {
      const axes = Object.entries(r.scores).map(([k, v]) => `${k[0]}:${v}`).join(' ');
      console.log(`  ${r.slug.padEnd(40)} w=${r.weighted.toFixed(2)}  ${axes}`);
    }
  }

  // 弱点軸の統計
  console.log('\n弱点軸の出現頻度 (score <= 1):');
  const axisCounts = { structure: 0, mobile: 0, principle: 0, reference: 0, linking: 0 };
  for (const r of newResults) {
    for (const axis of r.weak_axes) axisCounts[axis]++;
  }
  for (const [axis, count] of Object.entries(axisCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${axis.padEnd(12)}: ${count} 件`);
  }

  if (!dryRun) {
    saveScores(data);
    console.log(`\n${SCORES_PATH} に保存しました (total: ${Object.keys(data.pages).length} ページ)`);
  } else {
    console.log('\n--dry-run: 保存しませんでした');
  }
}

function printSummary(data, allSlugs) {
  const pages = Object.values(data.pages);
  const total = pages.length;
  const pass = pages.filter(p => p.weighted >= 2.0).length;
  const fail = total - pass;

  console.log(`=== quality-scores.json サマリ ===`);
  console.log(`総キーワードページ: ${allSlugs.length}`);
  console.log(`採点済み: ${total}`);
  console.log(`未採点: ${allSlugs.length - total}`);
  console.log(`合格: ${pass} (${(pass/total*100).toFixed(1)}%)`);
  console.log(`不合格: ${fail} (${(fail/total*100).toFixed(1)}%)`);

  // 自動 vs 手動
  const autoScored = pages.filter(p => p.scoring_method === 'auto').length;
  const manualScored = total - autoScored;
  console.log(`\n採点方法: 自動=${autoScored}, cem-qa=${manualScored}`);
}

main();
