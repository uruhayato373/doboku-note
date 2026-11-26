// 過去問の「解答・解説」の開閉に目印を付ける rehype プラグイン（src/lib/rehype-answer-reveal.ts・2026-11-26）。
// MDX の <details> は JSX のノードで届く。目印が付かないと解答のボタンと正答のバッジの見た目が出ない。
import process from 'node:process';
import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

function run(tree, options = {}) {
  // tsx の読み込みでは default が名前空間に包まれることがあるので、どちらでも関数を取る
  const source = `import * as mod from './src/lib/rehype-answer-reveal.ts';
    const plugin = typeof mod.default === 'function' ? mod.default : mod.default.default;
    const tree = ${JSON.stringify(tree)};
    plugin(${JSON.stringify(options)})(tree);
    process.stdout.write(JSON.stringify(tree));`;
  return JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', source], { cwd: REPO_ROOT, encoding: 'utf8' }));
}

const text = (value) => ({ type: 'text', value });
const jsx = (name, children) => ({ type: 'mdxJsxFlowElement', name, attributes: [], children });
const el = (tagName, children) => ({ type: 'element', tagName, properties: {}, children });

test('summary が「解答」で始まる details と、中の「正答：」の段落に目印を付ける（JSX のノード）', () => {
  const out = run({ type: 'root', children: [
    jsx('details', [jsx('summary', [text('解答・解説')]), el('p', [el('strong', [text('正答：3')])]), el('p', [text('解説')])]),
  ] });
  const details = out.children[0];
  assert.deepEqual(details.attributes.map((a) => a.name), ['data-answer']);
  assert.equal(details.children[1].properties.dataAnswerKey, '');
  assert.equal(details.children[2].properties.dataAnswerKey, undefined);
});

test('hast の element の details にも付き、解答以外の details には付けない', () => {
  const out = run({ type: 'root', children: [
    el('details', [el('summary', [text('解答例・解説')]), el('p', [text('正答: 2')])]),
    el('details', [el('summary', [text('サンプル')]), el('p', [text('正答：1')])]),
  ] });
  assert.equal(out.children[0].properties.dataAnswer, '');
  assert.equal(out.children[0].children[1].properties.dataAnswerKey, '');
  assert.equal(out.children[1].properties.dataAnswer, undefined);
  assert.equal(out.children[1].children[1].properties.dataAnswerKey, undefined);
});

const li = (n) => el('li', [text(`選択肢${n}の理由`)]);
const answer = (key, list = [li(1), li(2), li(3), li(4), li(5)]) => jsx('details', [
  jsx('summary', [text('解答・解説')]),
  el('p', [el('strong', [text(key)])]),
  el('p', [text('途中式')]),
  el('ol', list),
  jsx('ExamPoint', []),
]);

test('gate のページは正答の選択肢の理由だけを残し、ExamPoint を導線の目印に替える（途中式は残す）', () => {
  const out = run({ type: 'root', children: [answer('正答：3')] }, { gate: true });
  const children = out.children[0].children;
  const ol = children.find((c) => c.tagName === 'ol');
  assert.deepEqual(ol.children.map((c) => c.children[0].value), ['選択肢3の理由']);
  assert.equal(ol.properties.start, 3);
  assert.equal(children.some((c) => c.name === 'ExamPoint'), false);
  assert.equal(children.at(-1).tagName, 'answerupsell');
  assert.equal(children.some((c) => c.tagName === 'p' && c.children[0].value === '途中式'), true);
});

test('gate でも、対象外のページ・正答が番号で取れない問題・5 項目のリストが無い問題は何も消さない', () => {
  const plain = run({ type: 'root', children: [answer('正答：3')] });
  assert.equal(plain.children[0].children.find((c) => c.tagName === 'ol').children.length, 5);
  const none = run({ type: 'root', children: [answer('正答：なし（全員に得点）')] }, { gate: true });
  assert.equal(none.children[0].children.find((c) => c.tagName === 'ol').children.length, 5);
  assert.equal(none.children[0].children.some((c) => c.name === 'ExamPoint'), true);
  const four = run({ type: 'root', children: [answer('正答：2', [li(1), li(2), li(3), li(4)])] }, { gate: true });
  assert.equal(four.children[0].children.find((c) => c.tagName === 'ol').children.length, 4);
});
