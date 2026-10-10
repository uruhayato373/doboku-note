// ココナラ出品台帳（src/lib/coconala-services.ts）の価格は priceYen 1 つが正本。
// 表示用の price（例: '¥8,000（2テーマセット）'）は priceYen と priceNote から作り、エントリに数字を二重に書かない。
// 以前は price と priceYen を人手で同期していた（改定のたびにどちらかが取り残される）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadTsModule } from './lib/load-ts.mjs';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

test('price は priceYen（と priceNote）から作った文字列で、全出品が検査される', async () => {
  const { COCONALA_SERVICES } = await loadTsModule('src/lib/coconala-services.ts');
  const all = Object.values(COCONALA_SERVICES);
  assert.ok(all.length >= 30, `出品が少なすぎる（読み込みの破損を疑う）: ${all.length}`);
  for (const s of all) {
    assert.ok(Number.isInteger(s.priceYen) && s.priceYen > 0, `${s.id}: priceYen が整数でない`);
    const want = `¥${s.priceYen.toLocaleString('en-US')}${s.priceNote ? `（${s.priceNote}）` : ''}`;
    assert.equal(s.price, want, s.id);
  }
});

test('台帳のエントリに price 文字列を直書きしない（priceYen と二重に持たない）', () => {
  const ts = readFileSync(join(ROOT, 'src/lib/coconala-services.ts'), 'utf8');
  const body = ts.slice(ts.indexOf('const SERVICES_RAW'), ts.indexOf('} as const satisfies'));
  assert.ok(body.length > 10_000, '台帳の本体を切り出せていない');
  assert.deepEqual(body.match(/^\s+price:\s*'/gm) ?? [], [], 'price は priceYen から作る。補足は priceNote に書く');
  assert.ok((body.match(/^\s{4}priceYen:\s*\d+,/gm) ?? []).length >= 30, 'priceYen が読めない');
});
