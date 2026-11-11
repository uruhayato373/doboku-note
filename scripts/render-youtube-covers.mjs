#!/usr/bin/env node
// npm run youtube-covers -- --all — 停止済みを除くYouTube表紙を処理（pop-v2は従来組版で生成、pop-poster-v3は採用PNGを保持。v3の新規制作は /create-pop-image）。--exam / --pub で絞り、--commit で原稿・素材台帳へ採用。確認一覧 .tmp/youtube-covers/pop-all/index.html。単体見本は --spec PATH（音声・字幕・公開状態は変更しない）

import { readFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { renderYoutubeCover, validateCoverDesign } from './lib/youtube-cover.mjs';
import { REPO_ROOT as root } from './lib/repository-paths.mjs';

const { values } = parseArgs({ options: { spec: { type: 'string' }, key: { type: 'string' }, all: { type: 'boolean' },
  commit: { type: 'boolean' }, exam: { type: 'string' }, pub: { type: 'string' } } });
if (values.all) {
  if (values.spec || values.key) throw new Error('--all と --spec/--key は併用できません');
  const { runPopCovers } = await import('./lib/youtube-pop-covers.mjs');
  await runPopCovers(root, values);
} else {
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
}
