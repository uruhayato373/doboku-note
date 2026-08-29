#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'node:fs';
import { getAllPublicDocRoutes, getPublicDocPath } from '../src/lib/content-routes';
import { getAllCategories, getCategoryHubPath } from '../src/lib/categories';

const path = 'public/_redirects';
const startMarker = '# BEGIN GENERATED PUBLIC ROUTES';
const endMarker = '# END GENERATED PUBLIC ROUTES';
const source = readFileSync(path, 'utf8');

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
        return target.startsWith('/docs/') ? line : `${docMatch[1]}${target}${docMatch[4]}`;
      }
      const categoryMatch = line.match(/^(\s*\/\S+\s+)\/category\/([a-z0-9-]+)(\s+30[18]\s*)$/i);
      if (categoryMatch) {
        return `${categoryMatch[1]}${getCategoryHubPath(categoryMatch[2]!)}${categoryMatch[3]}`;
      }
      return line;
    })
    .join('\n');
}

const base = canonicalizeExistingTargets(stripManagedBlock(source));
const routes = getAllPublicDocRoutes();
const generated = [
  startMarker,
  '# /docs flat URLs → intent-based canonical URLs (one-to-one, permanent)',
  ...routes.map((route) => `/docs/${route.legacySlug} ${route.path} 301`),
  '',
  '# Legacy category hubs → canonical public hubs',
  ...getAllCategories().map((category) => `/category/${category.slug} ${getCategoryHubPath(category.slug)} 301`),
  '/docs /exam 301',
  '/category /exam 301',
  endMarker,
].join('\n');

const output = `${base}\n\n${generated}\n`;
const rules = output
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'));
const staticRules = rules.filter((line) => !/[*:]/.test(line.split(/\s+/)[0] ?? ''));
const dynamicRules = rules.length - staticRules.length;

if (staticRules.length > 2000 || dynamicRules > 100) {
  throw new Error(`Cloudflare Pages redirect 上限超過: static=${staticRules.length}/2000, dynamic=${dynamicRules}/100`);
}

writeFileSync(path, output);
console.log(`[public-routes] ✓ docs=${routes.length}, categories=${getAllCategories().length}`);
console.log(`[public-routes] Cloudflare rules: static=${staticRules.length}/2000, dynamic=${dynamicRules}/100`);
