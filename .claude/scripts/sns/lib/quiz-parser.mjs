/**
 * クイズパックの source.md を構造化データに変換するパーサ。
 *
 * 期待する入力フォーマット（001/002 共通）:
 *
 *   ## {管理分野}（Q{N1}〜Q{N2}）
 *
 *   ### Q{N}. {topic-title}
 *
 *   **問題文**: {question-text}
 *
 *   [optional table or extra block]
 *
 *   **選択肢**:
 *   (1) {choice1}
 *   (2) {choice2}
 *   ...
 *
 *   **正答**: ({N})
 *
 *   **解説**: {explanation}
 *
 *   **関連キーワード**: [{label}]({url})
 *
 * 出力:
 *   { categories: [{
 *       slug,                  // 'economic' | 'human-resource' | ...
 *       name,                  // '経済性管理' | '人的資源管理' | ...
 *       shortName,             // '経済性' | '人的資源' | ...
 *       answerColor,           // chip color (chip 短縮表記用)
 *       questions: [{
 *         num,                 // 1..20
 *         topic,               // 'OEE'
 *         question,            // '...'
 *         choices,             // ['...', '...']
 *         answerIdx,           // 0-based
 *         answerShort,         // 答え値（短縮 30 字以内）
 *         explanation,         // 解説本文
 *         relatedLabel,
 *         relatedUrl,
 *       }]
 *   }]}
 */

import { readFileSync } from 'node:fs';

const MGMT_DEFINITIONS = [
  { slug: 'economic', name: '経済性管理', shortName: '経済性' },
  { slug: 'human-resource', name: '人的資源管理', shortName: '人的資源' },
  { slug: 'information', name: '情報管理', shortName: '情報' },
  { slug: 'safety', name: '安全管理', shortName: '安全' },
  { slug: 'social-environment', name: '社会環境管理', shortName: '社会環境' },
];

export function parseQuizSource(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  const text = raw.replace(/\r\n/g, '\n');

  // 章ごとに切る（## 管理分野 で分割）
  const chapterRe = /^## (.+?)（Q(\d+)〜Q(\d+)）$/gm;
  const chapterMatches = [...text.matchAll(chapterRe)];

  const categories = [];
  for (let i = 0; i < chapterMatches.length; i++) {
    const m = chapterMatches[i];
    const startIdx = m.index;
    const endIdx = i + 1 < chapterMatches.length ? chapterMatches[i + 1].index : text.length;
    const chapterText = text.slice(startIdx, endIdx);
    const name = m[1].trim();
    const def = MGMT_DEFINITIONS.find(d => d.name === name);
    if (!def) {
      throw new Error(`Unknown management category: ${name}`);
    }
    const questions = parseQuestions(chapterText);
    categories.push({ ...def, questions });
  }
  return { categories };
}

function parseQuestions(chapterText) {
  // ### Q{N}. {topic} 〜 次の ### or 章末まで
  const qRe = /^### Q(\d+)\.\s*(.+?)$/gm;
  const matches = [...chapterText.matchAll(qRe)];
  const result = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const startIdx = m.index;
    const endIdx = i + 1 < matches.length ? matches[i + 1].index : chapterText.length;
    const block = chapterText.slice(startIdx, endIdx);

    const num = parseInt(m[1], 10);
    const topic = m[2].trim();

    const question = matchOne(block, /^\*\*問題文\*\*[:：]\s*(.+?)$/m);
    const choices = parseChoices(block);
    const answerIdx = parseAnswerIdx(block);
    const explanation = matchOne(block, /^\*\*解説\*\*[:：]\s*([\s\S]+?)(?=\n\*\*関連キーワード|\n---|\n##|\n$)/m);
    const related = block.match(/\*\*関連キーワード\*\*[:：]\s*\[(.+?)\]\((.+?)\)/);
    const answerShort = choices[answerIdx]
      ? truncate(choices[answerIdx], 30)
      : '';

    result.push({
      num,
      topic,
      question: collapseWhitespace(question),
      choices,
      answerIdx,
      answerShort,
      explanation: collapseWhitespace(explanation),
      relatedLabel: related?.[1] ?? '',
      relatedUrl: related?.[2] ?? '',
    });
  }
  return result;
}

function parseChoices(block) {
  // **選択肢**: の直後から、空行 or **正答** までを束ねて行ごとに (N) パース
  const re = /\*\*選択肢\*\*[:：]\s*([\s\S]+?)(?=\n\*\*正答|\n\*\*解説)/m;
  const m = block.match(re);
  if (!m) return [];
  const lines = m[1].split('\n').map(l => l.trim()).filter(Boolean);
  const choices = [];
  for (const ln of lines) {
    const cm = ln.match(/^\(?(\d+)\)?\s+(.+)$/);
    if (cm) choices.push(cm[2].trim());
  }
  return choices;
}

function parseAnswerIdx(block) {
  const m = block.match(/\*\*正答\*\*[:：]\s*\(?(\d+)\)?/);
  return m ? parseInt(m[1], 10) - 1 : 0;
}

function matchOne(text, re) {
  const m = text.match(re);
  return m ? m[1].trim() : '';
}

function collapseWhitespace(s) {
  return stripMarkdownEmphasis(String(s ?? ''))
    .replace(/[ \t]*\n[ \t]*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// SNS 画像描画用に Markdown 強調記号（** / *）を取り除く。
// `**X**`・`*X*` を内側テキストに置換、`**` 単独残骸も除去。
function stripMarkdownEmphasis(s) {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '$1')
    .replace(/\*\*/g, '');
}

function truncate(s, max) {
  const arr = [...String(s ?? '')];
  return arr.length <= max ? arr.join('') : arr.slice(0, max - 1).join('') + '…';
}
