import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
require('tsx/cjs');
const { buildLearningCatalog } = require('../src/lib/learning-catalog.ts');
const { products } = require('../config/products.json');
const categories = require('../src/config/categories.json');
const catalog = buildLearningCatalog();
const all = catalog.flatMap((exam) => [...exam.materials, ...exam.support]);
const byId = new Map(all.map((product) => [product.id, product]));

test('全公開資格の一覧と目次を作れ、商品がない資格にも無料学習の入口がある', () => {
  const expected = categories.filter((category) => category.area === 'exam' && category.visible !== false);
  assert.ok(expected.length >= 14);
  assert.deepEqual(new Set(catalog.map((exam) => exam.id)), new Set(expected.map((category) => category.slug)));
  for (const exam of catalog) {
    assert.equal(exam.siteHref, `/exam/${exam.id}`);
    assert.ok(exam.shortLabel);
  }
  const fisheries = catalog.find((exam) => exam.id === 'pe-fisheries');
  assert.ok(fisheries);
  assert.equal(fisheries.materials.length, 0);
});

test('公開・受付中の全商品を網羅し、取り下げ・休止・準備中の商品を出さない', () => {
  const available = products.filter(({ channel, catalog: c }) =>
    channel === 'note' ? c.published && c.noteUrl && !c.retiredAt && !c.shelvedAt
      : channel === 'kindle' ? c.status === 'live'
        : channel === 'coconala' && c.status === 'listed');
  assert.ok(available.length > 0);
  assert.deepEqual(new Set(byId.keys()), new Set(available.map((product) => product.id)));
  for (const exam of catalog) {
    const ids = [...exam.materials, ...exam.support].map((product) => product.id);
    assert.equal(new Set(ids).size, ids.length, `${exam.id} 内に重複商品がない`);
  }
  console.log(`learning-catalog: 対象 ${available.length} 商品 / 確認 ${byId.size} 商品`);
});

test('上下水道・舗装・管工事・測量の教材と、複数資格向けの支援を正しい入口へ置く', () => {
  for (const id of ['pe-water-supply', 'pavement', 'pipe-work', 'surveyor']) {
    assert.ok(catalog.find((exam) => exam.id === id)?.materials.length, `${id} に教材がある`);
  }
  for (const id of ['pe-construction', 'pe-comprehensive-management', 'pe-water-supply']) {
    const support = catalog.find((exam) => exam.id === id).support.map((product) => product.id);
    assert.ok(support.includes('coconala-pe-gyomu-tensaku'));
    assert.ok(support.includes('coconala-pe-oral-qa'));
  }
  for (const id of ['civil-construction-1', 'civil-construction-2']) {
    assert.ok(catalog.find((exam) => exam.id === id).support.some((product) => product.id === 'coconala-tensaku-4theme'));
  }
  assert.equal(catalog.find((exam) => exam.id === 'pe-first-stage').support.length, 0);
});

test('主要教材の順序と計測URLを保持する', () => {
  for (const exam of catalog) {
    const channels = new Set(exam.materials.map((product) => product.channel));
    const previewChannels = new Set(exam.materials.slice(0, 3).map((product) => product.channel));
    assert.deepEqual(previewChannels, channels);
  }
  for (const product of byId.values()) {
    const original = products.find((record) => record.id === product.id).catalog;
    const url = new URL(product.href);
    if (product.channel === 'note') {
      assert.equal(url.hostname, 'note.com');
      assert.equal(url.searchParams.get('utm_content'), `links-${product.id}`);
    } else if (product.channel === 'kindle') {
      assert.equal(url.pathname, `/dp/${original.asin}`);
    } else {
      assert.equal(url.searchParams.get('a8ejpredirect'), original.serviceUrl);
    }
  }
});

test('既存のnote目次へ誘導し、目次未整備の資格は主要教材を利用できる', () => {
  const { mokujiFor } = require('../src/lib/note-mokuji.ts');
  const { QUALIFICATION_TO_EXAM_KEY } = require('../src/lib/exam-brand.ts');
  for (const exam of catalog) {
    const qualification = categories.find((category) => category.slug === exam.id).qualification ?? exam.id;
    const index = mokujiFor(QUALIFICATION_TO_EXAM_KEY[qualification]);
    if (index) {
      assert.ok(exam.noteIndex);
      const url = new URL(exam.noteIndex.href);
      assert.equal(url.origin + url.pathname, index.noteUrl);
      assert.ok(url.searchParams.get('utm_content')?.startsWith('mokuji-'));
    } else assert.equal(exam.noteIndex, null);
  }
  assert.ok(catalog.find((exam) => exam.id === 'pe-first-stage').materials.length);
});

test('価格・割引説明・運営メモを表示用のデータに含めない', () => {
  const allowed = ['id', 'channel', 'title', 'href', 'deadline'];
  for (const product of byId.values()) assert.deepEqual(Object.keys(product).sort(), [...allowed].sort());
  for (const product of byId.values()) {
    assert.doesNotMatch(product.title + product.deadline, /[¥￥]|[\d,]+円|[%％].*(?:OFF|オフ|割引)/i);
  }
});
