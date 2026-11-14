import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './lib/load-ts.mjs';
const { renderedNoteCards, renderedMagazineCardIds, resolvePlacement, resolveArticleMidNoteSlot, resolveEndNoteSlot, reservesPrimaryStudySlot } = await loadTsModule('src/lib/magazine-placement.ts');
const ids = ['civil-1-reading-guide', 'civil-1-ichiji-ronten', 'civil-1-experience-essay'];
const card = id => `<MagazineCard id="${id}" />`;
const body = ('## 本文\n' + '文'.repeat(1700) + '\n').repeat(5);
const slot = magazineId => ({magazineId, utmContent: 'test-top'});
const p = {top:slot(ids[0]), inline:ids.map(slot)};
const resolve = content => resolvePlacement('civil-construction-1-guide-exam-overview', 'guide', false, renderedNoteCards(content));

test('表示する手書きカードの商品と最初のh2前後を収集。参考資料・コード例・コメント・非公開を除く', () => {
  const content = `{/* ${card(ids[2])} */}\n\`\`\`mdx\n${card(ids[2])}\n\`\`\`\n${card(ids[0])}\n## 本文\n${card(ids[1])}\n<MagazineCard id="nonexistent" />\n## 参考資料\n${card(ids[2])}`;
  assert.deepEqual(renderedNoteCards(content), [
    {magazineId:ids[0], beforeFirstH2:true}, {magazineId:ids[1], beforeFirstH2:false},
  ]);
  assert.deepEqual(renderedMagazineCardIds(content), ids.slice(0,2));
});

test('h2前の手書きは別商品でも冒頭より優先し、h2後の同一商品も自動候補から外す', () => {
  assert.equal(resolve(card(ids[2]) + body).top, undefined);
  const lead = resolve(body).top.magazineId;
  const actual = resolve(body + card(lead));
  assert.equal(actual.top, undefined);
  assert.ok(actual.inline.every(s => s.magazineId !== lead));
  assert.ok(resolve(body + card(ids[2])).top);
});

test('手書き2枚以上は自動中間を抑止し、3枚以上は冒頭も出さない', () => {
  const content = body + card(ids[1]) + card(ids[2]);
  assert.deepEqual(resolve(content).inline, []);
  assert.equal(resolveArticleMidNoteSlot(p, 'guide', content), null);
  assert.equal(resolve(content + card(ids[0])).top, undefined);
});

test('一次も冒頭・本文直後・手書きと別商品を選び、候補が無ければ中間なし', () => {
  for (const group of ['primary','guide','textbook']) {
    assert.equal(resolveArticleMidNoteSlot(p, group, body)?.magazineId, ids[1]);
    assert.equal(resolveArticleMidNoteSlot({...p, end:slot(ids[1])}, group, body)?.magazineId, ids[2]);
    assert.equal(resolveArticleMidNoteSlot(p, group, body + card(ids[1]))?.magazineId, ids[2]);
    assert.equal(resolveArticleMidNoteSlot({top:p.top,inline:[p.top]}, group, body), null);
  }
  assert.equal(resolveArticleMidNoteSlot(p, 'primary', '## 短文\n本文'), null);
});

test('本文直後は冒頭の再掲を許し、手書きがあれば抑止する', () => {
  assert.deepEqual(resolveEndNoteSlot(p, body), p.top);
  assert.equal(resolveEndNoteSlot(p, body + card(ids[1])), null);
});


test('商品一覧型は枚数による冒頭抑止を免除し、最初のh2前の手書きは優先する', () => {
  const content = body + ids.map(card).join('') + card('civil-2-anki-note');
  const list = c => resolvePlacement('concrete-chief-engineer-guide-essay', 'guide', false, renderedNoteCards(c));
  assert.equal(list(content).top?.magazineId, 'cce-essay-mokuji');
  assert.equal(list(card(ids[0]) + content).top, undefined);
  assert.deepEqual(list(content).inline, []);
});


test('有料NoteLinkも冒頭・枚数の判定に含め、無料NoteLinkは含めない', () => {
  const paid = '<NoteLink url="https://note.com/test/n/test" kind="product" />';
  const free = '<NoteLink url="https://note.com/test/n/free" />';
  assert.equal(resolve(paid + body).top, undefined);
  assert.ok(resolve(free + body).top);
  assert.deepEqual(renderedMagazineCardIds(paid + body), []);
  assert.equal(resolveArticleMidNoteSlot(p, 'guide', body + paid + card(ids[1])), null);
  assert.equal(resolveEndNoteSlot(p, body + paid), null);
});

test('個別サイドバー商品を冒頭・本文直後・手書きと重ねず、資格トップの配置は保つ', async () => {
  const { sidebarProduct } = await loadTsModule('src/lib/sidebar-discovery.ts');
  const doc = {slug:'rccm-guide-study-plan',category:'rccm',group:'guide',tags:[]};
  const product = sidebarProduct('rccm',doc);
  assert.ok(product);
  assert.equal(sidebarProduct('rccm',doc,body), null);
  assert.equal(sidebarProduct('rccm',doc,body + card(product.id)), null);
  assert.equal(sidebarProduct('rccm',doc,card(ids[0]) + body)?.id, product.id, '冒頭が消えた場合は未掲出の商品を残す');
  assert.ok(sidebarProduct('rccm'), 'カテゴリの導線は維持する');
});


test('唯一の中間枠を教材に使っていた一次では、note削除を転職面の増設につなげない', () => {
  const three = ('## 問題\n' + '文'.repeat(1000) + '\n').repeat(3);
  assert.equal(reservesPrimaryStudySlot(p, three), true);
  assert.equal(reservesPrimaryStudySlot({inline:[]}, three), false);
  assert.equal(reservesPrimaryStudySlot(p, body), false, 'h2が4本以上なら既存の転職枠を維持');
  assert.equal(reservesPrimaryStudySlot(p, three + '<MagazineCard id="civil-1-reading-guide" placement="article-mid" />'), false);
});
