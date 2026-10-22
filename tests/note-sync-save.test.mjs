// note-sync の保存段（DN-0763）: 1 回だけ再試行し、落ちたら理由（出力の末尾）を返す
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACCOUNT_GATE_EXIT, lastLines, runAccountGated, runWithRetry } from '../scripts/lib/note-sync-save.mjs';
import { assertAccountGate } from '../scripts/lib/note-browser.mjs';

test('一時的な失敗は 2 回目で通り、理由を残さない', () => {
  const results = [{ status: 1, out: 'Unknown system error -11\n' }, { status: 0, out: 'ok\n' }];
  const r = runWithRetry(() => results.shift());
  assert.deepEqual([r.status, r.attempts, r.reason], [0, 2, '']);
});

test('2 回とも落ちたら最後の出力の末尾 1 行を理由にする', () => {
  let calls = 0;
  const r = runWithRetry(() => { calls += 1; return { status: 1, out: 'copy a\n✗ ETIMEDOUT: vault\n\n' }; });
  assert.equal(calls, 2);
  assert.equal(r.status, 1);
  assert.equal(r.reason, '✗ ETIMEDOUT: vault');
});

test('出力が空でも exit コードを理由にする', () => {
  assert.equal(runWithRetry(() => ({ status: 3, out: '' })).reason, 'exit 3');
  assert.deepEqual(lastLines('a\n\nb\nc\n', 2), ['b', 'c']);
});

// マガジンのカバー登録の account ゲート（DN-0568）: exit 2 は 1 回だけやり直し、2 回続けて 2 のときだけ止める
test('account ゲート: exit 2 → やり直し → 成功なら止めない', () => {
  const results = [{ status: ACCOUNT_GATE_EXIT, out: 'ABORT: account != dobokunote\n' }, { status: 0, out: '[1] account gate OK\n' }];
  const r = runAccountGated(() => results.shift());
  assert.deepEqual([r.status, r.attempts, r.loggedOut], [0, 2, false]);
});

test('account ゲート: 2 回続けて exit 2 ならログイン切れとして止める', () => {
  let calls = 0;
  const r = runAccountGated(() => { calls += 1; return { status: ACCOUNT_GATE_EXIT, out: 'ABORT: account != dobokunote\n' }; });
  assert.equal(calls, 2);
  assert.deepEqual([r.status, r.loggedOut, r.reason], [2, true, 'ABORT: account != dobokunote']);
});

test('account ゲート以外の失敗はやり直さず、その誌の失敗として返す', () => {
  let calls = 0;
  const r = runAccountGated(() => { calls += 1; return { status: 5, out: 'ABORT: プレビュー未出現\n' }; });
  assert.equal(calls, 1);
  assert.deepEqual([r.status, r.loggedOut], [5, false]);
  const ok = runAccountGated(() => ({ status: 0, out: '' }));
  assert.deepEqual([ok.attempts, ok.loggedOut], [1, false]);
});

test('週次のマガジン列: 一時的な exit 2 では残りを止めず、2 回続けば止める', () => {
  // syncMagazines の判定（loggedOut で break・それ以外は次の誌へ）と同じ形で、誌ごとの exit の並びを流す
  const drive = (byMagazine) => {
    const done = [];
    for (const [key, statuses] of byMagazine) {
      const r = runAccountGated(() => ({ status: statuses.shift(), out: '' }));
      if (r.loggedOut) return { done, stoppedAt: key };
      if (r.status === 0) done.push(key);
    }
    return { done, stoppedAt: null };
  };
  assert.deepEqual(drive([['m7', [0]], ['m8', [2, 0]], ['m9', [0]]]), { done: ['m7', 'm8', 'm9'], stoppedAt: null });
  assert.deepEqual(drive([['m7', [0]], ['m8', [2, 2]], ['m9', [0]]]), { done: ['m7'], stoppedAt: 'm8' });
});

// account ゲート本体（note-magazine-cover が使う共通の assertAccountGate）: 名前が遅れて出ても 1 回目の読みで落とさない
test('assertAccountGate: クリエイター名が遅れて出れば通り、最後まで出なければ ok=false', async () => {
  const fakePage = (texts) => ({ goto: async () => {}, evaluate: async () => texts.shift() ?? '' });
  const late = await assertAccountGate(fakePage(['', 'loading', 'アカウント dobokunote']), { expected: 'dobokunote', attempts: 8, intervalMs: 0 });
  assert.deepEqual(late, { ok: true, attemptsUsed: 3 });
  const never = await assertAccountGate(fakePage([]), { expected: 'dobokunote', attempts: 3, intervalMs: 0 });
  assert.deepEqual(never, { ok: false, attemptsUsed: 3 });
});
