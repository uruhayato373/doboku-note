#!/usr/bin/env node
/**
 * brain-profile-edit.mjs — Brain（brain-market.com）販売者プロフィール（アイコン・自己紹介）を編集する
 * ---------------------------------------------------------------------------
 * brain-publish.mjs と同思想（永続プロファイル + 安全弁 + draft-first + --commit gate）。
 * 商品ではなくアカウントのプロフィールを対象にする点だけが異なる。
 *
 * 編集画面は /profiles（本人用管理ページ）→「プロフィールを編集」モーダル。
 * 公開ビュー /u/:account には編集ボタンが無い（真実源: .claude/knowledge/reference/brain-operations.md §プロフィール編集）。
 *
 * 工程: ログイン待ち → account assert → /profiles → 「プロフィールを編集」
 *   → アバター（hidden input[type=file] へ setInputFiles → クロッパー「適用」）
 *   → ユーザーネーム / 自己紹介 / X を入力
 *   → 既定はここまで（保存しない・スクショで確認）
 *   → --commit: 「保存」→ /u/:account で反映確認
 *
 * 安全弁:
 *   1. 既定は入力まで。保存は --commit 必須（公開プロフィールの変更＝外部露出）
 *   2. 自己紹介は 160 字上限（fill で無言に切り捨てられるため、保存前に length 一致を assert）
 *   3. アバターは jpeg/png のみ（Brain の accept="image/jpeg, image/png"）。webp は自動で png 変換
 *   4. 少なくとも 1 フィールドの指定が必須（空実行での誤上書きを防ぐ）
 *   5. account assert（sellerName 可視）で誤アカウント操作を防ぐ
 *
 * 使い方:
 *   node scripts/brain-profile-edit.mjs --bio-file .tmp/brain-bio.txt --avatar public/images/character/avatar-good-sign.webp
 *                                                                       # 入力まで（下書き相当・保存しない）
 *   node scripts/brain-profile-edit.mjs --bio-file .tmp/brain-bio.txt --avatar <img> --commit
 *                                                                       # 保存して反映確認
 *   node scripts/brain-profile-edit.mjs --bio "..." --commit            # 自己紹介だけ更新
 *   node scripts/brain-profile-edit.mjs --avatar <img> --commit         # アイコンだけ更新
 *   node scripts/brain-profile-edit.mjs --x "@handle" --commit          # X リンクだけ更新
 */
import sharp from 'sharp';
import { appendFileSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, launchContext, waitForLogin, assertAccount, readAccount } from './lib/brain-session.mjs';

const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const COMMIT = argv.includes('--commit');
const BIO_INLINE = getArg('--bio');
const BIO_FILE = getArg('--bio-file');
const AVATAR_ARG = getArg('--avatar');
const USERNAME = getArg('--username');
const X_HANDLE = getArg('--x');

const BIO_MAX = 160;
const OUT = join(ROOT, '.tmp', 'brain-profile-edit.log');
writeFileSync(OUT, `# brain-profile-edit ${COMMIT ? 'COMMIT' : 'DRAFT'}\n`, 'utf8');
const log = (s) => { console.log(s); appendFileSync(OUT, s + '\n'); };
const shot = (name) => join(ROOT, '.tmp', name);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- 入力の検証（起動前ゲート） --------------------------------------------
let bio = null;
if (BIO_INLINE != null) bio = BIO_INLINE;
else if (BIO_FILE) {
  if (!existsSync(BIO_FILE)) { console.error(`ABORT: --bio-file 不在: ${BIO_FILE}`); process.exit(1); }
  bio = readFileSync(BIO_FILE, 'utf-8').replace(/\s+$/, '');
}
if (bio != null && bio.length > BIO_MAX) {
  console.error(`ABORT: 自己紹介が ${bio.length} 字で上限 ${BIO_MAX} を超過（Brain は無言で切り捨てる）。圧縮してください`);
  process.exit(1);
}

let avatarPath = null;
if (AVATAR_ARG) {
  const abs = AVATAR_ARG.startsWith('/') ? AVATAR_ARG : join(ROOT, AVATAR_ARG);
  if (!existsSync(abs)) { console.error(`ABORT: --avatar 不在: ${AVATAR_ARG}`); process.exit(1); }
  if (/\.(jpe?g|png)$/i.test(abs)) {
    avatarPath = abs;
  } else if (/\.webp$/i.test(abs)) {
    // Brain は jpeg/png のみ受け付ける → png へ変換
    avatarPath = join(ROOT, '.tmp', 'brain-avatar-upload.png');
    await sharp(abs).png().toFile(avatarPath);
    log(`[prep] webp → png 変換: ${AVATAR_ARG} → .tmp/brain-avatar-upload.png`);
  } else {
    console.error('ABORT: --avatar は jpg/png/webp のみ対応（Brain accept=jpeg,png）'); process.exit(1);
  }
}

if (bio == null && !avatarPath && USERNAME == null && X_HANDLE == null) {
  console.error('ABORT: --bio/--bio-file, --avatar, --username, --x のいずれか1つ以上を指定してください');
  process.exit(1);
}
log(`[prep] bio=${bio != null ? bio.length + '字' : '—'} avatar=${avatarPath ? 'あり' : '—'} username=${USERNAME ?? '—'} x=${X_HANDLE ?? '—'} mode=${COMMIT ? 'COMMIT(保存)' : 'DRAFT(入力のみ)'}`);

// --- ブラウザ ---------------------------------------------------------------
const ctx = await launchContext({ headless: false });
const page = ctx.pages()[0] || (await ctx.newPage());
try {
  await page.goto('https://brain-market.com/profiles', { waitUntil: 'domcontentloaded', timeout: 60000 });
  const lg = await waitForLogin(page, { tag: '[profile]' });
  if (!lg.ok) { log(`ABORT: ${lg.reason}`); process.exit(2); }
  await assertAccount(page, { tag: '[profile]' });

  // /profiles を確実に開く（ログイン待ちでトップに居る場合がある）
  if (!/\/profiles/.test(page.url())) {
    await page.goto('https://brain-market.com/profiles', { waitUntil: 'domcontentloaded', timeout: 60000 });
  }
  await sleep(2500);

  // 「プロフィールを編集」モーダルを開く
  const opened = await page.evaluate(() => {
    for (const n of document.querySelectorAll('a,button')) {
      if ((n.innerText || '').replace(/\s+/g, ' ').trim() === 'プロフィールを編集') { n.dispatchEvent(new MouseEvent('click', { bubbles: true })); return true; }
    }
    return false;
  });
  if (!opened) { log('ABORT: 「プロフィールを編集」ボタンが見つからない（UI 変更の可能性）'); process.exit(3); }
  await sleep(2000);

  // 1) アバター（hidden file input へ直接投入 → クロッパー「適用」）
  if (avatarPath) {
    await page.locator('input[type=file]').first().setInputFiles(avatarPath);
    await sleep(2500);
    const cropBtn = await page.evaluate(() => {
      const labels = ['適用', '決定', 'トリミング', '設定する', '設定', '完了', '切り取る', 'この画像', 'OK', '確定'];
      for (const b of document.querySelectorAll('button')) {
        const t = (b.innerText || '').replace(/\s+/g, ' ').trim();
        if (t && t !== '保存' && labels.some((l) => t === l || t.includes(l))) { b.dispatchEvent(new MouseEvent('click', { bubbles: true })); return t; }
      }
      return null;
    });
    log(`[avatar] setInputFiles → クロッパー確定: ${cropBtn ?? '（クロッパー無し）'}`);
    await sleep(1500);
  }

  // 2) ユーザーネーム（text input・ラベル "ユーザーネーム"）
  if (USERNAME != null) {
    const okName = await page.evaluate((v) => {
      const inputs = Array.from(document.querySelectorAll('input[type=text]'));
      // 検索ボックス（placeholder にキーワード）を除外し、モーダル内の text を狙う
      const target = inputs.find((i) => !/検索/.test(i.placeholder || '') && (i.closest('[role=dialog],[class*=modal],[class*=Modal]') || i.value === 'doboku-note' || true));
      if (!target) return false;
      const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      set.call(target, v); target.dispatchEvent(new Event('input', { bubbles: true })); return true;
    }, USERNAME);
    log(`[username] ${okName ? 'set' : '見つからず'}: ${USERNAME}`);
    await sleep(500);
  }

  // 3) 自己紹介（textarea）
  if (bio != null) {
    await page.locator('textarea').first().fill(bio);
    await sleep(600);
  }

  // 4) X（旧Twitter）（placeholder "X（旧Twitter）"）
  if (X_HANDLE != null) {
    const okX = await page.evaluate((v) => {
      const t = Array.from(document.querySelectorAll('input[type=text]')).find((i) => /Twitter|X（|X\(/.test(i.placeholder || ''));
      if (!t) return false;
      const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      set.call(t, v); t.dispatchEvent(new Event('input', { bubbles: true })); return true;
    }, X_HANDLE);
    log(`[x] ${okX ? 'set' : '見つからず'}: ${X_HANDLE}`);
    await sleep(500);
  }

  // 保存前ガード（切り捨て・画像未設定の検知）
  const pre = await page.evaluate(() => {
    const ta = document.querySelector('textarea');
    const f = document.querySelector('input[type=file]');
    return { bioLen: ta ? (ta.value || '').length : null, fileCount: f?.files?.length || 0 };
  });
  if (bio != null && pre.bioLen !== bio.length) {
    log(`ABORT: 自己紹介が切り捨て/不一致（actual ${pre.bioLen} != ${bio.length}）。保存しません`); process.exit(4);
  }
  if (avatarPath && pre.fileCount !== 1) {
    log(`ABORT: 画像が input に載っていない（fileCount=${pre.fileCount}）。保存しません`); process.exit(4);
  }
  await page.screenshot({ path: shot('brain-profile-preflight.png'), fullPage: true }).catch(() => {});
  log(`[preflight] bioLen=${pre.bioLen ?? '—'} fileCount=${pre.fileCount} → .tmp/brain-profile-preflight.png`);

  if (!COMMIT) {
    log('[done] DRAFT モード（保存していません）。内容を確認し、問題なければ --commit を付けて再実行してください');
    await sleep(1500);
    process.exit(0);
  }

  // 保存
  const saved = await page.evaluate(() => {
    for (const b of document.querySelectorAll('button')) {
      if ((b.innerText || '').replace(/\s+/g, ' ').trim() === '保存') { b.dispatchEvent(new MouseEvent('click', { bubbles: true })); return true; }
    }
    return false;
  });
  if (!saved) { log('ABORT: 「保存」ボタンが見つからない'); process.exit(5); }
  log('[save] 保存クリック');
  await sleep(4000);
  await page.screenshot({ path: shot('brain-profile-saved.png'), fullPage: true }).catch(() => {});

  // 反映確認（公開プロフィール）
  const acc = readAccount();
  const handle = acc.sellerName || 'doboku-note';
  await page.goto(`https://brain-market.com/u/${handle}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(3500);
  const verify = await page.evaluate((expectBio) => {
    const body = document.body.innerText;
    const hasEmpty = body.includes('自己紹介文がありません');
    const bioShown = expectBio ? body.includes(expectBio.slice(0, 20)) : null;
    const imgs = Array.from(document.querySelectorAll('img')).map((i) => i.src).filter((s) => /image\.brain-market\.com\/store/.test(s)).slice(0, 3);
    return { hasEmpty, bioShown, avatarUploaded: imgs.length > 0, imgs };
  }, bio);
  log('=== 反映確認（公開プロフィール） ===');
  log(`  自己紹介「ありません」表示: ${verify.hasEmpty}（false=紹介文あり）`);
  if (bio != null) log(`  紹介文の先頭一致: ${verify.bioShown}`);
  if (avatarPath) log(`  アバター store 画像: ${verify.avatarUploaded} ${JSON.stringify(verify.imgs)}`);
  await page.screenshot({ path: shot('brain-profile-verify.png'), fullPage: true }).catch(() => {});
  log('[done] 保存＋反映確認完了 → .tmp/brain-profile-verify.png');
} catch (e) {
  log(`\n!!! エラー: ${String(e)}`);
  process.exitCode = 1;
} finally {
  await ctx.close();
}
