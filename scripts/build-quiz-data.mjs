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
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { renderQuizMarkdown, stripMarkdown } from './lib/quiz-markdown.mjs';
import { jstDayOf } from './lib/jst-date.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

// 出力先。既定は配信用の public/quiz。テストは --out-dir で一時ディレクトリへ出し、追跡中の生成物を書き換えない。
const outDirArg = process.argv.indexOf('--out-dir');
const OUT_DIR = outDirArg >= 0 ? resolve(process.argv[outDirArg + 1]) : resolve(ROOT, 'public/quiz');

/** frontmatter の日付（YAML は Date に解釈される）を JST の YYYY-MM-DD に揃える。String(Date) は実行環境のロケールで表記が変わり、並べても日付順にならない */
const toJstDate = (v) => (v instanceof Date ? jstDayOf(v) : String(v));

export const SOURCES = [
  {
    exam: 'civil-1',
    examLabel: '1級土木施工管理技士 第一次検定',
    kind: 'json',
    srcPath: 'src/config/civil-1-exam-questions.json',
  },
  {
    exam: 'pe-first-stage',
    examLabel: '技術士第一次試験（建設部門・上下水道部門）',
    kind: 'pe-first-stage-mdx',
    srcPath: 'content/site/pe-first-stage',
  },
  // 総監の択一。Web 演習は未公開なので public/quiz へは書かない（web: false）。
  // iOS アプリの書き出し（scripts/build-ios-quiz-bundle.mjs）だけが使う（docs/products/07_iOS択一アプリ試作方針.md）
  {
    exam: 'cem',
    examLabel: '技術士第二次試験 総合技術監理部門 択一式',
    kind: 'cem-json',
    srcPath: 'src/config/exam-questions.json',
    web: false,
  },
];

// H23・H24 の基礎科目は 25 問（H25 から 30 問）。
const pe1ExpectedPerYear = (year, subject) =>
  subject === 'basic' && ['h23', 'h24'].includes(year) ? 25 : PE1_SUBJECTS[subject].expectedPerYear;

const PE1_SUBJECTS = {
  basic: { label: '基礎科目', order: 1, expectedPerYear: 30 },
  aptitude: { label: '適性科目', order: 2, expectedPerYear: 15 },
  construction: { label: '専門科目（建設部門）', order: 3, expectedPerYear: 35 },
  // 上下水道部門（2026-10-02 公開・DN-0508）。演習では専門科目を部門で選び、年度別・ランダムは選んだ部門だけを含める
  'water-supply': { label: '専門科目（上下水道部門）', order: 4, expectedPerYear: 35 },
};

/** "h26" -> "平成26年度", "r01" -> "令和元年度", "r07" -> "令和7年度" */
function toYearLabel(year) {
  const m = /^([hr])0*(\d+)(-retry)?$/.exec(String(year).toLowerCase());
  if (!m) return String(year);
  const era = m[1] === 'h' ? '平成' : '令和';
  const n = Number(m[2]);
  const num = n === 1 ? '元' : String(n);
  return `${era}${num}年度${m[3] ? "（再試験）" : ""}`;
}

/** 和暦コードを西暦相当の通し番号へ変換し、新しい年度から並べるために使う。 */
function peYearRank(year) {
  const m = /^([hr])0*(\d+)(-retry)?$/.exec(String(year).toLowerCase());
  if (!m) return Number.NEGATIVE_INFINITY;
  return Number(m[2]) + (m[1] === 'h' ? 1988 : 2018) + (m[3] ? 0.1 : 0);
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


const CIRCLED = { '①': 1, '②': 2, '③': 3, '④': 4, '⑤': 5 };

/**
 * 組合せ問題で本文の表にしか無い選択肢（行が `| 1. | ア | イ |`・`| (1) | … |`・`| ① | … |`、または列の見出しが ①〜⑤）を取り出す。
 * 1 から連番で 2 つ以上そろったときだけ返し、そろわなければ空配列（呼び出し側がその問題を落として数える）。
 */
export function optionsFromTable(body) {
  const out = [];
  for (const line of String(body || '').split('\n')) {
    const m = /^\|\s*(?:\(?([1-5])[.)．）]?|([①-⑤]))\s*\|(.+)\|$/u.exec(line.trim());
    if (!m) continue;
    const cells = m[3].split('|').map((c) => stripMarkdown(c)).filter(Boolean);
    out.push({ num: m[1] ? Number(m[1]) : CIRCLED[m[2]], text: cells.join(' ／ ') });
  }
  if (out.length >= 2 && out.every((o, i) => o.num === i + 1)) return out;
  // 選択肢が列になっている表（見出し行が ① ② ③ …）は「表の①」などを選択肢にする
  for (const line of String(body || '').split('\n')) {
    const heads = line.trim().startsWith('|') ? line.split('|').map((c) => c.trim()).filter(Boolean) : [];
    const nums = heads.map((c) => CIRCLED[c]);
    if (nums.length >= 2 && nums.every((n, i) => n === i + 1)) return heads.map((c, i) => ({ num: i + 1, text: `表の${c}` }));
  }
  return [];
}

/** 総監の択一（src/config/exam-questions.json）を共通スキーマへ。判定（judgments）を選択肢ごとの解説にする */
function buildCemDataset({ exam, examLabel, srcPath }) {
  const src = JSON.parse(readFileSync(resolve(ROOT, srcPath), 'utf8'));
  const years = [];
  const questions = [];
  const skipped = [];
  for (const y of src.years || []) {
    let count = 0;
    for (const raw of y.questions || []) {
      const markdown = String(raw.body || '').trim();
      const options = (raw.options || []).length
        ? raw.options.map((o) => ({ num: o.num, text: String(o.text || '').trim() }))
        : optionsFromTable(markdown);
      if (!markdown || raw.correct == null || options.length === 0) {
        skipped.push(raw.id);
        continue;
      }
      const judgments = new Map((raw.judgments || []).map((j) => [j.num, j]));
      questions.push({
        id: raw.id,
        year: y.year,
        yearLabel: toYearLabel(y.year),
        part: raw.label || '',
        body: stripMarkdown(markdown),
        bodyHtml: renderQuizMarkdown(markdown),
        options: options.map((o) => ({ ...o, html: renderQuizMarkdown(o.text) })),
        correct: raw.correct,
        explanations: options.map((o) => {
          const j = judgments.get(o.num);
          return {
            num: o.num,
            text: j ? stripMarkdown(j.text) : '',
            ...(j ? { html: renderQuizMarkdown(j.text) } : {}),
            correct: o.num === raw.correct,
          };
        }),
        examPoint: raw.examPoint || null,
      });
      count += 1;
    }
    years.push({ year: y.year, yearLabel: toYearLabel(y.year), parts: [], count });
  }
  // 選択肢を取り出せない問題が出たら、黙って減らさずに止める（検査ゼロを PASS と呼ばない）
  if (skipped.length) throw new Error(`${exam}: 選択肢か正答を取り出せない問題 ${skipped.length} 問（${skipped.slice(0, 5).join(', ')}）`);
  return { exam, examLabel, generatedAt: src.generatedAt || new Date().toISOString(), years, questions };
}

/** 1 資格分の共通スキーマのデータセットを作る（ファイルは書かない） */
export function buildDataset(source) {
  if (source.kind === 'pe-first-stage-mdx') return buildPeFirstStageDataset(source);
  if (source.kind === 'cem-json') return buildCemDataset(source);
  return buildJsonDataset(source);
}

function splitQuestionSections(body) {
  const matches = [...body.matchAll(/^##\s+([^\n]+)$/gm)].filter((m) => /^[ⅠⅡⅢⅣ]/u.test(m[1].trim()));
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
  // 選択肢が本文中の下線部・番号（①〜⑤）にだけある問題（上下水道部門に多い・DN-0508）。図の選択肢を優先し、図が無いときだけ使う。
  // 本文はそのまま残し、解答操作だけを番号ボタンとして補う（下線部の内容を切り出して推測しない）。
  const circled = ['①', '②', '③', '④', '⑤'];
  if (circled.every((c) => questionPart.includes(c))) {
    return {
      body: questionPart.trim(),
      options: circled.map((c, i) => ({ num: i + 1, markdown: `${c}（本文中の番号）` })),
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
  // 再試験は同じ年度の通常試験と別の実施回。年度・科目を分けてID衝突を防ぐ。
  const articlePattern = /^([hr]\d{2}(?:-retry)?)-(basic|aptitude|construction|water-supply)$/;
  const articleDirs = readdirSync(baseDir)
    .filter((name) => articlePattern.test(name))
    .sort((a, b) => {
      const [, aYear, aSubject] = a.match(articlePattern);
      const [, bYear, bSubject] = b.match(articlePattern);
      return peYearRank(bYear) - peYearRank(aYear)
        || PE1_SUBJECTS[aSubject].order - PE1_SUBJECTS[bSubject].order;
    });
  const questions = [];
  const modifiedDates = [];

  for (const articleDir of articleDirs) {
    const [, year, subject] = articleDir.match(articlePattern);
    const file = resolve(baseDir, articleDir, 'article.mdx');
    // autocrlf の作業ツリー（Windows）は CRLF。以降の解析は \n 前提なので読み込み時に揃える
    const parsed = matter(readFileSync(file, 'utf8').replace(/\r\n/g, '\n'));
    if (parsed.data.dateModified) modifiedDates.push(toJstDate(parsed.data.dateModified));
    const sections = splitQuestionSections(parsed.content);
    const expected = pe1ExpectedPerYear(year, subject);
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

  const years = [...new Set(questions.map((q) => q.year))]
    .sort((a, b) => peYearRank(b) - peYearRank(a))
    .map((year) => ({
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
  if (questions.length !== 1830 || unscored.length !== 4) {
    throw new Error(`pe-first-stage: ${questions.length}問 / 採点対象外${unscored.length}問（期待 1830 / 4）`);
  }
  if (new Set(questions.map((q) => q.id)).size !== questions.length) {
    throw new Error('pe-first-stage: 問題IDが重複しています');
  }
  const malformed = questions.filter((q) =>
    q.options.length !== 5
    || q.explanations.length !== 5
    || q.explanations.some((item) => !item.text)
    || (q.correct != null && (q.correct < 1 || q.correct > 5))
  );
  if (malformed.length) {
    throw new Error(`pe-first-stage: 5肢・5解説・正答範囲の不整合 ${malformed.map((q) => q.id).join(', ')}`);
  }
  const expectedUnscored = new Set(['h23-aptitude-ⅱ-4', 'h30-aptitude-ⅱ-14', 'r01-retry-aptitude-ⅱ-14', 'r07-construction-ⅲ-13']);
  if (unscored.some((q) => !expectedUnscored.has(q.id)) || [...expectedUnscored].some((id) => !unscored.some((q) => q.id === id))) {
    throw new Error(`pe-first-stage: 採点対象外IDが想定外 ${unscored.map((q) => q.id).join(', ')}`);
  }
  const expectedSubjects = { basic: 470, aptitude: 240, construction: 560, 'water-supply': 560 };
  if (subjects.some(({ subject, count }) => count !== expectedSubjects[subject])) {
    throw new Error(`pe-first-stage: 科目件数が想定外 ${subjects.map(({ subject, count }) => `${subject}=${count}`).join(', ')}`);
  }
  // 1 回分＝基礎・適性・専門 2 部門（H23・H24 は基礎が 25 問）
  if (years.length !== 16 || years.some(({ year, count }) => count !== (['h23', 'h24'].includes(year) ? 110 : 115))) {
    throw new Error(`pe-first-stage: 年度件数が想定外 ${years.map(({ year, count }) => `${year}=${count}`).join(', ')}`);
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

function main() {
  let totalQ = 0;
  for (const source of SOURCES.filter((s) => s.web !== false)) {
    const dataset = buildDataset(source);
    const outPath = resolve(OUT_DIR, `${source.exam}.json`);
    mkdirSync(dirname(outPath), { recursive: true });
    // 決定的な出力（改行は LF）。生成物なので pre-commit の対象外だが LF で統一。
    writeFileSync(outPath, JSON.stringify(dataset) + '\n', 'utf8');
    totalQ += dataset.questions.length;
    const bytes = Buffer.byteLength(JSON.stringify(dataset));
    console.log(
      `[build-quiz-data] ${source.exam}: ${dataset.questions.length}問 / ${dataset.years.length}年 -> ${relative(ROOT, outPath)} (${(bytes / 1024).toFixed(0)}KB)`,
    );
  }
  console.log(`[build-quiz-data] 合計 ${totalQ} 問を生成`);
}

// iOS の書き出しが import して使うので、直接実行されたときだけ public/quiz を書く
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
