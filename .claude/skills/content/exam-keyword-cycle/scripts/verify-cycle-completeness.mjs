#!/usr/bin/env node
/**
 * 過去問 1 問の「full-cycle 完了」を機械的に検証する純粋な突合スクリプト。
 *
 * 検査ロジック:
 *   1. catalog (exam-question-keywords.json[exam][anchor].slugs) を正解セット
 *   2. progress.json.covered[exam][anchor].keywords を処理済みセット
 *   3. processed_slugs ⊇ expected_slugs なら coverage OK
 *   4. coverage OK かつ status === 'full_cycle_complete' なら completed
 *
 * cem-qa スコアは logs の参照パスを surface するのみ（実評価は cem-qa サブエージェント側）。
 *
 * 使用例:
 *   node verify-cycle-completeness.mjs --exam pe-comprehensive-management-r04-primary --question 1-1
 *   node verify-cycle-completeness.mjs --exam pe-comprehensive-management-r04-primary --all
 *   node verify-cycle-completeness.mjs --all --json
 *
 * Exit code:
 *   0: completed (すべての対象が full_cycle_complete)
 *   1: 未完了 (missing_slugs あり または status mismatch)
 *   2: usage error
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  LOGS_DIR,
  TARGET_YEARS,
  cemQaThresholdFor,
  classifyQuestionCoverage,
  loadCatalogAndProgress,
} from './lib/umbrella-builder.mjs';

/**
 * 指定 exam/anchor に対応する logs フォルダ内のログパスを探す。
 * ファイル名形式: YYYY-MM-DD-{exam-short}-{anchor}.md（exam-short は r07-primary 等）
 */
function findLogPath(examSlug, anchor) {
  if (!existsSync(LOGS_DIR)) return null;
  const shortExam = examSlug.replace('pe-comprehensive-management-', '');
  const files = readdirSync(LOGS_DIR)
    .filter((f) => f.endsWith(`-${shortExam}-${anchor}.md`))
    .sort(); // 最新日付が最後尾
  if (files.length === 0) return null;
  return resolve(LOGS_DIR, files[files.length - 1]);
}

/**
 * ログ本文・frontmatter から cem-qa スコア（After 側）を最善努力で抽出。
 * フォーマットが揺れるため best effort。見つからなければ null。
 */
function extractCemQaScore(logPath) {
  if (!logPath || !existsSync(logPath)) return null;
  const text = readFileSync(logPath, 'utf8');

  // frontmatter の cem_qa_score / cem_qa_after
  const fmAfter = text.match(/^cem_qa_after:\s*([\d.]+)/m);
  if (fmAfter) return parseFloat(fmAfter[1]);
  const fmScore = text.match(/^cem_qa_score:\s*([\d.]+)/m);
  if (fmScore) return parseFloat(fmScore[1]);

  // 本文中の「cem-qa スコア: 2.1 → 2.6」形式の最大値を取る
  const matches = [...text.matchAll(/cem-qa\s*スコア[：:]*\s*[\d.]+\s*→\s*([\d.]+)/g)];
  if (matches.length > 0) {
    const scores = matches.map((m) => parseFloat(m[1]));
    return Math.min(...scores); // 最小値（全キーワードの最低合格ラインで判定したいケース）
  }
  return null;
}

function verifyOne(examSlug, anchor, catalog, progress) {
  const entry = progress.covered?.[examSlug]?.[anchor];
  const expected = catalog[examSlug]?.[anchor]?.slugs ?? [];
  const processed = entry?.keywords ?? [];
  const classification = classifyQuestionCoverage(examSlug, anchor, catalog, entry);
  const threshold = cemQaThresholdFor(examSlug);

  const expectedSet = new Set(expected);
  const processedSet = new Set(processed);
  const missing = expected.filter((s) => !processedSet.has(s));
  const extra = processed.filter((s) => !expectedSet.has(s));

  const logPath = findLogPath(examSlug, anchor);
  const cemQaScore = extractCemQaScore(logPath);

  const coverageOk = missing.length === 0 && expected.length > 0;
  const statusOk = entry?.status === 'full_cycle_complete';
  const thresholdOk = cemQaScore !== null && cemQaScore >= threshold;

  return {
    exam: examSlug,
    question: anchor,
    threshold,
    completed: coverageOk && statusOk,
    // 詳細フィールド
    processed: classification.processed,
    total: classification.total,
    expected_slugs: expected,
    processed_slugs: processed,
    missing_slugs: missing,
    extra_slugs: extra,
    status: entry?.status ?? null,
    pr: entry?.pr ?? null,
    date: entry?.date ?? null,
    cem_qa_score: cemQaScore,
    cem_qa_ok: thresholdOk,
    log_path: logPath
      ? logPath.replace(resolve(LOGS_DIR, '..'), '.claude/state/exam-keyword-cycles').replace(/\\/g, '/')
      : null,
    reasons: [
      coverageOk ? null : `missing ${missing.length} slugs`,
      statusOk ? null : `status=${entry?.status ?? 'unset'} (expected full_cycle_complete)`,
      cemQaScore === null ? 'cem-qa score not recorded' : thresholdOk ? null : `cem-qa ${cemQaScore} < ${threshold}`,
    ].filter(Boolean),
  };
}

function summarize(results) {
  const byExam = {};
  for (const r of results) {
    byExam[r.exam] ??= { completed: 0, total: 0 };
    byExam[r.exam].total++;
    if (r.completed) byExam[r.exam].completed++;
  }
  return byExam;
}

function printHuman(results) {
  const summary = summarize(results);
  for (const [exam, s] of Object.entries(summary)) {
    console.log(`\n== ${exam}: ${s.completed}/${s.total} full-cycle ==`);
  }
  for (const r of results) {
    const mark = r.completed ? '✓' : '✗';
    const coverage = `${r.processed}/${r.total}`;
    const score = r.cem_qa_score !== null ? `cem-qa ${r.cem_qa_score}` : 'cem-qa n/a';
    console.log(`${mark} ${r.exam} ${r.question}  ${coverage}  ${score}  [${r.status ?? '-'}]`);
    if (!r.completed) {
      for (const reason of r.reasons) {
        console.log(`    - ${reason}`);
      }
      if (r.missing_slugs.length > 0) {
        console.log(`    missing: ${r.missing_slugs.join(', ')}`);
      }
    }
  }
}

function parseArgs(argv) {
  const args = { exam: null, question: null, all: false, json: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--exam') args.exam = argv[++i];
    else if (a === '--question') args.question = argv[++i];
    else if (a === '--all') args.all = true;
    else if (a === '--json') args.json = true;
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.exam && !args.all) {
    console.error('Usage: verify-cycle-completeness.mjs (--exam <slug> [--question <anchor>] | --all) [--json]');
    process.exit(2);
  }

  const { catalog, progress } = loadCatalogAndProgress();

  const targets = [];
  if (args.all && !args.exam) {
    for (const exam of TARGET_YEARS) {
      if (!catalog[exam]) continue;
      for (const anchor of Object.keys(catalog[exam])) {
        targets.push({ exam, anchor });
      }
    }
  } else if (args.exam && args.all) {
    if (!catalog[args.exam]) {
      console.error(`[verify] 未知の exam-slug: ${args.exam}`);
      process.exit(2);
    }
    for (const anchor of Object.keys(catalog[args.exam])) {
      targets.push({ exam: args.exam, anchor });
    }
  } else if (args.exam && args.question) {
    if (!catalog[args.exam]) {
      console.error(`[verify] 未知の exam-slug: ${args.exam}`);
      process.exit(2);
    }
    if (!catalog[args.exam][args.question]) {
      console.error(`[verify] 未知の question anchor: ${args.question}`);
      process.exit(2);
    }
    targets.push({ exam: args.exam, anchor: args.question });
  } else {
    console.error('[verify] --exam <slug> には --question <anchor> または --all が必要');
    process.exit(2);
  }

  const results = targets.map(({ exam, anchor }) => verifyOne(exam, anchor, catalog, progress));

  if (args.json) {
    console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, 2));
  } else {
    printHuman(results);
  }

  const allCompleted = results.every((r) => r.completed);
  process.exit(allCompleted ? 0 : 1);
}

main();
