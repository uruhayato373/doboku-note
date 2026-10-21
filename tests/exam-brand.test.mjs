import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { loadTsModule } from './lib/load-ts.mjs';

// 資格キーは商品の qualification（config/products.json）から引く。id の接頭辞では推定せず、知らない資格を総監に倒さない（DN-0794）
const brand = await loadTsModule('src/lib/exam-brand.ts');
const names = await loadTsModule('src/lib/qualification-names.ts');
const short = (id) => names.qualificationShortLabel(id);

test('全部門共通の口頭教材には技術士の共通ラベルを使う', () => {
  assert.equal(brand.brandOf('pe-oral-general-guide').label, short('professional-engineer'));
});

test('建設部門と総監の口頭教材はそれぞれの部門表示を保つ', () => {
  assert.equal(brand.brandOf('pe-construction-oral-guide').label, short('pe-construction'));
  assert.equal(brand.brandOf('tankan-oral-complete').label, short('pe-comprehensive-management'));
});

test('note の全商品の資格に資格キーがある（無い資格の商品を出すとここで落ちる）', () => {
  const products = JSON.parse(readFileSync('config/products.json', 'utf8'));
  const list = (Array.isArray(products) ? products : products.products ?? Object.values(products)).filter((p) => p.channel === 'note');
  assert.ok(list.length > 100, `note の商品が ${list.length} 件しか読めない`);
  const failed = [];
  for (const p of list) {
    try { assert.ok(brand.brandOf(p.id).label); } catch (e) { failed.push(`${p.id}（${p.qualification}）: ${e.message}`); }
  }
  assert.deepEqual(failed, []);
});

test('資格キーの無い商品は総監に倒さず投げる', () => {
  assert.throws(() => brand.brandOf('no-such-magazine'), /資格キーが無い/);
});

test('接頭辞での推定と総監への既定値がコードに無い', () => {
  const src = readFileSync('src/lib/exam-brand.ts', 'utf8');
  assert.doesNotMatch(src, /id\.startsWith\(/);
  assert.doesNotMatch(src, /return 'tankan';/);
});
