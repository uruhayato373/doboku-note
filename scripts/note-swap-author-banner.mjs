#!/usr/bin/env node
/**
 * note-swap-author-banner.mjs
 * ---------------------------------------------------------------------------
 * 既公開 note 記事の著者オーソリティ・バナーだけを差し替え、先頭バナー直後へ説明文2段落を挿入する。
 * 全文置換は PDF 添付カードを消し、再添付が note の「1日100ファイル」上限を消費するため使わない。
 *
 * 使い方:
 *   node scripts/note-swap-author-banner.mjs --article <article.md>              # probeのみ（既定）
 *   node scripts/note-swap-author-banner.mjs --article <article.md> --commit     # 差替・ライブ更新
 *   node scripts/note-swap-author-banner.mjs --list <paths.txt> --commit          # 一括更新
 *   npm run note-swap-author-banner -- --list <paths.txt> [--commit]
 *
 * 安全ゲート:
 *   - dobokunote アカウント確認、旧 figure の位置と前後文脈を編集前に表示
 *   - PDF 添付数を編集前後で比較し、減少時は保存しない
 *   - 画像数は差替前後で同数（bottom 未検出時のみ +1 も許容）
 *   - CDN 確定待ち、公開 API の新本文/旧キャプション検証、1日あたり成功件数上限
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveProfileDir } from './lib/playwright-auth-profile.mjs';
import { countEditorImages, uploadAtCaret, settleUploads } from './lib/note-images.mjs';
import { listAttachedFiles } from './lib/note-attach.mjs';
import { publishLive } from './lib/note-live-publish.mjs';
import { fetchNoteBody } from './lib/note-live-check.mjs';
import { recordPublishedHash } from './lib/note-republish-hash.mjs';
import { todayJst } from './lib/jst-date.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE = resolveProfileDir('note', { cwd: ROOT, repoRoot: ROOT });
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
const DONE_LOG = join(ROOT, '.claude/state/note-swap-banner-done.json');
const NEW_PROSE_PREFIX = 'この教材は、技術士（総合技術監理部門）を持つ';
const OLD_CAPTION = '技術士（総合技術監理部門）を持つ元発注者が、施工管理技士の記述を分析して作成';
const OLD_CAPTION_PREFIX = '技術士（総合技術監理部門）を持つ元発注者が';
const BOTTOM_PROSE_PREFIX = '上位資格の分析力';
const DEFAULT_BOUNDARY = '試験問題|予想問題';
const SETTLE_MIN_MS = Number(process.env.NOTE_IMG_SETTLE_MIN_MS || 90_000);
const SETTLE_PER_IMG_MS = Number(process.env.NOTE_IMG_SETTLE_PER_IMG_MS || 90_000);
const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

const argv = process.argv.slice(2);
const getArg = (name) => {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : null;
};
const ARTICLE_ARG = getArg('--article');
const LIST_ARG = getArg('--list');
const BOUNDARY_ARG = getArg('--boundary-h2');
const COMMIT = argv.includes('--commit');
const MAX_CONSEC_FAIL = Number(getArg('--max-consecutive-fail') || 3);
const DAILY_LIMIT = Number(getArg('--daily-limit') || 90);

if ((!ARTICLE_ARG && !LIST_ARG) || (ARTICLE_ARG && LIST_ARG)) {
  console.error('--article <path> または --list <file> のどちらか一方を指定してください。');
  process.exit(1);
}
if (!Number.isInteger(MAX_CONSEC_FAIL) || MAX_CONSEC_FAIL < 1) {
  console.error('--max-consecutive-fail は1以上の整数で指定してください。');
  process.exit(1);
}
if (!Number.isInteger(DAILY_LIMIT) || DAILY_LIMIT < 1) {
  console.error('--daily-limit は1以上の整数で指定してください。');
  process.exit(1);
}

mkdirSync(join(ROOT, '.tmp'), { recursive: true });

function loadArticlePaths() {
  if (!LIST_ARG) return [ARTICLE_ARG];
  const listPath = resolve(ROOT, LIST_ARG);
  return readFileSync(listPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

function frontmatterField(frontmatter, key) {
  return (frontmatter.match(new RegExp(`^${key}:\\s*(?:"([^"]*)"|'([^']*)'|(.+?))\\s*$`, 'm')) || [])
    .slice(1)
    .find((value) => value !== undefined && value !== '') || '';
}

function parseArticle(articlePath) {
  const abs = resolve(ROOT, articlePath);
  if (!existsSync(abs)) throw new Error(`記事が見つかりません: ${abs}`);
  const raw = readFileSync(abs, 'utf8').replace(/^\ufeff/, '');
  const frontmatterMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch) throw new Error('frontmatter がありません');
  const frontmatter = frontmatterMatch[1];
  const noteId = frontmatterField(frontmatter, 'noteId') ||
    (frontmatterField(frontmatter, 'noteUrl').match(/\/n\/(n[0-9a-z]+)/i) || [])[1] || '';
  if (!/^n[0-9a-z]{6,}$/i.test(noteId)) throw new Error(`noteId missing or invalid: ${noteId}`);

  const notePricing = frontmatterField(frontmatter, 'notePricing');
  if (!['paid', 'free', 'membership'].includes(notePricing)) {
    throw new Error(`notePricing は paid/free/membership のいずれかが必要です: ${notePricing || '(空)'}`);
  }
  const paidBoundary = frontmatterField(frontmatter, 'paidBoundary');
  const boundary = BOUNDARY_ARG || paidBoundary || DEFAULT_BOUNDARY;
  try { new RegExp(boundary); } catch (error) { throw new Error(`paidBoundary が不正な正規表現です: ${error.message}`); }

  const body = raw.slice(frontmatterMatch[0].length).replace(/^\r?\n/, '');
  const lines = body.split(/\r?\n/);
  const bannerPattern = /^!\[[^\]]*\]\((img\/figure-author-authority[^)]*)\)$/;
  const banners = [];
  for (let index = 0; index < lines.length; index++) {
    const match = lines[index].match(bannerPattern);
    if (match) banners.push({ line: index + 1, rel: match[1], abs: resolve(dirname(abs), match[1]) });
  }
  if (!banners.length) throw new Error('著者オーソリティ・バナー行がありません');
  for (const banner of banners) {
    if (!existsSync(banner.abs)) throw new Error(`バナー画像が見つかりません: ${banner.rel}`);
  }

  const firstIndex = banners[0].line - 1;
  const prose = lines.slice(firstIndex + 1).map((line) => line.trim()).filter(Boolean).slice(0, 2);
  if (prose.length < 2) throw new Error('先頭バナー直後の本文2段落を取得できません');
  if (!prose[0].startsWith(NEW_PROSE_PREFIX)) {
    throw new Error(`先頭バナー直後の第1段落が想定外です: ${prose[0].slice(0, 60)}`);
  }

  return {
    abs,
    relativePath: relative(ROOT, abs).replaceAll('\\', '/'),
    noteId,
    notePricing,
    isPaid: notePricing === 'paid',
    isMembership: notePricing === 'membership',
    boundary,
    banners,
    prose,
  };
}

function readDoneState() {
  if (!existsSync(DONE_LOG)) return { done: [] };
  const state = JSON.parse(readFileSync(DONE_LOG, 'utf8'));
  if (!state || !Array.isArray(state.done)) throw new Error('note-swap-banner-done.json の done が配列ではありません');
  return state;
}

function doneTodayCount() {
  const today = todayJst();
  return readDoneState().done.filter((entry) => entry?.at === today).length;
}

function recordDone(noteId) {
  const state = readDoneState();
  state.done.push({ noteId, at: todayJst() });
  mkdirSync(dirname(DONE_LOG), { recursive: true });
  writeFileSync(DONE_LOG, JSON.stringify(state, null, 2) + '\n');
}

async function accountGate(page) {
  await page.goto('https://note.com/settings/account', { waitUntil: 'domcontentloaded', timeout: 60000 });
  for (let attempt = 0; attempt < 10; attempt++) {
    await sleep(2000);
    if (/dobokunote/.test(await page.evaluate(() => document.body.innerText || ''))) {
      console.log('[1] account gate OK (dobokunote)');
      return true;
    }
  }
  return false;
}

async function probeBannerFigures(page, wanted) {
  return page.evaluate(({ captionPrefix, bottomPrefix, limit }) => {
    const editor = document.querySelector('[contenteditable=true]');
    if (!editor) return { mode: 'none', figuresTotal: 0, targets: [] };
    const figures = Array.from(editor.querySelectorAll('figure'));
    const firstH2 = editor.querySelector('h2');
    const before = (left, right) => Boolean(left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING);
    const topBlock = (element) => {
      let block = element;
      while (block.parentElement && block.parentElement !== editor) block = block.parentElement;
      return block;
    };
    const nearbyText = (element, direction) => {
      let cursor = topBlock(element);
      for (let steps = 0; cursor && steps < 8; steps++) {
        cursor = direction === 'previous' ? cursor.previousElementSibling : cursor.nextElementSibling;
        const text = (cursor?.innerText || cursor?.textContent || '').replace(/\s+/g, ' ').trim();
        if (text) return text.slice(0, 40);
      }
      return '';
    };
    const describe = (figure, source) => ({
      index: figures.indexOf(figure),
      source,
      caption: (figure.querySelector('figcaption')?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40),
      previous: nearbyText(figure, 'previous'),
      next: nearbyText(figure, 'next'),
    });

    const captionMatches = figures.filter((figure) =>
      (figure.querySelector('figcaption')?.innerText || '').trim().startsWith(captionPrefix),
    );
    let mode = 'caption';
    let selected = captionMatches;
    if (!selected.length) {
      mode = 'fallback';
      selected = [];
      const top = firstH2 ? figures.find((figure) => before(figure, firstH2)) : figures[0];
      if (top) selected.push(top);

      const sequence = Array.from(editor.querySelectorAll('figure,p,h2')).filter((element) =>
        element.tagName === 'FIGURE' || !element.closest('figure'),
      );
      const bridgeIndex = sequence.findIndex((element) =>
        element.tagName === 'P' && (element.innerText || '').trim().startsWith(bottomPrefix),
      );
      const bottom = bridgeIndex > 0 && sequence[bridgeIndex - 1].tagName === 'FIGURE'
        ? sequence[bridgeIndex - 1]
        : null;
      if (bottom && !selected.includes(bottom)) selected.push(bottom);
    }
    selected.sort((left, right) => figures.indexOf(left) - figures.indexOf(right));
    return {
      mode,
      figuresTotal: figures.length,
      targets: selected.slice(0, limit).map((figure) => describe(figure, mode)),
    };
  }, { captionPrefix: OLD_CAPTION_PREFIX, bottomPrefix: BOTTOM_PROSE_PREFIX, limit: wanted });
}

function printProbe(article, probe, attachedBefore, imgsBefore) {
  console.log(`[PROBE] ${article.noteId} local-banners=${article.banners.length} figures=${probe.figuresTotal} targets=${probe.targets.length} mode=${probe.mode}`);
  console.log(`[PROBE] counts attached=${attachedBefore.length} images=${imgsBefore}`);
  for (const target of probe.targets) {
    console.log(`  figure[${target.index}] source=${target.source} prev="${target.previous}" next="${target.next}" caption="${target.caption}"`);
  }
}

async function selectFigure(page, index) {
  return page.evaluate((figureIndex) => {
    const editor = document.querySelector('[contenteditable=true]');
    const figure = editor?.querySelectorAll('figure')[figureIndex];
    if (!editor || !figure) return null;
    editor.focus();
    figure.scrollIntoView({ block: 'center' });
    const rect = figure.getBoundingClientRect();
    const range = document.createRange();
    range.selectNode(figure);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    return { y: rect.top + rect.height / 2, caption: (figure.querySelector('figcaption')?.innerText || '').slice(0, 50) };
  }, index);
}

async function countEditorFigures(page) {
  return page.evaluate(() => document.querySelectorAll('[contenteditable=true] figure').length);
}

async function placeCaretAfterDeletion(page, formerY) {
  return page.evaluate((y) => {
    const editor = document.querySelector('[contenteditable=true]');
    const selection = window.getSelection();
    if (!editor || !selection) return { ok: false, reason: 'editor/selection 未検出' };
    editor.focus();

    const anchorElement = selection.anchorNode?.nodeType === Node.ELEMENT_NODE
      ? selection.anchorNode
      : selection.anchorNode?.parentElement;
    const selectedParagraph = anchorElement?.closest?.('p');
    if (selectedParagraph && editor.contains(selectedParagraph) && !(selectedParagraph.innerText || '').trim()) {
      const range = document.createRange();
      range.selectNodeContents(selectedParagraph);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      return { ok: true, caret: 'empty-paragraph' };
    }
    if (selection.rangeCount && anchorElement && editor.contains(anchorElement)) {
      const range = selection.getRangeAt(0);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      return { ok: true, caret: 'collapsed-selection' };
    }

    const emptyParagraphs = Array.from(editor.querySelectorAll('p')).filter((paragraph) => !(paragraph.innerText || '').trim());
    emptyParagraphs.sort((left, right) =>
      Math.abs(left.getBoundingClientRect().top - y) - Math.abs(right.getBoundingClientRect().top - y),
    );
    if (!emptyParagraphs[0]) return { ok: false, reason: '削除位置の caret/空段落を復元できない' };
    const range = document.createRange();
    range.selectNodeContents(emptyParagraphs[0]);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    return { ok: true, caret: 'nearest-empty-paragraph' };
  }, formerY);
}

async function deleteFigureAtIndex(page, index, expectedCaption = null) {
  const before = await countEditorFigures(page);
  let selected = await selectFigure(page, index);
  if (!selected) return { ok: false, reason: `figure[${index}] を選択できない` };
  if (expectedCaption && !selected.caption.startsWith(expectedCaption)) {
    return { ok: false, reason: `figure[${index}] の caption が probe 後に変化した: ${selected.caption}` };
  }

  let key = 'Delete';
  await page.keyboard.press(key);
  await sleep(700);
  let after = await countEditorFigures(page);
  if (after === before) {
    selected = await selectFigure(page, index);
    if (!selected) return { ok: false, reason: `Delete 後に figure[${index}] を再選択できない` };
    if (expectedCaption && !selected.caption.startsWith(expectedCaption)) {
      return { ok: false, reason: `figure[${index}] の caption が Delete 再試行前に変化した: ${selected.caption}` };
    }
    key = 'Backspace';
    await page.keyboard.press(key);
    await sleep(700);
    after = await countEditorFigures(page);
  }
  if (after !== before - 1) {
    return { ok: false, reason: `${key} 後の figure 数が ${before}→${after}（1件減ではない）` };
  }
  const caret = await placeCaretAfterDeletion(page, selected.y);
  if (!caret.ok) return caret;
  return { ok: true, key, caret: caret.caret, before, after };
}

async function selectFigureForParagraphs(page, index) {
  return page.evaluate((figureIndex) => {
    const editor = document.querySelector('[contenteditable=true]');
    const figure = editor?.querySelectorAll('figure')[figureIndex];
    if (!editor || !figure) return false;
    editor.focus();
    figure.scrollIntoView({ block: 'center' });
    const range = document.createRange();
    range.selectNode(figure);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  }, index);
}

async function insertTopParagraphs(page, index, prose) {
  if (!(await selectFigureForParagraphs(page, index))) return false;
  await page.keyboard.press('End');
  await sleep(250);
  await page.keyboard.press('Enter');
  await sleep(350);
  await page.keyboard.type(prose[0], { delay: 6 });
  await page.keyboard.press('Enter');
  await page.keyboard.type(prose[1], { delay: 6 });
  await sleep(500);
  return page.evaluate((paragraphs) => {
    const texts = Array.from(document.querySelectorAll('[contenteditable=true] p'))
      .map((paragraph) => (paragraph.innerText || '').trim());
    return paragraphs.every((paragraph) => texts.includes(paragraph));
  }, prose);
}

async function verifyPublishedBody(noteId) {
  const live = await fetchNoteBody(noteId);
  if (live.error) return { ok: false, reason: `public API 取得失敗: ${live.error}` };
  if (live.unmeasurable) return { ok: false, reason: 'public API で本文を計測できない（membership 限定等）' };
  if (!live.body.includes(NEW_PROSE_PREFIX)) return { ok: false, reason: '公開本文に新しい著者説明がない' };
  if (live.body.includes(OLD_CAPTION)) return { ok: false, reason: '公開本文に旧キャプションが残っている' };
  return { ok: true };
}

async function processArticle(page, article) {
  console.log(`\n[article] ${article.noteId} — ${article.relativePath}`);
  await page.goto(`https://editor.note.com/notes/${article.noteId}/edit/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  try {
    await page.waitForSelector('[contenteditable=true]', { timeout: 30000 });
  } catch {
    return { ok: false, reason: 'editor が読み込まれない' };
  }
  await sleep(5000);

  const attachedBefore = await listAttachedFiles(page);
  const imgsBefore = await countEditorImages(page);
  const probe = await probeBannerFigures(page, article.banners.length);
  printProbe(article, probe, attachedBefore, imgsBefore);
  if (article.isMembership) {
    console.log('[NOTE] membership 記事: 有料境界は free と同様に扱い、既存の試し読みラインを動かさない');
  }
  if (!probe.targets.length) return { ok: false, reason: '差替対象の旧バナー figure を特定できない' };
  const bottomMissing = article.banners.length > 1 && probe.targets.length < 2;
  if (bottomMissing) console.log('[PROBE] NOTE: bottom figure 未検出（画像数ガードは imgsBefore または imgsBefore+1 を許容）');

  if (!COMMIT) return { ok: true, dryRun: true };

  for (let order = 0; order < probe.targets.length; order++) {
    const target = probe.targets[order];
    const banner = article.banners[order];
    const deletion = await deleteFigureAtIndex(
      page,
      target.index,
      target.source === 'caption' ? OLD_CAPTION_PREFIX : null,
    );
    if (!deletion.ok) return { ok: false, reason: `figure[${target.index}] 削除失敗: ${deletion.reason}` };
    console.log(`[swap] figure[${target.index}] ${deletion.key}（${deletion.before}→${deletion.after}） caret=${deletion.caret}`);

    const upload = await uploadAtCaret(page, banner.abs);
    if (!upload.ok) return { ok: false, reason: `画像アップロード失敗: ${upload.reason}` };
    console.log(`[swap] upload ${banner.rel}（captionなし）`);

    if (order === 0) {
      const topTarget = await countEditorImages(page);
      const topSettled = await settleUploads(page, topTarget, Math.max(SETTLE_MIN_MS, SETTLE_PER_IMG_MS), '[swap-top]');
      if (!topSettled.ok) return { ok: false, reason: `先頭画像の CDN 確定失敗 (${topSettled.confirmed}/${topTarget})` };
      if (!(await insertTopParagraphs(page, target.index, article.prose))) {
        return { ok: false, reason: '先頭バナー直後へ本文2段落を p 要素として挿入できない' };
      }
      console.log('[swap] TOP figure 後へ End/Enter + P1/Enter/P2 を入力');
    }
  }

  const imgsAfterUpload = await countEditorImages(page);
  const settled = await settleUploads(
    page,
    imgsAfterUpload,
    Math.max(SETTLE_MIN_MS, probe.targets.length * SETTLE_PER_IMG_MS),
    '[swap]',
  );
  if (!settled.ok) return { ok: false, reason: `画像の CDN 確定失敗 (${settled.confirmed}/${imgsAfterUpload})` };
  await page.screenshot({ path: join(ROOT, `.tmp/swap-banner-${article.noteId}.png`), fullPage: false });

  const attachedAfter = await listAttachedFiles(page);
  if (attachedAfter.length < attachedBefore.length) {
    return {
      ok: false,
      reason: `添付が減少 ${attachedBefore.length}→${attachedAfter.length}。保存せず editor を終了`,
    };
  }
  const imgsAfter = await countEditorImages(page);
  const allowedImageCounts = bottomMissing ? [imgsBefore, imgsBefore + 1] : [imgsBefore];
  if (!allowedImageCounts.includes(imgsAfter)) {
    return {
      ok: false,
      reason: `画像数が不正 ${imgsBefore}→${imgsAfter}（許容: ${allowedImageCounts.join(' or ')}）。保存しない`,
    };
  }
  console.log(`[guard] attached ${attachedBefore.length}→${attachedAfter.length}, images ${imgsBefore}→${imgsAfter}`);

  const published = await publishLive(page, article.noteId, article.boundary, article.isPaid, {
    keepBoundary: false,
    trialLineBottom: false,
    screenshotPrefix: 'swap-banner',
  });
  if (!published) return { ok: false, reason: 'publishLive が失敗' };

  const verified = await verifyPublishedBody(article.noteId);
  if (!verified.ok) return { ok: false, reason: `公開後検証失敗: ${verified.reason}` };
  console.log('[verify] public API: 新本文あり / 旧キャプションなし');

  if (recordPublishedHash(article.relativePath)) console.log(`[hash] ${article.relativePath} 再公開ハッシュ更新`);
  else console.log(`[hash] WARN: ${article.relativePath} の再公開ハッシュを記録できない`);
  recordDone(article.noteId);
  return { ok: true, dryRun: false };
}

const articlePaths = loadArticlePaths();
console.log(`=== note-swap-author-banner: ${articlePaths.length} 件 / mode=${COMMIT ? 'COMMIT' : 'PROBE'} ===`);

let ok = 0;
let fail = 0;
let stoppedByLimit = false;
let stateError = null;
if (COMMIT) {
  try {
    const used = doneTodayCount();
    console.log(`[daily-limit] ${todayJst()} used=${used}/${DAILY_LIMIT}`);
    if (used >= DAILY_LIMIT) {
      stoppedByLimit = true;
      console.log(`[STOP] 本日の [OK] 記録が daily-limit=${DAILY_LIMIT} に達しているため、アップロードを開始しません。`);
    }
  } catch (error) {
    stateError = error;
    console.error(`[FAIL] 日次上限 state を読めないため安全側で中断: ${error.message}`);
  }
}

if (!stoppedByLimit && !stateError) {
  const context = await chromium.launchPersistentContext(PROFILE, {
    headless: false,
    channel: 'chrome',
    proxy: PROXY ? { server: PROXY } : undefined,
    ignoreHTTPSErrors: true,
    viewport: { width: 1366, height: 1000 },
    args: ['--disable-blink-features=AutomationControlled'],
  });
  try {
    const page = context.pages()[0] || (await context.newPage());
    if (!(await accountGate(page))) {
      console.error('[FAIL] ABORT: account != dobokunote');
      fail++;
    } else {
      let consecutiveFail = 0;
      for (const articlePath of articlePaths) {
        if (COMMIT) {
          try {
            if (doneTodayCount() >= DAILY_LIMIT) {
              stoppedByLimit = true;
              console.log(`[STOP] 本日の [OK] 記録が daily-limit=${DAILY_LIMIT} に達したため、残りを実行しません。`);
              break;
            }
          } catch (error) {
            stateError = error;
            console.error(`[FAIL] 日次上限 state を読めないため安全側で中断: ${error.message}`);
            break;
          }
        }
        try {
          const article = parseArticle(articlePath);
          const result = await processArticle(page, article);
          if (result.ok) {
            ok++;
            consecutiveFail = 0;
            console.log(`[OK] ${article.noteId} ${result.dryRun ? 'probe完了（未変更）' : 'バナー差替・公開後検証完了'}`);
          } else {
            fail++;
            consecutiveFail++;
            console.error(`[FAIL] ${article.noteId} ${result.reason}`);
          }
        } catch (error) {
          fail++;
          consecutiveFail++;
          console.error(`[FAIL] ${articlePath} ${error.message}`);
        }
        if (consecutiveFail >= MAX_CONSEC_FAIL) {
          console.error(`[ABORT] ${consecutiveFail} 本連続で失敗したため、残りを実行しません（max=${MAX_CONSEC_FAIL}）。`);
          break;
        }
        if (articlePaths.length > 1) await sleep(2000);
      }
    }
  } finally {
    await context.close();
  }
}

console.log(`[done] ok=${ok} fail=${fail} / ${articlePaths.length}`);
if (stateError) process.exit(1);
process.exit(fail > 0 ? 1 : 0);
