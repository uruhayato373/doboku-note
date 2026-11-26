// 過去問の「解答・解説」の開閉に目印を付ける rehype プラグイン（src/lib/rehype-answer-reveal.ts・2026-11-26）。
// MDX の <details> は JSX のノードで届く。目印が付かないと解答のボタンと正答のバッジの見た目が出ない。
import process from 'node:process';
import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

function run(tree) {
  // tsx の読み込みでは default が名前空間に包まれることがあるので、どちらでも関数を取る
  const source = `import * as mod from './src/lib/rehype-answer-reveal.ts';
    const plugin = typeof mod.default === 'function' ? mod.default : mod.default.default;
    const tree = ${JSON.stringify(tree)};
    plugin()(tree);
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
