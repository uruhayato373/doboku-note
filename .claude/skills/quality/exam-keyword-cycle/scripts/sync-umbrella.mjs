#!/usr/bin/env node
/**
 * 年度 / 親の進捗サマリ draft markdown を progress.json から再生成する。
 *
 * GitHub Issue は廃止（.claude/reference/information-architecture.md）。
 * 旧版は GitHub の Umbrella Issue を gh CLI で更新していたが、現在は
 * .claude/state/exam-keyword-cycles/umbrella-drafts/ の draft markdown を
 * 再生成するだけ。進捗の真実源は progress.json（Zone C）、人間用ビューは
 * docs/project/TODO.md。
 *
 * 使用例:
 *   # 指定年度の進捗 draft を再生成
 *   node .claude/skills/quality/exam-keyword-cycle/scripts/sync-umbrella.mjs --exam pe-comprehensive-management-r07-primary
 *
 *   # 親（全体）の進捗 draft を再生成
 *   node .claude/skills/quality/exam-keyword-cycle/scripts/sync-umbrella.mjs --parent
 *
 *   # 全年度 + 親をまとめて再生成
 *   node .claude/skills/quality/exam-keyword-cycle/scripts/sync-umbrella.mjs --all
 */

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
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
  console.log(`[sync-umbrella] ${key}: draft 再生成 ${draftPath}`);
  return { updated: true };
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
