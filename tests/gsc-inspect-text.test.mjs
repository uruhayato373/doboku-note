import test from 'node:test';
import assert from 'node:assert/strict';
import { showsTargetUrl } from '../scripts/lib/gsc-inspect-text.mjs';

const T = 'https://doboku-note.com/exam/pe-construction/past-exams/r08-road-ii-2';

test('対象の URL が行として出ていれば一致', () => {
  assert.equal(showsTargetUrl(`キャンセル\n${T}\nURL 検査`, T), true);
  assert.equal(showsTargetUrl(T, T), true);
});

test('前方一致の別の URL（直前の検査の結果）は一致にしない', () => {
  assert.equal(showsTargetUrl(`キャンセル\n${T}-1\nURL 検査`, T), false);
  assert.equal(showsTargetUrl(`${T}/\n`, T), false);
});

test('別の URL の後ろに対象があれば一致', () => {
  assert.equal(showsTargetUrl(`${T}-1\n${T}\n`, T), true);
});

test('URL が無ければ不一致', () => {
  assert.equal(showsTargetUrl('URL が Google に登録されていません', T), false);
});
