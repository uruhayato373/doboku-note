// 資格別の販売額（scripts/lib/sales-by-qualification.mjs）が全資格へ振り分け、合計がチャネル合計と一致することを固定する。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { salesByQualification, qualificationKey } from '../scripts/lib/sales-by-qualification.mjs';

const config = {
  qualifications: [{ id: 'civil-construction-1', label: '1級土木' }, { id: 'civil-construction-2', label: '2級土木' }],
  salesRules: [{ match: '^civil-lab-', cells: ['civil-construction-1:second', 'civil-construction-2:second'] }],
  rules: { note: [{ match: '^civil-1-', cells: ['civil-construction-1:second'] }, { match: '^civil-2-', cells: ['civil-construction-2:second'] }],
    coconala: [{ match: '^coconala-2kyu-', cells: ['civil-construction-2:second'] }], kindle: [{ match: '^A-', cells: ['civil-construction-1:first'] }] },
};

test('重点資格に限らず振り分け、合計はチャネル合計と一致する', () => {
  const root = mkdtempSync(join(tmpdir(), 'sbq-'));
  const w = (rel, obj) => { mkdirSync(join(root, rel, '..'), { recursive: true }); writeFileSync(join(root, rel), JSON.stringify(obj)); };
  w('data/note/sales.json', { sales: [
    { date: '2026-08-02', productId: 'civil-1-pack', price: 1000 },
    { date: '2026-08-03', productId: 'article:civil-2-bank', price: 500 },
    { date: '2026-08-04', productId: 'membership:civil-lab-annual', price: 300 },
    { date: '2026-08-05', productId: 'zzz-unknown', price: 200 },
    { date: '2026-09-01', productId: 'civil-1-pack', price: 9999 },
  ] });
  w('data/coconala/orders-snapshot.json', { orders: [{ soldOn: '2026-08-10', talkroomId: 1, priceYen: 700 }] });
  w('data/coconala/orders.json', { orders: [{ talkroomId: 1, serviceId: 'coconala-2kyu-tensaku' }] });
  w('data/kdp/royalties.json', { months: { '2026-08': { range: { start: '2026-08-01' }, books: [{ bookId: 'A-01', royalty: 50 }, { bookId: 'other-site', royalty: 999 }] } } });
  w('scripts/kindle-published/catalog.json', { books: [{ id: 'A-01' }] });
  const rows = salesByQualification(root, { startDate: '2026-08-01', endDate: '2026-08-31' }, config);
  const by = Object.fromEntries(rows.map((r) => [r.id, r.value]));
  assert.deepEqual(by, { 'civil-construction-1': 1050, 'civil-construction-2': 1200, multiple: 300, unclassified: 200 });
  assert.equal(rows.reduce((s, r) => s + r.value, 0), 1000 + 500 + 300 + 200 + 700 + 50);
});

test('qualificationKey は単一資格・複数資格・未分類を分ける', () => {
  assert.equal(qualificationKey(['rccm:written']), 'rccm');
  assert.equal(qualificationKey(['a:x', 'a:y']), 'a');
  assert.equal(qualificationKey(['a:x', 'b:y']), 'multiple');
  assert.equal(qualificationKey(null), 'unclassified');
});
