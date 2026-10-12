#!/usr/bin/env node
/**
 * figure-qa-sheet.mjs — /figure-quality-loop の親の QA（Evaluator）を 1 コマンドにする（DN-0556）。
 * 図ごとに次の 3 つを出し、親は合否だけを決める。
 *   1. png・webp（あれば jpg）すべてのクロップ検査（STRAY_SLIVER / EDGE_CUT など）。配信中の webp だけ見ると png の切れ端を見逃す（図5.4・2026-10-07）
 *   2. 新旧を並べた画像 .tmp/figure-loop/qa-<図名>.png（旧は git HEAD の同じパス。HEAD に無い・変わっていなければその旨）
 *   3. 画像から図番号のキャプション（「図 2.41」等）が消えたのに、MDX に caption も直後の <p> も無い図（画面から図名・出典が消える）
 *
 * Usage: node scripts/figure-qa-sheet.mjs <figKey...> [--out-dir .tmp/figure-loop]
 * 終了コード: 0 = 3 つとも指摘なし / 1 = STRAY_SLIVER か キャプション消失がある / 2 = 検査不成立（画像が無い・OCR（tesseract）が使えず 3 を判定できない）
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { parseCliArgs } from './lib/cli-args.mjs';
import { isCliEntry } from './lib/cli-run.mjs';
import { describeFigure, captionStatus, hasFigureCaption } from './lib/figure-review.mjs';
import { analyzeImage } from './check-figure-crop-integrity.mjs';

const SHEET_MAX_H = 700;
const GAP = 24;

/** 画像（Buffer）を tesseract(jpn) で読む。使えなければ null（検査不成立として扱う） */
export function tesseractOcr(buf) {
  const dir = mkdtempSync(join(tmpdir(), 'figure-qa-'));
  try {
    const f = join(dir, 'in.png');
    writeFileSync(f, buf);
    return execFileSync('tesseract', [f, '-', '-l', 'jpn', '--psm', '6'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 16 * 1024 * 1024 });
  } catch {
    return null;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** HEAD にある同じパスのファイル。無ければ null */
function gitHeadFile(root, rel) {
  try {
    return execFileSync('git', ['-C', root, 'show', `HEAD:${rel}`], { stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
  } catch {
    return null;
  }
}

async function sheetImage(oldBuf, newBuf, out) {
  const fit = async (b) => {
    const m = await sharp(b).metadata();
    const h = Math.min(SHEET_MAX_H, m.height);
    return sharp(b).flatten({ background: '#ffffff' }).resize({ height: h }).png().toBuffer({ resolveWithObject: true });
  };
  const a = await fit(oldBuf);
  const b = await fit(newBuf);
  const w = a.info.width + GAP + b.info.width;
  const h = Math.max(a.info.height, b.info.height);
  mkdirSync(join(out, '..'), { recursive: true });
  await sharp({ create: { width: w, height: h, channels: 3, background: '#9a9a9a' } })
    .composite([{ input: a.data, left: 0, top: 0 }, { input: b.data, left: a.info.width + GAP, top: 0 }])
    .png().toFile(out);
  return { oldSize: [a.info.width, a.info.height], newSize: [b.info.width, b.info.height] };
}

/**
 * @returns {Promise<Array<{figKey, status: 'ok'|'fail'|'inconclusive', files, sheet, caption, problems: string[]}>>}
 */
export async function buildQaSheet(figKeys, { root = REPO_ROOT, outDir = join(root, '.tmp', 'figure-loop'), ocr = tesseractOcr, gitShow = gitHeadFile } = {}) {
  const siteRoot = join(root, 'content', 'site');
  const cache = new Map();
  const out = [];
  for (const figKey of figKeys) {
    const f = describeFigure({ siteRoot, repoRoot: root, figKey, cache });
    const problems = [];
    if (!f.abs) { out.push({ figKey, status: 'inconclusive', files: [], sheet: null, caption: null, problems: ['画像が見つからない'] }); continue; }
    // 1. クロップ検査（兄弟の png・webp・jpg すべて）
    const files = [];
    for (const ext of ['webp', 'png', 'jpg', 'jpeg']) {
      const abs = join(siteRoot, `${figKey}.${ext}`);
      if (!existsSync(abs)) continue;
      const a = await analyzeImage(abs);
      const rules = a.violations.map((v) => `${v.rule}${v.side ? `(${v.side})` : ''}`);
      files.push({ ext, served: ext === f.ext, size: [a.w, a.h], rules, sliver: a.violations.some((v) => v.rule === 'STRAY_SLIVER'), edgeCut: a.violations.some((v) => v.rule === 'EDGE_CUT') });
      if (a.violations.some((v) => v.rule === 'STRAY_SLIVER')) problems.push(`${ext} に STRAY_SLIVER（隣の図の切れ端）`);
    }
    // 2. 新旧の並べ画像（配信中の画像で比べる）
    const oldBuf = gitShow(root, f.img);
    const newBuf = readFileSync(f.abs);
    let sheet = { path: null, note: 'HEAD に同じパスの画像が無い（新規）' };
    const changed = oldBuf ? !oldBuf.equals(newBuf) : true;
    if (oldBuf && !changed) sheet = { path: null, note: 'HEAD から変わっていない' };
    else if (oldBuf) {
      const path = join(outDir, `qa-${figKey.replace(/\//g, '__')}.png`);
      const sz = await sheetImage(oldBuf, newBuf, path);
      sheet = { path, note: `左=旧 ${sz.oldSize.join('×')}（HEAD）/ 右=新 ${sz.newSize.join('×')}` };
    }
    // 3. 画像から消えた図番号のキャプションが MDX に残るか
    let caption = { status: 'unchanged' };
    if (oldBuf && changed) {
      const oldText = ocr(await sharp(oldBuf).flatten({ background: '#ffffff' }).png().toBuffer());
      const newText = ocr(await sharp(newBuf).flatten({ background: '#ffffff' }).png().toBuffer());
      if (oldText === null || newText === null) {
        caption = { status: 'unknown', note: 'OCR（tesseract）が使えず、図番号のキャプションが消えたかを判定できない' };
      } else if (hasFigureCaption(oldText) && !hasFigureCaption(newText)) {
        const st = f.mdx ? captionStatus(readFileSync(join(root, f.mdx), 'utf8'), f.name) : { found: false };
        if (st.found && (st.caption || st.nextP)) caption = { status: 'kept', note: '画像からは消えたが MDX に caption か直後の <p> がある' };
        else {
          caption = { status: 'lost', note: `画像から図番号のキャプションが消え、MDX（${f.mdx}）の ${f.name} に caption も直後の <p> も無い` };
          problems.push(caption.note);
        }
      } else caption = { status: 'ok', note: hasFigureCaption(newText) ? '図番号のキャプションは画像に残っている' : '元から画像に図番号のキャプションは無い' };
    }
    const status = problems.length ? 'fail' : caption.status === 'unknown' ? 'inconclusive' : 'ok';
    if (caption.status === 'unknown') problems.push(caption.note);
    out.push({ figKey, status, files, sheet, caption, problems });
  }
  return out;
}

export async function run(argv = process.argv.slice(2)) {
  const flags = parseCliArgs({ 'out-dir': { type: 'string' } }, argv);
  const figKeys = flags._;
  if (figKeys.length === 0) { console.error('usage: figure-qa-sheet.mjs <figKey...> [--out-dir dir]'); return 1; }
  const results = await buildQaSheet(figKeys, flags.outDir ? { outDir: flags.outDir } : {});
  for (const r of results) {
    const mark = { ok: '✓', fail: '✗', inconclusive: '?' }[r.status];
    console.log(`${mark} ${r.figKey}`);
    for (const x of r.files) console.log(`    ${x.ext}${x.served ? '（配信中）' : ''} ${x.size.join('×')}  ${x.rules.length ? x.rules.join(' ') : '指摘なし'}`);
    if (r.sheet) console.log(`    新旧: ${r.sheet.path ?? '—'}  ${r.sheet.note}`);
    if (r.caption) console.log(`    キャプション: ${r.caption.status}${r.caption.note ? `  ${r.caption.note}` : ''}`);
    for (const p of r.problems) console.log(`    ! ${p}`);
  }
  const n = (s) => results.filter((r) => r.status === s).length;
  console.log(`[figure-qa-sheet] ${results.length} 枚を検査（指摘なし ${n('ok')}・不合格 ${n('fail')}・検査不成立 ${n('inconclusive')}）`);
  if (n('fail')) return 1;
  if (n('inconclusive') || results.length === 0) return 2;
  return 0;
}

if (isCliEntry(import.meta.url)) {
  run().then((code) => { process.exitCode = code; }, (e) => { console.error(e?.stack || String(e)); process.exitCode = 1; });
}
