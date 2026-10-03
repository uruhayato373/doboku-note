#!/usr/bin/env node
import { resolveProfileDir } from './lib/playwright-auth-profile.mjs';
/**
 * note-magazine-delete.mjs
 * ---------------------------------------------------------------------------
 * note の無料・有料マガジンを削除する Playwright ツール（収録記事は削除されない）。
 *
 * 手順（noteヘルプ「マガジンを削除する」・2026-10-01 確認）:
 *   マガジン編集画面 note.com/{creator}/m/{key}/edit → ページ左下「マガジン削除」→ 確認「削除する」。
 *   定期購読マガジンは削除できない（廃刊手続き）。メンバーシップ特典に紐づくマガジンは
 *   プランとの紐付けを外してからでないと削除できない（その場合は中断する）。
 *
 * 安全弁（収益アカウントのため）:
 *   1. account=dobokunote を assert（不一致は即中断）
 *   2. 既定は PROBE（編集画面を開いて「マガジン削除」ボタンの有無とマガジン名を表示するだけ）
 *   3. --commit で削除。削除後に公開 API（/api/v1/magazines/{key}/notes）で消えたかを確かめる
 *
 * 使い方:
 *   node scripts/note-magazine-delete.mjs --keys m1,m2           # PROBE
 *   node scripts/note-magazine-delete.mjs --keys m1,m2 --commit  # 削除
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { leanContextOptions } from './lib/playwright-launch.mjs';
import { NOTE_CREATOR as CREATOR } from './lib/site-identity.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE = resolveProfileDir('note', { cwd: ROOT, repoRoot: ROOT });
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const KEYS = (getArg('--keys') || '').split(',').map((k) => k.trim()).filter(Boolean);
const COMMIT = argv.includes('--commit');
if (!KEYS.length || !KEYS.every((k) => /^m[0-9a-f]+$/.test(k))) {
  console.error('使い方: node scripts/note-magazine-delete.mjs --keys m1,m2 [--commit]');
  process.exit(1);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 公開 API でマガジンが引けるか。取得失敗（非 JSON）は null＝判定不能として「消えた」と扱わない。 */
function magazineExists(key) {
  const r = spawnSync('curl', ['-sS', '-m', '30', '--ssl-no-revoke', '-H', 'User-Agent: Mozilla/5.0', '-o', '-', '-w', '\n%{http_code}', `https://note.com/api/v1/magazines/${key}/notes?page=1`], { encoding: 'utf-8', maxBuffer: 16 * 1024 * 1024 });
  const lines = (r.stdout || '').trim().split('\n');
  const code = Number(lines.pop());
  if (code === 404) return false;
  if (code === 200) return true;
  return null;
}

const ctx = await chromium.launchPersistentContext(PROFILE, leanContextOptions({
  headless: false, channel: 'chrome', proxy: PROXY ? { server: PROXY } : undefined,
  ignoreHTTPSErrors: true, viewport: { width: 1366, height: 1100 }, args: ['--disable-blink-features=AutomationControlled'],
}));
const results = [];
try {
  const page = ctx.pages()[0] || (await ctx.newPage());
  await page.goto('https://note.com/settings/account', { waitUntil: 'domcontentloaded', timeout: 60000 });
  let acct = false;
  for (let i = 0; i < 12 && !acct; i++) { await sleep(2500); const t = await page.evaluate(() => document.body.innerText || '').catch(() => ''); acct = /dobokunote/.test(t); }
  if (!acct) { console.error('ABORT: account != dobokunote'); process.exitCode = 2; throw new Error('account'); }
  console.log('[1] account gate OK (dobokunote)');

  for (const key of KEYS) {
    console.log(`\n=== ${key} ===`);
    await page.goto(`https://note.com/${CREATOR}/m/${key}/edit`, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
    await sleep(3500);
    const name = await page.locator('input[type="text"]').first().inputValue().catch(() => '');
    const delBtn = page.getByRole('button', { name: 'マガジン削除' }).or(page.getByText('マガジン削除', { exact: true }));
    const hasDel = (await delBtn.count()) > 0;
    console.log(`[2] マガジン名: ${JSON.stringify(name)} / 「マガジン削除」ボタン: ${hasDel ? 'あり' : 'なし'}`);
    if (!name || !hasDel) { results.push({ key, status: 'not-found' }); await page.screenshot({ path: join(ROOT, `.tmp/note-magazine-delete-${key}.png`) }).catch(() => {}); continue; }
    if (!COMMIT) { results.push({ key, status: 'probe', name }); continue; }

    await delBtn.first().scrollIntoViewIfNeeded().catch(() => {});
    await delBtn.first().click({ timeout: 8000 }); await sleep(2000);
    const body = await page.evaluate(() => document.body.innerText || '');
    if (/紐付けを解除/.test(body)) { console.error('ABORT: メンバーシップのプランに紐づいている（紐付けを外してから再実行）'); results.push({ key, status: 'membership-linked', name }); continue; }
    let confirmed = false;
    for (const label of ['削除する', '削除']) {
      const b = page.getByRole('button', { name: label, exact: true });
      if (await b.count()) { try { await b.last().click({ timeout: 5000 }); confirmed = true; console.log('[3] 確認:', label); break; } catch {} }
    }
    if (!confirmed) { console.error('ABORT: 確認ダイアログの「削除する」未検出'); await page.screenshot({ path: join(ROOT, `.tmp/note-magazine-delete-${key}.png`) }).catch(() => {}); results.push({ key, status: 'no-confirm', name }); break; }
    await sleep(5000);
    const exists = magazineExists(key);
    console.log(`[4] 削除後 公開 API: ${exists === false ? '404（消滅 ✓）' : exists ? 'まだ存在' : '判定不能（取得失敗）'}`);
    results.push({ key, status: exists === false ? 'deleted' : exists ? 'still-exists' : 'unverified', name });
  }
} catch (e) {
  if (e.message !== 'account') { console.error('ERROR:', e.message.split('\n')[0]); process.exitCode = 1; }
} finally { await ctx.close(); }

const n = (st) => results.filter((r) => r.status === st).length;
console.log(`\n[summary] 対象 ${KEYS.length} 件 / 処理 ${results.length} 件 / 削除 ${n('deleted')} / 未確認 ${n('still-exists') + n('unverified')} / 見つからない ${n('not-found')} / probe ${n('probe')}`);
for (const r of results) if (!['deleted', 'probe'].includes(r.status)) console.log(`  ${r.status}\t${r.key}\t${r.name || ''}`);
if (!process.exitCode && (results.length < KEYS.length || results.some((r) => !['deleted', 'probe'].includes(r.status)))) process.exitCode = 6;
