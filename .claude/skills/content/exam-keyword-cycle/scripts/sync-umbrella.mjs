#!/usr/bin/env node
/**
 * Umbrella Issue の body を progress.json から再生成し、gh issue edit --body-file で反映する。
 *
 * 使用例:
 *   # 指定年度の Umbrella を同期
 *   node .claude/skills/content/exam-keyword-cycle/scripts/sync-umbrella.mjs --exam pe-comprehensive-management-r07-primary
 *
 *   # 親 Umbrella を同期
 *   node .claude/skills/content/exam-keyword-cycle/scripts/sync-umbrella.mjs --parent
 *
 *   # 全 Umbrella を一括同期
 *   node .claude/skills/content/exam-keyword-cycle/scripts/sync-umbrella.mjs --all
 *
 * 動作:
 *   1. progress.json.umbrella_issues から Issue 番号を取得
 *   2. generate-umbrella.mjs と同じビルダーで body を再生成
 *   3. gh issue edit <N> --body-file <draft> で更新
 *   4. 差分なしなら API を叩かない（簡易チェック）
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

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function compareAnchor(a, b) {
  const parseAnchor = (s) => s.split('-').map((n) => parseInt(n, 10));
  const [a1, a2] = parseAnchor(a);
  const [b1, b2] = parseAnchor(b);
  if (a1 !== b1) return a1 - b1;
  return a2 - b2;
}

function yearLabel(examSlug) {
  const match = examSlug.match(/-(r\d{2}|h\d{2})-(primary|secondary)$/);
  if (!match) return examSlug;
  const [, era, type] = match;
  return `${era.toUpperCase()}-${type}`;
}

function anchorToRomanLabel(anchor) {
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

// --- build 関数は generate-umbrella.mjs と共通ロジック（コピー） ---

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
  };
}

function ensureDraftDir() {
  if (!existsSync(DRAFT_DIR)) mkdirSync(DRAFT_DIR, { recursive: true });
}

function saveDraft(key, title, body) {
  ensureDraftDir();
  const path = resolve(DRAFT_DIR, `${key}.md`);
  writeFileSync(path, `# ${title}\n\n${body}`, 'utf-8');
  return path;
}

function syncOne(key, progress, catalog) {
  const issueNum = progress.umbrella_issues?.[key];
  if (!issueNum) {
    console.warn(`[sync-umbrella] ${key}: Issue 番号が progress.json.umbrella_issues に未登録。スキップ。`);
    return { skipped: true };
  }

  let result;
  if (key === 'parent') {
    result = buildParentUmbrellaBody(progress, catalog);
  } else {
    if (!catalog[key]) {
      console.warn(`[sync-umbrella] ${key}: catalog にない exam-slug。スキップ。`);
      return { skipped: true };
    }
    result = buildYearUmbrellaBody(key, progress, catalog);
  }

  const draftPath = saveDraft(key, result.title, result.body);

  // 差分チェック: 現在の Issue body を取得して比較
  let currentBody = '';
  try {
    currentBody = execSync(
      `gh issue view ${issueNum} --json body --jq .body`,
      { encoding: 'utf-8' }
    );
  } catch (e) {
    console.warn(`[sync-umbrella] ${key}: gh issue view 失敗（${e.message}）。edit は試行する。`);
  }
  // gh は body を改行なしで返すことがあるため、単純な文字列比較
  const newBodyNormalized = result.body.replace(/\r\n/g, '\n').trimEnd();
  const curBodyNormalized = currentBody.replace(/\r\n/g, '\n').trimEnd();
  if (curBodyNormalized && newBodyNormalized === curBodyNormalized) {
    console.log(`[sync-umbrella] ${key} (#${issueNum}): 差分なし、スキップ`);
    return { skipped: true };
  }

  try {
    execSync(
      `gh issue edit ${issueNum} --body-file ${JSON.stringify(draftPath)}`,
      { encoding: 'utf-8', stdio: 'pipe' }
    );
    console.log(`[sync-umbrella] ${key} (#${issueNum}): ✓ 更新完了`);
    return { updated: true };
  } catch (e) {
    console.error(`[sync-umbrella] ${key} (#${issueNum}): gh issue edit 失敗: ${e.message}`);
    return { error: e.message };
  }
}

function parseArgs(argv) {
  const args = { exam: null, parent: false, all: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--exam') args.exam = argv[++i];
    else if (a === '--parent') args.parent = true;
    else if (a === '--all') args.all = true;
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.exam && !args.parent && !args.all) {
    console.error('Usage: sync-umbrella.mjs (--exam <exam-slug> | --parent | --all)');
    process.exit(2);
  }

  const progress = readJson(PROGRESS_PATH);
  const catalog = readJson(CATALOG_PATH);

  if (args.all) {
    // 年度 Umbrella → 親 の順（親は年度番号に依存）
    for (const exam of TARGET_YEARS) {
      syncOne(exam, progress, catalog);
    }
    syncOne('parent', progress, catalog);
  } else if (args.parent) {
    syncOne('parent', progress, catalog);
  } else {
    syncOne(args.exam, progress, catalog);
  }
}

main();
