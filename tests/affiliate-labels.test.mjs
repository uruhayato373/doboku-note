import test from 'node:test';
import assert from 'node:assert/strict';
import { labelProgramMap, readLabelProgramMap } from '../scripts/lib/affiliate-labels.mjs';

test('labelProgramMap: catalog の ctaLabels からラベル → 案件を引く', () => {
  const map = labelProgramMap({ programs: { buildjob: { ctaLabels: ['BuildJob-endbanner', 'ビルドジョブ'] }, coconala: {} } });
  assert.equal(map.get('BuildJob-endbanner'), 'buildjob');
  assert.equal(map.get('ビルドジョブ'), 'buildjob');
  assert.equal(map.size, 2, 'ctaLabels の無い案件は何も足さない');
});

test('labelProgramMap: 同じラベルが 2 案件にあれば投げる（どちらに数えるか決められない）', () => {
  assert.throws(() => labelProgramMap({ programs: { a: { ctaLabels: ['X'] }, b: { ctaLabels: ['X'] } } }), /X/);
});

test('readLabelProgramMap: 今の catalog で、EPC レポートが使う主なラベルが解決できる', () => {
  const map = readLabelProgramMap(process.cwd());
  for (const [label, program] of [
    ['BuildJob-endbanner', 'buildjob'],
    ['ビルドジョブ', 'buildjob'],
    ['DXConsulting-sidebar', 'dx-consulting'],
    ['ハイクラス DX・コンサル転職', 'dx-consulting'],
    ['建設JOBs', 'kensetsu-jobs'],
    ['GKSキャリア', 'gks'],
  ]) {
    assert.equal(map.get(label), program, label);
  }
});
