import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { historicalSources } from '../scripts/fetch-pe-first-stage-historical.mjs';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

// 技術士第一次試験の固定した原典（URL・SHA-256・ページ数）は過去問の在庫台帳が持つ。
// 別の設定ファイルへ写さない（URL を二重に持つと、公式の URL 変更で片方が取り残される）。
const inventory = JSON.parse(readFileSync(join(ROOT, 'data/pastexams/inventory.json'), 'utf8'));

test('在庫台帳から H23〜H30 の基礎・適性・建設 24 本と合冊の正答 1 本、上下水道の全 16 回と令和の正答 8 本を取り出す', () => {
  const sources = historicalSources(inventory);
  assert.equal(sources.length, 49);
  assert.equal(sources.at(-1).file, 'h23-h30-answers.pdf', '平成の合冊の正答は最後');
  for (const year of ['h23', 'h30']) {
    assert.deepEqual(sources.filter((s) => s.year === year).map((s) => s.subject), ['basic', 'aptitude', 'construction', 'specialty-10']);
  }
  assert.equal(sources[0].file, 'h23-basic.pdf');
  // 令和は r01〜。再試験は -retest を付けて本試験と分け、正答は年度ごと
  assert.deepEqual(
    sources.filter((s) => s.year.startsWith('r01')).map((s) => s.file).sort(),
    ['r01-answers.pdf', 'r01-retest-answers.pdf', 'r01-retest-specialty-10.pdf', 'r01-specialty-10.pdf'],
  );
  assert.equal(sources.filter((s) => s.subject === 'specialty-10').length, 16);
  assert.equal(sources.filter((s) => s.subject === 'answers').length, 9);
  for (const s of sources) {
    assert.match(s.sha256, /^[a-f0-9]{64}$/, s.file);
    assert.ok(Number.isInteger(s.pages) && s.pages > 0, s.file);
    assert.match(s.url, /^https:\/\/www\.engineer\.or\.jp\//, s.file);
  }
  assert.equal(new Set(sources.map((s) => s.file)).size, 49, '出力ファイル名が重複している');
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
  // 同じ年度・同じ区分の正答が 2 本あると同じ名前へ書き出して上書きする（検証だけ通ってしまう）ので例外で止める
  const answer = { kind: 'answer', section: '正答', file: 'a.pdf', sourceUrl: 'https://example.jp/a.pdf', sha256: 'c'.repeat(64), pages: 5 };
  assert.throws(() => historicalSources(inv([answer, { ...answer, file: 'b.pdf', sourceUrl: 'https://example.jp/b.pdf' }])), /重複/);
  // 再試験は本試験と別の名前（同じ年度に 2 本あっても上書きしない）
  assert.deepEqual(
    historicalSources(inv([answer, { ...answer, section: '正答（再試験）', file: 'b.pdf' }])).map((s) => s.file).sort(),
    ['h23-answers.pdf', 'h23-retest-answers.pdf'],
  );
});
