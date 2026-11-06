import test from 'node:test';
import assert from 'node:assert/strict';
import { auditPlanStances, auditPositions, loadCompetitorPositionsAudit, marketItems, prominentRivals, rivalFacts, runProbe, slotMaterials } from '../scripts/lib/competitor-positions.mjs';
import { ConfigCompetitorPositions } from '../scripts/lib/dataset-schemas-config-business.mjs';
import { REPO_ROOT as root } from '../scripts/lib/repository-paths.mjs';

const scan = {
  density: { youtube: { strongViews: 10000 } },
  queries: { rccm: { keywords: ['RCCM 試験'], probeKeywords: ['RCCM 論文'], titleMatch: 'RCCM' } },
};
const market = {
  youtube: {
    'RCCM 試験': { items: [
      { videoId: 'a', title: 'RCCM 問題Ⅲ 解説', channel: '響屋', channelId: 'UC1', views: 20000 },
      { videoId: 'b', title: '臨床心理士の勉強法', channel: '別', channelId: 'UC2', views: 900000 },
    ] },
    'RCCM 論文': { items: [{ videoId: 'a', title: 'RCCM 問題Ⅲ 解説', channel: '響屋', channelId: 'UC1', views: 20000 }] },
  },
  note: { 'RCCM 試験': { items: [
    { key: 'k1', title: 'RCCM 回答例', creator: 'rccm', price: 980 },
    { key: 'k2', title: 'RCCM 回答例 2', creator: 'rccm', price: 1980 },
    { key: 'k2b', title: 'RCCM 回答例 3', creator: 'rccm', price: 1980 },
    { key: 'k3', title: 'RCCM 自社', creator: 'dobokunote', price: 980 },
    { key: 'k4', title: 'RCCM 自社 2', creator: 'dobokunote', price: 980 },
  ] } },
};
const self = { youtube: ['UCself'], note: ['dobokunote'] };
const position = (over = {}) => ({
  id: 'p', exams: ['rccm'], reviewedOn: '2026-11-06', read: ['a.md'], summary: '要約',
  rivals: [{ channel: 'youtube', handle: 'UC1', holds: '過去問' }, { channel: 'note', handle: 'rccm', holds: '回答例' }],
  dismissed: [], avoid: [], limits: ['上位だけ'],
  stances: [{ id: 'a1', stage: '学習', text: '論文', why: '理由', state: 'seen', channels: ['youtube'], evidence: ['a.md'], probes: [] }],
  ...over,
});
const tracked = { youtube: { competitors: [{ handle: 'UC1', exams: ['rccm'] }] }, note: { competitors: [{ handle: 'rccm', exams: ['rccm'] }] } };
const slot = (over = {}) => ({ id: 's', exam: 'rccm', format: 'compilation', stance: 'a1', ...over });
const plan = (slots = [slot()]) => ({ slots, channels: { x: { slots: [] }, instagram: { slots: [] } } });
const snapshots = { youtube: { date: '2026-11-06', data: { competitors: [{ handle: 'UC1', profile: { subscriberCount: 1200 }, counts: { medianViews: 300 }, platformExtra: { lengthBuckets: [] } }] } }, note: { date: '2026-11-06', data: { competitors: [{ handle: 'rccm', counts: { magazinesPaid: 2 }, price: { median: 1000 }, cadence: { latestDaysAgo: 1 }, profile: {} }] } } };
const audit = (p, extra = {}) => auditPositions({ ledger: { self, positions: [p] }, tracked, market, scan, snapshots, plan: plan(), exists: () => true, ...extra });

test('検索語の結果を資格の題名で絞り、同じ動画を重ねて数えない', () => {
  assert.deepEqual(marketItems('rccm', 'youtube', market, scan).map((i) => i.videoId), ['a']);
});
test('目立つ相手を拾い、自社と別の資格を除く', () => {
  assert.deepEqual(prominentRivals(['rccm'], market, scan, self).map((r) => r.handle), ['UC1', 'rccm']);
});
test('検索が 0 件の確認は成立しない', () => {
  const r = runProbe({ exam: 'surveyor', channel: 'youtube', match: 'x', max: 0 }, market, scan);
  assert.equal(r.checked, 0);
  assert.equal(r.ok, false);
});
test('正しい立ち位置は通る', () => {
  assert.deepEqual(audit(position()).errors, []);
});
test('市場で目立つ相手の見落としを止める', () => {
  const p = position({ rivals: [{ channel: 'youtube', handle: 'UC1', holds: '過去問' }] });
  assert.ok(audit(p).errors.some((e) => /分析していない/.test(e)));
  assert.deepEqual(audit({ ...p, dismissed: [{ channel: 'note', handle: 'rccm', label: 'rccm', why: '別の読者' }] }).errors, []);
});
test('文章への観測値の写しを止める', () => {
  assert.ok(audit(position({ summary: '登録者 6.3 万人が強い' })).errors.some((e) => /観測値/.test(e)));
  assert.deepEqual(audit(position({ summary: '15〜30 分の動画が伸びる' })).errors, []);
});
test('空きの主張には検索の確認が要る', () => {
  const stance = { id: 'a1', stage: '学習', text: '論文の動画が空いている', why: '理由', state: 'seen', channels: ['youtube'], evidence: ['a.md'], probes: [] };
  assert.ok(audit(position({ stances: [stance] })).errors.some((e) => /probes/.test(e)));
  assert.deepEqual(audit(position({ stances: [{ ...stance, state: 'untested' }] })).errors, []);
});
test('確認が崩れたら止まる', () => {
  const probe = { claim: '論文の動画が無い', exam: 'rccm', channel: 'youtube', match: '問題Ⅲ', max: 0 };
  const a = audit(position({ stances: [{ id: 'a1', stage: '学習', text: '論文', why: '理由', state: 'seen', channels: ['youtube'], evidence: [], probes: [probe] }] }));
  assert.ok(a.errors.some((e) => /主張が崩れた/.test(e)));
});
test('読み元の取得が新しいと読み直しを促す', () => {
  assert.ok(audit(position({ reviewedOn: '2026-11-01' })).pending.some((e) => /読み直/.test(e)));
});
test('取得失敗を 0 にしない', () => {
  const failed = { x: { date: '2026-08-13', data: { competitors: [{ handle: 'h', profile: null, error: 'not_found' }] } } };
  assert.equal(rivalFacts({ channel: 'x', handle: 'h' }, failed).text, '取得失敗');
  assert.equal(rivalFacts({ channel: 'youtube', handle: 'none' }, {}).text, '未取得');
});
test('年間の枠の参照切れ・別の資格・対象外のチャネル・勝負しない型を止める', () => {
  const ledger = { positions: [position(), { ...position(), id: 'q', exams: ['surveyor'], stances: [{ id: 'b1', channels: ['x'] }], avoid: [{ text: '年度別', formats: ['yearly'] }] }] };
  assert.deepEqual(auditPlanStances(plan(), ledger).errors, []);
  assert.match(auditPlanStances(plan([slot({ stance: 'none' })]), ledger).errors[0], /台帳に無い/);
  assert.match(auditPlanStances(plan([slot({ stance: 'b1' })]), ledger).errors[0], /立ち位置ではない/);
  assert.match(auditPlanStances(plan([slot({ exam: 'surveyor', stance: 'b1' })]), ledger).errors[0], /対象にしていない/);
  assert.match(auditPlanStances(plan([slot({ exam: 'surveyor', stance: 'b1', format: 'yearly' })]), ledger).errors[0], /勝負しない/);
  assert.match(auditPlanStances(plan([slot({ stance: undefined })]), ledger, { required: true }).errors[0], /stance/);
});
test('枠の理由に空きを断定で書くと止める', () => {
  const ledger = { positions: [position()] };
  assert.match(auditPlanStances(plan([slot({ reason: { demand: '競合の空白がある' } })]), ledger).errors[0], /空きの主張/);
});
test('材料に entries と送り先の写しを持たせない', () => {
  const ledger = { positions: [position()] };
  const materials = { status: 'accepted', packs: ['rccm/a'], products: ['p1'], make: '' };
  const base = plan([slot({ materials, primaryCta: { targets: ['p1'] } })]);
  base.entries = [{ id: 'e', slot: 's', publicationId: 'rccm/a/youtube.longform', action: 'new' }];
  const errors = auditPlanStances(base, ledger).errors;
  assert.ok(errors.some((e) => /entries にある/.test(e)));
  assert.ok(errors.some((e) => /primaryCta にある/.test(e)));
});
test('枠の材料は entries・送り先・materials から束ねる', () => {
  const s = slot({ materials: { status: 'accepted', packs: ['rccm/b'], products: ['p2'], make: '作る' }, primaryCta: { targets: ['p1'] } });
  const m = slotMaterials(s, { entries: [{ id: 'e', slot: 's', publicationId: 'rccm/a/youtube.longform', action: 'new' }] });
  assert.deepEqual(m.planned, [{ id: 'e', title: null, pack: 'rccm/a', action: 'new' }]);
  assert.deepEqual([m.candidates, m.targets, m.products, m.make], [['rccm/b'], ['p1'], ['p2'], '作る']);
});
test('実データの台帳は検査を通り、確認を 0 件で素通りしない', () => {
  const { ledger, audit: real, planAudit } = loadCompetitorPositionsAudit(root);
  ConfigCompetitorPositions.parse(ledger);
  assert.deepEqual(real.errors, []);
  assert.deepEqual(planAudit.errors, []);
  assert.ok(real.probes.length >= 5, `確認 ${real.probes.length} 件`);
  assert.ok(real.probes.every((p) => p.checked > 0));
  const { plan } = loadCompetitorPositionsAudit(root);
  const slots = [...plan.slots, ...plan.channels.x.slots, ...plan.channels.instagram.slots];
  assert.ok(slots.length >= 50 && slots.every((s) => s.materials.status === 'accepted'));
});
