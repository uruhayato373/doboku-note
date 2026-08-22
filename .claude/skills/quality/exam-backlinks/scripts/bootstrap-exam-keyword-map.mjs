#!/usr/bin/env node
/**
 * exam-keyword-map.json 初期生成スクリプト
 *
 * 現行の exam-question-keywords.json（過去問MDX <RelatedKeywords> から生成済み）を
 * 変換して .claude/state/exam-keyword-map.json を生成する。
 *
 * 実行: node .claude/skills/quality/exam-backlinks/scripts/bootstrap-exam-keyword-map.mjs
 *
 * 出力:
 *   .claude/state/exam-keyword-map.json
 *     { category: { examDir: { anchor: slug[] } } }
 *
 * ※ 一度だけ実行して初期値を作る。以降は exam-keyword-map.json を直接編集する。
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const IN_FILE = path.join(ROOT, 'src/config/exam-question-keywords.json');
const OUT_FILE = path.join(ROOT, '.claude/state/exam-keyword-map.json');

const CATEGORIES = [
  'pe-comprehensive-management',
  'civil-construction-1',
];

function main() {
  if (!fs.existsSync(IN_FILE)) {
    console.error(`Not found: ${IN_FILE}`);
    console.error('先に npm run build-backlinks を実行して exam-question-keywords.json を生成してください。');
    process.exit(1);
  }

  const source = JSON.parse(fs.readFileSync(IN_FILE, 'utf8'));
  const map = {};

  for (const [examSlug, questions] of Object.entries(source)) {
    let category, examDir;
    for (const cat of CATEGORIES) {
      if (examSlug.startsWith(cat + '-')) {
        category = cat;
        examDir = examSlug.slice(cat.length + 1);
        break;
      }
    }
    if (!category) {
      console.warn(`  Unknown category, skipped: ${examSlug}`);
      continue;
    }

    if (!map[category]) map[category] = {};
    if (!map[category][examDir]) map[category][examDir] = {};

    for (const [anchor, { slugs }] of Object.entries(questions)) {
      if (Array.isArray(slugs) && slugs.length > 0) {
        map[category][examDir][anchor] = slugs;
      }
    }
  }

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(map, null, 2) + '\n');
  console.log(`✓ Wrote ${OUT_FILE}`);

  let totalExams = 0;
  let totalQuestions = 0;
  let totalRefs = 0;
  for (const [cat, exams] of Object.entries(map)) {
    totalExams += Object.keys(exams).length;
    for (const anchors of Object.values(exams)) {
      for (const slugs of Object.values(anchors)) {
        totalQuestions++;
        totalRefs += slugs.length;
      }
    }
    console.log(`  ${cat}: ${Object.keys(exams).length} exams`);
  }
  console.log(`  合計 ${totalExams} 試験年度 / ${totalQuestions} 設問 / ${totalRefs} キーワード参照`);
}

main();
