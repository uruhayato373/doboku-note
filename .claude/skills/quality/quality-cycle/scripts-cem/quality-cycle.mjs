#!/usr/bin/env node
/**
 * Quality Cycle オーケストレータ
 *
 * 詳細アーキテクチャは .claude/skills/quality/quality-cycle/DESIGN.md 参照。
 *
 * Usage:
 *   node scripts/quality-cycle.mjs --mode screen
 *   node scripts/quality-cycle.mjs --mode score [--top 200] [--slug <slug>] [--section <X.Y>]
 *   node scripts/quality-cycle.mjs --mode rewrite [--threshold 2.5] [--batch 3] [--slug <slug>] [--section <X.Y>]
 *   node scripts/quality-cycle.mjs --mode verify [--slug <slug>]
 *   node scripts/quality-cycle.mjs --mode review
 *   node scripts/quality-cycle.mjs --mode report
 *   node scripts/quality-cycle.mjs --mode flagship  # flagship-100.json を生成
 *
 * 注意: score / rewrite / verify モードは Task subagent を使用するため、
 * Claude Code 環境内（または手動で API 呼び出し可能な環境）でのみ動作する。
 * このスクリプトは「呼び出し用のプロンプト出力」と「結果の集約」が責務であり、
 * 実際の subagent 起動はユーザーが Claude Code 経由で行う。
 *
 * ──機械的モード（subagent 不要）──
 *   screen   : lint + 文字数集計 → mechanical-screen.json
 *   flagship : スコア降順 100 件選定 → flagship-100.json
 *   review   : state を読んで markdown 出力 → review-queue.md
 *   report   : 全データを集計してコンソール表示
 *
 * ──subagent モード（Claude Code 経由で動かす）──
 *   score    : 上位 N 件を cem-qa subagent で評価 → quality-scores.json
 *   rewrite  : 弱いページを keyword-rewriter subagent で改訂 → state 更新
 *   verify   : リライト後を cem-qa で再評価 → state 更新
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import matter from 'gray-matter';
import {
  readScreen,
  writeScreen,
  readScores,
  writeScores,
  readState,
  writeState,
  updatePageState,
  readFlagship,
  writeFlagship,
  writeReviewQueue,
  PATHS,
} from './lib/quality-state.mjs';
import { buildCemQaPrompt, buildRewriterPrompt } from './lib/cem-qa-prompt.mjs';

// ── 定数 ────────────────────────────────────────────────────────

const BASE_DIR = 'content/site/pe-comprehensive-management';
const LINT_SCRIPT = '.claude/scripts/lint-mdx-mobile.mjs';
const HUB_SLUG = 'pe-comprehensive-management-keyword-2026';
const FLAGSHIP_COUNT = 100;
const DEFAULT_TOP = 200;
const DEFAULT_BATCH = 3;
const DEFAULT_THRESHOLD = 2.5;

// ── CLI 引数パース ──────────────────────────────────────────────

function parseArgs(argv) {
  const args = { mode: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--mode') args.mode = argv[++i];
    else if (a === '--top') args.top = parseInt(argv[++i], 10);
    else if (a === '--threshold') args.threshold = parseFloat(argv[++i]);
    else if (a === '--min-weighted') args.minWeighted = parseFloat(argv[++i]);
    else if (a === '--max') args.max = parseInt(argv[++i], 10);
    else if (a === '--flagship-only') args.flagshipOnly = true;
    else if (a === '--batch') args.batch = parseInt(argv[++i], 10);
    else if (a === '--order') args.order = argv[++i];
    else if (a === '--slug') args.slug = argv[++i];
    else if (a === '--section') args.section = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

function printHelp() {
  console.log(`
Quality Cycle Orchestrator

Modes (機械的・subagent 不要):
  --mode screen          全 keyword ページに lint + 文字数集計
  --mode flagship        flagship-100.json を生成
  --mode review          人間レビュー待ちリストを出力
  --mode report          ダッシュボード表示

Modes (subagent 必要):
  --mode score           上位 N 件を cem-qa subagent で質的評価
                         (subagent 起動用プロンプトを出力するのみ)
  --mode rewrite         弱いページを keyword-rewriter で改訂
                         (subagent 起動用プロンプトを出力するのみ)
  --mode verify          リライト後を cem-qa で再評価
                         (subagent 起動用プロンプトを出力するのみ)

Options:
  --top <N>              score モードの対象件数 (default: ${DEFAULT_TOP})
  --threshold <X.X>      rewrite モードのスコア上限 (weighted < threshold) (default: ${DEFAULT_THRESHOLD})
  --min-weighted <X.X>   rewrite モードのスコア下限 (weighted ≥ value)
  --max <N>              rewrite モードの 1 セッション処理上限
  --flagship-only        rewrite を flagship 100 内に限定 (default: 全 644 件対象)
  --batch <N>            並列バッチサイズ (default: ${DEFAULT_BATCH})
  --order <weakest|newest>  rewrite モードの選定順序 (default: weakest)
  --slug <slug>          特定スラッグのみ対象
  --dry-run              実行せず対象だけ表示
  --help, -h             このヘルプ
`);
}

// ── 共通: 並行作業検出（lastRewrittenAt が直近に更新された slug を skip） ──

// bulk 処理の最小インターバル（分）。この範囲内に lastRewrittenAt が更新された
// slug は別プロセス（個別リライト、並行サイクル等）が触っている可能性があるため skip。
const MIN_REWRITE_INTERVAL_MINUTES = 240; // 4 時間

function getLastRewrittenAt(slug) {
  const filePath = join(BASE_DIR, slug, 'article.mdx');
  if (!existsSync(filePath)) return null;
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const { data } = matter(raw);
    return data.lastRewrittenAt || null;
  } catch {
    return null;
  }
}

function isRecentlyRewritten(slug, minIntervalMinutes = MIN_REWRITE_INTERVAL_MINUTES) {
  const ts = getLastRewrittenAt(slug);
  if (!ts) return false;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return false;
  const ageMs = Date.now() - d.getTime();
  return ageMs < minIntervalMinutes * 60 * 1000;
}

// ── 共通: keyword ページ列挙 ────────────────────────────────────

function listKeywordPages() {
  const dirs = readdirSync(BASE_DIR).filter((entry) => {
    return existsSync(join(BASE_DIR, entry, 'article.mdx'));
  });
  const pages = [];
  for (const slug of dirs) {
    const filePath = join(BASE_DIR, slug, 'article.mdx');
    try {
      const raw = readFileSync(filePath, 'utf-8');
      const { data } = matter(raw);
      if (data.group !== 'keyword') continue;
      if (data.published === false) continue;
      pages.push({ slug, filePath, data });
    } catch {
      continue;
    }
  }
  return pages;
}

// ── mode: screen (Tier 1 機械的事前ふるい) ───────────────────────

function runScreen() {
  console.log('[screen] Tier 1 機械的事前ふるい開始');
  const pages = listKeywordPages();
  console.log(`[screen] keyword ページ ${pages.length} 件を走査`);

  // lint-mdx-mobile.mjs を一括実行
  console.log('[screen] lint-mdx-mobile.mjs 実行中...');
  let lintOutput = '';
  try {
    lintOutput = execSync(`node ${LINT_SCRIPT} ${BASE_DIR}/`, {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024,
    });
  } catch (e) {
    // exit code 1 でも出力は取れる（HIGH 違反があるとき）
    lintOutput = (e.stdout || '') + (e.stderr || '');
  }

  // lint 出力を slug ごとに集計
  const lintBySlug = {};
  let currentSlug = null;
  for (const line of lintOutput.split('\n')) {
    const fileMatch = line.match(/^=== .*[\\/]([^\\/]+)[\\/]article\.mdx ===/);
    if (fileMatch) {
      currentSlug = fileMatch[1];
      lintBySlug[currentSlug] = { high: 0, medium: 0, low: 0 };
      continue;
    }
    if (currentSlug && line.startsWith('[HIGH]')) lintBySlug[currentSlug].high++;
    else if (currentSlug && line.startsWith('[MEDIUM]')) lintBySlug[currentSlug].medium++;
    else if (currentSlug && line.startsWith('[LOW]')) lintBySlug[currentSlug].low++;
  }

  // 各ページの指標を集計
  const result = { version: 1, screened_at: null, pages: {} };
  for (const { slug, filePath, data } of pages) {
    const raw = readFileSync(filePath, 'utf-8');
    const { content } = matter(raw);
    const bodyChars = content.replace(/\r/g, '').length;

    const desc = (data.description || '').trim();
    const descLen = desc.length;

    // 関連リンク数（インラインの /docs/pe-comprehensive-management- リンク）
    const relLinks = (content.match(/\]\(\/docs\/pe-comprehensive-management-/g) || []).length;
    // 画像数
    const imgs = (content.match(/!\[/g) || []).length + (content.match(/<img\s/g) || []).length;

    const lint = lintBySlug[slug] || { high: 0, medium: 0, low: 0 };

    // 候補スコア式
    const candidateScore =
      Math.log10(Math.max(bodyChars / 100, 1)) * 2.0 +
      (descLen >= 50 ? 2.0 : 0.0) +
      (lint.high === 0 ? 3.0 : -lint.high * 1.0) +
      (lint.medium === 0 ? 1.0 : 0.0) +
      (imgs > 0 ? 2.0 : 0.0) +
      (relLinks > 3 ? 1.0 : 0.0);

    result.pages[slug] = {
      body_chars: bodyChars,
      lint_high: lint.high,
      lint_medium: lint.medium,
      lint_low: lint.low,
      description_length: descLen,
      review_status: data.reviewStatus || null,
      image_count: imgs,
      related_keyword_links: relLinks,
      section: data.section || null,
      candidate_score: parseFloat(candidateScore.toFixed(2)),
    };
  }

  writeScreen(result);
  console.log(`[screen] ✓ ${PATHS.SCREEN} に ${Object.keys(result.pages).length} 件出力`);

  // サマリ
  const scores = Object.values(result.pages).map((p) => p.candidate_score);
  const sorted = scores.slice().sort((a, b) => b - a);
  console.log(`\n=== Screen サマリ ===`);
  console.log(`Total           : ${scores.length}`);
  console.log(`Median score    : ${sorted[Math.floor(sorted.length / 2)].toFixed(2)}`);
  console.log(`Top 10% (score) : ${sorted[Math.floor(sorted.length * 0.1)].toFixed(2)}`);
  console.log(`Bottom 10%      : ${sorted[Math.floor(sorted.length * 0.9)].toFixed(2)}`);
  console.log(`Min / Max       : ${Math.min(...scores).toFixed(2)} / ${Math.max(...scores).toFixed(2)}`);
  console.log(`HIGH 違反あり   : ${Object.values(result.pages).filter((p) => p.lint_high > 0).length} 件`);
  console.log(`Description 不足 (<50字): ${Object.values(result.pages).filter((p) => p.description_length < 50).length} 件`);
}

// ── mode: flagship (上位 100 件選定) ────────────────────────────

function runFlagship() {
  console.log('[flagship] スコア上位 100 件を選定');
  const screen = readScreen();
  if (Object.keys(screen.pages).length === 0) {
    console.error('[flagship] .claude/state/mechanical-screen.json が空です。先に --mode screen を実行してください。');
    process.exit(1);
  }

  // candidate_score 降順でソート
  const sorted = Object.entries(screen.pages)
    .sort(([, a], [, b]) => b.candidate_score - a.candidate_score)
    .slice(0, FLAGSHIP_COUNT);

  const flagshipSlugs = sorted.map(([slug]) => slug);
  writeFlagship(flagshipSlugs);

  console.log(`[flagship] ✓ ${PATHS.FLAGSHIP} に ${flagshipSlugs.length} 件出力`);
  console.log(`\n上位 10 件:`);
  sorted.slice(0, 10).forEach(([slug, p], i) => {
    console.log(`  ${i + 1}. ${slug.padEnd(40)} score=${p.candidate_score.toFixed(2)} chars=${p.body_chars}`);
  });
}

// ── mode: score (Tier 2 質的評価 — subagent 用プロンプト出力) ──

function runScore(args) {
  const top = args.top || DEFAULT_TOP;
  console.log(`[score] Tier 2 質的評価 — 上位 ${top} 件のプロンプトを出力`);

  const screen = readScreen();
  if (Object.keys(screen.pages).length === 0) {
    console.error('[score] .claude/state/mechanical-screen.json が空です。先に --mode screen を実行してください。');
    process.exit(1);
  }

  const scores = readScores();
  const alreadyScored = new Set(Object.keys(scores.pages));

  // 候補上位 N 件を抽出（既評価はスキップ）
  let candidates = Object.entries(screen.pages)
    .sort(([, a], [, b]) => b.candidate_score - a.candidate_score)
    .filter(([slug, p]) => {
      if (alreadyScored.has(slug)) return false;
      if (args.section && p.section !== args.section) return false;
      return true;
    })
    .slice(0, top);

  if (args.slug) {
    candidates = [[args.slug, screen.pages[args.slug]]].filter(([, p]) => p);
  }

  console.log(`[score] 評価対象: ${candidates.length} 件`);
  console.log(`[score] 既評価済み: ${alreadyScored.size} 件 (キャッシュ)`);

  if (args.dryRun) {
    console.log('\n[DRY-RUN] 評価対象スラッグ:');
    candidates.forEach(([slug], i) => console.log(`  ${i + 1}. ${slug}`));
    return;
  }

  // subagent 用プロンプトを JSON で出力
  // 実際の subagent 起動はユーザー（Claude Code）側で行う
  const tasks = candidates.map(([slug]) => ({
    slug,
    prompt: buildCemQaPrompt(slug),
  }));

  console.log(`\n[score] ${tasks.length} 件の subagent タスクを準備しました`);
  console.log(`[score] このスクリプトは subagent を直接起動しません。`);
  console.log(`[score] 使い方:`);
  console.log(`  1. このスクリプトの出力 JSON をファイル (/tmp/score-tasks.json) に保存`);
  console.log(`  2. Claude Code 側から /quality-cycle --mode score を呼び出して`);
  console.log(`     subagent を並列で起動`);
  console.log(`  3. 各 subagent の結果を .claude/state/quality-scores.json にマージ`);
  console.log(`\n=== タスクリスト (JSON) ===`);
  console.log(JSON.stringify({ tasks: tasks.map((t) => ({ slug: t.slug })) }, null, 2));
}

// ── mode: rewrite (リライト — subagent 用プロンプト出力) ────────

function runRewrite(args) {
  const threshold = args.threshold || DEFAULT_THRESHOLD;
  const batch = args.batch || DEFAULT_BATCH;
  console.log(`[rewrite] weighted < ${threshold} のページを keyword-rewriter で改訂`);

  const scores = readScores();
  if (Object.keys(scores.pages).length === 0) {
    console.error('[rewrite] .claude/state/quality-scores.json が空です。先に --mode score を実行してください。');
    process.exit(1);
  }

  // flagship 100 内で weighted < threshold のページ（--flagship-only 指定時）
  // または全 644 件で weighted < threshold のページ
  const flagship = readFlagship();
  const flagshipSet = new Set(flagship.slugs);
  const state = readState();

  // state が rewritten/verified/approved のページはデフォルトでスキップ
  const alreadyHandled = new Set(
    Object.entries(state.pages || {})
      .filter(([, p]) => ['rewritten', 'verified', 'approved'].includes(p.status))
      .map(([slug]) => slug),
  );

  // 並行作業検出で skip された slug を記録（ログ用）
  const skippedRecent = [];

  let candidates = Object.entries(scores.pages)
    .filter(([slug, p]) => {
      if (alreadyHandled.has(slug)) return false;
      if (args.flagshipOnly && !flagshipSet.has(slug)) return false;
      if (args.section && p.section !== args.section) return false;
      if (p.weighted >= threshold) return false;
      if (args.minWeighted !== undefined && p.weighted < args.minWeighted) return false;
      // 直近 MIN_REWRITE_INTERVAL_MINUTES 以内に更新された slug は別プロセスが
      // 触っている可能性があるため skip（並行作業の差分衝突を防ぐ）
      if (isRecentlyRewritten(slug)) {
        skippedRecent.push(slug);
        return false;
      }
      return true;
    })
    .sort(([, a], [, b]) => a.weighted - b.weighted);

  if (args.slug) {
    candidates = [[args.slug, scores.pages[args.slug]]].filter(([, p]) => p);
  }

  // --max でセッション上限を切る
  if (args.max && candidates.length > args.max) {
    console.log(`[rewrite] 候補 ${candidates.length} 件のうち先頭 ${args.max} 件を選定（--max）`);
    candidates = candidates.slice(0, args.max);
  }

  console.log(`[rewrite] 対象: ${candidates.length} 件 (バッチサイズ ${batch})`);
  if (alreadyHandled.size > 0) {
    console.log(`[rewrite] 既処理スキップ: ${alreadyHandled.size} 件`);
  }
  if (skippedRecent.length > 0) {
    console.log(`[rewrite] 並行作業検出スキップ: ${skippedRecent.length} 件 (直近 ${MIN_REWRITE_INTERVAL_MINUTES} 分以内に lastRewrittenAt 更新)`);
  }

  if (args.dryRun) {
    console.log('\n[DRY-RUN] リライト対象:');
    candidates.forEach(([slug, p], i) => {
      console.log(`  ${i + 1}. ${slug} (weighted=${p.weighted}, weak=${JSON.stringify(p.weak_axes)})`);
    });
    return;
  }

  // 各ページの拡張パターン推奨を選定
  const tasks = candidates.map(([slug, scoreInfo]) => {
    const patterns = pickPatterns(scoreInfo.weak_axes);
    return {
      slug,
      weak_axes: scoreInfo.weak_axes,
      expansion_patterns: patterns,
      prompt: buildRewriterPrompt(slug, scoreInfo.weak_axes, patterns),
    };
  });

  console.log(`\n[rewrite] ${tasks.length} 件の subagent タスクを準備しました`);
  console.log(`=== タスクリスト (JSON) ===`);
  console.log(
    JSON.stringify(
      {
        tasks: tasks.map((t) => ({
          slug: t.slug,
          weak_axes: t.weak_axes,
          expansion_patterns: t.expansion_patterns,
        })),
      },
      null,
      2,
    ),
  );
}

function pickPatterns(weakAxes) {
  // 弱点軸から拡張パターンを 1〜2 個選ぶ
  const map = {
    principle: ['A', 'E'], // 具体例 + 試験での問われ方
    structure: ['C', 'F'], // 比較表 + mermaid
    reference: ['D'], // 歴史・背景
    mobile: ['G'], // 既存の4列以上/長セル表を階層化箇条書きに変換（既存構造の in-place 変更）
    linking: ['A'], // 具体例で内部リンク追加
  };
  const picks = new Set();
  // mobile 弱点時は G を最優先で確保する（weak_axes の順序に関わらず slice(0,2) で落とさない）
  if (weakAxes.includes('mobile')) picks.add('G');
  // reference も参考資料は構造的欠落が多く優先度高
  if (weakAxes.includes('reference')) picks.add('D');
  for (const axis of weakAxes) {
    for (const p of map[axis] || []) picks.add(p);
  }
  // デフォルト: 何もなければ A + E
  if (picks.size === 0) return ['A', 'E'];
  return Array.from(picks).slice(0, 2);
}

// ── mode: verify (リライト後再評価 — subagent 用プロンプト出力) ─

function runVerify(args) {
  console.log('[verify] リライト後ページの再評価');
  const state = readState();
  const targets = Object.entries(state.pages)
    .filter(([, p]) => p.status === 'needs-review' || p.status === 'rewriting')
    .map(([slug]) => slug);

  console.log(`[verify] 対象: ${targets.length} 件`);
  if (args.dryRun) {
    targets.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
    return;
  }

  const tasks = targets.map((slug) => ({ slug, prompt: buildCemQaPrompt(slug) }));
  console.log(`\n[verify] ${tasks.length} 件の re-score タスクを準備しました`);
  console.log(JSON.stringify({ tasks: tasks.map((t) => ({ slug: t.slug })) }, null, 2));
}

// ── mode: review (人間向け markdown 出力) ──────────────────────

function runReview() {
  console.log('[review] レビュー待ちリストを生成');
  const state = readState();
  const scores = readScores();

  const targets = Object.entries(state.pages)
    .filter(([, p]) => p.status === 'needs-review' || p.status === 'verified')
    .map(([slug]) => slug);

  if (targets.length === 0) {
    console.log('[review] レビュー待ちページなし');
    writeReviewQueue('# レビュー待ちキーワード（0件）\n\nレビュー待ちのページはありません。\n');
    return;
  }

  let md = `# レビュー待ちキーワード（${targets.length}件）\n\n`;
  md += `生成日時: ${new Date().toISOString()}\n\n`;
  md += `各ページについて、以下のいずれかを実行してください:\n`;
  md += `- **承認**: frontmatter の \`reviewStatus\` を \`approved\` に変更\n`;
  md += `- **却下**: frontmatter の \`reviewStatus\` を \`rejected\` に変更（変更を revert）\n`;
  md += `- **手直し**: 直接編集後に reviewStatus を approved に\n\n`;
  md += `---\n\n`;

  targets.forEach((slug, i) => {
    const stateEntry = state.pages[slug];
    const scoreEntry = scores.pages[slug] || {};
    const lastHistory = stateEntry.history[stateEntry.history.length - 1] || {};

    md += `## ${i + 1}. ${slug}\n\n`;
    md += `- **状態**: ${stateEntry.status}\n`;
    md += `- **リライト後スコア**: ${scoreEntry.weighted ?? 'N/A'}\n`;
    md += `- **弱点軸**: ${JSON.stringify(scoreEntry.weak_axes ?? [])}\n`;
    md += `- **質的コメント**: ${scoreEntry.qualitative_comment ?? '(なし)'}\n`;
    md += `- **ファイル**: \`content/site/pe-comprehensive-management/${slug}/article.mdx\`\n`;
    md += `- **確認URL**: <http://localhost:3020/docs/pe-comprehensive-management-${slug}>\n`;
    md += `- **本番URL**: <https://doboku-note.com/docs/pe-comprehensive-management-${slug}>\n`;
    md += `- **最終アクション**: ${lastHistory.action || 'N/A'} (${lastHistory.date || 'N/A'})\n\n`;
  });

  writeReviewQueue(md);
  console.log(`[review] ✓ ${PATHS.REVIEW_QUEUE} に ${targets.length} 件出力`);
}

// ── mode: report (ダッシュボード) ──────────────────────────────

function runReport() {
  console.log('=== Quality Cycle Report ===\n');

  const screen = readScreen();
  const scores = readScores();
  const state = readState();
  const flagship = readFlagship();

  const screenCount = Object.keys(screen.pages).length;
  const scoreCount = Object.keys(scores.pages).length;
  const stateCount = Object.keys(state.pages).length;
  const flagshipCount = flagship.slugs.length;

  console.log(`Total keyword pages   : ${screenCount}`);
  console.log(`Tier 2 scored         : ${scoreCount}`);
  console.log(`Flagship 100 selected : ${flagshipCount}`);
  console.log(`State tracked         : ${stateCount}`);
  console.log();

  if (scoreCount > 0) {
    const weighted = Object.values(scores.pages).map((p) => p.weighted);
    const dist = { '3.0': 0, '2.0-2.9': 0, '1.0-1.9': 0, '< 1.0': 0 };
    for (const w of weighted) {
      if (w >= 2.95) dist['3.0']++;
      else if (w >= 2.0) dist['2.0-2.9']++;
      else if (w >= 1.0) dist['1.0-1.9']++;
      else dist['< 1.0']++;
    }
    const avg = weighted.reduce((a, b) => a + b, 0) / weighted.length;
    console.log(`Score distribution (Tier 2):`);
    for (const [k, v] of Object.entries(dist)) console.log(`  ${k.padEnd(10)} : ${v}`);
    console.log(`Avg weighted score    : ${avg.toFixed(2)}\n`);
  }

  if (stateCount > 0) {
    const statusDist = {};
    for (const p of Object.values(state.pages)) {
      statusDist[p.status] = (statusDist[p.status] || 0) + 1;
    }
    console.log(`State distribution:`);
    for (const [k, v] of Object.entries(statusDist)) console.log(`  ${k.padEnd(15)} : ${v}`);
  }
}

// ── メイン ──────────────────────────────────────────────────────

function main() {
  const args = parseArgs(process.argv);

  if (args.help || !args.mode) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  switch (args.mode) {
    case 'screen':
      runScreen();
      break;
    case 'flagship':
      runFlagship();
      break;
    case 'score':
      runScore(args);
      break;
    case 'rewrite':
      runRewrite(args);
      break;
    case 'verify':
      runVerify(args);
      break;
    case 'review':
      runReview();
      break;
    case 'report':
      runReport();
      break;
    default:
      console.error(`Unknown mode: ${args.mode}`);
      printHelp();
      process.exit(1);
  }
}

main();
