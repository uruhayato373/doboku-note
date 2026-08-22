import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './lib/load-ts.mjs';

const { normalizeMetaDescription } = await loadTsModule('src/lib/metadata.ts');

test('normalizeMetaDescription は 160 字以内の説明を保持する', () => {
  const description = '1級土木施工管理技士の試験対策を体系的に解説します。';
  assert.equal(normalizeMetaDescription(description), description);
});

test('normalizeMetaDescription は長文を 160 字以内の文末で切る', () => {
  const description = `${'施工管理の重要事項を整理します。'.repeat(8)}${'追加説明'.repeat(30)}`;
  const normalized = normalizeMetaDescription(description);
  assert.ok(normalized.length <= 160, `description が ${normalized.length} 字`);
  assert.ok(normalized.endsWith('。') || normalized.endsWith('…'));
});

test('normalizeMetaDescription は改行と連続空白を正規化する', () => {
  assert.equal(normalizeMetaDescription('試験対策を\n 体系的に解説'), '試験対策を 体系的に解説');
});
