/**
 * 記事の e-Gov へのリンクから「この記事の根拠法令」を作る（src/lib/egov-links.mjs・DN-0731）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { articleLabel, articleLaws, egovLinksOf } from '../src/lib/egov-links.mjs';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

const LAWS = { '347AC0000000057': { title: '労働安全衛生法' }, '338AC0000000100': { title: '建設業法' } };

test('articleLabel: アンカーの番号を「第N条のM」にする', () => {
  assert.equal(articleLabel('3'), '第3条');
  assert.equal(articleLabel('28_2'), '第28条の2');
  assert.equal(articleLabel('10_2_3'), '第10条の2の3');
});

test('articleLaws: 本文に出た順に法令をまとめ、条は番号順・重複なし、写しに無い法令 ID は出さない', () => {
  const text = [
    '[建設業法第26条](https://laws.e-gov.go.jp/law/338AC0000000100#Mp-At_26)',
    '[安衛法第59条](https://laws.e-gov.go.jp/law/347AC0000000057#Mp-At_59) と [第28条の2](https://laws.e-gov.go.jp/law/347AC0000000057#Mp-At_28_2)',
    '[同じ条](https://laws.e-gov.go.jp/law/347AC0000000057#Mp-At_59) [法令だけ](https://laws.e-gov.go.jp/law/338AC0000000100)',
    '[存在しない ID](https://laws.e-gov.go.jp/law/999AC0000000999#Mp-At_1)',
  ].join('\n');
  const laws = articleLaws(text, LAWS);
  assert.deepEqual(laws.map((l) => l.title), ['建設業法', '労働安全衛生法']);
  assert.deepEqual(laws[1].articles.map((a) => a.label), ['第28条の2', '第59条']);
  assert.equal(laws[1].articles[0].url, 'https://laws.e-gov.go.jp/law/347AC0000000057#Mp-At_28_2');
  assert.equal(laws[0].url, 'https://laws.e-gov.go.jp/law/338AC0000000100');
  assert.deepEqual(articleLaws('e-Gov へのリンクが無い本文', LAWS), []);
});

test('実際の記事でも根拠法令が出る（e-Gov へのリンクを持つ記事が 0 本なら検査不成立）', () => {
  const laws = JSON.parse(readFileSync(join(ROOT, 'config/egov-laws.json'), 'utf8')).laws;
  const text = readFileSync(join(ROOT, 'content/site/civil-construction-1/textbook-construction-business/article.mdx'), 'utf8');
  assert.ok(egovLinksOf(text).length > 0, '対象の記事に e-Gov へのリンクが無い（記事を選び直す）');
  const out = articleLaws(text, laws);
  assert.ok(out.length > 0);
  assert.ok(out.every((l) => l.title && l.url.startsWith('https://laws.e-gov.go.jp/law/')));
});
