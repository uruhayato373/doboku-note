import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  inferNoteContentType,
  isKnownNoteContentType,
  NOTE_CONTENT_TYPES,
} from '../scripts/lib/note-content-type.mjs';

test('分類語彙は5種類に固定する', () => {
  assert.deepEqual(NOTE_CONTENT_TYPES, ['product', 'index', 'learning', 'career', 'editorial']);
  assert.equal(isKnownNoteContentType('career'), true);
  assert.equal(isKnownNoteContentType('other'), false);
});

test('総合案内を index に分類する', () => {
  assert.equal(inferNoteContentType({
    path: 'content/note/共通/総合案内/article.md',
    data: { noteSeries: '総合案内', notePricing: 'free' },
  }), 'index');
});

test('転職記事は有料でも career を優先する', () => {
  assert.equal(inferNoteContentType({
    path: 'content/note/共通/施工管理からの転職/article.md',
    data: { notePricing: 'paid' },
  }), 'career');
});

test('マガジン収録記事を product に分類する', () => {
  assert.equal(inferNoteContentType({
    path: 'content/note/技術士総監/magazines/択一/2025/article.md',
    data: { noteMagazine: '択一', notePricing: 'paid' },
  }), 'product');
});

test('無料の試験解説を learning に分類する', () => {
  assert.equal(inferNoteContentType({
    path: 'content/note/技術士総監/勉強法/article.md',
    data: { notePricing: 'free' },
  }), 'learning');
});

test('一般的な失敗談を editorial に分類する', () => {
  assert.equal(inferNoteContentType({
    path: 'content/note/1級・2級土木/施工管理の失敗談と教訓-無料/article.md',
    data: { notePricing: 'free' },
  }), 'editorial');
});

