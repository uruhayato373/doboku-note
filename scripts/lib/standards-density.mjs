/**
 * standards-density — /standards の build 済み HTML の密度検査（純粋関数）。
 *
 * out/ の名前（trailingSlash なし・output: export）:
 *   standards.html                                  → top
 *   standards/<agency>.html                         → agency（data・compare は対象外）
 *   standards/<agency>/<document>.html              → document
 *   standards/<agency>/<document>/chapters/<c>.html → chapter
 *   standards/<agency>/<document>/chapters/<c>/sections/<s>.html → section
 * part-NN のページと上のどれにも当たらないパスは null（検査しない）。
 * 閾値は config/standards-page-density.json。マーカー契約は同ファイルの description を参照。
 */
import { parse } from 'node-html-parser';

const NON_AGENCY = new Set(['data', 'compare']);
const BODY_MARKERS = '[data-standards-chapter], [data-standards-section-index]';
const EXCLUDED = 'nav, [data-standards-mobile-nav], [data-standards-sidebar], h1';

/** out/ からの相対パス（standards.html・standards/a/b.html）→ テンプレート名。 */
export function templateOf(relPath) {
  const parts = relPath.replaceAll('\\', '/').replace(/^\.?\//, '').replace(/\.html$/, '').replace(/\/index$/, '').split('/');
  if (parts[0] !== 'standards') return null;
  if (parts.some((p) => /^part-\d+$/.test(p))) return null;
  const n = parts.length;
  if (n === 1) return 'top';
  if (NON_AGENCY.has(parts[1])) return null;
  if (n === 2) return 'agency';
  if (n === 3) return 'document';
  if (n === 5 && parts[3] === 'chapters') return 'chapter';
  if (n === 7 && parts[3] === 'chapters' && parts[5] === 'sections') return 'section';
  return null;
}

const squash = (s) => s.replace(/\s+/g, '');

const isExcluded = (el) => el.matches?.(EXCLUDED);

/** main 内で最初の一覧・本文・出典より前にある p の文字数。 */
export function proseBeforeContent(root, template) {
  const main = root.querySelector('main');
  if (!main) return null;
  const stopSel = template === 'chapter' || template === 'section'
    ? `${BODY_MARKERS}, [data-standards-attribution]`
    : '[data-standards-list], [data-standards-attribution]';
  let chars = 0;
  let stopped = false;
  const walk = (node) => {
    for (const child of node.childNodes) {
      if (stopped) return;
      if (child.nodeType !== 1) continue;
      if (child.matches(stopSel)) { stopped = true; return; }
      if (isExcluded(child)) continue;
      if (child.rawTagName?.toLowerCase() === 'p') chars += squash(child.text).length;
      else walk(child);
    }
  };
  walk(main);
  return chars;
}

/** details の中を除いた見える文字数。 */
function visibleTextOutsideDetails(node) {
  let n = 0;
  for (const child of node.childNodes) {
    if (child.nodeType === 3) n += squash(child.text).length;
    else if (child.nodeType === 1 && child.rawTagName?.toLowerCase() !== 'details') n += visibleTextOutsideDetails(child);
  }
  return n;
}

const listLinks = (root, name) => {
  const list = root.querySelector(`[data-standards-list="${name}"]`);
  return list ? list.querySelectorAll('a[href]').length : null;
};

/**
 * 1 ページを検査して findings を返す（空＝合格）。
 * @returns {{ rule: string, measured: number|string, limit: string, message: string }[]}
 */
export function checkPage(html, template, rules) {
  const root = parse(html);
  const out = [];
  const add = (rule, measured, limit, message) => out.push({ rule, measured, limit, message: `${rule}: ${message}（実測 ${measured} / 基準 ${limit}）` });

  // 1. 一覧・本文より前の説明文
  const max = rules.proseBeforeContent.maxChars[template];
  const prose = proseBeforeContent(root, template);
  if (prose === null) add('proseBeforeContent', 'main なし', `${max}字以下`, 'main が無い');
  else if (prose > max) add('proseBeforeContent', prose, `${max}字以下`, '一覧・本文より前の説明文が多い');

  // 2. 一覧のリンク数
  const min = rules.minListLinks[template] ?? {};
  for (const [name, need] of Object.entries(min)) {
    const n = listLinks(root, name);
    if (n === null) {
      if (template === 'document') continue; // 章を持たない文書には一覧が無い
      add('minListLinks', 'マーカーなし', `${name} 一覧 ${need}件以上`, `data-standards-list="${name}" が無い`);
    } else if (n < need) add('minListLinks', n, `${name} 一覧 ${need}件以上`, `${name} 一覧のリンクが少ない`);
  }

  // 3. 出典表示
  const att = root.querySelectorAll('[data-standards-attribution]');
  if (att.length !== rules.attribution.count) add('attribution', att.length, `${rules.attribution.count}個`, '出典表示ブロックの数が違う');
  else {
    const visible = visibleTextOutsideDetails(att[0]);
    if (visible > rules.attribution.maxVisibleChars) add('attribution', visible, `details の外 ${rules.attribution.maxVisibleChars}字以下`, '出典表示の見える文字が長い');
  }

  // 4. アフィリエイト
  const cards = root.querySelectorAll('[data-cta="affiliate"]').length;
  const hosts = rules.affiliate.hostPatterns;
  const links = root.querySelectorAll('a[href]').filter((a) => hosts.some((h) => (a.getAttribute('href') ?? '').includes(h))).length;
  if (cards + links > rules.affiliate.max) add('affiliate', `カード${cards}・リンク${links}`, `${rules.affiliate.max}件`, 'アフィリエイトが載っている');

  return out;
}
