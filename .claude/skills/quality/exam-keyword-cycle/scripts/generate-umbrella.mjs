#!/usr/bin/env node
/**
 * 年度 / 親の進捗サマリ body を生成する（exam-keyword-cycle のカバレッジ可視化）。
 *
 * GitHub Issue は廃止（.claude/reference/information-architecture.md）。進捗の
 * 真実源は progress.json（Zone C）。本スクリプトはそれを人間可読な Markdown
 * draft に整形するだけで、Issue は作成しない。
 *
 * 使用例:
 *   # R07 primary の年度進捗サマリを生成
 *   node .claude/skills/quality/exam-keyword-cycle/scripts/generate-umbrella.mjs --exam pe-comprehensive-management-r07-primary
 *
 *   # 親（全体）の進捗サマリを生成
 *   node .claude/skills/quality/exam-keyword-cycle/scripts/generate-umbrella.mjs --parent
 *
 * 出力:
 *   draft: .claude/state/exam-keyword-cycles/umbrella-drafts/<exam>.md（または parent.md）
 */

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  DRAFT_DIR,
  buildParentUmbrellaBody,
  buildYearUmbrellaBody,
  loadCatalogAndProgress,
} from './lib/umbrella-builder.mjs';

function ensureDraftDir() {
  if (!existsSync(DRAFT_DIR)) mkdirSync(DRAFT_DIR, { recursive: true });
}

function saveDraft(examKey, title, body) {
  ensureDraftDir();
  const path = resolve(DRAFT_DIR, `${examKey}.md`);
  writeFileSync(path, `# ${title}\n\n${body}`, 'utf-8');
  return path;
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
    console.error('Usage: generate-umbrella.mjs (--exam <exam-slug> | --parent)');
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
  console.log(`[generate-umbrella] 進捗: ${result.coveredCount}/${result.total} full-cycle`);
  console.log(`[generate-umbrella] draft 保存: ${draftPath}`);

  if (args.create) {
    console.log('[generate-umbrella] 注: GitHub Issue は廃止。--create は無効です。');
    console.log('[generate-umbrella] 進捗の真実源は progress.json、人間用ビューは docs/project/TODO.md。');
  }
}

main();
