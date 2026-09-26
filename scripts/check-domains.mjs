#!/usr/bin/env node
/**
 * check-domains.mjs — 領域（ドメイン）の正本と、それを参照する側の整合を検査する。
 *
 *   1. .claude/config/domains.json の id / label が重複なく揃っている
 *   2. 全スキル（.claude/skills/<cat>/<name>/SKILL.md）と全エージェント（.claude/agents/*.md）の
 *      frontmatter に domain: があり、正本の id である
 *   3. docs/**（reviews・handoffs を除く）と .claude/knowledge/reference/*.md が documents で
 *      ちょうど1つの領域に解決できる
 *   4. 各領域のサイドバー画面（nav）の種類が navKinds にあり、URL の画面（tools/admin-app/src/app 配下の page.tsx）が実在する
 * バックログの [領域:] は check-backlog-schema が見る。検査した件数を出し、0 件は検査不成立（exit 2）。
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDomains, documentDomain, frontmatterDomain } from './lib/domains.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = loadDomains(ROOT);
const ids = new Set(cfg.domains.map((d) => d.id));
const errors = [];

const labels = cfg.domains.map((d) => d.label);
if (ids.size !== cfg.domains.length || new Set(labels).size !== labels.length) errors.push('domains.json: id か label が重複している');
for (const [key, id] of Object.entries(cfg.documents ?? {})) if (!ids.has(id)) errors.push(`documents["${key}"] = ${id} は領域 id にない`);

const walk = (dir, test, out = []) => {
  if (!existsSync(dir)) return out;
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, test, out);
    else if (test(p)) out.push(p);
  }
  return out;
};
const rel = (p) => relative(ROOT, p).split('\\').join('/');

const defs = [
  ...walk(join(ROOT, '.claude/skills'), (p) => p.endsWith('SKILL.md')),
  ...readdirSync(join(ROOT, '.claude/agents')).filter((n) => n.endsWith('.md')).map((n) => join(ROOT, '.claude/agents', n)),
];
for (const p of defs) {
  const d = frontmatterDomain(readFileSync(p, 'utf8'));
  if (!d) errors.push(`${rel(p)}: frontmatter に domain: が無い`);
  else if (!ids.has(d)) errors.push(`${rel(p)}: domain: ${d} は領域 id にない（${[...ids].join(' / ')}）`);
}

let navViews = 0;
const kinds = new Set(Object.keys(cfg.navKinds ?? {}));
const appDir = join(ROOT, 'tools/admin-app/src/app');
for (const d of cfg.domains) {
  if (!Array.isArray(d.nav) || d.nav.length === 0) errors.push(`${d.id}: nav（サイドバーの画面）が無い`);
  for (const v of d.nav ?? []) {
    navViews++;
    if (!kinds.has(v.kind)) errors.push(`${d.id} / ${v.label}: kind ${v.kind} は navKinds にない`);
    const path = v.href.split('?')[0].replace(/^\//, '');
    if (!existsSync(join(appDir, path, 'page.tsx'))) errors.push(`${d.id} / ${v.label}: ${v.href} の画面（app/${path}/page.tsx）が無い`);
  }
}

const docs = [
  ...walk(join(ROOT, 'docs'), (p) => p.endsWith('.md') && !/[\\/]docs[\\/](reviews|handoffs)[\\/]/.test(p)),
  ...walk(join(ROOT, '.claude/knowledge/reference'), (p) => p.endsWith('.md')),
];
for (const p of docs) if (!documentDomain(cfg, rel(p))) errors.push(`${rel(p)}: domains.json の documents で領域が決まらない`);

console.log(`[check-domains] 領域 ${ids.size} / サイドバー画面 ${navViews} / スキル・エージェント ${defs.length} 件 / 文書 ${docs.length} 件を実検査 / 違反 ${errors.length} 件`);
if (defs.length === 0 || docs.length === 0 || navViews === 0) {
  console.error('✗ 検査不成立: 対象を 1 件も読めなかった');
  process.exit(2);
}
if (errors.length) {
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log('[check-domains] ✓ 領域の正本と参照側は整合');
