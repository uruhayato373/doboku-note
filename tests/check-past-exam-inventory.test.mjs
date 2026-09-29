import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateInventory } from '../scripts/check-past-exam-inventory.mjs';

const driveCfg = { groups: [
  { id: 'past-exam-source-pdf', status: 'active', match: { pathRegex: '^content/sources/past-exams/[^/]+/[^/]+/[^/]+\\.pdf$' } },
  { id: 'textbook-source-pdf', status: 'active', match: { pathRegex: '^content/sources/textbook/.+\\.pdf$' } },
] };
const formats = { exams: { surveyor: {} } };
const DIR = 'content/sources/past-exams/測量士';
const calendar = { exams: { surveyor: { year: 2026, events: { apply: { date: '2026-01-05', kind: 'application' }, exam: { date: '2026-05-17', kind: 'exam' } } } } };
const file = (name, acquiredAt = null) => ({ kind: 'question', section: '午前', file: name, sourceUrl: 'https://example.jp/a.pdf', acquiredAt });
const inv = (years, extra = {}) => ({ exams: { surveyor: { dir: DIR, official: { windowYears: 5, publishLagDays: 60 }, years, ...extra } } });
const run = (inventory, opts = {}) => evaluateInventory({
  inventory, formats, calendar, driveCfg, manifest: { entries: {} }, today: new Date('2026-09-29T00:00:00+09:00'), fileExists: () => false, ...opts,
});

test('Drive 台帳に載った取得済みファイルは OK として数える', () => {
  const r = run(inv([{ year: 2026, official: 'listed', files: [file('R08/a.pdf', '2026-09-29')] }]), {
    manifest: { entries: { [`${DIR}/R08/a.pdf`]: { group: 'past-exam-source-pdf' } } },
  });
  assert.deepEqual(r.fails, []);
  assert.deepEqual(r.warns, []);
  assert.equal(r.stats.inDrive, 1);
});

test('台帳に無い資格 id と Drive に当たらないパスは FAIL', () => {
  const bad = { exams: { unknown: { dir: 'content/sources/textbook/測量士/過去問', years: [{ year: 2026, official: 'listed', files: [file('a.pdf')] }] } } };
  const r = run(bad);
  assert.ok(r.fails.some(f => f.includes('exam-formats.json に無い')));
  assert.ok(r.fails.some(f => f.includes('dir は')));
  assert.ok(r.fails.some(f => f.includes('当たらないパス')));
});

test('取得済みで手元にだけある＝WARN、どこにも無い＝FAIL、CI は手元を見ず WARN', () => {
  const i = inv([{ year: 2026, official: 'listed', files: [file('R08/a.pdf', '2026-09-29')] }]);
  assert.equal(run(i, { fileExists: () => true }).warns.length, 1);
  assert.equal(run(i).fails.length, 1);
  const ci = run(i, { fileExists: null });
  assert.equal(ci.fails.length, 0);
  assert.equal(ci.stats.localChecked, 0);
  assert.ok(ci.warns[0].includes('CI'));
});

test('掲載中の未取得は WARN し、最古の年度に「消える見込み」を付ける', () => {
  const r = run(inv([
    { year: 2026, official: 'listed', files: [file('R08/a.pdf')] },
    { year: 2022, official: 'listed', files: [file('R04/a.pdf')] },
    { year: 2020, official: 'never', files: [] },
  ]));
  assert.equal(r.fails.length, 0);
  assert.equal(r.warns.filter(w => w.includes('消える見込み')).length, 1);
  assert.ok(r.warns.find(w => w.includes('消える見込み')).includes('2022'));
});

test('試験日＋掲載までの日数を過ぎて今年度の行が無ければ WARN、日数が未確認なら黙る', () => {
  const years = [{ year: 2025, official: 'listed', files: [] }];
  assert.ok(run(inv(years)).warns.some(w => w.includes('2026 年度の試験')));
  assert.ok(!run(inv(years, { official: { windowYears: 5, publishLagDays: null } })).warns.some(w => w.includes('2026 年度の試験')));
  assert.ok(!run(inv(years), { today: new Date('2026-06-01T00:00:00+09:00') }).warns.some(w => w.includes('2026 年度の試験')));
});

test('year の重複と official の語彙外は FAIL', () => {
  const r = run(inv([{ year: 2026, official: 'listed', files: [] }, { year: 2026, official: 'maybe', files: [] }]));
  assert.ok(r.fails.some(f => f.includes('重複')));
  assert.ok(r.fails.some(f => f.includes('official は')));
});

test('正答だけの年度は今年度の行として数えず、公式以外の種類は FAIL', () => {
  const years = [{ year: 2026, official: 'unknown', files: [{ ...file('R08/a.pdf', '2026-09-29'), kind: 'answer' }] }];
  const r = run(inv(years), { fileExists: () => true });
  assert.ok(r.warns.some(w => w.includes('2026 年度の試験')));
  assert.equal(r.fails.length, 0);
  const bad = run(inv([{ year: 2026, official: 'listed', files: [{ ...file('R08/b.pdf'), kind: 'commentary' }] }]));
  assert.ok(bad.fails.some(f => f.includes('kind は')));
});
