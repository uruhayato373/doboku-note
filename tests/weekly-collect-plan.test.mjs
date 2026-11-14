// 土曜の収集の段の表（DN-0817・DN-0819）: 対象の月・期間と、段の合否の決め方
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildStages, commandFailureReason, competitorsDue, judgeRuns, noteAuditDue, noteTrafficMonthDue, NOTE_AUDIT_INTERVAL_DAYS, resumePlan, previousMonth, quarterStart, runPassed, stageStatus, verifyFailureReason } from '../scripts/lib/weekly-collect-plan.mjs';
import { NOTE_PUBLIC_VIEW_LOCAL_DIR } from '../scripts/lib/note-public-view.mjs';

const argvOf = (stages, id) => stages.find((s) => s.id === id).commands.map((c) => c.argv.join(' '));

test('前月は年をまたぐ', () => {
  assert.equal(previousMonth('2026-01'), '2025-12');
  assert.equal(previousMonth('2026-10'), '2026-09');
});

test('A8 は前月と当月を取り、当月を後に回す・normalize は取得が 0 か 2 のときだけ', () => {
  const stages = buildStages({ today: '2026-10-24', kdpMonths: ['2026-10'] });
  const a8 = stages.find((s) => s.id === 'a8');
  assert.deepEqual(a8.commands.filter((c) => c.argv.includes('--month')).map((c) => c.argv[c.argv.indexOf('--month') + 1]), ['2026-09', '2026-10']);
  assert.deepEqual(a8.commands[1].onlyIfPrev, [0, 2]);
});

test('note の売上の前月は 14 日まで取り直し、集計中（exit 8）は成功', () => {
  const early = argvOf(buildStages({ today: '2026-11-03' }), 'note-sales');
  assert.equal(early.length, 2);
  assert.match(early[0], /--month 2026-10/);
  assert.deepEqual(buildStages({ today: '2026-11-03' }).find((s) => s.id === 'note-sales').commands[0].ok, [0, 8]);
  assert.equal(argvOf(buildStages({ today: '2026-11-15' }), 'note-sales').length, 1);
});

test('note のアクセスはレビューと同じ期間（前の完了週）を取る', () => {
  const cmds = argvOf(buildStages({ today: '2026-10-24' }), 'note-traffic');
  assert.match(cmds[1], /--from 2026-10-12 --to 2026-10-18/);
});

test('KDP は取る月が無ければ skip・前と後の段が分かれ、SNS の段は無い', () => {
  const stages = buildStages({ today: '2026-10-24', kdpMonths: [] });
  assert.match(stages.find((s) => s.id === 'kdp').skip, /0 件/);
  assert.deepEqual(stages.filter((s) => s.phase === 'post').map((s) => s.id), ['note-live', 'note-sync', 'note-sync-check']);
  assert.equal(stages.some((s) => /instagram|^x$|ig/.test(s.id)), false);
  // ログインの確認は export も CI の起動もしない
  assert.equal(argvOf(stages, 'auth')[0].includes('--export') || argvOf(stages, 'auth')[0].includes('--dispatch-due'), false);
});

test('段の合否: warn は合格・回さなかったコマンドは数えない・検査不成立の出力は失敗', () => {
  const a8 = buildStages({ today: '2026-10-24' }).find((s) => s.id === 'a8');
  assert.equal(stageStatus(a8, [0, 0, 0, 0]), 'ok');
  assert.equal(stageStatus(a8, [2, 0, 0, 0]), 'warn');
  assert.equal(stageStatus(a8, [3, null, 0, 0]), 'failed');
  const live = buildStages({ today: '2026-10-24' }).find((s) => s.id === 'note-live');
  assert.equal(stageStatus(live, [1, 0], ['添付の欠け 2 件', '']), 'warn');
  assert.equal(stageStatus(live, [1, 0], ['✗ 取得失敗が支配的＝検査不成立', '']), 'failed');
});

test('回の合格: 失敗の段・書き戻しの問題・残った差分のどれか 1 つで不合格', () => {
  const ok = { stages: [{ status: 'ok' }, { status: 'warn' }, { status: 'skipped' }], commit: {}, leftover: [] };
  assert.equal(runPassed(ok), true);
  assert.equal(runPassed({ ...ok, stages: [...ok.stages, { status: 'failed' }] }), false);
  assert.equal(runPassed({ ...ok, commit: { problem: 'push に失敗' } }), false);
  assert.equal(runPassed({ ...ok, leftover: ['data/a8/x.json'] }), false);
});

test('段の失敗の理由は、コマンドが 2 本以上ならどのコマンドが落ちたかを付ける（DN-0833）', () => {
  const [month, period] = buildStages({ today: '2026-10-24' }).find((s) => s.id === 'note-traffic').commands;
  const line = 'note-traffic-fetch: 検査不成立: 記事別 PV の合計とページビュー集計が一致しない';
  const first = commandFailureReason({ argv: month.argv, index: 0, total: 2, line });
  assert.match(first, /^1\/2 本目（note-traffic-fetch -- --commit）: /);
  assert.doesNotMatch(first, /--from/);
  assert.match(commandFailureReason({ argv: period.argv, index: 1, total: 2, line }), /^2\/2 本目（note-traffic-fetch -- --from 2026-10-12 --to 2026-10-18 --commit）/);
  assert.equal(commandFailureReason({ argv: ['scripts/check-note-sync.mjs'], index: 0, total: 1, line: 'x' }), 'x');
  assert.equal(commandFailureReason({ argv: month.argv, index: 0, total: 2, timedOut: true, timeoutMin: 30 }), '1/2 本目（note-traffic-fetch -- --commit）: 30 分で打ち切り');
});

// ---- 収集の検算・note-audit・段ごとの最新（DN-0847）
test('検算（verify）は quality-audit の cadence:collect の点検と 1 対 1（書き写さず id で引く）', async () => {
  const { CHECKS } = await import('../scripts/quality-audit.mjs');
  const collect = CHECKS.filter((c) => c.cadence === 'collect').map((c) => c.id).sort();
  const verify = buildStages({ today: '2026-10-24' }).flatMap((s) => s.verify ?? []);
  assert.ok(collect.length >= 7, `collect の点検が ${collect.length} 件しか無い（検査不成立）`);
  assert.deepEqual([...verify].sort(), collect, '段の verify と quality-audit の cadence:collect がずれた（どこからも回らない検算か、定義の無い検算がある）');
  assert.equal(new Set(verify).size, verify.length, '同じ検算を 2 つの段で回している');
});

test('取る月が無い KDP の段も検算は持つ（skip の週も過去の記録の食い違いを見る）', () => {
  const kdp = buildStages({ today: '2026-10-24', kdpMonths: [] }).find((s) => s.id === 'kdp');
  assert.ok(kdp.skip);
  assert.deepEqual(kdp.verify, ['kdp-report-freshness']);
});

test('note-status（毎週）はレビューより前・ブラウザ不要・題名と価格の印を commit する置き場を持つ', () => {
  const stages = buildStages({ today: '2026-10-24' });
  const audit = stages.find((s) => s.id === 'note-status');
  assert.equal(audit.phase, 'pre');
  assert.equal(audit.browser, false);
  assert.deepEqual(audit.addPaths, ['content/note', 'config/products.json', 'src/lib/note-magazines.ts']);
  assert.match(audit.commands.at(-1).argv.join(' '), /note-reconcile-title-price\.mjs --commit/);
  // 指摘は warn、検査不成立は failed（verify-note-magazines は 1 が不成立・2 がずれ）
  const mags = audit.commands.findIndex((c) => c.argv[0].includes('verify-note-magazines'));
  const exits = audit.commands.map(() => 0);
  assert.equal(stageStatus(audit, exits.map((e, i) => (i === mags ? 2 : e))), 'warn');
  assert.equal(stageStatus(audit, exits.map((e, i) => (i === mags ? 1 : e))), 'failed');
  assert.equal(stageStatus(audit, exits.map((e, i) => (i === 0 ? 1 : e)), ['✗ 検査不成立: 10本中9本が取得失敗']), 'failed');
});

test('検算の理由は結論の行を拾う（案内の行で埋もれさせない）', () => {
  const out = '[check-sales-freshness] 実検査 342 件\n[check-sales-freshness] ✗ FAIL: 2026-09 の販売明細 ¥106,800 がnote月次売上 ¥103,560 と不一致\n  npm run note-sales-fetch -- --month YYYY-MM --commit で当月を取り直す';
  assert.equal(verifyFailureReason('sales-freshness', out), '検算 sales-freshness: [check-sales-freshness] ✗ FAIL: 2026-09 の販売明細 ¥106,800 がnote月次売上 ¥103,560 と不一致');
});

const at = (iso) => Date.parse(iso);
const stage = (id, status, reason = '') => ({ id, status, reason });
const RUNS = [
  { phase: 'pre', finishedAt: '2026-10-24T05:25:00Z', stages: [stage('a8', 'ok'), stage('note-traffic', 'failed', '検査不成立')], commit: {}, leftover: [] },
  { phase: 'post', finishedAt: '2026-10-24T08:53:00Z', stages: [stage('note-sync', 'warn')], commit: {}, leftover: [] },
  { phase: 'only', finishedAt: '2026-10-24T09:10:00Z', stages: [stage('note-traffic', 'ok')], commit: {}, leftover: [] },
];
const judge = (o = {}) => judgeRuns({ runs: RUNS, stageIds: ['a8', 'note-traffic', 'note-sync'], failDays: 15, now: at('2026-10-25T00:00:00Z'), ...o });

test('判定は段ごとの最新: 運営者の取り直し（only）が土曜の失敗を上書きする', () => {
  assert.deepEqual(judge().problems, []);
  const stale = judgeRuns({ runs: RUNS.slice(0, 2), stageIds: ['a8', 'note-traffic', 'note-sync'], failDays: 15, now: at('2026-10-25T00:00:00Z') });
  assert.match(stale.problems.join('\n'), /note-traffic: 2026-10-24 の pre で失敗（検査不成立）/);
});

test('死活（alive）は日付だけを見て段の失敗では赤くしない・記録の無い段と期限切れは赤', () => {
  const runs = RUNS.slice(0, 2);
  assert.deepEqual(judgeRuns({ runs, stageIds: ['note-traffic'], failDays: 15, now: at('2026-10-25T00:00:00Z'), alive: true }).problems, []);
  assert.match(judge({ stageIds: ['a8', 'note-audit'] }).problems.join('\n'), /note-audit: 15 日以内に記録が無い/);
  const late = judgeRuns({ runs, stageIds: [], failDays: 15, now: at('2026-11-20T00:00:00Z'), alive: true }).problems;
  assert.equal(late.length, 2);
  assert.match(late[0], /pre: 最後の収集が 26 日前/);
});

test('一番新しい回の書き戻しの問題は段が全部合格でも赤', () => {
  const runs = [...RUNS, { phase: 'only', finishedAt: '2026-10-24T10:00:00Z', stages: [stage('a8', 'ok')], commit: { problem: 'develop への push に失敗' }, leftover: [] }];
  assert.match(judge({ runs }).problems.join('\n'), /only: 2026-10-24 の書き戻しの問題（develop への push に失敗）/);
});

// DN-0852: CI の note-public-view.yml・competitor-scan.yml を土曜の前段へ移した
test('note の公開画面は前段で公開 API の層だけを見る（撮影は毎週回さない・DN-1196）・検査不成立は失敗', () => {
  const stages = buildStages({ today: '2026-10-31' });
  const npv = stages.find((s) => s.id === 'note-public-view');
  assert.equal(npv.phase, 'pre');
  const argv = npv.commands[0].argv.join(' ');
  assert.match(argv, /check-note-public-view\.mjs --api-only/);
  assert.ok(!argv.includes('--review') && !argv.includes('--shot-dir'));
  assert.ok(argv.includes(`--out ${NOTE_PUBLIC_VIEW_LOCAL_DIR}/report.json`) && !argv.includes('.tmp/'));
  assert.equal(stageStatus(npv, [1], ['BAD x']), 'warn');
  assert.equal(stageStatus(npv, [1], ['✗ 検査不成立: 取得・表示の失敗が 40%']), 'failed');
});

// DN-1196: 前段 2 時間のうち 58 分を占めた note-audit を、毎週要る 4 本（note-status）と月 1 回の 5 本に分けた
test('note の全記事の照合（note-audit）は前回から 27 日たつまで skip・記録が無ければ回す', () => {
  const ids = (st) => st.commands.map((c) => c.argv[0].split('/').pop());
  const first = buildStages({ today: '2026-11-21' }).find((s) => s.id === 'note-audit');
  assert.equal(first.skip, null);
  assert.deepEqual(ids(first), ['check-note-structure.mjs', 'check-note-live-tags.mjs', 'check-note-live-headings.mjs', 'audit-note-cards.mjs', 'audit-note-funnel.mjs']);
  const recent = buildStages({ today: '2026-11-21', noteAuditLastAt: '2026-11-14T02:39:47.455Z' }).find((s) => s.id === 'note-audit');
  assert.match(recent.skip, /前回（2026-11-14）から 27 日たっていない/);
  assert.equal(buildStages({ today: '2026-12-12', noteAuditLastAt: '2026-11-14T02:39:47.455Z' }).find((s) => s.id === 'note-audit').skip, null);
  assert.equal(noteAuditDue({ today: '2026-12-10', lastAt: '2026-11-14T02:39:47.455Z' }), false);
  assert.equal(NOTE_AUDIT_INTERVAL_DAYS, 27);
  // 毎週の 4 本と月 1 回の 5 本で、分ける前の 9 本を過不足なく持つ
  const weekly = ids(buildStages({ today: '2026-11-21' }).find((s) => s.id === 'note-status'));
  assert.deepEqual(weekly, ['verify-note-status.mjs', 'verify-note-magazines.mjs', 'check-magazine-membership.mjs', 'note-reconcile-title-price.mjs']);
  assert.equal(new Set([...weekly, ...ids(first)]).size, 9);
});

test('note のアクセスの月次（先月）は、月が明けた後に取れていれば取り直さない・週の期間は毎週取る', () => {
  const cmds = (o) => buildStages({ today: '2026-11-21', ...o }).find((s) => s.id === 'note-traffic').commands.map((c) => c.argv.join(' '));
  assert.equal(cmds({}).length, 2);
  assert.equal(cmds({ noteTrafficMonthFetchedAt: '2026-10-10T04:42:11.655Z' }).length, 2); // 月の途中の値（10/10）は取り直す
  const done = cmds({ noteTrafficMonthFetchedAt: '2026-11-07T02:00:00.000Z' });
  assert.equal(done.length, 1);
  assert.match(done[0], /--from 2026-11-09 --to 2026-11-15/);
  // 月の境界は JST（10/31 23:59 JST = 14:59Z はまだ月の途中・11/1 00:00 JST = 15:00Z から月が明けた後）
  assert.equal(noteTrafficMonthDue({ prevMonth: '2026-10', fetchedAt: '2026-10-31T14:59:00Z' }), true);
  assert.equal(noteTrafficMonthDue({ prevMonth: '2026-10', fetchedAt: '2026-10-31T15:00:00Z' }), false);
});

test('四半期の初日と、競合の取得は四半期の最初の土曜だけ（取得済みなら skip）', () => {
  assert.equal(quarterStart('2026-10-31'), '2026-10-01');
  assert.equal(quarterStart('2027-01-02'), '2027-01-01');
  assert.equal(quarterStart('2026-06-30'), '2026-04-01');
  assert.equal(competitorsDue({ today: '2026-10-31', lastScans: { note: '2026-10-25', coconala: '2026-10-01' } }), false);
  assert.equal(competitorsDue({ today: '2027-01-02', lastScans: { note: '2026-10-25', coconala: '2026-10-01' } }), true);
  assert.equal(competitorsDue({ today: '2026-10-31', lastScans: { note: '2026-10-25', coconala: '2026-09-30' } }), true);
  assert.equal(competitorsDue({ today: '2026-10-31', lastScans: {} }), true);
  const skipped = buildStages({ today: '2026-10-31', competitorScans: { note: '2026-10-25', coconala: '2026-10-01' } }).find((s) => s.id === 'competitors');
  assert.match(skipped.skip, /取得が済んでいる/);
  const due = buildStages({ today: '2027-01-02', competitorScans: { note: '2026-10-25', coconala: '2026-10-01' } }).find((s) => s.id === 'competitors');
  assert.equal(due.skip, null);
  assert.equal(due.phase, 'pre');
  assert.equal(due.browser, true); // ココナラの 2 本は手元の永続 profile
  assert.deepEqual(argvOf([due], 'competitors').map((a) => a.split(' ').find((x) => /scout|research/.test(x))), ['scout-note-competitors', 'scripts/coconala-research.mjs', 'scout-coconala-competitors']);
});

test('売上の段のあとに、前々月と前月の受取額と固定費を記録する段がある（確定した月だけ書く）', () => {
  const stages = buildStages({ today: '2026-11-14' });
  const ids = stages.map((s) => s.id);
  assert.ok(ids.indexOf('business-records') > ids.indexOf('product-sales'));
  assert.deepEqual(argvOf(stages, 'business-records'), [
    'scripts/record-net-receipts.mjs --month 2026-09 --when-complete --commit',
    'scripts/record-operating-costs.mjs --month 2026-09 --commit',
    'scripts/record-net-receipts.mjs --month 2026-10 --when-complete --commit',
    'scripts/record-operating-costs.mjs --month 2026-10 --commit',
  ]);
  assert.equal(stages.find((s) => s.id === 'business-records').browser, false);
});

test('pre の後に post の記録が無いまま 1 日たつと、死活でも赤（2026-11-14 の再起動での途中終了）', () => {
  const pre = { phase: 'pre', finishedAt: '2026-11-14T02:39:00Z', stages: [], commit: {}, leftover: [] };
  const post = { phase: 'post', finishedAt: '2026-11-08T02:09:00Z', stages: [], commit: {}, leftover: [] };
  const stuck = judgeRuns({ runs: [post, pre], stageIds: [], failDays: 15, now: at('2026-11-15T03:00:00Z'), alive: true }).problems;
  assert.equal(stuck.length, 1);
  assert.match(stuck[0], /post: 2026-11-14 の pre の後に post の記録が無い/);
  // 1 日以内は待つ（post が走っている途中）
  assert.deepEqual(judgeRuns({ runs: [post, pre], stageIds: [], failDays: 15, now: at('2026-11-14T12:00:00Z'), alive: true }).problems, []);
  // post が pre の後に終わっていれば赤くしない
  const done = { ...post, finishedAt: '2026-11-14T08:00:00Z' };
  assert.deepEqual(judgeRuns({ runs: [post, pre, done], stageIds: [], failDays: 15, now: at('2026-11-16T00:00:00Z'), alive: true }).problems, []);
});

test('回す範囲: 土曜の開始時刻〜日曜だけ・今週の pre が無ければ all・post だけ無ければ post（2026-11-14 の再起動）', () => {
  const pre = { phase: 'pre', finishedAt: '2026-11-14T02:39:47Z' }; // 土曜 11:39 JST
  const post = { phase: 'post', finishedAt: '2026-11-14T06:00:00Z' };
  const old = [{ phase: 'pre', finishedAt: '2026-11-07T02:00:00Z' }, { phase: 'post', finishedAt: '2026-11-08T02:09:36Z' }];
  const p = (today, iso, runs) => resumePlan({ today, now: Date.parse(iso), runs });
  assert.equal(p('2026-11-14', '2026-11-14T00:00:00Z', old), 'none'); // 土曜 9:00 JST＝開始前
  assert.equal(p('2026-11-14', '2026-11-14T00:30:00Z', old), 'all'); // 土曜 9:30 JST＝定刻
  assert.equal(p('2026-11-14', '2026-11-14T03:05:00Z', [...old, pre]), 'post'); // 再起動の後のログイン
  assert.equal(p('2026-11-15', '2026-11-15T01:00:00Z', [...old, pre]), 'post'); // 日曜の朝
  assert.equal(p('2026-11-15', '2026-11-15T01:00:00Z', [...old, pre, post]), 'none');
  assert.equal(p('2026-11-16', '2026-11-16T01:00:00Z', [...old, pre]), 'none'); // 月曜は回さない
  assert.equal(p('2026-11-13', '2026-11-13T05:00:00Z', old), 'none'); // 金曜
});
