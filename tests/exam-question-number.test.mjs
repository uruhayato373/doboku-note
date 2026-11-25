// 過去問ページの設問の見出しから番号を取り出す（src/lib/exam-question-number.ts）。
// 技術士第一次の見出し（「Ⅰ-1-1」「Ⅲ-1」）で番号が取れず、80 ページで冒頭の目次も PC の設問一覧も出ていなかった（2026-11-26）。
import process from 'node:process';
import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

function headings(texts) {
  const source = `import { questionHeadings } from './src/lib/exam-question-number.ts';
    const texts = ${JSON.stringify(texts)};
    process.stdout.write(JSON.stringify(questionHeadings(texts.map((text, i) => ({ id: 'h' + i, text, level: 2 })))));`;
  return JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', source], { cwd: REPO_ROOT, encoding: 'utf8' }));
}

test('基礎科目の「Ⅰ-群-番号」は群つきで、ボタンの文字は「群-番号」', () => {
  assert.deepEqual(headings(['Ⅰ-1-1', 'I-2-3', 'Ⅰ－5－6', '解答一覧']).map((q) => [q.label, q.group]), [['1-1', 1], ['2-3', 2], ['5-6', 5]]);
});

test('適性・専門の「Ⅱ-番号」「Ⅲ-番号」は番号だけで群を持たない', () => {
  assert.deepEqual(headings(['Ⅱ-1', 'Ⅲ-12', 'III-3', 'Ⅳ-2']).map((q) => [q.label, q.group ?? null]), [['1', null], ['12', null], ['3', null], ['2', null]]);
});

test('Ⅱ・Ⅲ に枝番があっても群にしない（群は基礎科目の Ⅰ だけ）', () => {
  assert.deepEqual(headings(['Ⅱ-1-1', 'Ⅱ-1-2']).map((q) => [q.label, q.group ?? null]), [['1-1', null], ['1-2', null]]);
});

test('ほかの資格の「問題 No.1」「問2」「第3問」は今までどおり', () => {
  assert.deepEqual(headings(['問題 No.1', '問2', '第3問', '設問の解説']).map((q) => q.label), ['1', '2', '3']);
});
