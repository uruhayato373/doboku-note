#!/usr/bin/env node
// sales-log.json の「転記が止まっていないか」を検査する（今回の事故の失敗モードそのもの）。
//
// 背景（2026-08-17）: sales-log は 2026-07-14 で止まっており、2026-07 は note 実績
// 145 件 ¥275,140 に対して 23 件 ¥49,660＝**18% しか入っていなかった**。2026-08 は 0 件。
// にもかかわらず誰も落ちなかった。sales-summary は「入っている分」を正しく足すので緑のまま、
// 週次レビューは売上を読んでおらず、下流のガードレール（x-post-writer 等）は
// 「sales-log は停止中」という前提を1か月抱えたままだった。
// **手動転記は「やった月」と「やらなかった月」が外から区別できない**——これを機械で区別する。
//
// **判定軸は updatedAt（転記を実行した日）であって、最終売上日ではない。**
// 最終売上日で測ると「売れていない月」と「転記していない月」を区別できず、閑散期に
// 構造的な赤を出してしまう（原則9 の偽赤）。取得を走らせれば新規 0 件でも updatedAt は
// 進むので、updatedAt だけが「転記が回っているか」を正しく表す。
//
// 判定:
//   FAIL(exit 1)  sales 配列が空 / updatedAt が STALE_FAIL 日超 / updatedAt が読めない
//   WARN(exit 0)  updatedAt が STALE_WARN 日超
//   OK(exit 0)    それ以外
// 閾値は今回の事故（2026-07-14 で停止 → 8/17 に発覚＝34 日）が **FAIL として鳴る**ように取る。
//
// 「異常0件」と「検査0件」を区別する（12原則 9）: 検査したエントリ数と最終日付を必ず出力し、
// sales が空のときは OK ではなく FAIL にする。
//
// 使い方:
//   node scripts/check-sales-freshness.mjs
//   node scripts/check-sales-freshness.mjs --json
//   npm run check-sales-freshness
//
// 真実源: .claude/knowledge/reference/sales-tracking.md「取得と検算」

import { readFileSync, existsSync } from 'node:fs';

const SALES_LOG = '.claude/state/sales/sales-log.json';
const STALE_WARN = 10; // 10 日転記が無ければ注意
const STALE_FAIL = 21; // 3 週間走っていなければ「止まっている」と断定する
//   ← 事故（2026-07-14 停止・8/17 発覚＝34 日）を FAIL 側に入れるための値。
//     35 日にすると当の事故が WARN 止まりで鳴らない。逆に短すぎると月次運用を殺すので 3 週間。
const JSON_OUT = process.argv.includes('--json');
const TAG = '[check-sales-freshness]';

const DAY_MS = 86_400_000;
const today = new Date();
const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

/** "YYYY-MM-DD" → 経過日数。読めなければ null。 */
export function ageInDays(dateStr, nowUtc = todayUtc) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr || ''));
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(t)) return null;
  return Math.floor((nowUtc - t) / DAY_MS);
}

/** 純関数。log オブジェクトから判定を返す（テスト対象）。 */
export function assessSalesLog(log, nowUtc = todayUtc) {
  const sales = Array.isArray(log?.sales) ? log.sales : null;
  if (!sales) return { status: 'FAIL', reason: 'sales 配列が無い（スキーマ破損）', count: 0 };
  if (sales.length === 0) return { status: 'FAIL', reason: 'sales が 0 件（検査対象ゼロを OK と呼ばない）', count: 0 };

  const dates = sales.map((s) => s?.date).filter((d) => /^\d{4}-\d{2}-\d{2}/.test(String(d || ''))).sort();
  if (dates.length === 0) return { status: 'FAIL', reason: '日付を持つエントリが 1 件も無い', count: sales.length };

  const latest = dates[dates.length - 1];
  const latestAge = ageInDays(latest, nowUtc);
  const updatedAge = ageInDays(log?.updatedAt, nowUtc);
  const base = {
    count: sales.length,
    latest,
    latestAge,
    updatedAt: log?.updatedAt ?? null,
    updatedAge,
    datedCount: dates.length,
  };

  if (updatedAge === null) return { ...base, status: 'FAIL', reason: 'updatedAt が読めない（YYYY-MM-DD 以外）' };
  if (updatedAge > STALE_FAIL) {
    return { ...base, status: 'FAIL', reason: `転記が ${updatedAge} 日前から動いていない（上限 ${STALE_FAIL} 日）` };
  }
  if (updatedAge > STALE_WARN) {
    return { ...base, status: 'WARN', reason: `転記が ${updatedAge} 日前（警告 ${STALE_WARN} 日）` };
  }
  return { ...base, status: 'OK', reason: null };
}

// import 時に CLI を走らせない（テストから assessSalesLog だけ使うため）。
// ガードが無いと、データが古いときの process.exit(1) がテスト実行そのものを殺す。
const isMain = process.argv[1] && process.argv[1].endsWith('check-sales-freshness.mjs');

if (isMain) {
  if (!existsSync(SALES_LOG)) {
    console.error(`${TAG} FAIL: ${SALES_LOG} が無い`);
    process.exit(1);
  }

  let log;
  try {
    log = JSON.parse(readFileSync(SALES_LOG, 'utf8'));
  } catch (e) {
    console.error(`${TAG} FAIL: ${SALES_LOG} を JSON として読めない — ${e.message}`);
    process.exit(1);
  }

  const r = assessSalesLog(log);

  if (JSON_OUT) {
    console.log(JSON.stringify({ check: 'sales-freshness', staleWarnDays: STALE_WARN, staleFailDays: STALE_FAIL, ...r }, null, 2));
    process.exit(r.status === 'FAIL' ? 1 : 0);
  }

  // 実検査数を必ず出す（緑を見たら「何件検査したか」を確認できるように）
  console.log(`${TAG} 実検査 ${r.count} 件（日付あり ${r.datedCount ?? 0} 件）／転記 ${r.updatedAt ?? '-'}（${r.updatedAge ?? '-'} 日前）／最終売上 ${r.latest ?? '-'}（${r.latestAge ?? '-'} 日前）`);

  if (r.status === 'FAIL') {
    console.error(`${TAG} ✗ FAIL: ${r.reason}`);
    console.error('  note ダッシュボードから取り直す: npm run note-sales-fetch -- --month <YYYY-MM>');
    console.error('  手順と検算の規約 → .claude/knowledge/reference/sales-tracking.md「取得と検算」');
    process.exit(1);
  }
  if (r.status === 'WARN') {
    console.log(`${TAG} ⚠ WARN: ${r.reason} — そろそろ取り直す`);
    process.exit(0);
  }
  console.log(`${TAG} ✓ 転記は最新（${STALE_WARN} 日以内）`);
  process.exit(0);
}
