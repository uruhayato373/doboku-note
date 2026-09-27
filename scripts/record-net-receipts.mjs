#!/usr/bin/env node
/**
 * record-net-receipts.mjs — 月の受取額（NSM・netReceipts）を取得して事業の計測記録に書く（月次レビューの取得手順）。
 *
 * - note: 売上管理の月別詳細（/dashboard/salesmanage?datespan=YYYYMM）の「手数料控除後売上」を
 *   note-sales-fetch と同じ永続プロファイルで read-only 取得する（パスワード再確認が出たら ABORT・人が通す）
 * - KDP: .claude/state/sales/kdp-royalties.json の同月（npm run kdp-report で取得済み・確定値のみ complete）
 * - ココナラ: 売上履歴の手数料控除後（クローズ日で計上）を --coconala <円> で渡す（自動取得は未実装）
 * 組み立ては scripts/lib/net-receipts.mjs。記録は npm run business-review -- record（同じ検証を通す）。
 *
 * 使い方:
 *   npm run record-net-receipts -- --month 2026-09 --coconala 15600          # dry-run（記録しない）
 *   npm run record-net-receipts -- --month 2026-09 --coconala 15600 --commit # 記録する
 *   npm run record-net-receipts -- --month 2026-09 --note-net 78560 ...       # note をブラウザで取らずに値を渡す
 * 終了コード: 0＝組み立てた（partial を含む）/ 2＝note を取得できなかった（検査不成立）
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildNetReceiptsMeasurement, kdpCatalogRoyalty, parseNoteSalesDetail } from './lib/net-receipts.mjs';

const TAG = '[record-net-receipts]';
const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
const MONTH = arg('--month');
const COMMIT = argv.includes('--commit');
if (!/^\d{4}-\d{2}$/.test(MONTH ?? '')) {
  console.error(`${TAG} --month YYYY-MM が必要`);
  process.exit(1);
}

async function fetchNote(month) {
  const { chromium } = await import('playwright');
  const { resolveProfileDir } = await import('./lib/playwright-auth-profile.mjs');
  const { leanContextOptions } = await import('./lib/playwright-launch.mjs');
  const ctx = await chromium.launchPersistentContext(resolveProfileDir('note', { cwd: ROOT, repoRoot: ROOT }), leanContextOptions({
    headless: false,
    channel: 'chrome',
    viewport: { width: 1300, height: 1000 },
    args: ['--disable-blink-features=AutomationControlled'],
  }));
  try {
    const page = ctx.pages()[0] || (await ctx.newPage());
    await page.goto(`https://note.com/dashboard/salesmanage?datespan=${month.replace('-', '')}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 4000));
    const text = await page.evaluate(() => document.body.innerText || '');
    if (/パスワード/.test(text) && !/手数料控除後売上/.test(text)) throw new Error('パスワード再確認画面が出ている（人が通してから再実行する）');
    const [y, m] = month.split('-').map(Number);
    if (!text.includes(`${y}年${m}月の売上詳細`)) throw new Error(`「${y}年${m}月の売上詳細」が見つからない（URL・DOM の変更を疑う）`);
    return parseNoteSalesDetail(text);
  } finally {
    await ctx.close();
  }
}

async function main() {
  let note;
  if (arg('--note-net') != null) note = { gross: null, fee: null, net: Number(arg('--note-net')) };
  else {
    try {
      note = await fetchNote(MONTH);
    } catch (e) {
      console.error(`${TAG} 検査不成立: note を取得できなかった — ${e.message}`);
      return 2;
    }
  }
  const kdpPath = join(ROOT, '.claude/state/sales/kdp-royalties.json');
  const kdp = existsSync(kdpPath) ? kdpCatalogRoyalty(JSON.parse(readFileSync(kdpPath, 'utf8')).months?.[MONTH]) : null;
  const coconala = arg('--coconala') != null ? Number(arg('--coconala')) : null;
  const record = buildNetReceiptsMeasurement({ month: MONTH, note, coconala, kdp });

  console.log(`${TAG} ${MONTH}: note ${note?.net ?? '—'} / ココナラ ${coconala ?? '—'} / KDP ${kdp ? `${kdp.royalty}${kdp.estimated ? '（推計）' : ''}` : '—'} → 受取額 ${record.values.netReceipts ?? '—'}（${record.coverage}）`);
  mkdirSync(join(ROOT, '.tmp'), { recursive: true });
  const input = join(ROOT, '.tmp', `net-receipts-${MONTH}.json`);
  writeFileSync(input, JSON.stringify(record, null, 2) + '\n');
  const out = execFileSync(process.execPath, [join(ROOT, 'scripts/business-review.mjs'), 'record', '--input', input, ...(COMMIT ? ['--commit'] : [])], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
  process.stdout.write(out);
  return 0;
}

process.exitCode = await main();
