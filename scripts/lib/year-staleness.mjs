// 年度表現の陳腐化検出（DN-0243）の純関数群。西暦/令和の判定・除外規則を切り出し、
// スキャン本体（scripts/check-year-staleness.mjs）とテストの両方から使う。
//
// 令和変換: 令和1年 = 2019年（2018 を足す）。
export function reiwaYearOf(gregorianYear) {
  return gregorianYear - 2018;
}

// exam-calendar.json の exams[*].year（当年度・西暦）の最大値を当年度として使う。
// 複数試験の年度が食い違っている場合は最大値を採用し、古い方は次の年度切替漏れとして
// 別途 exam-calendar 側の検査（check-exam-calendar）に任せる。
export function currentFiscalYearFrom(examCalendar) {
  const years = Object.values(examCalendar.exams || {})
    .map((e) => e.year)
    .filter((y) => Number.isInteger(y));
  if (years.length === 0) throw new Error('exam-calendar.json に exams[*].year が無い');
  return Math.max(...years);
}

// 「前年度以前」の年度表現にマッチする正規表現を組み立てる。
// 西暦は current-1 以下の「YYYY年度」、令和は reiwa-1 以下の「令和N年度」「令和N年」。
// 「年」単独（度なし）は西暦側では拾わない（"2025年" は日付・組織名等の誤検知が多いため）。
export function buildStalePattern(currentFiscalYear) {
  const reiwa = reiwaYearOf(currentFiscalYear);
  // 西暦: 1990〜(current-1) の「YYYY年度」
  const westernPart = `(?:19[0-9]{2}|20[0-9]{2})年度`;
  // 令和: 1〜(reiwa-1) の「令和N年度」「令和N年」
  const reiwaNums = [];
  for (let n = 1; n < reiwa; n++) reiwaNums.push(n);
  const reiwaPart = reiwaNums.length > 0 ? `令和(?:${reiwaNums.join('|')})年度?` : null;
  const alts = [westernPart, reiwaPart].filter(Boolean);
  const combined = new RegExp(`(${alts.join('|')})`, 'g');
  return { pattern: combined, currentFiscalYear, reiwa };
}

// マッチした文字列が「前年度以前」かどうかを厳密に判定する（buildStalePattern の正規表現は
// 西暦側が current 年含む範囲を広く取っているため、ここで年 < current を再確認する）。
export function isStaleMatch(text, currentFiscalYear) {
  const western = text.match(/^(19[0-9]{2}|20[0-9]{2})年度$/);
  if (western) return Number(western[1]) < currentFiscalYear;
  const reiwa = text.match(/^令和([0-9]+)年度?$/);
  if (reiwa) return Number(reiwa[1]) < reiwaYearOf(currentFiscalYear);
  return false;
}

// 記事ディレクトリ名がそれ自体で特定年度を表す場合（過去問・年度別模範論文など）は、
// その年度への言及が「陳腐化」ではなく「その記事の主題」なので除外する。
// 例: r05-essay-general-contractor, r06-kouki, h28-a, primary-r07-a
const YEAR_SLUG_RE = /(?:^|-)(r|h)\d{2}(z|k|zenki|kouki)?(?:-|$)/i;
export function isYearEncodedSlug(dirBasename) {
  return YEAR_SLUG_RE.test(dirBasename);
}

const EXCLUDED_GROUPS = new Set(['past-exam', 'primary', 'secondary']);
export function isExcludedGroup(group) {
  return EXCLUDED_GROUPS.has(group);
}

export function extractFrontmatterFields(text) {
  const fmEnd = text.indexOf('\n---', 4);
  const fm = fmEnd >= 0 ? text.slice(0, fmEnd) : '';
  const group = fm.match(/^group:\s*['"]?([a-z-]+)/m)?.[1] ?? null;
  const get = (key) => {
    const m = fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
    if (!m) return null;
    return m[1].trim().replace(/^['"]|['"]$/g, '');
  };
  return {
    group,
    title: get('title'),
    seoTitle: get('seoTitle'),
    description: get('description'),
  };
}
