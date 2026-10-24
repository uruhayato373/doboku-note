#!/usr/bin/env node
/**
 * coconala-revenue.mjs — ココナラの売上履歴（/mypage/revenue）を read-only で読み、data/coconala/revenue.json に書く
 * ---------------------------------------------------------------------------
 * なぜ必要か: 月の受取額（NSM）のココナラ分（手数料控除後・クローズ日で計上）は人が画面を見て --coconala に渡していて、
 *   月の途中経過を出せず、月次の記録も人待ちだった（2026-10-11）。土曜の Mac 収集（weekly-collect の coconala 段）で取り直す。
 * 安全弁: account assert・read-only（振込申請などの操作はしない）・購入者名とサービス名は記録しない。
 *   行の合計が「累積売上」と一致しないときは 1 バイトも書かない（取りこぼし・ページ送りの見落とし）。
 * 使い方:
 *   node scripts/coconala-revenue.mjs              # 取得して書く
 *   node scripts/coconala-revenue.mjs --dry-run    # 書かずに表示だけ
 *   node scripts/coconala-revenue.mjs --headless
 * exit: 0=書いた（dry-run を含む）/ 2=取得不成立（未ログイン・アカウント不一致・累積売上と不一致・0 行）
 * ---------------------------------------------------------------------------
 */
import { launchContext, waitForLogin, assertAccount } from './lib/coconala-session.mjs';
import { parseCoconalaRevenue, reconcileRevenue } from './lib/coconala-revenue.mjs';
import { writeDataset } from './lib/dataset-write.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

const TAG = '[coconala-revenue]';
const HEADLESS = process.argv.includes('--headless');
const DRY = process.argv.includes('--dry-run');

async function main() {
  const ctx = await launchContext({ headless: HEADLESS });
  try {
    const page = ctx.pages()[0] || (await ctx.newPage());
    const login = await waitForLogin(page, { tag: TAG });
    if (!login.ok) { console.error(`${TAG} x ${login.reason}`); return 2; }
    const acct = await assertAccount(page, { tag: TAG });
    if (!acct.ok) { console.error(`${TAG} x アカウント不一致で中断: ${acct.reason}`); return 2; }
    await page.goto('https://coconala.com/mypage/revenue', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    const parsed = parseCoconalaRevenue(await page.evaluate(() => document.body.innerText || ''));
    const check = reconcileRevenue(parsed);
    console.log(`${TAG} 売上履歴 ${parsed.rows.length} 行 / 行の合計 ¥${check.sum.toLocaleString('ja-JP')} / 累積売上 ${check.expected == null ? '読めず' : `¥${check.expected.toLocaleString('ja-JP')}`}`);
    if (!parsed.rows.length && parsed.cumulativeYen !== 0) { console.error(`${TAG} x 売上履歴を 1 行も読めない（画面の変更を疑う）。書かない`); return 2; }
    if (!check.ok) { console.error(`${TAG} x 行の合計が累積売上と合わない（取りこぼし・ページ送り）。書かない`); return 2; }
    const months = {};
    for (const r of parsed.rows) months[r.closedAt.slice(0, 7)] = (months[r.closedAt.slice(0, 7)] ?? 0) + r.netYen;
    console.log(`${TAG} 月別（控除後）: ${Object.entries(months).sort().map(([m, v]) => `${m} ¥${v.toLocaleString('ja-JP')}`).join(' / ')}`);
    if (DRY) { console.log(`${TAG} dry-run: 書かない（保存先 ${datasetPath('coconala.revenue')}）`); return 0; }
    writeDataset(ROOT, 'coconala.revenue', {
      schemaVersion: 1,
      fetchedAt: new Date().toISOString(),
      source: 'ココナラ 売上管理・振込申請（/mypage/revenue）の売上履歴を npm run coconala-revenue で read-only 取得。手数料控除後・クローズ日で計上',
      cumulativeYen: parsed.cumulativeYen,
      rows: parsed.rows,
    });
    console.log(`${TAG} ${datasetPath('coconala.revenue')} を更新`);
    return 0;
  } finally {
    await ctx.close();
  }
}

process.exitCode = await main();
