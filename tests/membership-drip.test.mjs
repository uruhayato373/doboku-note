// check-membership-drip の判定ロジックのテスト。
//
// 守りたいのは 2026-08-27 の見落とし: 配信表で 08-25 予定の会員記事が draft のまま
// 2 日過ぎていたのに、誰も気づかなかった。overdue が fail に落ちることを固定する。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  parseSchedule,
  classifyRow,
  daysBetween,
  readField,
  resolveArticle,
  SSOT_REL,
  GRACE_DAYS,
} from '../scripts/check-membership-drip.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const SAMPLE = [
  '## 並行配信',
  '',
  '| 公開予定日 | 記事 |',
  '|---|---|',
  '| 2026-08-21 | 学科01 土工 |',
  '| 2026-08-25 | 学科02 コンクリート工 |',
  '| 2026-09-25 | 添削練習01 工事概要の具体性 |',
  '',
  '本文が続く（表の外なので拾わない）。',
  '',
  '| 週 | テーマ | 記事dir |',
  '|---|---|---|',
  '| W1 | 安全管理 | 01_安全管理 |',
].join('\n');

test('parseSchedule: 日付列を持つ表だけを拾う', () => {
  const rows = parseSchedule(SAMPLE);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[1], { date: '2026-08-25', label: '学科02 コンクリート工' });
});

test('parseSchedule: 表が終わったら読み止める（後続の別表を混ぜない）', () => {
  const rows = parseSchedule(SAMPLE);
  assert.ok(rows.every((r) => !r.label.includes('安全管理')));
});

test('parseSchedule: CRLF でも読める', () => {
  assert.equal(parseSchedule(SAMPLE.replace(/\n/g, '\r\n')).length, 3);
});

test('daysBetween: 予定日から当日までの日数', () => {
  assert.equal(daysBetween('2026-08-25', '2026-08-27'), 2);
  assert.equal(daysBetween('2026-08-27', '2026-08-27'), 0);
  assert.equal(daysBetween('2026-09-25', '2026-08-27'), -29);
});

test('回帰: 予定日を 2 日過ぎた draft は fail（2026-08-27 の見落とし）', () => {
  const v = classifyRow(
    { date: '2026-08-25', label: '学科02 コンクリート工' },
    { today: '2026-08-27', resolved: true, status: 'draft', rel: 'a/article.md' },
  );
  assert.equal(v.level, 'fail');
  assert.equal(v.kind, 'overdue');
  assert.match(v.detail, /2 日超過/);
});

test('予定日当日の draft は落とさない（当日中の公開を許す猶予）', () => {
  const v = classifyRow(
    { date: '2026-08-27', label: '学科03 品質管理' },
    { today: '2026-08-27', resolved: true, status: 'draft', rel: 'a/article.md' },
  );
  assert.equal(v.level, 'ok');
  assert.equal(v.kind, 'pending');
});

test('猶予は GRACE_DAYS ちょうどで発火する', () => {
  const v = classifyRow(
    { date: '2026-08-26', label: '学科03' },
    { today: '2026-08-27', resolved: true, status: 'draft' },
  );
  assert.equal(GRACE_DAYS, 1);
  assert.equal(v.level, 'fail');
});

test('published は ok・noteId が無ければ偽成功として fail', () => {
  const base = { today: '2026-08-27', resolved: true, status: 'published', rel: 'a/article.md' };
  assert.equal(classifyRow({ date: '2026-08-25', label: 'x' }, { ...base, noteId: 'nabc' }).level, 'ok');
  const bad = classifyRow({ date: '2026-08-25', label: 'x' }, base);
  assert.equal(bad.level, 'fail');
  assert.equal(bad.kind, 'published-no-id');
});

test('予定より前に公開されたら早出しとして warn', () => {
  const v = classifyRow(
    { date: '2026-08-25', label: 'x' },
    { today: '2026-08-27', resolved: true, status: 'published', noteId: 'n1', publishedAt: '2026-08-22' },
  );
  assert.equal(v.level, 'warn');
  assert.equal(v.kind, 'early');
});

test('実体が無い行: 予定日が未来なら warn・過ぎていたら fail', () => {
  const row = { date: '2026-09-25', label: '添削練習01' };
  assert.equal(classifyRow(row, { today: '2026-08-27', resolved: false }).level, 'warn');
  assert.equal(classifyRow(row, { today: '2026-09-26', resolved: false }).level, 'fail');
});

test('readField: クォート有無どちらも読める', () => {
  const fm = ['---', 'noteStatus: published', 'noteId: "n5714b90dade7"', '---'].join('\n');
  assert.equal(readField(fm, 'noteStatus'), 'published');
  assert.equal(readField(fm, 'noteId'), 'n5714b90dade7');
  assert.equal(readField(fm, 'noteUrl'), null);
});

test('実リポジトリ: 配信表の全行が記事へ解決できる（ラベルと dir 名のドリフト検知）', () => {
  const rows = parseSchedule(readFileSync(join(ROOT, SSOT_REL), 'utf-8'));
  assert.ok(rows.length > 0, '配信表が 1 行も読めていない＝検査不成立');
  const unresolved = rows.filter((r) => !resolveArticle(r.label).ok).map((r) => r.label);
  assert.deepEqual(unresolved, [], `解決できない行: ${unresolved.join(' / ')}`);
});
