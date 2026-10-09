#!/usr/bin/env node
/**
 * check-affiliate-placements.mjs — 転職アフィリエイトの配置ルール（config/affiliate-placements.json）を、案件・広告リンク・面の語彙・
 * カテゴリ・実験・MDX の手書きカードと突き合わせる（決定論。pre-commit と quality-audit の ci）。
 *
 *   (a) 開いているルール（until が無いか未来）の案件は catalog で placement=active かつ Red Line でない。閉じたルールも catalog にある
 *   (b) 開いているルールの案件は、期限内の広告リンク（config.affiliate-mats）を持つ
 *   (c) 面は config.cta-placements にあり、ページの種類が合う。撤去済みの面のルールは閉じている（撤去日が分かればその日まで）
 *   (d) カテゴリは src/config/categories.json に、実験は data/business/experiments.json にある
 *   (e) 同じ面・重なる期間・交わる対象の 2 ルールが無い（1 ページ 1 面 1 案件。GA4 の配置別の数字をルールへ結ぶ前提）
 *   (f) MDX 本文に <CareerAffiliate program=…> を書いた記事のカテゴリは、開いている article-inline のルールが覆う（覆わなければ描画されない）
 *
 * --upcoming（ops）: 7 日以内に始まる・終わるルールがあれば exit 1。SSG は境界を過ぎても再ビルドまで切り替わらないので、本番の再ビルドを予定する合図。
 *
 * usage: node scripts/check-affiliate-placements.mjs [--upcoming]
 * exit: 0 整合 / 1 違反（--upcoming は境界が近い）/ 2 入力を読めず検査不成立
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { datasetPath } from './lib/datasets.mjs';
import { findOverlaps } from '../src/lib/affiliate-placement-core.mjs';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const read = (rel) => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));
const DAY = 86400000;

let cfg;
let catalog;
let mats;
let vocab;
let categories;
let experiments;
try {
  cfg = read(datasetPath('config.affiliate-placements'));
  catalog = read(datasetPath('affiliate.catalog'));
  mats = read(datasetPath('config.affiliate-mats')).mats;
  vocab = read(datasetPath('config.cta-placements')).affiliate;
  const cat = JSON.parse(readFileSync(join(ROOT, 'src', 'config', 'categories.json'), 'utf8'));
  categories = new Set((Array.isArray(cat) ? cat : cat.categories ?? Object.values(cat)).map((c) => c.id ?? c.slug).filter(Boolean));
  const exp = read(datasetPath('business.experiments'));
  experiments = new Set((Array.isArray(exp) ? exp : exp.experiments ?? []).map((e) => e.id));
} catch (e) {
  console.error(`[check-affiliate-placements] 入力を読めない（検査不成立）: ${e.message}`);
  process.exit(2);
}

const now = Date.now();
const rules = cfg.rules ?? [];
const isOpen = (r) => r.period.until == null || Date.parse(r.period.until) > now;
const errors = [];

if (process.argv.includes('--upcoming')) {
  const soon = [];
  for (const r of rules) {
    for (const [what, iso] of [['開始', r.period.from], ['終了', r.period.until]]) {
      if (!iso) continue;
      const t = Date.parse(iso);
      if (t > now && t - now <= 7 * DAY) soon.push(`${r.id}（${r.program} × ${r.slot}）の${what} ${iso}`);
    }
  }
  console.log(`[check-affiliate-placements --upcoming] ルール ${rules.length} 件の境界を検査 / 7 日以内 ${soon.length} 件`);
  for (const s of soon) console.log(`  - ${s} → 境界の後に本番を再ビルドする（gh workflow run cloudflare-deploy.yml --ref main）`);
  process.exit(soon.length ? 1 : 0);
}

for (const r of rules) {
  const p = catalog.programs?.[r.program];
  // (a)
  if (!p) errors.push(`${r.id}: 案件 ${r.program} が catalog に無い`);
  else if (isOpen(r) && (p.placement !== 'active' || p.redLine)) errors.push(`${r.id}: 案件 ${r.program} は catalog で placement=${p.placement}${p.redLine ? '・Red Line' : ''}（配置できない）`);
  // (b)
  if (isOpen(r)) {
    const live = mats.filter((m) => m.program === r.program && m.surfaces.length > 0 && (m.expiresAt == null || Date.parse(`${m.expiresAt}T23:59:59+09:00`) >= now));
    if (live.length === 0) errors.push(`${r.id}: 案件 ${r.program} に期限内の広告リンク（config.affiliate-mats）が無い`);
  }
  // (c)
  const slot = vocab[r.slot];
  if (!slot) errors.push(`${r.id}: 面 ${r.slot} が config.cta-placements に無い`);
  else {
    if (slot.pageKind !== r.target.pageKind) errors.push(`${r.id}: 面 ${r.slot} は ${slot.pageKind} の面（ルールは ${r.target.pageKind}）`);
    if (slot.status === 'retired') {
      if (isOpen(r)) errors.push(`${r.id}: 面 ${r.slot} は撤去済みなのにルールが開いている`);
      if (slot.retiredAt && r.period.until && r.period.until.slice(0, 10) > slot.retiredAt) errors.push(`${r.id}: 面 ${r.slot} の撤去日 ${slot.retiredAt} より後まで続いている`);
    }
  }
  // (d)
  for (const c of [...(r.target.categories ?? []), ...(r.target.excludeCategories ?? [])]) {
    if (!categories.has(c)) errors.push(`${r.id}: カテゴリ ${c} が src/config/categories.json に無い`);
  }
  if (r.experiment && !experiments.has(r.experiment)) errors.push(`${r.id}: 実験 ${r.experiment} が experiments.json に無い`);
}
// (e)
for (const [a, b] of findOverlaps(rules)) errors.push(`${a} と ${b}: 同じ面・重なる期間・交わる対象（1 ページ 1 面 1 案件にならない）`);

// (f)
const inlineCovered = new Set(rules.filter((r) => r.slot === 'article-inline' && isOpen(r)).flatMap((r) => r.target.categories ?? [...categories]));
const SITE = join(ROOT, 'content', 'site');
let mdxScanned = 0;
const inlineCategories = new Map();
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith('.mdx')) {
      mdxScanned++;
      if (/<CareerAffiliate\b[^>]*\bprogram=/.test(readFileSync(p, 'utf8'))) {
        const category = relative(SITE, p).split(sep)[0];
        inlineCategories.set(category, (inlineCategories.get(category) ?? 0) + 1);
      }
    }
  }
}
walk(SITE);
for (const [category, n] of inlineCategories) {
  if (!inlineCovered.has(category)) errors.push(`content/site/${category}: <CareerAffiliate program=…> が ${n} ファイルにあるのに、開いている article-inline のルールが無い（描画されない）`);
}

console.log(
  `[check-affiliate-placements] ルール ${rules.length} 件（開いている ${rules.filter(isOpen).length}）/ MDX ${mdxScanned} 件を走査・手書きカードのカテゴリ ${inlineCategories.size} 種 / 違反 ${errors.length} 件`,
);
if (errors.length) {
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error(`ルールの正本は ${datasetPath('config.affiliate-placements')}、方針は .claude/knowledge/reference/affiliate-operations.md「6. 配置ポリシー」`);
  process.exit(1);
}
if (rules.length === 0) {
  console.error('[check-affiliate-placements] ルールが 0 件（検査不成立）');
  process.exit(2);
}
console.log('[check-affiliate-placements] ✓ 案件・広告リンク・面・カテゴリ・実験・手書きカードと整合し、重なりも無い');
