/**
 * jsonld-required-props — JSON-LD の @type 別 必須/推奨プロパティ検査（純関数）。
 *
 * check-seo-build は JSON-LD の parse エラーしか見ておらず、必須キー欠落（リッチリザルト落ち）を
 * 取りこぼしていた（DN-0241）。ここでは Google 検索セントラルの構造化データ ガイドが定める
 * 必須欄を error、推奨欄を warn として判定する。**表に無い @type は判定しない**（対象外として
 * 呼び出し側が件数だけ出す）。
 *
 * 根拠（2026-09-24 に各ページを確認）:
 *   - BreadcrumbList: https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
 *       必須 itemListElement / ListItem.position・name・item。ただし「最後の ListItem の item は不要
 *       （無ければ Google はそのページの URL を使う）」。表示には ListItem が 2 件以上必要。
 *       → DN-0241 カードの例示「itemListElement[].item 必須」は最後の要素について Google と食い違う
 *         ため Google を正とした（StructuredData.tsx は最後の要素＝現在ページに item を出さない）。
 *   - Article 系: https://developers.google.com/search/docs/appearance/structured-data/article
 *       Google は「必須プロパティは無い」と明記し、author（name/url）・dateModified・datePublished・
 *       headline・image を推奨とする。→ カードは headline/datePublished/author を必須に挙げたが、
 *       Google を正として**全て warn**（欠落してもリッチリザルト資格は失わない）。
 *   - FAQPage: Google は FAQ リッチリザルトを廃止し、専用ドキュメントを削除済み
 *       （https://developers.google.com/search/updates）。削除前の必須欄（FAQPage.mainEntity /
 *       Question.name・acceptedAnswer / Answer.text）は schema.org 上も Q&A として成立する最小構造
 *       なので error のまま残す（空の Question を出す markup は他の消費者にとっても壊れている）。
 *   - Dataset: https://developers.google.com/search/docs/appearance/structured-data/dataset
 *       必須 name・description（50〜5000 字）。distribution（DataDownload）を出すなら contentUrl 必須。
 *       推奨のうち本サイトの Dataset が意味を持つ creator・license・url だけを warn にする。
 *   - WebSite: https://developers.google.com/search/docs/appearance/site-names
 *       サイト名機能の必須 name・url。
 *   - HowTo は表に入れない: Google は How-to リッチリザルトを終了しドキュメントを削除済み
 *       （2023-09・search/updates）、かつ本サイトは HowTo を出していない。
 *   - Quiz / DefinedTerm / Organization / WebPage / CreativeWork 等は Google に必須欄の定義が
 *       無い（または対象機能が無い）ため対象外。
 */

/** Article 系として同じ推奨欄を適用する @type（seo-checks.mjs の ARTICLE_LD_TYPES と揃える）。 */
const ARTICLE_TYPES = ['Article', 'TechArticle', 'BlogPosting', 'NewsArticle', 'Report'];

/** Dataset.description の Google 制約（文字数・コードポイント単位）。 */
const DATASET_DESCRIPTION_MIN = 50;
const DATASET_DESCRIPTION_MAX = 5000;

function isBlank(v) {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.trim().length === 0;
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

function asArray(v) {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function typesOf(node) {
  return asArray(node && node['@type']).filter((t) => typeof t === 'string');
}

/** author が「名前を持つ実体」または @id 参照か（@id 参照は解決せず可とする）。 */
function authorHasName(author) {
  const list = asArray(author);
  if (list.length === 0) return false;
  return list.every((a) => {
    if (typeof a === 'string') return a.trim().length > 0;
    if (!a || typeof a !== 'object') return false;
    return !isBlank(a.name) || !isBlank(a['@id']);
  });
}

/**
 * @type → 検査関数。各関数は (node, report) で、report.error(path) / report.warn(path) を呼ぶ。
 * path は欠落したプロパティのパス（例: `itemListElement[2].item`）。
 */
const RULES = {
  BreadcrumbList(node, r) {
    const items = asArray(node.itemListElement);
    if (items.length === 0) {
      r.error('itemListElement');
      return;
    }
    if (items.length < 2) r.error('itemListElement（ListItem が 2 件未満＝パンくず表示の対象外）');
    items.forEach((li, i) => {
      const p = `itemListElement[${i}]`;
      if (!li || typeof li !== 'object') {
        r.error(p);
        return;
      }
      if (li.position === undefined || li.position === null || li.position === '') r.error(`${p}.position`);
      // name は ListItem 直下か、item が Thing の場合は item.name でもよい。
      const itemName = li.item && typeof li.item === 'object' ? li.item.name : undefined;
      if (isBlank(li.name) && isBlank(itemName)) r.error(`${p}.name`);
      // 最後の要素だけ item 省略可（Google: 無ければ当該ページの URL を使う）。
      const isLast = i === items.length - 1;
      if (!isLast && isBlank(li.item)) r.error(`${p}.item`);
    });
  },

  FAQPage(node, r) {
    const qs = asArray(node.mainEntity);
    if (qs.length === 0) {
      r.error('mainEntity');
      return;
    }
    qs.forEach((q, i) => {
      const p = `mainEntity[${i}]`;
      if (!q || typeof q !== 'object') {
        r.error(p);
        return;
      }
      if (isBlank(q.name)) r.error(`${p}.name`);
      const answers = asArray(q.acceptedAnswer);
      if (answers.length === 0) {
        r.error(`${p}.acceptedAnswer`);
        return;
      }
      answers.forEach((a, j) => {
        const ap = answers.length > 1 ? `${p}.acceptedAnswer[${j}]` : `${p}.acceptedAnswer`;
        if (!a || typeof a !== 'object' || isBlank(a.text)) r.error(`${ap}.text`);
      });
    });
  },

  Dataset(node, r) {
    if (isBlank(node.name)) r.error('name');
    if (isBlank(node.description)) {
      r.error('description');
    } else if (typeof node.description === 'string') {
      const len = [...node.description].length;
      if (len < DATASET_DESCRIPTION_MIN || len > DATASET_DESCRIPTION_MAX) {
        r.error(`description（${len} 字・Google 制約 ${DATASET_DESCRIPTION_MIN}〜${DATASET_DESCRIPTION_MAX} 字）`);
      }
    }
    asArray(node.distribution).forEach((d, i) => {
      if (!d || typeof d !== 'object' || isBlank(d.contentUrl)) r.error(`distribution[${i}].contentUrl`);
    });
    for (const key of ['creator', 'license', 'url']) if (isBlank(node[key])) r.warn(key);
  },

  WebSite(node, r) {
    if (isBlank(node.name)) r.error('name');
    if (isBlank(node.url)) r.error('url');
  },
};

function articleRule(node, r) {
  // Google 上は必須欄なし → 全て推奨（warn）。
  if (isBlank(node.headline)) r.warn('headline');
  if (isBlank(node.datePublished)) r.warn('datePublished');
  if (isBlank(node.dateModified)) r.warn('dateModified');
  if (isBlank(node.author)) r.warn('author');
  else if (!authorHasName(node.author)) r.warn('author.name');
  if (isBlank(node.image)) r.warn('image');
}
for (const t of ARTICLE_TYPES) RULES[t] = articleRule;

/** 判定対象の @type 一覧（表の見出し）。 */
export const JSONLD_RULE_TYPES = Object.freeze(Object.keys(RULES));

/**
 * parse 済み JSON-LD（object / 配列 / @graph）を検査対象ノードへ平坦化する。
 * 入れ子の値（author・distribution・ListItem 等）は各ルールが親の文脈で見るので展開しない。
 */
export function collectJsonLdNodes(parsed) {
  const out = [];
  for (const top of asArray(parsed)) {
    if (!top || typeof top !== 'object') continue;
    if (Array.isArray(top['@graph'])) {
      for (const n of top['@graph']) if (n && typeof n === 'object') out.push(n);
      // @graph と同居する @type があればそれも 1 ノードとして見る。
      if (top['@type']) out.push(top);
    } else {
      out.push(top);
    }
  }
  return out;
}

/**
 * JSON-LD 1 ブロック（parse 済み）を検査する。
 * @param {unknown} parsed JSON.parse の結果
 * @returns {{
 *   nodes: number,              // 平坦化したノード数
 *   validated: number,          // 表にある @type を持ち検査したノード数
 *   validatedTypes: string[],   // 検査したノードの @type（ノードごとに表で一致したもの）
 *   outOfScopeTypes: string[],  // 表に無い @type（ノードごとに 1 つ・@type 無しは '(none)'）
 *   errors: {type: string, missing: string[]}[],
 *   warnings: {type: string, missing: string[]}[],
 * }}
 */
export function validateJsonLd(parsed) {
  const result = {
    nodes: 0,
    validated: 0,
    validatedTypes: [],
    outOfScopeTypes: [],
    errors: [],
    warnings: [],
  };
  for (const node of collectJsonLdNodes(parsed)) {
    result.nodes += 1;
    const types = typesOf(node);
    const matched = types.filter((t) => RULES[t]);
    if (matched.length === 0) {
      result.outOfScopeTypes.push(types.join('+') || '(none)');
      continue;
    }
    result.validated += 1;
    for (const type of matched) {
      result.validatedTypes.push(type);
      const errs = [];
      const warns = [];
      RULES[type](node, { error: (p) => errs.push(p), warn: (p) => warns.push(p) });
      if (errs.length) result.errors.push({ type, missing: errs });
      if (warns.length) result.warnings.push({ type, missing: warns });
    }
  }
  return result;
}
