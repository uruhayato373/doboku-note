#!/usr/bin/env node
/**
 * 年度 / 親 Umbrella Issue の body を生成し、--create 時には gh issue create で発行する。
 *
 * 使用例:
 *   # R07 primary の年度 Umbrella を生成（dry-run、draft のみ）
 *   node .claude/skills/content/exam-keyword-cycle/scripts/generate-umbrella.mjs --exam pe-comprehensive-management-r07-primary
 *
 *   # 親 Umbrella を生成
 *   node .claude/skills/content/exam-keyword-cycle/scripts/generate-umbrella.mjs --parent
 *
 *   # 実際に gh で Issue を作成
 *   node .claude/skills/content/exam-keyword-cycle/scripts/generate-umbrella.mjs --exam pe-comprehensive-management-r07-primary --create
 *
 * 出力:
 *   draft: .claude/state/exam-keyword-cycles/umbrella-drafts/<exam>.md（または parent.md）
 *   --create 指定時: gh issue create で発行、progress.json.umbrella_issues に Issue 番号を記録
 *
 * progress.json schema 拡張:
 *   {
 *     "version": 1,
 *     "covered": {...},
 *     "umbrella_issues": {
 *       "pe-comprehensive-management-r07-primary": 35,
 *       ...,
 *       "parent": 40
 *     }
 *   }
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '../../../../../..');
const PROGRESS_PATH = resolve(REPO_ROOT, '.claude/state/exam-keyword-cycles/progress.json');
const CATALOG_PATH = resolve(REPO_ROOT, 'src/config/exam-question-keywords.json');
const DRAFT_DIR = resolve(REPO_ROOT, '.claude/state/exam-keyword-cycles/umbrella-drafts');

const TARGET_YEARS = [
  'pe-comprehensive-management-r07-primary',
  'pe-comprehensive-management-r06-primary',
  'pe-comprehensive-management-r05-primary',
  'pe-comprehensive-management-r04-primary',
  'pe-comprehensive-management-r03-primary',
];

const LABELS = 'umbrella,content-cycle';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, obj) {
  writeFileSync(path, JSON.stringify(obj, null, 2) + '\n', 'utf-8');
}

function compareAnchor(a, b) {
  const parseAnchor = (s) => s.split('-').map((n) => parseInt(n, 10));
  const [a1, a2] = parseAnchor(a);
  const [b1, b2] = parseAnchor(b);
  if (a1 !== b1) return a1 - b1;
  return a2 - b2;
}

function yearLabel(examSlug) {
  // pe-comprehensive-management-r07-primary → R07-primary
  const match = examSlug.match(/-(r\d{2}|h\d{2})-(primary|secondary)$/);
  if (!match) return examSlug;
  const [, era, type] = match;
  return `${era.toUpperCase()}-${type}`;
}

function anchorToRomanLabel(anchor) {
  // "1-1" → "Ⅰ-1-1"（総監 primary は Ⅰ のみ）
  return `Ⅰ-${anchor}`;
}

function groupByHeadAnchor(anchors) {
  const groups = {};
  for (const a of anchors) {
    const head = a.split('-')[0];
    groups[head] ??= [];
    groups[head].push(a);
  }
  return groups;
}

function buildYearUmbrellaBody(examSlug, progress, catalog) {
  const anchors = Object.keys(catalog[examSlug]).sort(compareAnchor);
  const covered = progress.covered?.[examSlug] ?? {};
  const coveredCount = anchors.filter((a) => covered[a]).length;
  const total = anchors.length;
  const percent = total > 0 ? Math.round((coveredCount / total) * 1000) / 10 : 0;
  const label = yearLabel(examSlug);
  const parentIssue = progress.umbrella_issues?.parent;

  let body = '';
  body += `## 関連ロードマップ\n`;
  body += `[docs/project/25_exam-keyword-cycle-roadmap.md](../blob/main/docs/project/25_exam-keyword-cycle-roadmap.md)\n\n`;
  if (parentIssue) {
    body += `**親 Umbrella**: #${parentIssue}\n\n`;
  }
  body += `## 進捗\n`;
  body += `**${coveredCount}/${total} (${percent}%)** <!-- sync marker: progress -->\n\n`;

  body += `## 問題（checkbox は自動同期 — 手動チェック禁止）\n\n`;
  const groups = groupByHeadAnchor(anchors);
  for (const [head, list] of Object.entries(groups)) {
    body += `### Ⅰ-${head}\n`;
    for (const a of list) {
      const checked = covered[a] ? 'x' : ' ';
      const prText = covered[a]?.pr ? ` — PR #${covered[a].pr}` : '';
      const dateText = covered[a]?.date ? ` (${covered[a].date})` : '';
      body += `- [${checked}] ${anchorToRomanLabel(a)}${prText}${dateText} <!-- anchor: ${a} -->\n`;
    }
    body += `\n`;
  }

  body += `## 次週の候補（3 件、週次レビュー時に更新）\n`;
  body += `<!-- sync marker: next-candidates -->\n\n`;

  body += `## 完了したサイクル（PR リンク）\n`;
  const completed = anchors.filter((a) => covered[a]);
  if (completed.length === 0) {
    body += `まだ完了サイクルなし。\n\n`;
  } else {
    for (const a of completed) {
      const c = covered[a];
      const prText = c.pr ? `PR #${c.pr}` : c.status ?? 'unknown';
      body += `- ${anchorToRomanLabel(a)} — ${prText}（${c.date ?? 'no-date'}）\n`;
    }
    body += `\n`;
  }
  body += `<!-- sync marker: completed-cycles -->\n\n`;

  body += `## 運用\n\n`;
  body += `- 1 サイクル = 1 過去問 + 関連キーワード群 + 1 PR\n`;
  body += `- checkbox は \`/exam-keyword-cycle\` が自動で更新する（手動で触らない）\n`;
  body += `- 進捗状態の真実源: \`.claude/state/exam-keyword-cycles/progress.json\`\n`;
  body += `- 全 checkbox check で close → 次年度 Umbrella へ\n\n`;

  body += `## 参照\n\n`;
  body += `- スキル: \`.claude/skills/content/exam-keyword-cycle/SKILL.md\`\n`;
  body += `- 生成: \`generate-umbrella.mjs\` / 同期: \`sync-umbrella.mjs\`\n`;
  body += `- カタログ: \`src/config/exam-question-keywords.json\`\n`;

  return {
    title: `[Umbrella] exam-keyword-cycle ${label} (${total} 問)`,
    body,
    coveredCount,
    total,
  };
}

function buildParentUmbrellaBody(progress, catalog) {
  let body = '';
  body += `## 関連ロードマップ\n`;
  body += `[docs/project/25_exam-keyword-cycle-roadmap.md](../blob/main/docs/project/25_exam-keyword-cycle-roadmap.md)\n\n`;

  let totalAll = 0;
  let coveredAll = 0;
  const rows = [];
  for (const exam of TARGET_YEARS) {
    if (!catalog[exam]) continue;
    const anchors = Object.keys(catalog[exam]);
    const covered = progress.covered?.[exam] ?? {};
    const c = anchors.filter((a) => covered[a]).length;
    const t = anchors.length;
    totalAll += t;
    coveredAll += c;
    const p = t > 0 ? Math.round((c / t) * 1000) / 10 : 0;
    const issueNum = progress.umbrella_issues?.[exam];
    const link = issueNum ? `#${issueNum}` : '_未作成_';
    rows.push(`| ${yearLabel(exam)} | ${link} | ${c}/${t} (${p}%) |`);
  }
  const percentAll = totalAll > 0 ? Math.round((coveredAll / totalAll) * 1000) / 10 : 0;

  body += `## 全体進捗\n`;
  body += `**${coveredAll}/${totalAll} (${percentAll}%)** <!-- sync marker: overall-progress -->\n\n`;

  body += `## 年度別 Umbrella\n\n`;
  body += `| 年度 | Umbrella | 進捗 |\n`;
  body += `|---|---|---|\n`;
  body += rows.join('\n') + '\n';
  body += `<!-- sync marker: year-umbrellas -->\n\n`;

  body += `## 今週実施分\n`;
  body += `<!-- sync marker: this-week -->\n\n`;

  body += `## 運用\n\n`;
  body += `- 本 Issue は **永続**（close しない）\n`;
  body += `- 各年度 Umbrella は全問完了で close → 次年度 Umbrella を作成\n`;
  body += `- 週次 \`/weekly-review\` Agent F が本 Issue のサマリを \`[PDCA] YYYY-Www\` に埋め込む\n`;
  body += `- 対象年度は直近 5 年（R07〜R03 primary）。追加年度が必要なら \`generate-umbrella.mjs\` の \`TARGET_YEARS\` を拡張\n\n`;

  body += `## 参照\n\n`;
  body += `- スキル: \`.claude/skills/content/exam-keyword-cycle/SKILL.md\`\n`;
  body += `- ロードマップ: \`docs/project/25_exam-keyword-cycle-roadmap.md\`\n`;
  body += `- 進捗 JSON: \`.claude/state/exam-keyword-cycles/progress.json\`\n`;

  return {
    title: `[Umbrella] exam-keyword-cycle 全体進捗`,
    body,
    coveredCount: coveredAll,
    total: totalAll,
  };
}

function ensureDraftDir() {
  if (!existsSync(DRAFT_DIR)) mkdirSync(DRAFT_DIR, { recursive: true });
}

function saveDraft(examKey, title, body) {
  ensureDraftDir();
  const path = resolve(DRAFT_DIR, `${examKey}.md`);
  writeFileSync(path, `# ${title}\n\n${body}`, 'utf-8');
  return path;
}

function ghCreateIssue(title, bodyFile) {
  let ghAvailable = false;
  try {
    execSync('gh --version', { stdio: 'pipe' });
    ghAvailable = true;
  } catch {
    ghAvailable = false;
  }
  if (!ghAvailable) {
    throw new Error('gh CLI が見つかりません。gh auth login 済みか確認してください。');
  }
  const out = execSync(
    `gh issue create --title ${JSON.stringify(title)} --label ${JSON.stringify(LABELS)} --body-file ${JSON.stringify(bodyFile)}`,
    { encoding: 'utf-8' }
  );
  const match = out.match(/\/issues\/(\d+)/);
  if (!match) {
    throw new Error(`Issue 番号が取得できません: ${out}`);
  }
  return { number: parseInt(match[1], 10), url: out.trim() };
}

function parseArgs(argv) {
  const args = { exam: null, parent: false, create: false, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--exam') args.exam = argv[++i];
    else if (a === '--parent') args.parent = true;
    else if (a === '--create') args.create = true;
    else if (a === '--dry-run') args.dryRun = true;
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.exam && !args.parent) {
    console.error('Usage: generate-umbrella.mjs (--exam <exam-slug> | --parent) [--create] [--dry-run]');
    process.exit(2);
  }

  const progress = readJson(PROGRESS_PATH);
  const catalog = readJson(CATALOG_PATH);

  let key, result;
  if (args.parent) {
    key = 'parent';
    result = buildParentUmbrellaBody(progress, catalog);
  } else {
    if (!catalog[args.exam]) {
      console.error(`[generate-umbrella] 未知の exam-slug: ${args.exam}`);
      process.exit(2);
    }
    key = args.exam;
    result = buildYearUmbrellaBody(args.exam, progress, catalog);
  }

  const draftPath = saveDraft(key, result.title, result.body);
  console.log(`[generate-umbrella] ${result.title}`);
  console.log(`[generate-umbrella] 進捗: ${result.coveredCount}/${result.total}`);
  console.log(`[generate-umbrella] draft 保存: ${draftPath}`);

  if (args.dryRun || !args.create) {
    console.log(`[generate-umbrella] dry-run（--create で実発行）`);
    return;
  }

  try {
    const { number, url } = ghCreateIssue(result.title, draftPath);
    console.log(`[generate-umbrella] ✓ Issue 作成: ${url}`);

    // progress.json に Issue 番号を記録
    progress.umbrella_issues ??= {};
    progress.umbrella_issues[key] = number;
    writeJson(PROGRESS_PATH, progress);
    console.log(`[generate-umbrella] progress.json.umbrella_issues.${key} = ${number} を記録`);
  } catch (e) {
    console.error(`[generate-umbrella] Issue 作成失敗: ${e.message}`);
    process.exit(1);
  }
}

main();
