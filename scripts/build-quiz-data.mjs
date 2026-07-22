#!/usr/bin/env node
// 過去問演習アプリ（/tools/kakomon-quiz ほか）用のクライアント配信データを生成する。
//
// なぜビルド時に切り出すか:
//   src/config/*-exam-questions.json は 1 資格 3MB 級。これをそのまま "use client" に
//   import するとクライアント JS バンドルに丸ごと載り LCP を壊す。演習に必要な最小
//   フィールドだけを共通スキーマ（src/lib/quiz/types.ts）へ正規化し、public/quiz/{exam}.json
//   として静的配信する（オンライン先行・ブラウザキャッシュ）。
//
// 追加資格の載せ方: SOURCES に { exam, examLabel, srcPath } を足すだけ。
// スキーマ差（body/correct/optionExplanations 等）は normalizeQuestion で吸収する。

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const SOURCES = [
  {
    exam: 'civil-1',
    examLabel: '1級土木施工管理技士 第一次検定',
    srcPath: 'src/config/civil-1-exam-questions.json',
  },
];

/** "h26" -> "平成26年度", "r01" -> "令和元年度", "r07" -> "令和7年度" */
function toYearLabel(year) {
  const m = /^([hr])0*(\d+)$/.exec(String(year).toLowerCase());
  if (!m) return String(year);
  const era = m[1] === 'h' ? '平成' : '令和';
  const n = Number(m[2]);
  const num = n === 1 ? '元' : String(n);
  return `${era}${num}年度`;
}

/** 生の 1 問を共通スキーマへ正規化する（civil-1 系スキーマ） */
function normalizeQuestion(raw, year) {
  const options = (raw.options || []).map((o) => ({
    num: o.num,
    text: String(o.text || '').trim(),
  }));
  const correct = raw.correct ?? raw.correctNum;
  // optionExplanations（各選択肢の正誤解説）を共通の explanations へ。
  // 欠けている選択肢は、正答フラグだけの最小解説で補完する（本文は空にせず選択肢文を流用しない）。
  const explByNum = new Map();
  for (const e of raw.optionExplanations || raw.explanations || []) {
    explByNum.set(e.num, {
      num: e.num,
      text: String(e.text || '').trim(),
      correct: typeof e.correct === 'boolean' ? e.correct : e.num === correct,
    });
  }
  const explanations = options.map(
    (o) =>
      explByNum.get(o.num) || {
        num: o.num,
        text: '',
        correct: o.num === correct,
      },
  );
  return {
    id: raw.id,
    year,
    yearLabel: toYearLabel(year),
    part: raw.part || '',
    body: String(raw.body || raw.question || '').trim(),
    options,
    correct,
    explanations,
  };
}

function buildDataset({ exam, examLabel, srcPath }) {
  const src = JSON.parse(readFileSync(resolve(ROOT, srcPath), 'utf8'));
  const years = [];
  const questions = [];
  for (const y of src.years || []) {
    const parts = new Set();
    let count = 0;
    for (const raw of y.questions || []) {
      if (!raw || !Array.isArray(raw.options) || raw.options.length === 0) continue;
      const q = normalizeQuestion(raw, y.year);
      if (q.correct == null || !q.body) continue;
      questions.push(q);
      if (q.part) parts.add(q.part);
      count += 1;
    }
    years.push({
      year: y.year,
      yearLabel: toYearLabel(y.year),
      parts: [...parts].sort(),
      count,
    });
  }
  return {
    exam,
    examLabel,
    generatedAt: src.generatedAt || new Date().toISOString(),
    years,
    questions,
  };
}

let totalQ = 0;
for (const source of SOURCES) {
  const dataset = buildDataset(source);
  const outPath = resolve(ROOT, `public/quiz/${source.exam}.json`);
  mkdirSync(dirname(outPath), { recursive: true });
  // 決定的な出力（改行は LF）。生成物なので pre-commit の対象外だが LF で統一。
  writeFileSync(outPath, JSON.stringify(dataset) + '\n', 'utf8');
  totalQ += dataset.questions.length;
  const bytes = Buffer.byteLength(JSON.stringify(dataset));
  console.log(
    `[build-quiz-data] ${source.exam}: ${dataset.questions.length}問 / ${dataset.years.length}年 -> public/quiz/${source.exam}.json (${(bytes / 1024).toFixed(0)}KB)`,
  );
}
console.log(`[build-quiz-data] 合計 ${totalQ} 問を生成`);
