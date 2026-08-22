#!/usr/bin/env node
// keyword-2026/article.mdx 内のリンク未設定キーワードを検出し、
// 対応する個別キーワードページが存在するものを報告する。

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

const ROOT = join(process.cwd(), 'content/site/pe-comprehensive-management');
const HUB = join(ROOT, 'keyword-2026/article.mdx');

const hubRaw = readFileSync(HUB, 'utf8');
const hubLines = hubRaw.split(/\r?\n/);

const slugDirs = readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== 'keyword-2026' && !d.name.startsWith('exam-') && !d.name.match(/^(section-|r\d|guide)/))
  .map((d) => d.name);

const titleToSlug = new Map();
for (const slug of slugDirs) {
  try {
    const articlePath = join(ROOT, slug, 'article.mdx');
    const raw = readFileSync(articlePath, 'utf8');
    const { data } = matter(raw);
    if (data.title) {
      titleToSlug.set(String(data.title).trim(), slug);
    }
  } catch {}
}

const linkedSlugs = new Set();
const linkRegex = /\/docs\/pe-comprehensive-management-([a-z0-9-]+)/g;
let m;
while ((m = linkRegex.exec(hubRaw)) !== null) {
  linkedSlugs.add(m[1]);
}

const unlinkedSlugsInHub = [];
const unlinkedCandidates = [];

for (let i = 0; i < hubLines.length; i++) {
  const line = hubLines[i];
  if (line.includes('](/docs/')) continue;
  if (line.startsWith('#')) continue;

  const stripped = line
    .replace(/^[\s\-*]+/, '')
    .replace(/\*\*/g, '')
    .trim();
  if (!stripped) continue;
  if (stripped.length > 60) continue;
  if (stripped.startsWith(':::')) continue;
  if (stripped.startsWith('|')) continue;

  for (const [title, slug] of titleToSlug) {
    if (linkedSlugs.has(slug)) continue;
    if (stripped === title || stripped.includes(title)) {
      unlinkedSlugsInHub.push({ line: i + 1, text: stripped, title, slug });
      break;
    }
  }
}

console.log(`# Linked slugs in hub: ${linkedSlugs.size}`);
console.log(`# All keyword pages: ${titleToSlug.size}`);
console.log(`# Pages NOT linked from hub: ${titleToSlug.size - linkedSlugs.size}`);
console.log(`# Hub lines with unlinked keyword candidates: ${unlinkedSlugsInHub.length}`);
console.log('');
console.log('## Unlinked candidates (line: text → slug)');
for (const u of unlinkedSlugsInHub) {
  console.log(`L${u.line}: ${u.text} → ${u.slug} (title: ${u.title})`);
}

const linkedSlugSet = new Set([...linkedSlugs].map((s) => `pe-comprehensive-management-${s}`));
const allSlugSet = new Set([...titleToSlug.values()].map((s) => `pe-comprehensive-management-${s}`));
const orphanPages = [...allSlugSet].filter((s) => !linkedSlugSet.has(s));
console.log('');
console.log(`## Orphan pages (exist but not linked from hub): ${orphanPages.length}`);
for (const o of orphanPages.slice(0, 50)) {
  const slug = o.replace('pe-comprehensive-management-', '');
  const title = [...titleToSlug.entries()].find(([, s]) => s === slug)?.[0];
  console.log(`- ${slug} → ${title}`);
}
if (orphanPages.length > 50) console.log(`... and ${orphanPages.length - 50} more`);
