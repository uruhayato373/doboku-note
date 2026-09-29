import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyArticleCtas, classifyCtaLive, extractCtaExpectations } from '../scripts/lib/note-cta-live.mjs';

const MD = [
  '---',
  'title: t',
  '---',
  '',
  '<!-- cta:pack-top -->',
  'パックはこちら。',
  '',
  'https://note.com/dobokunote/m/m1234',
  '',
  '<!-- cta:coconala-custom -->',
  'この答案をあなたの工事に合わせて仕上げたいときは、…',
  '',
  'https://coconala.com/services/4418775',
  '',
  'まだ答案が無い人は、…',
  '',
  'https://coconala.com/services/4418781',
  '',
  '## 令和3年度 問題1',
  '',
  '<!-- cta:mokuji -->',
  'https://note.com/dobokunote/n/n9999',
].join('\n');

test('extractCtaExpectations: 導線の種類ごとに最初のブロックを取り、有料記事は見出しより前だけ', () => {
  const free = extractCtaExpectations(MD);
  assert.deepEqual(free.map((e) => e.id), ['pack-top', 'coconala-custom', 'mokuji']);
  assert.deepEqual(free[1].links, ['https://coconala.com/services/4418775', 'https://coconala.com/services/4418781']);
  assert.equal(free[2].beforeFirstHeading, false);
  assert.deepEqual(extractCtaExpectations(MD, { paid: true }).map((e) => e.id), ['pack-top', 'coconala-custom']);
  assert.deepEqual(extractCtaExpectations('導線なし'), []);
});

test('classifyCtaLive: 順番どおり・見出しの前なら ok、無い・逆順・見出しの後ろを区別する', () => {
  const e = extractCtaExpectations(MD)[1];
  assert.equal(classifyCtaLive('<p>services/4418775</p><p>services/4418781</p><h2>x</h2>', e).state, 'ok');
  assert.deepEqual(classifyCtaLive('<p>services/4418775</p><h2>x</h2>', e), { state: 'missing', missing: ['https://coconala.com/services/4418781'] });
  assert.equal(classifyCtaLive('<p>services/4418781</p><p>services/4418775</p><h2>x</h2>', e).state, 'order');
  assert.equal(classifyCtaLive('<h2>x</h2><p>services/4418775</p><p>services/4418781</p>', e).state, 'position');
});

test('classifyArticleCtas: パックが出ていてもココナラが無ければ記事は missing', () => {
  const exp = extractCtaExpectations(MD, { paid: true });
  const r = classifyArticleCtas('<p>m1234</p><h2>x</h2>', exp);
  assert.equal(r.state, 'missing');
  assert.equal(r.byId['pack-top'].state, 'ok');
  assert.equal(r.byId['coconala-custom'].state, 'missing');
});
