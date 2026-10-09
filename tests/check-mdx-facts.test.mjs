import test from 'node:test';
import assert from 'node:assert/strict';
import { compareFacts } from '../scripts/check-mdx-facts.mjs';

const fm = (date) => `---\ntitle: t\ndateModified: ${date}\n---\n`;

test('表を箇条書きにしても数値と「」の語が同じなら減少 0（全角数字・frontmatter の日付は差にしない）', () => {
  const before = fm('2026-09-13') + '| 区分 | 基準 |\n|---|---|\n| 騒音 | 85dB |\n| 振動 | 75dB |\n\n「流域治水」を進める。令和４年に改定。\n';
  const after = fm('2026-10-06') + '- **騒音**: 85dB\n- **振動**: 75dB\n\n「流域治水」を進める。令和4年に改定。\n';
  const r = compareFacts(before, after);
  assert.deepEqual(r.lostNumbers, []);
  assert.deepEqual(r.lostQuoted, []);
});

test('数値や「」の語が消えたら減少として返す', () => {
  const r = compareFacts('騒音は85dB、振動は75dB。「第5次社会資本整備重点計画」による。', '騒音は85dB。社会資本整備重点計画による。');
  assert.deepEqual(r.lostNumbers.map((x) => x.token).sort(), ['5', '75']);
  assert.deepEqual(r.lostQuoted.map((x) => x.token), ['第5次社会資本整備重点計画']);
});

test('増えたものは減少に数えない（見出し語の繰り返し・接続語）', () => {
  const r = compareFacts('2050年の目標。', '2050年の目標。あわせて2050年に向け「GX」を進める。');
  assert.deepEqual(r.lostNumbers, []);
  assert.deepEqual(r.gainedNumbers, [{ token: '2050', before: 1, after: 2 }]);
  assert.deepEqual(r.gainedQuoted, [{ token: 'GX', before: 0, after: 1 }]);
});
