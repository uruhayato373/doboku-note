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

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import {
  DRAFT_DIR,
  PROGRESS_PATH,
  buildParentUmbrellaBody,
  buildYearUmbrellaBody,
  loadCatalogAndProgress,
  writeJson,
} from './lib/umbrella-builder.mjs';

const LABELS = 'umbrella,content-cycle';

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

  const { catalog, progress } = loadCatalogAndProgress();

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
  const partial = result.partialCount ? `（partial: ${result.partialCount}）` : '';
  console.log(`[generate-umbrella] 進捗: ${result.coveredCount}/${result.total} full-cycle${partial}`);
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
