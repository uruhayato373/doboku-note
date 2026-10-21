/**
 * egov-links.mjs — 記事の e-Gov 法令検索へのリンクを読み、記事が引く法令と条の一覧を作る（サイトとスクリプトで共有）。
 *
 * 読み手: 記事の末尾の「この記事の根拠法令」（src/components/ui/ArticleLaws・DN-0731）と、
 * 法令 ID と条を e-Gov 法令 API の写しで照合する scripts/lib/egov-laws.mjs。読み取りの正規表現はここだけに置く。
 * 依存ゼロ（サイトのビルドからも読むので、台帳の zod などを import しない）。
 */

/** 記事の e-Gov 法令検索へのリンク（法令 ID と、条のアンカー #Mp-At_<番号>）。 */
const LINK = /https?:\/\/laws\.e-gov\.go\.jp\/law\/([0-9A-Z]+)(?:\/[^\s)"'#]*)?(?:#Mp-At_([0-9_]+))?/g;

export const EGOV_LAW_BASE = 'https://laws.e-gov.go.jp/law/';

/** 本文の e-Gov へのリンクを行番号つきで拾う。 */
export function egovLinksOf(text) {
  const out = [];
  text.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(LINK)) out.push({ lawId: m[1], article: m[2] ?? null, line: i + 1 });
  });
  return out;
}

/** 条のアンカーの番号を表示の形にする（"3" → 第3条、"28_2" → 第28条の2）。 */
export function articleLabel(article) {
  const [head, ...rest] = String(article).split('_');
  return `第${head}条${rest.map((n) => `の${n}`).join('')}`;
}

/**
 * 記事が引く法令と条の一覧（本文に初めて出た順）。法令名は e-Gov 法令 API の写し（config/egov-laws.json の laws）から引き、
 * 写しに無い法令 ID は出さない（ID の誤りは scripts/egov-laws.mjs の照合が CI で止める）。条は番号の小さい順。
 * @param {string} text 記事の本文
 * @param {Record<string, { title: string }>} laws config/egov-laws.json の laws
 * @returns {{ lawId: string, title: string, url: string, articles: { article: string, label: string, url: string }[] }[]}
 */
export function articleLaws(text, laws) {
  const byLaw = new Map();
  for (const { lawId, article } of egovLinksOf(text)) {
    const law = laws[lawId];
    if (!law) continue;
    if (!byLaw.has(lawId)) byLaw.set(lawId, { lawId, title: law.title, url: `${EGOV_LAW_BASE}${lawId}`, articles: new Map() });
    if (article) byLaw.get(lawId).articles.set(article, { article, label: articleLabel(article), url: `${EGOV_LAW_BASE}${lawId}#Mp-At_${article}` });
  }
  const order = (a) => a.split('_').map(Number);
  const cmp = (x, y) => {
    const a = order(x.article), b = order(y.article);
    for (let i = 0; i < Math.max(a.length, b.length); i++) if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) - (b[i] ?? 0);
    return 0;
  };
  return [...byLaw.values()].map((l) => ({ ...l, articles: [...l.articles.values()].sort(cmp) }));
}
