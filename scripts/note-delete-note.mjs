#!/usr/bin/env node
/**
 * note-delete-note.mjs
 * ---------------------------------------------------------------------------
 * note 記事を「記事管理ダッシュボード（note.com/notes）」経由で削除する Playwright ツール。
 *
 * なぜダッシュボード経由か（2026-07-04 実機確定）:
 *   公開済み記事はエディタ（editor.note.com/notes/{key}/edit）の右上「・・・」からは
 *   削除できない（そのメニューは「変更履歴」のみ）。削除は note.com/notes の記事カードの
 *   操作メニュー（・・・）→「削除」→「削除する」でのみ可能。エディタのブロック移動/削除にも
 *   note のリッチエディタは強く抵抗するため、削除は必ず本ツール（ダッシュボード）を使う。
 *
 * **下書きは key で引けない（2026-08-25 実機確定）**:
 *   一覧の下書き行には `a[href]` が無い。公開記事はサムネイルとタイトルが
 *   `note.com/dobokunote/n/<key>` へのリンクになるが、下書きは「まだ URL が無い」ので
 *   リンクそのものが存在しない。したがって `--note <key>` は下書きには一生当たらない
 *   （DN-0118 / DN-0042 の孤児下書き 8 件が「カードが見つからない」で止まっていた真因）。
 *   下書きは **公開ステータス→下書き で絞り、タイトル＋日付で同定する**。
 *
 * **API で削除を確認してはいけない（下書きの場合）**:
 *   note API v3 は**下書きも削除済みも同じ 404** を返す。下書きに対して `liveExists` を
 *   使うと、1 件も消していなくても「消滅 ✓」と出る＝偽成功。下書きの検証は
 *   **一覧の再走査**（宣言件数が 1 減り、対象行が消えたか）だけで行う。
 *
 * 安全弁（収益アカウントのため）:
 *   1. account=dobokunote を assert（不一致は即中断）
 *   2. 既定は PROBE（対象カード特定＋メニュー項目ダンプのみ・削除しない）
 *   3. --commit で実削除。削除前に対象タイトルを表示し、削除後に実体を検証
 *      （公開記事＝note API v3 / 下書き＝一覧の再走査）
 *   4. タイトル一致が 2 件以上なら**削除しない**（取り違えを構造で防ぐ）
 *   5. note は販売実績のある有料記事の「下書きに戻す」を禁止するが、削除自体は可能。
 *      ※ 販売実績のある有料記事の削除は不可逆。key を十分確認してから --commit すること。
 *
 * 使い方:
 *   node scripts/note-delete-note.mjs --list-drafts                    # 下書きを列挙（read-only）
 *   node scripts/note-delete-note.mjs --note <noteKey>                 # 公開記事 PROBE
 *   node scripts/note-delete-note.mjs --note <noteKey> --commit        # 公開記事を削除
 *   node scripts/note-delete-note.mjs --draft '<タイトルの一部>' [--date '2026年8月22日 19:24']
 *   node scripts/note-delete-note.mjs --draft '…' --date '…' --commit  # 下書きを削除
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE = join(ROOT, '.local/playwright-note-profile');
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const KEY = getArg('--note');
const DRAFT = getArg('--draft');
const DRAFT_DATE = getArg('--date');
const LIST_DRAFTS = argv.includes('--list-drafts');
const COMMIT = argv.includes('--commit');
if (!LIST_DRAFTS && !DRAFT && (!KEY || !/^n[a-z0-9]+$/.test(KEY))) {
  console.error('--note <noteKey>（公開記事） / --draft <タイトルの一部>（下書き） / --list-drafts のいずれかが要る');
  console.error('  下書きは一覧に a[href] を持たないので key では引けない（--list-drafts で実物を見てから --draft で指す）');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function liveExists(key) {
  try {
    const r = spawnSync('curl', ['-s', '--ssl-no-revoke', '--max-time', '20', '-H', 'User-Agent: Mozilla/5.0', `https://note.com/api/v3/notes/${key}`], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    const d = JSON.parse((r.stdout || '').replace(/[\x00-\x1f]/g, ''));
    return !!((d.data || d).status);
  } catch { return false; }
}

/** 一覧ヘッダの「N 記事」。**これに届くまで読み切ったか**を判定に使う（途中で数えて「無い」と言わない）。 */
const declaredCount = (page) => page.evaluate(() => {
  const m = (document.body.innerText || '').match(/(\d[\d,]*)\s*記事/);
  return m ? Number(m[1].replace(/,/g, '')) : null;
});

/** 公開ステータス ドロップダウンで「下書き」を選ぶ。ラベルではなく選択肢の行を座標で押す。 */
async function filterToDrafts(page) {
  await page.getByRole('button', { name: /公開ステータス/ }).first().click({ timeout: 20000 })
    .catch(async () => { await page.getByText('公開ステータス').first().click({ timeout: 20000 }); });
  await sleep(2000);
  const pos = await page.evaluate(() => {
    const r = Array.from(document.querySelectorAll('*'))
      .filter((e) => e.childElementCount === 0 && (e.textContent || '').trim() === '下書き')
      .map((e) => e.getBoundingClientRect()).filter((b) => b.width > 0 && b.height > 0)
      .sort((a, b) => a.top - b.top)[0];
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
  });
  if (!pos) return false;
  await page.mouse.click(pos.x, pos.y);
  await sleep(5000);
  return true;
}

/**
 * 下書き行を列挙する。行には a[href] が無いので、
 * 「下書き」+日付を持つ**最小要素の親**（タイトルまで含む単位）を行とみなす。
 */
const draftRows = (page) => page.evaluate(() => {
  const stamps = Array.from(document.querySelectorAll('div,li,article,span,p')).filter((e) => {
    const t = e.innerText || '';
    if (!/下書き/.test(t) || !/\d{4}年\d{1,2}月\d{1,2}日/.test(t)) return false;
    return !Array.from(e.children).some((c) => /下書き/.test(c.innerText || '') && /\d{4}年/.test(c.innerText || ''));
  });
  const out = [];
  const seen = new Set();
  for (const s of stamps) {
    // 日付だけの要素から親を辿り、タイトル（先頭行）が乗る単位まで上げる
    let row = s;
    for (let i = 0; i < 5 && row.parentElement; i++) {
      const lines = (row.innerText || '').split('\n').map((x) => x.trim()).filter(Boolean);
      if (lines.length >= 2 && lines[0] && !/^下書き/.test(lines[0])) break;
      row = row.parentElement;
    }
    const lines = (row.innerText || '').split('\n').map((x) => x.trim()).filter(Boolean);
    const title = lines.find((l) => l && !/^下書き/.test(l) && !/^\d{4}年/.test(l)) || '(タイトル未設定)';
    const date = ((row.innerText || '').match(/\d{4}年\d{1,2}月\d{1,2}日\s*\d{1,2}:\d{2}/) || [])[0] || '';
    const k = `${title}|${date}`;
    if (seen.has(k)) continue;
    seen.add(k);
    // 操作メニュー（…）はタイトル列の外＝カード右端にあるので、**ボタンを含むところまでさらに上る**。
    // ここを上らないと全行が [メニュー未検出] になり削除経路へ進めない（2026-08-25 実測）。
    let card = row;
    for (let i = 0; i < 6 && card.parentElement; i += 1) {
      if (card.querySelector('button,[role=button],[aria-haspopup]')) break;
      card = card.parentElement;
    }
    const btns = Array.from(card.querySelectorAll('button,[role=button],[aria-haspopup]'))
      .filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    // カード全体を覆う「編集へ遷移」用の透明ボタン（absolute inset-0）は右端がカードの
    // 右端と一致するため「右端最近傍」判定に誤って勝ってしまう（2026-08-26 実測）。
    // 本物の操作メニューは常に aria-haspopup を持つ小さいアイコンボタンなので優先する。
    const cardRect = card.getBoundingClientRect();
    const popupBtns = btns.filter((b) => b.hasAttribute('aria-haspopup'));
    const smallBtns = btns.filter((b) => { const r = b.getBoundingClientRect(); return r.width <= 40 && r.height <= 40; });
    const pool = popupBtns.length ? popupBtns : (smallBtns.length ? smallBtns : btns);
    const menu = pool.length
      ? pool.reduce((best, b) => (Math.abs(b.getBoundingClientRect().right - cardRect.right)
        < Math.abs(best.getBoundingClientRect().right - cardRect.right) ? b : best))
      : null;
    const r = menu ? menu.getBoundingClientRect() : null;
    out.push({ title: title.slice(0, 80), date, hasMenu: Boolean(menu), x: r ? r.left + r.width / 2 : null, y: r ? r.top + r.height / 2 : null });
  }
  return out;
});

/** 宣言件数に届くまでスクロールして下書きを読み切る。届かなければ complete=false を返す。 */
async function loadAllDrafts(page) {
  const declared = await declaredCount(page);
  let rows = await draftRows(page);
  let stall = 0;
  for (let i = 0; i < 60; i += 1) {
    if (declared && rows.length >= declared) break;
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(2000);
    const next = await draftRows(page);
    if (next.length === rows.length) { stall += 1; if (stall >= 10) break; } else { stall = 0; }
    rows = next;
  }
  return { rows, declared, complete: declared != null && rows.length >= declared };
}

const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: false, channel: 'chrome', proxy: PROXY ? { server: PROXY } : undefined,
  ignoreHTTPSErrors: true, viewport: { width: 1366, height: 1000 }, args: ['--disable-blink-features=AutomationControlled'],
});
try {
  const page = ctx.pages()[0] || (await ctx.newPage());
  // 1. account ゲート
  await page.goto('https://note.com/settings/account', { waitUntil: 'domcontentloaded', timeout: 60000 });
  try { await page.waitForLoadState('networkidle', { timeout: 20000 }); } catch {}
  let acct = false;
  for (let i = 0; i < 12; i++) { await sleep(2500); let t = ''; try { t = await page.evaluate(() => document.body.innerText || ''); } catch {} if (/dobokunote/.test(t)) { acct = true; break; } }
  if (!acct) { console.error('ABORT: account != dobokunote'); await ctx.close(); process.exit(2); }
  console.log('[1] account gate OK (dobokunote)');

  await page.goto('https://note.com/notes', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(6000);

  // 2-a. 下書き経路（--list-drafts / --draft）。key ではなくタイトル＋日付で同定する。
  if (LIST_DRAFTS || DRAFT) {
    if (!(await filterToDrafts(page))) {
      console.error('ABORT: 公開ステータスの「下書き」を選べなかった（UI 変更の可能性）');
      await page.screenshot({ path: join(ROOT, '.tmp/note-delete-draft-filter.png') }).catch(() => {});
      await ctx.close(); process.exit(3);
    }
    const { rows, declared, complete } = await loadAllDrafts(page);
    console.log(`[2] 下書き ${rows.length} 件を読み込み（ヘッダ宣言 ${declared ?? '不明'}）`);
    if (!complete) {
      // 読み切れていない一覧で「見つからない＝もう無い」と読ませない（§9）。
      console.error(`ABORT: 読み切れていない（${rows.length}/${declared}）。この状態の「該当なし」は削除済みを意味しない。`);
      await ctx.close(); process.exit(7);
    }

    if (LIST_DRAFTS) {
      rows.forEach((r, i) => console.log(`  ${String(i + 1).padStart(2)}  ${r.date.padEnd(22)} ${r.hasMenu ? '' : '[メニュー未検出] '}${r.title}`));
      console.log(`\nRESULT: drafts=${rows.length}`);
      await ctx.close(); process.exit(0);
    }

    const matches = rows.filter((r) => r.title.includes(DRAFT) && (!DRAFT_DATE || r.date === DRAFT_DATE));
    if (matches.length === 0) {
      console.error(`ABORT: 一致する下書きが無い（--draft ${JSON.stringify(DRAFT)}${DRAFT_DATE ? ` --date ${JSON.stringify(DRAFT_DATE)}` : ''}）`);
      console.error('  読み切りは成立しているので**この下書きは既に存在しない**か、タイトルの綴りが違う。--list-drafts で確認する。');
      await ctx.close(); process.exit(4);
    }
    if (matches.length > 1) {
      // 取り違えを構造で防ぐ。同題の下書きが複数あるのは実際に起きている（DN-0118 の 1回目/2回目）。
      console.error(`ABORT: ${matches.length} 件が一致した。--date で 1 件に絞ること:`);
      for (const m of matches) console.error(`    --date '${m.date}'   ${m.title}`);
      await ctx.close(); process.exit(5);
    }
    const t = matches[0];
    console.log(`[2] 対象下書き: ${JSON.stringify(t.title)}  (${t.date})`);
    if (!t.hasMenu) { console.error('ABORT: 行の操作メニューを検出できない'); await ctx.close(); process.exit(6); }

    if (!COMMIT) {
      console.log('\nPROBE のみ（--commit で削除）。');
      await ctx.close(); process.exit(0);
    }

    // 座標 (t.x, t.y) は loadAllDrafts が宣言件数まで読み切るために一番下までスクロールした
    // 「最終スクロール位置」でのビューポート座標。対象行が一覧の上の方（新しい下書き）だと
    // その時点で画面外（負の y）になっており、そのままクリックすると何もヒットしない
    // （2026-08-27 実測：削除メニューが一度も開かず「削除」未検出で毎回 ABORT していた）。
    // クリック直前に対象行を再特定して scrollIntoView → 座標を取り直す。
    await page.evaluate(({ title, date }) => {
      const stamps = Array.from(document.querySelectorAll('div,li,article,span,p')).filter((e) => {
        const t2 = e.innerText || '';
        if (!/下書き/.test(t2) || !/\d{4}年\d{1,2}月\d{1,2}日/.test(t2)) return false;
        return !Array.from(e.children).some((c) => /下書き/.test(c.innerText || '') && /\d{4}年/.test(c.innerText || ''));
      });
      for (const s of stamps) {
        let row = s;
        for (let i = 0; i < 5 && row.parentElement; i++) {
          const lines = (row.innerText || '').split('\n').map((x) => x.trim()).filter(Boolean);
          if (lines.length >= 2 && lines[0] && !/^下書き/.test(lines[0])) break;
          row = row.parentElement;
        }
        const lines = (row.innerText || '').split('\n').map((x) => x.trim()).filter(Boolean);
        const rTitle = lines.find((l) => l && !/^下書き/.test(l) && !/^\d{4}年/.test(l)) || '';
        const rDate = ((row.innerText || '').match(/\d{4}年\d{1,2}月\d{1,2}日\s*\d{1,2}:\d{2}/) || [])[0] || '';
        if (rTitle.slice(0, 80) === title && rDate === date) { row.scrollIntoView({ block: 'center' }); return; }
      }
    }, { title: t.title, date: t.date });
    await sleep(800);
    const fresh = (await draftRows(page)).find((r) => r.title === t.title && r.date === t.date);
    if (fresh && fresh.x != null && fresh.y != null) { t.x = fresh.x; t.y = fresh.y; }
    await page.mouse.click(t.x, t.y); await sleep(2000);
    const del = page.getByRole('button', { name: /削除/ }).or(page.getByRole('menuitem', { name: /削除/ })).or(page.getByText('削除', { exact: true }));
    if (!(await del.count())) {
      console.error('ABORT: メニューに「削除」未検出');
      await page.screenshot({ path: join(ROOT, '.tmp/note-delete-draft-menu.png') }).catch(() => {});
      const dbg = await page.evaluate(() => Array.from(document.querySelectorAll('button,[role=menuitem],a,li,span,div'))
        .map((e) => (e.innerText || '').trim()).filter((t) => t && t.length < 20)
        .filter((t, i, a) => a.indexOf(t) === i).slice(0, 40));
      console.error('DEBUG visible short texts:', JSON.stringify(dbg));
      await ctx.close(); process.exit(4);
    }
    await del.first().click({ timeout: 6000 }); await sleep(1800);
    let done = false;
    for (const name of ['削除する', '削除', 'はい', 'OK']) {
      const b = page.getByRole('button', { name, exact: true });
      if (await b.count()) { try { await b.last().click({ timeout: 5000 }); done = true; console.log('[3] 確認:', name); break; } catch { /* 次の候補へ */ } }
    }
    if (!done) { console.error('ABORT: 確認ダイアログの削除ボタン未検出'); await ctx.close(); process.exit(5); }
    await sleep(5000);

    // 4. 検証は**一覧の再走査**で行う。note API は下書きも削除済みも 404 なので使わない。
    //    削除操作（[3]まで）は既に確定済みなので、ここで例外が出ても「削除できていない」
    //    ことにはならない＝クラッシュさせず WARN として exit 6 に落とす。
    try {
      await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(6000);
      try { await page.waitForLoadState('networkidle', { timeout: 15000 }); } catch {}
      await filterToDrafts(page);
      const after = await loadAllDrafts(page);
      const stillThere = after.rows.some((r) => r.title === t.title && r.date === t.date);
      const shrank = after.declared != null && declared != null && after.declared === declared - 1;
      console.log(`[4] 再走査: 宣言 ${declared} → ${after.declared} / 対象行 ${stillThere ? 'まだ在る' : '消えた'}`);
      if (stillThere || !shrank) {
        console.error('WARN: 削除を確認できない（件数が 1 減っていないか、対象行が残っている）。手で確認すること。');
        await ctx.close(); process.exit(6);
      }
    } catch (e) {
      console.error('WARN: 再走査中に例外（削除自体は[3]まで完了済み・--list-drafts で手動確認すること）:', e.message);
      await ctx.close(); process.exit(6);
    }
    console.log('RESULT: deleted-draft', JSON.stringify(t.title), t.date);
    await ctx.close(); process.exit(0);
  }

  // 2-b. 公開記事は key の a[href] から最寄りカードを引く（下書きにはリンクが無いのでこの経路は使えない）
  const found = await page.evaluate((key) => {
    const link = Array.from(document.querySelectorAll('a[href]')).find((a) => a.getAttribute('href').includes(key));
    if (!link) return { ok: false, reason: 'key を含む記事カードが見つからない（ページ内に無い可能性）' };
    let card = link; for (let i = 0; i < 6 && card.parentElement; i++) { card = card.parentElement; if (card.querySelector('button,[role=button],[aria-haspopup]')) break; }
    const btns = Array.from(card.querySelectorAll('button,[role=button],[aria-haspopup]'));
    const menuBtn = btns.find((b) => /メニュー|・・・|\.\.\.|その他|操作/.test(b.getAttribute('aria-label') || b.innerText || '')) || btns[btns.length - 1];
    if (!menuBtn) return { ok: false, reason: '操作メニューボタン未検出', title: (card.innerText || '').slice(0, 40) };
    menuBtn.scrollIntoView({ block: 'center' });
    const r = menuBtn.getBoundingClientRect();
    return { ok: true, title: (card.innerText || '').replace(/\n+/g, ' ').slice(0, 60), x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, KEY);
  if (!found.ok) { console.error('ABORT: ' + found.reason); await page.screenshot({ path: join(ROOT, '.tmp/note-delete-probe.png') }).catch(() => {}); await ctx.close(); process.exit(3); }
  console.log('[2] 対象カード:', JSON.stringify(found.title));
  await page.mouse.click(found.x, found.y); await sleep(2000);
  const items = await page.evaluate(() => Array.from(document.querySelectorAll('button,[role=menuitem],a,li,span')).map((e) => (e.innerText || '').trim()).filter((t) => t && t.length < 16 && /削除|編集|下書き|複製|共有/.test(t)).slice(0, 12));
  console.log('[2] メニュー項目:', JSON.stringify(items));

  if (!COMMIT) { console.log('\nPROBE のみ（--commit で削除）。対象:', found.title); await ctx.close(); process.exit(0); }

  // 3. 削除 → 確認ダイアログ「削除する」
  const del = page.getByRole('button', { name: /削除/ }).or(page.getByRole('menuitem', { name: /削除/ })).or(page.getByText('削除', { exact: true }));
  if (!(await del.count())) { console.error('ABORT: メニューに「削除」未検出'); await ctx.close(); process.exit(4); }
  await del.first().click({ timeout: 6000 }); await sleep(1800);
  await page.screenshot({ path: join(ROOT, '.tmp/note-delete-confirm.png') }).catch(() => {});
  let confirmed = false;
  for (const name of ['削除する', '削除', 'はい', 'OK']) { const b = page.getByRole('button', { name, exact: true }); if (await b.count()) { try { await b.last().click({ timeout: 5000 }); confirmed = true; console.log('[3] 確認:', name); break; } catch {} } }
  if (!confirmed) { console.error('ABORT: 確認ダイアログの削除ボタン未検出'); await ctx.close(); process.exit(5); }
  await sleep(4000);

  // 4. 実体検証（note API で消滅）
  await sleep(2000);
  const stillExists = liveExists(KEY);
  console.log(`[4] 削除後 note API 実在: ${stillExists ? 'まだ存在（要手動確認）' : '消滅 ✓'}`);
  if (stillExists) { console.error('WARN: API 上まだ存在。反映ラグの可能性。数分後に再確認を。'); await ctx.close(); process.exit(6); }
  console.log('RESULT: deleted', KEY, JSON.stringify(found.title));
} finally { await ctx.close(); }
