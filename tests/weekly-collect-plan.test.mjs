// 土曜の収集の段の表（DN-0817・DN-0819）: 対象の月・期間と、段の合否の決め方
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildStages, commandFailureReason, previousMonth, runPassed, stageStatus } from '../scripts/lib/weekly-collect-plan.mjs';

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
