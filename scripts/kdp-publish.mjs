#!/usr/bin/env node
/**
 * kdp-publish.mjs
 * ---------------------------------------------------------------------------
 * Amazon KDP へ Kindle 本を「新規エントリ作成 → 詳細記入 → カテゴリー → 原稿/表紙アップロード
 * → AI申告 → アクセシビリティ → 価格 → 出版」まで駆動する Playwright パブリッシャ。
 * note-publish.mjs と同じ「システム Chrome(channel:chrome) + 永続プロファイル(ログイン保存)
 * + proxy + ignoreHTTPSErrors」方式。真実源(メタデータ/申告/カテゴリー経路) = lib/kdp-common.mjs
 * (=.claude/config/kdp-memo.json の defaults + books[id])。
 *
 * ★限界（正直に明記）★
 *   - KDP/Amazon は bot 検知が強く、ログイン・出版時に CAPTCHA / 2FA を出す。これらは人が処理する。
 *   - 収益アカウントのため、既定は下書き保存まで。実出版は --commit-publish 必須。
 *
 * 使い方:
 *   node scripts/kdp-publish.mjs --id <id>                    # 新規提出(下書き保存まで・出版せず)＋チェックリスト
 *   node scripts/kdp-publish.mjs --id <id> --commit-publish   # 上記＋出版(不可逆)＋出版後検証
 *   node scripts/kdp-publish.mjs --sync-status                # catalog 各冊を本棚でタイトル検索し {asin,status,提出日} を突合
 *   node scripts/kdp-publish.mjs --list-drafts                # 本棚を .tmp へダンプ(読み取り)
 *   node scripts/kdp-publish.mjs --delete-drafts <ASIN,...>   # 下書きのみ削除(1件ずつ・下書きassert)
 *   node scripts/kdp-publish.mjs --dump --asin <ASIN> --page <details|content|pricing>  # UI変更時の較正
 *   node scripts/kdp-publish.mjs --diag-category --asin <ASIN>  # カテゴリーカスケードの候補実測(A/E系較正)
 *
 * 再開性(重複防止): 新規提出で発番したドラフト ASIN を catalog.json の draftAsin に永続化し、
 *   次回 --id 実行時に draftAsin があれば新規作成せず既存ドラフトへ直行する([[kindle-dup-prevention]])。
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync, writeSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { resolveBook, validateBook, getDefaults, AI_AMOUNT_LABELS } from './lib/kdp-common.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE = join(ROOT, '.local/playwright-kdp-profile');
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
const TMP = join(ROOT, '.tmp');
const CATALOG = join(ROOT, 'scripts/kindle-published/catalog.json');
mkdirSync(TMP, { recursive: true });

// ── 引数 ─────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const ID = getArg('--id');
const COMMIT_PUBLISH = argv.includes('--commit-publish');
const MODE_SYNC = argv.includes('--sync-status');
const MODE_LIST = argv.includes('--list-drafts');
const MODE_DELETE = argv.includes('--delete-drafts');
const MODE_DUMP = argv.includes('--dump');
const MODE_DIAG_CAT = argv.includes('--diag-category');
const MODE_PUBLISH_ONLY = argv.includes('--publish-only');
const MODE_SET_PRICE = argv.includes('--set-price');
const COMMIT = argv.includes('--commit');
const BOOKLESS = MODE_SYNC || MODE_LIST || MODE_DELETE;
if (!ID && !BOOKLESS) { console.error('--id <book id> required（または --sync-status / --list-drafts / --delete-drafts）'); process.exit(1); }

const defaults = getDefaults();

// ── データ準備（book-less モードでは不要）─────────────────────────────────
let book = null;
if (ID) {
  book = resolveBook(ID, { requireMemo: !(MODE_DUMP || MODE_DIAG_CAT) });
  const errs = validateBook(book);
  if (errs.length && !(MODE_DUMP || MODE_DIAG_CAT)) { console.error('ABORT: メタデータ検証エラー:\n  - ' + errs.join('\n  - ')); process.exit(1); }
  book.epub = join(homedir(), 'Downloads', `kindle-${ID}.epub`);
  book.cover = join(homedir(), 'Downloads', `kindle-cover-${ID}.jpg`);
  if (!MODE_DUMP && !MODE_DIAG_CAT && !MODE_PUBLISH_ONLY && !MODE_SET_PRICE) {
    for (const [label, f] of [['EPUB', book.epub], ['表紙', book.cover]]) {
      if (!existsSync(f)) { console.error(`ABORT: ${label} が無い: ${f}\n（先に npm run sync-kindle-dist -- --downloads ${ID} で配置）`); process.exit(1); }
    }
  }
  if (!book.catVerified) console.log(`[prep] ⚠ カテゴリー末端「${book.catLeaf}」は未検証。提出前に --diag-category で確認推奨`);
  console.log(`[prep] id=${ID} title="${(book.title || '').slice(0, 34)}" price=¥${book.price} mode=${COMMIT_PUBLISH ? 'PUBLISH(出版する)' : 'DRAFT(下書きのみ)'}`);
}

// ── catalog draftAsin ヘルパ（再開性=重複防止）──────────────────────────
const readCatalog = () => (existsSync(CATALOG) ? JSON.parse(readFileSync(CATALOG, 'utf8')) : null);
const getDraftAsin = (id) => { const c = readCatalog(); return c?.books?.find((b) => b.id === id)?.draftAsin || null; };
const setDraftAsin = (id, asin) => {
  const c = readCatalog(); if (!c) return;
  const b = c.books.find((x) => x.id === id); if (!b) return;
  if (b.draftAsin === asin) return;
  b.draftAsin = asin;
  writeFileSync(CATALOG, JSON.stringify(c, null, 2) + '\n');
  console.log(`[catalog] draftAsin 記録: ${id} = ${asin}`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const K = (id) => `kdp-${id || 'bookshelf'}`;
const shot = async (page, step) => { try { await page.screenshot({ path: join(TMP, `${K(ID)}-${step}.png`) }); console.log(`[shot] .tmp/${K(ID)}-${step}.png`); } catch {} };

// ── 起動 ─────────────────────────────────────────────────────────────────
const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: false, channel: 'chrome', proxy: PROXY ? { server: PROXY } : undefined,
  ignoreHTTPSErrors: true, viewport: { width: 1366, height: 1000 },
  args: ['--disable-blink-features=AutomationControlled'],
});

try {
  const page = ctx.pages()[0] || (await ctx.newPage());

  // 1. ログインゲート（未ログインなら headful で人がログイン→永続プロファイルに保存）
  await page.goto('https://kdp.amazon.co.jp/ja_JP/bookshelf', { waitUntil: 'domcontentloaded', timeout: 60000 });
  let loggedIn = false;
  for (let i = 0; i < 48; i++) {
    await sleep(2500);
    let t = ''; try { t = await page.evaluate(() => document.body.innerText || ''); } catch {}
    if (/\/bookshelf/.test(page.url()) && /(本棚|Bookshelf|新しい本を作成|タイトルの新規作成)/.test(t)) { loggedIn = true; break; }
    if (i === 0 && /signin|ap\/signin|login/.test(page.url())) console.log('[1] 未ログイン → ブラウザで手動ログイン（CAPTCHA/2FA も人が処理）。ログイン後プロファイルに保存されます…');
  }
  if (!loggedIn) { console.error('ABORT: KDP 本棚に到達できず（ログイン未完 or チャレンジ）'); await shot(page, '01-login'); await ctx.close(); process.exit(2); }
  console.log('[1] login gate OK');

  // アカウント照合（defaults.accountEmail が設定されていれば必須照合。null なら検出値をログ）
  {
    let detected = '';
    try { detected = await page.evaluate(() => (document.body.innerText.match(/[\w.+-]+@[\w.-]+\.\w+/) || [''])[0]); } catch {}
    if (book?.accountEmail || defaults.accountEmail) {
      const want = book?.accountEmail || defaults.accountEmail;
      let bodyt = ''; try { bodyt = await page.evaluate(() => document.body.innerText || ''); } catch {}
      if (!bodyt.includes(want)) { console.error(`ABORT: account "${want}" が本棚に見当たらない（誤アカウント防止）`); await shot(page, '01b-account'); await ctx.close(); process.exit(2); }
      console.log(`[1b] account assert OK (${want})`);
    } else {
      console.log(`[1b] account assert スキップ（検出=${detected || '不明'}）。有効化するには .claude/config/kdp-memo.json defaults.accountEmail を設定`);
    }
  }

  // ═══ MODE: --sync-status（catalog 駆動でタイトル検索し {asin,status,提出日} を取得）════
  //
  // 旧実装は「本棚を列挙して突合」だったが、2026-07-30 の実測で**壊れていた**:
  //   - 本棚はページネーションで**先頭10冊しか DOM に存在しない**（live 33 冊の口座で 10 件しか拾えない）
  //   - `title-setup/kindle/` の ID は 13〜14 桁の**内部タイトルID**（例 YJ0R3ZX4TJV）で ASIN ではない
  //     → 出力 20 件のうち 10 件が著者ID様のゴミ・title は空文字
  // 「全部数えて突合」をやめ「catalog の各冊について本棚に問う」へ反転する。catalog が対象の
  // 真実源なので、ページネーションにも本棚の総数にも左右されない。
  //
  // 行構造（実測）: 検索後の `tr.mt-row` のうち `著:` を含む行が書籍行で、
  //   「<タイトル> 著: doboku-note Kindle 本 <状態> 提出日: YYYY年M月D日 ¥価格 … ASIN: B0XXXXXXXX」
  //   を1行に持つ。タイトルは UI 上「…」で省略されるため前方一致でしか照合できない。
  if (MODE_SYNC) {
    const cat = JSON.parse(readFileSync(CATALOG, 'utf8'));
    const books = Array.isArray(cat) ? cat : (cat.books || Object.values(cat).find(Array.isArray));
    if (!books || !books.length) { console.error('ABORT: catalog を読めない（検査不成立）'); await ctx.close(); process.exit(1); }

    const searchOne = async (title) => {
      const input = page.locator('#podbookshelftable-search-input');
      if (!(await input.count())) return { err: '検索窓なし' };
      await input.first().fill('');
      await input.first().fill(title);
      await page.keyboard.press('Enter');
      await sleep(3200);
      return await page.evaluate(() => {
        const STAT = /下書き|レビュー中|販売中|ブロック|出版準備中|非公開/;
        const rows = [...document.querySelectorAll('tr.mt-row')]
          .map((tr) => (tr.textContent || '').replace(/\s+/g, ' ').trim())
          // 出版直後の「レビュー中」は ASIN がまだ発番されない。ASIN か「下書き」でしか
          // 行を拾わないと、この状態の本が丸ごと消えて found:false になる（＝本棚に無い、と
          // 誤読して重複作成しかねない。2026-08-03 に f-09 で実測）。状態語も行の根拠に加える。
          .filter((t) => t.includes('著:') && (/ASIN:\s*B0[0-9A-Z]{8}/.test(t) || STAT.test(t)));
        return rows.map((t) => ({
          shelfTitle: t.split('著:')[0].trim().slice(0, 80),
          asin: (t.match(/ASIN:\s*(B0[0-9A-Z]{8})/) || [])[1] || null,
          status: (t.match(STAT) || [])[0] || null,
          submittedAt: (t.match(/提出日:\s*([0-9]{4}年[0-9]{1,2}月[0-9]{1,2}日)/) || [])[1] || null,
          // 本棚行の表示価格。UI で手動改定すると catalog/spec と割れるので必ず持ち帰る。
          priceJpy: (() => { const m = t.match(/¥\s*([0-9][0-9,]*)/); return m ? Number(m[1].replace(/,/g, '')) : null; })(),
        }));
      });
    };

    // 期待値は **catalog から先に確定**させる。結果側から数えると、検索が全滅したときに
    // 「ASIN 既知 0 件」になって不成立判定をすり抜ける（2026-07-30 の故障注入で実際に緑を返した）。
    const expectedKnown = books.filter((b) => b.title && b.asin).length;

    const items = [];
    for (const b of books) {
      if (!b.title) continue;
      const rows = await searchOne(b.title);
      if (rows.err) { items.push({ id: b.id, found: false, err: rows.err, catalogAsin: b.asin ?? null, catalogStatus: b.status }); continue; }
      // 検索は部分一致なので複数返りうる。タイトル前方一致で自分の行を選ぶ。
      const head = b.title.slice(0, 12);
      const mine = rows.find((r) => r.shelfTitle.startsWith(head)) || (rows.length === 1 ? rows[0] : null);
      items.push({
        id: b.id, title: b.title.slice(0, 50), found: !!mine,
        asin: mine?.asin ?? null, status: mine?.status ?? null, submittedAt: mine?.submittedAt ?? null,
        catalogAsin: b.asin ?? null, catalogStatus: b.status,
        livePriceJpy: mine?.priceJpy ?? null, catalogPriceJpy: b.priceJpy ?? null,
        priceMatch: mine?.priceJpy != null && b.priceJpy != null ? mine.priceJpy === b.priceJpy : null,
        asinMatch: mine?.asin && b.asin ? mine.asin === b.asin : null,
        ambiguous: !mine && rows.length > 1 ? rows.length : undefined,
      });
    }

    // 自己検証: catalog に ASIN がある本を検索で再現できたか。1件も再現できないなら検索経路が
    // 壊れており「見つからない」は「存在しない」の証拠にならない＝緑を返さない（CLAUDE.md §9）。
    const known = items.filter((i) => i.catalogAsin);
    const repro = known.filter((i) => i.asinMatch === true);
    const mismatch = known.filter((i) => i.asinMatch === false);
    const errs = items.filter((i) => i.err);
    console.log(`[sync] 検査 ${items.length} 冊（catalog 駆動）／ASIN 既知 ${expectedKnown} 件のうち再現 ${repro.length} 件${errs.length ? `／取得エラー ${errs.length} 件` : ''}`);
    // 価格ドリフト（UI で手動改定すると catalog/spec と割れる）。比較できた件数も必ず出す。
    const priced = items.filter((i) => i.priceMatch !== null);
    const priceDrift = priced.filter((i) => i.priceMatch === false);
    console.log(`[sync] 価格突合 ${priced.length} 冊（比較不能 ${items.length - priced.length} 冊）／不一致 ${priceDrift.length} 件`);
    for (const i of priceDrift) console.log(`   PRICE DRIFT ${i.id}: live ¥${i.livePriceJpy} ≠ catalog ¥${i.catalogPriceJpy}`);
    writeSync(1, JSON.stringify(items, null, 2) + '\n');
    writeFileSync(join(TMP, 'kdp-sync-status.json'), JSON.stringify(items, null, 2) + '\n');
    console.log('[sync] .tmp/kdp-sync-status.json に保存（kdp-operator が catalog と突合）');
    await ctx.close();
    // 判定は **catalog 由来の expectedKnown** で行う（items 由来だと全滅時に 0/0 で緑になる）。
    if (expectedKnown > 0 && repro.length === 0) {
      console.error(`\n[sync] ✗ 検査不成立: ASIN 既知 ${expectedKnown} 件を1件も再現できない＝検索経路が壊れている。`);
      console.error('  この状態の found=false は「本棚に無い」の証拠にならないので、重複判定に使わないこと。');
      process.exit(1);
    }
    if (errs.length > items.length * 0.2) {
      console.error(`\n[sync] ✗ 検査不成立: ${items.length} 冊中 ${errs.length} 冊で取得エラー（${errs[0].err}）。`);
      process.exit(1);
    }
    if (mismatch.length) {
      console.error(`\n[sync] ✗ ASIN 不一致 ${mismatch.length} 件（catalog と本棚がずれている）:`);
      for (const m of mismatch) console.error(`  ${m.id} catalog=${m.catalogAsin} 本棚=${m.asin}`);
      process.exit(1);
    }
    process.exit(0);
  }

  // ═══ MODE: --list-drafts（本棚を .tmp へ・読み取りのみ）════
  if (MODE_LIST) {
    await sleep(2000);
    writeFileSync(join(TMP, 'kdp-bookshelf.html'), await page.content());
    await shot(page, 'bookshelf-list');
    console.log('[list] .tmp/kdp-bookshelf.html + スクショ保存');
    await ctx.close();
    process.exit(0);
  }

  // ═══ MODE: --delete-drafts <ASIN,...>（下書きのみ・1件ずつ・下書きassert）════
  if (MODE_DELETE) {
    const list = (getArg('--delete-drafts') || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!list.length) { console.error('ABORT: --delete-drafts <ASIN,...> 必要'); await ctx.close(); process.exit(1); }
    for (const asin of list) {
      console.log(`[del] ${asin} …`);
      await page.goto('https://kdp.amazon.co.jp/ja_JP/bookshelf', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(4000);
      const info = await page.evaluate((a) => {
        const link = document.querySelector(`a[href*="${a}"]`);
        if (!link) return { err: 'link not found' };
        let el = link;
        for (let d = 0; d < 12 && el; d++) {
          const t = el.textContent || '';
          if (/下書き|レビュー中|販売中/.test(t)) {
            const btn = el.querySelector('button[id*="actions"], button[aria-haspopup], .a-button-dropdown button');
            return { status: (t.match(/下書き|レビュー中|販売中/) || [])[0], btnId: btn ? btn.id : null };
          }
          el = el.parentElement;
        }
        return { err: 'card not found' };
      }, asin);
      if (info.status !== '下書き') { console.log(`[del] SKIP ${asin}: 下書きでない（${info.status || info.err}）＝安全弁で保護`); continue; }
      let opened = false;
      if (info.btnId) { try { await page.locator(`#${info.btnId.replace(/([[\].:])/g, '\\$1')}`).click({ timeout: 5000 }); opened = true; } catch {} }
      if (!opened) { console.log(`[del] SKIP ${asin}: アクションメニューを開けず`); continue; }
      await sleep(2000);
      let clicked = false;
      try { const l = page.getByText('電子書籍の削除', { exact: true }).last(); if (await l.count()) { await l.click({ timeout: 5000 }); clicked = true; } } catch {}
      if (!clicked) { console.log(`[del] SKIP ${asin}: 削除メニュー無し`); await page.keyboard.press('Escape').catch(() => {}); continue; }
      await sleep(2500);
      let ok = false;
      try { const btns = page.locator('button:visible', { hasText: 'OK' }); const n = await btns.count(); for (let i = n - 1; i >= 0; i--) { try { await btns.nth(i).click({ timeout: 3000 }); ok = true; break; } catch {} } } catch {}
      if (!ok) { try { await page.getByRole('button', { name: 'OK' }).last().click({ timeout: 5000 }); ok = true; } catch {} }
      await sleep(5000);
      await page.goto('https://kdp.amazon.co.jp/ja_JP/bookshelf', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(3500);
      const still = await page.locator(`a[href*="${asin}"]`).count();
      console.log(`[del] ${asin}: ` + (still === 0 ? '削除完了' : `WARN まだ存在（${still}）`));
    }
    await ctx.close();
    process.exit(0);
  }

  // ═══ MODE: --dump --asin <ASIN> --page <details|content|pricing>（UI変更時の較正）════
  if (MODE_DUMP) {
    const asin = getArg('--asin');
    const pg = getArg('--page') || 'details';
    if (!asin) { console.error('ABORT: --dump には --asin 必要'); await ctx.close(); process.exit(1); }
    await page.goto(`https://kdp.amazon.co.jp/ja_JP/title-setup/kindle/${asin}/${pg}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(5000);
    console.log('[dump] URL: ' + page.url());
    writeFileSync(join(TMP, `${K(ID)}-dump-${pg}.html`), await page.content());
    for (let s = 0; s < 6; s++) { await page.evaluate((y) => window.scrollTo(0, y), 700 * s), await sleep(800), await shot(page, `dump-${pg}-${s}`); }
    console.log(`[dump] .tmp/${K(ID)}-dump-${pg}.html + スクショ6枚`);
    await ctx.close();
    process.exit(0);
  }

  // ═══ MODE: --diag-category（カテゴリーカスケードの実候補を実測・A/E系末端較正）════
  if (MODE_DIAG_CAT) {
    const asin = getArg('--asin');
    if (asin) await page.goto(`https://kdp.amazon.co.jp/ja_JP/title-setup/kindle/${asin}/details`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#data-title', { timeout: 30000 }).catch(() => {});
    await sleep(1500);
    for (const sel of ['button:has-text("カテゴリーを選択")', 'text=カテゴリーを選択']) { try { const l = page.locator(sel); if (await l.count()) { await l.first().click({ timeout: 8000 }); break; } } catch {} }
    await sleep(3000);
    const dump = async (tag) => {
      const info = await page.evaluate(() => Array.from(document.querySelectorAll('select[name^="react-aui-"]')).map((s, i) => ({ i, value: (s.selectedOptions[0] || {}).text || '', opts: Array.from(s.options).map((o) => o.text).slice(0, 20) })));
      console.log(`[diag] (${tag})`); info.forEach((s) => console.log(`   [${s.i}] "${s.value}" :: ${s.opts.join(' / ')}`));
    };
    await dump('open');
    const pick = async (lvl, label) => { try { await page.locator('select[name^="react-aui-"]').nth(lvl).selectOption({ label }); console.log(`[diag] L${lvl} <- ${label}`); } catch (e) { console.log(`[diag] L${lvl} 失敗`); } await sleep(2500); };
    const dd = (book?.catDropdowns) || ['Kindle本', '資格・検定・就職', '建築・土木'];
    for (let i = 0; i < dd.length; i++) { await pick(i, dd[i]); await dump(`afterL${i}`); }
    console.log('[diag] ↑ 最深 select の候補が「場所」チェックボックスの選択肢。leaf を config に設定せよ');
    await shot(page, 'diag-category');
    await ctx.close();
    process.exit(0);
  }

  // ═══ MODE: --set-price（既刊の価格改定。価格ページ直行で JP 価格だけ差し替える）════
  // 用途: LIVE 済みの本の値付けを変える。既定は dry-run（現在値と目標値を出すだけ）で、
  //   実際の保存は --commit が要る（収益アカウントの公開価格を変えるため）。
  // 価格の真実源は spec の price（= catalog.priceJpy と同期させて運用する）。
  if (MODE_SET_PRICE) {
    const cat0 = readCatalog();
    const row = cat0?.books?.find((b) => b.id === ID);
    const tid = getArg('--asin') || row?.draftAsin;
    if (!tid) { console.error(`ABORT: ${ID} の draftAsin（title-setup の内部ID）が catalog に無い`); await ctx.close(); process.exit(1); }
    await page.goto(`https://kdp.amazon.co.jp/ja_JP/title-setup/kindle/${tid}/pricing`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(6000);
    if (!/\/pricing/i.test(page.url())) { console.error('ABORT: 価格ページに到達できず URL=' + page.url()); await shot(page, 'price-nav-fail'); await ctx.close(); process.exit(3); }

    const PRICE_SEL = 'input[name="data[digital][channels][amazon][JP][price_vat_inclusive]"]';
    const readState = () => page.evaluate((sel) => ({
      roy: (document.querySelector('input[name="data[digital][royalty_rate]-radio"]:checked') || {}).value || '',
      price: (document.querySelector(sel) || {}).value || '',
    }), PRICE_SEL);
    const before = await readState();
    console.log(`[price] ${ID} (${tid}) 現在: ロイヤリティ=${before.roy} / JP価格=${before.price} → 目標 ¥${book.price}`);
    if (!before.price) { console.error('ABORT: 現在価格を読めず（UI 変更の可能性）'); await shot(page, 'price-read-fail'); await ctx.close(); process.exit(3); }
    if (String(before.price) === String(book.price)) { console.log('[price] 既に目標価格。変更不要'); await ctx.close(); process.exit(0); }
    if (!COMMIT) { console.log('[price] dry-run（--commit で保存）'); await ctx.close(); process.exit(0); }

    const p = page.locator(PRICE_SEL);
    await p.scrollIntoViewIfNeeded(); await p.fill(String(book.price)); await p.press('Tab');
    await sleep(3000);
    const after = await readState();
    if (String(after.price) !== String(book.price) || after.roy !== '70_PERCENT') {
      console.error(`ABORT: 入力が反映されない（価格=${after.price} ロイヤリティ=${after.roy}）→ 保存せず停止`);
      await shot(page, 'price-fill-fail'); await ctx.close(); process.exit(3);
    }
    console.log('[price] 保存: 「Kindle本を出版」/「変更を保存」クリック…');
    let clicked = false;
    for (const sel of ['#save-and-publish', '#save-and-publish-announce', 'button:has-text("Kindle 本を出版")', 'button:has-text("Kindle本を出版")', 'button:has-text("変更を保存")']) {
      try { const l = page.locator(sel); if (await l.count()) { await l.first().scrollIntoViewIfNeeded(); await l.first().click({ timeout: 10000 }); clicked = true; break; } } catch {}
    }
    if (!clicked) { console.error('ABORT: 保存ボタンが見つからない（価格は未保存）'); await shot(page, 'price-btn-fail'); await ctx.close(); process.exit(3); }
    await sleep(9000);
    await shot(page, 'price-saved');
    let txt = ''; try { txt = await page.evaluate(() => document.body.innerText || ''); } catch {}
    const okSave = /おめでとう|レビュー中|審査|提出されました|公開されます|更新|保存/.test(txt);
    console.log(`[price] 結果: ${okSave ? `OK ¥${before.price} → ¥${book.price}（反映まで最大 72h）` : 'WARN 確認文言なし（要スクショ確認）'} URL=${page.url()}`);
    await ctx.close();
    process.exit(okSave ? 0 : 4);
  }

  // ═══ MODE: --publish-only（設定済みドラフトを価格ページ直行で出版・詳細/カテゴリーに触れない）════
  // 用途: 下書き保存済み(price/royalty/content 完了)の draftAsin を LIVE 化。resume の
  // 詳細/カテゴリー再操作(ハング要因)を回避。出版は不可逆ゆえ価格/ロイヤリティを検証してから押す。
  if (MODE_PUBLISH_ONLY) {
    const asin = getArg('--asin') || getDraftAsin(ID);
    if (!asin) { console.error(`ABORT: --publish-only には draftAsin が必要（catalog に ${ID} の draftAsin 無し／--asin 指定可）`); await ctx.close(); process.exit(1); }
    await page.goto(`https://kdp.amazon.co.jp/ja_JP/title-setup/kindle/${asin}/pricing`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await sleep(5000);
    if (!/\/pricing/i.test(page.url())) { console.error('ABORT: 価格ページに到達できず URL=' + page.url()); await shot(page, 'pub-nav-fail'); await ctx.close(); process.exit(3); }
    // 出版前検証（価格/ロイヤリティが期待値か。未設定なら出版せず停止＝目視で直す）
    let st = {};
    try { st = await page.evaluate(() => ({ roy: (document.querySelector('input[name="data[digital][royalty_rate]-radio"]:checked') || {}).value || '', price: (document.querySelector('input[name="data[digital][channels][amazon][JP][price_vat_inclusive]"]') || {}).value || '' })); } catch {}
    console.log(`[pub] ${ID} (${asin}) 検証: ロイヤリティ=${st.roy} / JP価格=${st.price} / 期待=70_PERCENT・${book.price}`);
    if (st.roy !== '70_PERCENT' || String(st.price) !== String(book.price)) { console.error('ABORT: 価格/ロイヤリティ不一致 → 出版せず停止（ドラフトを目視で直す）'); await shot(page, 'pub-verify-fail'); await ctx.close(); process.exit(3); }
    // 出版（不可逆）
    console.log('[pub] ★出版: 「Kindle本を出版」クリック…');
    let clicked = false;
    for (const sel of ['#save-and-publish', '#save-and-publish-announce', 'button:has-text("Kindle 本を出版")', 'button:has-text("Kindle本を出版")']) { try { const l = page.locator(sel); if (await l.count()) { await l.first().scrollIntoViewIfNeeded(); await l.first().click({ timeout: 10000 }); clicked = true; break; } } catch {} }
    if (!clicked) { console.error('ABORT: 出版ボタンが見つからない'); await shot(page, 'pub-btn-fail'); await ctx.close(); process.exit(3); }
    await sleep(9000);
    await shot(page, 'pub-published');
    let after = ''; try { after = await page.evaluate(() => document.body.innerText || ''); } catch {}
    const okPub = /おめでとう|レビュー中|出版申請|審査|提出されました|公開されます|出版準備/.test(after);
    console.log(`[pub] 結果: ${okPub ? 'OK 出版リクエスト送信（審査へ・通常72h）' : 'WARN 確認文言なし（要スクショ確認）'} URL=${page.url()}`);
    await ctx.close();
    process.exit(okPub ? 0 : 4);
  }

  // ═══════════════ 新規提出フロー（既定 / --commit-publish で出版）═══════════════
  // ── 再開: draftAsin があれば既存ドラフトへ、無ければ新規作成 ──
  const existingDraft = getDraftAsin(ID);
  if (existingDraft) {
    console.log(`[2] 既存ドラフト ${existingDraft} を再開（重複作成しない）`);
    await page.goto(`https://kdp.amazon.co.jp/ja_JP/title-setup/kindle/${existingDraft}/details`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  } else {
    console.log('[2] 新規 Kindle 本 詳細フォームへ…');
    await page.goto('https://kdp.amazon.co.jp/action/mangaactions.createkindle/ja_JP/title-setup/kindle/new/details', { waitUntil: 'domcontentloaded', timeout: 60000 });
  }
  await page.waitForSelector('#data-title', { timeout: 30000 });
  await sleep(1500);

  // ── ページ1: 詳細記入 ──
  const fillId = async (id, val) => {
    if (val == null || val === '') return;
    try { const loc = page.locator('#' + id + ':not([type=hidden])'); if (await loc.count() === 0) { console.log(`[fill] SKIP #${id}`); return; } await loc.first().fill(String(val)); }
    catch (e) { console.log(`[fill] WARN #${id}: ${e.message.split('\n')[0]}`); }
  };
  try { await page.selectOption('#data-language-native', { label: '日本語' }); } catch {}
  await fillId('data-title', book.title);
  await fillId('data-title-pronunciation', book.titleKana);
  await fillId('data-title-romanized', book.titleRomaji);
  await fillId('data-subtitle', book.subtitle);
  await fillId('data-subtitle-pronunciation', book.subKana);
  await fillId('data-subtitle-romanized', book.subRomaji);
  await fillId('data-publisher-label', book.label);
  await fillId('data-publisher-label-pronunciation', book.labelKana);
  await fillId('data-publisher-label-romanized', book.labelRomaji);
  await fillId('data-series-title', book.series);
  await fillId('data-series-title-pronunciation', book.seriesKana);
  await fillId('data-series-title-romanized', book.seriesRomaji);
  await fillId('data-series-number', book.volume);
  await fillId('data-print-book-primary-author-last-name-jp', book.author);
  await fillId('data-primary-author-pronunciation', book.authorKana);
  await fillId('data-primary-author-name-romanized', book.authorRomaji);
  try {
    const descHtml = book.description.split(/\n{2,}/).map((p) => '<p>' + p.replace(/\n/g, '<br>') + '</p>').join('');
    const ok = await page.evaluate((h) => { try { const k = Object.keys(window.CKEDITOR?.instances || {})[0]; if (k) { window.CKEDITOR.instances[k].setData(h); return true; } } catch {} return false; }, descHtml);
    console.log('[fill] 説明文 CKEditor ' + (ok ? 'OK' : 'WARN(手入力要)'));
  } catch (e) { console.log('[fill] 説明文 WARN: ' + e.message.split('\n')[0]); }
  try { await page.check('#non-public-domain', { force: true }); } catch (e) { console.log('[fill] WARN 権利: ' + e.message.split('\n')[0]); }
  try { await page.check('input[name="data[is_adult_content]-radio"][value="false"]', { force: true }); } catch (e) { console.log('[fill] WARN 成人向け: ' + e.message.split('\n')[0]); }
  for (let i = 0; i < Math.min(7, book.keywords.length); i++) await fillId('data-keywords-' + i, book.keywords[i]);
  console.log('[fill] 詳細記入完了');

  // ── カテゴリー（ドロップダウン階層 + 末端「場所」チェックボックス）──
  const selectCategory = async () => {
    // 既存ドラフト再開時: 既にカテゴリー設定済みなら modal を再操作しない（再操作は解除/ハングの原因）
    try {
      const already = await page.evaluate(() => (document.body.innerText.match(/(\d+)\s*個のカテゴリーを選択済み/) || [])[1] || '0');
      if (already && already !== '0') { console.log(`[cat] 既に ${already} 個選択済み → スキップ`); return true; }
    } catch {}
    // 保存済みドラフトの再開では上の modal 内カウンタが無く、代わりに「本の現在のカテゴリー … › <末端>」
    // が出る。両方見ないと resume が毎回「L0 選択失敗（候補なし）」で誤 ABORT する（2026-08-03 f-08 実測）。
    try {
      const saved = await page.evaluate(() => ((document.body.innerText || '').match(/本の現在のカテゴリー\s*\n?\s*([^\n]+)/) || [])[1] || '');
      if (saved) {
        if (saved.includes(book.catLeaf)) { console.log(`[cat] 設定済み「${saved.trim()}」→ スキップ`); return true; }
        console.log(`[cat] 設定済みだが末端 "${book.catLeaf}" と不一致: ${saved.trim()}`);
        return false;
      }
    } catch {}
    for (const sel of ['button:has-text("カテゴリーを選択")', 'text=カテゴリーを選択']) { try { const l = page.locator(sel); if (await l.count()) { await l.first().click({ timeout: 8000 }); break; } } catch {} }
    await sleep(2500);
    for (let lvl = 0; lvl < book.catDropdowns.length; lvl++) {
      const label = book.catDropdowns[lvl];
      const sel = page.locator('select[name^="react-aui-"]').nth(lvl);
      try { await sel.waitFor({ state: 'attached', timeout: 10000 }); } catch {}
      let opts = [];
      for (let t = 0; t < 30; t++) { try { opts = await sel.evaluate((s) => Array.from(s.options).map((o) => o.text)); } catch { opts = []; } if (opts.includes(label)) break; await sleep(500); }
      if (!opts.includes(label)) { console.log(`[cat] L${lvl} "${label}" 選択失敗。候補: ${opts.slice(0, 30).join(' / ')}`); return false; }
      try { await sel.selectOption({ label }); await sleep(2000); } catch (e) { console.log(`[cat] L${lvl} selectOption失敗`); return false; }
    }
    try { const box = page.getByText(book.catLeaf, { exact: true }); await box.first().waitFor({ state: 'visible', timeout: 8000 }); await box.first().click(); await sleep(1500); }
    catch (e) { console.log(`[cat] 場所チェック失敗 "${book.catLeaf}": ${e.message.split('\n')[0]}`); return false; }
    let cnt = '?'; try { cnt = await page.evaluate(() => (document.body.innerText.match(/(\d+)\s*個のカテゴリーを選択済み/) || [])[1] || '?'); } catch {}
    if (cnt === '0' || cnt === '?') { console.log('[cat] WARN 掲載場所0 → 保存中止'); return false; }
    for (const sel of ['button:has-text("カテゴリーを保存")', 'text=カテゴリーを保存']) { try { const l = page.locator(sel); if (await l.count()) { await l.first().click({ timeout: 8000 }); break; } } catch {} }
    await sleep(3000);
    return true;
  };
  const catOk = await selectCategory();
  console.log(`[cat] ${catOk ? `OK (${book.catDropdowns.join('>')}>[${book.catLeaf}])` : '要確認'}`);
  if (!catOk) { await shot(page, '02-category-fail'); console.error('ABORT: カテゴリー登録失敗（--diag-category で末端ラベル確認）'); await ctx.close(); process.exit(3); }
  await shot(page, '02-details');

  // ── 保存して続行 → ページ2(コンテンツ)。ここで初めて ASIN が発番されるので永続化 ──
  for (const sel of ['#save-and-continue', '#save-and-continue-announce', 'button:has-text("保存して続行")']) { try { const l = page.locator(sel); if (await l.count()) { await l.first().click({ timeout: 8000 }); break; } } catch {} }
  await page.waitForURL(/title-setup\/kindle\/[^/]*\/content/i, { timeout: 30000 }).catch(() => {});
  const asin = (page.url().match(/kindle\/([A-Z0-9]{10,})\//) || [])[1] || existingDraft || '(unknown)';
  if (asin !== '(unknown)') setDraftAsin(ID, asin);
  if (!/\/content/i.test(page.url())) {
    let errs = []; try { errs = await page.evaluate(() => Array.from(document.querySelectorAll('.a-alert-content, [class*="error"]')).map((e) => (e.textContent || '').trim()).filter((t) => t && t.length < 120).slice(0, 8)); } catch {}
    console.error('ABORT: ページ2へ遷移できず。URL=' + page.url() + '\n  エラー: ' + errs.join(' / '));
    await shot(page, '03-content-fail'); await ctx.close(); process.exit(3);
  }
  console.log(`[3] コンテンツページ到達（draft ${asin}）`);

  // ── 原稿EPUB + 表紙 + DRM アップロード → 原稿処理「完了」まで待機 ──
  await page.waitForSelector('#data-assets-interior-file-upload-AjaxInput', { state: 'attached', timeout: 30000 });
  await sleep(1500);
  try { await page.check('input[name="data[is_drm]-radio"][value="true"]', { force: true }); console.log('[3] DRM=有効'); } catch {}
  console.log('[3] 原稿(EPUB) アップロード…');
  await page.locator('#data-assets-interior-file-upload-AjaxInput').setInputFiles(book.epub);
  console.log('[3] 表紙 アップロード…');
  await page.locator('#data-assets-cover-file-upload-AjaxInput').setInputFiles(book.cover);
  // 判定は原稿固有の文言のみ（表紙の「正常にアップロード」で早期完了と誤認しない）。最大10分。
  let up = 'timeout';
  for (let t = 0; t < 120; t++) {
    await sleep(5000);
    const txt = await page.evaluate(() => document.body.innerText || '').catch(() => '');
    if (/ファイルの処理中に問題|処理中にエラー/.test(txt)) { up = 'error'; break; }
    if (/原稿チェックが完了しました|ファイルの処理が完了しました/.test(txt)) { up = 'ok'; break; }
    if (t % 6 === 0) console.log(`[3] 原稿処理待ち… ${t * 5}s`);
  }
  await shot(page, '04-uploaded');
  console.log('[3] 原稿処理: ' + up);
  if (up === 'error') { console.error('ABORT: 原稿がKDP変換で失敗（.svg拡張子のJPEG等を疑う→build確認）'); await ctx.close(); process.exit(4); }
  if (up === 'timeout') { console.error('ABORT: 原稿処理が10分で完了せず（スクショ確認）'); await ctx.close(); process.exit(4); }

  // ── 表紙は投げっぱなしにせず「正常にアップロード」を実査する ──
  // 原稿と同時に投げると表紙側の AJAX だけ無言で落ちることがある（2026-08-03 f-08 で実測。原稿は
  // 完了・表紙は「表紙がアップロードされていません」のままで、価格ページへ進めず ABORT した）。
  // 判定文言は「正常にアップロード」（＝原稿側）ではなく「表紙のアップロードに成功しました」。
  // ただしこの文字列は全パターンが非表示テンプレとして DOM に常駐するので innerText(可視) で見る。
  // 併せてサムネイル <img> の実在も見て、未アップロード時の placeholder と区別する。
  // 判定は必ず「成功の肯定証拠 → 無ければ否定」の順。未アップロード時の placeholder
  // 「表紙がアップロードされていません」は成功後も innerText に残るため、否定を先に見ると
  // 永久に false になる（2026-08-03 に f-09 でこの順序ミスにより偽の ABORT を出した）。
  const coverUploaded = async () => page.evaluate(() => {
    const txt = document.body.innerText || '';
    if (/表紙のアップロードに成功しました/.test(txt)) return true;
    const input = document.querySelector('#data-assets-cover-file-upload-AjaxInput');
    const sec = input && input.closest('div[class*="a-row"], section, form');
    if (sec && Array.from(sec.querySelectorAll('img')).some((i) => i.naturalWidth > 40)) return true;
    return false;
  });
  let coverOk = await coverUploaded();
  for (let attempt = 1; attempt <= 3 && !coverOk; attempt++) {
    if (attempt > 1) {
      console.log(`[3] 表紙 再アップロード（${attempt}回目）…`);
      await page.locator('#data-assets-cover-file-upload-AjaxInput').setInputFiles(book.cover);
    }
    for (let t = 0; t < 18 && !coverOk; t++) { await sleep(5000); coverOk = await coverUploaded(); }
  }
  console.log('[3] 表紙: ' + (coverOk ? 'ok' : 'fail'));
  if (!coverOk) { await shot(page, '04b-cover-fail'); console.error('ABORT: 表紙がアップロードされないまま（3回試行）。スクショで表紙欄を確認'); await ctx.close(); process.exit(4); }

  // ── AI 生成コンテンツ申告（config の aiDeclaration に準拠）──
  const ai = book.aiDeclaration;
  const anyAi = ai.text !== 'NONE' || ai.images !== 'NONE' || ai.translations !== 'NONE';
  try {
    const target = anyAi ? 'はい' : 'いいえ';
    await page.getByText(target, { exact: true }).first().scrollIntoViewIfNeeded(); await sleep(400);
    await page.getByText(target, { exact: true }).first().click(); await sleep(2000);
    if (anyAi) {
      await page.selectOption('#generative-ai-questionnaire-text', { label: AI_AMOUNT_LABELS[ai.text] || 'なし' });
      await page.selectOption('#generative-ai-questionnaire-images', { label: AI_AMOUNT_LABELS[ai.images] || 'なし' });
      await page.selectOption('#generative-ai-questionnaire-translations', { label: AI_AMOUNT_LABELS[ai.translations] || 'なし' });
      // 画像=AI生成 を選ぶと「使用したAIツール名」が必須で出現
      if (ai.images !== 'NONE' && ai.imageTool) {
        await sleep(1500);
        const near = page.locator('#generative-ai-questionnaire-images').locator('xpath=ancestor::div[contains(@class,"a-row")][1]/following::input[@type="text"][1]');
        try { await near.fill(ai.imageTool); console.log(`[4] AIツール名="${ai.imageTool}"`); } catch { console.log('[4] AIツール名 記入失敗'); }
      }
    }
    console.log(`[4] AI申告: ${target}${anyAi ? ` (img=${ai.images})` : ''}`);
  } catch (e) { console.log('[4] AI申告 WARN: ' + e.message.split('\n')[0]); }
  await sleep(1000);

  // ── アクセシビリティ（画像alt questionnaire・React制御ラジオ）──
  // value= unknown|not_readable|partially_readable|readable。既定 "unknown"（含まれているか不明）
  // = alt未検証の正直な回答（KDPも既定で選択済み）。page.check は React state 確認で timeout するため
  // 実行時DOM上で input.click()（React onChange 発火）する。
  try {
    const val = book.accessibility || 'unknown';
    const set = await page.evaluate((v) => {
      const r = document.querySelector(`input[name="data[accessibility][image_reading]"][value="${v}"]`);
      if (!r) return 'missing';
      if (!r.checked) { r.click(); return 'set'; }
      return 'already';
    }, val);
    console.log(`[4] アクセシビリティ=${val} (${set})`);
  } catch (e) { console.log('[4] アクセシビリティ WARN: ' + e.message.split('\n')[0]); }
  await sleep(400);
  // 新規アップロード時の affirmation（「回答が正しいことを確認」）＝React動的描画。
  // input[type=checkbox] / [role=checkbox] 両対応で文脈テキスト一致のものを click。
  try {
    const affirmed = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('input[type="checkbox"], [role="checkbox"]'));
      for (const b of nodes) {
        const ctx = (b.closest('label,div,section,li') || {}).textContent || '';
        if (!/回答が正しいこと|確認することになります|新しい原稿または表紙/.test(ctx)) continue;
        if (b.disabled) continue;
        const checked = b.type === 'checkbox' ? b.checked : b.getAttribute('aria-checked') === 'true';
        if (!checked) b.click();
        return true;
      }
      return false;
    });
    if (!affirmed) {
      const lbl = page.getByText('自分の回答が正しいことを確認することになります', { exact: false });
      if (await lbl.count()) await lbl.first().click({ timeout: 4000 }).catch(() => {});
    }
    console.log(`[4] affirmation: ${affirmed ? 'checked' : 'fallback-label-click'}`);
  } catch (e) { console.log('[4] affirmation WARN: ' + e.message.split('\n')[0]); }
  await sleep(1000);
  await shot(page, '05-content-final');

  // ── 保存して続行 → ページ3(価格) ──
  for (const sel of ['#save-and-continue', '#save-and-continue-announce', 'button:has-text("保存して続行")']) { try { const l = page.locator(sel); if (await l.count()) { await l.first().click({ timeout: 8000 }); break; } } catch {} }
  await page.waitForURL(/title-setup\/kindle\/[^/]*\/pricing/i, { timeout: 30000 }).catch(() => {});
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await sleep(4000);
  if (!/\/pricing/i.test(page.url())) {
    let errs = []; try { errs = await page.evaluate(() => Array.from(document.querySelectorAll('.a-alert-content, [class*="error"]')).map((e) => (e.textContent || '').trim()).filter((t) => t && t.length < 120).slice(0, 8)); } catch {}
    console.error('ABORT: 価格ページへ遷移できず。エラー: ' + errs.join(' / ')); await shot(page, '06-pricing-fail'); await ctx.close(); process.exit(3);
  }
  console.log('[5] 価格ページ到達');

  // ── ページ3: 価格設定（KDPセレクト / 全地域 / 70% / ¥price）──
  if (book.kdpSelect) { try { const s = page.locator('input[name="data[is_select]-check"]'); if (!(await s.isChecked().catch(() => true))) await s.check({ force: true }); console.log('[5] KDPセレクト=加入'); } catch (e) { console.log('[5] KDPセレクト WARN'); } }
  try { const all = page.getByText('すべての地域', { exact: false }); if (await all.count()) { await all.first().scrollIntoViewIfNeeded(); await all.first().click(); await sleep(1000); } } catch {}
  try { await page.check('input[name="data[digital][royalty_rate]-radio"][value="70_PERCENT"]', { force: true }); console.log('[5] ロイヤリティ=70%'); } catch (e) { console.log('[5] ロイヤリティ WARN'); }
  await sleep(1000);
  try { const p = page.locator('input[name="data[digital][channels][amazon][JP][price_vat_inclusive]"]'); await p.scrollIntoViewIfNeeded(); await p.fill(String(book.price)); await p.press('Tab'); console.log(`[5] JP価格=¥${book.price}`); } catch (e) { console.log('[5] 価格 WARN'); }
  await sleep(3000);
  await shot(page, '07-pricing');
  // 出版前検証（価格/ロイヤリティ不一致なら出版しない）
  try {
    const st = await page.evaluate(() => ({ roy: (document.querySelector('input[name="data[digital][royalty_rate]-radio"]:checked') || {}).value || '', price: (document.querySelector('input[name="data[digital][channels][amazon][JP][price_vat_inclusive]"]') || {}).value || '' }));
    console.log(`[5] 出版前検証: ロイヤリティ=${st.roy} / JP価格=${st.price}`);
    if (st.roy !== '70_PERCENT' || String(st.price) !== String(book.price)) { console.error('ABORT: 価格/ロイヤリティ不一致 → 出版せず停止'); await ctx.close(); process.exit(3); }
  } catch {}

  // ── 出版（不可逆）: --commit-publish のときのみ ──
  if (!COMMIT_PUBLISH) {
    for (const sel of ['#save', '#save-announce']) { try { const l = page.locator(sel); if (await l.count()) { await l.first().click({ timeout: 8000 }); break; } } catch {} }
    await sleep(4000); await shot(page, '08-saved');
    printChecklist(asin, up);
    console.log('[done] DRAFT 完了（詳細+カテゴリー+原稿処理完了+AI申告+アクセシビリティ+価格・下書き保存）。出版は --commit-publish で再実行。');
    await ctx.close();
    process.exit(0);
  }
  console.log('[6] ★出版: 「Kindle本を出版」クリック…');
  let pub = false;
  for (const sel of ['#save-and-publish', 'button:has-text("Kindle 本を出版")', 'button:has-text("Kindle本を出版")']) { try { const l = page.locator(sel); if (await l.count()) { await l.first().scrollIntoViewIfNeeded(); await l.first().click({ timeout: 8000 }); pub = true; break; } } catch {} }
  await sleep(8000);
  await shot(page, '09-published');
  let after = ''; try { after = await page.evaluate(() => document.body.innerText || ''); } catch {}
  const okPub = /おめでとう|レビュー中|出版申請|審査|Kindle 本が提出されました/.test(after);
  console.log('[6] 出版後: ' + (okPub ? 'リクエスト送信確認（審査へ・通常72h）' : 'WARN 確認文言なし（スクショ確認）') + ' URL=' + page.url());
  await ctx.close();
  process.exit(pub && okPub ? 0 : 2);
} catch (e) {
  console.error('FATAL: ' + (e.stack || e.message));
  try { await ctx.close(); } catch {}
  process.exit(1);
}

// ── チェックリスト出力（下書き完了時）──
function printChecklist(asin, up) {
  const cl = [
    '', '========================================================',
    ` KDP 提出前チェックリスト  ${ID}  ${book.title}`,
    '========================================================',
    ` ドラフト: https://kdp.amazon.co.jp/ja_JP/title-setup/kindle/${asin}/pricing`,
    ` draft ASIN: ${asin}`, '',
    ' 自動完了:',
    '   [x] 詳細/フリガナ/ローマ字/サブ/レーベル/シリーズ/著者/説明文/キーワード',
    '   [x] 権利=著作権者本人 / 成人向け=いいえ',
    `   [x] カテゴリー: ${book.catDropdowns.join(' > ')} > [${book.catLeaf}]`,
    `   [x] 原稿(EPUB)+表紙+DRM / 原稿処理=${up}`,
    `   [x] AI申告(img=${book.aiDeclaration.images}) / アクセシビリティ=${book.accessibility}`,
    `   [x] KDPセレクト=${book.kdpSelect} / 70% / ¥${book.price}`, '',
    ' ★人が確認して出版（不可逆）:',
    `   [ ] Kindle Previewer 目視（${book.previewNote || '選択肢連番・章構成'}）`,
    '   [ ] 内容・価格を最終確認 →「Kindle本を出版」（または --commit-publish で再実行）',
    '   [ ] 公開後: ASIN を catalog/08戦略doc/README の3箇所に記録',
    '========================================================', '',
  ].join('\n');
  console.log(cl);
  try { writeFileSync(join(TMP, `${K(ID)}-checklist.txt`), cl); } catch {}
}
