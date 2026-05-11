#!/usr/bin/env node
/**
 * /exam-keyword-cycle --auto / --keyword の自動選択ロジック。
 *
 * 入力:
 *   .claude/state/exam-keyword-cycles/progress.json（covered マップ）
 *   src/config/exam-question-keywords.json（過去問→キーワード対応表）
 *   src/config/past-exam-backlinks.json（キーワード→過去問逆引き、--keyword 時のみ）
 *
 * 出力（stdout, JSON 1 行）:
 *   { exam, question, reason } または { exam: null, reason } （候補なしの場合）
 *   --keyword 指定時は source_keyword フィールドが追加される
 *
 * アルゴリズム:
 *   通常（--auto 相当）:
 *     1. 年度を最新から遡る（R07 → R06 → ... → H21）
 *     2. 各年度で anchor を若番順に並べ、progress.json.covered に無い最初の設問を採用
 *     3. 全設問がカバー済みなら、covered の中で date が 6 ヶ月以上前の設問から若番優先で選ぶ
 *     4. 該当なしなら { exam: null } を返す
 *
 *   --keyword <slug> 指定時:
 *     1. past-exam-backlinks.json[slug] を読み、当該キーワードが参照される全過去問を取得
 *     2. その過去問群の中で年度降順 → 若番順に並べ、未カバーの最初の設問を採用
 *     3. 全カバー済みなら 180 日以上前の再訪候補から最古を選ぶ
 *     4. 該当なしなら { exam: null } を返す
 *
 * 使用例:
 *   node .claude/skills/quality/exam-keyword-cycle/scripts/select-next-question.mjs
 *   node .claude/skills/quality/exam-keyword-cycle/scripts/select-next-question.mjs --pretty
 *   node .claude/skills/quality/exam-keyword-cycle/scripts/select-next-question.mjs --keyword pdpc-method --pretty
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '../../../../../..');
const PROGRESS_PATH = resolve(REPO_ROOT, '.claude/state/exam-keyword-cycles/progress.json');
const CATALOG_PATH = resolve(REPO_ROOT, 'src/config/exam-question-keywords.json');
const BACKLINKS_PATH = resolve(REPO_ROOT, 'src/config/past-exam-backlinks.json');
const REVISIT_THRESHOLD_DAYS = 180;

function parseArgs(argv) {
  const args = { pretty: false, keyword: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--pretty') {
      args.pretty = true;
    } else if (argv[i] === '--keyword' && i + 1 < argv.length) {
      args.keyword = argv[++i];
    }
  }
  return args;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function examYearRank(examSlug) {
  // 最新年度ほど大きい数値を返す。R07 > R06 > ... > R01 > H30 > H29 > ... > H21
  const match = examSlug.match(/-([rh])(\d{2})-primary$/);
  if (!match) return -1;
  const era = match[1];
  const num = parseInt(match[2], 10);
  return era === 'r' ? 1000 + num : 100 + num;
}

function compareAnchor(a, b) {
  // "1-35" vs "2-3" を設問番号順に比較（数値ソート）
  const parseAnchor = (s) => s.split('-').map((n) => parseInt(n, 10));
  const [a1, a2] = parseAnchor(a);
  const [b1, b2] = parseAnchor(b);
  if (a1 !== b1) return a1 - b1;
  return a2 - b2;
}

function sortedExamsDesc(catalog) {
  return Object.keys(catalog).sort((a, b) => examYearRank(b) - examYearRank(a));
}

function findUncovered(catalog, covered) {
  for (const exam of sortedExamsDesc(catalog)) {
    const questions = Object.keys(catalog[exam]).sort(compareAnchor);
    const coveredForExam = covered[exam] ?? {};
    for (const q of questions) {
      if (!coveredForExam[q]) {
        return {
          exam,
          question: q,
          reason: `未カバー最優先: ${exam} の若番 ${q}`,
        };
      }
    }
  }
  return null;
}

function findRevisit(catalog, covered) {
  const now = Date.now();
  const thresholdMs = REVISIT_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
  const candidates = [];
  for (const exam of Object.keys(covered)) {
    for (const [question, meta] of Object.entries(covered[exam])) {
      if (!meta?.date) continue;
      const ageMs = now - new Date(meta.date).getTime();
      if (ageMs >= thresholdMs) {
        candidates.push({ exam, question, date: meta.date, ageMs });
      }
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    // 古い順 → 年度降順 → 若番順
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    const yr = examYearRank(b.exam) - examYearRank(a.exam);
    if (yr !== 0) return yr;
    return compareAnchor(a.question, b.question);
  });
  const top = candidates[0];
  const ageDays = Math.floor(top.ageMs / (24 * 60 * 60 * 1000));
  return {
    exam: top.exam,
    question: top.question,
    reason: `全設問カバー済み。再訪候補（${ageDays} 日前）: ${top.exam} ${top.question}`,
  };
}

function findByKeyword(keyword, backlinks, covered) {
  const refs = backlinks[keyword];
  if (!refs || refs.length === 0) {
    return {
      exam: null,
      question: null,
      reason: `--keyword ${keyword} は past-exam-backlinks.json に存在しない（過去問で言及されていない）`,
      source_keyword: keyword,
    };
  }

  // backlinks[keyword] = [{ examSlug, year, question, anchor }, ...]
  const candidates = refs.map((r) => ({
    exam: r.examSlug,
    question: r.anchor,
    yearRank: examYearRank(r.examSlug),
  }));

  // 年度降順 → 若番順
  candidates.sort((a, b) => {
    if (a.yearRank !== b.yearRank) return b.yearRank - a.yearRank;
    return compareAnchor(a.question, b.question);
  });

  // 未カバー優先
  for (const c of candidates) {
    if (!covered[c.exam]?.[c.question]) {
      return {
        exam: c.exam,
        question: c.question,
        reason: `未カバー最優先 (--keyword ${keyword} の関連過去問より): ${c.exam} ${c.question}`,
        source_keyword: keyword,
      };
    }
  }

  // 全カバー済みなら 180 日以上前の再訪候補
  const now = Date.now();
  const thresholdMs = REVISIT_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
  const revisitable = [];
  for (const c of candidates) {
    const meta = covered[c.exam]?.[c.question];
    if (meta?.date) {
      const ageMs = now - new Date(meta.date).getTime();
      if (ageMs >= thresholdMs) {
        revisitable.push({ ...c, date: meta.date, ageMs });
      }
    }
  }
  if (revisitable.length > 0) {
    revisitable.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const top = revisitable[0];
    const ageDays = Math.floor(top.ageMs / (24 * 60 * 60 * 1000));
    return {
      exam: top.exam,
      question: top.question,
      reason: `再訪候補（${ageDays} 日前、--keyword ${keyword}）: ${top.exam} ${top.question}`,
      source_keyword: keyword,
    };
  }

  return {
    exam: null,
    question: null,
    reason: `--keyword ${keyword} の関連過去問はすべてカバー済み（180 日以内）`,
    source_keyword: keyword,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const progress = readJson(PROGRESS_PATH);
  const covered = progress.covered ?? {};

  let result;
  if (args.keyword) {
    const backlinks = readJson(BACKLINKS_PATH);
    result = findByKeyword(args.keyword, backlinks, covered);
  } else {
    const catalog = readJson(CATALOG_PATH);
    result = findUncovered(catalog, covered) ?? findRevisit(catalog, covered) ?? {
      exam: null,
      question: null,
      reason: '候補なし（全設問カバー済みかつ再訪しきい値未満）',
    };
  }

  const out = args.pretty ? JSON.stringify(result, null, 2) : JSON.stringify(result);
  process.stdout.write(out + '\n');
}

main();
