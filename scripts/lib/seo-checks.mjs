/**
 * seo-checks — build 済み HTML の SEO 検査関数ライブラリ。
 *
 * out/ 直接検査（scripts/check-seo-build.mjs）と check-seo-meta（out/ 主経路・HTTP 副経路）が
 * 同一の検査ロジックを共有するための純粋関数群。regex ではなく構造化 HTML パーサ
 * （node-html-parser）で解析し、title / description / self canonical / self og:url / robots /
 * JSON-LD / SSR（main・H1・本文）/ 内部リンクを検査する。
 *
 * 各 check* は { level, code, message } の findings 配列を返す（空配列＝問題なし）。
 * level: 'error'（CI 失敗）| 'warn'（警告のみ）| 'info'。
 */

import { readFileSync } from 'node:fs';
import { parse } from 'node-html-parser';

export const SITE_ORIGIN = 'https://doboku-note.com';

/** description がこの長さを超えても警告どまり（CI は落とさない）。 */
export const DESCRIPTION_SOFT_MAX = 160;
/** SSR 本文の最低文字数（これ未満は SSR 破壊/空ページの疑い）。 */
export const MIN_BODY_TEXT = 200;

/** headline 整合検査の対象とする JSON-LD Article 系 @type。 */
export const ARTICLE_LD_TYPES = new Set([
  'Article',
  'TechArticle',
  'BlogPosting',
  'NewsArticle',
  'Report',
]);

/**
 * HTML 文字列を解析して SEO 関連要素を抽出する。
 * @param {string} html
 * @returns {object} 抽出結果
 */
export function extractSeo(html) {
  const root = parse(html, {
    lowerCaseTagName: true,
    comment: false,
    blockTextElements: { script: true, style: true, pre: true },
  });

  const head = root.querySelector('head');
  const titleEl = root.querySelector('title');
  const title = titleEl ? titleEl.text.trim() : null;

  const getMetaName = (name) => {
    const el = root.querySelector(`meta[name="${name}"]`);
    return el ? el.getAttribute('content') ?? null : null;
  };
  const getMetaProp = (prop) => {
    const el = root.querySelector(`meta[property="${prop}"]`);
    return el ? el.getAttribute('content') ?? null : null;
  };

  const canonicalEl = root.querySelector('link[rel="canonical"]');
  const canonical = canonicalEl ? canonicalEl.getAttribute('href') ?? null : null;

  const description = getMetaName('description');
  const robots = getMetaName('robots');
  const ogUrl = getMetaProp('og:url');
  const ogTitle = getMetaProp('og:title');
  const ogImage = getMetaProp('og:image');
  const ogDescription = getMetaProp('og:description');

  // JSON-LD ブロック（複数可）
  const jsonLd = [];
  for (const el of root.querySelectorAll('script[type="application/ld+json"]')) {
    jsonLd.push(el.text);
  }

  // meta refresh（クライアント側リダイレクトの検出）
  const refreshEl = root.querySelector('meta[http-equiv="refresh"]');
  const metaRefresh = refreshEl ? refreshEl.getAttribute('content') ?? null : null;

  const main = root.querySelector('main');
  const h1 = root.querySelector('h1');
  // 本文テキスト量は main（無ければ body）から算出
  const bodyScope = main || root.querySelector('body') || root;
  const bodyText = bodyScope.text.replace(/\s+/g, ' ').trim();

  // 内部リンク（相対 or 自ドメイン絶対の href）
  const internalLinks = [];
  for (const a of root.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href');
    if (!href) continue;
    const norm = normalizeInternalHref(href);
    if (norm) internalLinks.push(norm);
  }

  return {
    hasHead: Boolean(head),
    title,
    description,
    canonical,
    robots,
    ogUrl,
    ogTitle,
    ogImage,
    ogDescription,
    jsonLd,
    metaRefresh,
    hasMain: Boolean(main),
    hasH1: Boolean(h1),
    h1Text: h1 ? h1.text.trim() : null,
    bodyTextLength: bodyText.length,
    internalLinks,
  };
}

/** ファイルパスから extractSeo を実行。 */
export function parseHtmlFile(filePath) {
  return extractSeo(readFileSync(filePath, 'utf8'));
}

/**
 * 内部リンクを path（先頭スラッシュ付き・アンカー/クエリ除去）へ正規化。
 * 外部リンク・mailto・tel・アンカーのみ（#...）は null。
 */
export function normalizeInternalHref(href) {
  const raw = href.trim();
  if (!raw || raw.startsWith('#')) return null;
  if (/^(mailto:|tel:|javascript:)/i.test(raw)) return null;
  let h = raw;
  const abs = h.match(/^https?:\/\/(www\.)?doboku-note\.com(\/[^\s]*|$)/i);
  if (/^https?:\/\//i.test(h)) {
    if (!abs) return null; // 外部リンク
    h = abs[2] || '/';
  }
  if (!h.startsWith('/')) return null;
  h = h.split('#')[0].split('?')[0];
  if (h === '') h = '/';
  return h;
}

/** self URL（絶対）を生成。path は先頭スラッシュ付き。 */
export function selfUrl(path) {
  if (path === '/') return SITE_ORIGIN;
  return `${SITE_ORIGIN}${path}`;
}

/**
 * canonical / og:url の href を比較用に正規化（末尾スラッシュ・www を吸収）。
 */
export function normalizeUrlForCompare(url) {
  if (!url) return null;
  let u = url.trim().replace(/^https?:\/\/(www\.)?/i, 'https://');
  // 末尾スラッシュを除去（ルート単独スラッシュは残す）
  if (u.length > 'https://doboku-note.com/'.length && u.endsWith('/')) {
    u = u.slice(0, -1);
  }
  return u;
}

// ---- 個別チェック関数（findings 配列を返す） ----

export function checkTitle(seo) {
  const out = [];
  if (!seo.title) {
    out.push({ level: 'error', code: 'title_missing', message: '<title> が無い' });
  }
  return out;
}

export function checkDescription(seo) {
  const out = [];
  if (!seo.description) {
    out.push({ level: 'error', code: 'description_missing', message: 'meta description が無い' });
    return out;
  }
  // 160 字超過は警告のみ（CI を落とさない — 要件）
  if (seo.description.length > DESCRIPTION_SOFT_MAX) {
    out.push({
      level: 'warn',
      code: 'description_long',
      message: `description が ${seo.description.length} 字（推奨 ${DESCRIPTION_SOFT_MAX} 字以下）`,
    });
  }
  return out;
}

/** サイト名 "doboku-note" が title に 2 回以上出現（テンプレート二重付与）。 */
export function checkSiteNameDup(seo) {
  const out = [];
  if (!seo.title) return out;
  const count = (seo.title.match(/doboku-note/gi) || []).length;
  if (count >= 2) {
    out.push({
      level: 'error',
      code: 'title_sitename_dup',
      message: `title にサイト名が ${count} 回出現（テンプレート二重付与）: "${seo.title}"`,
    });
  }
  return out;
}

/** canonical が self URL と一致するか（ドメイン prefix だけでなく完全一致）。 */
export function checkSelfCanonical(seo, expectedPath) {
  const out = [];
  if (!seo.canonical) {
    out.push({ level: 'error', code: 'canonical_missing', message: 'canonical が無い' });
    return out;
  }
  const got = normalizeUrlForCompare(seo.canonical);
  const want = normalizeUrlForCompare(selfUrl(expectedPath));
  if (got !== want) {
    out.push({
      level: 'error',
      code: 'canonical_mismatch',
      message: `canonical が self と不一致: got ${seo.canonical} / want ${selfUrl(expectedPath)}`,
    });
  }
  return out;
}

/** og:url が self URL と一致するか。 */
export function checkOgUrl(seo, expectedPath) {
  const out = [];
  if (!seo.ogUrl) {
    out.push({ level: 'error', code: 'og_url_missing', message: 'og:url が無い' });
    return out;
  }
  const got = normalizeUrlForCompare(seo.ogUrl);
  const want = normalizeUrlForCompare(selfUrl(expectedPath));
  if (got !== want) {
    out.push({
      level: 'error',
      code: 'og_url_mismatch',
      message: `og:url が self と不一致: got ${seo.ogUrl} / want ${selfUrl(expectedPath)}`,
    });
  }
  return out;
}

/** robots meta が noindex を含むか判定（sitemap 掲載ページで noindex は矛盾）。 */
export function isNoindex(seo) {
  return Boolean(seo.robots && /noindex/i.test(seo.robots));
}

export function checkRobots(seo, { expectIndexable } = { expectIndexable: true }) {
  const out = [];
  if (expectIndexable && isNoindex(seo)) {
    out.push({
      level: 'error',
      code: 'unexpected_noindex',
      message: `indexable ページに robots noindex: "${seo.robots}"`,
    });
  }
  return out;
}

/** JSON-LD の parse と、可視 title/H1 との基本整合。 */
export function checkJsonLd(seo) {
  const out = [];
  if (!seo.jsonLd || seo.jsonLd.length === 0) {
    out.push({ level: 'warn', code: 'jsonld_missing', message: 'JSON-LD が無い' });
    return out;
  }
  for (let i = 0; i < seo.jsonLd.length; i++) {
    let parsed;
    try {
      parsed = JSON.parse(seo.jsonLd[i]);
    } catch (e) {
      out.push({
        level: 'error',
        code: 'jsonld_parse_error',
        message: `JSON-LD[${i}] parse 失敗: ${e.message}`,
      });
      continue;
    }
    const nodes = Array.isArray(parsed) ? parsed : [parsed];
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue;
      const types = [].concat(node['@type'] || []);
      // Article 系のみ headline の可視 H1/title 整合を確認（WebSite/Organization の
      // name はサイト名であり記事見出しではないため対象外）。
      const isArticle = types.some((t) => ARTICLE_LD_TYPES.has(t));
      if (!isArticle) continue;
      const headline = node.headline || node.name;
      if (headline && typeof headline === 'string' && (seo.title || seo.h1Text)) {
        const ref = (seo.h1Text || seo.title || '').replace(/\s+/g, '');
        const head = headline.replace(/\s+/g, '');
        // 完全一致は求めず、どちらかが他方を部分包含 or 長い共通接頭辞を持つ程度の緩い整合。
        if (
          ref.length > 4 &&
          head.length > 4 &&
          !ref.includes(head) &&
          !head.includes(ref) &&
          !shareLongPrefix(ref, head)
        ) {
          out.push({
            level: 'warn',
            code: 'jsonld_headline_mismatch',
            message: `JSON-LD headline が可視 H1/title と乖離: "${headline}" vs "${seo.h1Text || seo.title}"`,
          });
        }
      }
    }
  }
  return out;
}

function shareLongPrefix(a, b) {
  const n = Math.min(a.length, b.length, 12);
  let i = 0;
  while (i < n && a[i] === b[i]) i++;
  return i >= 8;
}

/**
 * SSR 検査: main タグ・H1・本文最低量。
 * main/H1 欠落は SSR 破壊（error・ゲート）。本文が薄いだけ（main/H1 は在る）は
 * hidden カテゴリ等の正当に疎なページがあり得るため warn（surface のみ）に留める。
 */
export function checkSsr(seo) {
  const out = [];
  if (!seo.hasMain) {
    out.push({ level: 'error', code: 'ssr_no_main', message: '<main> が無い（SSR 破壊の疑い）' });
  }
  if (!seo.hasH1) {
    out.push({ level: 'error', code: 'ssr_no_h1', message: 'H1 が無い' });
  }
  // main/H1 が在るのに本文だけ薄いケースは warn（空ページの手掛かりとして surface）。
  // main が無ければ上で既に error 済みなので二重報告しない。
  if (seo.hasMain && seo.bodyTextLength < MIN_BODY_TEXT) {
    out.push({
      level: 'warn',
      code: 'ssr_thin_body',
      message: `本文テキストが ${seo.bodyTextLength} 字（最低目安 ${MIN_BODY_TEXT} 字）`,
    });
  }
  return out;
}

/** meta refresh によるクライアントリダイレクトの検出。 */
export function checkNoRedirect(seo) {
  const out = [];
  if (seo.metaRefresh && /url=/i.test(seo.metaRefresh)) {
    out.push({
      level: 'error',
      code: 'meta_refresh_redirect',
      message: `meta refresh リダイレクト: "${seo.metaRefresh}"`,
    });
  }
  return out;
}

/**
 * indexable ページの標準検査一式（build scanner / check-seo-meta 共通）。
 * @param {object} seo extractSeo の結果
 * @param {string} expectedPath 期待する self path（先頭スラッシュ付き）
 * @param {object} opts { expectIndexable }
 */
export function runIndexablePageChecks(seo, expectedPath, opts = {}) {
  const expectIndexable = opts.expectIndexable !== false;
  return [
    ...checkTitle(seo),
    ...checkSiteNameDup(seo),
    ...checkDescription(seo),
    ...checkSelfCanonical(seo, expectedPath),
    ...checkOgUrl(seo, expectedPath),
    ...checkRobots(seo, { expectIndexable }),
    ...checkJsonLd(seo),
    ...checkSsr(seo),
    ...checkNoRedirect(seo),
  ];
}
