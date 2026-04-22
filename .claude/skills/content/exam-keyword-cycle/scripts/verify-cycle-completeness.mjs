#!/usr/bin/env node
/**
 * /exam-keyword-cycle の完了判定スクリプト。
 *
 * 目的:
 *   過去問 1 問のサイクルが「全 RelatedKeywords を処理済み」か機械的に判定する。
 *   primary キーワード 1 つだけ処理して「完了」と誤判定する事態を構造的に防ぐ。
 *
 * 判定基準:
 *   各キーワード MDX 本文に過去問への正規インラインリンク
 *   `/docs/{exam-full-slug}#{anchor}` が含まれているか grep ベースで検査する。
 *   リンクが無い keyword は「未処理」とみなす。
 *
 * 入力:
 *   --exam <slug>        例: r04-primary（必須、--year と排他）
 *   --question <anchor>  例: 1-12（--exam と組み合わせ）
 *   --year <slug>        例: r04-primary（年度単位の集計、--question と排他）
 *   --pretty             整形 JSON 出力
 *
 * 出力（stdout, JSON）:
 *   単問モード:
 *     { complete, exam, question, expected_slugs, keywords_with_link, missing_slugs }
 *   年度モード:
 *     { exam, total, complete_count, incomplete_questions: [{question, missing_slugs}] }
 *
 * 終了コード:
 *   0 = complete（全件リンクあり）
 *   1 = incomplete（1 件以上 missing あり）
 *   2 = 引数エラー・ファイル不在
 *
 * 使用例:
 *   node .claude/skills/content/exam-keyword-cycle/scripts/verify-cycle-completeness.mjs \
 *     --exam r04-primary --question 1-12
 *
 *   node .claude/skills/content/exam-keyword-cycle/scripts/verify-cycle-completeness.mjs \
 *     --year r04-primary --pretty
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '../../../../../..');
const CATALOG_PATH = resolve(REPO_ROOT, 'src/config/exam-question-keywords.json');
const KEYWORD_DIR = resolve(REPO_ROOT, '.local/r2/posts/pe-comprehensive-management');
const EXAM_SLUG_PREFIX = 'pe-comprehensive-management';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function parseArgs(argv) {
  const args = { exam: null, question: null, year: null, pretty: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--exam') args.exam = argv[++i];
    else if (a === '--question') args.question = argv[++i];
    else if (a === '--year') args.year = argv[++i];
    else if (a === '--pretty') args.pretty = true;
  }
  return args;
}

function compareAnchor(a, b) {
  const parseAnchor = (s) => s.split('-').map((n) => parseInt(n, 10));
  const [a1, a2] = parseAnchor(a);
  const [b1, b2] = parseAnchor(b);
  if (a1 !== b1) return a1 - b1;
  return a2 - b2;
}

/**
 * 期待するインラインリンク文字列（ハイフンなしアンカー、#N-N 形式）
 * 本セッションで統一済みの形式。
 */
function expectedLink(fullSlug, question) {
  return `/docs/${fullSlug}#${question}`;
}

/**
 * 単一の question について完了判定を行う。
 */
function verifyQuestion(examSlug, question, catalog) {
  const fullSlug = `${EXAM_SLUG_PREFIX}-${examSlug}`;
  const entry = catalog[fullSlug]?.[question];
  if (!entry) {
    return {
      complete: false,
      exam: fullSlug,
      question,
      error: `catalog に ${fullSlug}[${question}] が見つかりません`,
      expected_slugs: [],
      keywords_with_link: [],
      missing_slugs: [],
    };
  }
  const expected = entry.slugs ?? [];
  const linkStr = expectedLink(fullSlug, question);
  const withLink = [];
  const missing = [];
  for (const slug of expected) {
    const mdxPath = resolve(KEYWORD_DIR, slug, 'article.mdx');
    if (!existsSync(mdxPath)) {
      missing.push(slug);
      continue;
    }
    const body = readFileSync(mdxPath, 'utf8');
    if (body.includes(linkStr)) {
      withLink.push(slug);
    } else {
      missing.push(slug);
    }
  }
  return {
    complete: missing.length === 0,
    exam: fullSlug,
    question,
    expected_slugs: expected,
    keywords_with_link: withLink,
    missing_slugs: missing,
  };
}

/**
 * 年度単位の集計判定。
 */
function verifyYear(examSlug, catalog) {
  const fullSlug = `${EXAM_SLUG_PREFIX}-${examSlug}`;
  const entry = catalog[fullSlug];
  if (!entry) {
    return {
      exam: fullSlug,
      error: `catalog に ${fullSlug} が見つかりません`,
      total: 0,
      complete_count: 0,
      incomplete_questions: [],
    };
  }
  const questions = Object.keys(entry).sort(compareAnchor);
  const incomplete = [];
  let completeCount = 0;
  for (const q of questions) {
    const result = verifyQuestion(examSlug, q, catalog);
    if (result.complete) {
      completeCount++;
    } else {
      incomplete.push({
        question: q,
        expected_count: result.expected_slugs.length,
        covered_count: result.keywords_with_link.length,
        missing_slugs: result.missing_slugs,
      });
    }
  }
  return {
    exam: fullSlug,
    total: questions.length,
    complete_count: completeCount,
    incomplete_count: incomplete.length,
    incomplete_questions: incomplete,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!existsSync(CATALOG_PATH)) {
    console.error(`ERROR: catalog not found at ${CATALOG_PATH}`);
    process.exit(2);
  }
  const catalog = readJson(CATALOG_PATH);

  let result;
  let complete;
  if (args.year) {
    result = verifyYear(args.year, catalog);
    complete = result.incomplete_count === 0 && !result.error;
  } else if (args.exam && args.question) {
    result = verifyQuestion(args.exam, args.question, catalog);
    complete = result.complete && !result.error;
  } else {
    console.error('Usage: --exam <slug> --question <anchor> | --year <slug>');
    process.exit(2);
  }

  const out = args.pretty ? JSON.stringify(result, null, 2) : JSON.stringify(result);
  process.stdout.write(out + '\n');
  process.exit(complete ? 0 : 1);
}

main();
