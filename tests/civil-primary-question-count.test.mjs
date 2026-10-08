import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import matter from 'gray-matter';

// R07 問題Aは公式正答表の No.1–66。選択問題61問を全問数と取り違えない。
test('R07 問題Aの全問数が本文・SEOタイトル・説明で一致する', () => {
  const { data, content } = matter(readFileSync(new URL('../content/site/civil-construction-1/primary-r07-a/article.mdx', import.meta.url), 'utf8'));
  const questions = [...content.matchAll(/^## 問題 No\.(\d+)\s*$/gm)].map(match => Number(match[1]));
  assert.deepEqual(questions, Array.from({ length: 66 }, (_, i) => i + 1));
  for (const field of ['seoTitle', 'description']) {
    assert.match(data[field], new RegExp(`全${questions.length}問`), field);
  }
});
