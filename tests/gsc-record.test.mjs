// GSC の記録層を土曜の Mac へ移したときの、断片の検査と「書けたか」の判定（DN-0849・旧 gsc-auto-review.yml の後段）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FRAGMENTS, appendEntry, judgeRecord, recordNeeded, validateFragment } from '../scripts/lib/gsc-record.mjs';

test('断片の検査: 空は missing・見出しの規約違反は bad（追記しない）・行数超過は注意だけ', () => {
  assert.equal(validateFragment('', FRAGMENTS.weekly).status, 'missing');
  assert.equal(validateFragment(null, FRAGMENTS.weekly).status, 'missing');
  assert.equal(validateFragment('### 2026-10-31（週次・自動レビュー）\n観測: x', FRAGMENTS.weekly).status, 'ok');
  const bad = validateFragment('## 2026-10-31 週次\n本文', FRAGMENTS.weekly);
  assert.equal(bad.status, 'bad');
  assert.match(bad.reason, /見出しの規約/);
  // coverage の断片に週次の見出しを書いたら bad（取り違えを追記しない）
  assert.equal(validateFragment('### 2026-10-31（週次・自動レビュー）', FRAGMENTS.coverage).status, 'bad');
  const long = validateFragment(['### 2026-10-31（週次・自動レビュー）', ...Array.from({ length: 25 }, (_, i) => `行 ${i}`)].join('\n'), FRAGMENTS.weekly);
  assert.equal(long.status, 'ok');
  assert.match(long.warning, /上限 20 行/);
});

test('追記は append-only で 1 行空ける・末尾は改行 1 つ', () => {
  assert.equal(appendEntry('# log\n\n### old\n', '### new\n本文\n\n'), '# log\n\n### old\n\n### new\n本文\n');
  assert.equal(appendEntry('# log', '### new'), '# log\n\n### new\n');
});

test('書けたかの判定: 週次が要ったのに書かれていなければ失敗・データが古い週と coverage は注意だけ', () => {
  const due = { gscDataStale: false, weeklyAlreadyLogged: false, monthlyAlreadyLogged: true };
  assert.equal(judgeRecord(due, { weeklyAlreadyLogged: true, monthlyAlreadyLogged: true }).ok, true);
  const missed = judgeRecord(due, { weeklyAlreadyLogged: false, monthlyAlreadyLogged: true });
  assert.equal(missed.ok, false);
  assert.match(missed.problems[0], /週次の記録が必要だったのに/);
  const stale = judgeRecord({ gscDataStale: true, weeklyAlreadyLogged: false, monthlyAlreadyLogged: false }, { weeklyAlreadyLogged: false, monthlyAlreadyLogged: false });
  assert.equal(stale.ok, true);
  assert.equal(stale.warnings.length, 2);
});

test('Claude を回すのは週次か coverage のどちらかが要るときだけ', () => {
  assert.equal(recordNeeded({ gscDataStale: false, weeklyAlreadyLogged: true, monthlyAlreadyLogged: true }), false);
  assert.equal(recordNeeded({ gscDataStale: false, weeklyAlreadyLogged: false, monthlyAlreadyLogged: true }), true);
  assert.equal(recordNeeded({ gscDataStale: true, weeklyAlreadyLogged: false, monthlyAlreadyLogged: true }), false);
  assert.equal(recordNeeded({ gscDataStale: true, weeklyAlreadyLogged: true, monthlyAlreadyLogged: false }), true);
});
