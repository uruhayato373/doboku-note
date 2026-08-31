#!/usr/bin/env node
/**
 * note-publish.mjs
 * ---------------------------------------------------------------------------
 * note 有料記事をブラウザ自動操作で「下書き作成 → 公開」する Playwright パブリッシャ。
 * publish-note(browser-use=Mac) の Windows 決定的 Playwright 版。note-magazine-add と同じ
 *   「システム Chrome(channel:chrome) + 永続プロファイル + proxy + ignoreHTTPSErrors」方式で
 *   会社PCの社内プロキシ(TLS傍受)を越える。
 *
 * 工程: account ゲート → エディタ → カバー(eyecatch) → タイトル → 本文(ClipboardEvent paste・
 *   markdown変換) → リンクカード化(各URL行を Range選択→Delete→type→Enter＝note の埋め込み検出は type で起動・paste不可)
 *   → 目次(H2>=3 で最初のh2直前に note ネイティブ目次 #toc-setting を挿入・Phase 6.5・--no-toc で抑止)
 *   → 下書き保存 → 公開に進む → 有料+価格(#price JS setter)
 *   → タグ → 有料エリア設定 → 有料境界を BOUNDARY 見出し（既定=「試験問題/予想問題」・frontmatter `paidBoundary` か `--boundary-regex` で上書き）直前に設定 → ★境界検証ゲート★ → 投稿する。
 *   公開後 writeback は frontmatter の note* 行が無ければ挿入する（setFmField・旧 replace-only は無音失敗した）。
 *
 * 安全弁（収益アカウントのため）:
 *   1. account=dobokunote を assert（不一致は即中断・1記事も触らない）
 *   2. 既定は draft（下書き保存のみ）。実公開は --commit 必須
 *   3. --commit でも「有料境界が BOUNDARY 見出しの直前」を検証してからのみ投稿（boundaryBeforeExam=false は中断）
 *   4. 公開後に note 公開ページを実取得し 無料プレビュー/カード/価格 を実体検証（偽成功ガード）
 *   5. notePricing: membership は公開範囲を選べたときのみ投稿（選べなければ中断＝全員公開の事故防止）。
 *      公開後は未ログインで本文が読めないことまで検証する（[13m]）
 *
 * 使い方:
 *   node scripts/note-publish.mjs --article <article.md path>                       # 下書き作成のみ（既定・安全）
 *   node scripts/note-publish.mjs --article <path> --commit                        # 即時公開
 *   node scripts/note-publish.mjs --article <path> --commit --schedule 2026-06-20T07:00  # 予約投稿（JST）
 *   node scripts/note-publish.mjs --article <path> --commit                        # notePricing: membership なら会員限定
 *   node scripts/note-publish.mjs --article <path> --commit --membership-plan "通年プラン｜過去問＆月例予想"  # プラン限定
 *   （カバー/タグは article と同じ年度dir の cover-<type>.png / hashtags-<type>.txt を自動解決）
 *
 * 予約投稿（--schedule, note は無料で予約公開可）:
 *   - 即時公開の「投稿する」の代わりに 日時設定→日付→時刻→「予約投稿」を操作する。
 *   - 安全弁: 日時を UI で確定できないときは即時公開せず下書きに退避する（誤即時公開を防止）。
 *   - selector は scheduling.md 由来。初回実走で .tmp/np-sched-*.png を確認し必要なら調整すること。
 *
 * 真実源: .claude/knowledge/reference/note-api-verification.md / publish-note/SKILL.md（手順の元）
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, basename, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { recordPublishedHash, recordPublishedTagHash, recordPublishedMetaHash, recordPublishedAssetHash } from './lib/note-republish-hash.mjs';
import { cardifyBareUrls, repairUrlHeadings, listUrlHeadingsInEditor } from './lib/note-cardify.mjs';
import { extractBodyImages, insertImagesAtPlaceholders } from './lib/note-images.mjs';
import { assertLiveBody, expectedFreePreviewMin } from './lib/note-live-check.mjs';
import { todayJst } from './lib/jst-date.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE = join(ROOT, '.local/playwright-note-profile');
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';

const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const COMMIT = argv.includes('--commit');
const ARTICLE = getArg('--article');
if (!ARTICLE) { console.error('--article <path> required'); process.exit(1); }
// --schedule "YYYY-MM-DDTHH:MM"（JST ローカル）。指定時は即時公開でなく予約投稿（note は無料で予約公開可）。
const SCHEDULE = getArg('--schedule');
let sched = null;
if (SCHEDULE) {
  const m = SCHEDULE.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})$/);
  if (!m) { console.error('--schedule format must be YYYY-MM-DDTHH:MM (JST)'); process.exit(1); }
  sched = { y: +m[1], mo: +m[2], d: +m[3], h: +m[4], mi: +m[5], date: `${m[1]}-${m[2]}-${m[3]}`, raw: SCHEDULE };
}

// ---- データ準備（frontmatter + body + cover/hashtags 解決）----
// ARTICLE は相対（直接呼び）/絶対（note-publish-magazine の globSync 経由）どちらも受理。
// resolve は絶対パスをそのまま、相対は ROOT 基準で解決する（join だと絶対+絶対で二重化する）。
const articleAbs = resolve(ROOT, ARTICLE);
if (!existsSync(articleAbs)) { console.error('article not found: ' + articleAbs); process.exit(1); }
const raw = readFileSync(articleAbs, 'utf8');
const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
const fmField = (k) => (fm.match(new RegExp('^' + k + ':\\s*(?:"(.*?)"|\'(.*?)\'|(.+?))\\s*$', 'm')) || []).slice(1).find(Boolean) || '';
const notePricing = fmField('notePricing');
const price = parseInt(fmField('price') || '0', 10);
let body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n*/, '');
const title = (body.match(/^#\s+(.+)$/m)?.[1] || fmField('coverTitle')).trim();
// コメント・H1 を除去（画像は除去せずトークン化して残す＝本文画像の live 反映）
body = body.replace(/<!--[\s\S]*?-->\r?\n?/g, '').trim().replace(/^#\s+.*(?:\r?\n)+/, '').trim();
// cover / hashtags を type サフィックスで解決（article-II1.md → cover-II1.png / hashtags-II1.txt）
const dir = dirname(articleAbs);
// 画像行 → トークン化（paste 後に「＋」メニューでアップロード。lib/note-images.mjs）
const { body: tokenBody, images: bodyImages, missing: imgMissing } = extractBodyImages(body, dir);
body = tokenBody;
if (imgMissing.length) console.log(`[img] WARN 除去した画像行: ${imgMissing.join(' / ')}`);
const typeSuffix = (basename(articleAbs).match(/article-([^.]+)\.md$/) || [])[1] || '';
const coverCandidates = [typeSuffix && join(dir, `img/cover-${typeSuffix}.png`), join(dir, 'img/cover.png')].filter(Boolean);
// カバー PNG は R2 へ退避してある（DN-0111 Phase 4-B）。実体が無ければ取り寄せる。
// 取れなければ cover=null のまま進めず、**note へ書き込む前に止める**——
// カバー無しで公開すると、後から差し替えても外部（SNS カード等）に残ってしまう。
const { ensureLocal: ensureLocalAsset } = await import('./lib/asset-storage.mjs');
const cover = coverCandidates.find((c) => ensureLocalAsset(c)) || null;
if (!cover && coverCandidates.length) {
  console.error('[prep] カバーが手元にも R2 にも無い。note へは何も書かずに止める:');
  for (const c of coverCandidates) console.error('  ' + c);
  process.exit(1);
}
const tagsCandidates = [typeSuffix && join(dir, `hashtags-${typeSuffix}.txt`), join(dir, 'hashtags.txt')].filter(Boolean);
const tagsFile = tagsCandidates.find(existsSync);
const tags = tagsFile ? readFileSync(tagsFile, 'utf8').split(/\r?\n/).map((s) => s.trim().replace(/^#/, '')).filter(Boolean).slice(0, 99) : [];
const isPaid = notePricing === 'paid' && price > 0;
// メンバーシップ限定公開（2026-08-06 実装）。note の公開設定は「記事タイプ=無料」のまま
// 「記事の追加 → メンバーシップ」タブで公開範囲を選ぶ二段構えで、有料(is_paid)とは別軸。
//   - 既定 = 「メンバー全員に公開」（全プランの会員が読める）
//   - --membership-plan "<プラン名>" = 「プラン限定公開」の該当プラン行を選ぶ
// notePricing: membership を isPaid=false のまま素通りさせると **全員に無料公開** される
// （2026-08-05 実測）。ここで捕まえて公開範囲を明示的に選ばせ、選べなければ公開しない。
const isMembership = notePricing === 'membership';
const MEMBERSHIP_PLAN = getArg('--membership-plan') || '';
const MEMBERSHIP_TARGET = MEMBERSHIP_PLAN || 'メンバー全員に公開';
// 既存下書きの再利用。--use-draft <noteId> 明示 > frontmatter noteDraftId（--no-reuse-draft で抑止）。
const USE_DRAFT = getArg('--use-draft') || '';
const REUSE_DRAFT_FM = !argv.includes('--no-reuse-draft');
// 目次ブロック挿入（note ネイティブ #toc-setting・最初のh2直前）。H2 が 3 つ以上のとき自動挿入。
// markdown の #アンカーは note で機能しないため見出しジャンプの唯一手段。--no-toc で抑止。
const h2count = (body.match(/^##\s+/gm) || []).length;
const wantToc = !argv.includes('--no-toc') && h2count >= 3;
// 有料境界の見出し regex（H2 の innerText 先頭一致）。既定=総監/建設の「試験問題/予想問題」。
// 他コンテンツ型は frontmatter `paidBoundary` か `--boundary-regex` で上書き（例: 1級土木 工事別パック=「品質管理」）。
const BOUNDARY = getArg('--boundary-regex') || fmField('paidBoundary') || '試験問題|予想問題';
const minFreeChars = isPaid ? expectedFreePreviewMin(body, BOUNDARY) : 0;
// live 検証の期待画像数。有料は API 本文が paywall 切断されるため「境界より前の画像枚数」。
let expectedImgs = bodyImages.length;
if (isPaid) {
  const bre = new RegExp('^##\\s+(' + BOUNDARY + ')');
  const bIdx = body.split('\n').findIndex((l) => bre.test(l.trim()));
  if (bIdx >= 0) expectedImgs = (body.split('\n').slice(0, bIdx).join('\n').match(/〔〔IMG:\d+〕〕/g) || []).length;
}

// ガード: プレースホルダ残・空タイトル
if (/\{\{|※note\s*公開後|MAGAZINE_URL/.test(body)) { console.error('ABORT: プレースホルダが本文に残存'); process.exit(1); }
if (!title) { console.error('ABORT: タイトルが空'); process.exit(1); }
// ガード: markdown 表（note 非対応・生パイプ表示になる）。note-lint のバックストップ。
// コードフェンス外の行頭パイプを検出したら公開しない（2026-07-04・9記事流出の再発防止）。
{
  let inFence = false;
  const pipeLine = body.split('\n').find((l) => { if (/^\s*```/.test(l)) inFence = !inFence; return !inFence && /^\s*\|/.test(l); });
  if (pipeLine) { console.error(`ABORT: markdown 表を検出（note 非対応・箇条書きへ変換せよ）: ${pipeLine.trim().slice(0, 50)}`); process.exit(1); }
}
console.log(`[prep] title="${title.slice(0, 40)}" paid=${isPaid} price=${price} cover=${!!cover} tags=${tags.length} h2=${h2count} toc=${wantToc} bodyChars=${[...body].length} mode=${COMMIT ? (sched ? `SCHEDULE(${sched.raw})` : 'COMMIT(即時公開)') : 'DRAFT(下書きのみ)'}`);

// 冪等ガード: 既に公開済み（frontmatter に noteUrl あり）ならスキップ（バッチ再実行で重複公開しない）
const existingUrl = fmField('noteUrl');
if (existingUrl && /^https?:\/\//.test(existingUrl)) { console.log('[skip] 既に公開済み: ' + existingUrl); process.exit(0); }

const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: false, channel: 'chrome', proxy: PROXY ? { server: PROXY } : undefined,
  ignoreHTTPSErrors: true, viewport: { width: 1366, height: 1000 }, args: ['--disable-blink-features=AutomationControlled'],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let publishedUrl = null;
try {
  const page = ctx.pages()[0] || (await ctx.newPage());

  // 1. account ゲート（ページ描画遅延に強い polling・偽 ABORT 防止）
  await page.goto('https://note.com/settings/account', { waitUntil: 'domcontentloaded', timeout: 60000 });
  try { await page.waitForLoadState('networkidle', { timeout: 20000 }); } catch {}
  let acct = false;
  // SPA 描画遅延＋polling 中のナビゲーションで evaluate が Execution context destroyed を投げるため
  // try/catch で吸収し、networkidle 後に十分な回数リトライする（偽 ABORT 防止・2026-07-04 堅牢化）
  for (let i = 0; i < 12; i++) { await sleep(2500); let t = ''; try { t = await page.evaluate(() => document.body.innerText || ''); } catch {} if (/dobokunote/.test(t)) { acct = true; break; } }
  if (!acct) { console.error('ABORT: account != dobokunote'); await ctx.close(); process.exit(2); }
  console.log('[1] account gate OK (dobokunote)');

  // 2. エディタを開く。既定は /new（空ドラフトを生成）。
  //    --use-draft / frontmatter noteDraftId があれば **既存の下書きを再利用**して開く
  //    （/new を使うと下書きを作り直して元の下書きが孤児化し、削除は手作業になるため）。
  //    再利用時は本文を空にしてから既存フローに合流する（note-update-body の [3a] と同型）。
  const reuseDraft = USE_DRAFT || (REUSE_DRAFT_FM ? fmField('noteDraftId') : '');
  if (reuseDraft) {
    await page.goto(`https://editor.note.com/notes/${reuseDraft}/edit/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(3000);
    try { await page.waitForSelector('[contenteditable=true]', { timeout: 30000 }); }
    catch { console.error('ABORT: editor not loaded (draft ' + reuseDraft + ')'); await ctx.close(); process.exit(3); }
    await sleep(2000);
    const ed = page.locator('[contenteditable=true]').first();
    await ed.click(); await sleep(400);
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a'); await sleep(300);
    await page.keyboard.press('Delete'); await sleep(800);
    const emptied = await page.evaluate(() => (document.querySelector('[contenteditable=true]')?.innerText || '').trim().length);
    console.log(`[2a] 既存下書き ${reuseDraft} を再利用（emptied chars=${emptied}）`);
    if (emptied > 0) { console.error('ABORT: 下書きを空にできず（本文二重化の恐れ）'); await ctx.close(); process.exit(3); }
  } else {
    await page.goto('https://editor.note.com/new', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(3000);
    try { await page.waitForSelector('[contenteditable=true]', { timeout: 30000 }); }
    catch { console.error('ABORT: editor not loaded'); await ctx.close(); process.exit(3); }
    await sleep(2000);
  }
  const draftUrl = page.url();
  console.log('[2] editor:', draftUrl);

  // 3. カバー(eyecatch)
  if (cover) {
    try {
      await page.evaluate(() => window.scrollTo(0, 0)); await sleep(600);
      await page.locator('[aria-label="画像を追加"]').first().click({ timeout: 8000 }); await sleep(1500);
      const up = page.getByText('画像をアップロード', { exact: false }); if (await up.count()) { await up.first().click(); await sleep(1200); }
      await page.locator('input#note-editor-eyecatch-input, input[type=file]').first().setInputFiles(cover, { timeout: 8000 }); await sleep(2500);
      const sc = page.getByRole('button', { name: '保存', exact: true }); if (await sc.count()) { await sc.first().click(); await sleep(2500); }
      console.log('[3] cover uploaded');
    } catch (e) { console.log('[3] cover skip:', e.message.split('\n')[0]); }
  }

  // 4. タイトル
  const titleSel = 'textarea[placeholder*="タイトル"]';
  await page.click(titleSel); await page.fill(titleSel, title); await sleep(800);
  console.log('[4] title set');

  // 5. 本文 paste（ClipboardEvent・markdown 変換）
  await page.click('[contenteditable=true]'); await sleep(400);
  await page.evaluate((b) => { const ed = document.querySelector('[contenteditable=true]'); ed.focus(); const dt = new DataTransfer(); dt.setData('text/plain', b); ed.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }, body);
  await sleep(3500);
  const edChars = await page.evaluate(() => (document.querySelector('[contenteditable=true]')?.innerText || '').length);
  console.log('[5] body pasted, editor chars=' + edChars);

  // 6. リンクカード化（共有実装 lib/note-cardify.mjs）: URL 単独段落を type→Enter でカード化。
  //    note の埋め込み検出は keyboard.type（実入力）で起動する（synthetic paste では起動しない＝v1-v5失敗・v6/v7で確定）。
  //    旧実装の「URL が見出しに化けるレース」は根治済み。6b で残存を修復し、残れば公開を止める（下記 [12] ゲート）。
  let urlHeadingsLeft = [];
  try {
    await cardifyBareUrls(page, { tag: '[6]' });
    await repairUrlHeadings(page, { tag: '[6b]' });
    urlHeadingsLeft = await listUrlHeadingsInEditor(page);
    if (urlHeadingsLeft.length) console.error(`[6b] ★URL見出しが残存（公開ゲートで中断予定）: ${urlHeadingsLeft.join(' / ')}★`);
  } catch (e) { console.log('[6] cardify skip:', e.message.split('\n')[0]); }

  // 6.4 本文画像アップロード（トークン段落 → 実画像）。leftover/failed は公開ゲート [12] で下書き退避。
  let imgLeftover = [], imgFailed = [];
  if (bodyImages.length) {
    try {
      const r = await insertImagesAtPlaceholders(page, bodyImages, { tag: '[6.4]' });
      imgLeftover = r.leftover; imgFailed = r.failed;
      if (!r.settled) imgFailed = imgFailed.concat([{ reason: 'CDN確定せず' }]); // 未確定は公開ゲートで中断
      if (imgLeftover.length || imgFailed.length) console.error(`[6.4] ★画像未完（leftover=${imgLeftover.length} failed=${imgFailed.length}）→ 公開ゲートで中断予定★`);
    } catch (e) { console.log('[6.4] 画像挿入 skip:', e.message.split('\n')[0]); imgFailed = [{ reason: e.message.split('\n')[0] }]; }
  }

  // 6.5 目次ブロック挿入（H2>=3・最初のh2直前）。note ネイティブ目次（button#toc-setting）。
  //     手順: 最初の h2 に caret→Enter→ArrowUp で直前に空段落を作る→ caret に最も近い「+」メニュー
  //     （aria-label=メニューを開く）→ 目次ボタン（#toc-setting）クリック。body 先頭に入れると導入段落を
  //     分断する（見出し→目次→本文リスト）ため h2 直前にする（2026-07-04 是正・editor-operations.md Phase 4.5）。
  //     検証は screenshot(.tmp/np-toc.png)＋目次<最初のh2 の DOM チェック。
  //     導入直後（最初のh2直前＝有料ラインより上）に入るため、無料プレビューで収録構成が見える。
  if (wantToc) {
    try {
      // 目次は「最初の h2 の直前」に入れる（導入の後・最初の内容見出しの前）。body 先頭に置くと
      // 導入段落の途中に割り込み、見出し→目次→本文リストと導入を分断する（2026-07-04 是正）。
      await page.click('[contenteditable=true]'); await sleep(400);
      const caretOk = await page.evaluate(() => {
        const ed = document.querySelector('[contenteditable=true]'); ed.focus();
        const h = ed.querySelector('h2'); if (!h) return false;
        h.scrollIntoView({ block: 'center' });
        const r = document.createRange(); r.selectNodeContents(h); r.collapse(true);
        const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
        return true;
      });
      await sleep(400);
      await page.keyboard.press('Enter'); await sleep(500);
      await page.keyboard.press('ArrowUp'); await sleep(1000);
      let inserted = false;
      const box = await page.evaluate(() => {
        const sel = window.getSelection(); const cy = (sel.rangeCount ? sel.getRangeAt(0).getBoundingClientRect().top : 0) || 0;
        const b = Array.from(document.querySelectorAll('[aria-label="メニューを開く"]'));
        if (!b.length) return null;
        b.sort((p, q) => Math.abs(p.getBoundingClientRect().top - cy) - Math.abs(q.getBoundingClientRect().top - cy));
        const rr = b[0].getBoundingClientRect(); return { x: rr.left + rr.width / 2, y: rr.top + rr.height / 2 };
      });
      if (caretOk && box) {
        await page.mouse.click(box.x, box.y); await sleep(1800);
        const toc = page.locator('#toc-setting');
        if (await toc.count()) {
          await toc.first().scrollIntoViewIfNeeded();
          await toc.first().click({ timeout: 15000, force: true });
          await sleep(2000);
          inserted = true;
        }
        else console.log('[6.5] 目次ボタン(#toc-setting) 未検出 → menu 内容を screenshot');
      } else console.log('[6.5] h2/+メニュー 未検出（TOC skip）');
      const tocGuess = await page.evaluate(() => {
        const ed = document.querySelector('[contenteditable=true]'); if (!ed) return false;
        return !!ed.querySelector('[data-name=index],[data-index],.note-common-styles__textnote-index') ||
          /目次/.test((ed.innerText || '').split('\n').slice(0, 4).join('\n'));
      });
      // 自己検証: 目次ノードが最初の h2 より前にあるか（body 先頭に入って導入を分断する再発の検出）。
      const verifyToc = () => page.evaluate(() => {
        const ed = document.querySelector('[contenteditable=true]'); if (!ed) return { ok: null, reason: 'no editor' };
        const kids = Array.from(ed.querySelectorAll('*'));
        const isToc = (el) => /table-of-contents/i.test(el.tagName) || el.getAttribute?.('data-name') === 'index' || /(^|\s)toc(\s|$)/i.test(el.className || '');
        const tocIdx = kids.findIndex(isToc);
        const h2Idx = kids.findIndex((el) => el.tagName === 'H2');
        if (tocIdx < 0) return { ok: null, reason: 'toc node 未検出（検証保留・screenshot 参照）' };
        if (h2Idx < 0) return { ok: null, reason: 'h2 未検出' };
        return { ok: tocIdx < h2Idx, tocIdx, h2Idx };
      });
      let chk = await verifyToc();
      if (chk.ok === false) {
        // 誤配置分を除去して最初の h2 直前へ 1 回だけ入れ直す（WARN 埋没による再発の防止）。
        console.log(`[6.5] ⚠ 目次が最初のh2より後（tocIdx=${chk.tocIdx} h2Idx=${chk.h2Idx}）→ 除去して再挿入`);
        await page.evaluate(() => {
          const ed = document.querySelector('[contenteditable=true]'); if (!ed) return;
          const isToc = (el) => /table-of-contents/i.test(el.tagName) || el.getAttribute?.('data-name') === 'index' || /(^|\s)toc(\s|$)/i.test(el.className || '');
          ed.querySelectorAll('*').forEach((el) => { if (isToc(el)) el.remove(); });
        });
        await sleep(600);
        const caret2 = await page.evaluate(() => {
          const ed = document.querySelector('[contenteditable=true]'); ed.focus();
          const h = ed.querySelector('h2'); if (!h) return false;
          h.scrollIntoView({ block: 'center' });
          const r = document.createRange(); r.selectNodeContents(h); r.collapse(true);
          const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); return true;
        });
        if (caret2) {
          await sleep(300); await page.keyboard.press('Enter'); await sleep(500); await page.keyboard.press('ArrowUp'); await sleep(900);
          const box2 = await page.evaluate(() => {
            const sel = window.getSelection(); const cy = (sel.rangeCount ? sel.getRangeAt(0).getBoundingClientRect().top : 0) || 0;
            const b = Array.from(document.querySelectorAll('[aria-label="メニューを開く"]'));
            if (!b.length) return null;
            b.sort((p, q) => Math.abs(p.getBoundingClientRect().top - cy) - Math.abs(q.getBoundingClientRect().top - cy));
            const rr = b[0].getBoundingClientRect(); return { x: rr.left + rr.width / 2, y: rr.top + rr.height / 2 };
          });
          if (box2) { await page.mouse.click(box2.x, box2.y); await sleep(1800); const toc2 = page.locator('#toc-setting'); if (await toc2.count()) { await toc2.first().click({ timeout: 8000 }); await sleep(2000); } }
          chk = await verifyToc();
        }
      }
      await page.screenshot({ path: join(ROOT, '.tmp/np-toc.png') });
      if (chk.ok === true) console.log(`[6.5] TOC insert OK（目次 < 最初のh2・attempted=${inserted} guess=${tocGuess}）`);
      else if (chk.ok === false) console.error(`[6.5] ⚠ 再挿入後も目次が最初のh2より後（tocIdx=${chk.tocIdx} h2Idx=${chk.h2Idx}）→ .tmp/np-toc.png を目視し手動で最初のh2直前へ移動すること`);
      else console.log(`[6.5] TOC 位置検証 保留: ${chk.reason}（.tmp/np-toc.png で目視）`);
    } catch (e) { console.log('[6.5] toc skip:', e.message.split('\n')[0]); }
  }

  // 7. 下書き保存（中間保存）
  const draftBtn = page.getByRole('button', { name: '下書き保存' });
  if (await draftBtn.count()) { await draftBtn.first().click(); await sleep(3500); console.log('[7] 下書き保存'); }

  if (!isPaid) {
    console.log('[note] 無料記事は有料設定をスキップ。');
  }

  // 8. 公開フロー: 公開に進む
  const next = page.getByRole('button', { name: '公開に進む' });
  if (!(await next.count())) { console.log('WARN: 公開に進む 未検出 → 下書きで終了'); await page.screenshot({ path: join(ROOT, '.tmp/np-draft.png') }); await ctx.close(); process.exit(0); }
  await next.first().click(); await sleep(3500);

  // 9. 有料 + 価格
  if (isPaid) {
    const paid = page.getByText('有料', { exact: true }); if (await paid.count()) { await paid.first().click(); await sleep(2500); }
    const setPrice = await page.evaluate((p) => {
      const walk = (root) => { try { const e = root.querySelector && root.querySelector('input#price'); if (e) return e; } catch {} for (const n of (root.querySelectorAll ? root.querySelectorAll('*') : [])) { if (n.shadowRoot) { const f = walk(n.shadowRoot); if (f) return f; } } return null; };
      const el = walk(document); if (!el) return 'no-price-input';
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, String(p)); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.dispatchEvent(new Event('blur', { bubbles: true }));
      return 'price=' + el.value;
    }, price);
    console.log('[9] ' + setPrice);
  }

  // 10. タグ
  if (tags.length) {
    try {
      const tagOpen = page.getByText('ハッシュタグを追加する', { exact: false });
      if (await tagOpen.count()) { await tagOpen.first().click(); await sleep(800); }
      const tagInput = page.locator('input[placeholder*="ハッシュタグ"], input[placeholder*="ハッシュタグを追加"]');
      if (await tagInput.count()) {
        for (const t of tags) { await tagInput.first().type(t); await page.keyboard.press('Enter'); await sleep(350); }
        console.log(`[10] tags added: ${tags.length}`);
      } else { console.log('[10] tag input 未検出 → タグskip'); }
    } catch (e) { console.log('[10] tags skip:', e.message.split('\n')[0]); }
  }

  // 10.5 メンバーシップ限定公開（記事の追加 → メンバーシップ タブ → 対象行の「追加」）
  // 押下後にボタン表記が「追加」から変わることを確認できなければ **公開しない**。
  // 押せていないのに投稿すると全員に無料公開されるので、ここは fail-closed。
  let membershipOk = !isMembership;
  if (isMembership) {
    const tabbed = await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((x) => (x.innerText || '').trim() === 'メンバーシップ');
      if (!b) return false; b.click(); return true;
    });
    if (!tabbed) console.error('[10.5] ABORT: 「メンバーシップ」タブ未検出');
    else {
      await sleep(3000);
      const pick = await page.evaluate((label) => {
        const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const btns = Array.from(document.querySelectorAll('button')).filter((b) => /^(追加|追加済み?|削除)$/.test(norm(b.innerText)));
        for (const b of btns) {
          let el = b.parentElement;
          for (let i = 0; i < 6 && el; i++, el = el.parentElement) {
            const t = norm(el.innerText);
            // 行コンテナ = ラベルを含み、かつ他行を巻き込まない短さ（ラベル+ボタン文言程度）
            if (t.includes(label) && t.length <= label.length + 12) {
              const before = norm(b.innerText);
              b.click();
              return { ok: true, row: t, before };
            }
          }
        }
        return { ok: false, rows: btns.map((b) => norm(b.parentElement?.innerText).slice(0, 50)) };
      }, MEMBERSHIP_TARGET);
      if (!pick.ok) console.error(`[10.5] ABORT: 公開範囲「${MEMBERSHIP_TARGET}」の行を特定できず。候補=${JSON.stringify(pick.rows)}`);
      else {
        await sleep(2500);
        const after = await page.evaluate((label) => {
          const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
          const btns = Array.from(document.querySelectorAll('button')).filter((b) => /^(追加|追加済み?|削除)$/.test(norm(b.innerText)));
          let state = '(row-gone)';
          for (const b of btns) {
            let el = b.parentElement;
            for (let i = 0; i < 6 && el; i++, el = el.parentElement) {
              const t = norm(el.innerText);
              if (t.includes(label) && t.length <= label.length + 12) { state = norm(b.innerText); break; }
            }
            if (state !== '(row-gone)') break;
          }
          const all = document.body.innerText.replace(/\s+/g, ' ');
          const i = all.indexOf('記事の追加');
          return { state, section: (i >= 0 ? all.slice(i, i + 220) : '').trim() };
        }, MEMBERSHIP_TARGET);
        // 成功形は押下後のボタンが「追加済」（実測 2026-08-06・「み」は付かない）か「削除」に変わること。
        // 「追加」のままは押せていない、(row-gone) は行を見失った＝どちらも選択の証拠にならないので通さない。
        // 判定材料を人が読めるよう、押下後のセクション文言もそのままログへ出す。
        membershipOk = /^(追加済み?|削除)$/.test(after.state);
        console.log(`[10.5] 公開範囲「${MEMBERSHIP_TARGET}」: ${pick.before} → ${after.state} / ok=${membershipOk}`);
        console.log(`[10.5] 押下後のセクション: ${after.section}`);
        // DEBUG(temp・first-run 検証用): 220 文字に切り詰める前の全文を保存し、
        // 予約投稿の入口（日時設定ボタン等）がこのパネル内にあるか確認する。
        try {
          const dump2 = await page.evaluate(() => document.body.innerText);
          writeFileSync(join(ROOT, '.tmp/np-105-dom-dump.txt'), dump2, 'utf-8');
          console.log(`[10.5-debug] DOM dump ${dump2.length} 文字 → .tmp/np-105-dom-dump.txt`);
        } catch (e) { console.log('[10.5-debug] dump失敗:', e.message); }
      }
    }
    // DEBUG(temp・first-run 検証用): 「予約投稿」「日時の設定」は 10.5 の公開設定パネル内に
    // 実在する（np-105-dom-dump.txt で確認済み）。既存コードは 11m（試し読みエリア）へ画面遷移
    // した後で探すため見つからない。ここで 10.5 の画面のまま予約UIを試す（安全のため日時設定
    // までで留め、最終確定は押さない＝この後 saveDraftExit で終了する）。
    if (sched) {
      const pad2 = (n) => String(n).padStart(2, '0');
      const shot2 = async (t) => { try { await page.screenshot({ path: join(ROOT, `.tmp/np-105-${t}.png`), fullPage: true }); } catch {} };
      let toggled = false;
      const toggle = page.getByText('予約投稿', { exact: true });
      if (await toggle.count()) { try { await toggle.first().click(); toggled = true; await sleep(1200); } catch {} }
      await shot2('after-toggle');
      let opened2 = false;
      const dtBtn = page.getByText('日時の設定', { exact: true });
      if (await dtBtn.count()) { try { await dtBtn.first().click(); opened2 = true; await sleep(1500); } catch {} }
      await shot2('after-datetime-open');
      let dateSet2 = false;
      for (let nav = 0; nav < 4 && opened2 && !dateSet2; nav++) {
        const day2 = page.locator(`[aria-label*="${sched.y}年"][aria-label*="${sched.mo}月"][aria-label*="${sched.d}日"]`);
        if (await day2.count()) { try { await day2.first().click(); dateSet2 = true; await sleep(800); } catch {} }
        if (!dateSet2) { const nx2 = page.getByRole('button', { name: /次の月|次月|Next/ }); if (await nx2.count()) { await nx2.first().click(); await sleep(600); } else break; }
      }
      const timeStr2 = `${pad2(sched.h)}:${pad2(sched.mi)}`;
      let timeSet2 = false;
      const timeItem2 = page.getByText(timeStr2, { exact: true });
      if (await timeItem2.count()) { try { await timeItem2.first().click(); timeSet2 = true; await sleep(600); } catch {} }
      await shot2('after-time');
      // モーダル（Underlay）を開いたまま次へ進むと、後続の「試し読みエリアを設定」クリックが
      // pointer-events を遮られてタイムアウトする（2026-08-27 実測）。Esc で閉じる。
      // 下部に確定済み日時（例: 2026年8月28日 07:00）が独立表示されるため、閉じても設定は残る。
      try { await page.keyboard.press('Escape'); await sleep(500); } catch {}
      await shot2('after-escape');
      const dump3 = await page.evaluate(() => document.body.innerText).catch(() => '');
      writeFileSync(join(ROOT, '.tmp/np-105-after-dom-dump.txt'), dump3, 'utf-8');
      console.log(`[10.5S-debug] toggled=${toggled} opened=${opened2} dateSet=${dateSet2} timeSet=${timeSet2} dump=${dump3.length}文字`);
    }
    if (!membershipOk) await page.screenshot({ path: join(ROOT, '.tmp/np-membership.png'), fullPage: true });
  }

  // 11. 有料エリア設定 → 境界を BOUNDARY 見出し直前へ（既定=試験問題/予想問題・civil=品質管理）
  //
  // メンバーシップ限定記事も同じ「ライン」機構を通る。ただし入口ボタンが
  // 「試し読みエリアを設定」で、公開設定画面の一次ボタンがこれに差し替わるため
  // **この画面を開かないと「投稿する」が出てこない**（2026-08-06 実測）。
  // また note の説明文どおり「ラインを設定しない場合は購入・購読した人だけが読める記事になる」ので、
  // 会員特典（週次お題）は既定でラインを引かず全文を会員限定にする。
  // 無料の試し読みを付けたい記事だけ frontmatter `paidBoundary` か --boundary-regex を明示する。
  const hasExplicitBoundary = !!(getArg('--boundary-regex') || fmField('paidBoundary'));
  if (isMembership) {
    const prev = page.getByRole('button', { name: /試し読みエリア/ });
    if (await prev.count()) {
      try {
        await prev.first().click({ timeout: 10000 }); await sleep(3500);
        console.log(`[11m] 試し読みエリア画面へ（ライン設定=${hasExplicitBoundary ? BOUNDARY : 'なし＝全文を会員限定'}）`);
      } catch (e) {
        // クリックがブロックされて（モーダル残留等）進めない場合はプロセスを落とさず
        // 安全側（下書き保存）へ倒す。原因調査用にスクショを残す（2026-08-27 実測の再発防止）。
        console.log('[11m] ERROR: 「試し読みエリアを設定」クリック失敗:', e.message.split(String.fromCharCode(10))[0]);
        try { await page.screenshot({ path: join(ROOT, '.tmp/np-11m-click-fail.png'), fullPage: true }); } catch {}
      }
    } else console.log('[11m] WARN: 「試し読みエリアを設定」ボタン未検出');
  }
  let boundaryOk = !isPaid; // 無料は境界不要
  if (isPaid) {
    const area = page.getByRole('button', { name: '有料エリア設定' });
    if (await area.count()) {
      await area.first().click(); await sleep(3500);
      const t = await page.evaluate((boundaryStr) => {
        const re = new RegExp('^(' + boundaryStr + ')');
        const isLineBtn = (el) => (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') && /ラインをこの場所に変更/.test(el.innerText || el.getAttribute('aria-label') || '');
        const seq = Array.from(document.querySelectorAll('h1,h2,h3,button,[role=button]'));
        const hIdx = seq.findIndex((el) => el.tagName === 'H2' && re.test((el.innerText || '').trim()));
        if (hIdx < 0) return { ok: false, reason: 'no boundary h2: ' + boundaryStr };
        let btn = null; for (let i = hIdx - 1; i >= 0; i--) { if (isLineBtn(seq[i])) { btn = seq[i]; break; } }
        if (!btn) return { ok: false, reason: 'no preceding line-button' };
        document.querySelectorAll('[data-np-target]').forEach((e) => e.removeAttribute('data-np-target')); btn.setAttribute('data-np-target', '1');
        return { ok: true, heading: (seq[hIdx].innerText || '').slice(0, 24) };
      }, BOUNDARY);
      console.log('[11] boundary target:', JSON.stringify(t));
      if (t.ok) {
        // 「ラインをこの場所に変更」は note の再描画で detach しやすく Playwright の stability 待ち
        // だと "not stable / detached" で 30s タイムアウトする。DOM native .click() で回避する。
        await page.evaluate(() => { const el = document.querySelector('[data-np-target="1"]'); if (el) { el.scrollIntoView({ block: 'center' }); el.click(); } });
        await sleep(2500);
        const v = await page.evaluate((boundaryStr) => {
          const re = new RegExp('^(' + boundaryStr + ')');
          const seq = Array.from(document.querySelectorAll('h1,h2,h3,p,button,[role=button]'));
          const lineIdx = seq.findIndex((el) => /このラインより先を有料にする/.test(el.innerText || ''));
          const hIdx = seq.findIndex((el) => el.tagName === 'H2' && re.test((el.innerText || '').trim()));
          let between = 0; if (lineIdx >= 0 && hIdx > lineIdx) for (let i = lineIdx + 1; i < hIdx; i++) { const tx = (seq[i].innerText || '').trim(); if (tx && !/ラインをこの場所に変更|このラインより先/.test(tx)) between++; }
          return { lineIdx, hIdx, between, boundaryBeforeExam: lineIdx >= 0 && hIdx > lineIdx && between === 0 };
        }, BOUNDARY);
        console.log('[11] boundary verify:', JSON.stringify(v));
        boundaryOk = v.boundaryBeforeExam;
      }
      await page.screenshot({ path: join(ROOT, '.tmp/np-boundary.png') });
    } else { console.log('[11] 有料エリア設定 ボタン未検出'); }
  }

  // 12. 投稿 / 予約投稿 / 安全離脱
  // frontmatter へ noteUrl/noteId/notePublishedAt を反映（冪等＋記録）。予約時は publishDate=予約日。
  // frontmatter フィールドを「あれば置換・無ければ挿入」する（旧実装は replace のみで、行が
  // 無いと URL 記録が無音失敗し、冪等ガード(noteUrl 有無)も効かず一括で重複公開する事故になった。
  // 2026-07-02 是正）。挿入位置は noteMagazine 直後（正準）→ utmCampaign 直後 → 冒頭 --- の順で解決。
  const setFmField = (text, key, val) => {
    // 改行コードは元ファイルに合わせる。CRLF のまま正規表現で行を挿入すると、
    // `$` が LF の直前にある CR を残すケースで CRCRLF になり得る。いったん LF に正規化して
    // 編集し、最後に元の EOL へ戻す（2026-08-19 W5 公開の writeback で実再現）。
    const eol = /\r\n/.test(text) ? '\r\n' : '\n';
    const src = text.replace(/\r\n?/g, '\n');
    const restoreEol = (s) => eol === '\r\n' ? s.replace(/\n/g, '\r\n') : s;
    const line = `${key}: ${val}`;
    const re = new RegExp('^' + key + ':.*$', 'm');
    if (re.test(src)) return restoreEol(src.replace(re, line));
    for (const anchor of ['noteMagazine', 'utmCampaign']) {
      const ar = new RegExp('^(' + anchor + ':.*)$', 'm');
      if (ar.test(src)) return restoreEol(src.replace(ar, `$1\n${line}`));
    }
    return restoreEol(src.replace(/^(---\n)/, `$1${line}\n`));
  };
  const writeBack = (url, publishDate, statusVal = 'published') => {
    try {
      const id = (url.match(/\/n(?:otes)?\/([a-z0-9]+)/) || [])[1] || '';
      if (id) {
        const cleanUrl = `https://note.com/dobokunote/n/${id}`;
        let upd = raw;
        upd = setFmField(upd, 'noteUrl', `"${cleanUrl}"`);
        upd = setFmField(upd, 'noteId', `"${id}"`);
        upd = setFmField(upd, 'notePublishedAt', `"${publishDate}"`);
        // noteStatus も書き戻す（draft 取り残しの再発防止）。即時=published / 予約=reserved。
        // 予約の go-live 後分は verify-note-status が published へ是正。
        upd = setFmField(upd, 'noteStatus', statusVal);
        writeFileSync(articleAbs, upd);
        console.log('[12] frontmatter 反映:', cleanUrl, publishDate, `status=${statusVal}`);
        // 再公開ドリフト検出用に「公開時点の本文ハッシュ」を記録（in-sync 化）。best-effort。
        if (recordPublishedHash(relative(ROOT, articleAbs))) console.log('[12b] 再公開ハッシュ記録');
        // 新規公開はカバー・価格・境界・添付まで一括で live に載るので 4 トラックすべて in-sync 化する
        recordPublishedMetaHash(relative(ROOT, articleAbs));
        recordPublishedAssetHash(relative(ROOT, articleAbs));
        // タグも公開時に適用済み（Phase 10）→ タグハッシュも in-sync 化（本文とは別トラック）。
        if (tags.length && tagsFile && recordPublishedTagHash(relative(ROOT, tagsFile))) console.log('[12c] 再公開タグハッシュ記録');
      }
    } catch (e) { console.log('[12] frontmatter 反映 skip:', e.message.split('\n')[0]); }
  };
  const saveDraftExit = async (why) => {
    console.log('[12] ' + why + ' → 下書き保存で終了（公開せず）。');
    const cancel = page.getByRole('button', { name: 'キャンセル' }); if (await cancel.count()) { await cancel.first().click(); await sleep(1200); }
    const d2 = page.getByRole('button', { name: '下書き保存' }); if (await d2.count()) { await d2.first().click(); await sleep(2500); }
  };

  if (COMMIT && urlHeadingsLeft.length) {
    // URL見出し残存 → 公開せず下書き退避（壊れた本文＝目次にURL露出を本番に出さない）
    await saveDraftExit(`★中断: URL見出しが残存（${urlHeadingsLeft.join(' / ')}）→ 公開しない★`);
    process.exitCode = 3;
  } else if (COMMIT && (imgLeftover.length || imgFailed.length)) {
    // 本文画像トークン残存/挿入失敗 → 公開せず下書き退避（トークン露出・図欠落を本番に出さない）
    await saveDraftExit(`★中断: 本文画像が未完（leftover=${imgLeftover.length} failed=${imgFailed.length}）→ 公開しない★`);
    process.exitCode = 3;
  } else if (COMMIT && boundaryOk && membershipOk && sched) {
    // --- 予約投稿フロー（--schedule 指定時）---
    // 実機検証済み（2026-08-27）: 日時設定は 10.5 の公開設定パネル内で行う（10.5S ブロック・
    // 「予約投稿」トグル→「日時の設定」→カレンダー→時刻→Esc で閉じる）。ここ（11m 後）では
    // それを済ませた状態を前提にする。11m（試し読みエリア）へ遷移すると、画面右上のボタン
    // ラベルが「投稿する」から「予約投稿」へ自動的に変わる（有料記事で「投稿する」→
    // 「有料エリア設定」に変わるのと同じ機構）。日時ラベルをここで再探索する必要はない
    // （旧実装は 11m 遷移後に日時ラベルを探しており、既に別画面のため見つからず毎回
    // fail-closed していた＝ DN-0044 が「一度も実機検証されていない」とした原因そのもの）。
    const reserveBtn = page.getByRole('button', { name: '予約投稿', exact: true });
    const hasReserve = await reserveBtn.count();
    console.log(`[12S] schedule=${sched.raw} reserveBtn=${hasReserve}`);
    if (hasReserve) {
      await reserveBtn.first().click(); await sleep(5000);
      const close = page.getByRole('button', { name: '閉じる' }); if (await close.count()) { await close.first().click(); await sleep(1500); }
      publishedUrl = page.url();
      console.log('[12S] 予約投稿 clicked →', publishedUrl, '@', sched.raw);
      writeBack(publishedUrl, sched.date, 'reserved');
    } else {
      await page.screenshot({ path: join(ROOT, '.tmp/np-sched-abort.png'), fullPage: true }).catch(() => {});
      await saveDraftExit('★中断: 「予約投稿」ボタンを確定できず（10.5 での日時設定が未反映の可能性）★');
    }
  } else if (COMMIT && boundaryOk && membershipOk) {
    // --- 即時公開（既存）---
    const submit = page.getByRole('button', { name: '投稿する', exact: true });
    if (await submit.count()) {
      await submit.first().click(); await sleep(5000);
      const close = page.getByRole('button', { name: '閉じる' }); if (await close.count()) { await close.first().click(); await sleep(1500); }
      publishedUrl = page.url();
      console.log('[12] 投稿する clicked → published:', publishedUrl);
      writeBack(publishedUrl, todayJst());
      // [13] 公開後 API 実体検証（3検査）: URL見出し / 空引用 / 画像欠落（偽成功ガードの一部）
      const pubId = (publishedUrl.match(/n[0-9a-f]{12}/) || [])[0];
      if (pubId) {
        const chk = await assertLiveBody(pubId, { expectedImgs, paid: isPaid, minFreeChars });
        if (chk.fetchError) console.log(`[13] WARN: API検証未達（${chk.fetchError}）→ 手動確認: curl --ssl-no-revoke https://note.com/api/v3/notes/${pubId}`);
        else if (!chk.ok) {
          const parts = [];
          if (chk.urlHeadings.length) parts.push(`URL見出し[${chk.urlHeadings.join(' / ')}]`);
          if (chk.emptyBq) parts.push(`空引用${chk.emptyBq}件`);
          if (chk.freeShort) parts.push(`無料プレビュー崩壊(${chk.freeChars}字＝有料境界が冒頭へ動いた疑い)`);
          if (chk.imgShort) parts.push(`画像欠落(live=${chk.imgLive}/期待=${expectedImgs})`);
          console.error(`[13] FAIL: 公開本文に不整合: ${parts.join(' / ')} → note-update-body --commit で修復`); process.exitCode = 2;
        } else console.log(`[13] API 実体検証 OK（URL見出し0 空引用0 img=${chk.imgLive}）`);
        // [13m] メンバーシップ限定の実体検証: 未ログインの public API で本文が読めないこと。
        // note のメンバーシップ記事は body='' + hashtag_notes=[] を返す（= isUnmeasurable）。
        // 本文が読めてしまうなら公開範囲の選択が効いておらず **全員に無料公開**されている。
        // ここは「保存できた」ではなく「読者から見て会員限定か」を見る唯一の検査なので落とす。
        // 判定は API の is_limited（直接シグナル）を優先し、返らない場合だけ
        // 「未ログインで本文が読めない」（isUnmeasurable）に落とす。
        if (isMembership && !chk.fetchError) {
          const limited = chk.isLimited === null ? chk.unmeasurable : chk.isLimited;
          if (limited) console.log(`[13m] メンバーシップ限定 OK（is_limited=${chk.isLimited} 未ログイン本文=${chk.freeChars}字）`);
          else {
            console.error(`[13m] FAIL: 会員限定になっていない（is_limited=${chk.isLimited} 未ログインで本文${chk.freeChars}字が読める）。note UI で公開範囲を確認せよ`);
            process.exitCode = 5;
          }
        }
      }
    } else console.log('[12] 投稿する 未検出');
  } else {
    if (COMMIT && !boundaryOk) console.log('[12] ★中断: 境界検証 NG（boundaryBeforeExam=false）→ 公開しない★');
    if (COMMIT && !membershipOk) { console.log('[12] ★中断: メンバーシップ公開範囲を選択できず → 公開しない（全員公開の事故防止）★'); process.exitCode = 4; }
    await saveDraftExit('DRAFT モード/未検証');
    console.log('[12] URL=' + page.url());
  }
  await page.screenshot({ path: join(ROOT, '.tmp/np-final.png') });

  // [14] PDF 商品の未完成ガード（2026-07-28 新設）
  //   note の PDF 添付はプラットフォーム機能で markdown に現れない＝「公開した」と
  //   「PDF を配れる状態にした」が別工程。公開だけして添付を忘れても SoT からは分からず、
  //   購入者が代金を払って PDF を受け取れない状態で売れ続ける（1級一次PDF ¥1,980 で発生）。
  //   記事 dir に PDF があるなら、公開は「未完成」として非ゼロで終わらせる。
  if (COMMIT && publishedUrl) {
    const pdfDirs = [dir, join(dir, 'pdf')].filter((d) => existsSync(d));
    const pdfs = pdfDirs.flatMap((d) => readdirSync(d).filter((f) => /\.pdf$/i.test(f)).map((f) => join(d, f)));
    if (pdfs.length) {
      const pubId = (publishedUrl.match(/n[0-9a-f]{12}/) || [])[0] || '<noteId>';
      console.error(`\n[14] ★未完成: 記事 dir に PDF が ${pdfs.length} 件ある＝この記事は添付まで終えて初めて商品になる★`);
      for (const p of pdfs) console.error(`  node scripts/note-attach-file.mjs --note ${pubId} --file "${relative(ROOT, p).replace(/\\/g, '/')}" --commit`);
      console.error('  添付後の確認: node scripts/check-note-attachments.mjs --live --only ' + pubId);
      process.exitCode = 9;
    }
  }
  console.log('RESULT:', JSON.stringify({ mode: COMMIT ? 'commit' : 'draft', boundaryOk, publishedUrl }));
} finally { await ctx.close(); }
