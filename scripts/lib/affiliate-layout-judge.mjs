/**
 * affiliate-layout-judge.mjs — 広告配置のスクリーンショット検査（scripts/affiliate-layout-shots.mjs）の純関数。依存は
 * 配置ルールの判定（src/lib/affiliate-placement-core.mjs）と計測ピクセルの数え方（affiliate-link-keys.mjs）だけ。
 *
 * 2 つの仕事:
 *   1. selectTargets … 配置ルール・サイトマップ・記事一覧から「ページの種類ごとの代表 URL」を機械で選ぶ（手書きの URL 表を持たない）
 *   2. judgeShot     … 1 回の撮影で測った値から (a)〜(e) の判定を出す
 */
import { isActive, matchesPage, resolvePair } from '../../src/lib/affiliate-placement-core.mjs';
import { impressionKeyCounts } from './affiliate-link-keys.mjs';

/** 画面幅。案（variant）は src/lib/affiliate-experiment.mjs の AFFILIATE_VARIANTS（--variants で上書き） */
export const VIEWPORTS = [
  { id: 'sp', label: 'スマホ', width: 375, height: 812 },
  { id: 'tablet', label: 'タブレット', width: 768, height: 1024 },
  { id: 'pc', label: 'PC', width: 1280, height: 900 },
];

/** 横方向・引き伸ばしの許容（サブピクセル丸め） */
const TOL = 1.5;

const median = (sorted) => sorted[Math.floor((sorted.length - 1) / 2)];

/** 本文が短い記事は中間カードが出ない（DocPage の下限 2,500 字 ≒ 7,500 バイト）ので代表に選ばない */
export const MIN_DOC_BYTES = 7500;

/**
 * サイトマップのパスから、記事の (category, localSlug) と MDX 側の slug 候補を作る。
 * 規則は src/lib/content-routes.ts の getPublicDocRoute と同じ向きの逆引き（exam は /exam/<資格>/<型>/<slug>・practice と laws は型なし）。
 */
export function docSlugCandidates(path, practiceCategory) {
  const seg = path.split('/').filter(Boolean);
  if (seg[0] === 'exam' && seg.length === 4) {
    const [, cat, group, local] = seg;
    return { category: cat, slugs: [`${cat}-${local}`, `${cat}-${group}-${local}`, `${cat}-${group.replace(/s$/, '')}-${local}`] };
  }
  if (seg[0] === 'practice' && seg.length === 2) return { category: practiceCategory, slugs: [`${practiceCategory}-${seg[1]}`] };
  if (seg[0] === 'laws' && seg.length === 2) return { category: 'laws', slugs: [`laws-${seg[1]}`] };
  return null;
}

/**
 * 代表の記事を選ぶ: 本文が下限以上のうち中央の大きさ（最大だと全文が長すぎ、最小だと広告が出ない）。無ければ最大。
 * @param {{ path: string, bytes: number }[]} items
 */
export function pickMedianDoc(items) {
  if (!items.length) return null;
  const sorted = [...items].sort((a, b) => a.bytes - b.bytes || a.path.localeCompare(b.path));
  const eligible = sorted.filter((x) => x.bytes >= MIN_DOC_BYTES);
  return eligible.length ? median(eligible) : sorted[sorted.length - 1];
}

const slugify = (s) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();

/**
 * ページの種類ごとの代表 URL。
 * @param {object} p
 * @param {object[]} p.rules config/affiliate-placements.json の rules
 * @param {string[]} p.sitemapPaths サイトマップのパス（origin なし）
 * @param {{ slug: string, area: string }[]} p.categories src/config/categories.json（area: exam | practice | laws | standards）
 * @param {Map<string, { bytes: number, career: boolean }>} p.docsBySlug 公開記事（MDX）の slug → 大きさ・キャリア記事か
 * @returns {{ id: string, kind: string, label: string, path: string, pageKind: string, category: string|null, isCareerDoc: boolean }[]}
 */
export function selectTargets({ rules, sitemapPaths, categories, docsBySlug }) {
  const kinds = new Set(rules.map((r) => r.target.pageKind));
  const paths = [...new Set(sitemapPaths)].sort();
  const has = (p) => paths.includes(p);
  const out = [];
  const add = (t) => out.push({ category: null, isCareerDoc: false, ...t });
  const practiceCategory = categories.find((c) => c.area === 'practice')?.slug ?? 'civil-practice';

  if (kinds.has('home') && has('/')) add({ id: 'home', kind: 'home', label: 'トップ', path: '/', pageKind: 'home' });

  if (kinds.has('category')) {
    for (const c of categories) {
      const path = c.area === 'exam' ? `/exam/${c.slug}` : c.area === 'practice' ? '/practice' : null;
      if (path && has(path)) add({ id: `category-${c.slug}`, kind: 'category', label: `カテゴリ ${c.slug}`, path, pageKind: 'category', category: c.slug });
    }
  }

  if (kinds.has('doc')) {
    const byCategory = new Map();
    for (const path of paths) {
      const cand = docSlugCandidates(path, practiceCategory);
      if (!cand) continue;
      const slug = cand.slugs.find((s) => docsBySlug.has(s));
      if (!slug) continue;
      const d = docsBySlug.get(slug);
      const list = byCategory.get(cand.category) ?? [];
      list.push({ path, bytes: d.bytes, career: d.career });
      byCategory.set(cand.category, list);
    }
    for (const c of categories) {
      const list = byCategory.get(c.slug);
      if (!list) continue;
      const plain = pickMedianDoc(list.filter((x) => !x.career));
      if (plain) add({ id: `doc-${c.slug}`, kind: 'doc', label: `記事 ${c.slug}`, path: plain.path, pageKind: 'doc', category: c.slug });
      // キャリア記事で配置が分かれるカテゴリ（ルールに careerDoc: only がある）だけ、キャリア記事も撮る
      const splits = rules.some((r) => r.target.pageKind === 'doc' && r.target.careerDoc === 'only' && (!r.target.categories || r.target.categories.includes(c.slug)));
      const career = splits ? pickMedianDoc(list.filter((x) => x.career)) : null;
      if (career) add({ id: `doc-career-${c.slug}`, kind: 'doc-career', label: `キャリア記事 ${c.slug}`, path: career.path, pageKind: 'doc', category: c.slug, isCareerDoc: true });
    }
  }

  const first = (re) => paths.find((p) => re.test(p));
  if (kinds.has('tool')) {
    const p = first(/^\/tools\/[^/]+$/);
    if (p) add({ id: 'tool', kind: 'tool', label: 'ツール', path: p, pageKind: 'tool' });
  }
  if (kinds.has('standards')) {
    const p = first(/^\/standards\/[^/]+\/[^/]+\/chapters\/[^/]+$/);
    if (p) add({ id: 'standards', kind: 'standards', label: '公的基準の章', path: p, pageKind: 'standards' });
  }
  if (kinds.has('standards-list') && has('/standards')) add({ id: 'standards-list', kind: 'standards-list', label: '公的基準の一覧', path: '/standards', pageKind: 'standards-list' });
  if (kinds.has('topic')) {
    const p = first(/^\/topics\/[^/]+$/);
    if (p) add({ id: 'topic', kind: 'topic', label: 'トピック', path: p, pageKind: 'topic' });
  }
  if (kinds.has('laws-list') && has('/laws')) add({ id: 'laws-list', kind: 'laws-list', label: '法令の一覧', path: '/laws', pageKind: 'laws-list' });

  // id の重複を防ぐ（同じ資格の記事とカテゴリなど種類が違えば接頭辞で分かれる）
  const seen = new Set();
  return out.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true))).map((t) => ({ ...t, id: slugify(t.id) }));
}

/** このページ・面・案件に当たるルール。期間内なら active、期間外にだけ当たるなら expired、無ければ none */
export function ruleFor(rules, page, slot, program, nowMs, pairs = []) {
  const hits = rules.filter((r) => r.slot === slot && r.program === program && matchesPage(r, page));
  const active = hits.find((r) => isActive(r, nowMs));
  if (active) return { ruleId: active.id, status: 'active' };
  // 2 枚並べの 2 枚目（config/affiliate-placements.json の pairs）。その面の 1 枚目のルールが今当たっていること
  for (const r of rules) {
    if (r.slot !== slot || !isActive(r, nowMs) || !matchesPage(r, page)) continue;
    const pair = resolvePair(pairs, r, page, nowMs);
    if (pair && pair.secondary === program) return { ruleId: pair.id, status: 'active' };
  }
  if (hits.length) return { ruleId: hits[hits.length - 1].id, status: 'expired' };
  return { ruleId: null, status: 'none' };
}

/** そのページに今当たる面（slot → rule id）。管理画面で「期待した面」を並べる */
export function expectedSlots(rules, page, nowMs) {
  const out = {};
  for (const r of rules) if (isActive(r, nowMs) && matchesPage(r, page)) out[r.slot] = { ruleId: r.id, program: r.program };
  return out;
}

/**
 * 1 回の撮影の判定。
 * @param {object} m ブラウザで測った値
 * @param {{ width: number, height: number }} m.viewport
 * @param {number} m.scrollWidth 文書の横幅
 * @param {string} m.html 描画後の HTML
 * @param {{ placement: string, program: string, variant: string|null, label: string|null, rect: {top:number,left:number,right:number,bottom:number}, imgs: {src:string,w:number,h:number,naturalWidth:number}[] }[]} m.ads 見えている広告（文書座標）
 * @param {{ rules: object[], page: object, nowMs: number, forcedVariant?: string|null }} ctx
 * @returns {{ ok: boolean, checks: object, ads: object[], pixelCounts: Record<string, number> }}
 */
export function judgeShot(m, ctx) {
  const vw = m.viewport.width;
  const pixelCounts = impressionKeyCounts(m.html);

  const ads = m.ads.map((a) => {
    const rule = ruleFor(ctx.rules, ctx.page, a.placement, a.program, ctx.nowMs, ctx.pairs ?? []);
    const problems = [];
    for (const img of a.imgs) {
      if (img.naturalWidth > 0 && img.w > img.naturalWidth + TOL) problems.push('stretch');
    }
    if (a.rect.right > vw + TOL || a.rect.left < -TOL) problems.push('overflow');
    if (rule.status === 'none') problems.push('rule');
    if (ctx.forcedVariant && a.variant && a.variant !== ctx.forcedVariant) problems.push('variant');
    return { ...a, ruleId: rule.ruleId, ruleStatus: rule.status, problems: [...new Set(problems)] };
  });

  const detail = (kind, f) => ads.filter((a) => a.problems.includes(kind)).map(f);
  const dupPixels = Object.entries(pixelCounts).filter(([, n]) => n > 1);
  const pageOverflow = m.scrollWidth > vw + TOL;

  const checks = {
    pixels: { ok: dupPixels.length === 0, detail: dupPixels.map(([k, n]) => `${k} が ${n} 回`) },
    stretch: { ok: !ads.some((a) => a.problems.includes('stretch')), detail: detail('stretch', (a) => `${a.placement}: ${a.imgs.filter((i) => i.naturalWidth > 0 && i.w > i.naturalWidth + TOL).map((i) => `表示 ${Math.round(i.w)}px > 素材 ${i.naturalWidth}px`).join(', ')}`) },
    overflow: {
      ok: !pageOverflow && !ads.some((a) => a.problems.includes('overflow')),
      detail: [...(pageOverflow ? [`ページが横スクロール（scrollWidth ${m.scrollWidth} > ${vw}）`] : []), ...detail('overflow', (a) => `${a.placement} が画面外（${Math.round(a.rect.left)}〜${Math.round(a.rect.right)}px）`)],
    },
    rule: { ok: !ads.some((a) => a.problems.includes('rule')), detail: detail('rule', (a) => `${a.placement}(${a.program}) に当たるルールが無い`) },
    variant: { ok: !ads.some((a) => a.problems.includes('variant')), detail: detail('variant', (a) => `${a.placement}: 案 ${ctx.forcedVariant} を固定したのに ${a.variant}`) },
  };
  // 期間外のルールにだけ当たる広告は NG にせず注意（本番の再ビルド待ちの可能性）
  const warnings = ads.filter((a) => a.ruleStatus === 'expired').map((a) => `${a.placement}(${a.program}) は期間外のルール ${a.ruleId} にだけ当たる（再ビルド待ちの可能性）`);
  // 今のルールが面を当てているのに広告が 1 つも出ていない（記事の長さの下限・診断の後にだけ出る面などで起こる。代表ページの選び方を見直す手掛かり）
  if (ads.length === 0 && ctx.expectedCount > 0) warnings.push(`配置ルールは ${ctx.expectedCount} 面に当たるが、広告が 1 つも描かれていない`);
  return { ok: Object.values(checks).every((c) => c.ok), checks, ads, pixelCounts, warnings };
}
