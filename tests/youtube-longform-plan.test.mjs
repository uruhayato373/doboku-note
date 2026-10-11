import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { joinLongformPlan, loadLongformPlan } from '../scripts/lib/youtube-longform-plan.mjs';
import { ConfigYoutubeLongformPlan } from '../scripts/lib/dataset-schemas-content.mjs';
import { readDataset } from '../scripts/lib/dataset-io.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const period = { start: '2026-10', end: '2027-09' };
const pub = { id: 'q/work/youtube.longform', exam: 'q', work: 'work', title: '動画', status: 'qa_passed' };
const entry = { id: 'finish', exam: 'q', publicationId: pub.id, action: 'finish', priority: 'P1', start: '2026-10-12', ready: '2026-10-20', target: '2026-10-23', note: '図を確認' };

test('公開目標は予約にならず、台帳の予約と公開実績を優先する（JST）', () => {
  const plan = { entries: [entry] };
  const original = structuredClone(plan);
  assert.equal(joinLongformPlan(plan, [pub], period).rows[0].actual, null);
  const scheduled = { ...pub, status: 'scheduled', publishAt: '2026-10-25T23:00:00Z' };
  const row = joinLongformPlan(plan, [scheduled], period).rows[0];
  assert.equal(row.date, '2026-10-26');
  assert.equal(row.target, '2026-10-23');
  const published = { ...scheduled, status: 'published', platform: { publishedAt: '2026-10-26T23:00:00Z' } };
  assert.equal(joinLongformPlan(plan, [published], period).rows[0].date, '2026-10-27');
  assert.deepEqual(plan, original);
});
test('公開IDの参照切れ・資格混同・重複制作は失敗する', () => {
  assert.throws(() => joinLongformPlan({ entries: [entry] }, [], period), /参照不整合/);
  assert.throws(() => joinLongformPlan({ entries: [{ ...entry, exam: 'other' }] }, [pub], period), /参照不整合/);
  assert.throws(() => joinLongformPlan({ entries: [entry, { ...entry, id: 'duplicate' }] }, [pub], period), /重複/);
});
test('再案内は公開日を上書きせず、元動画の公開前は保留する', () => {
  const reuse = { ...entry, action: 'reuse', target: '2027-04-09' };
  const b = joinLongformPlan({ entries: [reuse] }, [{ ...pub, status: 'scheduled', publishAt: '2026-10-25T11:00:00Z' }], period);
  assert.equal(b.rows.find((r) => r.action === 'reuse').date, '2027-04-09');
  assert.match(b.rows.find((r) => r.action === 'reuse').warning, /未公開/);
  assert.equal(b.rows.find((r) => r.action === 'scheduled').date, '2026-10-25');
});
test('停止・失敗を公開準備完了として扱わず、未配分の動画も隠さない', () => {
  for (const status of ['stopped', 'failed', 'qa_blocked']) assert.match(joinLongformPlan({ entries: [entry] }, [{ ...pub, status }], period).rows[0].warning, /保留/);
  assert.equal(joinLongformPlan({ entries: [] }, [pub], period).rows[0].action, 'unplanned');
});
test('締切逆転・同じ企画ID・試験日の複製を型で拒否する', () => {
  const p = readDataset(root, 'config.youtube-longform-plan');
  assert.equal(ConfigYoutubeLongformPlan.safeParse(p).success, true);
  assert.equal(ConfigYoutubeLongformPlan.safeParse({ ...p, entries: [{ ...p.entries[0], ready: p.entries[0].target }] }).success, false);
  assert.equal(ConfigYoutubeLongformPlan.safeParse({ ...p, entries: [p.entries[0], p.entries[0]] }).success, false);
  assert.equal(ConfigYoutubeLongformPlan.safeParse({ ...p, examDates: {} }).success, false);
});
test('実台帳の通常動画を全件表示し、45本の未配分をなくす。期間は年間台帳から取得', () => {
  const b = loadLongformPlan(root, '2026-10-11');
  assert.ok(b.inventory >= 157);
  assert.equal(new Set(b.rows.filter((r) => r.publicationId).map((r) => r.publicationId)).size, b.inventory);
  assert.equal(b.rows.filter((r) => r.action === 'unplanned').length, 0);
  assert.deepEqual(b.period, readDataset(root, 'config.annual-roadmap').period);
  for (const slug of ['r8-yosou-theme', 'r8-yosou-dashikata']) {
    const r = b.rows.find((r) => r.publicationId?.includes(`/${slug}/`));
    assert.equal(r.action, 'revise');
    assert.match(r.note, /R9/);
  }
  console.log(`通常動画: 対象 ${b.inventory} / 照合 ${new Set(b.rows.filter((r) => r.publicationId).map((r) => r.publicationId)).size}`);
});
