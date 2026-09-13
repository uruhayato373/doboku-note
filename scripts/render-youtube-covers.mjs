#!/usr/bin/env node
import { readFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { renderYoutubeCover, validateCoverDesign } from './lib/youtube-cover.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { values } = parseArgs({ options: { spec: { type: 'string' }, key: { type: 'string' } } });
if (!values.spec) throw new Error('Usage: node scripts/render-youtube-covers.mjs --spec <cover-design.json> [--key longform]');
const design = validateCoverDesign(JSON.parse(readFileSync(resolve(values.spec), 'utf8')));
const entries = Object.entries(design.covers ?? {}).filter(([key]) => !values.key || key === values.key);
if (!entries.length) throw new Error('指定した cover key が見つかりません');
const base = join(root, '.tmp/youtube-covers');
mkdirSync(base, { recursive: true });
const out = mkdtempSync(join(base, 'run-'));
const results = [];
for (const [key, spec] of entries) {
  if (!/^[a-z0-9-]+$/.test(key)) throw new Error('cover key は英数字とハイフンのみ');
  const rendered = await renderYoutubeCover(root, spec);
  writeFileSync(join(out, `${key}.png`), rendered.buffer);
  writeFileSync(join(out, `${key}.svg`), rendered.svg);
  results.push({ key, ...rendered.provenance });
}
writeFileSync(join(out, 'manifest.json'), JSON.stringify({ source: resolve(values.spec), results }, null, 2) + '\n');
console.log(JSON.stringify({ generated: results.length, out }, null, 2));
