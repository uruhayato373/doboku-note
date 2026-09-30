#!/usr/bin/env node
/**
 * note-replace-intro.mjs
 * ---------------------------------------------------------------------------
 * 公開済み note 記事の「冒頭（本文の先頭〜目次／最初の見出しの手前）」だけを原稿の内容で貼り直し、
 * 末尾の撤退済み導線（合格ラボ・著者バナーの締めの一文）を消し、印刷用PDF節の文面を原稿にそろえて、
 * 1記事1回の更新で公開する。全文置換はしないので、PDF 添付には触れない（前後で件数を照合する）。
 *
 * 前提: 原稿の冒頭は標準化済み（scripts/standardize-civil1-note-intro.mjs）。note は編集中の内容を
 * 自動保存しないので、途中で失敗した記事は保存しない（下書きも汚れない・2026-09-30 実測）。
 *
 * 使い方:
 *   node scripts/note-replace-intro.mjs --article <article.md>            # 編集まで行い公開しない（確認用）
 *   node scripts/note-replace-intro.mjs --list <paths.txt> --commit       # 公開する
 *     --max-consecutive-fail N（既定 3）/ --limit N / --force（反映済みでもやり直す）
 * 反映済みの判定と記録: .claude/state/note-republish-hashes.json（recordPublishedHash）。原稿の本文ハッシュが
 * 記録と同じ記事は飛ばす。公開後に公開 API で冒頭の文面を確かめてから記録する。
 * ---------------------------------------------------------------------------
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launchNoteContext, assertAccountGate, sleep, ROOT } from './lib/note-browser.mjs';
import { cardifyBareUrls, repairUrlHeadings, listUrlHeadingsInEditor } from './lib/note-cardify.mjs';
import { extractBodyImages, insertImagesAtPlaceholders } from './lib/note-images.mjs';
import { publishLive } from './lib/note-live-publish.mjs';
import { recordPublishedHash, loadState, bodyHash } from './lib/note-republish-hash.mjs';

const argv = process.argv.slice(2);
const val = (k) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : null);
const COMMIT = argv.includes('--commit');
const FORCE = argv.includes('--force');
const LIMIT = Number(val('--limit')) || Infinity;
const MAX_FAIL = Number(val('--max-consecutive-fail')) || 3;
const files = val('--list') ? readFileSync(val('--list'), 'utf8').split('\n').map((s) => s.trim()).filter(Boolean) : [val('--article')].filter(Boolean);

const P1_PROBE = 'この教材は、技術士（総合技術監理部門）を持つ';
const LAB_RE = /書き換えた答案を「これで通るか」|書いた答案を第三者の目で見てもらう手段がない|月例の予想問題と施工経験記述のマンツーマン添削|土木セコカン\s*合格ラボ|完成答案ライブラリ、月例予想、添削つきプラン/;
const BRIDGE_RE = /^上位資格の分析力・発注者として書類を評価してきた目・合格者の当事者性で、あなたの答案を合格ラインへ引き上げます。$/;
const OLD_PDF_TEXT_RE = /印刷用PDFへ収録する前提で整備/;

export function parseSource(rel) {
  const abs = resolve(ROOT, rel);
  const raw = readFileSync(abs, 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const fm = (raw.match(/^---\n([\s\S]*?)\n---\n/) || [])[1] || '';
  const f = (k) => ((fm.match(new RegExp(`^${k}:\\s*["']?([^"'\\n]*)`, 'm')) || [])[1] || '').trim();
  const noteId = f('noteId') || (f('noteUrl').match(/\/n\/(n[0-9a-f]+)/) || [])[1];
  const body = raw.replace(/^---\n[\s\S]*?\n---\n/, '');
  const h2 = body.search(/^## /m);
  if (!noteId || h2 < 0) throw new Error(`noteId か ## 見出しが無い: ${rel}`);
  // 原稿の目印（<!-- cta:… -->）は必ず単独行なので、行ごと落とす（正規表現で HTML を剥がさない）
  const introMd = body.slice(0, h2).split('\n').filter((l) => !l.trimStart().startsWith('<!')).join('\n').replace(/^#\s+.*\n+/, '').trim();
  const pdfSection = (body.match(/^## 印刷用PDF[^\n]*\n\n([\s\S]*)$/m) || [])[0] || '';
  const rest = body.slice(h2);
  return { abs, rel, raw, noteId, restHasCoconala: /coconala\.com/.test(rest), isPaid: f('notePricing') === 'paid', boundary: f('paidBoundary') || '試験問題|予想問題', introMd, pdfSection };
}

const snap = (page) => page.evaluate(() => {
  const ed = document.querySelector('[contenteditable=true]'); const k = [...ed.children];
  return {
    n: k.length, att: ed.querySelectorAll('a[href*="attachments/download"]').length,
    pdfFig: k.filter((e) => e.tagName === 'FIGURE' && /\.pdf/i.test(e.innerText)).length,
    toc: k.findIndex((e) => e.tagName === 'TABLE-OF-CONTENTS'), h2: k.findIndex((e) => e.tagName === 'H2'),
    text: ed.innerText,
  };
});
const selectBlocks = (page, a, b) => page.evaluate(([a, b]) => {
  const ed = document.querySelector('[contenteditable=true]'); const k = [...ed.children];
  const r = document.createRange(); r.setStartBefore(k[a]); r.setEndAfter(k[b]);
  const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); ed.focus(); return true;
}, [a, b]);
const caretAt = (page, idx, atEnd = false) => page.evaluate(([i, end]) => {
  const ed = document.querySelector('[contenteditable=true]'); const el = ed.children[i];
  const r = document.createRange(); r.selectNodeContents(el); r.collapse(!end);
  const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); ed.focus(); return true;
}, [idx, atEnd]);
const paste = (page, text) => page.evaluate((t) => {
  const el = document.querySelector('[contenteditable=true]'); const dt = new DataTransfer(); dt.setData('text/plain', t);
  el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
}, text);
const indices = (page, reSrc, fromH2) => page.evaluate(([src, fromH2]) => {
  const re = new RegExp(src); const k = [...document.querySelector('[contenteditable=true]').children];
  const h2 = k.findIndex((e) => e.tagName === 'H2');
  return k.map((e, i) => ((!fromH2 || i > h2) && re.test((e.innerText || '').trim()) ? i : -1)).filter((i) => i >= 0);
}, [reSrc, fromH2]);

async function deleteBlocksDesc(page, idxs) {
  for (const i of [...idxs].sort((a, b) => b - a)) { await selectBlocks(page, i, i); await sleep(250); await page.keyboard.press('Delete'); await sleep(700); }
}

async function processArticle(page, src) {
  const { body: tokenMd, images, missing } = extractBodyImages(src.introMd, dirname(src.abs));
  if (missing.length) throw new Error(`冒頭の画像がローカルに無い: ${missing.join(' / ')}`);
  await page.goto(`https://editor.note.com/notes/${src.noteId}/edit`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('[contenteditable=true]', { timeout: 30000 }); await sleep(2500);
  const before = await snap(page);
  const introEnd = (before.toc >= 0 ? before.toc : before.h2) - 1;
  if (introEnd < 0) throw new Error('目次・見出しが見つからない');
  // 1) 末尾: 合格ラボ（隣接ブロックの空段落も一緒に）と締めの一文
  const lab = await indices(page, LAB_RE.source, true);
  if (lab.length) {
    const figs = await page.evaluate((ix) => { const k = [...document.querySelector('[contenteditable=true]').children];
      const out = new Set(ix); for (const i of ix) { for (const j of [i + 1, i + 2]) { const e = k[j]; if (!e) continue;
        if (e.tagName === 'FIGURE' && /membership|合格ラボ|n6b66793ca20c/.test(e.innerHTML)) out.add(j); else if (e.tagName === 'P' && !(e.innerText || '').trim()) out.add(j); else break; } }
      return [...out]; }, lab);
    if (Math.max(...figs) - Math.min(...figs) > 6) throw new Error(`合格ラボの範囲が広すぎる: ${figs}`);
    await deleteBlocksDesc(page, figs);
  }
  const bridge = await indices(page, BRIDGE_RE.source, true);
  if (bridge.length) await deleteBlocksDesc(page, bridge);
  // 1b) 本文側に古いココナラ導線が残っている（原稿の本文側には無い）記事は、その文とカードを消す
  if (!src.restHasCoconala) {
    const coco = await page.evaluate(() => { const k = [...document.querySelector('[contenteditable=true]').children]; const h2 = k.findIndex((e) => e.tagName === 'H2');
      return k.map((e, i) => (i > h2 && ((e.tagName === 'P' && /ココナラで(個別に|単発)|まだ答案が無い人は/.test(e.innerText || '')) || (e.tagName === 'FIGURE' && /coconala/.test(e.innerHTML))) ? i : -1)).filter((i) => i >= 0); });
    if (coco.length > 6) throw new Error(`本文側のココナラ導線が多すぎる: ${coco.length}`);
    if (coco.length) await deleteBlocksDesc(page, coco);
  }
  // 2) 印刷用PDF節の文面
  const oldPdf = await indices(page, OLD_PDF_TEXT_RE.source, true);
  const stdPdfText = src.pdfSection.replace(/^## [^\n]*\n\n/, '').trim();
  if (oldPdf.length === 1 && stdPdfText) {
    await selectBlocks(page, oldPdf[0], oldPdf[0]); await sleep(250); await page.keyboard.press('Delete'); await sleep(600);
    const at = oldPdf[0] - 1; await caretAt(page, Math.max(at, 0), true); await page.keyboard.press('Enter'); await sleep(300);
    await paste(page, stdPdfText); await sleep(1500);
  } else if (oldPdf.length > 1) throw new Error('印刷用PDF節の旧文面が複数');
  const hasPdfHeading = /印刷用PDF/.test((await snap(page)).text);
  if (src.pdfSection && !hasPdfHeading) {
    const last = (await snap(page)).n - 1; await caretAt(page, last, true); await page.keyboard.press('Enter'); await sleep(300);
    await paste(page, src.pdfSection.trim()); await sleep(1500);
  }
  // 3) 冒頭の貼り直し
  const mid = await snap(page);
  const end = (mid.toc >= 0 ? mid.toc : mid.h2) - 1;
  const intro = await page.evaluate((e) => [...document.querySelector('[contenteditable=true]').children].slice(0, e + 1).some((x) => x.querySelector('a[href*="attachments/download"]')), end);
  if (intro) throw new Error('冒頭の範囲に添付がある');
  await selectBlocks(page, 0, end); await sleep(300); await page.keyboard.press('Delete'); await sleep(1500);
  const cleared = await snap(page);
  if ((cleared.toc >= 0 ? cleared.toc : cleared.h2) > 1) throw new Error('冒頭を消しきれない');
  await caretAt(page, 0); await paste(page, tokenMd); await sleep(3500);
  await cardifyBareUrls(page, { tag: '[card]' }); await repairUrlHeadings(page, { tag: '[repair]' });
  if ((await listUrlHeadingsInEditor(page)).length) throw new Error('URL が見出しに化けた');
  if (images.length) {
    const r = await insertImagesAtPlaceholders(page, images, { tag: '[img]' });
    if (r.failed.length || r.leftover.length || !r.settled) throw new Error(`画像挿入に失敗: ${JSON.stringify({ f: r.failed, l: r.leftover, s: r.settled })}`);
  }
  // 画像の直前に残る空段落は消さない（消すと ProseMirror が直後の画像ごと消す・2026-09-30 工事19 で実測）。
  // 全文置換で公開した記事にも同じ空段落があり、表示上の差は無い。
  // 4) 検証
  const after = await snap(page);
  const errs = [];
  if (after.att !== before.att || after.pdfFig !== before.pdfFig) errs.push(`添付の数が変わった ${before.att}/${before.pdfFig}→${after.att}/${after.pdfFig}`);
  if (before.toc >= 0 && !(after.toc >= 0 && after.toc < after.h2)) errs.push('目次の位置が崩れた');
  if (!after.text.includes(P1_PROBE)) errs.push('説明文が無い');
  const bannerOk = await page.evaluate(() => { const k = [...document.querySelector('[contenteditable=true]').children]; return k.slice(0, 3).some((e) => e.tagName === 'FIGURE' && e.querySelector('img')); });
  if (!bannerOk) errs.push('冒頭の著者画像が無い');
  if (LAB_RE.test(after.text)) errs.push('合格ラボが残っている');
  if (/まだ答案が無い人は/.test(after.text)) errs.push('旧ココナラ文が残っている');
  const introCards = await page.evaluate(() => { const k = [...document.querySelector('[contenteditable=true]').children];
    const t = k.findIndex((e) => e.tagName === 'TABLE-OF-CONTENTS' || e.tagName === 'H2');
    return k.slice(0, t).filter((e) => e.tagName === 'FIGURE' && /coconala/.test(e.innerHTML)).length; });
  if (introCards !== 2) errs.push(`冒頭のココナラカードが ${introCards} 枚`);
  if (errs.length) throw new Error('検証 NG: ' + errs.join(' / '));
  return { before, after };
}

async function verifyLive(noteId) {
  for (let i = 0; i < 6; i++) {
    await sleep(5000);
    const r = await fetch(`https://note.com/api/v3/notes/${noteId}`).then((x) => x.json()).catch(() => null);
    const b = r?.data?.body || '';
    if (b.includes(P1_PROBE) && /coconala\.com\/services\/4418735/.test(b) && !/membership\/join/.test(b)) return true;
  }
  return false;
}

async function main() {
  if (!files.length) { console.error('--article <path> か --list <file> が要る'); process.exit(2); }
  const state = loadState();
  const ctx = await launchNoteContext();
  const page = ctx.pages()[0] || await ctx.newPage();
  let ok = 0, fail = 0, skip = 0, consecutive = 0, done = 0;
  try {
    await assertAccountGate(page);
    for (const rel of files) {
      if (done >= LIMIT) break;
      let src;
      try { src = parseSource(rel); } catch (e) { console.error(`[FAIL] ${rel}: ${e.message}`); fail++; continue; }
      if (!FORCE && state.hashes?.[src.rel] === bodyHash(readFileSync(src.abs, 'utf8'))) { console.log(`[skip] 反映済み ${src.rel}`); skip++; continue; }
      done++;
      console.log(`\n[article] ${src.noteId} ${src.rel}`);
      try {
        const r = await processArticle(page, src);
        console.log(`[edit] OK 添付 ${r.before.att}→${r.after.att} ブロック ${r.before.n}→${r.after.n}`);
        if (!COMMIT) { console.log('[dry] 公開せずに閉じる（note は自動保存しない）'); ok++; consecutive = 0; continue; }
        const published = await publishLive(page, src.noteId, src.boundary, src.isPaid, { keepBoundary: true, trialLineBottom: !src.isPaid, screenshotPrefix: 'replace-intro' });
        if (!published) throw new Error('公開に失敗');
        if (!(await verifyLive(src.noteId))) throw new Error('公開後の API に新しい冒頭が無い（記録しない）');
        if (recordPublishedHash(src.rel)) console.log(`[hash] ${src.rel}`);
        console.log(`[OK] ${src.noteId}`); ok++; consecutive = 0;
      } catch (e) {
        fail++; consecutive++;
        console.error(`[FAIL] ${src.noteId} ${src.rel}: ${String(e.message).split('\n')[0]}`);
        await page.screenshot({ path: resolve(ROOT, `.tmp/replace-intro-fail-${src.noteId}.png`) }).catch(() => {});
        if (consecutive >= MAX_FAIL) { console.error(`[ABORT] ${MAX_FAIL} 本連続で失敗 → 残りは実行しない`); break; }
      }
    }
  } finally { await ctx.close(); }
  console.log(`\n[done] ok=${ok} fail=${fail} skip=${skip} / ${files.length}${COMMIT ? '' : '（公開なし）'}`);
  process.exit(fail ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
