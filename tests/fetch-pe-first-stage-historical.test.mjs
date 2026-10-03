import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { historicalSources } from '../scripts/fetch-pe-first-stage-historical.mjs';

// 技術士第一次試験 H23〜H30 の固定した原典（URL・SHA-256・ページ数）は過去問の在庫台帳が持つ。
// 別の設定ファイルへ写さない（URL を二重に持つと、公式の URL 変更で片方が取り残される）。
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const inventory = JSON.parse(readFileSync(join(ROOT, 'data/pastexams/inventory.json'), 'utf8'));

test('在庫台帳から 平成23〜30年度 × 基礎・適性・専門（建設）の 24 本と、合冊の正答 1 本を取り出す', () => {
  const sources = historicalSources(inventory);
  assert.equal(sources.length, 25);
  assert.deepEqual([...new Set(sources.map((s) => s.year))], ['h23', 'h24', 'h25', 'h26', 'h27', 'h28', 'h29', 'h30', 'h23-h30']);
  assert.equal(sources.at(-1).subject, 'answers', '合冊の正答は最後');
  for (const year of ['h23', 'h30']) {
    assert.deepEqual(sources.filter((s) => s.year === year).map((s) => s.subject), ['basic', 'aptitude', 'construction']);
  }
  assert.equal(sources[0].file, 'h23-basic.pdf');
  for (const s of sources) {
    assert.match(s.sha256, /^[a-f0-9]{64}$/, s.file);
    assert.ok(Number.isInteger(s.pages) && s.pages > 0, s.file);
    assert.match(s.url, /^https:\/\/www\.engineer\.or\.jp\//, s.file);
  }
  assert.equal(new Set(sources.map((s) => s.file)).size, 25, '出力ファイル名が重複している');
});

test('sha256 を付けたファイルだけが固定した原典になり、付け方が不完全なら例外（黙って落とさない）', () => {
  const inv = (files) => ({ exams: { 'pe-first-stage': { years: [{ year: 2011, files }] } } });
  const base = { kind: 'question', section: '基礎科目', file: 'H23/H23_基礎科目.pdf', sourceUrl: 'https://example.jp/a.pdf', acquiredAt: null };
  assert.deepEqual(historicalSources(inv([base])), [], 'sha256 の無いものは対象外');
  assert.deepEqual(historicalSources(inv([{ ...base, sha256: 'a'.repeat(64), pages: 3 }])).map((s) => s.file), ['h23-basic.pdf']);
  assert.throws(() => historicalSources(inv([{ ...base, sha256: 'a'.repeat(64) }])), /pages/);
  assert.throws(() => historicalSources(inv([{ ...base, section: '総合', sha256: 'a'.repeat(64), pages: 3 }])), /科目を決められない/);
  // 専門科目の別部門（上下水道など）は部門番号で名前を付ける
  assert.equal(historicalSources(inv([{ ...base, section: '専門科目 15 上下水道部門', sha256: 'b'.repeat(64), pages: 9 }]))[0].file, 'h23-specialty-15.pdf');
  assert.throws(() => historicalSources({ exams: {} }), /pe-first-stage/);
  // 正答が 2 本以上になると同じ名前へ書き出して上書きする（検証だけ通ってしまう）ので、名前の付け方が決まるまで例外で止める
  const answer = { kind: 'answer', section: '正答', file: 'a.pdf', sourceUrl: 'https://example.jp/a.pdf', sha256: 'c'.repeat(64), pages: 5 };
  assert.throws(() => historicalSources(inv([answer, { ...answer, file: 'b.pdf', sourceUrl: 'https://example.jp/b.pdf' }])), /重複/);
});
