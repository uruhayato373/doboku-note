/**
 * rccm-essay.mjs — RCCM 問題III 模範論文の判定ロジック（純関数・check-rccm-essay.mjs と rccm-essay-qa が使う）。
 *
 * 協会の出題条件（2026年度出題テーマ PDF）: 設問①②を 1,200〜1,600 字、指定用語から 4 語以上を「」で囲んで使用。
 * 本モジュールは条件を機械化するだけで、論文の中身（視点・専門度）は評価しない（それは rccm-essay-qa）。
 */

export const ESSAY_HEADING = '模範論文';
export const CHAR_MIN = 1200;
export const CHAR_MAX = 1600;
export const CHAR_IDEAL = [1400, 1550];
export const KEYWORD_MIN = 4;
export const KEYWORD_IDEAL = 5;
/** 問題再現に相当する H2（過去問は事務局非公開・転載禁止。公開テーマの設問①②見出しは H3 なので該当しない） */
export const FORBIDDEN_H2 = /^##\s+(試験問題|過去問|出題問題|問題文)/;

/** `## {heading}` から次の H2 直前までの本文を返す（無ければ null）。 */
export function sectionOf(body, heading) {
  const lines = body.split(/\r?\n/);
  const start = lines.findIndex((l) => new RegExp(`^##\\s+${heading}`).test(l));
  if (start < 0) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) { end = i; break; }
  }
  return lines.slice(start + 1, end).join('\n');
}

/** 見出し行・空白・改行を除いた文字数（協会の字数は原稿用紙換算ではなく文字数として扱う）。 */
export function countEssayChars(section) {
  return section
    .split(/\r?\n/)
    .filter((l) => !/^#{1,6}\s/.test(l))
    .join('')
    .replace(/\s/g, '')
    .length;
}

/** 「」で囲まれた語のうち rccmKeywords に一致するものを重複なしで返す。 */
export function usedKeywords(section, keywords) {
  const quoted = new Set();
  for (const m of section.matchAll(/「([^「」]+)」/g)) quoted.add(m[1].trim());
  return keywords.filter((k) => quoted.has(String(k).trim()));
}

/**
 * 1 記事を評価する。errors は必ず違反、warnings は --strict のときだけ違反として扱う。
 * @param {string} body frontmatter を除いた本文
 * @param {object} data frontmatter
 * @param {{strict?: boolean}} opts
 */
export function evaluateRccmEssay(body, data, opts = {}) {
  const errors = [];
  const warnings = [];
  const keywords = Array.isArray(data.rccmKeywords) ? data.rccmKeywords : [];
  if (keywords.length === 0) errors.push('frontmatter rccmKeywords が空（_facts-2026.md の指定用語を全語列挙する）');

  const section = sectionOf(body, ESSAY_HEADING);
  let essayChars = 0;
  let used = [];
  if (section === null) {
    errors.push(`H1: \`## ${ESSAY_HEADING}\` 節が無い`);
  } else {
    essayChars = countEssayChars(section);
    if (essayChars < CHAR_MIN || essayChars > CHAR_MAX) errors.push(`H1: 模範論文 ${essayChars} 字（${CHAR_MIN}〜${CHAR_MAX} 字が条件）`);
    else if (essayChars < CHAR_IDEAL[0] || essayChars > CHAR_IDEAL[1]) warnings.push(`W2: 模範論文 ${essayChars} 字（推奨帯 ${CHAR_IDEAL[0]}〜${CHAR_IDEAL[1]}）`);
    used = usedKeywords(section, keywords);
    if (used.length < KEYWORD_MIN) errors.push(`H2: 指定用語「」使用 ${used.length} 語（${KEYWORD_MIN} 語以上が条件）`);
    else if (used.length < KEYWORD_IDEAL) warnings.push(`W1: 指定用語「」使用 ${used.length} 語（${KEYWORD_IDEAL} 語以上を推奨）`);
    if (!/^###\s*①/m.test(section) || !/^###\s*②/m.test(section)) errors.push('H3: 模範論文に `### ①` / `### ②` の見出しが無い');
  }

  for (const line of body.split(/\r?\n/)) {
    if (FORBIDDEN_H2.test(line)) { errors.push(`H4: 問題再現節が存在する: ${line.trim()}`); break; }
  }

  const boundary = typeof data.paidBoundary === 'string' ? data.paidBoundary.trim() : '';
  if (!boundary) errors.push('H5: frontmatter paidBoundary が無い');
  else {
    const alts = boundary.split('|').map((s) => s.trim()).filter(Boolean);
    const found = body.split(/\r?\n/).some((l) => { const m = l.match(/^##\s+(.+)$/); return m && alts.some((a) => m[1].trim().startsWith(a)); });
    if (!found) errors.push(`H5: paidBoundary「${boundary}」に一致する H2 が本文に無い`);
  }

  if (opts.strict) { errors.push(...warnings); warnings.length = 0; }
  return { essayChars, keywordsUsed: used, errors, warnings };
}
