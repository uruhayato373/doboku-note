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

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import katex from 'katex';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkHtml from 'remark-html';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const SOURCES = [
  {
    exam: 'civil-1',
    examLabel: '1級土木施工管理技士 第一次検定',
    kind: 'json',
    srcPath: 'src/config/civil-1-exam-questions.json',
  },
  {
    exam: 'pe-first-stage',
    examLabel: '技術士第一次試験（建設部門）',
    kind: 'pe-first-stage-mdx',
    srcPath: 'content/site/pe-first-stage',
  },
];

const PE1_SUBJECTS = {
  basic: { label: '基礎科目', order: 1, expectedPerYear: 30 },
  aptitude: { label: '適性科目', order: 2, expectedPerYear: 15 },
  construction: { label: '専門科目（建設部門）', order: 3, expectedPerYear: 35 },
};

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
      // civil-1の既存配信契約を維持する。ここでキー名を変えると、クイズ以外の
      // 既存クライアントが2MB超のJSON全体を差分として受け取ることになる。
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

function buildJsonDataset({ exam, examLabel, srcPath }) {
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

function stripMarkdown(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\*\*|__|`/g, '')
    .replace(/\$+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function renderQuizMarkdown(value) {
  const htmlTokens = [];
  const token = (html) => {
    const key = `QUIZHTMLTOKEN${htmlTokens.length}END`;
    htmlTokens.push(html);
    return key;
  };

  let source = String(value || '').trim();
  source = source.replace(/<ArticleImage\s+([\s\S]*?)\/>/g, (_, props) => {
    const src = (props.match(/src="([^"]+)"/) || [])[1] || '';
    const alt = (props.match(/alt="([^"]*)"/) || [])[1] || '';
    if (!src.startsWith('/posts/')) return '';
    return token(
      `<figure class="quiz-figure"><img src="${src}" alt="${alt.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" loading="lazy" /></figure>`,
    );
  });
  source = source.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) =>
    token(katex.renderToString(math.trim(), { displayMode: true, throwOnError: false })),
  );
  source = source.replace(/\$([^$\n]+?)\$/g, (_, math) =>
    token(katex.renderToString(math.trim(), { displayMode: false, throwOnError: false })),
  );

  let html = String(
    remark()
      .use(remarkGfm)
      .use(remarkHtml, { sanitize: false })
      .processSync(source),
  ).trim();
  html = html.replace(/QUIZHTMLTOKEN(\d+)END/g, (_, i) => htmlTokens[Number(i)] || '');
  return html;
}

function splitQuestionSections(body) {
  const matches = [...body.matchAll(/^##\s+([^\n]+)$/gm)].filter((m) => /^[ⅠⅡⅢ]/u.test(m[1].trim()));
  return matches.map((m, index) => ({
    heading: m[1].trim(),
    content: body.slice(m.index + m[0].length, matches[index + 1]?.index ?? body.length).trim(),
  }));
}

function parseTableBlock(block) {
  const rows = block
    .trim()
    .split('\n')
    .map((line) => line.replace(/^\s*\||\|\s*$/g, '').split('|').map((cell) => cell.trim()));
  const optionNum = (cell) => {
    const value = String(cell || '').trim();
    const ordinary = value.match(/^\(?([1-5])\)?\.?$/);
    if (ordinary) return Number(ordinary[1]);
    const circled = value ? '①②③④⑤'.indexOf(value) : -1;
    return circled >= 0 ? circled + 1 : null;
  };
  const dataRows = rows.filter((cells) => optionNum(cells[0]) != null);
  if (dataRows.length !== 5 || dataRows.map((r) => optionNum(r[0])).join('') !== '12345') {
    return null;
  }
  const header = rows.find((cells) => optionNum(cells[0]) == null && !cells.every((c) => /^:?-+:?$/.test(c)));
  const options = dataRows.map((cells) => {
    const num = optionNum(cells[0]);
    const parts = cells.slice(1).map((cell, i) => {
      const label = header?.[i + 1];
      return label ? `**${label}：** ${cell}` : cell;
    });
    return { num, markdown: parts.join(' ／ ') };
  });
  return options;
}

function extractOptions(questionPart) {
  const numbered = [...questionPart.matchAll(/^([1-5])\.\s+(.+)$/gm)];
  let run = null;
  for (let i = 0; i <= numbered.length - 5; i++) {
    if (numbered.slice(i, i + 5).map((m) => m[1]).join('') === '12345') run = numbered.slice(i, i + 5);
  }
  if (run) {
    const options = run.map((m, i) => {
      const start = m.index + m[0].indexOf(m[2]);
      const end = run[i + 1]?.index ?? questionPart.length;
      return { num: Number(m[1]), markdown: questionPart.slice(start, end).trim() };
    });
    return { body: questionPart.slice(0, run[0].index).trim(), options };
  }

  const tableBlocks = [...questionPart.matchAll(/^(?:\|[^\n]*\|[ \t]*(?:\n|$)){3,}/gm)];
  for (let i = tableBlocks.length - 1; i >= 0; i--) {
    const parsed = parseTableBlock(tableBlocks[i][0]);
    if (!parsed) continue;
    return {
      body: `${questionPart.slice(0, tableBlocks[i].index)}${questionPart.slice(tableBlocks[i].index + tableBlocks[i][0].length)}`.trim(),
      options: parsed,
    };
  }
  // 公式PDFで選択肢自体が1枚の図になっている問題。図は問題本文に残し、
  // 解答操作だけを番号ボタンとして補う（選択肢の内容を推測・再構成しない）。
  if (/<ArticleImage\s/.test(questionPart)) {
    return {
      body: questionPart.trim(),
      options: [1, 2, 3, 4, 5].map((num) => ({ num, markdown: `選択肢${num}（上の図を参照）` })),
    };
  }
  return null;
}

function extractExplanations(answerPart, correct) {
  const numbered = [...answerPart.matchAll(/^([1-5])\.\s+(.+)$/gm)];
  let run = null;
  for (let i = 0; i <= numbered.length - 5; i++) {
    if (numbered.slice(i, i + 5).map((m) => m[1]).join('') === '12345') run = numbered.slice(i, i + 5);
  }
  if (!run) return [];
  return run.map((m, i) => {
    const start = m.index + m[0].indexOf(m[2]);
    const end = run[i + 1]?.index ?? answerPart.length;
    const markdown = answerPart.slice(start, end).replace(/<ExamPoint[\s\S]*$/g, '').trim();
    return {
      num: Number(m[1]),
      text: stripMarkdown(markdown),
      html: renderQuizMarkdown(markdown),
      isAnswer: Number(m[1]) === correct,
      statementCorrect: markdown.includes('✅') ? true : markdown.includes('❌') ? false : null,
    };
  });
}

function extractExamPoint(answerPart) {
  const block = answerPart.match(/<ExamPoint\s+([\s\S]*?)\/>/)?.[1];
  if (!block) return null;
  const summary = block.match(/summary="([^"]+)"/)?.[1]?.trim() || '';
  const itemsBlock = block.match(/items=\{\[([\s\S]*?)\]\}/)?.[1] || '';
  const items = [...itemsBlock.matchAll(/"([^"]+)"/g)].map((match) => match[1].trim()).filter(Boolean);
  return summary ? { summary, items } : null;
}

function buildPeFirstStageDataset({ exam, examLabel, srcPath }) {
  const baseDir = resolve(ROOT, srcPath);
  const articleDirs = readdirSync(baseDir)
    .filter((name) => /^r\d{2}-(basic|aptitude|construction)$/.test(name))
    .sort();
  const questions = [];
  const modifiedDates = [];

  for (const articleDir of articleDirs) {
    const [, year, subject] = articleDir.match(/^(r\d{2})-(basic|aptitude|construction)$/);
    const file = resolve(baseDir, articleDir, 'article.mdx');
    const parsed = matter(readFileSync(file, 'utf8'));
    if (parsed.data.dateModified) modifiedDates.push(String(parsed.data.dateModified));
    const sections = splitQuestionSections(parsed.content);
    const expected = PE1_SUBJECTS[subject].expectedPerYear;
    if (sections.length !== expected) {
      throw new Error(`${articleDir}: 問題見出し ${sections.length}件（期待 ${expected}件）`);
    }

    for (const section of sections) {
      const details = section.content.match(/^([\s\S]*?)<details>\s*<summary>解答・解説<\/summary>([\s\S]*?)<\/details>/);
      if (!details) throw new Error(`${articleDir} ${section.heading}: 解答・解説ブロックを解析できません`);
      const extracted = extractOptions(details[1].trim());
      if (!extracted) throw new Error(`${articleDir} ${section.heading}: 5択を解析できません`);
      const correctRaw = (details[2].match(/\*\*正答：([^*]+)\*\*/) || [])[1]?.trim() || '';
      const correct = /^\d+$/.test(correctRaw) ? Number(correctRaw) : null;
      const explanations = extractExplanations(details[2], correct);
      const examPoint = extractExamPoint(details[2]);
      const explanationByNum = new Map(explanations.map((e) => [e.num, e]));
      const options = extracted.options.map((option) => ({
        num: option.num,
        text: stripMarkdown(option.markdown),
        html: renderQuizMarkdown(option.markdown),
      }));
      const normalizedExplanations = options.map((option) =>
        explanationByNum.get(option.num) || {
          num: option.num,
          text: correct == null ? '公式正答の番号が公表されていないため、元記事で論点整理を確認してください。' : '',
          html: '',
          isAnswer: option.num === correct,
          statementCorrect: null,
        },
      );
      const bodyHtml = renderQuizMarkdown(extracted.body);
      const richHtml = [bodyHtml, ...options.map((option) => option.html)].join('');
      const socialExclusionReasons = [
        /<img\b/.test(richHtml) ? 'image' : null,
        /class="katex/.test(richHtml) ? 'math' : null,
        /<table\b/.test(richHtml) ? 'table' : null,
        correct == null ? 'unscored' : null,
        options.length !== 5 ? 'options-not-five' : null,
        normalizedExplanations.length !== 5 || normalizedExplanations.some((item) => !item.text)
          ? 'explanations-not-five'
          : null,
      ].filter(Boolean);
      const headingId = section.heading.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').toLowerCase();
      questions.push({
        id: `${year}-${subject}-${headingId}`,
        year,
        yearLabel: toYearLabel(year),
        part: PE1_SUBJECTS[subject].label,
        subject,
        subjectLabel: PE1_SUBJECTS[subject].label,
        body: stripMarkdown(extracted.body),
        bodyHtml,
        options,
        correct,
        explanations: normalizedExplanations,
        examPoint,
        socialEligible: socialExclusionReasons.length === 0,
        socialExclusionReasons,
        articlePath: `/exam/pe-first-stage/primary/${articleDir}`,
      });
    }
  }

  const years = [...new Set(questions.map((q) => q.year))].sort().map((year) => ({
    year,
    yearLabel: toYearLabel(year),
    parts: Object.values(PE1_SUBJECTS).map((s) => s.label),
    count: questions.filter((q) => q.year === year).length,
  }));
  const subjects = Object.entries(PE1_SUBJECTS).map(([subject, meta]) => ({
    subject,
    subjectLabel: meta.label,
    count: questions.filter((q) => q.subject === subject).length,
  }));
  const unscored = questions.filter((q) => q.correct == null);
  if (questions.length !== 560 || unscored.length !== 1) {
    throw new Error(`pe-first-stage: ${questions.length}問 / 採点対象外${unscored.length}問（期待 560 / 1）`);
  }
  return {
    exam,
    examLabel,
    generatedAt: [...modifiedDates].sort().at(-1) || 'unknown',
    years,
    subjects,
    questions,
  };
}

let totalQ = 0;
for (const source of SOURCES) {
  const dataset = source.kind === 'pe-first-stage-mdx'
    ? buildPeFirstStageDataset(source)
    : buildJsonDataset(source);
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
