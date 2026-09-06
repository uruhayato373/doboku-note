#!/usr/bin/env node
/**
 * coconala-profile.mjs — ココナラ出品者プロフィールの自己紹介を account.json から設定
 * ---------------------------------------------------------------------------
 * .claude/config/coconala-account.json の profile（job / appeal / bio / schedule）を
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

  // セクション見出し近傍の鉛筆（.d-profileItemControlButton・32px小型ボタン）をクリックして
  // 編集フォームを展開する（2026-07-20 UI変更対応: フィールドは初期描画に存在せず、
  // 鉛筆クリックで input/textarea が出現するインライン編集型になった）。
  // ナビ誤爆検知として URL 不変を assert する。
  async function openSection(headingText) {
    const urlBefore = page.url();
    const r = await page.evaluate((headingText) => {
      const head = Array.from(document.querySelectorAll('*')).find((e) => e.childElementCount === 0 && (e.innerText || '').trim() === headingText);
      if (!head) return 'heading なし';
      const hy = head.getBoundingClientRect().top + window.scrollY;
      const cands = Array.from(document.querySelectorAll('button, [role="button"]'))
        .map((b) => { const rc = b.getBoundingClientRect(); return { b, top: rc.top + window.scrollY, left: rc.left, w: rc.width, h: rc.height }; })
        .filter((c) => c.w > 0 && c.w < 60 && c.h < 60 && c.top > hy - 10 && c.top < hy + 160)
        .sort((a, z) => z.left - a.left);
      if (!cands.length) return '鉛筆なし';
      cands[0].b.scrollIntoView({ block: 'center' });
      cands[0].b.click();
      return 'opened';
    }, headingText);
    await sleep(2500);
    if (page.url() !== urlBefore) return `ナビ誤爆 → ${page.url()}`;
    return r;
  }

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

  // 各セクションを鉛筆で展開してから fill（2026-07-20 UI変更対応）
  const o1 = await openSection('職業・業務領域');
  const r1 = await fillByPlaceholder('input', '広告クリエイター', p.job);
  const o2 = await openSection('自己紹介');
  // ひとことアピールは **50字上限**。超えるとバリデーションで弾かれ、
  // 「職業を更新しました」のトーストだけ出て自己紹介側は保存されない＝偽成功になる
  // （2026-08-11 に 55 字で実際に発生し、ライブは旧文言のまま残った）。
  if (p.appeal && [...p.appeal].length > 50) {
    console.error(`ABORT: ひとことアピールが ${[...p.appeal].length} 字（上限 50）: ${p.appeal}`);
    await ctx.close(); process.exit(3);
  }
  const r2 = await fillByPlaceholder('input', '思いを伝える', p.appeal);
  const r3 = await fillByPlaceholder('textarea', 'ロゴデザインを', p.bio);
  if (p.schedule && [...p.schedule].length > 600) {
    console.error(`ABORT: スケジュールが ${[...p.schedule].length} 字（上限 600）`);
    await ctx.close(); process.exit(3);
  }
  const r4 = p.schedule
    ? await fillByPlaceholder('textarea', '平日の9時-19時', p.schedule)
    : null;
  console.log(`[2] 展開 職業=${o1} 自己紹介=${o2} / fill 職業=${r1} アピール=${r2} 自己紹介文=${r3} スケジュール=${r4}`);
  await sleep(800);
  await page.screenshot({ path: join(ROOT, '.tmp/coconala/profile-filled.png'), fullPage: true }).catch(() => {});

  if (!COMMIT) { console.log('[dry] --commit なし＝保存しない（.tmp/coconala/profile-filled.png で確認）'); await ctx.close(); process.exit(0); }

  // 保存（職業セクション → 自己紹介セクション → スケジュール）
  const s1 = await saveSection('input', '広告クリエイター'); await sleep(2500);
  const s2 = await saveSection('textarea', 'ロゴデザインを'); await sleep(2500);
  const s3 = p.schedule ? await saveSection('textarea', '平日の9時-19時') : null; await sleep(2500);
  console.log(`[3] 保存 職業=${s1} 自己紹介=${s2} スケジュール=${s3}`);
  await page.screenshot({ path: join(ROOT, '.tmp/coconala/profile-saved.png'), fullPage: true }).catch(() => {});

  // 「保存した」を成功と呼ばない。保存後のページに **入力エラー文言**が出ていないか、
  // かつ意図した値が実際に載っているかを読み戻す（別セクションのトーストを成功と
  // 取り違えないため・2026-08-11 新設）。
  await sleep(2000);
  const verify = await page.evaluate((want) => {
    const t = (document.body.innerText || '').replace(/\s+/g, ' ');
    return {
      formError: (t.match(/[^。]{0,40}(以下で入力してください|入力してください|エラー)[^。]{0,20}/g) || []).slice(0, 3),
      appealOnPage: want.appeal ? t.includes(want.appeal) : null,
      scheduleOnPage: want.schedule ? t.includes(want.schedule) : null,
    };
  }, { appeal: p.appeal, schedule: p.schedule });
  const ok = verify.formError.length === 0 && verify.appealOnPage !== false && verify.scheduleOnPage !== false;
  console.log(`[4] 検証 入力エラー=${JSON.stringify(verify.formError)} / アピール反映=${verify.appealOnPage} / スケジュール反映=${verify.scheduleOnPage}`);
  console.log('RESULT:', JSON.stringify({ job: r1, appeal: r2, bio: r3, schedule: r4, saveJob: s1, saveBio: s2, saveSchedule: s3, verified: ok }));
  if (!ok) { console.error('FAIL: 保存が通っていない可能性（上のエラー文言を確認）'); process.exitCode = 4; }
} finally { await ctx.close(); }
