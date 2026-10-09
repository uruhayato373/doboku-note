// コンクリート主任技士のサイト note CTA 配線（magazine-placement.ts）の意図を固定する（DN-0529）。
//   - 分野別の過去問（mix-design 以外）は R8 四肢択一予想50問、体系テキスト（mix-design 以外）は直前暗記ノート
//   - 配合設計の過去問・テキストは配合計算12問、試験概要・傾向は択一直前パック、小論文ガイドは小論文商品
//   - 2面（textbook-production-qc・primary-construction）も分野別の方針どおり択一商品（到達しない小論文分岐を 2026-10-05 に削除）
// 実 resolvePlacement を esbuild でトランスパイルして呼ぶ（civil2-placement.test.mjs と同じ方式）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

async function loadPlacement() {
  const ts = readFileSync(ROOT + 'src/lib/magazine-placement.ts', 'utf8');
  const js = buildSync({
    stdin: { contents: ts, loader: 'ts', resolveDir: ROOT + 'src/lib' },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
  }).outputFiles[0].text;
  return import('data:text/javascript,' + encodeURIComponent(js));
}

test('主任技士 分野別の過去問・テキスト: 2面を含めて択一商品を冒頭に出す', async () => {
  const { resolvePlacement } = await loadPlacement();
  assert.equal(resolvePlacement('concrete-chief-engineer-primary-construction', 'primary').top?.magazineId, 'cce-r8-mc-50');
  assert.equal(resolvePlacement('concrete-chief-engineer-primary-durability', 'primary').top?.magazineId, 'cce-r8-mc-50');
  assert.equal(resolvePlacement('concrete-chief-engineer-textbook-production-qc', 'textbook').top?.magazineId, 'cce-anki-note');
  assert.equal(resolvePlacement('concrete-chief-engineer-textbook-materials', 'textbook').top?.magazineId, 'cce-anki-note');
});

test('主任技士 試験概要・傾向は択一直前パック', async () => {
  const { resolvePlacement } = await loadPlacement();
  for (const slug of ['concrete-chief-engineer-guide-overview', 'concrete-chief-engineer-guide-trends']) {
    assert.equal(resolvePlacement(slug, 'guide').top?.magazineId, 'cce-takuitsu-chokuzen-pack', slug);
  }
});

test('主任技士 配合設計の過去問・テキストは配合計算12問を優先する', async () => {
  const { resolvePlacement } = await loadPlacement();
  for (const [slug, group] of [['concrete-chief-engineer-primary-mix-design', 'primary'], ['concrete-chief-engineer-textbook-mix-design', 'textbook']]) {
    assert.equal(resolvePlacement(slug, group).top?.magazineId, 'cce-mix-calculation-practice', slug);
  }
});
