// CTA の試験日は試験日程（config/exam-calendar.json）から作り、試験の翌日からは日付を出さない（DN-0795）。
// 以前は offsite-cta に「10/4の本試験前に」、hub-cta に技術士試験の Date.UTC(2026, 6, 19) が直書きで、試験後も残っていた。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadTsModule } from './lib/load-ts.mjs';

const dates = await loadTsModule('src/lib/exam-dates.ts');
const calendar = JSON.parse(readFileSync('config/exam-calendar.json', 'utf8'));
const day = calendar.exams['civil-construction-1'].events.second.date;
const [, m, d] = day.split('-').map(Number);
const at = (iso) => Date.parse(iso);

test('試験の前日と当日は日付入り、翌日は日付なし', () => {
  const prev = new Date(Date.parse(`${day}T12:00:00+09:00`) - 24 * 3600 * 1000).toISOString();
  assert.equal(dates.beforeExamCatch('civil-construction-1', 'second', '答案を見てほしい方へ。', at(prev)), `${m}/${d}の本試験前に、答案を見てほしい方へ。`);
  assert.equal(dates.beforeExamCatch('civil-construction-1', 'second', '答案を見てほしい方へ。', at(`${day}T23:00:00+09:00`)), `${m}/${d}の本試験前に、答案を見てほしい方へ。`);
  const next = new Date(Date.parse(`${day}T23:59:59+09:00`) + 1000).toISOString();
  assert.equal(dates.beforeExamCatch('civil-construction-1', 'second', '答案を見てほしい方へ。', at(next)), '答案を見てほしい方へ。');
});

test('試験日程に無い行事は投げる（黙って日付なしにしない）', () => {
  assert.throws(() => dates.examDayEndUtcMs('civil-construction-1', 'no-such-event'), /日付が無い/);
});

test('offsite-cta と hub-cta に日付のリテラルが無い', () => {
  for (const p of ['src/lib/offsite-cta.ts', 'src/lib/hub-cta.ts']) {
    const src = readFileSync(p, 'utf8').replace(/^\s*(\/\/|\*).*$/gm, '');
    assert.doesNotMatch(src, /Date\.UTC\(/, `${p} に Date.UTC の直書き`);
    assert.doesNotMatch(src, /\d{1,2}\/\d{1,2}の本試験/, `${p} に試験日の直書き`);
  }
});
