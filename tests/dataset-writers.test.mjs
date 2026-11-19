import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATASETS } from '../scripts/lib/datasets.mjs';
import { WRITERS, datasetsWrittenByAutomation, parseWriter, writerBaselineProblems, writerDeclOf, writerProblems } from '../scripts/lib/dataset-writers.mjs';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

const known = {
  scripts: new Set(['product', 'note-sales-fetch']),
  files: (p) => p === 'scripts/x.mjs',
  automations: new Set(['weekly-review']),
  skills: new Set(['record-sales']),
  agents: new Set(['note-catalog-operator']),
};

test('parseWriter: 接頭辞つきの値と human を読み、形の違う値は null', () => {
  assert.deepEqual(parseWriter('script:a8-ui:fetch'), { kind: 'script', name: 'a8-ui:fetch' });
  assert.deepEqual(parseWriter('human'), { kind: 'human', name: '' });
  assert.equal(parseWriter('product'), null);
  assert.equal(parseWriter('cron:weekly'), null);
});

test('writerProblems: 実在しない書き手・形の誤り・重複を返す', () => {
  assert.deepEqual(writerProblems({ writer: ['script:product', 'automation:weekly-review'] }, known), []);
  assert.match(writerProblems({ writer: ['script:nope'] }, known).join('\n'), /package\.json の scripts に無い/);
  assert.match(writerProblems({ writer: ['file:scripts/gone.mjs'] }, known).join('\n'), /ファイルが無い/);
  assert.match(writerProblems({ writer: ['automation:nope'] }, known).join('\n'), /自動化の台帳/);
  assert.match(writerProblems({ writer: ['skill:nope'] }, known).join('\n'), /\.claude\/skills に無い/);
  assert.match(writerProblems({ writer: ['agent:nope'] }, known).join('\n'), /\.claude\/agents に無い/);
  assert.match(writerProblems({ writer: ['product'] }, known).join('\n'), /形が違う/);
  assert.match(writerProblems({ writer: ['human', 'human'] }, known).join('\n'), /同じ値が 2 回/);
  assert.match(writerProblems({ writer: [] }, known).join('\n'), /1 つ以上/);
  assert.match(writerProblems({ writerNote: 'x' }, known).join('\n'), /writer が無い/);
  assert.deepEqual(writerProblems({}, known), [], '未記入は基準線が見る');
});

test('writerProblems: 定期実行のほかに書き手が 2 つ以上あれば note が要る', () => {
  const two = ['script:note-sales-fetch', 'skill:record-sales', 'automation:weekly-review'];
  assert.match(writerProblems({ writer: two }, known).join('\n'), /書き手が 2 つある/);
  assert.deepEqual(writerProblems({ writer: two, writerNote: '当月分は取得、貼った履歴は手順で追記' }, known), []);
  assert.deepEqual(writerProblems({ writer: ['script:product', 'automation:weekly-review'] }, known), [], '実装 1 つ＋定期実行は note 不要');
});

test('writerBaselineProblems: 新しい未記入・下げ忘れ・台帳に無い id を止める', () => {
  const rows = [{ id: 'a.x', writer: ['human'] }, { id: 'a.y' }, { id: 'a.z' }];
  assert.deepEqual(writerBaselineProblems(rows, ['a.y', 'a.z']), { problems: [], missing: ['a.y', 'a.z'] });
  assert.match(writerBaselineProblems(rows, ['a.y']).problems.join('\n'), /a\.z: 書き手が無い/);
  assert.match(writerBaselineProblems(rows, ['a.x', 'a.y', 'a.z']).problems.join('\n'), /a\.x は書き手を書いたので/);
  assert.match(writerBaselineProblems(rows, ['a.y', 'a.z', 'a.gone']).problems.join('\n'), /a\.gone は台帳に無い/);
});

test('台帳: 書き手の宣言はすべて台帳の id を指し、未記入は基準線とちょうど一致する', () => {
  const ids = new Set(DATASETS.map((x) => x.id));
  for (const id of Object.keys(WRITERS)) assert.ok(ids.has(id), `${id} が台帳に無い`);
  const baseline = JSON.parse(readFileSync(join(REPO_ROOT, '.claude/config/dataset-writer-baseline.json'), 'utf8')).missing;
  const { problems, missing } = writerBaselineProblems(DATASETS, baseline);
  assert.deepEqual(problems, []);
  assert.equal(DATASETS.length - missing.length, Object.keys(WRITERS).length, '記入済みの数は宣言の数');
  assert.ok(Object.keys(WRITERS).length >= 100, '検査ゼロを通さない（宣言が読めていない）');
});

test('writerDeclOf・datasetsWrittenByAutomation: 宣言を台帳の行に合成し、定期実行から書く先を逆引きする', () => {
  assert.deepEqual(writerDeclOf('config.exam-calendar'), { writer: ['human'] });
  assert.ok(writerDeclOf('business.experiments').writerNote);
  assert.deepEqual(writerDeclOf('no.such'), {});
  assert.ok(DATASETS.find((x) => x.id === 'config.products').writer.includes('script:product'));
  const written = datasetsWrittenByAutomation(DATASETS, 'weekly-review');
  assert.ok(written.includes('note.sales') && written.includes('state.weekly-collect'));
  assert.deepEqual(datasetsWrittenByAutomation(DATASETS, 'no-such'), []);
});
