#!/usr/bin/env node
/**
 * KDP 月次ロイヤリティ台帳が、確定値の取得サイクルから脱落していないかを検査する。
 *
 * - 毎月16日以降: 前月の確定値（estimated:false）が必要
 * - 毎月28日以降: 当月の推計値も必要
 * - 共有KDP口座のうち、doboku-note catalog のLIVE書籍（対象月末までに出版した本）が全冊取得できること
 *
 * 取得自体はログインが必要な `npm run kdp-report` が担う。この検査はコミット済み台帳だけを読み、
 * 他サイトの書籍は母数に入れず、日次 ops-audit から「取得が止まった」ことを通知する。
 */
import { existsSync, readFileSync, writeSync } from 'node:fs';
import { kdpLiveBookIdsAsOf } from './lib/kindle-catalog.mjs';

const STATE = '.claude/state/sales/kdp-royalties.json';
const CATALOG = 'scripts/kindle-published/catalog.json';
const FINAL_DUE_DAY = 16;
const ESTIMATE_DUE_DAY = 28;
const JSON_OUT = process.argv.includes('--json');
const TAG = '[check-kdp-report-freshness]';

function jstParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const get = (type) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

function shiftMonth(year, month, delta) {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function validateMonth(month, entry, { requireFinal = false, expectedBookIds = [] } = {}) {
  const issues = [];
  if (!entry || typeof entry !== 'object') return [`${month} の記録が無い`];
  if (requireFinal && entry.estimated !== false) issues.push(`${month} が確定値でない（estimated:false が必要）`);
  if (!entry.range || entry.range.start !== `${month}-01` || !String(entry.range.end || '').startsWith(`${month}-`)) {
    issues.push(`${month} の期間が不正`);
  }
  const books = Array.isArray(entry.books) ? entry.books : [];
  if (!Number.isInteger(entry.total?.bookCount) || entry.total.bookCount <= 0) issues.push(`${month} の口座合計冊数が読めない`);
  if (!expectedBookIds.length) issues.push('doboku-note のLIVE書籍がcatalogに1冊も無い');
  const found = new Set(books.map((book) => book?.bookId).filter(Boolean));
  const missing = expectedBookIds.filter((id) => !found.has(id));
  if (missing.length) issues.push(`${month} のdoboku-note書籍が ${found.size}/${expectedBookIds.length} 冊（不足: ${missing.join(', ')})`);
  const duplicates = books.map((book) => book?.bookId).filter(Boolean).filter((id, index, ids) => ids.indexOf(id) !== index);
  if (duplicates.length) issues.push(`${month} のbookIdが重複（${[...new Set(duplicates)].join(', ')}）`);
  if (!Number.isInteger(entry.total?.royalty) || entry.total.royalty < 0) issues.push(`${month} のロイヤリティ合計が不正`);
  return issues;
}

function monthEnd(month) {
  const [y, m] = month.split('-').map(Number);
  return `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`;
}

/**
 * expected は書籍 ID の配列、または catalog の books（{ id, status, publishedDate }）。
 * books を渡すと月ごとに「その月末までに LIVE だった本」だけを母数にする（月の後に出版した本で偽 FAIL しない）。
 */
export function assessKdpReport(state, now = new Date(), expected = []) {
  const expectedFor = (month) => (expected.every((x) => typeof x === 'string') ? expected : kdpLiveBookIdsAsOf(expected, monthEnd(month)));
  const { year, month, day } = jstParts(now);
  const currentMonth = shiftMonth(year, month, 0);
  const finalMonth = shiftMonth(year, month, day >= FINAL_DUE_DAY ? -1 : -2);
  const due = [{ month: finalMonth, kind: 'final' }];
  if (day >= ESTIMATE_DUE_DAY) due.push({ month: currentMonth, kind: 'estimate' });

  const months = state?.months && typeof state.months === 'object' ? state.months : null;
  if (!months) return { status: 'FAIL', reason: 'months が無い（スキーマ破損）', due, checkedMonths: 0, checkedBooks: 0 };

  const issues = [];
  let checkedBooks = 0;
  for (const target of due) {
    const entry = months[target.month];
    checkedBooks += Array.isArray(entry?.books) ? entry.books.length : 0;
    issues.push(...validateMonth(target.month, entry, { requireFinal: target.kind === 'final', expectedBookIds: expectedFor(target.month) }));
  }
  return {
    status: issues.length ? 'FAIL' : 'OK',
    reason: issues.length ? issues.join(' / ') : null,
    due,
    checkedMonths: due.length,
    checkedBooks,
    updatedAt: state?.updatedAt ?? null,
  };
}

const isMain = process.argv[1]?.endsWith('check-kdp-report-freshness.mjs');
if (isMain) {
  if (!existsSync(STATE)) {
    console.error(`${TAG} FAIL: ${STATE} が無い`);
    process.exit(1);
  }
  let state;
  try { state = JSON.parse(readFileSync(STATE, 'utf8')); }
  catch (error) {
    console.error(`${TAG} FAIL: ${STATE} を JSON として読めない — ${error.message}`);
    process.exit(1);
  }
  let catalog;
  try { catalog = JSON.parse(readFileSync(CATALOG, 'utf8')); }
  catch (error) {
    console.error(`${TAG} FAIL: ${CATALOG} を読めない — ${error.message}`);
    process.exit(1);
  }
  const catalogBooks = catalog.books ?? [];
  const expectedBookIds = kdpLiveBookIdsAsOf(catalogBooks, '9999-12-31');
  const result = assessKdpReport(state, new Date(), catalogBooks);
  if (JSON_OUT) {
    writeSync(1, `${JSON.stringify({ check: 'kdp-report-freshness', finalDueDay: FINAL_DUE_DAY, estimateDueDay: ESTIMATE_DUE_DAY, ...result }, null, 2)}\n`);
  } else {
    const targets = result.due.map((x) => `${x.month}:${x.kind}`).join(', ');
    console.log(`${TAG} 実検査 ${result.checkedMonths} 月・口座書籍行 ${result.checkedBooks} 件・doboku-note LIVE ${expectedBookIds.length} 冊／対象 ${targets}／台帳更新 ${result.updatedAt ?? '-'}`);
    if (result.status === 'FAIL') {
      console.error(`${TAG} ✗ FAIL: ${result.reason}`);
      console.error('  npm run kdp-report -- --month YYYY-MM で対象月を取得する。翌月16日以降は前月を再取得して確定値へ更新する');
    } else console.log(`${TAG} ✓ KDP 月次ロイヤリティ取得は期限内`);
  }
  process.exitCode = result.status === 'FAIL' ? 1 : 0;
}
