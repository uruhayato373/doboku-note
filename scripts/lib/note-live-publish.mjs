/**
 * note-live-publish.mjs — 公開済み note 記事をライブ更新する共有フロー。
 *
 * 呼び出し元は本文編集を完了し、保存前ゲートを通したあとに呼ぶこと。
 * 「公開に進む」→境界処理→「更新する」→通知「いいえ」までを担当する。
 */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 公開に進む →（有料なら境界設定）→ 更新する → 更新通知「いいえ」。
 * @param {import('playwright').Page} page
 * @param {string} noteId
 * @param {string} boundary 有料境界に使う H2 の先頭一致正規表現
 * @param {boolean} isPaid notePricing: paid のとき true
 * @param {{keepBoundary?: boolean, trialLineBottom?: boolean, screenshotPrefix?: string}} options
 * @returns {Promise<boolean>}
 */
export async function publishLive(
  page,
  noteId,
  boundary = '試験問題|予想問題',
  isPaid = true,
  { keepBoundary = false, trialLineBottom = false, screenshotPrefix = 'nu' } = {},
) {
  const shot = (name) => join(ROOT, `.tmp/${screenshotPrefix}-${name}-${noteId}.png`);

  // 公開に進む（自動保存の落ち着きを待ってからクリックし、設定ページ到達を polling）
  await sleep(3000);
  const next = page.getByRole('button', { name: '公開に進む' });
  if (!(await next.count())) {
    console.error('[5] ABORT: 「公開に進む」未検出。更新せず終了。');
    await page.screenshot({ path: shot('nonext') });
    return false;
  }
  let onSettings = false;
  for (let attempt = 0; attempt < 3 && !onSettings; attempt++) {
    if (await next.count()) await next.first().click();
    for (let i = 0; i < 8; i++) {
      await sleep(1800);
      const a = await page.getByRole('button', { name: '有料エリア設定' }).count();
      const u = await page.getByRole('button', { name: '更新する', exact: true }).count();
      const s = await page.getByRole('button', { name: '試し読みエリアを設定', exact: true }).count();
      if (a || u || s) { onSettings = true; break; }
    }
  }
  if (!onSettings) {
    console.error('[5] ABORT: 公開設定ページに到達せず。保存せず終了。');
    await page.screenshot({ path: shot('nosettings') });
    return false;
  }

  // 無料記事では note 側にボタンが見えても有料境界へ入らない。
  const area = isPaid ? page.getByRole('button', { name: '有料エリア設定' }) : { count: async () => 0 };
  if (!isPaid) console.log('[5b] 無料記事 → 有料境界の設定・検証をスキップ');
  if (await area.count() && keepBoundary) {
    console.log('[5b] 有料記事フロー（既存境界を保持・動かさない）');
    await area.first().click(); await sleep(3500);
    const hasLine = await page.evaluate(() => /このラインより先を有料にする/.test(document.body.innerText || ''));
    await page.screenshot({ path: shot('keepboundary') });
    console.log('[5b] 既存境界line=' + hasLine);
    if (!hasLine) {
      console.error('[5b] ABORT: 有料記事だが既存境界lineを確認できず。保存せず中断（paywall保護）。');
      return false;
    }
  } else if (await area.count()) {
    console.log('[5b] 有料記事フロー（境界を試験/予想問題 H2 直前へ再設定）');
    await area.first().click(); await sleep(3500);
    const target = await page.evaluate((pattern) => {
      const re = new RegExp('^(' + pattern + ')');
      const isLineButton = (el) =>
        (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') &&
        /ラインをこの場所に変更/.test(el.innerText || el.getAttribute('aria-label') || '');
      const sequence = Array.from(document.querySelectorAll('h1,h2,h3,button,[role=button]'));
      const headingIndex = sequence.findIndex((el) => el.tagName === 'H2' && re.test((el.innerText || '').trim()));
      if (headingIndex < 0) return { ok: false, reason: 'no boundary h2' };
      let button = null;
      for (let i = headingIndex - 1; i >= 0; i--) {
        if (isLineButton(sequence[i])) { button = sequence[i]; break; }
      }
      if (!button) return { ok: false, reason: 'no preceding line-button' };
      document.querySelectorAll('[data-np-target]').forEach((el) => el.removeAttribute('data-np-target'));
      button.setAttribute('data-np-target', '1');
      return { ok: true, heading: (sequence[headingIndex].innerText || '').slice(0, 24) };
    }, boundary);
    console.log('[5b] boundary target:', JSON.stringify(target));
    if (!target.ok) {
      console.error('[5b] ABORT: 有料境界の基準(試験/予想問題 H2)を特定できず。保存せず中断。--keep-boundary か --boundary-h2 を検討。');
      await page.screenshot({ path: shot('boundary') });
      return false;
    }
    const clicked = await page.evaluate(() => {
      const el = document.querySelector('[data-np-target="1"]');
      if (!el) return false;
      el.scrollIntoView({ block: 'center' });
      el.click();
      return true;
    });
    if (!clicked) {
      console.error('[5b] ABORT: data-np-target ボタンを DOM 上で特定できず。');
      await page.screenshot({ path: shot('boundary') });
      return false;
    }
    await sleep(2500);
    const verify = await page.evaluate((pattern) => {
      const re = new RegExp('^(' + pattern + ')');
      const sequence = Array.from(document.querySelectorAll('h1,h2,h3,p,button,[role=button]'));
      const lineIndex = sequence.findIndex((el) => /このラインより先を有料にする/.test(el.innerText || ''));
      const headingIndex = sequence.findIndex((el) => el.tagName === 'H2' && re.test((el.innerText || '').trim()));
      let between = 0;
      if (lineIndex >= 0 && headingIndex > lineIndex) {
        for (let i = lineIndex + 1; i < headingIndex; i++) {
          const text = (sequence[i].innerText || '').trim();
          if (text && !/ラインをこの場所に変更|このラインより先/.test(text)) between++;
        }
      }
      return { lineIdx: lineIndex, hIdx: headingIndex, between, boundaryBeforeExam: lineIndex >= 0 && headingIndex > lineIndex && between === 0 };
    }, boundary);
    console.log('[5b] boundary verify:', JSON.stringify(verify));
    await page.screenshot({ path: shot('boundary') });
    if (!verify.boundaryBeforeExam) {
      console.error('[5b] ABORT: 有料境界が「予想問題/試験問題」直前に揃わない。保存せず中断（paywall 保護）。');
      return false;
    }
  } else if (await page.getByRole('button', { name: '試し読みエリアを設定', exact: true }).count()) {
    console.log('[5b] メンバーシップ試し読みフロー' + (trialLineBottom ? '（ラインを末尾直前に設置＝ほぼ全文プレビュー）' : '（ラインを動かさず更新へ進む）'));
    await page.getByRole('button', { name: '試し読みエリアを設定', exact: true }).first().click();
    await sleep(4000);
    if (trialLineBottom) {
      const set = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('button,[role=button]')].filter((button) => /ラインをこの場所に変更/.test(button.innerText || ''));
        if (buttons.length < 2) return { ok: false, count: buttons.length };
        const selected = buttons[buttons.length - 2];
        selected.scrollIntoView({ block: 'center' });
        selected.click();
        return { ok: true, count: buttons.length };
      });
      await sleep(3000);
      const hasLine = await page.evaluate(() => document.querySelector('.paywall-line') !== null);
      console.log(`[5b] 試し読みライン設置(末尾-1): buttons=${set.count} 確定line(.paywall-line)=${hasLine}`);
      await page.screenshot({ path: shot('trialline') });
      if (!set.ok || !hasLine) {
        console.error('[5b] ABORT: 試し読みライン設置を確認できず。保存せず中断（会員境界保護）。');
        return false;
      }
    } else {
      await page.screenshot({ path: shot('trialarea') });
    }
  } else {
    console.log('[5b] 無料記事（有料エリア設定ボタンなし）→ 境界処理をスキップ');
  }

  let updated = false;
  for (const label of ['更新する', '更新']) {
    const button = page.getByRole('button', { name: label, exact: label === '更新する' });
    if (await button.count()) {
      await button.first().click();
      updated = true;
      console.log(`[5c] 「${label}」クリック`);
      break;
    }
  }
  if (!updated) {
    console.error('[5c] ABORT: 「更新する」未検出。');
    await page.screenshot({ path: shot('noupdate') });
    return false;
  }

  await sleep(2500);
  let notifyHandled = false;
  for (let i = 0; i < 6 && !notifyHandled; i++) {
    const no = page.getByRole('button', { name: 'いいえ', exact: true });
    if (await no.count()) {
      await no.first().click();
      notifyHandled = true;
      console.log('[5d] 更新通知ダイアログ→「いいえ」');
      break;
    }
    await sleep(1200);
  }
  if (!notifyHandled) console.log('[5d] 通知ダイアログ未検出（既に確定/通知なしの可能性）');
  await sleep(3000);
  await page.screenshot({ path: shot('done') });
  return true;
}
