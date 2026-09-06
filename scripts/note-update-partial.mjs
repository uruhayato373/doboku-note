#!/usr/bin/env node
import { chromium } from 'playwright';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { resolveProfileDir } from './lib/playwright-auth-profile.mjs';
import { parseNoteArticle } from './lib/note-frontmatter.mjs';
import { publishLive } from './lib/note-live-publish.mjs';
import { countEditorImages, settleUploads, uploadAtCaret } from './lib/note-images.mjs';
import {
  validatePartialSpec,
  normalizeAttachmentSnapshot,
  sameAttachmentSnapshot,
} from './lib/note-partial-update.mjs';

/**
 * 公開済み note 記事の「指定した範囲だけ」を更新する。
 *
 * - dry-run は読み取りだけ。editor を変更しない（note の draft auto-save 汚染を防ぐ）。
 * - COMMIT でも select-all / 全文 paste を使わない。
 * - 全 operation を preflight し、対象件数がずれていれば本文を触らない。
 * - 更新前・更新直後・公開後再読の3点で PDF 添付 URL/ファイル名の完全一致を要求する。
 * - 有料記事は既存境界を動かさず、境界 line の存在を確認してから更新する。
 *
 * npm run note-update-partial -- --spec .tmp/note-partial/example.json
 * npm run note-update-partial -- --spec .tmp/note-partial/example.json --commit
 * npm run note-update-partial -- --list .tmp/note-partial/specs.list.txt --commit
 */

const ROOT = process.cwd();
const PROFILE = resolveProfileDir('note', { cwd: ROOT, repoRoot: ROOT });
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
const argv = process.argv.slice(2);
const getArg = (name) => { const index = argv.indexOf(name); return index >= 0 ? argv[index + 1] : null; };
const SPEC_ARG = getArg('--spec');
const LIST_ARG = getArg('--list');
const LIMIT = Number.parseInt(getArg('--limit') || '0', 10);
const START = Number.parseInt(getArg('--start') || '1', 10);
const COMMIT = argv.includes('--commit');
if ((!SPEC_ARG && !LIST_ARG) || (SPEC_ARG && LIST_ARG)) {
  console.error('required: exactly one of --spec <path.json> / --list <path.txt> [--start N] [--limit N] [--commit]');
  process.exit(1);
}
if (!Number.isInteger(LIMIT) || LIMIT < 0) throw new Error('--limit は0以上の整数');
if (!Number.isInteger(START) || START < 1) throw new Error('--start は1以上の整数');

const listedSpecs = LIST_ARG
  ? readFileSync(resolve(ROOT, LIST_ARG), 'utf8').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  : [SPEC_ARG];
const remainingSpecs = listedSpecs.slice(START - 1);
const specArgs = LIMIT > 0 ? remainingSpecs.slice(0, LIMIT) : remainingSpecs;
if (specArgs.length === 0) throw new Error('spec list が空');

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const expected = (op) => op.expected ?? 1;
const shot = (name, noteId) => join(ROOT, `.tmp/note-partial-${name}-${noteId}.png`);
mkdirSync(join(ROOT, '.tmp'), { recursive: true });

async function attachmentSnapshot(page) {
  return normalizeAttachmentSnapshot(await page.evaluate(() => {
    const ed = document.querySelector('[contenteditable=true]');
    const hrefs = [...(ed?.querySelectorAll('a[href*="api/v2/attachments/download"]') || [])]
      .map((a) => a.href);
    const names = ((ed?.innerText || '').match(/[^\n]+\.pdf/gi) || []).map((name) => name.trim());
    return { hrefs, names };
  }));
}

async function editorState(page) {
  return page.evaluate(() => {
    const ed = document.querySelector('[contenteditable=true]');
    return { chars: (ed?.innerText || '').length, text: ed?.innerText || '', html: ed?.innerHTML || '' };
  });
}

async function verifyLiveApi(noteId, spec) {
  const response = await fetch(`https://note.com/api/v3/notes/${noteId}`);
  if (!response.ok) throw new Error(`live API HTTP ${response.status}`);
  const payload = await response.json();
  const body = payload?.data?.body || '';
  const failures = [];
  for (const [index, op] of spec.operations.entries()) {
    if (op.type === 'replaceText' && (body.includes(op.old) || !body.includes(op.new))) failures.push(`${index}:replaceText`);
  }
  for (const probe of (spec.verify?.includes || [])) if (!body.includes(probe)) failures.push(`include:${probe}`);
  for (const probe of (spec.verify?.excludes || [])) if (body.includes(probe)) failures.push(`exclude:${probe}`);
  return { ok: failures.length === 0, failures, chars: body.length };
}

async function openEditor(page, noteId, { attempts = 3 } = {}) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await page.goto(`https://editor.note.com/notes/${noteId}/edit`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('[contenteditable=true]', { timeout: 30000 });
      await sleep(1800);
      return;
    } catch (error) {
      lastError = error;
      console.warn(`[editor] load retry ${attempt}/${attempts}: ${String(error?.message || error).split('\n')[0]}`);
      await page.screenshot({ path: shot(`load-retry-${attempt}`, noteId) }).catch(() => {});
      await sleep(2000);
    }
  }
  throw new Error(`editor を${attempts}回開けない: ${String(lastError?.message || lastError).split('\n')[0]}`);
}

async function preflight(page, op) {
  return page.evaluate((operation) => {
    const ed = document.querySelector('[contenteditable=true]');
    if (!ed) return { count: 0, reason: 'no-editor' };
    const textNodes = () => {
      const nodes = [];
      const walker = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) nodes.push(node);
      return nodes;
    };
    const blockFor = (element) => {
      let current = element?.nodeType === Node.TEXT_NODE ? element.parentElement : element;
      while (current?.parentElement && current.parentElement !== ed) current = current.parentElement;
      return current?.parentElement === ed ? current : null;
    };
    if (operation.type === 'replaceText') {
      let count = 0;
      let newCount = 0;
      for (const node of textNodes()) {
        let from = 0;
        while (node.nodeValue && (from = node.nodeValue.indexOf(operation.old, from)) >= 0) {
          count++; from += operation.old.length;
        }
        from = 0;
        while (node.nodeValue && (from = node.nodeValue.indexOf(operation.new, from)) >= 0) {
          newCount++; from += operation.new.length;
        }
      }
      return { count, already: count === 0 && newCount >= (operation.expected ?? 1) };
    }
    if (operation.type === 'replaceTopCta') {
      const start = [...ed.children].filter((child) => (child.innerText || '').includes(operation.oldStart));
      const followingH2 = start.length === 1
        ? [...ed.querySelectorAll('h2')].find((h) => start[0].compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING)
        : null;
      const newKeys = operation.newUrls.map((url) => (url.match(/\/[mn]\/([0-9a-z]+)/) || [])[1] || url);
      const already = start.length === 0 && (operation.newText === ''
        ? true
        : (ed.innerText || '').includes(operation.probe) && newKeys.every((key) => (ed.innerHTML || '').includes(key)));
      if (already) return { count: 0, already: true };
      if (start.length !== 1 || !followingH2) {
        return { count: 0, reason: `top-range:${start.length}/${Boolean(followingH2)}` };
      }
      const rangeNodes = [];
      let node = start[0];
      while (node && node !== followingH2) { rangeNodes.push(node); node = node.nextElementSibling; }
      const hasAttachment = rangeNodes.some((item) => item.querySelector?.('a[href*="api/v2/attachments/download"]'));
      return { count: hasAttachment ? 0 : 1, reason: hasAttachment ? 'attachment-in-range' : undefined, blocks: rangeNodes.length };
    }
    if (operation.type === 'insertTopCta') {
      const newKeys = operation.newUrls.map((url) => (url.match(/\/[mn]\/([0-9a-z]+)/) || [])[1] || url);
      const already = (ed.innerText || '').includes(operation.probe) && newKeys.every((key) => (ed.innerHTML || '').includes(key));
      return { count: already ? 0 : (ed.querySelector('h2') ? 1 : 0), already, reason: ed.querySelector('h2') ? undefined : 'no-h2' };
    }
    if (operation.type === 'replaceCard' || operation.type === 'replaceLink') {
      let count;
      if (operation.type === 'replaceCard') {
        const blocks = new Set([...ed.querySelectorAll(`a[href*="${CSS.escape(operation.oldKey)}"]`)]
          .map((link) => blockFor(link)).filter(Boolean));
        count = blocks.size;
      } else {
        count = ed.querySelectorAll(`a[href*="${CSS.escape(operation.oldKey)}"]`).length;
      }
      const newKey = (operation.newUrl.match(/\/[mn]\/([0-9a-z]+)/) || [])[1] || operation.newUrl;
      return { count, already: count === 0 && (ed.innerHTML || '').includes(newKey) };
    }
    if (operation.type === 'removeBlock') {
      const blocks = new Set();
      for (const node of textNodes()) if ((node.nodeValue || '').includes(operation.needle)) {
        const block = blockFor(node);
        if (block && (!operation.selector || block.matches(operation.selector))) blocks.add(block);
      }
      for (const link of ed.querySelectorAll('a')) if ((link.href || '').includes(operation.needle)) {
        const block = blockFor(link);
        if (block && (!operation.selector || block.matches(operation.selector))) blocks.add(block);
      }
      return { count: blocks.size, already: blocks.size === 0 };
    }
    if (operation.type === 'insertAfter') {
      const present = (ed.innerText || '').includes(operation.probe) || (ed.innerHTML || '').includes(operation.probe);
      const blocks = [...ed.children].filter((child) =>
        (child.innerText || '').includes(operation.anchor) || (child.innerHTML || '').includes(operation.anchor));
      return { count: present ? 0 : blocks.length, already: present };
    }
    if (operation.type === 'insertListItems') {
      const anchor = ed.querySelector(`a[href*="${CSS.escape(operation.anchorKey)}"]`);
      const ul = anchor?.closest('ul');
      if (!ul) return { count: 0, reason: 'no-list-anchor' };
      const missing = operation.items.filter((item) => !(ul.innerHTML || '').includes((item.url.match(/\/[mn]\/([0-9a-z]+)/) || [])[1] || item.url));
      return { count: missing.length ? 1 : 0, already: missing.length === 0, missing: missing.length };
    }
    if (operation.type === 'moveSectionBefore') {
      const headings = [...ed.querySelectorAll('h2')];
      const from = headings.filter((h) => (h.innerText || '').trim().includes(operation.heading));
      const to = headings.filter((h) => (h.innerText || '').trim().includes(operation.beforeHeading));
      if (from.length !== 1 || to.length !== 1) return { count: 0, reason: `heading-count:${from.length}/${to.length}` };
      const fromIndex = headings.indexOf(from[0]);
      const toIndex = headings.indexOf(to[0]);
      const already = fromIndex + 1 === toIndex;
      return { count: already ? 0 : 1, already };
    }
    if (operation.type === 'replaceSectionHtml') {
      const headings = [...ed.querySelectorAll('h2')];
      const from = headings.filter((h) => (h.innerText || '').trim().includes(operation.startHeading));
      const to = headings.filter((h) => (h.innerText || '').trim().includes(operation.endHeading));
      const already = (ed.innerText || '').includes(operation.probe)
        && (!operation.oldProbe || !(ed.innerText || '').includes(operation.oldProbe));
      if (already) return { count: 0, already: true };
      if (from.length !== 1 || to.length !== 1 || !(from[0].compareDocumentPosition(to[0]) & Node.DOCUMENT_POSITION_FOLLOWING)) {
        return { count: 0, reason: `section-headings:${from.length}/${to.length}` };
      }
      const nodes = [];
      let node = from[0];
      while (node && node !== to[0]) { nodes.push(node); node = node.nextElementSibling; }
      const hasAttachment = nodes.some((item) => item.querySelector?.('a[href*="api/v2/attachments/download"]'));
      return { count: hasAttachment ? 0 : 1, reason: hasAttachment ? 'attachment-in-section' : undefined, blocks: nodes.length };
    }
    if (operation.type === 'replaceElementHtml') {
      const candidates = [...ed.querySelectorAll(operation.selector)]
        .filter((element) => (element.innerText || '').includes(operation.oldProbe));
      const probePresent = (ed.innerText || '').includes(operation.probe) || (ed.innerHTML || '').includes(operation.probe);
      const already = probePresent && (operation.keepOldProbe || candidates.length === 0);
      const hasAttachment = candidates.some((element) => element.querySelector?.('a[href*="api/v2/attachments/download"]'));
      return {
        count: already || hasAttachment ? 0 : candidates.length,
        already,
        reason: hasAttachment ? 'attachment-in-element' : undefined,
      };
    }
    if (operation.type === 'moveBlockGroupBefore') {
      const children = [...ed.children];
      const from = children.filter((element) => (!operation.fromSelector || element.matches(operation.fromSelector))
        && (element.innerText || '').includes(operation.fromNeedle));
      const to = children.filter((element) => (!operation.beforeSelector || element.matches(operation.beforeSelector))
        && (element.innerText || '').includes(operation.beforeNeedle));
      if (from.length !== 1 || to.length !== 1) return { count: 0, reason: `block-count:${from.length}/${to.length}` };
      const fromIndex = children.indexOf(from[0]);
      const toIndex = children.indexOf(to[0]);
      const nodes = children.slice(fromIndex, fromIndex + operation.blocks);
      if (nodes.length !== operation.blocks || nodes.includes(to[0])) return { count: 0, reason: 'invalid-block-range' };
      const hasAttachment = nodes.some((element) => element.querySelector?.('a[href*="api/v2/attachments/download"]'));
      const already = fromIndex + operation.blocks === toIndex;
      return { count: already || hasAttachment ? 0 : 1, already, reason: hasAttachment ? 'attachment-in-block-group' : undefined };
    }
    if (operation.type === 'insertBeforeHeadingHtml') {
      const already = (ed.innerText || '').includes(operation.probe) || (ed.innerHTML || '').includes(operation.probe);
      const headings = [...ed.querySelectorAll('h2')]
        .filter((heading) => (heading.innerText || '').trim().includes(operation.beforeHeading));
      return { count: already ? 0 : headings.length, already, reason: headings.length === 1 ? undefined : `heading-count:${headings.length}` };
    }
    if (operation.type === 'replaceImage') {
      const imageFigures = [...ed.querySelectorAll('figure')].filter((figure) => figure.querySelector('img'));
      if (imageFigures.length !== operation.expectedImages) {
        return { count: 0, reason: `image-count:${imageFigures.length}/${operation.expectedImages}` };
      }
      const figure = imageFigures[operation.imageIndex];
      if (!figure) return { count: 0, reason: `image-index:${operation.imageIndex}` };
      const src = figure.querySelector('img')?.src || '';
      if (!src.includes(operation.oldSrcKey)) return { count: 0, already: true };
      let following = figure.nextElementSibling;
      while (following && !(following.innerText || '').includes(operation.followingProbe)) following = following.nextElementSibling;
      return { count: following ? 1 : 0, reason: following ? undefined : 'following-probe-not-found' };
    }
    return { count: 0, reason: 'unsupported' };
  }, op);
}

async function selectText(page, oldText) {
  return page.evaluate((needle) => {
    const ed = document.querySelector('[contenteditable=true]');
    const walker = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const offset = node.nodeValue?.indexOf(needle) ?? -1;
      if (offset < 0) continue;
      const range = document.createRange();
      range.setStart(node, offset); range.setEnd(node, offset + needle.length);
      const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
      return true;
    }
    return false;
  }, oldText);
}

async function applyOperation(page, op) {
  if (op.type === 'replaceText') {
    for (let i = 0; i < expected(op); i++) {
      if (!(await selectText(page, op.old))) return false;
      // Selection replacement must be one editor transaction. Splitting it into
      // Delete + type lets note's autosave re-render between the two events and
      // can collapse the DOM selection to only part of the target text.
      await page.keyboard.insertText(op.new);
    }
    return true;
  }
  if (op.type === 'replaceTopCta') {
    const removed = await page.evaluate((operation) => {
      const ed = document.querySelector('[contenteditable=true]');
      const start = [...ed.children].find((child) => (child.innerText || '').includes(operation.oldStart));
      const headings = [...ed.querySelectorAll('h2')];
      const followingH2 = headings.find((h) => start && (start.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING));
      if (!start || !followingH2) return { count: 0, headingIndex: -1 };
      const nodes = [];
      let node = start;
      while (node && node !== followingH2) {
        if (node.querySelector?.('a[href*="api/v2/attachments/download"]')) return { count: -1, headingIndex: -1 };
        nodes.push(node);
        node = node.nextElementSibling;
      }
      for (const item of nodes) item.remove();
      ed.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentForward' }));
      return { count: nodes.length, headingIndex: headings.indexOf(followingH2) };
    }, op);
    if (removed.count <= 0) return false;
    await sleep(500);
    if (!op.newText && op.newUrls.length === 0) return true;
    const placed = await page.evaluate((headingIndex) => {
      const ed = document.querySelector('[contenteditable=true]');
      const targetH2 = ed.querySelectorAll('h2')[headingIndex];
      if (!targetH2) return false;
      const range = document.createRange(); range.setStartBefore(targetH2); range.collapse(true);
      const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
      return true;
    }, removed.headingIndex);
    if (!placed) return false;
    await page.keyboard.press('Enter');
    if (op.newText) await page.keyboard.type(op.newText, { delay: 2 });
    for (const url of op.newUrls) {
      await page.keyboard.press('Enter');
      await page.keyboard.type(url, { delay: 3 });
      await page.keyboard.press('Enter'); await sleep(3500);
    }
    return true;
  }
  if (op.type === 'insertTopCta') {
    const placed = await page.evaluate(() => {
      const ed = document.querySelector('[contenteditable=true]');
      const firstH2 = ed.querySelector('h2');
      if (!firstH2) return false;
      const range = document.createRange(); range.setStartBefore(firstH2); range.collapse(true);
      const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
      return true;
    });
    if (!placed) return false;
    await page.keyboard.press('Enter');
    await page.keyboard.type(op.newText, { delay: 2 });
    for (const url of op.newUrls) {
      await page.keyboard.press('Enter');
      await page.keyboard.type(url, { delay: 3 });
      await page.keyboard.press('Enter'); await sleep(3500);
    }
    return true;
  }
  if (op.type === 'replaceCard') {
    for (let i = 0; i < expected(op); i++) {
      const removed = await page.evaluate((oldKey) => {
        const ed = document.querySelector('[contenteditable=true]');
        const links = [...ed.querySelectorAll(`a[href*="${CSS.escape(oldKey)}"]`)];
        const blocks = [...new Set(links.map((link) => {
          let current = link;
          while (current?.parentElement && current.parentElement !== ed) current = current.parentElement;
          return current?.parentElement === ed ? current : null;
        }).filter(Boolean))];
        if (blocks.length !== 1 || blocks[0].querySelector?.('a[href*="api/v2/attachments/download"]')) return false;
        const next = blocks[0].nextElementSibling;
        blocks[0].remove();
        const range = document.createRange();
        if (next?.isConnected) range.setStartBefore(next);
        else range.setStart(ed, ed.childNodes.length);
        range.collapse(true);
        const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
        ed.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentForward' }));
        return true;
      }, op.oldKey);
      if (!removed) return false;
      await page.keyboard.type(op.newUrl, { delay: 4 });
      await page.keyboard.press('Enter'); await sleep(3500);
    }
    return true;
  }
  if (op.type === 'replaceLink') {
    return page.evaluate((operation) => {
      const ed = document.querySelector('[contenteditable=true]');
      const links = [...ed.querySelectorAll(`a[href*="${CSS.escape(operation.oldKey)}"]`)];
      if (links.length !== (operation.expected ?? 1)) return false;
      for (const link of links) {
        link.setAttribute('href', operation.newUrl);
        if (operation.newText) link.textContent = operation.newText;
      }
      ed.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
      return true;
    }, op);
  }
  if (op.type === 'removeBlock') {
    return page.evaluate((operation) => {
      const ed = document.querySelector('[contenteditable=true]');
      const candidates = [...ed.children].filter((child) =>
        (!operation.selector || child.matches(operation.selector))
        && ((child.innerText || '').includes(operation.needle) || (child.innerHTML || '').includes(operation.needle)));
      if (candidates.length !== (operation.expected ?? 1)) return false;
      if (candidates.some((child) => child.querySelector?.('a[href*="api/v2/attachments/download"]'))) return false;
      for (const child of candidates) child.remove();
      ed.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentForward' }));
      return true;
    }, op);
  }
  if (op.type === 'insertAfter') {
    const placed = await page.evaluate((operation) => {
      const ed = document.querySelector('[contenteditable=true]');
      const child = [...ed.children].find((el) =>
        (el.innerText || '').includes(operation.anchor) || (el.innerHTML || '').includes(operation.anchor));
      if (!child) return false;
      const range = document.createRange(); range.setStartAfter(child); range.collapse(true);
      const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
      return true;
    }, op);
    if (!placed) return false;
    for (const line of op.lines) {
      await page.keyboard.press('Enter');
      if (line) await page.keyboard.type(line, { delay: 3 });
      if (/^https:\/\//.test(line)) await sleep(3500);
    }
    await page.keyboard.press('Enter');
    return true;
  }
  if (op.type === 'insertListItems') {
    return page.evaluate((operation) => {
      const ed = document.querySelector('[contenteditable=true]');
      const anchor = ed.querySelector(`a[href*="${CSS.escape(operation.anchorKey)}"]`);
      const ul = anchor?.closest('ul');
      if (!ul) return false;
      const anchorLi = anchor.closest('li');
      let last = ul.querySelector('li:last-child');
      for (const item of operation.items) {
        const key = (item.url.match(/\/[mn]\/([0-9a-z]+)/) || [])[1] || item.url;
        if ((ul.innerHTML || '').includes(key)) continue;
        const li = document.createElement('li');
        const p = document.createElement('p');
        const a = document.createElement('a'); a.href = item.url; a.textContent = item.title;
        p.append(a, document.createTextNode(item.desc || ''));
        li.append(p);
        if (operation.position === 'before') ul.insertBefore(li, anchorLi);
        else { last.insertAdjacentElement('afterend', li); last = li; }
      }
      ed.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
      return true;
    }, op);
  }
  if (op.type === 'moveSectionBefore') {
    return page.evaluate((operation) => {
      const ed = document.querySelector('[contenteditable=true]');
      const headings = [...ed.querySelectorAll('h2')];
      const from = headings.find((h) => (h.innerText || '').trim().includes(operation.heading));
      const to = headings.find((h) => (h.innerText || '').trim().includes(operation.beforeHeading));
      if (!from || !to) return false;
      const nodes = [];
      let node = from;
      while (node && (node === from || node.tagName !== 'H2')) { const next = node.nextElementSibling; nodes.push(node); node = next; }
      for (const item of nodes) ed.insertBefore(item, to);
      ed.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
      return true;
    }, op);
  }
  if (op.type === 'replaceSectionHtml') {
    return page.evaluate((operation) => {
      const ed = document.querySelector('[contenteditable=true]');
      const headings = [...ed.querySelectorAll('h2')];
      const from = headings.find((h) => (h.innerText || '').trim().includes(operation.startHeading));
      const to = headings.find((h) => (h.innerText || '').trim().includes(operation.endHeading));
      if (!from || !to) return false;
      const nodes = [];
      let node = from;
      while (node && node !== to) {
        if (node.querySelector?.('a[href*="api/v2/attachments/download"]')) return false;
        nodes.push(node); node = node.nextElementSibling;
      }
      if (!nodes.length || node !== to) return false;
      const template = document.createElement('template'); template.innerHTML = operation.html;
      const allowed = new Set(['H2', 'H3', 'P', 'UL', 'OL', 'LI', 'A', 'STRONG', 'EM', 'BR', 'BLOCKQUOTE', 'HR']);
      for (const element of template.content.querySelectorAll('*')) {
        if (!allowed.has(element.tagName)) return false;
        for (const attribute of [...element.attributes]) {
          if (!(element.tagName === 'A' && ['href', 'target', 'rel'].includes(attribute.name))) return false;
        }
      }
      for (const item of nodes) item.remove();
      to.insertAdjacentHTML('beforebegin', operation.html);
      ed.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
      return true;
    }, op);
  }
  if (op.type === 'replaceElementHtml') {
    return page.evaluate((operation) => {
      const ed = document.querySelector('[contenteditable=true]');
      const candidates = [...ed.querySelectorAll(operation.selector)]
        .filter((element) => (element.innerText || '').includes(operation.oldProbe));
      if (candidates.length !== (operation.expected ?? 1)) return false;
      const template = document.createElement('template'); template.innerHTML = operation.html;
      const allowed = new Set(['P', 'UL', 'OL', 'LI', 'A', 'STRONG', 'EM', 'BR', 'BLOCKQUOTE', 'HR']);
      for (const element of template.content.querySelectorAll('*')) {
        if (!allowed.has(element.tagName)) return false;
        for (const attribute of [...element.attributes]) {
          if (!(element.tagName === 'A' && ['href', 'target', 'rel'].includes(attribute.name))) return false;
        }
      }
      for (const candidate of candidates) candidate.innerHTML = operation.html;
      ed.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
      return true;
    }, op);
  }
  if (op.type === 'moveBlockGroupBefore') {
    return page.evaluate((operation) => {
      const ed = document.querySelector('[contenteditable=true]');
      const children = [...ed.children];
      const from = children.filter((element) => (!operation.fromSelector || element.matches(operation.fromSelector))
        && (element.innerText || '').includes(operation.fromNeedle));
      const to = children.filter((element) => (!operation.beforeSelector || element.matches(operation.beforeSelector))
        && (element.innerText || '').includes(operation.beforeNeedle));
      if (from.length !== 1 || to.length !== 1) return false;
      const fromIndex = children.indexOf(from[0]);
      const nodes = children.slice(fromIndex, fromIndex + operation.blocks);
      if (nodes.length !== operation.blocks || nodes.includes(to[0])) return false;
      if (nodes.some((element) => element.querySelector?.('a[href*="api/v2/attachments/download"]'))) return false;
      for (const node of nodes) ed.insertBefore(node, to[0]);
      ed.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
      return true;
    }, op);
  }
  if (op.type === 'insertBeforeHeadingHtml') {
    return page.evaluate((operation) => {
      const ed = document.querySelector('[contenteditable=true]');
      const headings = [...ed.querySelectorAll('h2')]
        .filter((heading) => (heading.innerText || '').trim().includes(operation.beforeHeading));
      if (headings.length !== 1) return false;
      const template = document.createElement('template'); template.innerHTML = operation.html;
      const allowed = new Set(['H2', 'H3', 'P', 'UL', 'OL', 'LI', 'A', 'STRONG', 'EM', 'BR', 'BLOCKQUOTE', 'HR']);
      for (const element of template.content.querySelectorAll('*')) {
        if (!allowed.has(element.tagName)) return false;
        for (const attribute of [...element.attributes]) {
          if (!(element.tagName === 'A' && ['href', 'target', 'rel'].includes(attribute.name))) return false;
        }
      }
      headings[0].insertAdjacentHTML('beforebegin', operation.html);
      ed.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
      return true;
    }, op);
  }
  if (op.type === 'replaceImage') {
    const file = resolve(ROOT, op.file);
    if (!file.startsWith(ROOT + '/') || !existsSync(file)) return false;
    const beforeSrcs = await page.evaluate(() => [...document.querySelectorAll('[contenteditable=true] img')].map((image) => image.src));
    const beforeImages = beforeSrcs.length;
    if (beforeImages !== op.expectedImages) {
      console.log(`[partial-image] 既存画像数NG: ${beforeImages}/${op.expectedImages}`);
      return false;
    }
    const placed = await page.evaluate((operation) => {
      const ed = document.querySelector('[contenteditable=true]');
      const imageFigures = [...ed.querySelectorAll('figure')].filter((figure) => figure.querySelector('img'));
      const oldFigure = imageFigures[operation.imageIndex];
      if (!oldFigure || !(oldFigure.querySelector('img')?.src || '').includes(operation.oldSrcKey)) return false;
      let following = oldFigure.nextElementSibling;
      while (following && !(following.innerText || '').includes(operation.followingProbe)) following = following.nextElementSibling;
      if (!following) return false;
      // The figure can be followed by a blockquote. note's ＋→画像 action is
      // a no-op when the caret lives inside that quote, so use the next ordinary
      // top-level text block as a temporary upload anchor.
      let uploadAnchor = following;
      while (uploadAnchor && !['P', 'H2', 'H3'].includes(uploadAnchor.tagName)) uploadAnchor = uploadAnchor.nextElementSibling;
      if (!uploadAnchor) return false;
      const walker = document.createTreeWalker(uploadAnchor, NodeFilter.SHOW_TEXT);
      const firstText = walker.nextNode();
      const range = document.createRange();
      if (firstText) range.setStart(firstText, 0);
      else range.setStart(uploadAnchor, 0);
      range.collapse(true);
      ed.focus();
      const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
      uploadAnchor.scrollIntoView({ block: 'center' });
      return true;
    }, op);
    if (!placed) {
      console.log('[partial-image] 挿入位置を特定できません');
      return false;
    }
    const uploadMs = Number(process.env.NOTE_IMG_UPLOAD_MS || 90000);
    const uploaded = await uploadAtCaret(page, file, { uploadMs, acceptSrcChange: true });
    if (!uploaded.ok) {
      const diagnostic = await page.evaluate(() => ({
        images: [...document.querySelectorAll('[contenteditable=true] img')].map((image) => image.src),
        dialogs: [...document.querySelectorAll('[role="dialog"]')].map((item) => (item.innerText || '').trim().slice(0, 300)),
        alerts: [...document.querySelectorAll('[role="alert"]')].map((item) => (item.innerText || '').trim().slice(0, 300)),
        fileInputs: [...document.querySelectorAll('input[type="file"]')].map((input) => ({ accept: input.accept, files: input.files?.length || 0 })),
      }));
      await page.screenshot({ path: shot('image-upload-failed', 'replace-image') });
      console.log(`[partial-image] アップロード失敗: ${uploaded.reason || 'unknown'}`);
      console.log(`[partial-image] diagnostic=${JSON.stringify(diagnostic)}`);
      return false;
    }
    console.log(`[partial-image] upload mode=${uploaded.mode || 'unknown'}`);
    const settleTarget = uploaded.mode === 'replace' ? beforeImages : beforeImages + 1;
    const settled = await settleUploads(page, settleTarget, 90000, '[partial-image]');
    if (!settled.ok) return false;

    const swapped = await page.evaluate(({ operation, originalSrcs }) => {
      const ed = document.querySelector('[contenteditable=true]');
      const imageFigures = [...ed.querySelectorAll('figure')].filter((figure) => figure.querySelector('img'));
      const oldFigure = imageFigures.find((figure) => (figure.querySelector('img')?.src || '').includes(operation.oldSrcKey));
      const newFigures = imageFigures.filter((figure) => !originalSrcs.includes(figure.querySelector('img')?.src || ''));
      if (newFigures.length !== 1) return false;
      const newFigure = newFigures[0].parentElement === ed ? newFigures[0] : null;
      if (!newFigure) return false;
      // The note UI may either insert a second figure or replace the selected
      // figure in place. Both are safe when the new source is unique.
      if (oldFigure) ed.insertBefore(newFigure, oldFigure);
      let following = (oldFigure || newFigure).nextElementSibling;
      while (following && !(following.innerText || '').includes(operation.followingProbe)) {
        if ((following.innerText || '').trim()) return false;
        following = following.nextElementSibling;
      }
      if (!following) return false;
      if (oldFigure) oldFigure.remove();
      ed.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentForward' }));
      return true;
    }, { operation: op, originalSrcs: beforeSrcs });
    if (!swapped) {
      const layout = await page.evaluate(() => {
        const ed = document.querySelector('[contenteditable=true]');
        return [...ed.children].map((element, index) => ({
          index,
          tag: element.tagName,
          image: element.querySelector?.('img')?.src || '',
          text: (element.innerText || '').trim().slice(0, 40),
        })).filter((item) => item.image || item.text.includes('図の見方'));
      });
      console.log(`[partial-image] 交換配置NG: ${JSON.stringify(layout)}`);
      await page.evaluate((originalSrcs) => {
        const ed = document.querySelector('[contenteditable=true]');
        const originalStillPresent = [...ed.querySelectorAll('figure img')]
          .some((image) => originalSrcs.includes(image.src || ''));
        if (!originalStillPresent) return;
        for (const figure of [...ed.querySelectorAll('figure')].filter((item) => item.querySelector('img'))) {
          if (!originalSrcs.includes(figure.querySelector('img')?.src || '')) figure.remove();
        }
        ed.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentForward' }));
      }, beforeSrcs);
      return false;
    }
    const finalCount = await countEditorImages(page);
    if (finalCount !== op.expectedImages) console.log(`[partial-image] 交換後画像数NG: ${finalCount}/${op.expectedImages}`);
    return finalCount === op.expectedImages;
  }
  return false;
}

async function verifyOperations(page, spec) {
  return page.evaluate(({ operations, verify }) => {
    const ed = document.querySelector('[contenteditable=true]');
    const text = ed?.innerText || '';
    const html = ed?.innerHTML || '';
    const failures = [];
    for (const [index, op] of operations.entries()) {
      if (op.type === 'replaceText' && (text.includes(op.old) || !text.includes(op.new))) failures.push(`${index}:replaceText`);
      if (op.type === 'replaceTopCta') {
        if (text.includes(op.oldStart)) failures.push(`${index}:replaceTopCta:old`);
        if (op.newText && !text.includes(op.probe)) failures.push(`${index}:replaceTopCta:probe`);
        for (const url of op.newUrls) {
          const key = (url.match(/\/[mn]\/([0-9a-z]+)/) || [])[1] || url;
          if (!html.includes(key)) failures.push(`${index}:replaceTopCta:${key}`);
        }
      }
      if (op.type === 'insertTopCta') {
        if (!text.includes(op.probe)) failures.push(`${index}:insertTopCta:probe`);
        for (const url of op.newUrls) {
          const key = (url.match(/\/[mn]\/([0-9a-z]+)/) || [])[1] || url;
          if (!html.includes(key)) failures.push(`${index}:insertTopCta:${key}`);
        }
      }
      if ((op.type === 'replaceCard' || op.type === 'replaceLink') && (html.includes(op.oldKey) || !html.includes((op.newUrl.match(/\/[mn]\/([0-9a-z]+)/) || [])[1] || op.newUrl))) failures.push(`${index}:${op.type}`);
      if (op.type === 'removeBlock' && (text.includes(op.needle) || html.includes(op.needle))) failures.push(`${index}:removeBlock`);
      if (op.type === 'insertAfter' && !(text.includes(op.probe) || html.includes(op.probe))) failures.push(`${index}:insertAfter`);
      if (op.type === 'insertListItems') for (const item of op.items) {
        const key = (item.url.match(/\/[mn]\/([0-9a-z]+)/) || [])[1] || item.url;
        if (!html.includes(key)) failures.push(`${index}:insertListItems:${key}`);
      }
      if (op.type === 'moveSectionBefore') {
        const headings = [...ed.querySelectorAll('h2')];
        const from = headings.findIndex((h) => (h.innerText || '').trim().includes(op.heading));
        const to = headings.findIndex((h) => (h.innerText || '').trim().includes(op.beforeHeading));
        if (from < 0 || to < 0 || from + 1 !== to) failures.push(`${index}:moveSectionBefore`);
      }
      if (op.type === 'replaceSectionHtml') {
        if (!text.includes(op.probe)) failures.push(`${index}:replaceSectionHtml:probe`);
        if (op.oldProbe && text.includes(op.oldProbe)) failures.push(`${index}:replaceSectionHtml:oldProbe`);
      }
      if (op.type === 'replaceElementHtml') {
        if (!text.includes(op.probe) && !html.includes(op.probe)) failures.push(`${index}:replaceElementHtml:probe`);
        if (!op.keepOldProbe) {
          const oldElements = [...ed.querySelectorAll(op.selector)]
            .filter((element) => (element.innerText || '').includes(op.oldProbe));
          if (oldElements.length) failures.push(`${index}:replaceElementHtml:oldProbe:${oldElements.length}`);
        }
      }
      if (op.type === 'moveBlockGroupBefore') {
        const children = [...ed.children];
        const from = children.findIndex((element) => (!op.fromSelector || element.matches(op.fromSelector))
          && (element.innerText || '').includes(op.fromNeedle));
        const to = children.findIndex((element) => (!op.beforeSelector || element.matches(op.beforeSelector))
          && (element.innerText || '').includes(op.beforeNeedle));
        if (from < 0 || to < 0 || from + op.blocks !== to) failures.push(`${index}:moveBlockGroupBefore`);
      }
      if (op.type === 'insertBeforeHeadingHtml' && !text.includes(op.probe) && !html.includes(op.probe)) {
        failures.push(`${index}:insertBeforeHeadingHtml`);
      }
      if (op.type === 'replaceImage') {
        const imageFigures = [...ed.querySelectorAll('figure')].filter((figure) => figure.querySelector('img'));
        if (imageFigures.length !== op.expectedImages || html.includes(op.oldSrcKey)) failures.push(`${index}:replaceImage`);
      }
    }
    for (const probe of (verify?.includes || [])) if (!text.includes(probe) && !html.includes(probe)) failures.push(`include:${probe}`);
    for (const probe of (verify?.excludes || [])) if (text.includes(probe) || html.includes(probe)) failures.push(`exclude:${probe}`);
    return { ok: failures.length === 0, failures, chars: text.length };
  }, { operations: spec.operations, verify: spec.verify || {} });
}

async function runSpec(page, specArg) {
  const spec = validatePartialSpec(JSON.parse(readFileSync(resolve(ROOT, specArg), 'utf8')));
  const article = parseNoteArticle(resolve(ROOT, spec.article));
  const noteId = article.noteId || (article.data.noteUrl?.match(/\/n\/(n[0-9a-z]+)/) || [])[1];
  if (!noteId) throw new Error('article frontmatter に noteId/noteUrl がない');
  if (spec.note && spec.note !== noteId) throw new Error(`spec.note(${spec.note}) != article.noteId(${noteId})`);

  console.log(`[prep] note=${noteId} article=${spec.article} operations=${spec.operations.length} mode=${COMMIT ? 'COMMIT' : 'DRY-READONLY'}`);
  await openEditor(page, noteId);
  const before = await editorState(page);
  if (before.chars < 300) throw new Error(`本文が短すぎる（chars=${before.chars}）`);
  const attachmentsBefore = await attachmentSnapshot(page);
  console.log(`[2] editor chars=${before.chars} PDF=${attachmentsBefore.hrefs.length} names=${attachmentsBefore.names.length}`);

  let changes = 0;
  for (const [index, op] of spec.operations.entries()) {
    const result = await preflight(page, op);
    const want = expected(op);
    if (result.already) {
      console.log(`[preflight ${index}] ${op.type}: already`);
      continue;
    }
    if (result.count !== want) throw new Error(`[preflight ${index}] ${op.type}: expected=${want} actual=${result.count} ${result.reason || ''}`);
    changes++;
    console.log(`[preflight ${index}] ${op.type}: target=${result.count}`);
  }
  await page.screenshot({ path: shot('preflight', noteId) });
  if (!COMMIT) {
    console.log(`[dry-run] 読み取り検査 OK。編集0件。適用予定 operation=${changes}、PDF=${attachmentsBefore.hrefs.length}。実更新は --commit。`);
    return { noteId, changed: false, planned: changes, attachments: attachmentsBefore.hrefs.length };
  }
  if (changes === 0 && spec.publishWhenAlready) {
    console.log('[resume] editor の未公開ドラフトに反映済み。spec 指定により公開だけ再開。');
  } else if (changes === 0 && spec.verifyLiveApi) {
    const live = await verifyLiveApi(noteId, spec);
    if (live.ok) {
      console.log('[skip] editor・live API とも全 operation が反映済み。更新しない。');
      return { noteId, changed: false, planned: 0, attachments: attachmentsBefore.hrefs.length };
    }
    console.log(`[resume] editor の未公開ドラフトに反映済み、live API は未反映（${live.failures.join(', ')}）。公開だけ再開。`);
  } else if (changes === 0) {
    console.log('[skip] 全 operation が既に反映済み。更新しない。');
    return { noteId, changed: false, planned: 0, attachments: attachmentsBefore.hrefs.length };
  } else {
    for (const [index, op] of spec.operations.entries()) {
      const result = await preflight(page, op);
      if (result.already) continue;
      if (!(await applyOperation(page, op))) throw new Error(`[apply ${index}] ${op.type} に失敗`);
      await sleep(350);
    }
  }
  const after = await editorState(page);
  const attachmentsAfter = await attachmentSnapshot(page);
  const verification = await verifyOperations(page, spec);
  console.log(`[3] edited chars ${before.chars}→${after.chars}; PDF ${attachmentsBefore.hrefs.length}→${attachmentsAfter.hrefs.length}`);
  if (!verification.ok) throw new Error(`編集後検証NG: ${verification.failures.join(', ')}`);
  if (!sameAttachmentSnapshot(attachmentsBefore, attachmentsAfter)) throw new Error('PDF添付不変条件NG（更新前後のURL/ファイル名が不一致）');
  if (after.chars < Math.min(300, before.chars * 0.8)) throw new Error('本文文字数が安全閾値を下回った');
  await page.screenshot({ path: shot('edited', noteId) });

  const published = await publishLive(page, noteId, article.paidBoundary || '試験問題|予想問題', article.isPaid, {
    keepBoundary: true,
    screenshotPrefix: 'note-partial',
  });
  if (!published) throw new Error('公開更新フローに失敗');

  await openEditor(page, noteId);
  const liveVerify = await verifyOperations(page, spec);
  const attachmentsLive = await attachmentSnapshot(page);
  if (!liveVerify.ok) throw new Error(`公開後再読NG: ${liveVerify.failures.join(', ')}`);
  if (!sameAttachmentSnapshot(attachmentsBefore, attachmentsLive)) throw new Error('公開後にPDF添付URL/ファイル名が変化');
  if (spec.verifyLiveApi) {
    const liveApi = await verifyLiveApi(noteId, spec);
    if (!liveApi.ok) throw new Error(`公開後live API検証NG: ${liveApi.failures.join(', ')}`);
  }
  await page.screenshot({ path: shot('verified', noteId) });
  console.log(`[done] 公開後再読 OK。PDF=${attachmentsLive.hrefs.length} を完全保持、通知=いいえ。`);
  return { noteId, changed: true, planned: changes, attachments: attachmentsLive.hrefs.length };
}

console.log(`[batch] specs=${specArgs.length}/${listedSpecs.length} start=${START} mode=${COMMIT ? 'COMMIT' : 'DRY-READONLY'}`);
const context = await chromium.launchPersistentContext(PROFILE, {
  headless: false,
  channel: 'chrome',
  proxy: PROXY ? { server: PROXY } : undefined,
  ignoreHTTPSErrors: true,
  viewport: { width: 1366, height: 1000 },
  args: ['--disable-blink-features=AutomationControlled'],
});

let exitCode = 0;
try {
  const page = context.pages()[0] || await context.newPage();
  await page.goto('https://note.com/settings/account', { waitUntil: 'domcontentloaded', timeout: 60000 });
  let accountOk = false;
  for (let i = 0; i < 10; i++) {
    await sleep(1500);
    if (/dobokunote/.test(await page.evaluate(() => document.body.innerText || ''))) { accountOk = true; break; }
  }
  if (!accountOk) throw new Error('account != dobokunote（未ログイン/別アカウント）');
  console.log('[1] account gate OK (dobokunote)');
  const results = [];
  for (const [index, specArg] of specArgs.entries()) {
    console.log(`[batch ${index + 1}/${specArgs.length}] ${specArg}`);
    results.push(await runSpec(page, specArg));
  }
  const changed = results.filter((result) => result.changed).length;
  const planned = results.filter((result) => result.planned > 0).length;
  const already = results.filter((result) => result.planned === 0).length;
  const attachmentArticles = results.filter((result) => result.attachments > 0).length;
  console.log(`[batch done] articles=${results.length} planned=${planned} changed=${changed} already=${already} PDF保持記事=${attachmentArticles}`);
} catch (error) {
  console.error('ABORT:', String(error?.message || error));
  exitCode = 2;
} finally {
  // Chrome の永続 profile はまれに close() が完了しない。公開・再読検証後に
  // バッチ全体が停止しないよう、終了待ちだけを上限付きにする。
  await Promise.race([
    context.close().catch(() => {}),
    sleep(2000).then(() => console.warn('[cleanup] browser close timeout; process を終了します')),
  ]);
}
process.exit(exitCode);
