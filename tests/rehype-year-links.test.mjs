// 本文の年度の過去問一覧（5 項目以上・項目がすべて過去問へのリンク 1 本＋「（N問）」）にだけ目印を付ける（src/lib/rehype-year-links.ts・2026-11-26）。
import process from 'node:process';
import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

function run(tree) {
  const source = `import * as mod from './src/lib/rehype-year-links.ts';
    const plugin = typeof mod.default === 'function' ? mod.default : mod.default.default;
    const tree = ${JSON.stringify(tree)};
    plugin()(tree);
    process.stdout.write(JSON.stringify(tree));`;
  return JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', source], { cwd: REPO_ROOT, encoding: 'utf8' }));
}

const text = (value) => ({ type: 'text', value });
const el = (tagName, children, properties = {}) => ({ type: 'element', tagName, properties, children });
const yearItem = (y, note = '（30問）') => el('li', [el('a', [text(`令和${y}年度`)], { href: `/exam/pe-first-stage/primary/r0${y}-basic` }), text(note)]);
const ul = (items) => ({ type: 'root', children: [el('ul', items)] });

test('過去問へのリンクだけの 5 項目以上の箇条書きに目印を付ける（補足の「（N問）」は許す）', () => {
  const out = run(ul([1, 2, 3, 4, 5].map((y) => yearItem(y))));
  assert.equal(out.children[0].properties.dataYearLinks, '');
});

test('4 項目以下・サイト外のリンク・本文の混じる項目の箇条書きには付けない', () => {
  assert.equal(run(ul([1, 2, 3, 4].map((y) => yearItem(y)))).children[0].properties.dataYearLinks, undefined);
  const outside = [1, 2, 3, 4].map((y) => yearItem(y)).concat(el('li', [el('a', [text('令和5年度')], { href: 'https://example.com/r05' })]));
  assert.equal(run(ul(outside)).children[0].properties.dataYearLinks, undefined);
  const prose = [1, 2, 3, 4].map((y) => yearItem(y)).concat(yearItem(5, 'は計算問題が多い年度'));
  assert.equal(run(ul(prose)).children[0].properties.dataYearLinks, undefined);
});
