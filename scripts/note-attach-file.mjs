#!/usr/bin/env node
/**
 * note-attach-file.mjs
 * ---------------------------------------------------------------------------
 * 公開済み note 記事の本文末尾（有料エリア内）に PDF 等のファイルを添付（ダウンロード
 * カード）して再保存する再利用エンジン。note-publish が扱わない「ファイル添付」を担う
 * （従来は半手動）。
 *
 * 設計: 他 note 系と同じ「システム Chrome(channel:chrome)+永続プロファイル+proxy+
 *   ignoreHTTPSErrors」。既定 PROBE（挿入メニュー構造ダンプ・保存しない）/ --commit で実保存。
 *
 * 工程: account ゲート → editor.note.com/notes/{key}/edit → 本文末尾へ移動・空段落 →
 *   「+」挿入メニュー → ファイル → PDF アップロード → 公開に進む → （価格/境界は変更せず）
 *   更新する。冪等のため既添付検出はせず（呼び側で重複回避）。
 *
 * 使い方:
 *   node scripts/note-attach-file.mjs --note <noteKey> --file <pdf path>            # probe
 *   node scripts/note-attach-file.mjs --note <noteKey> --file <pdf path> --commit   # 実保存
 *
 * 安全弁（収益アカウント）: account=dobokunote assert / 既定 probe /
 *   有料境界が「試験問題|予想問題」直前に保たれていることを再保存前に検証（崩れたら中断）。
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE = join(ROOT, '.local/playwright-note-profile');
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';

const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const COMMIT = argv.includes('--commit');
const FORCE = argv.includes('--force'); // 既存PDFカードがあっても添付する（1記事に複数PDFを順に添付する用）
const ANCHOR = getArg('--anchor'); // 指定テキストを含む最小段落の直後へ挿入（省略時は本文末尾）。未検出は ABORT（誤挿入回避）
let wasFreeArticle = false; // 無料記事（有料エリア設定なし）を検出したら true。後段の有料維持検証をスキップ。
const NOTE = getArg('--note');
const FILE = getArg('--file');
if (!NOTE || !FILE) { console.error('--note <key> --file <pdf> required'); process.exit(1); }
// 有料境界の見出し regex（H2 innerText 先頭一致）。既定=総監/建設の「試験問題/予想問題」。
// 他コンテンツ型（例: 直前暗記ノート）は --boundary-regex で上書き（note-publish の paidBoundary と対応）。
const BOUNDARY = getArg('--boundary-regex') || '試験問題|予想問題';
const fileAbs = FILE.startsWith('/') || /^[A-Za-z]:/.test(FILE) ? FILE : join(ROOT, FILE);
if (!existsSync(fileAbs)) { console.error('file not found: ' + fileAbs); process.exit(1); }
console.log(`[prep] note=${NOTE} file=${fileAbs} mode=${COMMIT ? 'COMMIT' : 'PROBE'}`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: false, channel: 'chrome', proxy: PROXY ? { server: PROXY } : undefined,
  ignoreHTTPSErrors: true, viewport: { width: 1366, height: 1000 }, args: ['--disable-blink-features=AutomationControlled'],
});
let exitCode = 0;
try {
  const page = ctx.pages()[0] || (await ctx.newPage());

  // account ゲート（ページ描画の遅延に強い polling・偽 ABORT 防止）
  await page.goto('https://note.com/settings/account', { waitUntil: 'domcontentloaded', timeout: 60000 });
  let acct = false;
  for (let i = 0; i < 10; i++) { await sleep(2000); if (/dobokunote/.test(await page.evaluate(() => document.body.innerText || ''))) { acct = true; break; } }
  if (!acct) { console.error('ABORT: account != dobokunote'); await ctx.close(); process.exit(2); }
  console.log('[1] account gate OK');

  // エディタ
  await page.goto(`https://editor.note.com/notes/${NOTE}/edit/`, { waitUntil: 'domcontentloaded', timeout: 60000 }); await sleep(3000);
  try { await page.waitForSelector('[contenteditable=true]', { timeout: 30000 }); }
  catch { console.error('ABORT: editor not loaded'); await ctx.close(); process.exit(3); }
  await sleep(2000);
  console.log('[2] editor:', page.url());

  const fileBase = fileAbs.split(/[\\/]/).pop();
  // 冪等: 既に PDF ファイルカードが本文にあるか（".pdf" は添付カードのみに出現・prose は "PDF" 大文字）
  const already = await page.evaluate(() => /\.pdf/i.test(document.querySelector('[contenteditable=true]')?.innerText || ''));
  console.log('[2.5] 既存PDFカード=' + already);

  if (!COMMIT) {
    // PROBE: 本文末尾に空段落 → メニューを開いて項目ダンプのみ（保存しない）
    await page.click('[contenteditable=true]'); await sleep(500);
    await page.keyboard.press('Control+End'); await sleep(500);
    await page.keyboard.press('Enter'); await sleep(1200);
    const menuBtn = page.locator('[aria-label="メニューを開く"]');
    console.log('[3] メニューを開く count=' + (await menuBtn.count()));
    await menuBtn.last().click({ timeout: 8000 }); await sleep(1500);
    const menu = await page.evaluate(() => Array.from(document.querySelectorAll('button,[role=button],[role=menuitem],li,a')).map((b) => (b.innerText || b.getAttribute('aria-label') || '').trim()).filter((t) => t && t.length <= 12).filter((t) => /ファイル|画像|埋め込み|区切り|目次|コード|引用|見出し|リンク|音声|有料/.test(t)));
    console.log('[3] menu items:', JSON.stringify([...new Set(menu)]));
    await page.screenshot({ path: join(ROOT, '.tmp/attach-menu.png'), fullPage: false }).catch(() => {});
    console.log('PROBE のみ（--commit で添付保存）'); await ctx.close(); process.exit(0);
  }

  // ===== COMMIT: （未添付 or --force なら）ファイル添付 → 再公開 =====
  if (!already || FORCE) {
    // 3. 本文末尾へ → 空段落 →「+」→ ファイル → native filechooser で PDF
    //    ※ Control+End は Windows 専用ショートカットで Mac では効かず、caret が先頭のまま
    //      PDF が本文先頭（＝無料プレビュー内）に挿入され有料PDFが無料流出する事故になる
    //      （2026-07-04 実測・暗記ノート2本）。JS で contenteditable 末尾へ caret を確実に移動する。
    await page.click('[contenteditable=true]'); await sleep(500);
    const posInfo = await page.evaluate((anchor) => {
      const ed = document.querySelector('[contenteditable=true]'); ed.focus();
      let target = null;
      if (anchor) {
        let best = Infinity;
        for (const b of ed.querySelectorAll('p, h1, h2, h3, h4, h5, li')) {
          const t = (b.textContent || '');
          if (t.includes(anchor) && t.length < best) { target = b; best = t.length; }
        }
        if (!target) return { ok: false };
      }
      const node = target || ed;
      const r = document.createRange(); r.selectNodeContents(node); r.collapse(false); // false=末尾
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      return { ok: true, anchored: !!target, tag: target ? target.tagName : 'END', text: target ? (target.textContent || '').slice(0, 44) : '本文末尾' };
    }, ANCHOR);
    if (ANCHOR && !posInfo.ok) { console.error('ABORT: --anchor 未検出 → 誤挿入回避のため中止: ' + ANCHOR); await ctx.close(); process.exit(7); }
    console.log('[3] caret 位置:', JSON.stringify(posInfo));
    await sleep(400);
    await page.keyboard.press('Enter'); await sleep(1200);
    const embedsBefore = await page.evaluate(() => document.querySelectorAll('[contenteditable=true] figure, [contenteditable=true] [embedded-service], [contenteditable=true] [data-name]').length);
    await page.locator('[aria-label="メニューを開く"]').last().click({ timeout: 8000 }); await sleep(1200);
    const fileItem = page.getByText('ファイル', { exact: true });
    if (!(await fileItem.count())) { console.error('ABORT: メニューに「ファイル」未検出'); await ctx.close(); process.exit(4); }
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 12000 }),
      fileItem.first().click(),
    ]);
    await chooser.setFiles(fileAbs);
    console.log('[3] ファイル選択 → アップロード中…');
    // 4. アップロード成功検証（カード出現を最大 40s ポーリング・note のアップロード遅延/混雑対策）
    let up = { embeds: embedsBefore, hasPdf: false };
    for (let i = 0; i < 13; i++) {
      await sleep(3000);
      up = await page.evaluate(() => {
        const ed = document.querySelector('[contenteditable=true]');
        const embeds = document.querySelectorAll('[contenteditable=true] figure, [contenteditable=true] [embedded-service], [contenteditable=true] [data-name]').length;
        return { embeds, hasPdf: /\.pdf/i.test(ed?.innerText || '') };
      });
      if (up.embeds > embedsBefore || up.hasPdf) break;
    }
    console.log(`[4] upload check: embedsBefore=${embedsBefore} embedsAfter=${up.embeds} pdfVisible=${up.hasPdf}`);
    await page.screenshot({ path: join(ROOT, '.tmp/attach-uploaded.png'), fullPage: false }).catch(() => {});
    if (up.embeds <= embedsBefore && !up.hasPdf) { console.error('ABORT: ファイルカード未検出（アップロード失敗）→ 保存しない'); await ctx.close(); process.exit(5); }
  } else {
    console.log('[3-4] 既添付のため添付スキップ → 再公開のみ実行（live 反映保証）');
  }

  // 5. 公開に進む
  const next = page.getByRole('button', { name: '公開に進む' });
  if (!(await next.count())) { console.error('ABORT: 公開に進む 未検出'); await ctx.close(); process.exit(6); }
  await next.first().click(); await sleep(4500);

  // 5b. 有料エリア設定 → 既存境界を検証（既に正しければ動かさない）。
  //     重要: 既存の線は「このラインより先を有料にする」バーで表示され、その位置には
  //     「ラインをこの場所に変更」ボタンが無い。試験問題直前の制御がバーなら正しい＝触らない。
  //     変更ボタンなら（線が無い/ズレている）クリックして直前へ寄せる。崩れたら再公開しない。
  let boundaryOk = false;
  const area = page.getByRole('button', { name: '有料エリア設定' });
  if (!(await area.count())) {
    // 無料記事（notePricing: free）: 有料エリア設定が存在しない。paywall が無いため
    // 境界検証は不要（無料漏れリスクなし）。そのまま投稿/更新へ進む（note-publish の isPaid 分岐と同型）。
    console.log('[5b] 有料エリア設定なし＝無料記事 → 境界検証スキップ（paywall無し）');
    boundaryOk = true;
    wasFreeArticle = true;
  } else {
  await area.first().click(); await sleep(3500);
  // 有料エリアビューの描画待ち（試験問題 h2 と ライン制御が両方出るまで・偽 NG 防止）
  let viewReady = false;
  for (let i = 0; i < 12; i++) {
    viewReady = await page.evaluate((bStr) => {
      const bre = new RegExp('^(' + bStr + ')');
      const hasH2 = Array.from(document.querySelectorAll('h2')).some((el) => bre.test((el.innerText || '').trim()));
      const hasLine = /このラインより先を有料にする|ラインをこの場所に変更/.test(document.body.innerText || '');
      return hasH2 && hasLine;
    }, BOUNDARY);
    if (viewReady) break;
    await sleep(1500);
  }
  console.log('[5b] 有料エリアビュー描画=' + viewReady);
  const t = await page.evaluate((bStr) => {
    const bre = new RegExp('^(' + bStr + ')');
    const all = Array.from(document.querySelectorAll('h2, button, [role=button]'));
    const isBar = (el) => /このラインより先を有料にする/.test(el.innerText || '');
    const isChange = (el) => /ラインをこの場所に変更/.test(el.innerText || el.getAttribute('aria-label') || '');
    const isExam = (el) => el.tagName === 'H2' && bre.test((el.innerText || '').trim());
    const hIdx = all.findIndex(isExam);
    if (hIdx < 0) return { ok: false, reason: 'no 試験/予想問題 h2' };
    let ctrlIdx = -1; for (let i = hIdx - 1; i >= 0; i--) { if (isBar(all[i]) || isChange(all[i])) { ctrlIdx = i; break; } }
    if (ctrlIdx < 0) return { ok: false, reason: 'no preceding line control' };
    if (isBar(all[ctrlIdx])) return { ok: true, alreadyCorrect: true, heading: (all[hIdx].innerText || '').slice(0, 24) };
    document.querySelectorAll('[data-af-line]').forEach((e) => e.removeAttribute('data-af-line')); all[ctrlIdx].setAttribute('data-af-line', '1');
    return { ok: true, alreadyCorrect: false, heading: (all[hIdx].innerText || '').slice(0, 24) };
  }, BOUNDARY);
  console.log('[5b] boundary state:', JSON.stringify(t));
  if (t.ok && t.alreadyCorrect) {
    boundaryOk = true; // 既に試験問題直前に線あり＝動かさない（最安全）
  } else if (t.ok) {
    // 「ラインをこの場所に変更」は note 再描画で detach し Playwright の stability 待ちが
    // 30s タイムアウトする。DOM native .click() で stability 待ちを回避（note-update-body と同型）。
    await page.evaluate(() => { const el = document.querySelector('[data-af-line="1"]'); if (el) { el.scrollIntoView({ block: 'center' }); el.click(); } });
    await sleep(2500);
  }
  // 検証（クリック後 or 既存どちらも最終確認）: 線が試験問題の直前にあるか
  const v = await page.evaluate((bStr) => {
    const bre = new RegExp('^(' + bStr + ')');
    const seq = Array.from(document.querySelectorAll('h1,h2,h3,p,button,[role=button]'));
    const lineIdx = seq.findIndex((el) => /このラインより先を有料にする/.test(el.innerText || ''));
    const hIdx = seq.findIndex((el) => el.tagName === 'H2' && bre.test((el.innerText || '').trim()));
    let between = 0; if (lineIdx >= 0 && hIdx > lineIdx) for (let i = lineIdx + 1; i < hIdx; i++) { const tx = (seq[i].innerText || '').trim(); if (tx && !/ラインをこの場所に変更|このラインより先/.test(tx)) between++; }
    return { lineIdx, hIdx, between, boundaryBeforeExam: lineIdx >= 0 && hIdx > lineIdx && between === 0 };
  }, BOUNDARY);
  console.log('[5b] boundary verify:', JSON.stringify(v));
  boundaryOk = v.boundaryBeforeExam;
  await page.screenshot({ path: join(ROOT, '.tmp/attach-boundary.png') }).catch(() => {});
  if (!boundaryOk) { console.error('[5b] ★中断: 境界検証 NG → 再公開しない（無料漏れ防止）★'); await ctx.close(); process.exit(8); }
  } // end else（有料記事の境界検証ブロック）

  // 6. 投稿する/更新する（境界確定後に出現）
  await sleep(800);
  let submitClicked = false;
  for (const name of ['投稿する', '更新する', '公開する']) {
    const b = page.getByRole('button', { name, exact: true });
    if ((await b.count()) && !(await b.first().isDisabled().catch(() => false))) { try { await b.first().click({ timeout: 6000 }); submitClicked = true; console.log('[6] ' + name + ' clicked'); break; } catch {} }
  }
  if (!submitClicked) {
    const dump = await page.evaluate(() => Array.from(document.querySelectorAll('button, a, [role=button]')).map((e) => (e.innerText || '').trim()).filter((t2) => t2 && /投稿|更新|公開|保存/.test(t2)));
    console.error('ABORT: 投稿/更新ボタン未検出. matches=' + JSON.stringify(dump)); await ctx.close(); process.exit(7);
  }
  await sleep(5500);
  const close = page.getByRole('button', { name: '閉じる' }); if (await close.count()) { await close.first().click(); await sleep(1500); }
  console.log('[6] 再公開完了:', page.url());
  await page.screenshot({ path: join(ROOT, '.tmp/attach-done.png'), fullPage: false }).catch(() => {});
} finally { await ctx.close(); }

// ===== 偽成功ガード: 公開ページで「有料のまま」を実体検証（無料記事は非該当） =====
if (COMMIT && exitCode === 0 && wasFreeArticle) {
  console.log('\n[検証] 無料記事のため有料維持チェックはスキップ（添付＋再公開は完了）');
}
if (COMMIT && exitCode === 0 && !wasFreeArticle) {
  console.log('\n[検証] 公開ページで有料維持を実体確認');
  const r = spawnSync('curl', ['-sS', '-m', '40', '--ssl-no-revoke', '-L', '-H', 'User-Agent: Mozilla/5.0', `https://note.com/dobokunote/n/${NOTE}`], { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
  const html = r.stdout || '';
  const paid = /購入手続き|有料エリア|このコンテンツは有料/.test(html) || /"price":\s*[1-9]/.test(html);
  console.log(`  paid指標=${paid ? 'OK ✓' : '✗ 検出できず'} (htmlLen=${html.length})`);
  if (!paid) { console.error('  ⚠ 有料指標を検出できません（手動確認推奨）'); exitCode = 8; }
}
console.log(`\n${exitCode === 0 ? '完了' : 'エラーあり'} (exit ${exitCode})`);
process.exit(exitCode);
