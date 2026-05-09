// tests/yt-storyboard.test.mjs
//
// YouTube Shorts のストーリーボード（5 枚構成）決定ロジックの単体テスト。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildStoryboard,
  buildStoryboardFromExtract,
  truncateDefinition,
} from '../.claude/skills/social/yt-shorts-create/scripts/lib/build-storyboard.mjs';

test('buildStoryboard: followership で 5 枚（cover/def/ep×2/cta）', async () => {
  const sb = await buildStoryboard({
    category: 'pe-comprehensive-management',
    slug: 'followership',
  });
  assert.equal(sb.slides.length, 5);
  assert.equal(sb.slides[0].type, 'cover');
  assert.equal(sb.slides[1].type, 'definition');
  assert.equal(sb.slides[2].type, 'examPoint');
  assert.equal(sb.slides[3].type, 'examPoint');
  assert.equal(sb.slides[4].type, 'cta');
  assert.equal(sb.title, 'フォロワーシップ');
  assert.equal(sb.slug, 'followership');
});

test('buildStoryboardFromExtract: 抽出結果から 5 枚構成', () => {
  const mock = {
    title: 'テスト',
    description: 'テスト用 description',
    definition: 'テスト用の定義文',
    examPoints: ['ポイント1', 'ポイント2', 'ポイント3'],
    tags: ['keyword'],
  };
  const sb = buildStoryboardFromExtract(mock);
  assert.equal(sb.slides.length, 5); // cover + def + 2 ep + cta（既定 examPointCount=2）
  assert.equal(sb.slides[2].data.body, 'ポイント1');
  assert.equal(sb.slides[3].data.body, 'ポイント2');
  // ポイント3 は既定で含まれない
  assert.equal(sb.slides[4].type, 'cta');
});

test('buildStoryboardFromExtract: examPointCount で ep 数を変更', () => {
  const mock = {
    title: 't',
    description: 'd',
    definition: 'def',
    examPoints: ['p1', 'p2', 'p3', 'p4'],
    tags: [],
  };
  const sb = buildStoryboardFromExtract(mock, { examPointCount: 3 });
  assert.equal(sb.slides.length, 6); // cover + def + 3 ep + cta
  assert.equal(sb.slides[4].data.body, 'p3');
});

test('buildStoryboardFromExtract: examPoints が空でも cover/def/cta は出る', () => {
  const mock = {
    title: 't',
    description: 'd',
    definition: 'def',
    examPoints: [],
    tags: [],
  };
  const sb = buildStoryboardFromExtract(mock);
  assert.equal(sb.slides.length, 3); // cover + def + cta
  assert.equal(sb.slides[0].type, 'cover');
  assert.equal(sb.slides[1].type, 'definition');
  assert.equal(sb.slides[2].type, 'cta');
});

test('buildStoryboardFromExtract: definition が空なら description を使う', () => {
  const mock = {
    title: 't',
    description: 'description fallback',
    definition: '',
    examPoints: ['p1'],
    tags: [],
  };
  const sb = buildStoryboardFromExtract(mock);
  assert.match(sb.slides[1].data.body, /description fallback/);
});

test('buildStoryboardFromExtract: cover.subtitle は常に null（セクション番号を表示しない）', () => {
  const mock = {
    title: 't',
    section: '3.1',
    description: 'd',
    definition: 'def',
    examPoints: [],
    tags: [],
  };
  const sb = buildStoryboardFromExtract(mock);
  assert.equal(sb.slides[0].data.subtitle, null);
});

test('truncateDefinition: 80 字以内ならそのまま', () => {
  const text = 'これは短い定義文です。';
  assert.equal(truncateDefinition(text, 80), text);
});

test('truncateDefinition: 80 字超で句点があれば句点で切る', () => {
  const text = 'これは最初の文です。これは次の文ですが80字を超えるかもしれない長い文章を含む可能性が高いです。さらに3番目があります。';
  const result = truncateDefinition(text, 80);
  assert.ok(result.length <= 80);
  assert.ok(result.endsWith('。'));
});

test('truncateDefinition: 句点無しなら … で切る', () => {
  const text = 'あ'.repeat(100);
  const result = truncateDefinition(text, 80);
  assert.equal(result.length, 81); // 80 + '…'
  assert.ok(result.endsWith('…'));
});

test('truncateDefinition: 空文字は空文字を返す', () => {
  assert.equal(truncateDefinition('', 80), '');
  assert.equal(truncateDefinition(null, 80), '');
});
