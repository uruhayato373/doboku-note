import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { joinLongformPlan, loadLongformPlan, loadPlanAudit } from '../scripts/lib/youtube-longform-plan.mjs';
import { auditLongformPlan, cycleCapacity, inventoryState, mondayOf, slotProblems, summarizeInventory, weekLimit, shortsSlotFill } from '../scripts/lib/youtube-longform-audit.mjs';
import { ConfigChannelAnnualPlan } from '../scripts/lib/dataset-schemas-content.mjs';
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
  const p = readDataset(root, 'config.channel-annual-plan');
  assert.equal(ConfigChannelAnnualPlan.safeParse(p).success, true);
  assert.equal(ConfigChannelAnnualPlan.safeParse({ ...p, entries: [{ ...p.entries[0], ready: p.entries[0].target }] }).success, false);
  assert.equal(ConfigChannelAnnualPlan.safeParse({ ...p, entries: [p.entries[0], p.entries[0]] }).success, false);
  assert.equal(ConfigChannelAnnualPlan.safeParse({ ...p, examDates: {} }).success, false);
});
test('実台帳の通常動画を全件表示し、活動中の動画に未配分を残さない。期間は年間台帳から取得', () => {
  const b = loadLongformPlan(root, '2026-10-11');
  assert.ok(b.inventory >= 20);
  assert.equal(new Set(b.rows.filter((r) => r.publicationId).map((r) => r.publicationId)).size, b.inventory);
  // 停止した公開も履歴として表示するが、次の制作日を決める対象にはしない。
  assert.equal(b.rows.filter((r) => r.action === 'unplanned' && r.status !== 'stopped').length, 0);
  for (const r of b.rows.filter((r) => r.action === 'unplanned' && r.status === 'stopped')) {
    assert.equal(r.actual, null);
    assert.match(r.warning, /保留/);
  }
  assert.deepEqual(b.period, readDataset(root, 'config.annual-roadmap').period);
  console.log(`通常動画: 対象 ${b.inventory} / 照合 ${new Set(b.rows.filter((r) => r.publicationId).map((r) => r.publicationId)).size}`);
});

const cycle = { window: { from: '2026-11', to: '2027-10' }, enforceFrom: '2026-11-16', reviewAt: '2027-02-05', weeklyMax: 2, peakWeeklyMax: 3, peaks: [{ window: { from: '2026-12', to: '2026-12' }, why: '山場' }] };
const reason = { reader: '読者', harm: 'A', value: '価値', demand: '未検証', evidence: ['docs/x.md:1'], next: '次' };
const slot = { id: 's', exam: 'q', format: 'f', title: '枠', role: 'attract', window: { from: '2026-11', to: '2026-12' }, anchors: ['first'], primaryCta: { kind: 'note-magazine', targets: ['t'] }, count: 1, reuse: 'new', reuseNote: '新規', reason };
const row = { id: 'a', exam: 'q', action: 'new', title: '企画', slot: 's', start: '2026-11-17', ready: '2026-11-18', target: '2026-11-20', priority: 'P1', note: 'メモ' };
const input = (over = {}) => ({
  plan: { cycle, slots: [slot], entries: [row] }, publications: [], revisions: [],
  formats: [{ id: 'f', status: 'active', ctaKinds: ['note-magazine'], decision: null }],
  calendar: { exams: { q: { events: { first: { date: '2026-07-05', kind: 'exam' } } } } },
  exists: () => true, hasTarget: () => true, ...over,
});
const audit = (over, today = '2026-11-16') => auditLongformPlan(input(over), today);

test('計画どおりなら違反 0 件で、対象数と実検査数を返す', () => {
  const r = audit();
  assert.deepEqual([r.errors, r.targets, r.checked, r.planned], [[], 1, 1, 1]);
  assert.equal(r.capacity, cycleCapacity(cycle));
});
test('計画にない動画を止める。上限を数え始める前の公開は既存の資産として通す', () => {
  const stray = { id: 'q/x/youtube.longform', exam: 'q', status: 'scheduled', publishAt: '2026-11-20T11:30:00Z' };
  assert.match(audit({ publications: [stray] }).errors.join(), /計画にない動画/);
  const old = { ...stray, status: 'published', platform: { publishedAt: '2026-11-03T11:30:00Z' } };
  assert.deepEqual(audit({ publications: [old] }).errors, []);
  assert.equal(audit({ publications: [{ ...stray, status: 'stopped' }] }).errors.length, 0);
});
test('枠の本数の超過・枠なしの行・時期の外・資格違いを止める', () => {
  const plan = (entries, slots = [slot]) => ({ plan: { cycle, slots, entries } });
  assert.match(audit(plan([row, { ...row, id: 'b', target: '2026-11-27', ready: '2026-11-26' }])).errors.join(), /枠の超過: s 2 本/);
  assert.match(audit(plan([{ ...row, slot: undefined }])).errors.join(), /枠に入っていない/);
  assert.match(audit(plan([{ ...row, target: '2027-03-02', ready: '2027-03-01' }])).errors.join(), /枠の時期の外/);
  assert.match(audit(plan([{ ...row, exam: 'other' }])).errors.join(), /枠と資格が違う/);
});
test('週の上限は改訂版も数え、山場の週だけ増やす', () => {
  const bigSlot = { ...slot, count: 9 };
  const week = (days) => days.map((d, i) => ({ ...row, id: `r${i}`, start: '2026-11-16', ready: '2026-11-16', target: d }));
  assert.match(audit({ plan: { cycle, slots: [bigSlot], entries: week(['2026-11-17', '2026-11-19', '2026-11-20']) } }).errors.join(), /週の上限の超過: 2026-11-16 の週 3 本/);
  assert.deepEqual(audit({ plan: { cycle, slots: [bigSlot], entries: week(['2026-12-08', '2026-12-09', '2026-12-10']) } }).errors, []);
  const base = { id: 'q/y/youtube.longform', exam: 'q', status: 'published', platform: { publishedAt: '2026-10-10T11:00:00Z' } };
  const revision = { id: `${base.id}.v2`, revisionOf: base.id, exam: 'q', status: 'scheduled', publishAt: '2026-11-18T11:30:00Z' };
  const old = { ...row, id: 'old', publicationId: base.id, slot: undefined, start: '2026-10-01', ready: '2026-10-02', target: '2026-10-03' };
  assert.match(audit({ publications: [base], revisions: [revision], plan: { cycle, slots: [bigSlot], entries: [old, ...week(['2026-11-17', '2026-11-20'])] } }).errors.join(), /週の上限の超過/);
  assert.match(audit({ publications: [base], revisions: [revision], plan: { cycle, slots: [slot], entries: [row] } }).errors.join(), /計画にない改訂版/);
  assert.equal(mondayOf('2026-11-22'), '2026-11-16');
  assert.equal(weekLimit(cycle, '2026-11-30'), 2);
  assert.equal(weekLimit(cycle, '2026-12-07'), 3);
});
test('枠の参照切れを止め、未採用の型は違反でなく採否待ちに出す', () => {
  assert.match(audit({ formats: [] }).errors.join(), /型が無い/);
  assert.match(audit({ formats: [{ id: 'f', status: 'rejected', ctaKinds: [], decision: null }] }).errors.join(), /やらないと決めた型/);
  assert.match(audit({ formats: [{ id: 'f', status: 'active', ctaKinds: ['links-hub'], decision: null }] }).errors.join(), /取らない主 CTA/);
  assert.match(audit({ hasTarget: () => false }).errors.join(), /主 CTA の宛先が無い/);
  assert.match(audit({ exists: () => false }).errors.join(), /根拠の文書が無い/);
  assert.match(audit({ calendar: { exams: { q: { events: {} } } } }).errors.join(), /試験日程に無い行事/);
  const r = audit({ formats: [{ id: 'f', status: 'proposed', ctaKinds: ['note-magazine'], decision: 'DN-0600' }] });
  assert.deepEqual(r.errors, []);
  assert.match(r.pending[0], /DN-0600/);
});
test('見直し日を過ぎたら要対応に出す。壁時計では違反にしない', () => {
  const r = audit({}, '2027-02-06');
  assert.deepEqual(r.errors, []);
  assert.ok(r.warnings.some((w) => /見直し日/.test(w)));
});
test('棚卸しは実体が消えた停止行を公開に数えず、未制作の企画も数える', () => {
  assert.equal(inventoryState({ status: 'stopped', platform: { privacy: 'public' } }), 'stopped');
  assert.equal(inventoryState({ status: 'qa_passed', media: { video: 'v' } }), 'stock');
  assert.equal(inventoryState({ status: 'qa_passed', media: {} }), 'unbuilt');
  const t = summarizeInventory([{ exam: 'q', intent: 'howto', status: 'published' }], [{ exam: 'q', action: 'new', title: '企画' }]);
  assert.deepEqual(t.map((r) => [r.type, r.published, r.unbuilt]), [['howto', 1, 0], ['企画のみ', 0, 1]]);
});
test('関門の判定: 計画にない動画と時期の外を返し、改訂版と上限の開始前は通す', () => {
  const plan = { cycle, slots: [slot], entries: [{ ...row, publicationId: 'p' }, { ...row, id: 'old', slot: undefined, publicationId: 'o', target: '2026-11-01' }] };
  assert.deepEqual(slotProblems(plan, { id: 'p' }).problems, []);
  assert.match(slotProblems(plan, { id: 'p' }, '2027-05-01').problems[0], /枠の時期の外/);
  assert.match(slotProblems(plan, { id: 'none' }).problems[0], /計画にない動画/);
  assert.deepEqual(slotProblems(plan, { id: 'p.v2', revisionOf: 'p' }).problems, []);
  assert.deepEqual(slotProblems(plan, { id: 'o' }).problems, []);
});
test('実際の計画と台帳で違反 0 件。成功指標に登録者数を入れず、2027 年度の試験日を写さない', () => {
  const { plan, audit: r, inventory } = loadPlanAudit(root, '2026-11-06');
  assert.ok((plan.cycle.rebuildUntil || r.targets > 0) && r.checked === r.targets, `対象 ${r.targets} / 照合 ${r.checked}`);
  assert.deepEqual(r.errors, []);
  assert.ok(inventory.length > 0);
  assert.ok(plan.metrics.notSuccess.includes('登録者数'));
  assert.deepEqual(plan.metrics.primary, ['youtubeCampaignClicks', 'averageViewPercentage']);
  assert.ok(plan.cycle.reviewAt > plan.updatedAt);
  for (const s of plan.slots) for (const k of ['reader', 'harm', 'value', 'demand', 'next']) assert.ok(s.reason[k]);
  assert.doesNotMatch(JSON.stringify(plan.slots), /2027-\d{2}-\d{2}/);
  console.log(`年間の枠: 対象 ${r.targets} / 照合 ${r.checked} / 枠 ${r.slots} / 本数 ${r.planned} / 週の上限の合計 ${r.capacity}`);
});

test('ショートは親の枠の上限まで。枠の無い親からは作らない', () => {
  const plan = {
    slots: [{ id: 'a', shorts: { count: 1 } }, { id: 'b' }],
    entries: [
      { publicationId: 'x/one/youtube.longform', slot: 'a', action: 'finish' },
      { publicationId: 'x/two/youtube.longform', slot: 'b', action: 'finish' },
    ],
  };
  assert.deepEqual(shortsSlotFill(plan, [{ pack: 'x/one', key: 'k1' }]), { fill: { a: 1 }, errors: [], warnings: [] });
  assert.match(shortsSlotFill(plan, [{ pack: 'x/one', key: 'k1' }, { pack: 'x/one', key: 'k2' }]).errors.join(), /枠の超過/);
  assert.match(shortsSlotFill(plan, [{ pack: 'x/two', key: 'k1' }]).errors.join(), /割り当てが無い/);
  assert.match(shortsSlotFill(plan, [{ pack: 'x/none', key: 'k1' }]).errors.join(), /割り当てが無い/);
  const stocked = shortsSlotFill(plan, [{ pack: 'x/two', key: 'k1', stocked: true }]);
  assert.deepEqual(stocked.errors, []);
  assert.match(stocked.warnings.join(), /割り当てが無い/);
});
