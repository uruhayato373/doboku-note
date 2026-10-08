#!/usr/bin/env node
/**
 * build-video-compilation.mjs — 総まとめ（聞き流し）パックの storyboard.json を compilation.json から生成する。
 *
 * 元パックの場面は同じ試験のディレクトリから読み、通常動画がユーザー承認済みのものだけを束ねる
 * （scripts/lib/video-compilation.mjs）。描画は生成後に render-longform で行う。
 *
 * 使い方:
 *   node scripts/build-video-compilation.mjs --pack-dir content/sns/video-packs/civil-construction-2/matome-2kyu-chokuzen
 *   node scripts/build-video-compilation.mjs --pack-dir ... --check   # 生成物と一致しなければ exit 1（書かない）
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { assembleCompilation } from './lib/video-compilation.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { readJson } from './lib/json-io.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { values: args } = parseArgs({
  options: { 'pack-dir': { type: 'string' }, check: { type: 'boolean' } },
});
if (!args['pack-dir']) {
  console.error('Usage: node scripts/build-video-compilation.mjs --pack-dir content/sns/video-packs/{exam}/{slug} [--check]');
  process.exit(1);
}

const packDir = resolve(ROOT, args['pack-dir']);
const specPath = join(packDir, 'compilation.json');
if (!existsSync(specPath)) {
  console.error(`compilation.json がありません: ${specPath}`);
  process.exit(1);
}
const config = readJson(ROOT, datasetPath('config.video-content'));
const state = readJson(ROOT, config.paths.stateFile);
const examDir = dirname(packDir);

const { storyboard, chapters } = assembleCompilation(readJson(packDir, 'compilation.json'), (packId) => {
  const sbPath = join(examDir, packId, 'storyboard.json');
  if (!existsSync(sbPath)) throw new Error(`元パックの storyboard.json がありません: ${packId}`);
  return { storyboard: readJson(examDir, join(packId, 'storyboard.json')), longform: state.packs?.[packId]?.derivatives?.longform };
});

const text = JSON.stringify(storyboard, null, 2) + '\n';
const outPath = join(packDir, 'storyboard.json');
const total = storyboard.scenes.at(-1).end;
console.log(`章 ${chapters.length} / 場面 ${storyboard.scenes.length} / 設計尺 ${Math.floor(total / 60)}分${Math.round(total % 60)}秒`);

if (args.check) {
  const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : null;
  if (current !== text) {
    console.error('storyboard.json が compilation.json・元パックと一致しません（build-video-compilation を回し直す）');
    process.exit(1);
  }
  console.log('storyboard.json は最新');
} else {
  writeFileSync(outPath, text, 'utf8');
  for (const c of chapters) {
    const m = Math.floor(c.startSec / 60);
    console.log(`  ${m}:${String(Math.floor(c.startSec % 60)).padStart(2, '0')} 第${c.n}章 ${c.title}（${c.packId}）`);
  }
  console.log(`✓ ${outPath}（章の時刻は設計尺。概要欄には音声付きの実尺を使う）`);
}
