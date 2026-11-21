/**
 * x-queue-surfacer の日付パーサと投入集計を固定する。
 *
 * 守りたい事故（2026-08-17 発覚）: 見出しの日付書式が 3 系統あるのにパーサは 1 系統しか
 * 読めておらず、**同じ根から偽赤と偽陰性の両方**が出ていた。
 *   - 偽赤: 日付が読めない pack は covered_until に寄与せず、キューが 9/30 まで埋まっているのに
 *           「残り -43 日」と永久に赤く出ていた
 *   - 偽陰性: start が null になり due 判定から静かに落ち、未投入 35 件（068 の 28 件を含む）が
 *           3 週間 surface されなかった
 *
 * したがって固定すべきは「3 書式が読めること」だけでなく、
 * **読めなかったときに dates が空で返る（＝呼び出し側が undated として扱える）こと**。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDatesFromRaw, parseStockMarker, summarizeStatus } from '../scripts/lib/x-queue-lib.mjs';

const NOW = new Date(2026, 7, 17); // 2026-08-17
const md = (...headers) => headers.map((h) => `## Tweet ${h}`).join('\n\n本文\n\n');
const ymd = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

test('書式1（em-dash）: 064-067 系', () => {
  const r = parseDatesFromRaw(md('01: ハウツー・無料 — 7/6 残り14日', '02: 体験 — 7/8 残り12日'), NOW);
  assert.equal(r.count, 2);
  assert.deepEqual(r.dates.map(ymd), ['2026-7-6', '2026-7-8']);
});

test('書式2（全角括弧＋曜日＋時刻）: 068 / 073 系', () => {
  const r = parseDatesFromRaw(md('01: 朝共感・リフレーム（土 7/19 07:15）', '02: 構造分解 [thread]（日 7/20 08:20）'), NOW);
  assert.equal(r.count, 2);
  assert.deepEqual(r.dates.map(ymd), ['2026-7-19', '2026-7-20']);
});

test('書式3（コロン直後）: 083-092 キャンペーン pack 系', () => {
  const r = parseDatesFromRaw(md('01: 9/1 07:15 civil-1 / 共感フック / linkless', '02: 9/10 19:35 civil-2 / 過去問'), NOW);
  assert.equal(r.count, 2);
  assert.deepEqual(r.dates.map(ymd), ['2026-9-1', '2026-9-10']);
});

test('3書式が混在しても全部読む', () => {
  const r = parseDatesFromRaw(md('01: A — 7/6 残り14日', '02: B（土 7/19 07:15）', '03: 9/1 07:15 civil-1'), NOW);
  assert.equal(r.dates.length, 3);
});

test('日付なし見出しは count に入るが dates は空＝undated として扱える（これが偽陰性の防波堤）', () => {
  const r = parseDatesFromRaw(md('01: R8総監 択一 暫定解答速報（当日・即時）'), NOW);
  assert.equal(r.count, 1);
  assert.equal(r.dates.length, 0); // start=null → 呼び出し側が undated に分類する
});

test('見出しが1本も無ければ count 0（走査対象外と判定できる）', () => {
  assert.deepEqual(parseDatesFromRaw('# タイトル\n\n本文だけ', NOW), { count: 1 - 1, dates: [] });
  assert.deepEqual(parseDatesFromRaw('', NOW), { count: 0, dates: [] });
  assert.deepEqual(parseDatesFromRaw(null, NOW), { count: 0, dates: [] });
});

test('年跨ぎ: 半年以上過去の月日は翌年の予定とみなす', () => {
  // 2026-08-17 基準で 1/5 は 7 か月前 → 2027-1-5
  const r = parseDatesFromRaw(md('01: A — 1/5 残り3日'), NOW);
  assert.equal(ymd(r.dates[0]), '2027-1-5');
  // 直近の過去（7/6・42日前）は年を繰り上げない
  assert.equal(ymd(parseDatesFromRaw(md('01: A — 7/6'), NOW).dates[0]), '2026-7-6');
});

test('ありえない月日は捨てる（誤検出で go-live を狂わせない）', () => {
  const r = parseDatesFromRaw(md('01: 比率 — 13/45 の話'), NOW);
  assert.equal(r.count, 1);
  assert.equal(r.dates.length, 0);
});

const row = (phase, publishAt = null) => ({ phase, publishAt });

test('summarizeStatus: queued / posted の数え分けと lastScheduled', () => {
  const r = summarizeStatus([
    row('posted', '2026-09-01T07:15:00.000+09:00'),
    row('queued', '2026-09-10T19:35:00.000+09:00'),
    row('draft'),
  ]);
  assert.equal(r.posted, 1);
  assert.equal(r.queued, 1);
  assert.equal(r.lastScheduled.toISOString(), new Date('2026-09-10T19:35:00.000+09:00').toISOString());
});

test('summarizeStatus: submitted（予約に入れた・キュー未確認）も queued に数える', () => {
  const r = summarizeStatus([row('submitted', '2026-09-10T19:35:00.000+09:00')]);
  assert.equal(r.queued, 1);
});

test('summarizeStatus: posted は未来の予約充足に算入しない', () => {
  const r = summarizeStatus([row('posted', '2026-09-30T12:00:00.000+09:00')]);
  assert.equal(r.queued, 0);
  assert.equal(r.lastScheduled, null);
});

test('summarizeStatus: 壊れた入力でも落ちず 0 を返す', () => {
  assert.deepEqual(summarizeStatus(null), { queued: 0, posted: 0, retired: 0, lastScheduled: null });
  assert.deepEqual(summarizeStatus([]), { queued: 0, posted: 0, retired: 0, lastScheduled: null });
  assert.deepEqual(summarizeStatus([null, 'x']), { queued: 0, posted: 0, retired: 0, lastScheduled: null });
});

test('summarizeStatus: 不正な publishAt は lastScheduled を汚さない', () => {
  const r = summarizeStatus([row('queued', 'not-a-date'), row('queued', '2026-09-05T10:00:00.000+09:00')]);
  assert.equal(ymd(r.lastScheduled), '2026-9-5');
});

// 2026-09-14: 9月の実キューが空なのに予定だけで10月まで確保と表示した事故。
test('予定日時だけでは予約投入済みと数えない（承認済み・下書きは数えない・差替済みは retired）', () => {
  const posts = ['planned', 'draft', 'retired'].map((phase) => row(phase, '2026-10-24T12:00:00+09:00'));
  assert.deepEqual(summarizeStatus(posts), { queued: 0, posted: 0, retired: 1, lastScheduled: null });
});

// 2026-10-12: 予約の本文を別の原稿へ差し替えた元の原稿（stopped）を「未投入」に数えない
test('summarizeStatus: retired は未投入にしない', () => {
  const r = summarizeStatus([
    row('queued', '2026-10-14T20:51:00.000+09:00'),
    row('retired', '2026-10-17T20:24:00.000+09:00'),
    row('retired', '2026-10-18T20:24:00.000+09:00'),
  ]);
  assert.equal(r.queued, 1);
  assert.equal(r.retired, 2);
  assert.equal(r.posted, 0);
});

test('ストックの印: HTML コメントの x-stock だけを読み、値を返す', () => {
  assert.equal(parseStockMarker('# 図解\n\n<!-- x-stock: x-c1-restart-2027 -->\n\n## Tweet 01: 本文'), 'x-c1-restart-2027');
  assert.equal(parseStockMarker('<!--x-stock:DN-0220-->'), 'DN-0220');
});

test('ストックの印: 無い・コメントの外・値が空なら null', () => {
  assert.equal(parseStockMarker('# 図解\n\n## Tweet 01: 本文'), null);
  assert.equal(parseStockMarker('x-stock: x-c1-restart-2027 と本文に書いただけ'), null);
  assert.equal(parseStockMarker('<!-- x-stock: -->'), null);
  assert.equal(parseStockMarker(''), null);
});
