#!/usr/bin/env node
/**
 * coconala-blog-delete-draft.mjs — ココナラブログの**下書き**を安全に削除する
 * ---------------------------------------------------------------------------
 * なぜ要るか:
 *   ブログエディタは**オートセーブする**。`coconala-blog-publish.mjs` が反映不足や順序不一致で
 *   中断（exit 3）しても、**下書きはココナラ側に残っている**。気づかずに再実行すると
 *   同じ記事の下書きが増え、最悪そのまま二重公開になる。
 *   2026-08-12 の実装中、中断は5回以上起き、そのたびに残骸が出た。
 *
 * 安全弁（公開済みを絶対に消さない）:
 *   G1 account assert（sellerName=dobokunote）
 *   G2 **一覧で `.c-blogContent_statusDraft` を持つ行だけ**を対象にする（公開中は構造的に選べない）
 *   G3 `--title` 指定時はタイトル部分一致の行だけ
 *   G4 既定は dry-run。実削除は `--commit`
 *   G5 削除後に一覧を読み直し、**対象が消えたことを実測**してから成功と言う
 *
 * 使い方:
 *   node scripts/coconala-blog-delete-draft.mjs                          # 下書き一覧（dry-run）
 *   node scripts/coconala-blog-delete-draft.mjs --title "【第1回】" --commit
 *   node scripts/coconala-blog-delete-draft.mjs --all --commit           # 下書きを全部消す
 * exit: 0=成功/対象なし / 1=引数・ガード / 2=login/account / 3=削除できなかった
 * ---------------------------------------------------------------------------
 */
import { launchContext, waitForLogin, assertAccount, sleep } from './lib/coconala-session.mjs';

const TAG = '[blog-delete-draft]';
const argv = process.argv.slice(2);
const getArg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : ''; };
const TITLE = getArg('--title');
const ALL = argv.includes('--all');
const COMMIT = argv.includes('--commit');
const HEADLESS = argv.includes('--headless');

if (COMMIT && !TITLE && !ALL) {
  console.error(`${TAG} --commit には --title <部分一致> か --all が必要です（無条件削除はしません）`);
  process.exit(1);
}

/** 一覧の行を読む。公開中／下書きの別も取る（G2 の判定材料） */
const readRows = (page) => page.evaluate(() =>
  [...document.querySelectorAll('.c-blogContent')].map((r, i) => ({
    i,
    draft: !!r.querySelector('.c-blogContent_statusDraft'),
    title: (r.querySelector('.c-blogContent_title')?.innerText || '').trim().slice(0, 80),
  })));

const ctx = await launchContext({ headless: HEADLESS });
const page = ctx.pages()[0] || (await ctx.newPage());
let exitCode = 0;
try {
  const login = await waitForLogin(page, { tag: TAG });
  if (!login.ok) { console.error(`${TAG} ${login.reason}`); process.exit(2); }
  const acct = await assertAccount(page, { tag: TAG });
  if (!acct.ok) { console.error(`${TAG} account assert 失敗: ${acct.reason}`); process.exit(2); }

  await page.goto('https://coconala.com/mypage/blogs', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await sleep(3000);
  const rows = await readRows(page);
  console.log(`${TAG} 一覧 ${rows.length} 件（下書き ${rows.filter((r) => r.draft).length} / 公開中 ${rows.filter((r) => !r.draft).length}）`);
  for (const r of rows) console.log(`  ${r.draft ? '下書き' : '公開中'} | ${r.title}`);

  // G2 + G3
  let targets = rows.filter((r) => r.draft);
  if (TITLE) targets = targets.filter((r) => r.title.includes(TITLE));
  if (!targets.length) { console.log(`${TAG} 対象の下書きはありません`); process.exit(0); }
  console.log(`${TAG} 対象 ${targets.length} 件${TITLE ? `（--title "${TITLE}"）` : ''}`);

  if (!COMMIT) { console.log(`${TAG} DRY-RUN: 実削除は --commit`); process.exit(0); }

  let removed = 0;
  for (let n = 0; n < targets.length; n++) {
    // 削除のたびに一覧が詰まるので、毎回読み直して**下書きかつ条件一致の先頭**を開く
    const cur = await readRows(page);
    const t = cur.find((r) => r.draft && (!TITLE || r.title.includes(TITLE)));
    if (!t) break;
    const opened = await page.evaluate((idx) => {
      const row = [...document.querySelectorAll('.c-blogContent')][idx];
      if (!row || !row.querySelector('.c-blogContent_statusDraft')) return false;  // 公開中には触れない
      row.querySelector('.c-blogContent_edit')?.click();
      return true;
    }, t.i);
    if (!opened) { console.error(`${TAG} 行 ${t.i} を開けません（公開中の可能性）`); break; }
    await sleep(5000);
    await page.evaluate(() => document.querySelector('.c-blogPost_triggerDelete .dropdown-trigger, .c-blogPost_triggerDelete')?.click());
    await sleep(1200);
    await page.evaluate(() => [...document.querySelectorAll('.dropdown-item')].find((e) => /この投稿を削除/.test(e.textContent || ''))?.click());
    await sleep(2000);
    const confirmed = await page.evaluate(() => {
      const m = document.querySelector('.c-blogDelete');
      if (!m) return false;
      const b = [...m.querySelectorAll('button,a')].find((x) => /削除する/.test((x.textContent || '').trim()));
      if (!b) return false; b.click(); return true;
    });
    if (confirmed) removed++;
    else console.error(`${TAG} 削除モーダルが出ません: ${t.title}`);
    await sleep(4000);
    await page.goto('https://coconala.com/mypage/blogs', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await sleep(3000);
  }

  // G5 実測で確認
  const after = await readRows(page);
  const left = after.filter((r) => r.draft && (!TITLE || r.title.includes(TITLE)));
  console.log(`${TAG} 削除 ${removed} 件 / 残 ${left.length} 件（公開中 ${after.filter((r) => !r.draft).length} 件は不変）`);
  if (left.length) { console.error(`${TAG} 消し切れていません`); exitCode = 3; }
} finally {
  await ctx.close();
}
process.exit(exitCode);
