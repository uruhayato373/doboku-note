import assert from 'node:assert/strict';
import test from 'node:test';
import { replaceFrontmatterField } from '../scripts/lib/frontmatter-field.mjs';

const doc = [
  '---',
  'title: 元のタイトル',
  'seoTitle: 古い｜タイトル',
  'description: >-',
  '  折り返しの',
  '  説明文',
  'tags: [a]',
  '---',
  '',
  'seoTitle: 本文の同名の行は触らない',
  '',
].join('\n');

test('1 行の欄だけを置き換え、他の欄と本文は変えない', () => {
  const out = replaceFrontmatterField(doc, 'seoTitle', '新しい「題」｜$1');
  assert.ok(out.includes('seoTitle: "新しい「題」｜$1"\n'));
  assert.ok(out.includes('title: 元のタイトル\n'));
  assert.ok(out.endsWith('seoTitle: 本文の同名の行は触らない\n'));
  assert.equal(out.split('\n').length, doc.split('\n').length);
});

test('折り返し（>-）の欄は 1 行にまとめて置き換える', () => {
  const out = replaceFrontmatterField(doc, 'description', '新しい説明');
  assert.ok(out.includes('description: "新しい説明"\ntags: [a]\n'));
  assert.ok(!out.includes('折り返しの'));
});

test('CRLF の文書では改行コードを保つ', () => {
  const crlf = doc.replace(/\n/g, '\r\n');
  const out = replaceFrontmatterField(crlf, 'description', 'x');
  assert.ok(out.includes('description: "x"\r\ntags: [a]\r\n'));
  assert.ok(!/[^\r]\n/.test(out));
});

test('欄か frontmatter が無ければ null', () => {
  assert.equal(replaceFrontmatterField(doc, 'canonical', 'x'), null);
  assert.equal(replaceFrontmatterField('本文だけ', 'seoTitle', 'x'), null);
});
