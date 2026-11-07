#!/usr/bin/env node
/**
 * サイト内サムネイルを Codex で監査する（Claude のトークンを使わない一次判定）。
 *   node scripts/review-site-thumbnails.mjs --input <items.json> --out <results.json> [--batch 8] [--parallel 3]
 * items: [{ key, image, text, scene, title }]。全件の判定が返らなければ exit 2（検査不成立）。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { askCodexAboutImages } from './lib/codex-image.mjs';

const { values: args } = parseArgs({ options: { input: { type: 'string' }, out: { type: 'string' }, batch: { type: 'string', default: '8' }, parallel: { type: 'string', default: '3' }, model: { type: 'string' } } });
const items = JSON.parse(readFileSync(args.input, 'utf8'));
if (!items.length) { console.error('対象 0 件'); process.exit(2); }

const promptOf = (part) => `添付の画像は順に次の${part.length}枚で、土木・建設系の資格試験サイトの記事カード用サムネイルです。ファイルを読まず、添付画像だけで判定してください。
${part.map((item, i) => `${i + 1}. key=${item.key} 記事=${item.title} 帯=${item.text} 絵の指示=${item.scene}`).join('\n')}

判定基準:
fail = 次のどれか。土木の実物や施工手順の誤り（機械の種別、部位、作業の順序、斜めシュートなど）、記事や帯と題材が合わない、人物が学生に見える、顔や手足の崩れ、文字や数字の混入、ありえない構造、絵の指示と矛盾、危険な作業姿勢や保護具の欠落。
minor = 誤りではないが、もっと合う絵にできる。
ok = どれにも当たらない。
人物や機械を部位ごとに見て、それらしいだけで ok にしないでください。
JSON 配列だけを返してください: [{"key":"…","verdict":"ok|minor|fail","reason":"確認した部位を20字以内"}]`;

const parse = (text) => { try { return JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1)); } catch { return null; } };
const size = Number(args.batch);
const batches = [];
for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));

async function review(part, tries = 2) {
  const known = new Set(part.map((item) => item.key));
  for (let attempt = 0; attempt < tries; attempt += 1) {
    const rows = parse(await askCodexAboutImages(promptOf(part), part.map((item) => item.image), { model: args.model ?? null }));
    if (rows && new Set(rows.filter((row) => known.has(row.key)).map((row) => row.key)).size === part.length) return rows.filter((row) => known.has(row.key));
  }
  console.error(`判定が欠けた: ${part.map((item) => item.key).join(',')}`);
  return [];
}

const results = [];
const width = Number(args.parallel);
for (let i = 0; i < batches.length; i += width) {
  for (const rows of await Promise.all(batches.slice(i, i + width).map((part) => review(part)))) results.push(...rows);
  writeFileSync(args.out, JSON.stringify(results, null, 2));
  console.log(`判定 ${results.length} / ${items.length}`);
}
const fails = results.filter((row) => row.verdict !== 'ok').length;
console.log(`対象 ${items.length} 件 / 判定 ${results.length} 件 / 要確認 ${fails} 件`);
process.exit(results.length === items.length ? 0 : 2);
