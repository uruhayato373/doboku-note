#!/usr/bin/env node
/**
 * note-update-body.mjs
 * ---------------------------------------------------------------------------
 * 既公開 note 記事の本文を「全文置換」してライブ反映する Playwright アップデータ。
 * note-publish.mjs（新規作成→公開）と対で、「本文差し替え→更新する」を担う。
 *
 * 前提: frontmatter に noteId が設定済み（公開済み記事のみ対象）。
 *
 * 使い方:
 *   node scripts/note-update-body.mjs --article <article.md path>            # dry-run（既定・安全）
 *   node scripts/note-update-body.mjs --article <article.md path> --commit   # 実ライブ反映（公開に進む→更新する）
 *   node scripts/note-update-body.mjs --article <article.md path> --pause    # 本文差替まで自動→タイトル変更＋更新確定を手動
 *   node scripts/note-update-body.mjs --list <list.txt> --commit             # 複数記事を一括ライブ反映
 *   npm 経由: npm run note-update-body -- --article <path> [--commit|--pause]
 *
 * 追加オプション:
 *   --probe "<文字列>"        paste 成功検証に使う必須文字列（単一記事時のみ。省略時は本文から自動導出）
 *   --keep-boundary           有料記事: 既存の有料境界を動かさず保持して更新（試験問題 H2 が無い記事用）
 *   --boundary-h2 "<regex>"   有料境界の基準にする H2 先頭一致パターン（既定 = frontmatter paidBoundary → 試験問題|予想問題）
 *   --images-only             全文置換せず、SoT の各画像を既存本文のアンカー直後に追加挿入するのみ
 *                             （PDF 添付カード・有料境界・本文を触らない＝有料PDF記事の画像欠落修復用）
 *   --img-lenient             本文画像アップロードが一部失敗しても中断せず続行（既定は保存せず ABORT）
 *   --reattach-pdf            全文置換で消える PDF 添付を、同じセッションで貼り直す（保存前に復元＋実体確認）。
 *                             ローカルに実ファイルが揃わなければ本文を触らず中断する
 *   --max-consecutive-fail N  --list バッチで N 本連続失敗したら残りを実行せず中断（既定 3）
 *
 * 本文画像: SoT の `![alt](img/xxx.png)` は除去せず、paste 後に「＋」メニュー→画像アップロードで
 *   live に反映する（lib/note-images.mjs）。トークン残存/挿入失敗時は保存せず中断する。
 *
 * 処理:
 *   1. account ゲート（dobokunote 確認）
 *   2. editor.note.com/notes/{noteId}/edit へ遷移
 *   3. 本文置換 = 全選択(macOS=Meta+A / それ以外=Ctrl+A) → Delete でエディタを空に → ClipboardEvent paste
 *      （空エディタへの paste は成功する＝note-publish.mjs の /new 空エディタと同条件）
 *      ※ macOS で Ctrl+A は行頭移動(emacs binding)で全選択にならず空化に失敗→本文二重化するため Meta+A 必須。
 *      paste 直後に probe 文字列が contenteditable.innerText に入ったか検証。
 *      無ければ保存せず中断（無音失敗による空更新事故を防止）。
 *   4. URL 行のリンクカード化（lib/note-cardify.mjs 共有実装。URL見出し化レース根治・保存前ゲート＋公開後 API assert 付き）
 *   4.5 目次ブロック再挿入（H2>=3・最初のh2直前・--no-toc で抑止）。全文置換で目次が消えるため note-publish と同手順で再挿入。
 *   5. ライブ反映:
 *        --commit なし = dry-run（スクショのみ・更新しない）
 *        --commit あり = （title あれば差替）→ 公開に進む →（有料なら境界保持/再設定）→ 更新する → 通知「いいえ」
 *        --pause あり = 本文差替＋カード化＋目次まで自動 → 反映直前で停止。タイトル変更と「更新する」確定を
 *                       手動で行う（ブラウザ close で終了）。無料記事＋タイトル変更が要るケース（もくじ）向け。
 *        ※ 無料記事の --commit 自動確定は publishLive の「更新する」ボタン検出が未検証（既知の残課題）→ --pause 推奨。
 *
 * なぜ「下書き保存」だけでは反映されないか:
 *   公開済み記事の autosave 下書きは browser close で破棄され、再オープンで公開版がロードされる。
 *   ＝ライブには一切反映されない。同一セッション内で「更新する」まで到達して初めて反映される。
 *
 * 注意: カバー画像・タグは変更しない。タイトルは frontmatter に title があれば差し替える（--no-title で抑止）。
 * 実行はローカル（note ログイン済みプロファイルのある Windows/Mac）限定。会社 PC で可（channel:'chrome'）。
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { recordPublishedHash, recordPublishedMetaHash } from './lib/note-republish-hash.mjs';
import { cardifyBareUrls, repairUrlHeadings, listUrlHeadingsInEditor } from './lib/note-cardify.mjs';
import { extractBodyImages, insertImagesAtPlaceholders, insertImagesAfterAnchors, countEditorImages } from './lib/note-images.mjs';
import { assertLiveBody } from './lib/note-live-check.mjs';
import { attachFileInEditor, listAttachedFiles, resolveLocalFiles } from './lib/note-attach.mjs';
import { todayJst } from './lib/jst-date.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE = join(ROOT, '.local/playwright-note-profile');
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';

const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const ARTICLE_ARG = getArg('--article');
const LIST_ARG = getArg('--list');
const PROBE_ARG = getArg('--probe');             // 単一記事時の明示 probe（省略時は自動導出）
const COMMIT = argv.includes('--commit');         // 実ライブ反映（既定は dry-run）
const PAUSE = argv.includes('--pause');           // 反映直前で停止＝タイトル変更＋更新確定を手動に委ねる
const KEEP_BOUNDARY = argv.includes('--keep-boundary'); // 有料: 境界を動かさず保持
const BOUNDARY_ARG = getArg('--boundary-h2');      // 明示指定は frontmatter paidBoundary より優先
const IMAGES_ONLY = argv.includes('--images-only'); // 全文置換せず画像だけ追加（PDF添付カード保護）
const IMG_LENIENT = argv.includes('--img-lenient'); // 画像挿入 failed でも続行（既定は ABORT）
// 全文置換は本文内の PDF 添付カードも消す。既定では添付を検出したら中断する（--allow-attachment-loss で明示解除）。
// 2026-07-28: 建設部門の送客リンク是正で 196 本を全文置換し、6/16 に添付した PDF カードを消してしまった。
const ALLOW_ATTACH_LOSS = argv.includes('--allow-attachment-loss');
// --list バッチの連続失敗ストッパー。1本の失敗は個別事情でも、続けて落ちるのは
// note 側の UI 変更・ログイン切れ・レート制限など**系統的な原因**で、走らせ続けると
// 壊れた更新を量産する（2026-07-31 に有料2本の無料プレビューを壊した反省）。
// 既定 3 連続で中断。走り切らせたいときだけ明示的に緩める。
const MAX_CONSEC_FAIL = Number(getArg('--max-consecutive-fail') || 3);
// 全文置換で消える PDF 添付を、同じセッションで貼り直す。ローカルに実ファイルが揃っている
// ときだけ有効で、1つでも解決できなければ本文を触らず中断する（消して戻せない状態を作らない）。
const REATTACH_PDF = argv.includes('--reattach-pdf');
// note のファイルアップロードは **1 日 100 件が上限**（超えると以降が全て「カード未検出」で
// 失敗する）。note-attach-batch.mjs が既に done-log で管理していた既知の制約を、
// --reattach-pdf も共有する。2026-07-31 にこれを引き継がなかったため上限に達し、
// 添付復元の失敗 → 再実行 → PDF 消失という事故を起こした。
const ATTACH_DONE_LOG = join(ROOT, '.claude/state/note-attach-done.json');
const ATTACH_DAILY_LIMIT = Number(getArg('--attach-daily-limit') || 90); // 上限 100 に対し余裕を持たせる
function attachedTodayCount() {
  try {
    const j = JSON.parse(readFileSync(ATTACH_DONE_LOG, 'utf8'));
    const today = todayJst();
    return (j.attached || []).filter((a) => a.at === today).length;
  } catch { return 0; }
}
// 中断ログ。note のエディタは「保存しない」で抜けても**全文置換＋添付削除の状態を保持する**。
// その記事を確かめずに再実行すると、汚れた状態（添付0など）を正として上書きしてしまう
// （2026-07-31 の PDF 消失はこれ）。中断した記事は次回スキップし、人の確認を挟ませる。
const ABORTED_LOG = join(ROOT, '.claude/state/note-update-aborted.json');
const FORCE_RETRY = argv.includes('--force-retry');
function readAborted() {
  try { return JSON.parse(readFileSync(ABORTED_LOG, 'utf8')); } catch { return { aborted: [] }; }
}
function recordAbort(noteId, reason) {
  const j = readAborted();
  j.aborted = (j.aborted || []).filter((a) => a.noteId !== noteId);
  j.aborted.push({ noteId, reason: String(reason).slice(0, 120), at: new Date().toISOString().slice(0, 19) });
  try { writeFileSync(ABORTED_LOG, JSON.stringify(j, null, 2) + '\n'); } catch {}
}
function clearAbort(noteId) {
  const j = readAborted();
  const before = (j.aborted || []).length;
  j.aborted = (j.aborted || []).filter((a) => a.noteId !== noteId);
  if (j.aborted.length !== before) { try { writeFileSync(ABORTED_LOG, JSON.stringify(j, null, 2) + '\n'); } catch {} }
}
function abortedEntry(noteId) { return (readAborted().aborted || []).find((a) => a.noteId === noteId) || null; }

function recordAttach(noteId, pdfPath) {
  try {
    const j = existsSync(ATTACH_DONE_LOG) ? JSON.parse(readFileSync(ATTACH_DONE_LOG, 'utf8')) : { attached: [] };
    j.attached.push({ noteId, pdf: pdfPath, at: todayJst() });
    writeFileSync(ATTACH_DONE_LOG, JSON.stringify(j, null, 2) + '\n');
  } catch (e) { console.log('[attach-log] 記録失敗:', e.message); }
}
const TRIAL_LINE_BOTTOM = argv.includes('--trial-line-bottom'); // メンバーシップ試し読み: ラインを末尾直前に置き ほぼ全文を無料プレビュー化（入口LP復旧用）

// 目次が「最初のh2より後」に入って直せなかった記事（バッチ末尾サマリで失敗として可視化する）
const tocProblems = [];

if (!ARTICLE_ARG && !LIST_ARG) { console.error('--article <path> or --list <file> required'); process.exit(1); }
// --pause はブラウザ close で待機を解除する（1記事=1セッション）。--list はループ内で close されると
// 後続記事が全滅するため併用不可。無料記事のタイトル変更＋更新確定を手動に委ねる用途（P4）。
if (PAUSE && LIST_ARG) { console.error('--pause は --article 単体でのみ使用可（--list 併用不可＝close で後続が全滅する）'); process.exit(1); }

mkdirSync(join(ROOT, '.tmp'), { recursive: true });

function loadArticles() {
  if (LIST_ARG) {
    const listPath = resolve(ROOT, LIST_ARG);
    return readFileSync(listPath, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#'));
  }
  return [ARTICLE_ARG];
}

function parseArticle(articlePath) {
  const abs = resolve(ROOT, articlePath);
  if (!existsSync(abs)) { throw new Error('not found: ' + abs); }
  const raw = readFileSync(abs, 'utf8').replace(/^﻿/, ''); // strip BOM
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  const fmField = (k) => (fm.match(new RegExp('^' + k + ':\\s*(?:"(.*?)"|\'(.*?)\'|(.+?))\\s*$', 'm')) || []).slice(1).find(Boolean) || '';
  // noteId が無い公開記事が実在する（2026-07-31 実測: 再公開対象 179 本のうち 7 本。
  // 総監テキスト精読ガイドなど、writeback が noteUrl だけ書いた時代の記事）。noteUrl から
  // 導出できるのに throw していたため、バッチが 3 連続失敗で止まっていた。
  const noteId = fmField('noteId') || (fmField('noteUrl').match(/\/n\/([0-9a-z]+)/) || [])[1] || '';
  if (!noteId || !/^n[0-9a-f]{6,}$/.test(noteId)) { throw new Error('noteId missing or invalid（noteUrl からも導出不可）: ' + noteId); }
  const title = fmField('title'); // --pause 時にユーザーへ提示する新タイトル（本文には出さない）
  const notePricing = fmField('notePricing');
  const isPaid = notePricing === 'paid';
  // 有料境界の解決順（note-publish と統一）: --boundary-h2 明示 > frontmatter paidBoundary > 既定
  const boundary = BOUNDARY_ARG || fmField('paidBoundary') || '試験問題|予想問題';
  let body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n*/, '');
  // 前処理: コメント・H1行を除去（画像は除去せずトークン化して残す＝本文画像の live 反映）
  body = body.replace(/<!--[\s\S]*?-->\r?\n?/g, '').trim().replace(/^#\s+.*(?:\r?\n)+/, '').trim();
  // 画像行 → トークン化。images[].anchor（直前非空・非画像行の正規化先頭30字）を付与（--images-only 用）。
  const dir = dirname(abs);
  const bodyLines = body.split('\n');
  const anchors = [];
  for (let i = 0; i < bodyLines.length; i++) {
    if (!/^\s*!\[[^\]]*\]\([^)]+\)\s*$/.test(bodyLines[i])) continue;
    let anchor = '';
    for (let j = i - 1; j >= 0; j--) {
      const s = bodyLines[j].trim();
      if (s && !/^!\[/.test(s) && !/^<!--/.test(s)) { anchor = s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[#>*_`]/g, '').replace(/\s+/g, '').slice(0, 30); break; }
    }
    anchors.push(anchor);
  }
  const { body: tokenBody, images, missing } = extractBodyImages(body, dir);
  images.forEach((im, idx) => { im.anchor = anchors[idx] || ''; });
  if (missing.length) console.log(`[img] WARN 除去した画像行: ${missing.join(' / ')}`);
  // 有料記事は API 本文が paywall で切断されるため、live 検証の期待画像数は「境界より前の画像枚数」。
  let expectedImgs = images.length;
  if (isPaid) {
    const bre = new RegExp('^##\\s+(' + boundary + ')');
    const bIdx = tokenBody.split('\n').findIndex((l) => bre.test(l.trim()));
    if (bIdx >= 0) expectedImgs = (tokenBody.split('\n').slice(0, bIdx).join('\n').match(/〔〔IMG:\d+〕〕/g) || []).length;
  }
  return { abs, noteId, title, body: tokenBody, images, isPaid, boundary, expectedImgs };
}

/**
 * paste 成功検証用の probe を本文から自動導出する。
 * マークダウン記号・URL を含まない「素の散文」行を選び、innerText で確実に一致する 24 字前後を返す。
 * paste 後の innerText.includes(probe) が真なら本文が DOM に載った証拠。
 */
function deriveProbe(body) {
  const lines = body.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  // マークダウン構造・URL・記号を含まない素の行（見出し/箇条書き/引用/表/強調/リンクを除外）
  const clean = lines.filter(s =>
    !/https?:\/\//.test(s) &&
    !/[#>|*_`\[\]()~]/.test(s) &&
    !/^[-+]\s/.test(s) &&
    // 番号付きリスト（1. 〜）は note エディタが <ol> の自動採番にするため、innerText に
    // 「1.」が現れず probe 照合が必ず外れる（2026-07-31: 00-序章 で paste 成功なのに
    // 「probe 未検出」で保存中断＝偽陰性になった）。probe の材料から除く。
    !/^\d+[.)]\s/.test(s) &&
    s.length >= 16
  );
  const pick = clean.length ? clean.sort((a, b) => b.length - a.length)[Math.floor(clean.length / 2)] || clean[0] : null;
  if (pick) {
    const start = Math.max(0, Math.floor((pick.length - 24) / 2));
    return pick.slice(start, start + 24).trim();
  }
  // フォールバック: 記号を剥がした素のテキストの先頭 20 字
  const flat = body.replace(/[#>|*_`\[\]()~\-]/g, '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, '').trim();
  return flat.slice(0, 20);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function emptyAndPaste(page, body, probe) {
  // 3. 本文置換: Ctrl+A → Delete で空に → ClipboardEvent paste（空エディタ paste 成功条件を再現）
  const ed = page.locator('[contenteditable=true]').first();
  await ed.click(); await sleep(400);
  // 全選択: macOS は Meta+A（Ctrl+A は行頭移動の emacs binding で空化に失敗し本文二重化する）。
  const selectAll = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';
  await page.keyboard.press(selectAll); await sleep(300);
  await page.keyboard.press('Delete'); await sleep(800);
  const emptiedChars = await page.evaluate(() => (document.querySelector('[contenteditable=true]')?.innerText || '').trim().length);
  console.log(`[3a] emptied editor chars=${emptiedChars}`);
  await page.evaluate((b) => {
    const el = document.querySelector('[contenteditable=true]'); el.focus();
    const dt = new DataTransfer(); dt.setData('text/plain', b);
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  }, body);
  await sleep(3500);
  const edChars = await page.evaluate(() => (document.querySelector('[contenteditable=true]')?.innerText || '').length);
  console.log(`[3b] body pasted, editor chars=${edChars}`);

  // 3c. paste 成功検証（probe が DOM に入ったか）— 無ければ呼び出し側で中断
  const hasProbe = await page.evaluate((p) => (document.querySelector('[contenteditable=true]')?.innerText || '').includes(p), probe);
  console.log(`[3c] probe="${probe}" in editor: ${hasProbe}`);
  return hasProbe;
}

async function cardify(page) {
  // 4. リンクカード化（共有実装 lib/note-cardify.mjs。旧実装の URL見出し化レースは根治済み）
  //    4b. 万一 URL が見出しに化けていたら修復し、残存すれば false（保存させない）。
  try {
    await cardifyBareUrls(page, { tag: '[4]' });
    await repairUrlHeadings(page, { tag: '[4b]' });
    const leftover = await listUrlHeadingsInEditor(page);
    if (leftover.length) {
      console.error(`[4b] ABORT: URL見出しが残存（保存せず中断）: ${leftover.join(' / ')}`);
      return false;
    }
    return true;
  } catch (e) { console.log('[4] cardify skip:', e.message.split('\n')[0]); return true; }
}

/**
 * 4.5. 目次ブロック挿入（H2>=3・最初のh2直前）。note ネイティブ目次（button#toc-setting）。
 * note-publish.mjs Phase 6.5 と同一手順。全文置換で目次が消えるため再挿入する（editor-operations.md）。
 * 挿入後に「目次 < 最初のh2」を DOM で自己検証（導入分断の再発防止・WARN のみ）。screenshot(.tmp/nu-toc-*.png) も残す。
 */
// 目次ノードを最初の h2 の直前に 1 回挿入する（内部）。挿入できたら true。
async function tocInsertOnce(page) {
  await page.click('[contenteditable=true]'); await sleep(400);
  const ok = await page.evaluate(() => {
    const ed = document.querySelector('[contenteditable=true]'); ed.focus();
    const h = ed.querySelector('h2'); if (!h) return false;
    h.scrollIntoView({ block: 'center' });
    const r = document.createRange(); r.selectNodeContents(h); r.collapse(true);
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    return true;
  });
  if (!ok) { console.log('[4.5] h2 未検出 → TOC skip'); return false; }
  await sleep(400);
  await page.keyboard.press('Enter'); await sleep(500);
  await page.keyboard.press('ArrowUp'); await sleep(1000);
  // caret に最も近い +メニュー を座標クリック（.first() は最上部を掴み位置ずれする）
  const box = await page.evaluate(() => {
    const sel = window.getSelection(); const cy = (sel.rangeCount ? sel.getRangeAt(0).getBoundingClientRect().top : 0) || 0;
    const b = Array.from(document.querySelectorAll('[aria-label="メニューを開く"]'));
    if (!b.length) return null;
    b.sort((p, q) => Math.abs(p.getBoundingClientRect().top - cy) - Math.abs(q.getBoundingClientRect().top - cy));
    const rr = b[0].getBoundingClientRect(); return { x: rr.left + rr.width / 2, y: rr.top + rr.height / 2 };
  });
  if (!box) { console.log('[4.5] +メニュー(メニューを開く) 未検出'); return false; }
  await page.mouse.click(box.x, box.y); await sleep(1800);
  const toc = page.locator('#toc-setting');
  if (!(await toc.count())) { console.log('[4.5] 目次ボタン(#toc-setting) 未検出'); return false; }
  // 大記事では editor 再描画で Playwright の actionability 待ちが 8s タイムアウトする。
  // DOM native click で stability 待ちを回避（note-attach/境界処理と同型）。
  await page.evaluate(() => document.querySelector('#toc-setting')?.click()); await sleep(2000);
  return true;
}

// 目次ノードが最初の h2 より前にあるか自己検証。{ ok: true|false|null }（null=検出保留）。
async function tocVerify(page) {
  return page.evaluate(() => {
    const ed = document.querySelector('[contenteditable=true]'); if (!ed) return { ok: null, reason: 'no editor' };
    const kids = Array.from(ed.querySelectorAll('*'));
    const isToc = (el) => /table-of-contents/i.test(el.tagName) || el.getAttribute?.('data-name') === 'index' || /(^|\s)toc(\s|$)/i.test(el.className || '');
    const tocIdx = kids.findIndex(isToc);
    const h2Idx = kids.findIndex((el) => el.tagName === 'H2');
    if (tocIdx < 0) return { ok: null, reason: 'toc node 未検出（検証保留・screenshot 参照）' };
    if (h2Idx < 0) return { ok: null, reason: 'h2 未検出' };
    return { ok: tocIdx < h2Idx, tocIdx, h2Idx };
  });
}

// 目次を「最初の h2 の直前」に挿入する。
// 旧実装は body 先頭(selectNodeContents(ed) collapse)に入れ、note の ProseMirror では導入段落
// （例「こんな人のための記事です」）の途中に割り込み、見出し→目次→本文リストと導入を分断する不具合
// になった（2026-07-04 是正・9記事で発生）。再発防止として挿入後に「目次 < 最初のh2」を自己検証し、
// 後ろにあれば誤配置分を除去して 1 回だけ再挿入する。再挿入後も直らない場合は 'misplaced' を返し、
// 呼び出し元がバッチ末尾のサマリで**失敗として可視化**する（WARN ログ埋没による再発の防止）。
// 戻り値: 'ok' | 'skip'(h2<3等) | 'misplaced' | 'unverified'(検出保留)。
async function insertTocBlock(page, noteId) {
  try {
    if (!(await tocInsertOnce(page))) return 'skip';
    let chk = await tocVerify(page);
    if (chk.ok === false) {
      console.log(`[4.5] ⚠ 目次が最初のh2より後（tocIdx=${chk.tocIdx} h2Idx=${chk.h2Idx}）→ 誤配置分を除去して再挿入`);
      // 誤配置の目次ノードを除去してから 1 回だけ入れ直す。
      await page.evaluate(() => {
        const ed = document.querySelector('[contenteditable=true]'); if (!ed) return;
        const isToc = (el) => /table-of-contents/i.test(el.tagName) || el.getAttribute?.('data-name') === 'index' || /(^|\s)toc(\s|$)/i.test(el.className || '');
        ed.querySelectorAll('*').forEach((el) => { if (isToc(el)) el.remove(); });
      });
      await sleep(600);
      await tocInsertOnce(page);
      chk = await tocVerify(page);
    }
    await page.screenshot({ path: join(ROOT, `.tmp/nu-toc-${noteId}.png`) });
    if (chk.ok === true) { console.log('[4.5] 位置検証 OK（目次 < 最初のh2）'); return 'ok'; }
    if (chk.ok === false) { console.log(`[4.5] ⚠ 再挿入後も目次が最初のh2より後（tocIdx=${chk.tocIdx} h2Idx=${chk.h2Idx}）→ サマリで失敗計上`); return 'misplaced'; }
    console.log(`[4.5] 位置検証 保留: ${chk.reason}（.tmp/nu-toc-${noteId}.png で目視）`); return 'unverified';
  } catch (e) { console.log('[4.5] toc skip:', e.message.split('\n')[0]); return 'skip'; }
}

/**
 * 5(commit). 公開に進む →（有料なら境界保持）→ 更新する → 更新通知「いいえ」
 * note-append-cta.mjs:144-219 を移植。戻り値 = 成否。
 */
async function publishLive(page, noteId, boundary = '試験問題|予想問題', isPaid = true) {
  // 公開に進む（自動保存の落ち着きを待ってからクリックし、設定ページ到達を polling）
  await sleep(3000);
  const next = page.getByRole('button', { name: '公開に進む' });
  if (!(await next.count())) { console.error('[5] ABORT: 「公開に進む」未検出。更新せず終了。'); await page.screenshot({ path: join(ROOT, `.tmp/nu-nonext-${noteId}.png`) }); return false; }
  let onSettings = false;
  for (let attempt = 0; attempt < 3 && !onSettings; attempt++) {
    if (await next.count()) { await next.first().click(); }
    for (let i = 0; i < 8; i++) {
      await sleep(1800);
      const a = await page.getByRole('button', { name: '有料エリア設定' }).count();
      const u = await page.getByRole('button', { name: '更新する', exact: true }).count();
      // メンバーシップ連携記事（合格ラボ等）は 有料エリア設定 でなく 試し読みエリアを設定 が出る
      const s = await page.getByRole('button', { name: '試し読みエリアを設定', exact: true }).count();
      if (a || u || s) { onSettings = true; break; }
    }
  }
  if (!onSettings) { console.error('[5] ABORT: 公開設定ページに到達せず。保存せず終了。'); await page.screenshot({ path: join(ROOT, `.tmp/nu-nosettings-${noteId}.png`) }); return false; }

  // 5b. 有料記事なら 有料エリア設定。
  // 無料記事（notePricing: free）では**触らない**。note は無料記事でも「有料エリア設定」
  // ボタンを出すことがあり、area の有無だけで分岐していたため無料記事が有料フローへ入り
  // 「境界 H2 が無い」で保存中断していた（2026-07-31: 設問3バンク 00-序章）。
  // 無料記事に paywall は無いので境界検証は不要（note-attach-file の isPaid 分岐と同型）。
  const area = isPaid ? page.getByRole('button', { name: '有料エリア設定' }) : { count: async () => 0 };
  if (!isPaid) console.log('[5b] 無料記事 → 有料境界の設定・検証をスキップ');
  if (await area.count() && KEEP_BOUNDARY) {
    // 試験問題型の境界が無い有料記事: 境界を動かさず既存を保持
    console.log('[5b] 有料記事フロー（既存境界を保持・動かさない）');
    await area.first().click(); await sleep(3500);
    const hasLine = await page.evaluate(() => /このラインより先を有料にする/.test(document.body.innerText || ''));
    await page.screenshot({ path: join(ROOT, `.tmp/nu-keepboundary-${noteId}.png`) });
    console.log('[5b] 既存境界line=' + hasLine);
    if (!hasLine) { console.error('[5b] ABORT: 有料記事だが既存境界lineを確認できず。保存せず中断（paywall保護）。'); return false; }
  } else if (await area.count()) {
    // 全文置換で境界が消える有料記事: 「試験問題/予想問題」H2 直前へ境界を再設定し検証
    console.log('[5b] 有料記事フロー（境界を試験/予想問題 H2 直前へ再設定）');
    await area.first().click(); await sleep(3500);
    const t = await page.evaluate((bre) => {
      const RE = new RegExp('^(' + bre + ')');
      const isLineBtn = (el) => (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') && /ラインをこの場所に変更/.test(el.innerText || el.getAttribute('aria-label') || '');
      const seq = Array.from(document.querySelectorAll('h1,h2,h3,button,[role=button]'));
      const hIdx = seq.findIndex((el) => el.tagName === 'H2' && RE.test((el.innerText || '').trim()));
      if (hIdx < 0) return { ok: false, reason: 'no boundary h2' };
      let btn = null; for (let i = hIdx - 1; i >= 0; i--) { if (isLineBtn(seq[i])) { btn = seq[i]; break; } }
      if (!btn) return { ok: false, reason: 'no preceding line-button' };
      document.querySelectorAll('[data-np-target]').forEach((e) => e.removeAttribute('data-np-target')); btn.setAttribute('data-np-target', '1');
      return { ok: true, heading: (seq[hIdx].innerText || '').slice(0, 24) };
    }, boundary);
    console.log('[5b] boundary target:', JSON.stringify(t));
    if (!t.ok) { console.error('[5b] ABORT: 有料境界の基準(試験/予想問題 H2)を特定できず。保存せず中断。--keep-boundary か --boundary-h2 を検討。'); await page.screenshot({ path: join(ROOT, `.tmp/nu-boundary-${noteId}.png`) }); return false; }
    // 「ラインをこの場所に変更」ボタンは note 側の再描画で detach しやすく、Playwright の
    // actionability 待ち（stable 判定）だと "element is not stable / detached" で 30s タイム
    // アウトする（2級 コンクリート工/品質管理 で再現）。DOM の native .click() を evaluate で
    // 直接叩いて stability 待ちを回避する（React の click ハンドラは native click で発火する）。
    const clicked = await page.evaluate(() => {
      const el = document.querySelector('[data-np-target="1"]');
      if (!el) return false;
      el.scrollIntoView({ block: 'center' });
      el.click();
      return true;
    });
    if (!clicked) { console.error('[5b] ABORT: data-np-target ボタンを DOM 上で特定できず。'); await page.screenshot({ path: join(ROOT, `.tmp/nu-boundary-${noteId}.png`) }); return false; }
    await sleep(2500);
    const v = await page.evaluate((bre) => {
      const RE = new RegExp('^(' + bre + ')');
      const seq = Array.from(document.querySelectorAll('h1,h2,h3,p,button,[role=button]'));
      const lineIdx = seq.findIndex((el) => /このラインより先を有料にする/.test(el.innerText || ''));
      const hIdx = seq.findIndex((el) => el.tagName === 'H2' && RE.test((el.innerText || '').trim()));
      let between = 0; if (lineIdx >= 0 && hIdx > lineIdx) for (let i = lineIdx + 1; i < hIdx; i++) { const tx = (seq[i].innerText || '').trim(); if (tx && !/ラインをこの場所に変更|このラインより先/.test(tx)) between++; }
      return { lineIdx, hIdx, between, boundaryBeforeExam: lineIdx >= 0 && hIdx > lineIdx && between === 0 };
    }, boundary);
    console.log('[5b] boundary verify:', JSON.stringify(v));
    await page.screenshot({ path: join(ROOT, `.tmp/nu-boundary-${noteId}.png`) });
    if (!v.boundaryBeforeExam) { console.error('[5b] ABORT: 有料境界が「予想問題/試験問題」直前に揃わない。保存せず中断（paywall 保護）。'); return false; }
  } else if (await page.getByRole('button', { name: '試し読みエリアを設定', exact: true }).count()) {
    // メンバーシップ連携記事（合格ラボ等・price=0 だが is_limited=true の会員限定）。
    // 「試し読みエリアを設定」を押すと「更新する」が出る。既存の試し読みライン（無料プレビュー
    // 範囲）は保持したいので、ラインを一切動かさずビューを進めるだけにする（paywall/会員境界保護）。
    // メンバーシップ連携記事（合格ラボ等・price=0 だが is_limited=true の会員限定）。
    // 「試し読みエリアを設定」を押すと「更新する」が出る。既定はラインを動かさず更新へ進む（会員境界保護）。
    console.log('[5b] メンバーシップ試し読みフロー' + (TRIAL_LINE_BOTTOM ? '（ラインを末尾直前に設置＝ほぼ全文プレビュー）' : '（ラインを動かさず更新へ進む）'));
    await page.getByRole('button', { name: '試し読みエリアを設定', exact: true }).first().click();
    await sleep(4000);
    if (TRIAL_LINE_BOTTOM) {
      // 入口LP復旧: 試し読みラインを「末尾の1つ手前」に置く。絶対最後（本文最終要素の後）だと
      // ライン以下=会員限定にする中身が0で無効になり note が全文ロックに戻す（2026-07 まるごとパック実測）。
      // 末尾直前なら最終要素だけが会員限定の"しっぽ"となり、それ以外＝ほぼ全文が無料プレビューになる。
      const set = await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button,[role=button]')].filter((b) => /ラインをこの場所に変更/.test(b.innerText || ''));
        if (btns.length < 2) return { ok: false, count: btns.length };
        const target = btns[btns.length - 2]; // 末尾の1つ手前
        target.scrollIntoView({ block: 'center' });
        target.click();
        return { ok: true, count: btns.length };
      });
      await sleep(3000);
      const hasLine = await page.evaluate(() => document.querySelector('.paywall-line') !== null);
      console.log(`[5b] 試し読みライン設置(末尾-1): buttons=${set.count} 確定line(.paywall-line)=${hasLine}`);
      await page.screenshot({ path: join(ROOT, `.tmp/nu-trialline-${noteId}.png`) });
      if (!set.ok || !hasLine) { console.error('[5b] ABORT: 試し読みライン設置を確認できず。保存せず中断（会員境界保護）。'); return false; }
    } else {
      await page.screenshot({ path: join(ROOT, `.tmp/nu-trialarea-${noteId}.png`) });
    }
  } else {
    console.log('[5b] 無料記事（有料エリア設定ボタンなし）→ 境界処理をスキップ');
  }

  // 5c. 更新する（公開済み記事。新規の「投稿する/公開」とは別ラベル）
  let updated = false;
  for (const label of ['更新する', '更新']) {
    const b = page.getByRole('button', { name: label, exact: label === '更新する' });
    if (await b.count()) { await b.first().click(); updated = true; console.log(`[5c] 「${label}」クリック`); break; }
  }
  if (!updated) { console.error('[5c] ABORT: 「更新する」未検出。'); await page.screenshot({ path: join(ROOT, `.tmp/nu-noupdate-${noteId}.png`) }); return false; }

  // 5d. 更新通知ダイアログ→必ず「いいえ」（購入者へ通知スパムを防ぐ）
  await sleep(2500);
  let notifyHandled = false;
  for (let i = 0; i < 6 && !notifyHandled; i++) {
    const no = page.getByRole('button', { name: 'いいえ', exact: true });
    if (await no.count()) { await no.first().click(); notifyHandled = true; console.log('[5d] 更新通知ダイアログ→「いいえ」'); break; }
    await sleep(1200);
  }
  if (!notifyHandled) console.log('[5d] 通知ダイアログ未検出（既に確定/通知なしの可能性）');
  await sleep(3000);
  await page.screenshot({ path: join(ROOT, `.tmp/nu-done-${noteId}.png`) });
  return true;
}

// 本文H1とライブ題名の食い違い（frontmatter に title が無い記事）。最終サマリで surface する。
const TITLE_DRIFTS = [];

async function updateArticle(page, { abs, noteId, title, body, images, isPaid, boundary, expectedImgs }, probe) {
  console.log(`\n[article] ${noteId} — ${abs.split(/[/\\]/).slice(-2).join('/')}`);

  // 2. 編集 URL へ遷移
  const editUrl = `https://editor.note.com/notes/${noteId}/edit`;
  await page.goto(editUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(3000);
  try {
    await page.waitForSelector('[contenteditable=true]', { timeout: 30000 });
  } catch {
    console.error('[FAIL] editor not loaded for', noteId);
    await page.screenshot({ path: join(ROOT, `.tmp/nu-fail-${noteId}.png`) });
    return false;
  }
  await sleep(2000);
  console.log(`[2] editor loaded: ${page.url()}`);

  // --images-only: 全文置換せず既存本文の各画像アンカー直後に画像を追加するのみ。
  //   PDF 添付カード・有料境界・本文に一切触らない（過去問PDF 有料記事の画像欠落修復用）。
  if (IMAGES_ONLY) {
    if (!images.length) { console.log('[img-only] SoT に画像なし → skip'); return true; }
    const liveImgs = await countEditorImages(page);
    if (liveImgs >= images.length) { console.log(`[img-only] 既に img=${liveImgs}>=${images.length} → 冪等skip`); return true; }
    if (!COMMIT) { console.log('[img-only] dry-run（--commit で実挿入）'); return true; }
    const r = await insertImagesAfterAnchors(page, images, { tag: '[4.4]' });
    if (r.failed.length && !IMG_LENIENT) { console.error(`[4.4] ABORT: 画像挿入に失敗（${r.failed.length}件）→ 保存しない（--img-lenient で続行可）`); await page.screenshot({ path: join(ROOT, `.tmp/nu-imgfail-${noteId}.png`) }); return false; }
    if (!r.settled && !IMG_LENIENT) { console.error('[4.4] ABORT: 画像が CDN 確定せず（保存すると live で欠落）→ 再実行'); await page.screenshot({ path: join(ROOT, `.tmp/nu-imgsettle-${noteId}.png`) }); return false; }
    const live = await publishLive(page, noteId, boundary, isPaid);
    if (!live) { console.error(`[FAIL] ライブ反映に失敗: ${noteId}`); return false; }
    const chk = await assertLiveBody(noteId, { expectedImgs, paid: isPaid });
    if (chk.fetchError) console.log(`[5e] WARN: API検証未達（${chk.fetchError}）→ 手動確認`);
    else if (!chk.ok) { console.error(`[5e] FAIL: live不整合 ${liveIssues(chk)} → 手動確認`); return false; }
    else console.log(`[5e] API 実体検証 OK（img=${chk.imgLive} 空引用0 URL見出し0）`);
    console.log(`[OK] ${noteId} 画像のみ反映完了`);
    return true;
  }

  // 3-pre. 添付ファイル保護ゲート（2026-07-28 新設）
  // 全文置換（Ctrl+A → Delete）は本文内の PDF 添付カードごと消す。SoT の markdown には添付が
  // 存在しないので paste では戻らず、購入者が PDF を受け取れなくなる。既存添付を検出したら
  // 既定で中断し、意図的に消す場合だけ --allow-attachment-loss を明示させる。
  const attachedPdfs = await listAttachedFiles(page);
  // --reattach-pdf: 消える添付を同じセッションで貼り直す前提で全文置換を許可する。
  // ローカルに実ファイルが揃っていることを**置換前に**確認し、1つでも欠けたら本文を触らない
  // （消してから「戻せません」では購入者が PDF を受け取れないまま復旧不能になる）。
  let toReattach = [];
  // ★最重要ゲート（2026-07-31 の事故を機械で止める）★
  // ソースに PDF があるのに live の本文に添付が 1 つも無い＝**添付が既に失われている**疑い。
  // このまま全文置換すると「添付なし」を正として上書きし、失われた状態を確定させてしまう。
  // 実際に起きた連鎖: note の 1 日 100 件アップロード上限に達して添付復元が失敗 →「保存しない」で
  // 中断したがエディタ側は添付削除済み → 失敗理由を確かめず再実行 → 添付なしで保存され、
  // 購入者が受け取るはずの PDF 3 本が live から消えた。
  if (REATTACH_PDF) {
    const dir0 = dirname(abs);
    const pool0 = [];
    for (const d of [dir0, join(dir0, 'pdf')]) {
      if (!existsSync(d)) continue;
      for (const f of readdirSync(d)) if (/\.pdf$/i.test(f)) pool0.push(f);
    }
    if (pool0.length && attachedPdfs.length === 0) {
      console.error(`[FAIL] --reattach-pdf: ソースに PDF ${pool0.length} 件があるのに live 本文の添付が 0 件 → 更新しない: ${noteId}`);
      console.error('  添付が既に失われている疑い。このまま更新すると「添付なし」を正として上書きしてしまう。');
      console.error('  1) 実査:   npm run check-note-attachments:live');
      for (const f of pool0) console.error(`  2) 復旧:   node scripts/note-attach-file.mjs --note ${noteId} --file "${join(dir0, f)}" --commit`);
      console.error('  3) 復旧後にこのコマンドを再実行する（note のアップロードは 1 日 100 件が上限。翌日に回す判断も要る）');
      return false;
    }
  }
  if (attachedPdfs.length && REATTACH_PDF) {
    const dir = dirname(abs);
    const { resolved, missing, poolSize } = resolveLocalFiles(attachedPdfs, dir, { existsSync, readdirSync, join });
    if (missing.length) {
      console.error(`[FAIL] --reattach-pdf: live の添付 ${attachedPdfs.length} 件のうち ${missing.length} 件がローカルに無い → 本文を触らず中断: ${noteId}`);
      for (const m of missing) console.error(`         見つからない: ${m}（探索: ${dir} と ${dir}/pdf・候補${poolSize}件）`);
      return false;
    }
    toReattach = resolved;
    console.log(`[3-pre] --reattach-pdf: 添付 ${resolved.length} 件を置換後に貼り直す（${resolved.map((r) => r.base).join(' / ')}）`);
  }
  // 添付を失った/失いかけた事実を負債として残すヘルパー。
  // 「保存していないから無害」は **live に限った話**で、エディタ側は添付削除済みのまま残る。
  // 失敗理由を確かめず再実行すると「添付なし」を正として保存してしまう（2026-07-31 の消失事故）。
  // よって **--reattach-pdf の復元失敗・上限到達も負債として記録**し、再添付まで surface する。
  const recordAttachmentDebt = (reason, files) => {
    try {
      const LOSS_LOG = join(ROOT, '.claude/state/note-attachment-loss.json');
      const j = existsSync(LOSS_LOG) ? JSON.parse(readFileSync(LOSS_LOG, 'utf8')) : { pending: [] };
      j.pending = (j.pending || []).filter((x) => x.noteId !== noteId);
      j.pending.push({ noteId, at: new Date().toISOString(), reason, dropped: files, note: '再添付するまで負債。note-attach-batch 成功時に自動で消える' });
      mkdirSync(dirname(LOSS_LOG), { recursive: true });
      writeFileSync(LOSS_LOG, JSON.stringify(j, null, 2) + '\n');
      console.error(`[loss] 負債として記録（${reason}）→ .claude/state/note-attachment-loss.json`);
    } catch (e) { console.error('[loss] 記録に失敗:', e.message); }
  };

  // --allow-attachment-loss で意図的に添付を捨てる場合、**その事実をどこにも残さない**と
  // 「反映後に必ず再添付する」という口約束だけになり、忘れても次の live 実査（手動）まで
  // 誰も気づかない。中断は note-update-aborted.json に残るのに、意図的な消失は無記録だった。
  // ここで負債として記録し、check-note-delivery-due が未解消なら surface する（2026-08-11 新設）。
  if (attachedPdfs.length && ALLOW_ATTACH_LOSS && !REATTACH_PDF) {
    recordAttachmentDebt('--allow-attachment-loss で意図的に破棄', attachedPdfs);
  }
  if (attachedPdfs.length && !ALLOW_ATTACH_LOSS && !REATTACH_PDF) {
    console.error(`[FAIL] 本文に PDF 添付カード ${attachedPdfs.length} 件を検出 → 全文置換すると消えるため中断: ${noteId}`);
    for (const f of attachedPdfs) console.error(`         ${f}`);
    console.error('  対処: 添付を貼り直しつつ本文を差し替えるなら --reattach-pdf（推奨・同一セッションで復元）。');
    console.error('        画像だけ直すなら --images-only（本文・添付・有料境界を触らない）。');
    console.error('        本文を差し替えるなら --allow-attachment-loss を付け、反映後に必ず再添付する:');
    console.error(`        node scripts/note-attach-file.mjs --note ${noteId} --file <pdf> --commit`);
    return false;
  }

  // 3. 全文置換（empty→paste→probe 検証）
  const hasProbe = await emptyAndPaste(page, body, probe);
  if (!hasProbe) {
    console.error(`[FAIL] paste 失敗（probe 未検出）。保存せず中断（空更新事故防止）: ${noteId}`);
    await page.screenshot({ path: join(ROOT, `.tmp/nu-pastefail-${noteId}.png`) });
    return false;
  }

  // 3d. 画像トークン数 assert（paste で本文が化けていないか）
  if (images.length) {
    const tokCount = await page.evaluate(() => ((document.querySelector('[contenteditable=true]')?.innerText || '').match(/〔〔IMG:\d+〕〕/g) || []).length);
    console.log(`[3d] 画像トークン: editor=${tokCount} / SoT=${images.length}`);
    if (tokCount !== images.length) {
      console.error(`[FAIL] 画像トークン数不一致（paste 化け疑い）→ 保存せず中断: ${noteId}`);
      await page.screenshot({ path: join(ROOT, `.tmp/nu-tokenfail-${noteId}.png`) });
      return false;
    }
  }

  // 4. リンクカード化（URL見出し残存時は保存せず中断＝壊れた本文を絶対に反映しない）
  const cardOk = await cardify(page);
  if (!cardOk) {
    await page.screenshot({ path: join(ROOT, `.tmp/nu-urlheading-${noteId}.png`) });
    return false;
  }

  // 4.4 本文画像アップロード（トークン段落 → 実画像）。leftover 残存/失敗は保存せず中断。
  if (images.length) {
    const r = await insertImagesAtPlaceholders(page, images, { tag: '[4.4]' });
    if (r.leftover.length) { console.error(`[4.4] ABORT: 画像トークン残存（${r.leftover.join(' ')}）→ 保存しない`); await page.screenshot({ path: join(ROOT, `.tmp/nu-imgleft-${noteId}.png`) }); return false; }
    if (r.failed.length && !IMG_LENIENT) { console.error(`[4.4] ABORT: 画像挿入に失敗（${r.failed.length}件）→ 保存しない（--img-lenient で続行可）`); await page.screenshot({ path: join(ROOT, `.tmp/nu-imgfail-${noteId}.png`) }); return false; }
    if (!r.settled && !IMG_LENIENT) { console.error('[4.4] ABORT: 画像が CDN 確定せず（保存すると live で欠落）→ 再実行'); await page.screenshot({ path: join(ROOT, `.tmp/nu-imgsettle-${noteId}.png`) }); return false; }
  }

  // 4.5 目次ブロック（H2>=3・最初のh2直前・--no-toc で抑止）。全文置換で消えるため再挿入。
  const h2count = (body.match(/^##\s+/gm) || []).length;
  if (!argv.includes('--no-toc') && h2count >= 3) {
    const tocStatus = await insertTocBlock(page, noteId);
    if (tocStatus === 'misplaced') tocProblems.push(noteId);
  }

  // 4.6 PDF 添付の復元（--reattach-pdf）。全文置換で消えた添付を、保存前に同じセッションで貼り直す。
  //     有料記事では本文末尾＝有料エリア内に入るため、無料プレビューへ漏れない（note-attach-file と同型）。
  //     1 件でも貼り直せなければ保存しない＝「添付が消えたまま更新」を絶対に作らない。
  if (toReattach.length) {
    const usedToday = attachedTodayCount();
    if (usedToday + toReattach.length > ATTACH_DAILY_LIMIT) {
      console.error(`[4.6] ABORT: 本日の添付アップロードが上限に達する（済 ${usedToday} + 今回 ${toReattach.length} > ${ATTACH_DAILY_LIMIT}）→ 更新しない: ${noteId}`);
      console.error('  note の 1 日 100 件上限を超えるとアップロードが全て失敗し、添付を失ったまま保存する事故になる。翌日に再開すること。');
      recordAttachmentDebt('復元前に日次上限へ到達（エディタ側は添付削除済み）', toReattach.map((f) => f.base));
      return false;
    }
    for (const f of toReattach) {
      const r = await attachFileInEditor(page, f.abs);
      if (!r.ok) {
        console.error(`[4.6] ABORT: 添付の復元に失敗（${f.base}: ${r.reason}）→ 保存しない: ${noteId}`);
        await page.screenshot({ path: join(ROOT, `.tmp/nu-reattachfail-${noteId}.png`) });
        recordAttachmentDebt(`添付の復元に失敗（${f.base}: ${r.reason}）`, toReattach.map((x) => x.base));
        return false;
      }
      recordAttach(noteId, relative(ROOT, f.abs));
      console.log(`[4.6] 添付を復元: ${f.base}（embeds ${r.embedsBefore}→${r.embedsAfter}・本日 ${attachedTodayCount()}/${ATTACH_DAILY_LIMIT}）`);
    }
    // 復元後の実体確認: 元と同じ本数のファイルカードが本文にあるか
    const now = await listAttachedFiles(page);
    if (now.length < toReattach.length) {
      console.error(`[4.6] ABORT: 復元後の添付が ${now.length}/${toReattach.length} 件しかない → 保存しない: ${noteId}`);
      recordAttachmentDebt(`復元後の添付が ${now.length}/${toReattach.length} 件`, toReattach.map((x) => x.base));
      return false;
    }
    console.log(`[4.6] 添付復元 OK（${now.length} 件）`);
  }

  // 4.7 タイトル変更（frontmatter に title があるとき）。edit 画面のタイトル textarea を差し替える。
  //     もくじの便益タイトル刷新など、本文と同時にタイトルも変えたいケース用。--no-title で抑止。
  if (title && !argv.includes('--no-title')) {
    try {
      const titleSel = 'textarea[placeholder*="タイトル"]';
      const tl = page.locator(titleSel).first();
      if (await tl.count()) {
        await tl.click(); await sleep(300);
        await tl.fill(title); await sleep(700);
        const cur = (await tl.inputValue().catch(() => '')) || '';
        console.log(`[4.7] title set: ${cur.trim() === title.trim() ? 'OK' : 'MISMATCH cur="' + cur + '"'}`);
      } else {
        console.log('[4.7] title textarea 未検出（タイトル変更スキップ・本文のみ更新）');
      }
    } catch (e) { console.log('[4.7] title set skip:', e.message.split('\n')[0]); }
  } else if (!argv.includes('--no-title')) {
    // frontmatter に title が無いと、本文の H1 をいくら直してもライブのタイトルは古いまま残る。
    // それでも従来は ok を返していたため「5/5 成功」なのに全タイトルが誤記のまま、という
    // 偽成功が起きた（2026-08-13・コンクリート主任技士 5 本。資格名が誤ったまま販売継続）。
    // タイトルは記事の最も目立つ要素なので、本文 H1 とライブ題名の食い違いを必ず surface する。
    try {
      const h1 = (raw.match(/^#\s+(.+)$/m) || [])[1]?.trim();
      const tl = page.locator('textarea[placeholder*="タイトル"]').first();
      const cur = (await tl.count()) ? ((await tl.inputValue().catch(() => '')) || '').trim() : '';
      if (h1 && cur && h1 !== cur) {
        TITLE_DRIFTS.push({ noteId, h1, live: cur });
        console.log(`[4.7] ★ タイトル未更新: 本文H1「${h1}」に対しライブ題名は「${cur}」のまま。`);
        console.log('       frontmatter に title: を足して再実行しないと、ライブのタイトルは古いまま残る。');
      }
    } catch { /* 検出できないときは黙って進む（本文更新は妨げない） */ }
  }

  // 5. 手動確定（--pause）: 本文差替まで済ませ、タイトル変更＋更新確定はユーザーに委ねる。
  //    無料記事の「更新する」自動確定は未検証、かつタイトル変更ツールが無いため、この2つを同一
  //    セッションで手動処理する（P4 もくじ live 反映）。ブラウザを閉じるとスクリプトが終了する。
  if (PAUSE) {
    await page.screenshot({ path: join(ROOT, `.tmp/nu-pause-${noteId}.png`), fullPage: false });
    console.log('\n========================================');
    console.log(`[PAUSE] 本文を差し替えました（${noteId}）。ブラウザで手動で仕上げてください:`);
    console.log('  1. タイトル欄を新しいタイトルに書き換える');
    if (title) console.log(`     新タイトル: ${title}`);
    console.log('  2. 右上「公開に進む」→「更新する」をクリック');
    console.log('  3. フォロワー通知は「いいえ（しない）」を選ぶ');
    console.log('  4. 反映を確認したらブラウザのウィンドウを閉じる（閉じると本スクリプトが終了）');
    console.log('  ※ 閉じる前に必ず「更新する」まで完了すること（未確定で閉じると下書きは破棄されます）');
    console.log('========================================\n');
    // ブラウザ close で解除。手動作業を待つため最大 30 分の安全タイムアウトを付す。
    await Promise.race([
      new Promise((res) => ctx.once('close', res)),
      new Promise((res) => setTimeout(res, 30 * 60 * 1000)),
    ]);
    console.log(`[PAUSE] セッション終了（${noteId}）。API で反映を実査してください: curl --ssl-no-revoke https://note.com/api/v3/notes/${noteId}`);
    return true;
  }

  // 5'. ライブ反映 or dry-run
  if (!COMMIT) {
    await page.screenshot({ path: join(ROOT, `.tmp/nu-dry-${noteId}.png`), fullPage: false });
    console.log(`[dry-run] paste まで成功（未反映）。スクショ: .tmp/nu-dry-${noteId}.png。実反映は --commit。`);
    return true;
  }
  const live = await publishLive(page, noteId, boundary, isPaid);
  if (!live) { console.error(`[FAIL] ライブ反映に失敗: ${noteId}`); return false; }

  // 5e. 公開後 API 実体検証（自動化・3検査）: URL見出し / 空引用 / 画像欠落。
  //     ネットワーク失敗は WARN（手動確認へフォールバック）、検出は FAIL。
  const chk = await assertLiveBody(noteId, { expectedImgs, paid: isPaid });
  if (chk.fetchError) {
    console.log(`[5e] WARN: API検証がネットワークで未達（${chk.fetchError}）→ 手動確認: curl --ssl-no-revoke https://note.com/api/v3/notes/${noteId}`);
  } else if (!chk.ok) {
    console.error(`[5e] FAIL: 公開本文に不整合: ${liveIssues(chk)} → 再実行 or note エディタで手動修正`);
    return false;
  } else {
    console.log(`[5e] API 実体検証 OK（URL見出し0 空引用0 img=${chk.imgLive}）`);
  }
  console.log(`[OK] ${noteId} ライブ反映完了`);
  return true;
}

// assertLiveBody の不整合を1行に整形する。
function liveIssues(chk) {
  const parts = [];
  if (chk.urlHeadings.length) parts.push(`URL見出し[${chk.urlHeadings.join(' / ')}]`);
  if (chk.emptyBq) parts.push(`空引用${chk.emptyBq}件`);
  if (chk.imgShort) parts.push(`画像欠落(live=${chk.imgLive})`);
  if (chk.freeShort) parts.push(`無料プレビュー崩壊(${chk.freeChars}字＝有料境界が冒頭へ動いた疑い)`);
  return parts.join(' / ') || 'なし';
}

const articles = loadArticles();
console.log(`=== note-update-body: ${articles.length} 件 / mode=${COMMIT ? 'COMMIT(ライブ反映)' : 'DRY-RUN(反映しない)'} ===`);

const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: false, channel: 'chrome',
  proxy: PROXY ? { server: PROXY } : undefined,
  ignoreHTTPSErrors: true,
  viewport: { width: 1366, height: 1000 },
  args: ['--disable-blink-features=AutomationControlled'],
});

let ok = 0, fail = 0;
try {
  const page = ctx.pages()[0] || (await ctx.newPage());

  // 1. account ゲート
  await page.goto('https://note.com/settings/account', { waitUntil: 'domcontentloaded', timeout: 60000 });
  let acct = false;
  for (let i = 0; i < 10; i++) {
    await sleep(2000);
    if (/dobokunote/.test(await page.evaluate(() => document.body.innerText || ''))) { acct = true; break; }
  }
  if (!acct) { console.error('ABORT: account != dobokunote'); await ctx.close(); process.exit(2); }
  console.log('[1] account gate OK (dobokunote)');

  let consecFail = 0;
  for (const artPath of articles) {
    try {
      const parsed = parseArticle(artPath);
      // probe: 単一記事は --probe 優先、それ以外は本文から自動導出（list 時は各記事ごと自動）
      const probe = (articles.length === 1 && PROBE_ARG) ? PROBE_ARG : deriveProbe(parsed.body);
      // 前回この記事で中断していたら、エディタに壊れた状態が残っている可能性がある。
      // 確かめずに再実行して「汚れた状態」を上書き保存する事故（2026-07-31）を機械で止める。
      const prevAbort = abortedEntry(parsed.noteId);
      if (prevAbort && !FORCE_RETRY) {
        console.error(`[SKIP] ${parsed.noteId} は前回中断している（${prevAbort.at}: ${prevAbort.reason}）`);
        console.error('  note のエディタには中断時の状態（全文置換済み・添付削除済み等）が残る。');
        console.error('  live を実査して問題がないことを確認してから --force-retry を付けて再実行すること:');
        console.error(`    npm run check-note-attachments:live -- --only ${parsed.noteId}`);
        fail++; consecFail++;
        if (articles.length > 1 && consecFail >= MAX_CONSEC_FAIL) { console.error('\n[ABORT] 連続 SKIP/失敗で中断'); break; }
        continue;
      }
      const result = await updateArticle(page, parsed, probe);
      if (result) {
        clearAbort(parsed.noteId);
        ok++;
        // フル本文を live 反映できた → 再公開ドリフト検出のハッシュを in-sync 化（--commit 時のみ）。
        if (COMMIT && recordPublishedHash(relative(ROOT, parsed.abs))) console.log(`[hash] ${relative(ROOT, parsed.abs)} 再公開ハッシュ更新`);
        // 本文反映は有料境界を再設定し価格ページも通るため、live 影響メタも in-sync 化する。
        // アセット(PDF/カバー)は別工程なのでここでは触らない（note-attach-file / note-update-cover が記録）。
        if (COMMIT) recordPublishedMetaHash(relative(ROOT, parsed.abs));
        consecFail = 0;
      } else { recordAbort(parsed.noteId, '更新フローが false を返した（保存せず中断）'); fail++; consecFail++; }
    } catch (e) {
      console.error('[ERROR]', artPath, e.message);
      try { const pj = parseArticle(artPath); recordAbort(pj.noteId, e.message); } catch {}
      fail++; consecFail++;
    }
    if (articles.length > 1 && consecFail >= MAX_CONSEC_FAIL) {
      console.error(`\n[ABORT] ${consecFail} 本連続で失敗 → 残り ${articles.length - (ok + fail)} 本を実行せず中断。`);
      console.error('  系統的な原因（note の UI 変更 / ログイン切れ / レート制限）を疑い、1 本を --article 単体で再現してから再開すること。');
      console.error('  成功分は再公開ハッシュが in-sync 済みなので、原因を直したあと同じ list で再実行すれば続きから進む。');
      break;
    }
    if (articles.length > 1) await sleep(2000);
  }
} finally {
  await ctx.close();
}

console.log(`\n[done] ok=${ok} fail=${fail} / ${articles.length}`);
if (TITLE_DRIFTS.length) {
  // ok=N fail=0 を「全部正しくなった」と読ませないための注記。本文だけ直ってタイトルが
  // 古いまま残るのは、読者から最も見える形の未完了（2026-08-13 に 5 本で実発生）。
  console.log(`\n★ タイトルが未更新のまま残った記事 ${TITLE_DRIFTS.length} 件（本文は更新済み）:`);
  for (const d of TITLE_DRIFTS) {
    console.log(`  ${d.noteId}`);
    console.log(`    ライブ: ${d.live}`);
    console.log(`    本文H1: ${d.h1}`);
  }
  console.log('  → 各 article.md の frontmatter に title: を足して再実行する。');
}
if (tocProblems.length) {
  console.error(`[done] ⚠ 目次位置NG（導入分断の疑い・再挿入しても直らず）: ${tocProblems.length} 件 → ${tocProblems.join(', ')}`);
  console.error('       各記事の .tmp/nu-toc-<id>.png を目視し、必要なら手動で目次を最初のh2直前へ移動すること。');
}
process.exit(fail > 0 || tocProblems.length > 0 ? 1 : 0);
