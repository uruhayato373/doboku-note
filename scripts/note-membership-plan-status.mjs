#!/usr/bin/env node
/**
 * note-membership-plan-status.mjs
 * ---------------------------------------------------------------------------
 * note メンバーシップ プランの**ライフサイクル操作**＝公開トグルの ON/OFF と削除。
 * 内容（会費/定員/特典マガジン）の編集は note-membership-plan-edit.mjs の担当で、
 * ここは「棚に出す・下げる・捨てる」だけを扱う。
 *
 * 実機仕様（2026-08-06）:
 *   - 公開/非公開は `/membership/settings/manage` の**各プラン行のトグル**。可逆。
 *     新規作成したプランは OFF（非公開）で始まり、ON にするまで加入ページに出ない。
 *   - 削除は各プランの編集ページの「削除」ボタン。**不可逆**。
 *
 * 安全設計:
 *   - 既定は dry-run。実行は `--commit`。
 *   - account=dobokunote を assert。
 *   - **削除は会員0名を確認できたときだけ**実行する（メンバー一覧に同名プランの
 *     在籍者が1人でも居れば中断）。プラン名が重複していると判別できないので、
 *     その場合も安全側に倒して中断する。
 *   - 操作後は状態を読み戻して確認する（「押した」を成功と呼ばない）。
 *
 * 使い方:
 *   node scripts/note-membership-plan-status.mjs --plan <id> --publish            # dry-run
 *   node scripts/note-membership-plan-status.mjs --plan <id> --publish --commit
 *   node scripts/note-membership-plan-status.mjs --plan <id> --unpublish --commit
 *   node scripts/note-membership-plan-status.mjs --plan <id> --delete --commit    # 不可逆
 *
 * 真実源: memory `note-membership-publish` / エージェント: note-membership-operator
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE = join(ROOT, '.local/playwright-note-profile');
const TMP = join(ROOT, '.tmp');
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const PLAN = getArg('--plan');
const COMMIT = argv.includes('--commit');
const ACTION = argv.includes('--delete') ? 'delete' : argv.includes('--unpublish') ? 'unpublish' : argv.includes('--publish') ? 'publish' : '';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!PLAN || !ACTION) { console.error('必須: --plan <planId> と --publish / --unpublish / --delete のいずれか'); process.exit(1); }
mkdirSync(TMP, { recursive: true });

const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: false, channel: 'chrome', proxy: PROXY ? { server: PROXY } : undefined,
  ignoreHTTPSErrors: true, viewport: { width: 1366, height: 1000 }, args: ['--disable-blink-features=AutomationControlled'],
});
try {
  const page = ctx.pages()[0] || (await ctx.newPage());
  await page.goto('https://note.com/settings/account', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(3500);
  if (!/dobokunote/.test(await page.evaluate(() => document.body.innerText || ''))) {
    console.error('ABORT: account != dobokunote'); await ctx.close(); process.exit(2);
  }
  console.log('[1] account gate OK (dobokunote)');

  // プラン行（名前・価格・公開状態）を manage から読む。行の特定は編集リンクの planId。
  const readRow = async () => {
    await page.goto('https://note.com/membership/settings/manage', { waitUntil: 'domcontentloaded', timeout: 60000 });
    try { await page.waitForLoadState('networkidle', { timeout: 20000 }); } catch {}
    await sleep(3500);
    return await page.evaluate((planId) => {
      const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
      const link = [...document.querySelectorAll('a[href*="/plans/"]')].find((a) => (a.getAttribute('href') || '').includes(planId));
      if (!link) return null;
      // プラン行 = 名前・価格・公開トグル・編集 を含む最小の祖先
      let row = link;
      for (let i = 0; i < 8 && row; i++, row = row.parentElement) {
        const t = norm(row.innerText);
        // 価格表記は「¥4,980/月」（"円" は使われない・2026-08-06 実測）。
        if (/[¥￥][\d,]+\s*\/\s*月/.test(t) && /公開/.test(t) && t.length < 200) break;
      }
      if (!row) return null;
      const sw = row.querySelector('[role=switch],input[type=checkbox]');
      row.setAttribute('data-np-row', '1');
      if (sw) sw.setAttribute('data-np-toggle', '1');
      return { text: norm(row.innerText), published: sw ? (sw.getAttribute('aria-checked') === 'true' || !!sw.checked) : null };
    }, PLAN);
  };

  const row = await readRow();
  if (!row) { console.error(`ABORT: planId=${PLAN} の行を manage で特定できず`); await ctx.close(); process.exit(3); }
  console.log(`[2] 対象: ${row.text} / 公開=${row.published}`);

  if (ACTION === 'delete') {
    // 会員0名ゲート: メンバー一覧に「同名プラン」の在籍者が居れば中断（名前重複時も安全側）。
    const planName = (row.text.match(/^(.+?)\s*[¥￥]/) || [])[1]?.trim() || '';
    await page.goto('https://note.com/membership/settings/members', { waitUntil: 'domcontentloaded', timeout: 60000 });
    try { await page.waitForLoadState('networkidle', { timeout: 20000 }); } catch {}
    await sleep(3500);
    const members = await page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' '));
    // note のメンバー一覧はプラン名を省略表示することがあるので、先頭6文字で照合する
    const key = planName.slice(0, 6);
    const hit = key && members.includes(key);
    console.log(`[3] 会員ゲート: プラン名="${planName}" 照合キー="${key}" 在籍ヒット=${hit}`);
    if (hit) { console.error('ABORT: このプランに在籍者が居る可能性がある → 削除しない'); await ctx.close(); process.exit(4); }
  }

  if (!COMMIT) {
    console.log(`\n[dry-run] action=${ACTION} を実行せず終了。実行は --commit。`);
    await ctx.close(); process.exit(0);
  }

  if (ACTION === 'publish' || ACTION === 'unpublish') {
    const want = ACTION === 'publish';
    if (row.published === want) { console.log(`[4] 既に ${want ? '公開' : '非公開'} → 何もしない`); await ctx.close(); process.exit(0); }
    await readRow(); // data 属性を貼り直す（再描画対策）
    const clicked = await page.evaluate(() => {
      const el = document.querySelector('[data-np-toggle="1"]');
      if (!el) return false; el.scrollIntoView({ block: 'center' }); el.click(); return true;
    });
    console.log('[4] トグル click =', clicked);
    if (!clicked) { console.error('ABORT: 公開トグルを特定できず'); await ctx.close(); process.exit(5); }
    await sleep(4000);
    // ダイアログで確認を求められる場合に備える（「公開する」等）
    const dlg = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => /^(公開する|非公開にする|OK|はい)$/.test((x.innerText || '').trim()));
      if (!b) return ''; b.click(); return (b.innerText || '').trim();
    });
    if (dlg) { console.log('[4] 確認ダイアログ:', dlg); await sleep(3500); }
    const after = await readRow();
    console.log(`[5] 検証: 公開=${after?.published}（期待 ${want}）`);
    await page.screenshot({ path: join(TMP, `mplan-status-${PLAN}.png`), fullPage: true });
    if (after?.published !== want) { console.error('FAIL: 状態が変わっていない'); process.exitCode = 6; }
    else console.log(`[done] ${want ? '公開' : '非公開'}に変更`);
  }

  if (ACTION === 'delete') {
    await page.goto(`https://note.com/membership/settings/plans/${PLAN}/edit`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    try { await page.waitForLoadState('networkidle', { timeout: 20000 }); } catch {}
    await sleep(4000);
    // 編集ページのプラン名（削除ダイアログの確認入力に使う）
    const planNameOnPage = await page.evaluate(() =>
      ([...document.querySelectorAll('input[type=text]')].find((i) => i.name !== 'q')?.value || '').trim());
    if (!planNameOnPage) { console.error('ABORT: プラン名を読めず'); await ctx.close(); process.exit(7); }
    const del = page.getByRole('button', { name: '削除', exact: true });
    if (!(await del.count())) { console.error('ABORT: 「削除」ボタン未検出'); await ctx.close(); process.exit(7); }
    await del.first().click(); await sleep(2500);
    await page.screenshot({ path: join(TMP, `mplan-delete-${PLAN}-dialog.png`), fullPage: true });
    // 削除ダイアログは **プラン名の入力**を求める二段確認（2026-08-06 実測）。
    // 入力するまで「削除」は disabled なので、名前を入れてから有効化を待って押す。
    const dlgInput = page.locator('input[type=text]:not([name="q"])').last();
    await dlgInput.fill(planNameOnPage).catch(() => {});
    await sleep(800);
    const dlgDel = page.getByRole('button', { name: '削除', exact: true }).last();
    let enabled = false;
    for (let i = 0; i < 12 && !enabled; i++) {
      enabled = !(await dlgDel.isDisabled().catch(() => true));
      if (!enabled) await sleep(400);
    }
    console.log(`[4] 削除ダイアログ: 名前="${planNameOnPage}" 確認ボタン有効=${enabled}`);
    if (!enabled) { console.error('ABORT: 削除ボタンが有効にならず（削除しない）'); await ctx.close(); process.exit(9); }
    await dlgDel.click();
    await sleep(6000);
    const after = await readRow();
    console.log(`[5] 検証: manage に行が ${after ? '残っている' : '無い'}`);
    await page.screenshot({ path: join(TMP, `mplan-delete-${PLAN}-after.png`), fullPage: true });
    if (after) { console.error('FAIL: プランが削除されていない'); process.exitCode = 8; }
    else console.log('[done] プランを削除');
  }
} finally {
  await ctx.close();
}
