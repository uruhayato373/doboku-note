import test from 'node:test';
import assert from 'node:assert/strict';
import { auditChannel, igPostsOf, igSlotProblems, tweetsOutsidePlan, xPostsOf } from '../scripts/lib/channel-plan-audit.mjs';
import { loadChannelPlan, loadChannelPlanAudit } from '../scripts/lib/channel-plan.mjs';
import { ConfigChannelAnnualPlan } from '../scripts/lib/dataset-schemas-content.mjs';
import { readDataset } from '../scripts/lib/dataset-io.mjs';
import { REPO_ROOT as root } from '../scripts/lib/repository-paths.mjs';

const reason = { reader: '読者', harm: 'A', value: '価値', demand: '未検証', evidence: ['a.md:1'], next: '次' };
const slot = (over = {}) => ({ id: 's1', exam: 'civil-construction-1', formats: ['quiz', 'sell'], title: '枠', role: 'sell', window: { from: '2027-01', to: '2027-02' }, anchors: ['first'], primaryCta: { kind: 'note-magazine', targets: ['m1'] }, count: 3, salesMax: 1, parents: ['y1'], reason, ...over });
const channel = (over = {}) => ({
  label: 'X', role: '役割', operation: { status: 'active', since: '2026-11-06', note: 'n' }, enforceFrom: '2027-01-01', weeklyMax: 2, peakWeeklyMax: 4,
  peaks: [{ window: { from: '2027-02', to: '2027-02' }, why: '山場' }], planRule: 'r',
  metrics: { primary: [], support: [], notSuccess: ['n'], target: 't' },
  formats: [{ id: 'quiz', label: '過去問', status: 'active', role: 'attract', ctaKinds: ['site-article'], types: ['過去問1問1答'], publicationFormat: 'carousel', evidence: [] }, { id: 'sell', label: '教材', status: 'active', role: 'sell', ctaKinds: ['note-magazine'], types: ['教材案内'], evidence: [] }],
  slots: [slot()], ...over,
});
const context = {
  cycle: { window: { from: '2026-11', to: '2027-10' }, reviewAt: '2027-02-05' }, today: '2027-01-01',
  youtubeSlots: [{ id: 'y1', exam: 'civil-construction-1' }],
  calendar: { exams: { 'civil-construction-1': { events: { first: { date: '2026-07-05' } } } } },
  exists: () => true, hasTarget: () => true,
};
const same = (a, b) => a === b;
const post = (over = {}) => ({ date: '2027-01-05', time: '20:00', slot: 's1', exam: 'civil-construction-1', type: '過去問1問1答', funnel: 'linkless', draft: 'd', tweet: 1, ...over });
const audit = (posts, c = channel(), ctx = context) => auditChannel(c, xPostsOf(c, [{ file: 'f', posts }]), ctx, same);

test('正しい投稿は通り、実際に照合した本数を返す', () => {
  const a = audit([post(), post({ date: '2027-01-06', type: '教材案内', funnel: 'note' })]);
  assert.deepEqual(a.errors, []);
  assert.equal(a.checked, 2);
  assert.equal(a.fill.s1, 2);
  assert.equal(a.sales.s1, 1);
});
test('枠の検査を始める前の投稿は数えない', () => {
  assert.equal(audit([post({ date: '2026-12-31', slot: undefined })]).targets, 0);
});
test('計画にない投稿・時期の外・型の外・資格違いを止める', () => {
  assert.match(audit([post({ slot: undefined })]).errors[0], /枠に入っていない/);
  assert.match(audit([post({ slot: 'none' })]).errors[0], /枠が無い/);
  assert.match(audit([post({ date: '2027-03-02' })]).errors[0], /枠の時期の外/);
  assert.match(audit([post({ type: '自由な型' })]).errors[0], /枠の型に無い/);
  assert.match(audit([post({ exam: 'rccm' })]).errors[0], /枠と資格が違う/);
});
test('枠の超過・販売の超過・週の上限超えを止める', () => {
  const days = ['2027-01-11', '2027-01-12', '2027-01-13', '2027-01-14'];
  assert.ok(audit(days.map((date) => post({ date }))).errors.some((e) => e.includes('枠の超過')));
  assert.ok(audit(days.slice(0, 3).map((date) => post({ date }))).errors.some((e) => e.includes('週の上限の超過')));
  assert.ok(audit(['2027-01-05', '2027-01-12'].map((date) => post({ date, type: '教材案内', funnel: 'note' }))).errors.some((e) => e.includes('販売の超過')));
  // 山場の週は上限が上がる
  assert.deepEqual(audit(['2027-02-01', '2027-02-02', '2027-02-03'].map((date) => post({ date }))).errors, []);
});
test('枠の参照切れを止め、保留と未採用の型は判断待ちに出す', () => {
  const bad = channel({ slots: [slot({ parents: ['none'], anchors: ['none'], formats: ['none'] })] });
  const errors = auditChannel(bad, [], context, same).errors.join('\n');
  assert.match(errors, /YouTube の枠が無い/);
  assert.match(errors, /試験日程に無い行事/);
  assert.match(errors, /型が無い/);
  const proposed = channel({ operation: { status: 'hold', since: '2026-10-17', note: 'n' } });
  proposed.formats[1].status = 'proposed';
  const { pending } = auditChannel(proposed, [], context, same);
  assert.equal(pending.length, 2);
  assert.ok(auditChannel(channel({ slots: [slot({ count: 1000, salesMax: 0 })] }), [], context, same).errors.some((e) => e.includes('週の上限の合計')));
});
test('X の予約は枠のある計画の行に結ばれていなければ止まる', () => {
  const c = channel();
  const tweet = (over = {}) => ({ draft: 'd', n: '1', status: 'queued', scheduled_at: '2027-01-05T20:00:00.000+09:00', ...over });
  assert.deepEqual(tweetsOutsidePlan(c, [{ posts: [post()] }], [tweet()]), []);
  assert.equal(tweetsOutsidePlan(c, [{ posts: [post({ slot: undefined })] }], [tweet()]).length, 1);
  assert.equal(tweetsOutsidePlan(c, [], [tweet()]).length, 1);
  assert.deepEqual(tweetsOutsidePlan(c, [], [tweet({ scheduled_at: '2026-12-05T20:00:00.000+09:00' })]), []);
  assert.deepEqual(tweetsOutsidePlan(c, [], [tweet({ status: 'posted' })]), []);
});
test('Instagram は枠に結ばれた作品だけ予約でき、固定投稿は枠の外', () => {
  const c = channel();
  const pub = { id: 'civil-construction-1/w/instagram.carousel', exam: 'civil-construction-1', format: 'carousel', planSlot: 's1' };
  assert.deepEqual(igSlotProblems(c, pub, '2027-01-05T18:00:00.000+09:00'), []);
  assert.match(igSlotProblems(c, { ...pub, planSlot: undefined }, '2027-01-05T18:00:00.000+09:00')[0], /枠に入っていない/);
  assert.match(igSlotProblems(c, pub, '2027-03-05T18:00:00.000+09:00')[0], /枠の時期の外/);
  assert.match(igSlotProblems(c, { ...pub, format: 'reel' }, '2027-01-05T18:00:00.000+09:00')[0], /枠の型に無い/);
  assert.deepEqual(igSlotProblems(c, { ...pub, planSlot: undefined, legacyKey: 'profile-pinned/a' }, '2027-01-05T18:00:00.000+09:00'), []);
  assert.deepEqual(igPostsOf(c, [{ ...pub, legacyKey: 'profile-pinned/a', publishAt: '2027-01-05T18:00:00+09:00' }]), []);
  assert.equal(igPostsOf(c, [{ ...pub, status: 'scheduled', publishAt: '2027-01-05T18:00:00+09:00' }]).length, 1);
});
test('実台帳の枠は違反が無く、YouTube の枠へ結ばれている', () => {
  const { plan, x, instagram } = loadChannelPlanAudit(root, '2026-11-06');
  assert.deepEqual(x.errors, []);
  assert.deepEqual(instagram.errors, []);
  assert.ok(x.slots > 0 && instagram.slots > 0);
  assert.ok(x.planned <= x.capacity && instagram.planned <= instagram.capacity);
  const ids = new Set(plan.slots.map((s) => s.id));
  for (const s of [...plan.channels.x.slots, ...plan.channels.instagram.slots]) for (const id of s.parents) assert.ok(ids.has(id), id);
  assert.equal(loadChannelPlan(root).schemaVersion, 3);
});
test('集客の枠の販売・本数を超える販売の上限を型で拒否する', () => {
  const p = readDataset(root, 'config.channel-annual-plan');
  assert.equal(ConfigChannelAnnualPlan.safeParse(p).success, true);
  const withSlot = (over) => ({ ...p, channels: { ...p.channels, x: { ...p.channels.x, slots: [{ ...p.channels.x.slots[0], ...over }] } } });
  assert.equal(ConfigChannelAnnualPlan.safeParse(withSlot({ role: 'attract', salesMax: 1 })).success, false);
  assert.equal(ConfigChannelAnnualPlan.safeParse(withSlot({ count: 1, salesMax: 2 })).success, false);
});
