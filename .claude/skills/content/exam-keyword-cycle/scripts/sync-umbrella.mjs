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
 *   2. umbrella-builder.mjs で body を再生成（generate-umbrella.mjs と共通ロジック）
 *   3. gh issue edit <N> --body-file <draft> で更新
 *   4. 差分なしなら API を叩かない（簡易チェック）
 */

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import {
  DRAFT_DIR,
  TARGET_YEARS,
  buildParentUmbrellaBody,
  buildYearUmbrellaBody,
  loadCatalogAndProgress,
} from './lib/umbrella-builder.mjs';

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

  const { catalog, progress } = loadCatalogAndProgress();

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
