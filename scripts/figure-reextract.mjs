#!/usr/bin/env node
/**
 * figure-reextract.mjs — 図の切り出しを、記録（config/figure-sources.json の provenance の cropBox・rotate・post）から作り直し、
 * 配信中の画像と一致するかを確かめる（DN-0570）。手順と一致の閾値は scripts/lib/figure-recipe.mjs。
 *
 * Usage:
 *   node scripts/figure-reextract.mjs <figKey...> [--json] [--write-dir <dir>]
 *       記録から作り直して配信中の画像と比べる（寸法が同じで、画素の差が閾値以下なら一致）。--write-dir は作り直した画像を保存する（配信中の画像は上書きしない）
 *   node scripts/figure-reextract.mjs cut --pdf <vault:… か絶対パス> --page N --dpi D --box l,t,r,b [--rotate 0|90|180|270] [--despeckle N] [--width W] [--colors N] --out <file.png|.webp>
 *       同じ手順で 1 枚切り出す（figure-crop-worker が切り出し直すときに使う。出力の source をそのまま判定の source に入れる）
 *
 * Drive vault の在る PC でだけ動く（原典 PDF は vault にある）。vault が無い・原典が読めない・記録に枠が無い図は「検査不成立」。
 * 終了コード: 0 = 検査した図がすべて一致 / 1 = 不一致が 1 枚でもある・引数不正 / 2 = 検査不成立（vault なし・記録に枠なし・原典が読めない等で確かめられない図がある）
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { REPO_ROOT, SITE_CONTENT_ROOT } from './lib/repository-paths.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { readJsonIf } from './lib/json-io.mjs';
import { parseCliArgs } from './lib/cli-args.mjs';
import { isCliEntry } from './lib/cli-run.mjs';
import { resolveVaultRoot } from './lib/drive-vault.mjs';
import { describeFigure, parseCropBox } from './lib/figure-review.mjs';
import { RECIPE_DIFF, applyRecipe, diffImages, recipeOf, renderPage, resolvePdfPath, withinThreshold } from './lib/figure-recipe.mjs';

const fmt = (n) => (Number.isFinite(n) ? n.toFixed(4) : String(n));

/** 1 枚を作り直して比べる。{ figKey, status: 'match'|'mismatch'|'skip', detail, ... } */
export async function verifyFigure(figKey, { provenance, vaultRoot, writeDir, cache = new Map() }) {
  const f = describeFigure({ siteRoot: SITE_CONTENT_ROOT, repoRoot: REPO_ROOT, figKey, cache });
  if (!f.abs) return { figKey, status: 'skip', detail: '配信中の画像が無い' };
  const { recipe, error } = recipeOf(provenance?.[figKey]);
  if (error) return { figKey, status: 'skip', detail: error };
  const pdfAbs = resolvePdfPath(recipe.pdf, vaultRoot);
  if (!pdfAbs) return { figKey, status: 'skip', detail: 'Drive vault が無い PC では原典 PDF を開けない' };
  if (!pdfAbs.startsWith('https://') && !existsSync(pdfAbs)) return { figKey, status: 'skip', detail: `原典 PDF が vault に無い: ${recipe.pdf}` };
  if (pdfAbs.startsWith('https://')) return { figKey, status: 'skip', detail: '原典が URL のみ（vault に写しが無い）' };
  let regenerated;
  try {
    regenerated = await applyRecipe(renderPage(pdfAbs, recipe.page, recipe.dpi), recipe, f.ext === 'webp' ? 'webp' : 'png');
  } catch (e) {
    return { figKey, status: 'skip', detail: `作り直せなかった: ${String(e.message).split('\n')[0]}` };
  }
  if (writeDir) {
    mkdirSync(writeDir, { recursive: true });
    writeFileSync(join(writeDir, `${figKey.replace(/\//g, '__')}.${f.ext === 'webp' ? 'webp' : 'png'}`), regenerated);
  }
  const d = await diffImages(readFileSync(f.abs), regenerated);
  return { figKey, img: f.img, status: withinThreshold(d) ? 'match' : 'mismatch', ...d };
}

async function runCut(argv) {
  const flags = parseCliArgs({
    pdf: { type: 'string' }, page: { type: 'integer' }, dpi: { type: 'number' }, box: { type: 'string' }, rotate: { type: 'integer' },
    despeckle: { type: 'integer' }, width: { type: 'integer' }, colors: { type: 'integer' }, out: { type: 'string' },
  }, argv.slice(1));
  const box = parseCropBox(flags.box);
  const { page, dpi } = flags;
  const rotate = flags.rotate ?? 0;
  if (!flags.pdf || !flags.out || !box || !Number.isInteger(page) || page < 1 || !(dpi > 0) || ![0, 90, 180, 270].includes(rotate)) {
    console.error('usage: figure-reextract.mjs cut --pdf P --page N --dpi D --box l,t,r,b [--rotate R] [--despeckle N] [--width W] [--colors N] --out file');
    return 1;
  }
  const post = Object.fromEntries(['despeckle', 'width', 'colors'].filter((k) => flags[k] != null).map((k) => [k, flags[k]]));
  if (Object.values(post).some((n) => !Number.isInteger(n) || n < 1)) { console.error('✗ --despeckle・--width・--colors は 1 以上の整数'); return 1; }
  const pdfAbs = resolvePdfPath(flags.pdf, resolveVaultRoot().root);
  if (!pdfAbs || !existsSync(pdfAbs)) { console.error(`✗ 原典 PDF を開けない: ${flags.pdf}（Drive vault が無い PC では動かない）`); return 2; }
  const ext = /\.webp$/i.test(flags.out) ? 'webp' : 'png';
  const buf = await applyRecipe(renderPage(pdfAbs, page, dpi), { cropBox: box, rotate, post }, ext);
  mkdirSync(dirname(resolve(flags.out)), { recursive: true });
  writeFileSync(flags.out, buf);
  const sharp = (await import('sharp')).default;
  const m = await sharp(buf).metadata();
  const source = { pdf: flags.pdf, page, dpi, cropBox: box, ...(rotate ? { rotate } : {}), ...(Object.keys(post).length ? { post } : {}) };
  console.log(JSON.stringify({ out: flags.out, width: m.width, height: m.height, bytes: buf.length, source }));
  return 0;
}

export async function run(argv = process.argv.slice(2)) {
  if (argv[0] === 'cut') return runCut(argv);
  const flags = parseCliArgs({ 'write-dir': { type: 'string' }, json: { type: 'boolean' } }, argv);
  const positionals = flags._;
  if (positionals.length === 0) { console.error('usage: figure-reextract.mjs <figKey...> [--json] [--write-dir dir]  |  cut --pdf … --out …'); return 1; }
  const vault = resolveVaultRoot();
  if (!vault.root) { console.error(`✗ 検査不成立: ${vault.reason}`); return 2; }
  const provenance = readJsonIf(REPO_ROOT, datasetPath('config.figure-sources'))?.provenance ?? {};
  const results = [];
  for (const figKey of positionals) results.push(await verifyFigure(figKey, { provenance, vaultRoot: vault.root, writeDir: flags.writeDir, cache: new Map() }));
  const count = (s) => results.filter((r) => r.status === s).length;
  if (flags.json) console.log(JSON.stringify({ thresholds: RECIPE_DIFF, results }, null, 2));
  else {
    for (const r of results) {
      if (r.status === 'skip') console.log(`  - 検査不成立 ${r.figKey}: ${r.detail}`);
      else if (!r.sameSize) console.log(`  ✗ 不一致 ${r.figKey}: 寸法が違う（配信 ${r.a.join('×')} / 作り直し ${r.b.join('×')}）`);
      else console.log(`  ${r.status === 'match' ? '✓ 一致' : '✗ 不一致'} ${r.figKey}: ${r.size.join('×')}・平均差 ${fmt(r.meanAbs)}（上限 ${RECIPE_DIFF.meanAbs}）・大差の画素 ${(r.badFrac * 100).toFixed(3)}%（上限 ${RECIPE_DIFF.badFrac * 100}%）`);
    }
    console.log(`[figure-reextract] 指定 ${results.length} 枚・作り直して比べた ${count('match') + count('mismatch')} 枚（一致 ${count('match')}・不一致 ${count('mismatch')}）・検査不成立 ${count('skip')} 枚`);
  }
  if (count('mismatch')) return 1;
  if (count('skip') || results.length === 0) return 2;
  return 0;
}

if (isCliEntry(import.meta.url)) {
  run().then((code) => { process.exitCode = code; }, (e) => { console.error(e?.stack || String(e)); process.exitCode = 1; });
}
