#!/usr/bin/env node
// 技術士第一次試験のクイズJSONから、IG過去問4問パックを科目別・年度別に生成する。
// 図・数式・表・公式正答番号なしの問題は、クイズ本体には残したままSNSだけ除外する。

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chooseProblemLayout } from '../.claude/scripts/lib/sns-common/quiz-slides.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_PATH = resolve(ROOT, 'public/quiz/pe-first-stage.json');
const OUT_ROOT = resolve(ROOT, 'content/sns/instagram/pe-first-stage/exam-packs');
const arg = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
};
const requestedYear = arg('--year');
const allYears = process.argv.includes('--all');
if (!requestedYear && !allYears) {
  console.error('Usage: node scripts/generate-pe-first-stage-exam-packs.mjs --year r07 | --all');
  process.exit(1);
}

const dataset = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
const years = allYears ? dataset.years.map((item) => item.year) : [requestedYear];
const SUPERSCRIPTS = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻' };
const clean = (value) => String(value || '')
  .replace(/\^\{([0-9+\-]+)\}/gu, (_, chars) => [...chars].map((char) => SUPERSCRIPTS[char] || char).join(''))
  .replace(/\\times/gu, '×')
  .replace(/\\div/gu, '÷')
  .replace(/\\rho/gu, 'ρ')
  .replace(/\\lambda/gu, 'λ')
  .replace(/\\mu/gu, 'μ')
  .replace(/\$/gu, '')
  .replace(/[✅❌]/gu, '')
  .replace(/\s+/gu, ' ')
  .trim();
const yearTitle = (year) => dataset.years.find((item) => item.year === year)?.yearLabel || year.toUpperCase();
const splitBody = (body) => {
  const text = clean(body);
  // 1080px幅でも一読できる長さに明示的に折る。レイアウト側のauto-fitは
  // 行数と選択肢量を見て最終調整するため、長い1行を渡さない。
  const chunks = text.match(/.{1,32}/gu)?.map((item) => item.trim()).filter(Boolean);
  return chunks?.length ? chunks : [text];
};
const topicTitle = (question) => {
  const body = clean(question.body);
  const relatedTerms = body.match(/関連する用語に、(.{2,36}?)がある/u)?.[1];
  if (relatedTerms) return relatedTerms;

  const subjectClause = body.match(/^(.{2,60}?)(?:に関する|について)/u)?.[1];
  if (subjectClause) {
    // 「〜として知られる、PDCAサイクル」のような導入は最後の読点以降を主題にする。
    const suffix = subjectClause.split(/[、，]/u).at(-1)?.trim();
    if (suffix && suffix.length >= 2) return suffix;
  }

  const summary = clean(question.examPoint?.summary || '');
  if (/^許容応力/u.test(summary) && /安全率/u.test(summary)) return '許容応力と安全率';
  const summarySubject = summary.match(/^(.{2,28}?)(?:は|＝)/u)?.[1];
  if (summarySubject) return summarySubject;
  const firstSentence = summary.split('。')[0];
  return firstSentence.length > 34 ? `${firstSentence.slice(0, 33)}…` : firstSentence;
};
const buildProblem = (question) => {
  const rawBody = clean(question.body);
  const listAnchor = rawBody.search(/。\s*（ア）/u);
  let body = rawBody;
  let lists;
  if (listAnchor >= 0) {
    const listStart = rawBody.indexOf('（ア）', listAnchor);
    const listText = rawBody.slice(listStart);
    const items = [...listText.matchAll(/（([ア-カA-E])）([\s\S]*?)(?=（[ア-カA-E]）|$)/gu)]
      .map((match) => `（${match[1]}）${match[2].trim()}`);
    if (items.length >= 2) {
      body = rawBody.slice(0, listStart).trim();
      lists = [{ label: '記述', items }];
    }
  }
  return {
    type: 'problem',
    bodyLines: splitBody(body),
    options: question.options.map((option) => ({ num: option.num, text: clean(option.text) })),
    ...(lists ? { lists } : {}),
  };
};

const manifest = { exam: 'pe-first-stage', generatedAt: dataset.generatedAt, years: {} };
for (const year of years) {
  let packNumber = 1;
  const generated = [];
  const omitted = [];
  for (const subject of dataset.subjects) {
    const eligible = dataset.questions
      .filter((question) => question.year === year && question.subject === subject.subject && question.socialEligible)
      .map((question) => ({
        question,
        problem: buildProblem(question),
      }))
      .filter(({ question, problem }) => {
        const fits = chooseProblemLayout(problem).fits;
        if (!fits) omitted.push({ id: question.id, reason: 'layout-overflow' });
        return fits;
      });

    const fullPackCount = Math.floor(eligible.length / 4);
    for (let groupIndex = 0; groupIndex < fullPackCount; groupIndex++) {
      const group = eligible.slice(groupIndex * 4, groupIndex * 4 + 4);
      const packNum = String(packNumber).padStart(2, '0');
      const slides = [
        {
          type: 'cover',
          title: yearTitle(year),
          subtitle: `${subject.subjectLabel} 過去問`,
          sectionTag: '過去問',
          pageIndex: 1,
          totalPages: 10,
        },
      ];
      group.forEach(({ question, problem }, questionIndex) => {
        const qNum = questionIndex + 1;
        const correctExplanation = question.explanations.find((item) => item.num === question.correct);
        slides.push(
          { ...problem, qNum, totalQ: 4 },
          {
            type: 'answer',
            correctNum: question.correct,
            correctText: topicTitle(question) || `正答 ${question.correct}`,
            optionExplanations: question.explanations.map((item) => ({
              num: item.num,
              correct: item.statementCorrect,
              text: clean(item.text),
            })),
            pointText: clean(question.examPoint?.summary || correctExplanation?.text || question.examPoint?.items?.[0] || ''),
            qNum,
            totalQ: 4,
            sourceQuestionId: question.id,
            articlePath: question.articlePath,
          },
        );
      });
      slides.push({ type: 'cta', pageIndex: 10, totalPages: 10 });
      const outDir = resolve(OUT_ROOT, year, `pack-${packNum}`);
      mkdirSync(outDir, { recursive: true });
      const slideData = {
        _meta: {
          exam: 'pe-first-stage',
          examDir: '技術士一次',
          year,
          packNum,
          fmtLabel: `${subject.subjectLabel} 過去問`,
          subject: subject.subject,
          subjectLabel: subject.subjectLabel,
          source: 'public/quiz/pe-first-stage.json',
        },
        slides,
      };
      writeFileSync(resolve(outDir, 'slide-data.json'), `${JSON.stringify(slideData, null, 2)}\n`, 'utf8');
      generated.push({ packNum, subject: subject.subject, questionIds: group.map(({ question }) => question.id) });
      packNumber += 1;
    }
    for (const { question } of eligible.slice(fullPackCount * 4)) {
      omitted.push({ id: question.id, reason: 'subject-pack-remainder' });
    }
  }
  manifest.years[year] = { generated, omitted };
  console.log(`[pe1-ig] ${year}: ${generated.length} packs / ${generated.length * 4} questions / omitted ${omitted.length}`);
}
mkdirSync(OUT_ROOT, { recursive: true });
writeFileSync(resolve(OUT_ROOT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
