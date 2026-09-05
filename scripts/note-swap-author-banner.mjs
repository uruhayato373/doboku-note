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
 *   node scripts/note-swap-author-banner.mjs --article <article.md> --image-only # 本文を触らず画像だけ
 *   node scripts/note-swap-author-banner.mjs --list <paths.txt> --commit          # 一括更新
 *   npm run note-swap-author-banner -- --list <paths.txt> [--commit]
 *
 * 安全ゲート:
 *   - dobokunote アカウント確認、全 figure の位置・画像比率・old/new 分類を編集前に表示
 *   - PDF 添付数を編集前後で比較し、減少時は保存しない
 *   - figure 数は before - old_count + inserted_count と一致し、最終 old=0 / new top=1
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
const PASTE_SHORTCUT = process.platform === 'darwin' ? 'Meta+V' : 'Control+V';
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
const FORCE_IMAGE_ONLY = argv.includes('--image-only');
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
  const proseCandidate = lines.slice(firstIndex + 1).map((line) => line.trim()).filter(Boolean).slice(0, 2);
  const prose = !FORCE_IMAGE_ONLY && proseCandidate.length >= 2 && proseCandidate[0].startsWith(NEW_PROSE_PREFIX)
    ? proseCandidate
    : null;

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
  const at = todayJst();
  if (!state.done.some((entry) => entry?.noteId === noteId && entry?.at === at)) {
    state.done.push({ noteId, at });
  }
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

async function probeBannerFigures(page) {
  return page.evaluate(async ({ captionPrefix, bottomPrefix, newProsePrefix }) => {
    const editor = document.querySelector('[contenteditable=true]');
    if (!editor) return { mode: 'none', figuresTotal: 0, figures: [], targets: [] };
    const figures = Array.from(editor.querySelectorAll('figure'));
    const firstH2 = editor.querySelector('h2');
    const before = (left, right) => Boolean(left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING);
    const normalize = (value) => String(value || '').normalize('NFC').replace(/\s+/g, ' ').trim();
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
    const followingTextBlock = (element) => {
      let cursor = topBlock(element)?.nextElementSibling || null;
      for (; cursor; cursor = cursor.nextElementSibling) {
        if (!cursor.matches('p,h2,h3,li,blockquote') || cursor.closest('figure')) continue;
        const text = normalize(cursor.innerText || cursor.textContent);
        if (text) return { element: cursor, text };
      }
      return null;
    };
    const emptyParagraphsImmediatelyBefore = (element) => {
      let cursor = topBlock(element)?.previousElementSibling || null;
      let count = 0;
      while (cursor?.tagName === 'P' && !(cursor.innerText || cursor.textContent || '').trim()) {
        count++;
        cursor = cursor.previousElementSibling;
      }
      return count;
    };
    const describeTextBlock = (block) => block ? {
      tag: block.tagName.toLowerCase(),
      text: normalize(block.innerText || block.textContent),
      emptyParagraphsBefore: emptyParagraphsImmediatelyBefore(block),
    } : null;
    const bridge = Array.from(editor.querySelectorAll('p')).find((paragraph) =>
      !paragraph.closest('figure') && normalize(paragraph.innerText || paragraph.textContent).startsWith(bottomPrefix),
    );
    const hasNewProse = (editor.innerText || '').includes(newProsePrefix);
    const classified = [];
    for (let index = 0; index < figures.length; index++) {
      const figure = figures[index];
      const image = figure.querySelector('img');
      figure.scrollIntoView({ block: 'center' });
      if (image) {
        const deadline = Date.now() + 3000;
        while (!(image.complete && image.naturalWidth > 0) && Date.now() < deadline) {
          await new Promise((resolveWait) => setTimeout(resolveWait, 100));
        }
      }
      const attrWidth = Number.parseFloat(image?.getAttribute('width') || '');
      const attrHeight = Number.parseFloat(image?.getAttribute('height') || '');
      const width = image?.naturalWidth > 0 ? image.naturalWidth : (attrWidth > 0 ? attrWidth : 0);
      const height = image?.naturalHeight > 0 ? image.naturalHeight : (attrHeight > 0 ? attrHeight : 0);
      const rawRatio = width > 0 && height > 0 ? width / height : null;
      const ratio = rawRatio == null ? null : Number(rawRatio.toFixed(4));
      const captionFull = normalize(figure.querySelector('figcaption')?.innerText || '');
      const block = topBlock(figure);
      const isBottom = Boolean(bridge && block.nextElementSibling === topBlock(bridge));
      const isTop = Boolean(firstH2 && before(block, topBlock(firstH2)));
      const pos = isBottom ? 'bottom' : isTop ? 'top' : 'other';
      const eligible = isTop || isBottom || captionFull.startsWith(captionPrefix);
      const imageClass = eligible && ratio != null && ratio >= 1.6 && ratio <= 1.95
        ? 'old'
        : eligible && ratio != null && ratio >= 0.95 && ratio <= 1.05
          ? 'new'
          : 'other';
      const previous = nearbyText(figure, 'previous');
      const following = followingTextBlock(figure);
      classified.push({
        index,
        pos,
        ratio,
        class: imageClass,
        width,
        height,
        caption20: captionFull.slice(0, 20),
        caption: captionFull.slice(0, 40),
        previous,
        next: following?.text.slice(0, 40) || nearbyText(figure, 'next'),
        nextFull: following?.text || '',
        nextTag: following?.element.tagName.toLowerCase() || '',
        emptyParagraphsBefore: emptyParagraphsImmediatelyBefore(figure),
        isFirstBlock: !previous,
      });
    }
    const oldFigures = classified.filter((figure) => figure.class === 'old');
    const newTop = classified.filter((figure) => figure.class === 'new' && figure.pos === 'top');
    const newBottom = classified.filter((figure) => figure.class === 'new' && figure.pos === 'bottom');
    const oldOther = oldFigures.filter((figure) => figure.pos === 'other');
    const mode = oldFigures.length
      ? 'swap'
      : newTop.length && !hasNewProse
        ? 'prose-only'
        : newTop.length && hasNewProse
          ? 'already-done'
          : 'none';
    return {
      mode,
      figuresTotal: figures.length,
      figures: classified,
      hasNewProse,
      oldCount: oldFigures.length,
      oldTopCount: oldFigures.filter((figure) => figure.pos === 'top').length,
      oldBottomCount: oldFigures.filter((figure) => figure.pos === 'bottom').length,
      oldOtherCount: oldOther.length,
      newTopCount: newTop.length,
      newBottomCount: newBottom.length,
      newTop,
      newBottom,
      targets: oldFigures,
      bridge: describeTextBlock(bridge),
      firstH2: describeTextBlock(firstH2),
    };
  }, {
    captionPrefix: OLD_CAPTION_PREFIX,
    bottomPrefix: BOTTOM_PROSE_PREFIX,
    newProsePrefix: NEW_PROSE_PREFIX,
  });
}

function printProbe(article, probe, attachedBefore, figuresBefore) {
  console.log(`[PROBE] ${article.noteId} local-banners=${article.banners.length} figures=${probe.figuresTotal} old=${probe.oldCount} new-top=${probe.newTopCount} new-bottom=${probe.newBottomCount} mode=${probe.mode} prose=${probe.hasNewProse ? 'present' : 'missing'}`);
  console.log(`[PROBE] counts attached=${attachedBefore.length} figures=${figuresBefore}`);
  for (const figure of probe.figures) {
    const ratio = figure.ratio == null ? 'n/a' : figure.ratio.toFixed(3);
    console.log(`  figure index=${figure.index} pos=${figure.pos} ratio=${ratio} class=${figure.class} caption20="${figure.caption20}"`);
  }
  for (const target of probe.targets) {
    console.log(`  target figure[${target.index}] pos=${target.pos} empty-before=${target.emptyParagraphsBefore} prev="${target.previous}" next=${target.nextTag}:"${target.next}"`);
  }
}

async function selectFigure(page, index) {
  return page.evaluate((figureIndex) => {
    const editor = document.querySelector('[contenteditable=true]');
    const figure = editor?.querySelectorAll('figure')[figureIndex];
    if (!editor || !figure) return null;
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

async function countEditorFigures(page) {
  return page.evaluate(() => document.querySelectorAll('[contenteditable=true] figure').length);
}

async function deleteFigureAtIndex(page, index, following) {
  if (!following?.tag || !following?.text) {
    return { ok: false, reason: `figure[${index}] の後続 block 全文を probe できていない` };
  }
  const before = await countEditorFigures(page);
  const selected = await selectFigure(page, index);
  if (!selected) return { ok: false, reason: `figure[${index}] を選択できない` };

  // Range 選択がエディタの選択状態へ同期するまで一拍置く（probe では 300ms で安定。
  // 待たずに Delete すると選択が反映されず figure が残る＝2026-09-05 実測）。
  await sleep(300);
  await page.keyboard.press('Delete');
  await sleep(700);
  let after = await countEditorFigures(page);
  let key = 'Delete';
  if (after === before) {
    // Delete が効かない環境向けの保険。選択し直してから Backspace。
    if (!(await selectFigure(page, index))) return { ok: false, reason: `figure[${index}] を再選択できない` };
    await sleep(300);
    await page.keyboard.press('Backspace');
    await sleep(700);
    after = await countEditorFigures(page);
    key = 'Backspace';
  }
  if (after !== before - 1) {
    return { ok: false, reason: `${key} 後の figure 数が ${before}→${after}（1件減ではない）` };
  }
  const followingExists = await page.evaluate((expected) => {
    const editor = document.querySelector('[contenteditable=true]');
    const normalize = (value) => String(value || '').normalize('NFC').replace(/\s+/g, ' ').trim();
    return Array.from(editor?.querySelectorAll('p,h2,h3,li,blockquote') || []).some((block) =>
      !block.closest('figure') && normalize(block.innerText || block.textContent) === normalize(expected),
    );
  }, following.text);
  if (!followingExists) {
    return {
      ok: false,
      reason: `Delete 後に後続 block B が見つからない（text="${following.text}"）`,
    };
  }
  return { ok: true, key, before, after };
}

async function placeCaretAtFollowingBlockStart(page, following, afterFigureIndex = null) {
  return page.evaluate(({ target, figureIndex }) => {
    const editor = document.querySelector('[contenteditable=true]');
    const selection = window.getSelection();
    if (!editor || !selection) return null;
    const normalize = (value) => String(value || '').normalize('NFC').replace(/\s+/g, ' ').trim();
    const blocks = Array.from(editor.querySelectorAll('p,h2,h3,li,blockquote')).filter((block) =>
      !block.closest('figure'),
    );
    let candidates = blocks.filter((block) =>
      block.tagName.toLowerCase() === target.tag &&
      normalize(block.innerText || block.textContent) === normalize(target.text),
    );
    if (Number.isInteger(figureIndex)) {
      const figure = editor.querySelectorAll('figure')[figureIndex];
      if (figure) candidates = candidates.filter((block) =>
        Boolean(figure.compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING),
      );
    }
    const block = candidates[0] || null;
    if (!block) return null;
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    const firstText = walker.nextNode();
    const range = document.createRange();
    if (firstText) range.setStart(firstText, 0);
    else range.setStart(block, 0);
    range.collapse(true);
    editor.focus();
    selection.removeAllRanges();
    selection.addRange(range);
    block.scrollIntoView({ block: 'center' });
    return {
      tag: block.tagName.toLowerCase(),
      text30: normalize(block.innerText || block.textContent).slice(0, 30),
    };
  }, { target: following, figureIndex: afterFigureIndex });
}

async function selectPastedP2Prefix(page, following, prose) {
  return page.evaluate(({ target, paragraphs }) => {
    const editor = document.querySelector('[contenteditable=true]');
    const selection = window.getSelection();
    const normalize = (value) => String(value || '').normalize('NFC').replace(/\s+/g, ' ').trim();
    const describe = (block) => ({
      tag: block?.tagName?.toLowerCase() || null,
      text: normalize(block?.innerText || block?.textContent),
    });
    if (!editor || !selection?.rangeCount) return { ok: false, reason: 'editor/selection 未検出' };
    const anchor = selection.anchorNode;
    const selector = 'p,h2,h3,li,blockquote';
    const candidates = [];
    const addCandidate = (node) => {
      const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
      const block = element?.matches?.(selector) ? element : element?.closest?.(selector) || null;
      if (block && editor.contains(block) && !block.closest('figure') && !candidates.includes(block)) candidates.push(block);
    };
    addCandidate(anchor);
    if (anchor?.nodeType === Node.ELEMENT_NODE) {
      addCandidate(anchor.childNodes[selection.anchorOffset] || null);
      addCandidate(anchor.childNodes[selection.anchorOffset - 1] || null);
    }
    const expectedP1 = normalize(paragraphs[0]);
    const expectedP2 = normalize(paragraphs[1]);
    const expectedB = normalize(target.text);
    const isPastedMergedBlock = (block) => {
      const p2 = block?.previousElementSibling || null;
      const p1 = p2?.previousElementSibling || null;
      return Boolean(
        p1?.tagName === 'P' && normalize(p1.innerText || p1.textContent) === expectedP1 &&
        p2?.tagName === 'P' && normalize(p2.innerText || p2.textContent) === expectedP2 &&
        block?.tagName?.toLowerCase() === target.tag &&
        normalize(block.innerText || block.textContent) === expectedP2 + expectedB,
      );
    };
    const merged = candidates.find(isPastedMergedBlock) || candidates[0] || null;
    const p2 = merged?.previousElementSibling || null;
    const p1 = p2?.previousElementSibling || null;
    const structureOk = Boolean(
      merged && editor.contains(merged) && !merged.closest('figure') &&
      isPastedMergedBlock(merged),
    );
    if (!structureOk) {
      return {
        ok: false,
        reason: 'paste 後の p=P1 / p=P2 / block=P2+B が不一致',
        blocks: [describe(p1), describe(p2), describe(merged)],
      };
    }

    const walker = document.createTreeWalker(merged, NodeFilter.SHOW_TEXT);
    let textNode = walker.nextNode();
    if (!textNode) return { ok: false, reason: 'merged block に text node がない' };
    const range = document.createRange();
    range.setStart(textNode, 0);
    let remaining = paragraphs[1].length;
    let endNode = null;
    let endOffset = 0;
    while (textNode) {
      if (remaining <= textNode.data.length) {
        endNode = textNode;
        endOffset = remaining;
        break;
      }
      remaining -= textNode.data.length;
      textNode = walker.nextNode();
    }
    if (!endNode) return { ok: false, reason: `P2.length=${paragraphs[1].length} まで Range を伸ばせない` };
    range.setEnd(endNode, endOffset);
    if (normalize(range.toString()) !== expectedP2) {
      return { ok: false, reason: `Range 選択文字列が P2 と不一致: ${JSON.stringify(range.toString())}` };
    }
    selection.removeAllRanges();
    selection.addRange(range);
    merged.scrollIntoView({ block: 'center' });
    return { ok: true, tag: merged.tagName.toLowerCase(), selectedLength: range.toString().length };
  }, { target: following, paragraphs: prose });
}

async function verifyRestoredFollowingBlock(page, following, prose) {
  return page.evaluate(({ target, paragraphs }) => {
    const editor = document.querySelector('[contenteditable=true]');
    const selection = window.getSelection();
    const normalize = (value) => String(value || '').normalize('NFC').replace(/\s+/g, ' ').trim();
    const anchor = selection?.anchorNode;
    const selector = 'p,h2,h3,li,blockquote';
    const candidates = [];
    const addCandidate = (node) => {
      const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
      const block = element?.matches?.(selector) ? element : element?.closest?.(selector) || null;
      if (block && editor?.contains(block) && !block.closest('figure') && !candidates.includes(block)) candidates.push(block);
    };
    addCandidate(anchor);
    if (anchor?.nodeType === Node.ELEMENT_NODE) {
      addCandidate(anchor.childNodes[selection.anchorOffset] || null);
      addCandidate(anchor.childNodes[selection.anchorOffset - 1] || null);
    }
    const isRestoredBlock = (block) => {
      const p2 = block?.previousElementSibling || null;
      const p1 = p2?.previousElementSibling || null;
      return Boolean(
        block?.tagName?.toLowerCase() === target.tag &&
        normalize(block.innerText || block.textContent) === normalize(target.text) &&
        p1?.tagName === 'P' && normalize(p1.innerText || p1.textContent) === normalize(paragraphs[0]) &&
        p2?.tagName === 'P' && normalize(p2.innerText || p2.textContent) === normalize(paragraphs[1]),
      );
    };
    const block = candidates.find(isRestoredBlock) || candidates[0] || null;
    return {
      ok: Boolean(
        editor && block && editor.contains(block) && !block.closest('figure') &&
        isRestoredBlock(block),
      ),
      tag: block?.tagName?.toLowerCase() || null,
      text: normalize(block?.innerText || block?.textContent),
    };
  }, { target: following, paragraphs: prose });
}

async function verifyFocusedEmptyParagraphBeforeHeading(page, following) {
  return page.evaluate((target) => {
    const editor = document.querySelector('[contenteditable=true]');
    const selection = window.getSelection();
    const normalize = (value) => String(value || '').normalize('NFC').replace(/\s+/g, ' ').trim();
    if (!editor || !selection?.rangeCount) return { ok: false, focusedTag: null, focusedText: '' };
    const anchor = selection.anchorNode;
    const selector = 'p,h2,h3,li,blockquote';
    const candidates = [];
    const addCandidate = (node) => {
      const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
      const block = element?.matches?.(selector) ? element : element?.closest?.(selector) || null;
      if (block && editor.contains(block) && !block.closest('figure') && !candidates.includes(block)) candidates.push(block);
    };
    addCandidate(anchor);
    if (anchor?.nodeType === Node.ELEMENT_NODE) {
      addCandidate(anchor.childNodes[selection.anchorOffset] || null);
      addCandidate(anchor.childNodes[selection.anchorOffset - 1] || null);
    }
    const isExpectedEmpty = (block) => {
      const next = block?.nextElementSibling || null;
      return Boolean(
        block?.tagName === 'P' && !normalize(block.innerText || block.textContent) &&
        next?.tagName?.toLowerCase() === target.tag &&
        normalize(next.innerText || next.textContent) === normalize(target.text),
      );
    };
    const focused = candidates.find(isExpectedEmpty) || candidates[0] || null;
    return {
      ok: isExpectedEmpty(focused),
      focusedTag: focused?.tagName?.toLowerCase() || null,
      focusedText: normalize(focused?.innerText || focused?.textContent),
      nextTag: focused?.nextElementSibling?.tagName?.toLowerCase() || null,
      nextText: normalize(focused?.nextElementSibling?.innerText || focused?.nextElementSibling?.textContent),
    };
  }, following);
}

async function verifyHeadingPaste(page, following, prose) {
  return page.evaluate(({ target, paragraphs }) => {
    const editor = document.querySelector('[contenteditable=true]');
    const normalize = (value) => String(value || '').normalize('NFC').replace(/\s+/g, ' ').trim();
    const describe = (block) => ({
      tag: block?.tagName?.toLowerCase() || null,
      text: normalize(block?.innerText || block?.textContent),
    });
    const blocks = Array.from(editor?.querySelectorAll('p,h2,h3,li,blockquote') || []).filter((block) => !block.closest('figure'));
    const b = blocks.find((block) =>
      block.tagName.toLowerCase() === target.tag &&
      normalize(block.innerText || block.textContent) === normalize(target.text) &&
      block.previousElementSibling?.tagName === 'P' &&
      normalize(block.previousElementSibling.innerText || block.previousElementSibling.textContent) === normalize(paragraphs[1]) &&
      block.previousElementSibling?.previousElementSibling?.tagName === 'P' &&
      normalize(block.previousElementSibling.previousElementSibling.innerText || block.previousElementSibling.previousElementSibling.textContent) === normalize(paragraphs[0]),
    ) || null;
    const p2 = b?.previousElementSibling || null;
    const p1 = p2?.previousElementSibling || null;
    return {
      ok: Boolean(p1 && p2 && b),
      blocks: [describe(p1), describe(p2), describe(b)],
    };
  }, { target: following, paragraphs: prose });
}

async function pasteTopParagraphs(page, following, prose) {
  if (!['p', 'h2', 'h3'].includes(following.tag)) {
    return { ok: false, reason: `後続 block B の tag=${following.tag || '(none)'} は未対応（p/h2/h3 のみ）` };
  }

  if (following.tag === 'h2' || following.tag === 'h3') {
    await page.keyboard.press('Enter');
    await sleep(400);
    await page.keyboard.press('ArrowUp');
    await sleep(300);
    const empty = await verifyFocusedEmptyParagraphBeforeHeading(page, following);
    if (!empty.ok) {
      console.log(`[diag] heading-empty-p=${JSON.stringify(empty)}`);
      return { ok: false, reason: `${following.tag} B の直前に focused empty p を作成できない` };
    }

    const headingPasteText = `${prose[0]}\n\n${prose[1]}\n\n`;
    try {
      await page.evaluate((text) => navigator.clipboard.writeText(text), headingPasteText);
    } catch (error) {
      return { ok: false, reason: `clipboard.writeText 失敗: ${error.message}` };
    }
    await page.keyboard.press(PASTE_SHORTCUT);
    await sleep(1500);
    const verified = await verifyHeadingPaste(page, following, prose);
    if (!verified.ok) {
      console.log(`[diag] heading-paste=${JSON.stringify(verified.blocks)}`);
      return { ok: false, reason: `heading paste 後の p=P1 / p=P2 / ${following.tag}=B が不一致` };
    }
    return { ok: true, mode: 'heading' };
  }

  const pasteText = `${prose[0]}\n\n${prose[1]}\n\n${prose[1]}\n\n`;
  try {
    await page.evaluate((text) => navigator.clipboard.writeText(text), pasteText);
  } catch (error) {
    return { ok: false, reason: `clipboard.writeText 失敗: ${error.message}` };
  }
  await page.keyboard.press(PASTE_SHORTCUT);
  await sleep(1500);

  const selected = await selectPastedP2Prefix(page, following, prose);
  if (!selected.ok) {
    console.log(`[diag] paste-structure=${JSON.stringify(selected)}`);
    return { ok: false, reason: selected.reason };
  }
  await page.keyboard.press('Delete');
  await sleep(700);
  const restored = await verifyRestoredFollowingBlock(page, following, prose);
  if (!restored.ok) {
    console.log(`[diag] restored-B=${JSON.stringify(restored)}`);
    return { ok: false, reason: `先頭 P2 削除後に B または tag を復元できない（expected=${following.tag}:"${following.text}"）` };
  }
  return { ok: true, mode: 'paragraph' };
}

async function placeCaretAtP1Start(page, following, prose) {
  return page.evaluate(({ target, paragraphs }) => {
    const editor = document.querySelector('[contenteditable=true]');
    const selection = window.getSelection();
    const normalize = (value) => String(value || '').normalize('NFC').replace(/\s+/g, ' ').trim();
    if (!editor || !selection) return null;
    const blocks = Array.from(editor.querySelectorAll('p,h2,h3,li,blockquote')).filter((block) => !block.closest('figure'));
    const b = blocks.find((block) =>
      block.tagName.toLowerCase() === target.tag &&
      normalize(block.innerText || block.textContent) === normalize(target.text) &&
      block.previousElementSibling?.tagName === 'P' &&
      normalize(block.previousElementSibling.innerText || block.previousElementSibling.textContent) === normalize(paragraphs[1]) &&
      block.previousElementSibling?.previousElementSibling?.tagName === 'P' &&
      normalize(block.previousElementSibling.previousElementSibling.innerText || block.previousElementSibling.previousElementSibling.textContent) === normalize(paragraphs[0]),
    );
    const p1 = b?.previousElementSibling?.previousElementSibling || null;
    if (!p1) return null;
    const range = document.createRange();
    range.setStart(p1.firstChild || p1, 0);
    range.collapse(true);
    editor.focus();
    selection.removeAllRanges();
    selection.addRange(range);
    p1.scrollIntoView({ block: 'center' });
    return { tag: 'p', text30: normalize(p1.innerText || p1.textContent).slice(0, 30) };
  }, { target: following, paragraphs: prose });
}

async function inspectUploadedBanner(page, following, prose = null) {
  return page.evaluate(({ target, paragraphs }) => {
    const editor = document.querySelector('[contenteditable=true]');
    const normalize = (value) => String(value || '').normalize('NFC').replace(/\s+/g, ' ').trim();
    if (!editor) return { ok: false, reason: 'editor 未検出', emptyBefore: -1 };
    const blocks = Array.from(editor.querySelectorAll('p,h2,h3,li,blockquote')).filter((block) => !block.closest('figure'));
    let followingBlock = null;
    let firstAfterFigure = null;
    if (paragraphs) {
      followingBlock = blocks.find((block) =>
        block.tagName.toLowerCase() === target.tag &&
        normalize(block.innerText || block.textContent) === normalize(target.text) &&
        block.previousElementSibling?.tagName === 'P' &&
        normalize(block.previousElementSibling.innerText || block.previousElementSibling.textContent) === normalize(paragraphs[1]) &&
        block.previousElementSibling?.previousElementSibling?.tagName === 'P' &&
        normalize(block.previousElementSibling.previousElementSibling.innerText || block.previousElementSibling.previousElementSibling.textContent) === normalize(paragraphs[0]),
      ) || null;
      firstAfterFigure = followingBlock?.previousElementSibling?.previousElementSibling || null;
    } else {
      followingBlock = blocks.find((block) =>
        block.tagName.toLowerCase() === target.tag &&
        normalize(block.innerText || block.textContent) === normalize(target.text) &&
        block.previousElementSibling?.tagName === 'FIGURE',
      ) || null;
      firstAfterFigure = followingBlock;
    }
    const figure = firstAfterFigure?.previousElementSibling || null;
    let emptyBefore = 0;
    let cursor = figure?.previousElementSibling || null;
    while (cursor?.tagName === 'P' && !normalize(cursor.innerText || cursor.textContent)) {
      emptyBefore++;
      cursor = cursor.previousElementSibling;
    }
    return {
      ok: Boolean(figure?.tagName === 'FIGURE' && figure.nextElementSibling === firstAfterFigure),
      emptyBefore,
      nextTag: firstAfterFigure?.tagName?.toLowerCase() || null,
      nextText: normalize(firstAfterFigure?.innerText || firstAfterFigure?.textContent),
    };
  }, { target: following, paragraphs: prose });
}

async function locateSquareBannerForCleanup(page, position, selectExtraEmpty = false) {
  return page.evaluate(({ targetPosition, shouldSelectExtraEmpty, bottomPrefix }) => {
    const editor = document.querySelector('[contenteditable=true]');
    const selection = window.getSelection();
    const normalize = (value) => String(value || '').normalize('NFC').replace(/\s+/g, ' ').trim();
    if (!editor || !selection) return { ok: false, emptyBefore: -1 };
    const ratioOf = (figure) => {
      const image = figure?.querySelector('img');
      const attrWidth = Number.parseFloat(image?.getAttribute('width') || '');
      const attrHeight = Number.parseFloat(image?.getAttribute('height') || '');
      const width = image?.naturalWidth > 0 ? image.naturalWidth : (attrWidth > 0 ? attrWidth : 0);
      const height = image?.naturalHeight > 0 ? image.naturalHeight : (attrHeight > 0 ? attrHeight : 0);
      return width > 0 && height > 0 ? width / height : null;
    };
    const isSquare = (figure) => {
      const ratio = ratioOf(figure);
      return ratio != null && ratio >= 0.95 && ratio <= 1.05;
    };
    let figure = null;
    if (targetPosition === 'top') {
      const firstH2 = editor.querySelector('h2');
      figure = firstH2
        ? Array.from(editor.querySelectorAll('figure')).find((candidate) =>
          isSquare(candidate) && Boolean(candidate.compareDocumentPosition(firstH2) & Node.DOCUMENT_POSITION_FOLLOWING),
        ) || null
        : null;
    } else {
      const bridge = Array.from(editor.querySelectorAll('p')).find((paragraph) =>
        !paragraph.closest('figure') && normalize(paragraph.innerText || paragraph.textContent).startsWith(bottomPrefix),
      ) || null;
      const candidate = bridge?.previousElementSibling || null;
      figure = candidate?.tagName === 'FIGURE' && isSquare(candidate) ? candidate : null;
    }
    if (!figure) return { ok: false, emptyBefore: -1 };
    let emptyBefore = 0;
    let cursor = figure.previousElementSibling;
    while (cursor?.tagName === 'P' && !normalize(cursor.innerText || cursor.textContent)) {
      emptyBefore++;
      cursor = cursor.previousElementSibling;
    }
    if (!shouldSelectExtraEmpty) return { ok: true, emptyBefore };
    const empty = figure?.previousElementSibling || null;
    if (empty?.tagName !== 'P' || normalize(empty.innerText || empty.textContent)) {
      return { ok: false, emptyBefore };
    }
    const range = document.createRange();
    range.selectNode(empty);
    editor.focus();
    selection.removeAllRanges();
    selection.addRange(range);
    empty.scrollIntoView({ block: 'center' });
    return { ok: true, emptyBefore };
  }, { targetPosition: position, shouldSelectExtraEmpty: selectExtraEmpty, bottomPrefix: BOTTOM_PROSE_PREFIX });
}

async function cleanupExtraEmptyParagraphs(page, following, prose, allowedCount, position) {
  let placement = await inspectUploadedBanner(page, following, prose);
  if (!placement.ok) {
    console.log(`[diag] upload-placement=${JSON.stringify(placement)}`);
    return { ok: false, reason: 'upload 後に figure.nextElementSibling を確認できない' };
  }
  const maxAttempts = Math.max(0, placement.emptyBefore - allowedCount);
  let warned = false;
  for (let attempt = 0; attempt < maxAttempts && placement.emptyBefore > allowedCount; attempt++) {
    const beforeOrder = await inspectUploadedBanner(page, following, prose);
    if (!beforeOrder.ok) {
      return { ok: false, reason: `空 p 掃除前の DOM が ${prose ? 'figure → P1 → P2 → B' : 'figure → B'} の順ではない` };
    }
    const before = beforeOrder.emptyBefore;
    placement = beforeOrder;
    const located = await locateSquareBannerForCleanup(page, position, true);
    if (!located.ok) {
      console.log('[WARN] 空 p 掃除後にバナー位置を再取得できず（掃除を打ち切り）');
      return { ok: true, placement, cleanupIncomplete: true };
    }
    await page.keyboard.press('Delete');
    await sleep(600);
    const relocated = await locateSquareBannerForCleanup(page, position);
    if (!relocated.ok) {
      console.log('[WARN] 空 p 掃除後にバナー位置を再取得できず（掃除を打ち切り）');
      return { ok: true, placement, cleanupIncomplete: true };
    }
    const afterOrder = await inspectUploadedBanner(page, following, prose);
    if (!afterOrder.ok) {
      console.log(`[WARN] 空 p 掃除後に ${prose ? 'figure → P1 → P2 → B' : 'figure → B'} の順序を確認できず（掃除を打ち切り）`);
      return { ok: true, placement, cleanupIncomplete: true };
    }
    placement = { ...afterOrder, emptyBefore: relocated.emptyBefore };
    if (placement.emptyBefore >= before) {
      console.log(`[WARN] 余分な空 p を除去できず（残 ${placement.emptyBefore}）`);
      warned = true;
      continue;
    }
    console.log(`[swap] empty-p cleanup ${before}→${placement.emptyBefore}（probe=${allowedCount}）`);
  }
  if (placement.emptyBefore < allowedCount) {
    return { ok: false, reason: `バナー直前の空 p 数が probe と不一致（${placement.emptyBefore} != ${allowedCount}）` };
  }
  if (placement.emptyBefore > allowedCount && !warned) {
    console.log(`[WARN] 余分な空 p を除去できず（残 ${placement.emptyBefore}）`);
  }
  return { ok: true, placement };
}

async function uploadBannerAtCaret(page, banner, following, emptyBefore, prose = null, position = 'top') {
  if (prose) {
    const placed = await placeCaretAtP1Start(page, following, prose);
    if (!placed) return { ok: false, reason: 'P1 block 先頭へ Range を置けない' };
  }
  const upload = await uploadAtCaret(page, banner.abs);
  if (!upload.ok) return { ok: false, reason: `画像アップロード失敗: ${upload.reason}` };
  console.log(`[swap] upload ${banner.rel}（captionなし）`);

  const imageTarget = await countEditorImages(page);
  const settled = await settleUploads(page, imageTarget, Math.max(SETTLE_MIN_MS, SETTLE_PER_IMG_MS), '[swap-image]');
  if (!settled.ok) return { ok: false, reason: `画像の CDN 確定失敗 (${settled.confirmed}/${imageTarget})` };
  return cleanupExtraEmptyParagraphs(page, following, prose, emptyBefore, position);
}

async function verifyTopDom(page, following, prose) {
  const verified = await page.evaluate(({ target, paragraphs }) => {
    const editor = document.querySelector('[contenteditable=true]');
    const normalize = (value) => String(value || '').normalize('NFC').replace(/\s+/g, ' ').trim();
    const blocks = Array.from(editor?.querySelectorAll('p,h2,h3,li,blockquote') || []).filter((block) => !block.closest('figure'));
    const b = blocks.find((block) =>
      block.tagName.toLowerCase() === target.tag &&
      normalize(block.innerText || block.textContent) === normalize(target.text) &&
      block.previousElementSibling?.tagName === 'P' &&
      normalize(block.previousElementSibling.innerText || block.previousElementSibling.textContent) === normalize(paragraphs[1]) &&
      block.previousElementSibling?.previousElementSibling?.tagName === 'P' &&
      normalize(block.previousElementSibling.previousElementSibling.innerText || block.previousElementSibling.previousElementSibling.textContent) === normalize(paragraphs[0]),
    ) || null;
    const p2 = b?.previousElementSibling || null;
    const p1 = p2?.previousElementSibling || null;
    const figure = p1?.previousElementSibling || null;
    const domBlocks = [];
    let current = figure;
    for (let guard = 0; current && guard < 200; guard++) {
      const text = normalize(current.innerText || current.textContent);
      domBlocks.push({ tag: current.tagName.toLowerCase(), length: Array.from(text).length, text30: text.slice(0, 30) });
      if (current.tagName === 'H2') break;
      current = current.nextElementSibling;
    }
    return {
      ok: Boolean(
        figure?.tagName === 'FIGURE' && figure.nextElementSibling === p1 &&
        p1?.tagName === 'P' && normalize(p1.innerText || p1.textContent) === normalize(paragraphs[0]) &&
        p2?.tagName === 'P' && normalize(p2.innerText || p2.textContent) === normalize(paragraphs[1]) &&
        b?.tagName?.toLowerCase() === target.tag && normalize(b.innerText || b.textContent) === normalize(target.text),
      ),
      domBlocks,
    };
  }, { target: following, paragraphs: prose });
  console.log(`[dom] blocks=${JSON.stringify(verified.domBlocks)}`);
  return verified.ok
    ? { ok: true }
    : { ok: false, reason: '最終 DOM が figure → P1 → P2 → B（元 tag/text）の順ではない' };
}

async function inspectExistingTopProse(page, prose) {
  return page.evaluate((paragraphs) => {
    const editor = document.querySelector('[contenteditable=true]');
    const firstH2 = editor?.querySelector('h2') || null;
    const normalize = (value) => String(value || '').normalize('NFC').replace(/\s+/g, ' ').trim();
    const before = (left, right) => Boolean(left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING);
    const p1 = Array.from(editor?.querySelectorAll('p') || []).find((paragraph) =>
      !paragraph.closest('figure') &&
      normalize(paragraph.innerText || paragraph.textContent) === normalize(paragraphs[0]) &&
      (!firstH2 || before(paragraph, firstH2)) &&
      paragraph.nextElementSibling?.tagName === 'P' &&
      normalize(paragraph.nextElementSibling.innerText || paragraph.nextElementSibling.textContent) === normalize(paragraphs[1]),
    ) || null;
    const p2 = p1?.nextElementSibling || null;
    const following = p2?.nextElementSibling || null;
    let emptyParagraphsBefore = 0;
    let cursor = p1?.previousElementSibling || null;
    while (cursor?.tagName === 'P' && !normalize(cursor.innerText || cursor.textContent)) {
      emptyParagraphsBefore++;
      cursor = cursor.previousElementSibling;
    }
    const supportedFollowing = Boolean(
      following && !following.closest('figure') && following.matches('p,h2,h3'),
    );
    return {
      ok: Boolean(p1 && p2 && supportedFollowing),
      following: supportedFollowing ? {
        tag: following.tagName.toLowerCase(),
        text: normalize(following.innerText || following.textContent),
      } : null,
      emptyParagraphsBefore,
      actual: {
        p1: p1 ? normalize(p1.innerText || p1.textContent) : null,
        p2: p2 ? normalize(p2.innerText || p2.textContent) : null,
        nextTag: following?.tagName?.toLowerCase() || null,
        nextText: normalize(following?.innerText || following?.textContent),
      },
    };
  }, prose);
}

async function verifyPublishedBody(noteId, { requireNewProse = true } = {}) {
  const live = await fetchNoteBody(noteId);
  if (live.error) {
    console.log(`[5e] raw error=${JSON.stringify(live.error)} unmeasurable=${Boolean(live.unmeasurable)} httpStatus=${live.httpStatus ?? live.statusCode ?? 'n/a'}`);
    console.log('[5e] WARN: public API で本文を計測できない（有料マガジン同梱の無料記事等）→ エディタ側の最終 DOM 検証のみ');
    return { ok: true, unmeasurable: true };
  }
  if (live.unmeasurable || !live.body) {
    console.log('[5e] WARN: public API で本文を計測できない（有料マガジン同梱の無料記事等）→ エディタ側の最終 DOM 検証のみ');
    return { ok: true, unmeasurable: true };
  }
  if (requireNewProse && !live.body.includes(NEW_PROSE_PREFIX)) return { ok: false, reason: '公開本文に新しい著者説明がない' };
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
  const figuresBefore = await countEditorFigures(page);
  const probe = await probeBannerFigures(page);
  printProbe(article, probe, attachedBefore, figuresBefore);
  if (article.isMembership) {
    console.log('[NOTE] membership 記事: 有料境界は free と同様に扱い、既存の試し読みラインを動かさない');
  }
  const imageOnly = article.prose === null;
  if (imageOnly) {
    console.log(`[NOTE] image-only: ${FORCE_IMAGE_ONLY ? '--image-only 指定' : 'ローカル先頭バナー直後に標準 P1/P2 なし'} → 本文は変更しない`);
  }

  const dirtyDraftReason = 'エディタに未保存の下書き差分が残っている疑い（画像0・本文だけ新形式）→ note-update-body --commit で正規化してから再実行';
  if (probe.newTopCount > 1) {
    return { ok: false, reason: `new top figure が ${probe.newTopCount} 件ある（正しくは1件）` };
  }
  for (const target of probe.targets) {
    if (!target.nextTag || !target.nextFull) {
      return { ok: false, reason: `old figure[${target.index}] の後続 block B 全文を probe できない` };
    }
  }
  if (probe.mode === 'none') {
    if (!imageOnly && probe.hasNewProse && probe.newTopCount === 0) return { ok: false, reason: dirtyDraftReason };
    return { ok: false, reason: 'old/new バナーを位置＋画像比率から分類できない' };
  }

  const imageOnlyAlreadyDone = imageOnly && probe.oldCount === 0 && probe.newTopCount === 1;
  if (probe.mode === 'already-done' || imageOnlyAlreadyDone) {
    if (!article.isMembership) {
      const live = await verifyPublishedBody(article.noteId, { requireNewProse: !imageOnly });
      if (!live.ok) return { ok: false, reason: `already-done 公開 API 検証失敗: ${live.reason}` };
      console.log('[PROBE] already-done confirmed by editor DOM + public API');
    } else {
      console.log('[PROBE] already-done confirmed by editor DOM（membership は public API 計測不能）');
    }
    if (COMMIT) {
      if (recordPublishedHash(article.relativePath)) console.log(`[hash] ${article.relativePath} 再公開ハッシュ更新（already-done）`);
      else console.log(`[hash] WARN: ${article.relativePath} の再公開ハッシュを記録できない`);
      recordDone(article.noteId);
    }
    return { ok: true, dryRun: !COMMIT, alreadyDone: true };
  } else if (!COMMIT) {
    return { ok: true, dryRun: true };
  }

  const oldTop = probe.targets.filter((figure) => figure.pos === 'top').sort((left, right) => left.index - right.index);
  const oldBottom = probe.targets.filter((figure) => figure.pos === 'bottom').sort((left, right) => left.index - right.index);
  if (imageOnly && oldTop.length === 0 && probe.newTopCount === 0) {
    return { ok: false, reason: 'image-only: top の old/new figure がなく挿入位置を決められない' };
  }
  const targetsDescending = [...probe.targets].sort((left, right) => right.index - left.index);
  for (const target of targetsDescending) {
    const following = { tag: target.nextTag, text: target.nextFull };
    const deletion = await deleteFigureAtIndex(page, target.index, following);
    if (!deletion.ok) return { ok: false, reason: `figure[${target.index}] 削除失敗: ${deletion.reason}` };
    console.log(`[swap] old ${target.pos} figure[${target.index}] ${deletion.key}（${deletion.before}→${deletion.after}） B=present`);
  }

  let insertedCount = 0;
  let topFollowing = null;
  let topEmptyBaseline = oldTop[0]?.emptyParagraphsBefore ?? 0;
  if (imageOnly) {
    const topReference = oldTop.at(-1) || probe.newTop[0];
    topFollowing = topReference ? { tag: topReference.nextTag, text: topReference.nextFull } : null;
    if (!topFollowing?.tag || !topFollowing?.text) {
      return { ok: false, reason: 'image-only: old top figure の後続 block を特定できない' };
    }
    if (!['p', 'h2', 'h3'].includes(topFollowing.tag)) {
      return { ok: false, reason: `image-only: 後続 block の tag=${topFollowing.tag} は未対応（p/h2/h3 のみ）` };
    }
    if (probe.newTopCount === 0) {
      const placed = await placeCaretAtFollowingBlockStart(page, topFollowing);
      if (!placed) return { ok: false, reason: 'image-only: 後続 block 先頭へ Range を置けない' };
      const uploaded = await uploadBannerAtCaret(
        page,
        article.banners[0],
        topFollowing,
        topEmptyBaseline,
      );
      if (!uploaded.ok) return { ok: false, reason: `先頭バナー画像挿入失敗: ${uploaded.reason}` };
      insertedCount++;
    } else {
      console.log('[swap] image-only: new top figure は既存1件を維持（追加アップロードなし）');
    }
    const placement = await inspectUploadedBanner(page, topFollowing);
    if (!placement.ok) return { ok: false, reason: 'image-only: new top figure が元の後続 block の直前にない' };
  } else {
    if (probe.hasNewProse) {
      const existingProse = await inspectExistingTopProse(page, article.prose);
      if (!existingProse.ok) {
        console.log(`[diag] existing-prose=${JSON.stringify(existingProse.actual)}`);
        return { ok: false, reason: '本文あり判定だが top の p=P1 → p=P2 → B 構造を確認できない' };
      }
      topFollowing = existingProse.following;
      if (!oldTop.length) topEmptyBaseline = existingProse.emptyParagraphsBefore;
    } else {
      const topReference = oldTop.at(-1) || probe.newTop[0] || probe.firstH2;
      topFollowing = topReference ? {
        tag: topReference.nextTag || topReference.tag,
        text: topReference.nextFull || topReference.text,
      } : null;
      if (!oldTop.length) topEmptyBaseline = topReference?.emptyParagraphsBefore ?? 0;
      if (!topFollowing?.tag || !topFollowing?.text) {
        return { ok: false, reason: 'top prose 挿入位置 B を特定できない' };
      }
      if (!['p', 'h2', 'h3'].includes(topFollowing.tag)) {
        return { ok: false, reason: `top prose 挿入位置 B の tag=${topFollowing.tag} は未対応（p/h2/h3 のみ）` };
      }
      const placed = await placeCaretAtFollowingBlockStart(page, topFollowing);
      if (!placed) return { ok: false, reason: 'top prose 挿入位置 B の先頭へ Range を置けない' };
      const pasted = await pasteTopParagraphs(page, topFollowing, article.prose);
      if (!pasted.ok) return { ok: false, reason: `先頭バナー直後の本文挿入失敗: ${pasted.reason}` };
      console.log(pasted.mode === 'heading'
        ? `[swap] ${topFollowing.tag} start→Enter→ArrowUp→empty p→paste ${PASTE_SHORTCUT}: p=P1 / p=P2 / ${topFollowing.tag}=B`
        : `[swap] paste ${PASTE_SHORTCUT}: p=P1 / p=P2 / block=P2+B → leading P2 Delete → block=B`);
    }

    if (probe.newTopCount === 0) {
      const uploaded = await uploadBannerAtCaret(
        page,
        article.banners[0],
        topFollowing,
        topEmptyBaseline,
        article.prose,
      );
      if (!uploaded.ok) return { ok: false, reason: `先頭バナー画像挿入失敗: ${uploaded.reason}` };
      insertedCount++;
    } else {
      console.log('[swap] new top figure は既存1件を維持（追加アップロードなし）');
    }
    const topDom = await verifyTopDom(page, topFollowing, article.prose);
    if (!topDom.ok) return { ok: false, reason: `先頭バナー直後の最終検証失敗: ${topDom.reason}` };
  }

  if (oldBottom.length > 0) {
    if (!probe.bridge) return { ok: false, reason: 'old bottom figure はあるが bridge paragraph を再取得できない' };
    const placed = await placeCaretAtFollowingBlockStart(page, probe.bridge);
    if (!placed) return { ok: false, reason: 'bridge paragraph 先頭へ Range を置けない' };
    const bottomBanner = article.banners[1] || article.banners[0];
    const uploaded = await uploadBannerAtCaret(
      page,
      bottomBanner,
      probe.bridge,
      oldBottom[0].emptyParagraphsBefore,
      null,
      'bottom',
    );
    if (!uploaded.ok) return { ok: false, reason: `下部バナー画像挿入失敗: ${uploaded.reason}` };
    insertedCount++;
  } else {
    console.log('[swap] bottom: old figure なし → 変更なし（mirror, never add）');
  }

  const imgsAfterUpload = await countEditorImages(page);
  const settled = await settleUploads(
    page,
    imgsAfterUpload,
    Math.max(SETTLE_MIN_MS, Math.max(insertedCount, 1) * SETTLE_PER_IMG_MS),
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
  const figuresAfter = await countEditorFigures(page);
  const expectedFiguresAfter = figuresBefore - probe.oldCount + insertedCount;
  if (figuresAfter !== expectedFiguresAfter) {
    return {
      ok: false,
      reason: `figure 数が不正 ${figuresBefore} - old(${probe.oldCount}) + inserted(${insertedCount}) = ${expectedFiguresAfter}、実測 ${figuresAfter}。保存しない`,
    };
  }
  const finalProbe = await probeBannerFigures(page);
  if (finalProbe.oldCount !== 0 || finalProbe.newTopCount !== 1) {
    console.log(`[diag] final-classification=${JSON.stringify(finalProbe.figures.map((figure) => ({ index: figure.index, pos: figure.pos, ratio: figure.ratio, class: figure.class })))}`);
    return { ok: false, reason: `最終バナー分類が不正（old=${finalProbe.oldCount}, new-top=${finalProbe.newTopCount}）。保存しない` };
  }
  if (oldBottom.length > 0 && finalProbe.newBottomCount !== 1) {
    return { ok: false, reason: `最終 new bottom figure が ${finalProbe.newBottomCount} 件（正しくは1件）。保存しない` };
  }
  console.log(`[guard] attached ${attachedBefore.length}→${attachedAfter.length}, figures ${figuresBefore}→${figuresAfter} (old=${probe.oldCount}, inserted=${insertedCount}), final old=0 new-top=1`);

  const published = await publishLive(page, article.noteId, article.boundary, article.isPaid, {
    keepBoundary: false,
    trialLineBottom: false,
    screenshotPrefix: 'swap-banner',
  });
  if (!published) return { ok: false, reason: 'publishLive が失敗' };

  const verified = await verifyPublishedBody(article.noteId, { requireNewProse: !imageOnly });
  if (!verified.ok) return { ok: false, reason: `公開後検証失敗: ${verified.reason}` };
  if (!verified.unmeasurable) console.log('[verify] public API: 新本文あり / 旧キャプションなし');

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
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'https://editor.note.com' });
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
            const outcome = result.alreadyDone
              ? `already-done（skip${result.dryRun ? '・未変更' : '・hash記録'}）`
              : result.dryRun ? 'probe完了（未変更）' : 'バナー差替・公開後検証完了';
            console.log(`[OK] ${article.noteId} ${outcome}`);
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
