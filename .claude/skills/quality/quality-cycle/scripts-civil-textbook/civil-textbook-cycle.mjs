#!/usr/bin/env node
/**
 * Civil Textbook Cycle オーケストレータ
 *
 * 1級土木施工管理技士（civil-construction-1）の textbook / guide ページに対し、
 * 品質サイクル（評価 → リライト → 再評価 → 人間レビュー）を回す統合スキル。
 *
 * CEM 版 quality-cycle.mjs の civil 版。対象が 40 件なので screen / flagship は省略。
 *
 * Usage:
 *   node scripts/civil-textbook-cycle.mjs --mode score [--slug <slug>] [--dry-run]
 *   node scripts/civil-textbook-cycle.mjs --mode rewrite [--threshold 2.5] [--batch 3] [--slug <slug>] [--dry-run]
 *   node scripts/civil-textbook-cycle.mjs --mode verify [--slug <slug>] [--dry-run]
 *   node scripts/civil-textbook-cycle.mjs --mode review
 *   node scripts/civil-textbook-cycle.mjs --mode report
 *   node scripts/civil-textbook-cycle.mjs --mode issue [--threshold 2.5] [--round N] [--create] [--dry-run]
 *
 * 注意: score / rewrite / verify モードは Task subagent を使用する。
 * このスクリプトは「呼び出し用のプロンプト出力」と「結果の集約」が責務であり、
 * 実際の subagent 起動はユーザーが Claude Code 経由で行う。
 *
 * ──機械的モード（subagent 不要）──
 *   review : state を読んで markdown 出力 → civil-review-queue.md
 *   report : 全データを集計してコンソール表示
 *   issue  : civil-quality-scores.json からリライト候補（weighted < threshold）を
 *            markdown レポートに整形 → .tmp/civil-textbook-cycle-report.md
 *            （GitHub Issue・task-queue.json は廃止。リライト候補は .claude/todo/ で追跡）
 *
 * ──subagent モード（Claude Code 経由で動かす）──
 *   score  : civil-construction-review subagent で全 40 件評価 → civil-quality-scores.json
 *   rewrite: 弱いページを civil-textbook-rewriter subagent で改訂 → state 更新
 *   verify : リライト後を civil-construction-review で再評価 → state 更新
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import matter from 'gray-matter';
import {
  readScores,
  readState,
  writeReviewQueue,
  computeWeighted,
  PATHS,
} from './lib/civil-state.mjs';
import { buildReviewPrompt, buildRewriterPrompt } from './lib/civil-prompts.mjs';

// ── 定数 ────────────────────────────────────────────────────────

const BASE_DIR = 'content/site/civil-construction-1';
const TARGET_GROUPS = new Set(['textbook', 'guide']);
const DEFAULT_BATCH = 3;
const DEFAULT_THRESHOLD = 2.5;

// ── CLI 引数パース ──────────────────────────────────────────────

function parseArgs(argv) {
  const args = { mode: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--mode') args.mode = argv[++i];
    else if (a === '--threshold') args.threshold = parseFloat(argv[++i]);
    else if (a === '--min-weighted') args.minWeighted = parseFloat(argv[++i]);
    else if (a === '--max') args.max = parseInt(argv[++i], 10);
    else if (a === '--batch') args.batch = parseInt(argv[++i], 10);
    else if (a === '--order') args.order = argv[++i];
    else if (a === '--slug') args.slug = argv[++i];
    else if (a === '--round') args.round = parseInt(argv[++i], 10);
    else if (a === '--create') args.create = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

function printHelp() {
  console.log(`
Civil Textbook Cycle Orchestrator

Modes (機械的・subagent 不要):
  --mode review          人間レビュー待ちリストを出力 → ${PATHS.REVIEW_QUEUE}
  --mode report          ダッシュボード表示
  --mode issue           リライト候補から markdown レポートを生成
                         → .tmp/civil-textbook-cycle-report.md（Issue は廃止）

Modes (subagent 必要):
  --mode score           全 textbook/guide を civil-construction-review で評価
                         (subagent 起動用プロンプトを出力)
  --mode rewrite         弱いページを civil-textbook-rewriter で改訂
                         (subagent 起動用プロンプトを出力)
  --mode verify          リライト後を civil-construction-review で再評価
                         (subagent 起動用プロンプトを出力)

Options:
  --threshold <X.X>      rewrite モードのスコア上限 (weighted < threshold) (default: ${DEFAULT_THRESHOLD})
  --min-weighted <X.X>   rewrite モードのスコア下限 (weighted ≥ value)
  --max <N>              rewrite モードの 1 セッション処理上限
  --batch <N>            並列バッチサイズ (default: ${DEFAULT_BATCH})
  --order <weakest|newest>  rewrite モードの選定順序 (default: weakest)
  --slug <slug>          特定スラッグのみ対象
  --round <N>            issue モード時のラウンド番号（default: 未指定なら日付）
  --create               issue モード時、gh CLI で実際に issue 作成（gh 必須）
  --dry-run              実行せず対象だけ表示（issue モードなら markdown を stdout のみ）
  --help, -h             このヘルプ
`);
}

// ── 共通: textbook / guide ページ列挙 ───────────────────────────

function listTargetPages() {
  if (!existsSync(BASE_DIR)) {
    console.error(`[civil-cycle] ${BASE_DIR} が存在しません`);
    return [];
  }
  const dirs = readdirSync(BASE_DIR).filter((entry) => {
    return existsSync(join(BASE_DIR, entry, 'article.mdx'));
  });
  const pages = [];
  for (const slug of dirs) {
    const filePath = join(BASE_DIR, slug, 'article.mdx');
    try {
      const raw = readFileSync(filePath, 'utf-8');
      const { data } = matter(raw);
      if (!TARGET_GROUPS.has(data.group)) continue;
      if (data.published === false) continue;
      pages.push({ slug, filePath, data });
    } catch {
      continue;
    }
  }
  return pages;
}

// ── mode: score (全件を civil-construction-review で評価) ───────

function runScore(args) {
  console.log('[score] civil-construction-review で全 textbook/guide を評価');

  let pages = listTargetPages();
  console.log(`[score] 対象ページ: ${pages.length} 件 (textbook + guide)`);

  const scores = readScores();
  const alreadyScored = new Set(Object.keys(scores.pages));

  if (args.slug) {
    pages = pages.filter((p) => p.slug === args.slug);
  } else {
    // 既評価はスキップ（再評価したい場合は --slug で個別指定）
    const before = pages.length;
    pages = pages.filter((p) => !alreadyScored.has(p.slug));
    const skipped = before - pages.length;
    if (skipped > 0) {
      console.log(`[score] 既評価済み（キャッシュ）: ${skipped} 件をスキップ`);
    }
  }

  if (args.dryRun) {
    console.log(`\n[DRY-RUN] 評価対象 ${pages.length} 件:`);
    pages.forEach((p, i) => {
      console.log(`  ${i + 1}. [${p.data.group}] ${p.slug}`);
    });
    return;
  }

  if (pages.length === 0) {
    console.log('[score] 評価対象なし（全件評価済み、または --slug が該当なし）');
    return;
  }

  const tasks = pages.map((p) => ({
    slug: p.slug,
    group: p.data.group,
    prompt: buildReviewPrompt(p.slug),
  }));

  console.log(`\n[score] ${tasks.length} 件の subagent タスクを準備しました`);
  console.log(`[score] このスクリプトは subagent を直接起動しません。`);
  console.log(`[score] 使い方:`);
  console.log(`  1. Claude Code 側から /civil-textbook-cycle --mode score を呼び出し`);
  console.log(`     各タスクの prompt で civil-construction-review subagent を並列起動`);
  console.log(`  2. 各 subagent の返す JSON 配列を /tmp/civil-score-results.json に保存`);
  console.log(`  3. node .claude/skills/quality/quality-cycle/scripts/merge-scores.mjs /tmp/civil-score-results.json`);
  console.log(`     で ${PATHS.SCORES} にマージ`);
  console.log(`\n=== タスクリスト (JSON) ===`);
  console.log(
    JSON.stringify(
      {
        tasks: tasks.map((t) => ({ slug: t.slug, group: t.group })),
      },
      null,
      2,
    ),
  );
}

// ── mode: rewrite (弱いページを改訂) ────────────────────────────

function runRewrite(args) {
  const threshold = args.threshold || DEFAULT_THRESHOLD;
  const batch = args.batch || DEFAULT_BATCH;
  console.log(`[rewrite] weighted < ${threshold} のページを civil-textbook-rewriter で改訂`);

  const scores = readScores();
  if (Object.keys(scores.pages).length === 0) {
    console.error(
      `[rewrite] ${PATHS.SCORES} が空です。先に --mode score を実行してください。`,
    );
    process.exit(1);
  }

  const state = readState();
  const alreadyHandled = new Set(
    Object.entries(state.pages || {})
      .filter(([, p]) =>
        ['rewritten', 'verified', 'approved'].includes(p.status),
      )
      .map(([slug]) => slug),
  );

  // textbook/guide の group 情報を復元するためページリストも取得
  const pages = listTargetPages();
  const groupBySlug = Object.fromEntries(pages.map((p) => [p.slug, p.data.group]));

  let candidates = Object.entries(scores.pages)
    .filter(([slug, p]) => {
      if (alreadyHandled.has(slug)) return false;
      if (p.weighted >= threshold) return false;
      if (args.minWeighted !== undefined && p.weighted < args.minWeighted) return false;
      return true;
    })
    .sort(([, a], [, b]) => a.weighted - b.weighted);

  if (args.slug) {
    candidates = [[args.slug, scores.pages[args.slug]]].filter(([, p]) => p);
  }

  if (args.max && candidates.length > args.max) {
    console.log(
      `[rewrite] 候補 ${candidates.length} 件のうち先頭 ${args.max} 件を選定（--max）`,
    );
    candidates = candidates.slice(0, args.max);
  }

  console.log(`[rewrite] 対象: ${candidates.length} 件 (バッチサイズ ${batch})`);
  if (alreadyHandled.size > 0) {
    console.log(`[rewrite] 既処理スキップ: ${alreadyHandled.size} 件`);
  }

  if (args.dryRun) {
    console.log('\n[DRY-RUN] リライト対象:');
    candidates.forEach(([slug, p], i) => {
      console.log(
        `  ${i + 1}. [${groupBySlug[slug] || '?'}] ${slug} (weighted=${p.weighted}, weak=${JSON.stringify(p.weak_axes)})`,
      );
    });
    return;
  }

  const tasks = candidates.map(([slug, scoreInfo]) => {
    const group = groupBySlug[slug] || 'textbook';
    const patterns = pickPatterns(scoreInfo.weak_axes, group);
    return {
      slug,
      group,
      weak_axes: scoreInfo.weak_axes,
      expansion_patterns: patterns,
      prompt: buildRewriterPrompt(slug, group, scoreInfo.weak_axes, patterns),
    };
  });

  console.log(`\n[rewrite] ${tasks.length} 件の subagent タスクを準備しました`);
  console.log(`=== タスクリスト (JSON) ===`);
  console.log(
    JSON.stringify(
      {
        tasks: tasks.map((t) => ({
          slug: t.slug,
          group: t.group,
          weak_axes: t.weak_axes,
          expansion_patterns: t.expansion_patterns,
        })),
      },
      null,
      2,
    ),
  );
}

/**
 * 弱点軸から拡張パターンを 1〜2 個選ぶ（優先度: G > I > R > B > P > S）。
 * group === 'guide' の場合のみ B を候補に入れる。
 */
function pickPatterns(weakAxes, group) {
  const picks = new Set();
  // 最優先: G (mobile)
  if (weakAxes.includes('mobile')) picks.add('G');
  // 次: I (figures)
  if (weakAxes.includes('figures')) picks.add('I');
  // reference
  if (weakAxes.includes('reference')) picks.add('R');
  // guide 限定: B（principle / figures 不足時）
  if (group === 'guide' && (weakAxes.includes('principle') || weakAxes.includes('figures'))) {
    picks.add('B');
  }
  // principle / structure
  if (weakAxes.includes('principle')) picks.add('P');
  if (weakAxes.includes('structure')) picks.add('S');

  // デフォルト: 何もなければ P + R
  if (picks.size === 0) return ['P', 'R'];

  // 優先度順に並べ替えて最大 2 個に絞る
  const order = ['G', 'I', 'R', 'B', 'P', 'S'];
  return order.filter((p) => picks.has(p)).slice(0, 2);
}

// ── mode: verify (リライト後再評価) ─────────────────────────────

function runVerify(args) {
  console.log('[verify] リライト後ページの再評価');
  const state = readState();
  let targets = Object.entries(state.pages || {})
    .filter(([, p]) => p.status === 'needs-review' || p.status === 'rewritten')
    .map(([slug]) => slug);

  if (args.slug) {
    targets = targets.filter((s) => s === args.slug);
  }

  console.log(`[verify] 対象: ${targets.length} 件`);
  if (args.dryRun) {
    targets.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
    return;
  }

  if (targets.length === 0) {
    console.log('[verify] 再評価対象なし');
    return;
  }

  const tasks = targets.map((slug) => ({ slug, prompt: buildReviewPrompt(slug) }));
  console.log(`\n[verify] ${tasks.length} 件の re-score タスクを準備しました`);
  console.log(JSON.stringify({ tasks: tasks.map((t) => ({ slug: t.slug })) }, null, 2));
}

// ── mode: review (人間向け markdown 出力) ──────────────────────

function runReview() {
  console.log('[review] レビュー待ちリストを生成');
  const state = readState();
  const scores = readScores();

  const targets = Object.entries(state.pages || {})
    .filter(([, p]) => p.status === 'needs-review' || p.status === 'verified')
    .map(([slug]) => slug);

  if (targets.length === 0) {
    console.log('[review] レビュー待ちページなし');
    writeReviewQueue(
      '# civil-construction-1 レビュー待ちページ（0件）\n\nレビュー待ちのページはありません。\n',
    );
    return;
  }

  let md = `# civil-construction-1 レビュー待ちページ（${targets.length}件）\n\n`;
  md += `生成日時: ${new Date().toISOString()}\n\n`;
  md += `各ページについて、以下のいずれかを実行してください:\n`;
  md += `- **承認**: frontmatter の \`reviewStatus\` を \`approved\` に変更\n`;
  md += `- **却下**: frontmatter の \`reviewStatus\` を \`rejected\` に変更（変更を revert）\n`;
  md += `- **手直し**: 直接編集後に reviewStatus を approved に\n\n`;
  md += `---\n\n`;

  targets.forEach((slug, i) => {
    const stateEntry = state.pages[slug];
    const scoreEntry = scores.pages[slug] || {};
    const lastHistory =
      (stateEntry.history && stateEntry.history[stateEntry.history.length - 1]) || {};

    md += `## ${i + 1}. ${slug}\n\n`;
    md += `- **状態**: ${stateEntry.status}\n`;
    md += `- **リライト後スコア**: ${scoreEntry.weighted ?? 'N/A'}\n`;
    md += `- **弱点軸**: ${JSON.stringify(scoreEntry.weak_axes ?? [])}\n`;
    md += `- **質的コメント**: ${scoreEntry.qualitative_comment ?? '(なし)'}\n`;
    md += `- **ファイル**: \`content/site/civil-construction-1/${slug}/article.mdx\`\n`;
    md += `- **確認URL**: <http://localhost:3020/docs/civil-construction-1-${slug}>\n`;
    md += `- **本番URL**: <https://doboku-note.com/docs/civil-construction-1-${slug}>\n`;
    md += `- **最終アクション**: ${lastHistory.action || 'N/A'} (${lastHistory.date || 'N/A'})\n\n`;
  });

  writeReviewQueue(md);
  console.log(`[review] ✓ ${PATHS.REVIEW_QUEUE} に ${targets.length} 件出力`);
}

// ── mode: report (ダッシュボード) ──────────────────────────────

function runReport() {
  console.log('=== Civil Textbook Cycle Report ===\n');

  const pages = listTargetPages();
  const scores = readScores();
  const state = readState();

  const totalPages = pages.length;
  const byGroup = pages.reduce((acc, p) => {
    acc[p.data.group] = (acc[p.data.group] || 0) + 1;
    return acc;
  }, {});
  const scoreCount = Object.keys(scores.pages).length;
  const stateCount = Object.keys(state.pages || {}).length;

  console.log(`Total textbook/guide : ${totalPages}`);
  for (const [g, n] of Object.entries(byGroup)) {
    console.log(`  - ${g.padEnd(10)}: ${n}`);
  }
  console.log(`Scored               : ${scoreCount}`);
  console.log(`State tracked        : ${stateCount}\n`);

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
    console.log(`Score distribution:`);
    for (const [k, v] of Object.entries(dist)) console.log(`  ${k.padEnd(10)} : ${v}`);
    console.log(`Avg weighted score   : ${avg.toFixed(2)}`);

    // 軸別の弱点集計
    const axisWeak = { structure: 0, principle: 0, mobile: 0, figures: 0, reference: 0 };
    for (const p of Object.values(scores.pages)) {
      for (const axis of p.weak_axes || []) {
        if (axis in axisWeak) axisWeak[axis]++;
      }
    }
    console.log(`\n弱点軸の出現頻度 (score <= 1):`);
    for (const [k, v] of Object.entries(axisWeak)) {
      console.log(`  ${k.padEnd(10)} : ${v}`);
    }
    console.log();
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

// ── mode: issue (umbrella issue markdown 生成 + 任意で gh 作成) ─

const ISSUE_DRAFT_PATH = '.tmp/civil-textbook-cycle-report.md';

function runIssue(args) {
  const threshold = args.threshold || DEFAULT_THRESHOLD;
  const scores = readScores();
  if (Object.keys(scores.pages).length === 0) {
    console.error(
      `[issue] ${PATHS.SCORES} が空です。先に --mode score を実行してください。`,
    );
    process.exit(1);
  }

  // リライト候補を抽出（weighted < threshold）
  const candidates = Object.entries(scores.pages)
    .filter(([, p]) => p.weighted < threshold)
    .sort(([, a], [, b]) => a.weighted - b.weighted);

  if (candidates.length === 0) {
    console.log(`[issue] weighted < ${threshold} のページなし。issue 化不要。`);
    return;
  }

  // 全件スコア分布も計算
  const all = Object.values(scores.pages).map((p) => p.weighted);
  const pass = all.filter((w) => w >= 2.0).length;
  const avg = (all.reduce((a, b) => a + b, 0) / all.length).toFixed(2);

  // group 別に分類
  const byGroup = { guide: [], textbook: [] };
  for (const [slug, p] of candidates) {
    const g = p.group || 'textbook';
    if (!byGroup[g]) byGroup[g] = [];
    byGroup[g].push([slug, p]);
  }

  // ラウンド識別子
  const round = args.round ? `Round ${args.round}` : new Date().toISOString().split('T')[0];

  // 弱点軸の集計
  const axisWeak = { structure: 0, principle: 0, mobile: 0, figures: 0, reference: 0 };
  for (const [, p] of candidates) {
    for (const axis of p.weak_axes || []) {
      if (axis in axisWeak) axisWeak[axis]++;
    }
  }
  const weakLines = Object.entries(axisWeak)
    .filter(([, n]) => n > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([k, n]) => `- **${k}**: ${n}件`)
    .join('\n');

  // markdown body 組み立て
  const title = `Civil textbook cycle — ${round}（リライト ${candidates.length}件）`;

  let body = `## 概要\n\n`;
  body += `1級土木施工管理技士（civil-construction-1）の textbook/guide 品質サイクル。`;
  body += `\`/civil-textbook-cycle --mode score\` の結果から weighted < ${threshold} のページをリライト対象として列挙。\n\n`;
  body += `| 指標 | 値 |\n|---|---|\n`;
  body += `| 全対象 | ${all.length}件 |\n`;
  body += `| 合格（weighted ≥ 2.0）| ${pass}件 |\n`;
  body += `| 要修正（weighted < ${threshold}）| ${candidates.length}件 |\n`;
  body += `| 平均 weighted | ${avg} |\n\n`;

  body += `## 弱点軸の出現頻度（対象 ${candidates.length}件、score ≤ 1）\n\n${weakLines}\n\n`;

  if (byGroup.guide && byGroup.guide.length > 0) {
    body += `## Guide（${byGroup.guide.length}件）\n\n`;
    for (const [slug, p] of byGroup.guide) {
      body += `- [ ] \`${slug}\` — weighted ${p.weighted}, weak: ${JSON.stringify(p.weak_axes)}\n`;
    }
    body += `\n`;
  }
  if (byGroup.textbook && byGroup.textbook.length > 0) {
    body += `## Textbook（${byGroup.textbook.length}件）\n\n`;
    for (const [slug, p] of byGroup.textbook) {
      body += `- [ ] \`${slug}\` — weighted ${p.weighted}, weak: ${JSON.stringify(p.weak_axes)}\n`;
    }
    body += `\n`;
  }

  body += `## 運用\n\n`;
  body += `1. \`/civil-textbook-cycle --mode rewrite --threshold ${threshold} --max N\` で \`civil-textbook-rewriter\` を起動\n`;
  body += `2. リライト後 \`/civil-textbook-cycle --mode verify\` で再評価\n`;
  body += `3. \`reviewStatus: approved\` にして PR 作成 → チェックボックス更新\n`;
  body += `4. 全件完了でクローズ\n\n`;
  body += `## 詳細データ\n\n`;
  body += `- スコア真実源: \`.claude/state/civil-quality-scores.json\`\n`;
  body += `- レビュー待ち一覧: \`.claude/state/civil-review-queue.md\`\n`;
  body += `- 評価ルーブリック: \`.claude/agents/civil-construction-review.md\`\n`;
  body += `- Generator: \`.claude/agents/civil-textbook-rewriter.md\`\n`;
  body += `- Orchestrator: \`/civil-textbook-cycle\`\n\n`;
  body += `生成: \`/civil-textbook-cycle --mode issue\` at ${new Date().toISOString()}\n`;

  // draft を保存
  const draftDir = dirname(ISSUE_DRAFT_PATH);
  if (!existsSync(draftDir)) mkdirSync(draftDir, { recursive: true });
  writeFileSync(ISSUE_DRAFT_PATH, `# ${title}\n\n${body}`, 'utf-8');

  console.log(`[issue] ${title}`);
  console.log(`[issue] 対象: ${candidates.length}件（guide ${byGroup.guide?.length || 0} + textbook ${byGroup.textbook?.length || 0}）`);
  console.log(`[issue] draft 保存: ${ISSUE_DRAFT_PATH}`);

  if (args.dryRun) {
    console.log(`\n=== Issue draft (dry-run) ===\n`);
    console.log(`# ${title}\n`);
    console.log(body);
    return;
  }

  // GitHub Issue は廃止（.claude/reference/information-architecture.md）。
  if (args.create) {
    console.log(`\n[issue] 注: GitHub Issue は廃止。--create は無効です。`);
  }
  console.log(`\n[issue] リライト候補レポートを ${ISSUE_DRAFT_PATH} に生成しました。`);
  console.log(`[issue] 着手するタスクは .claude/todo/ に追記してください（category: quality）。`);
}

// ── メイン ──────────────────────────────────────────────────────

function main() {
  const args = parseArgs(process.argv);

  if (args.help || !args.mode) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  switch (args.mode) {
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
    case 'issue':
      runIssue(args);
      break;
    default:
      console.error(`Unknown mode: ${args.mode}`);
      printHelp();
      process.exit(1);
  }
}

main();
