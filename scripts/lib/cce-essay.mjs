/**
 * cce-essay.mjs — コンクリート主任技士 小論文（テーマ別 note 教材・出題履歴表）の判定ロジック（純関数）。
 *
 * 真実源は .claude/config/cce-essay-history.json（出題履歴・テーマ分類・模範答案の型と字数帯）。
 * 本モジュールは形式・字数・SSOT との一致だけを機械化し、答案の中身（技術精度・立場の妥当性）は評価しない（cce-essay-qa）。
 */

export const ANSWER_HEADING = '模範答案';
/** 問題文の再現に当たる H2（JCI は小論文の問題文を公開していない。テーマ名・設問項目名だけを使う） */
export const FORBIDDEN_H2 = /^##\s+(試験問題|過去問題?文|出題問題|問題文)/;
export const HISTORY_START = 'cce-essay-history:start';
export const HISTORY_END = 'cce-essay-history:end';

/** `## {heading}` から次の H2 直前までを返す（無ければ null）。 */
export function sectionOf(body, heading, level = 2) {
  const lines = body.split(/\r?\n/);
  const hashes = '#'.repeat(level);
  const start = lines.findIndex((l) => l.startsWith(`${hashes} `) && l.slice(level + 1).trim().startsWith(heading));
  if (start < 0) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s/);
    if (m && m[1].length <= level) { end = i; break; }
  }
  return lines.slice(start + 1, end).join('\n');
}

/** 見出し行・空白・強調記号を除いた文字数。 */
export function countChars(text) {
  return text
    .split(/\r?\n/)
    .filter((l) => !/^#{1,6}\s/.test(l))
    .join('')
    .replace(/\*\*|__/g, '')
    .replace(/\s/g, '')
    .length;
}

/** SSOT の年度のうち、そのテーマが選択肢に含まれる年（新しい順）。 */
export function yearsForTheme(history, themeId) {
  return history.years
    .filter((y) => y.options.some((o) => o.theme === themeId) || (y.optionThemes || []).includes(themeId))
    .map((y) => y.year)
    .sort((a, b) => b - a);
}

const inRange = (n, [lo, hi]) => n >= lo && n <= hi;

/**
 * テーマ別教材 1 記事を評価する。
 * @param {string} body frontmatter を除いた本文
 * @param {object} data frontmatter（cceEssayTheme / cceSourceYears / paidBoundary）
 * @param {object} history cce-essay-history.json
 */
export function evaluateCceEssay(body, data, history) {
  const errors = [];
  const model = history.answerModel;
  const themeId = data.cceEssayTheme;
  const counts = {};

  if (!history.themes[themeId]) errors.push(`H1: frontmatter cceEssayTheme「${themeId}」が SSOT themes に無い`);
  else {
    const expected = yearsForTheme(history, themeId);
    const got = Array.isArray(data.cceSourceYears) ? [...data.cceSourceYears].map(Number).sort((a, b) => b - a) : [];
    if (expected.join(',') !== got.join(',')) errors.push(`H2: cceSourceYears [${got}] が SSOT の出題年 [${expected}] と不一致`);
  }

  const answer = sectionOf(body, ANSWER_HEADING, 2);
  if (answer === null) errors.push(`H3: \`## ${ANSWER_HEADING}\` 節が無い`);
  else {
    for (const part of model.parts) {
      const sec = sectionOf(answer, part.heading, 3);
      if (sec === null) { errors.push(`H3: \`### ${part.heading}\` が無い`); continue; }
      if (part.scope === 'common') {
        const n = countChars(sec);
        counts[part.key] = n;
        if (!inRange(n, part.chars)) errors.push(`H4: ${part.heading} ${n} 字（${part.chars[0]}〜${part.chars[1]} 字）`);
      } else {
        counts[part.key] = {};
        for (const persona of model.personas) {
          const ps = sectionOf(sec, persona, 4);
          if (ps === null) { errors.push(`H5: ${part.heading} に \`#### ${persona}\` が無い`); continue; }
          const n = countChars(ps);
          counts[part.key][persona] = n;
          if (!inRange(n, part.chars)) errors.push(`H4: ${part.heading}／${persona} ${n} 字（${part.chars[0]}〜${part.chars[1]} 字）`);
        }
      }
    }
    const common = model.parts.filter((p) => p.scope === 'common').reduce((s, p) => s + (typeof counts[p.key] === 'number' ? counts[p.key] : 0), 0);
    const personaPart = model.parts.find((p) => p.scope === 'persona');
    for (const [persona, n] of Object.entries(counts[personaPart?.key] || {})) {
      const total = common + n;
      if (!inRange(total, model.totalChars)) errors.push(`H6: ${persona} を組み立てた答案 ${total} 字（${model.totalChars[0]}〜${model.totalChars[1]} 字）`);
    }
  }

  for (const line of body.split(/\r?\n/)) {
    if (FORBIDDEN_H2.test(line)) { errors.push(`H7: 問題文の再現節がある: ${line.trim()}`); break; }
  }
  if (/[¥￥]\s?\d/.test(body)) errors.push('H8: 本文に価格の直書きがある');

  const boundary = typeof data.paidBoundary === 'string' ? data.paidBoundary.trim() : '';
  if (!boundary) errors.push('H9: frontmatter paidBoundary が無い');
  else if (!body.split(/\r?\n/).some((l) => /^##\s/.test(l) && l.replace(/^##\s+/, '').trim().startsWith(boundary))) {
    errors.push(`H9: paidBoundary「${boundary}」に一致する H2 が本文に無い`);
  }
  return { counts, errors };
}

const CONFIDENCE_LABEL = { high: '書籍で確認', medium: '複数出典', low: '1出典のみ' };

/**
 * SSOT から出題履歴を新しい順に生成する。
 * format=table はサイト（MDX）用の2列表、format=list は note 用の箇条書き（note はパイプ表非対応）。
 */
export function renderHistory(history, { since = 2012, until = 9999, format = 'table' } = {}) {
  const years = history.years.filter((y) => y.year >= since && y.year <= until).sort((a, b) => b.year - a.year);
  const line = (y) => `${y.options.map((o) => o.label).join('／')}（${CONFIDENCE_LABEL[y.confidence]}）`;
  // note-lint は太字内の全角括弧を禁じるため、年度だけを太字にする
  if (format === 'list') return years.map((y) => `- **${y.era}**（${y.year}年度）: ${line(y)}`).join('\n');
  return ['| 年度 | 出題テーマ（確度） |', '|---|---|', ...years.map((y) => `| ${y.era}（${y.year}） | ${line(y)} |`)].join('\n');
}

const BLOCK_RE = () => new RegExp(`((?:<!--|\\{/\\*)\\s*${HISTORY_START}([^\\n]*?)\\s*(?:-->|\\*/\\}))\\r?\\n([\\s\\S]*?)\\r?\\n?((?:<!--|\\{/\\*)\\s*${HISTORY_END}\\s*(?:-->|\\*/\\}))`, 'g');

function parseBlock(m) {
  const num = (k) => { const x = m[2].match(new RegExp(`${k}=(\\d{4})`)); return x ? Number(x[1]) : undefined; };
  const format = m[2].match(/format=(table|list)/);
  const opts = { format: format ? format[1] : 'table' };
  if (num('since')) opts.since = num('since');
  if (num('until')) opts.until = num('until');
  return { opts, body: m[3].trim(), raw: m[0], startMarker: m[1], endMarker: m[4] };
}

/**
 * 記事内の出題履歴ブロックを全て取り出す。書式は `<!-- cce-essay-history:start since=2020 format=list -->`（note）
 * または `{/* cce-essay-history:start since=2012 until=2019 format=table *\/}`（MDX）。
 */
export function extractHistoryBlocks(text) {
  return [...text.matchAll(BLOCK_RE())].map(parseBlock);
}

/** 先頭の出題履歴ブロック（無ければ null）。 */
export function extractHistoryBlock(text) {
  return extractHistoryBlocks(text)[0] || null;
}

/** 全ての出題履歴ブロックを SSOT の生成結果に置き換えた本文を返す（一致していれば同じ文字列）。 */
export function syncHistoryBlock(text, history) {
  return text.replace(BLOCK_RE(), (...m) => {
    const b = parseBlock(m);
    return `${b.startMarker}\n${renderHistory(history, b.opts)}\n${b.endMarker}`;
  });
}
