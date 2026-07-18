#!/usr/bin/env node
/**
 * coconala-profile.mjs — ココナラ出品者プロフィールの自己紹介を account.json から設定
 * ---------------------------------------------------------------------------
 * .claude/config/coconala-account.json の profile（job / appeal / bio）を
 * プロフィール編集ページ（/users/{id}/edit 相当）へ流し込む。Vue SPA・input に
 * name/id が無いため placeholder で識別。各セクションの「保存する」を押す。
 * 画像（avatar/cover）はクロッパを挟むため本スクリプトでは扱わない（別途 --image 系 or 手動）。
 *
 * 使い方: node scripts/coconala-profile.mjs [--commit]   （既定 dry=fill のみ・--commit で保存）
 * ---------------------------------------------------------------------------
 */
import { launchContext, waitForLogin, assertAccount, sleep, readAccount, ROOT } from './lib/coconala-session.mjs';
import { join } from 'node:path';

const COMMIT = process.argv.includes('--commit');
const acct = readAccount();
const p = acct.profile;
if (!p || !p.bio) { console.error('ABORT: account.json に profile.bio が無い'); process.exit(1); }

const ctx = await launchContext({ headless: false });
try {
  const page = ctx.pages()[0] || (await ctx.newPage());
  const lg = await waitForLogin(page, { tag: '[profile]' });
  if (!lg.ok) { console.error('ABORT:', lg.reason); await ctx.close(); process.exit(2); }
  const acc = await assertAccount(page, { tag: '[profile]' });
  if (!acc.ok) { console.error('ABORT:', acc.reason); await ctx.close(); process.exit(2); }

  // プロフィール編集ページへ（設定ページの「プロフィール編集」リンクを辿る）
  await page.goto('https://coconala.com/mypage/profile', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2500);
  const href = await page.evaluate(() => { const a = Array.from(document.querySelectorAll('a')).find((x) => /プロフィール編集/.test(x.innerText || '')); return a ? a.href : null; });
  if (!href) { console.error('ABORT: プロフィール編集リンク未検出'); await ctx.close(); process.exit(3); }
  await page.goto(href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  try { await page.waitForLoadState('networkidle', { timeout: 20000 }); } catch {}
  await sleep(4000);
  console.log('[1] プロフィール編集:', page.url());

  // placeholder でフィールドを特定して Vue の v-model へ反映（input/keyup/change/blur）
  async function fillByPlaceholder(tag, phPart, value) {
    const ok = await page.evaluate(({ tag, phPart, value }) => {
      const el = Array.from(document.querySelectorAll(tag)).find((e) => (e.placeholder || '').includes(phPart));
      if (!el) return false;
      el.focus();
      const setter = Object.getOwnPropertyDescriptor(window[tag === 'textarea' ? 'HTMLTextAreaElement' : 'HTMLInputElement'].prototype, 'value').set;
      setter.call(el, value);
      for (const t of ['input', 'keyup', 'change', 'blur']) el.dispatchEvent(new Event(t, { bubbles: true }));
      return true;
    }, { tag, phPart, value });
    return ok;
  }
  // 該当フィールドのセクション（カード）内の「保存する」を押す
  async function saveSection(tag, phPart) {
    return page.evaluate(({ tag, phPart }) => {
      const el = Array.from(document.querySelectorAll(tag)).find((e) => (e.placeholder || '').includes(phPart));
      if (!el) return 'field なし';
      let card = el.closest('section,form,div');
      for (let up = 0; up < 8 && card; up++) {
        const btn = Array.from(card.querySelectorAll('button')).find((b) => /保存する/.test(b.innerText || ''));
        if (btn) { btn.scrollIntoView({ block: 'center' }); btn.click(); return 'saved'; }
        card = card.parentElement;
      }
      return '保存ボタンなし';
    }, { tag, phPart });
  }

  const r1 = await fillByPlaceholder('input', '広告クリエイター', p.job);
  const r2 = await fillByPlaceholder('input', '思いを伝える', p.appeal);
  const r3 = await fillByPlaceholder('textarea', 'ロゴデザインを', p.bio);
  console.log(`[2] fill 職業=${r1} アピール=${r2} 自己紹介文=${r3}`);
  await sleep(800);
  await page.screenshot({ path: join(ROOT, '.tmp/coconala/profile-filled.png'), fullPage: true }).catch(() => {});

  if (!COMMIT) { console.log('[dry] --commit なし＝保存しない（.tmp/coconala/profile-filled.png で確認）'); await ctx.close(); process.exit(0); }

  // 保存（職業セクション → 自己紹介セクション）
  const s1 = await saveSection('input', '広告クリエイター'); await sleep(2500);
  const s2 = await saveSection('textarea', 'ロゴデザインを'); await sleep(2500);
  console.log(`[3] 保存 職業=${s1} 自己紹介=${s2}`);
  await page.screenshot({ path: join(ROOT, '.tmp/coconala/profile-saved.png'), fullPage: true }).catch(() => {});
  console.log('RESULT:', JSON.stringify({ job: r1, appeal: r2, bio: r3, saveJob: s1, saveBio: s2 }));
} finally { await ctx.close(); }
