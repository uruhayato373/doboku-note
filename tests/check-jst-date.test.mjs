/**
 * scripts/check-jst-date.mjs — JST の日付が UTC・実行環境のタイムゾーン・自前計算で出ていないかの検査。
 * 検出の型（utc-date・plus9・local-ymd）と、allowlist の kinds による免除、リポジトリ全体が通ることを固定する。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ALLOW, KINDS, ROOTS, findHits, isAllowed } from '../scripts/check-jst-date.mjs';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

const kinds = (src) => findHits(src).map((h) => `${h.kind}@${h.line}`);

test('utc-date: UTC の今日（new Date().toISOString().slice(0, 10)）', () => {
  assert.deepEqual(kinds('const d = new Date().toISOString().slice(0, 10);'), ['utc-date@1']);
  assert.deepEqual(kinds('const d = new Date().toISOString().slice( 0 , 10 );'), ['utc-date@1']);
  assert.deepEqual(kinds('const t = new Date().toISOString().slice(0, 19);'), [], '日付ではない切り出しは対象外');
  assert.deepEqual(kinds('const d = x.toISOString().slice(0, 10);'), [], '特定の時刻の日付（記録の日付ではない）は対象外');
});

test('plus9: +9 時間の自前計算（60*60*1000・3600*1000・3600000・3600_000・36e5・32400000）', () => {
  for (const expr of ['9 * 60 * 60 * 1000', '9 * 3600 * 1000', '9 * 3600000', '9 * 3600_000', '9 * 3_600_000', '9 * 60 * 60000', '9 * 60 * 60_000', '9 * 60 * 60 * 1_000', '9*3600e3', '9 * 36e5', '32400000', '32_400_000']) {
    assert.deepEqual(kinds(`const jst = new Date(Date.now() + ${expr});`), ['plus9@1'], expr);
  }
  assert.deepEqual(kinds('const x = 19 * 3600e3;'), [], '19 時間は対象外');
  assert.deepEqual(kinds('const week = 7 * 24 * 60 * 60 * 1000;'), []);
  assert.deepEqual(kinds('const t = 90 * 3600 * 1000;'), [], '90 は対象外（9 の直後が数字）');
});

test('local-ymd: getFullYear と getMonth・getDate が近くにある（実行環境のタイムゾーンで年月日を組む）', () => {
  assert.deepEqual(kinds('const s = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;'), ['local-ymd@1']);
  assert.deepEqual(kinds('const y = d.getFullYear();\nconst m = d.getMonth() + 1;\nconst day = d.getDate();'), ['local-ymd@1']);
  assert.deepEqual(kinds('const y = d.getFullYear();\nconst x = 1;\nconst y2 = 2;\nconst z = 3;\nconst m = d.getMonth(); const dd = d.getDate();'), [], '離れていれば別の用途');
  assert.deepEqual(kinds('const y = d.getFullYear();'), [], '年だけは対象外');
  assert.deepEqual(kinds('const dd = new Date(y, m, 0).getDate();'), [], '月末日の算出は対象外');
  assert.deepEqual(kinds('d.setUTCDate(d.getUTCDate() + 1); d.getUTCFullYear(); d.getUTCMonth();'), [], 'UTC のメソッドは対象外');
});

test('コメントだけの行は見ない（説明に書いた例で落ちない）', () => {
  assert.deepEqual(kinds('// new Date().toISOString().slice(0, 10) は UTC\n * `+ 9 * 3600 * 1000` を使わない\n/* 32400000 */'), []);
  assert.deepEqual(kinds('const a = 1; // new Date().toISOString().slice(0, 10)'), ['utc-date@1'], '行の後ろのコメントは見分けない（コードと同じ行は対象）');
});

test('isAllowed: 文字列の理由は全ての検出の型を、{ kinds, reason } はその型だけを免除する', () => {
  const allow = new Map([['a.mjs', '理由'], ['b.mjs', { kinds: ['plus9'], reason: '理由' }]]);
  assert.equal(isAllowed('a.mjs', 'utc-date', allow), true);
  assert.equal(isAllowed('a.mjs', 'local-ymd', allow), true);
  assert.equal(isAllowed('b.mjs', 'plus9', allow), true);
  assert.equal(isAllowed('b.mjs', 'utc-date', allow), false);
  assert.equal(isAllowed('c.mjs', 'plus9', allow), false);
});

test('allowlist: 全件に理由があり、検出の型は既知で、実在するファイルだけ（古い登録を残さない）', () => {
  assert.ok(ALLOW.size >= 10);
  for (const [file, entry] of ALLOW) {
    const reason = typeof entry === 'string' ? entry : entry.reason;
    assert.ok(reason && reason.length >= 10, `${file}: 理由が要る`);
    if (typeof entry !== 'string') for (const k of entry.kinds) assert.ok(k in KINDS, `${file}: 知らない検出の型 ${k}`);
    assert.ok(ROOTS.some((r) => file.startsWith(`${r}/`)), `${file}: 走査対象の外`);
    assert.ok(existsSync(join(ROOT, file)), `${file}: ファイルが無い`);
  }
});

test('リポジトリ全体（scripts・.claude・tools）が通り、実検査したファイル数を出す', () => {
  const r = spawnSync(process.execPath, ['scripts/check-jst-date.mjs'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
  const n = Number(/(\d+) ファイルを実検査/.exec(r.stdout)?.[1]);
  assert.ok(n > 500, `実検査 ${n} ファイル（検査不成立）`);
});
