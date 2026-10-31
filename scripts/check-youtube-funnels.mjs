#!/usr/bin/env node
/** Audit every uploaded/published longform against the product and site route catalogs. */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadRegistry, resolveCopy } from './lib/content-registry.mjs';
import { readDataset } from './lib/dataset-io.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { classifySitePath, loadSiteRoutes, siteUrlForSlug } from './lib/site-links.mjs';

const POLICY_START = Date.parse('2026-10-31T12:00:00+09:00');
const ACTIVE = new Set(['uploaded_private', 'scheduled', 'published']);
const products = readDataset(REPO_ROOT, 'config.products').products;
const noteProducts = new Map(products.filter((p) => p.channel === 'note').map((p) => [p.id, p]));
const paidNoteProducts = new Map(products.filter((p) => p.channel === 'note' && p.catalog?.published && !p.catalog.retiredAt && p.catalog.price).map((p) => [p.catalog.noteUrl, p]));
const routes = loadSiteRoutes(join(REPO_ROOT, 'public/_redirects'));
const registry = loadRegistry(REPO_ROOT);
const problems = [];
let checked = 0;
let upcoming = 0;

function issue(pub, message) { problems.push(`${pub.id}: ${message}`); }
function ownLinks(description) {
  return description.split('\n').filter((line) => /^https:\/\/(?:note\.com\/dobokunote\/|doboku-note\.com\/)/.test(line.trim())).map((line) => line.trim());
}
function utmMatches(link, packId) {
  const url = new URL(link);
  return url.searchParams.get('utm_source') === 'youtube' &&
    url.searchParams.get('utm_medium') === 'video' &&
    url.searchParams.get('utm_campaign') === packId &&
    url.searchParams.get('utm_content') === 'longform';
}
function isRelevantPaidLink(link, exam) {
  return paidNoteProducts.get(link.split('?')[0])?.qualification === exam;
}

for (const pub of registry.publications.filter((p) => p.channel === 'youtube' && p.format === 'longform' && ACTIVE.has(p.status))) {
  checked += 1;
  const [exam, packId] = pub.id.split('/');
  const manifestPath = join(REPO_ROOT, 'content/sns/video-packs', exam, packId, 'video-pack.json');
  if (!existsSync(manifestPath)) { issue(pub, '動画パックがない'); continue; }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const description = resolveCopy(REPO_ROOT, pub.copy)?.description;
  if (!description) { issue(pub, '概要欄がない'); continue; }
  const links = ownLinks(description);
  const noteLinks = links.filter((u) => u.startsWith('https://note.com/'));
  const siteLinks = links.filter((u) => u.startsWith('https://doboku-note.com/'));
  const newPolicy = pub.status !== 'uploaded_private' && Date.parse(pub.publishAt) >= POLICY_START;
  if (newPolicy) upcoming += 1;
  for (const url of links) {
    try { if (!utmMatches(url, packId)) issue(pub, `UTMが動画IDと違う: ${url}`); }
    catch { issue(pub, `URLが不正: ${url}`); }
  }

  if (manifest.primaryCta?.kind === 'note-magazine') {
    const product = noteProducts.get(manifest.primaryCta.targetId);
    if (!product?.catalog?.published || product.catalog.retiredAt) { issue(pub, '主CTAの商品が公開中でない'); continue; }
    const target = product.catalog.noteUrl;
    if (product.catalog.price) {
      if (noteLinks.length !== 1 || noteLinks[0].split('?')[0] !== target) issue(pub, `note商品リンクが台帳と違う: ${target}`);
    } else if (newPolicy || noteLinks.length !== 2 || noteLinks[1].split('?')[0] !== target || !isRelevantPaidLink(noteLinks[0], exam)) {
      issue(pub, '無料noteもくじに加えて公開中の有料商品への直接導線が必要');
    }
    if (newPolicy && (links[0] !== noteLinks[0] || description.includes('▼ 教材・完成答案で深掘りする'))) issue(pub, '新ルールの主CTA配置・商品名が違う');
  } else if (manifest.primaryCta?.kind === 'links-hub') {
    if (!siteLinks.some((u) => new URL(u).pathname === '/links')) issue(pub, '教材一覧リンクが違う');
    if (newPolicy) issue(pub, '新規公開は商品か関連ページへの直接CTAが必要');
    else if (noteLinks.length !== 1 || !isRelevantPaidLink(noteLinks[0], exam) || links[0] !== noteLinks[0]) issue(pub, '教材一覧に加えて同資格の有料商品への直接導線が必要');
  } else {
    issue(pub, `未対応の主CTA: ${manifest.primaryCta?.kind ?? 'none'}`);
  }

  for (const site of siteLinks) {
    const path = new URL(site).pathname;
    if (path !== '/links' && classifySitePath(path, routes).kind !== 'ok') issue(pub, `サイト記事の公開URLが未登録: ${path}`);
  }
  const source = manifest.sourceRefs?.find((r) => r.type === 'site' && !r.allowUnpublished && r.path?.startsWith(`content/site/${exam}/`));
  if (source) {
    const match = /^content\/site\/([a-z0-9-]+)\/([a-z0-9-]+)\/article\.mdx$/.exec(source.path);
    if (!match) { issue(pub, '関連サイト記事の参照形式が不正'); continue; }
    const target = siteUrlForSlug(`${match[1]}-${match[2]}`, routes);
    if (target.includes('/docs/') || !siteLinks.some((u) => u.split('?')[0] === target)) issue(pub, `関連サイト記事への補助導線がない: ${target}`);
    if (newPolicy && links.indexOf(siteLinks[0]) <= links.indexOf(noteLinks[0])) issue(pub, '無料記事が商品より前にある');
  }
}

if (checked < 20 || !routes.loaded) { console.error(`検査不成立: 動画 ${checked} 本 / サイト経路 ${routes.loaded}`); process.exit(2); }
console.log(`check-youtube-funnels: 公開・予約・private ${checked} 本、2026-10-31以降の新ルール ${upcoming} 本`);
for (const line of problems) console.error(`  [FAIL] ${line}`);
console.log(`結果: ${problems.length ? 'FAIL' : 'PASS'}（FAIL ${problems.length}）`);
if (problems.length) process.exit(1);
