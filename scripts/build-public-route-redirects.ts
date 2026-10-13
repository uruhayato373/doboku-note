#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getAllPublicDocRoutes, getPublicDocPath } from '../src/lib/content-routes';
import { getAllCategories, getCategoryHubPath } from '../src/lib/categories';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { planDocRedirects, isGeneratedDocRule } from './lib/docs-redirect-plan.mjs';
import { ROUTE_TABLE_PREFIX, isLegacyPath } from './lib/legacy-routes.mjs';

const path = join(REPO_ROOT, 'public/_redirects');
const startMarker = '# BEGIN GENERATED PUBLIC ROUTES';
const endMarker = '# END GENERATED PUBLIC ROUTES';
const source = readFileSync(path, 'utf8');

function isDynamicRedirect(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return false;
  const [redirectSource] = trimmed.split(/\s+/);
  return /[*:]/.test(redirectSource ?? '');
}

function stripManagedBlock(value: string): string {
  const start = value.indexOf(startMarker);
  if (start < 0) return value.trimEnd();
  const end = value.indexOf(endMarker, start);
  if (end < 0) throw new Error(`${startMarker} はありますが ${endMarker} がありません`);
  return `${value.slice(0, start)}${value.slice(end + endMarker.length)}`.trimEnd();
}

function canonicalizeExistingTargets(value: string): string {
  return value
    .split('\n')
    .map((line) => {
      const docMatch = line.match(/^(\s*\/\S+\s+)(\/docs\/([a-z0-9-]+))(\s+30[18]\s*)$/i);
      if (docMatch) {
        const target = getPublicDocPath(docMatch[3]!);
        return isLegacyPath(target) ? line : `${docMatch[1]}${target}${docMatch[4]}`;
      }
      const categoryMatch = line.match(/^(\s*\/\S+\s+)\/category\/([a-z0-9-]+)(\s+30[18]\s*)$/i);
      if (categoryMatch) {
        return `${categoryMatch[1]}${getCategoryHubPath(categoryMatch[2]!)}${categoryMatch[3]}`;
      }
      return line;
    })
    .join('\n');
}

// Cloudflare Pages は静的ルールを動的ルールより前に置く必要がある。
// 動的ルールの後ろに静的ルールを置くと、後続も動的上限（100件）の対象として
// 打ち切られるため、既存のワイルドカードを全て管理ブロック末尾へ移動する。
// 前回この生成が出した /docs の動的ルールは入力に数えない（毎回 plan から作り直す）。
const dynamicRedirects = [...new Set(source.split('\n').filter(isDynamicRedirect).map((line) => line.trim()).filter((line) => !isGeneratedDocRule(line)))];
const base = canonicalizeExistingTargets(stripManagedBlock(source))
  .split('\n')
  .filter((line) => !isDynamicRedirect(line))
  .join('\n')
  .trimEnd();
// 旧 /docs/<slug> の 301 は 1 本も減らさず、規則どおりの slug は動的ルール（splat）にまとめる（DN-0675）。
// 規則に合わない slug（統合・改名・group が slug に出ないもの）だけ静的ルールに残す。理由と制約は docs-redirect-plan.mjs。
const allRoutes = getAllPublicDocRoutes();
const plan = planDocRedirects(allRoutes.map((route) => ({ legacySlug: route.legacySlug, path: route.path })));
const routes = plan.staticRoutes;
const routeTable = [...plan.coveredRoutes].sort((a, b) => a.path.localeCompare(b.path));
const generated = [
  startMarker,
  '# /docs flat URLs → intent-based canonical URLs (one-to-one, permanent)',
  ...routes.map((route) => `/docs/${route.legacySlug} ${route.path} 301`),
  '',
  '# Table of /docs slugs covered by the dynamic prefix rules below. Comments only (not Cloudflare rules); read by sitemap/RSS/URL checks',
  ...routeTable.map((route) => `${ROUTE_TABLE_PREFIX}/docs/${route.legacySlug} ${route.path}`),
  '',
  '# Legacy category hubs → canonical public hubs',
  ...getAllCategories().map((category) => `/category/${category.slug} ${getCategoryHubPath(category.slug)} 301`),
  '/docs /exam 301',
  '/category /exam 301',
  '',
  '# Dynamic redirects must remain after every static redirect (Cloudflare Pages contract)',
  ...dynamicRedirects,
  '# /docs slugs that follow the public-URL rule: longest prefix first (first match wins), after every static rule',
  ...plan.dynamicRules.map((rule) => `${rule.from} ${rule.to} 301`),
  endMarker,
].join('\n');

const output = `${base}\n\n${generated}\n`;
const rules = output
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'));
const staticRules = rules.filter((line) => !/[*:]/.test(line.split(/\s+/)[0] ?? ''));
const dynamicRules = rules.length - staticRules.length;
const firstDynamicIndex = rules.findIndex(isDynamicRedirect);
if (firstDynamicIndex >= 0 && rules.slice(firstDynamicIndex + 1).some((line) => !isDynamicRedirect(line))) {
  throw new Error('Cloudflare Pages redirect 順序違反: 動的ルールの後ろに静的ルールがあります');
}

if (staticRules.length > 2000 || dynamicRules > 100) {
  throw new Error(`Cloudflare Pages redirect 上限超過: static=${staticRules.length}/2000, dynamic=${dynamicRules}/100`);
}

writeFileSync(path, output);
console.log(`[public-routes] ✓ docs=${allRoutes.length} (static ${routes.length} / dynamic-covered ${plan.coveredRoutes.length}), categories=${getAllCategories().length}`);
console.log(`[public-routes] Cloudflare rules: static=${staticRules.length}/2000, dynamic=${dynamicRules}/100`);
