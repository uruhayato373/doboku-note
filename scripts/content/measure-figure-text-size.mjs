#!/usr/bin/env node
/**
 * measure-figure-text-size.mjs — 過去問ページの図（<ArticleImage>）の中の文字の高さを OCR で測り、
 * 図の中の大きい文字が見出しくらい（TARGET_PX）を超えない表示幅を src/config/figure-display-width.json に書く（2026-11-26）。
 *
 *   node scripts/content/measure-figure-text-size.mjs            # 全部測って書く
 *   node scripts/content/measure-figure-text-size.mjs --dry-run  # 書かずに件数だけ
 *
 * なぜ: 図は中身の細かさによらず本文の幅の 75% に引き伸ばされ、文字の大きい図（土の三相の図など）は本文の 1.5 倍以上の文字になっていた。
 * 決め方: tesseract（jpn+eng・--psm 11）で信頼度 60 以上の文字の枠を取り、上から 1 割の高さ（90 パーセンタイル）が画面で TARGET_PX になる幅を出す。
 *   中央値にしないのは、振り仮名・添字の小さい文字が多い図で中央値が小さく出て、目立つ漢字のラベルが大きいまま残ったため（2級土木 令和7年度 前期の土の構成の図）。
 *   枠が MIN_BOXES 未満の図は測れたとみなさず台帳に入れない（今の表示のまま）。台帳の幅は ArticleImage が上限にだけ使う（広げない）。
 * 罠: Mac の手元専用（tesseract・dwebp が要る。CI では回さない）。画像は content/site の手元のファイル、無ければ R2 の公開 URL から取る。
 *   台帳は手で書かない。図を足したり差し替えたりしたら、この script を回し直す。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT, SITE_CONTENT_ROOT } from '../lib/repository-paths.mjs';
import { listSiteMdx } from '../lib/mdx-files.mjs';
import { R2_PUBLIC_ORIGIN } from '../lib/site-identity.mjs';

const TARGET_PX = 22;
const MIN_BOXES = 10;
const MIN_CONF = 60;
const OUT = join(REPO_ROOT, 'src', 'config', 'figure-display-width.json');
const dryRun = process.argv.includes('--dry-run');

/** 過去問のページ（frontmatter の group が primary・secondary・pastExam）の <ArticleImage src=…> を集める */
function figureSources() {
  const srcs = new Set();
  for (const file of listSiteMdx()) {
    const text = readFileSync(file, 'utf8');
    if (!/^group:\s*(primary|secondary|pastExam)\s*$/m.test(text)) continue;
    for (const m of text.matchAll(/<ArticleImage\s[^>]*src="([^"]+\.(?:webp|png|jpe?g))"/g)) srcs.add(m[1]);
  }
  return [...srcs].sort();
}

/** 画像を PNG にして返す（手元に無ければ R2 から取る）。取れなければ null */
function toPng(src, dir) {
  const local = join(SITE_CONTENT_ROOT, src.replace(/^\/posts\//, ''));
  const raw = join(dir, 'raw');
  const png = join(dir, 'fig.png');
  try {
    if (existsSync(local)) writeFileSync(raw, readFileSync(local));
    else execFileSync('curl', ['-sfL', '--max-time', '20', '-o', raw, `${R2_PUBLIC_ORIGIN}${src}`]);
    if (src.endsWith('.webp')) execFileSync('dwebp', ['-quiet', raw, '-o', png]);
    else execFileSync('magick', [raw, png]);
    return png;
  } catch {
    return null;
  }
}

function measure(png) {
  const width = Number(execFileSync('identify', ['-format', '%w', png], { encoding: 'utf8' }));
  const tsv = execFileSync('tesseract', [png, 'stdout', '-l', 'jpn+eng', '--psm', '11', 'tsv'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const heights = tsv.split('\n').slice(1).map((line) => line.split('\t'))
    .filter((c) => c.length >= 12 && c[11].trim() && Number(c[10]) >= MIN_CONF)
    .map((c) => Number(c[9])).sort((a, b) => a - b);
  return { width, boxes: heights.length, large: heights.length ? heights[Math.min(heights.length - 1, Math.floor(heights.length * 0.9))] : 0 };
}

const sources = figureSources();
// 作業用は .tmp/（OS の一時置き場は手元の制限で tesseract が読めないことがある）
mkdirSync(join(REPO_ROOT, '.tmp'), { recursive: true });
const dir = mkdtempSync(join(REPO_ROOT, '.tmp', 'figure-text-'));
const ledger = {};
let measured = 0;
let failed = 0;
let tooFew = 0;
try {
  for (const src of sources) {
    const png = toPng(src, dir);
    if (!png) { failed++; continue; }
    const { width, boxes, large } = measure(png);
    if (boxes < MIN_BOXES || large <= 0) { tooFew++; continue; }
    measured++;
    ledger[src] = Math.round((width * TARGET_PX) / large);
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
console.log(`[measure-figure-text-size] 図 ${sources.length} 枚を対象 / 測れた ${measured} / 文字が少なく測らない ${tooFew} / 取得・変換の失敗 ${failed}`);
if (sources.length > 0 && failed > sources.length / 2) {
  console.error('[measure-figure-text-size] 取得の失敗が半分を超えた（検査不成立）。台帳は書かない');
  process.exit(2);
}
if (!dryRun) {
  writeFileSync(OUT, `${JSON.stringify(ledger, null, 2)}\n`);
  console.log(`[measure-figure-text-size] ${Object.keys(ledger).length} 件を ${OUT.slice(REPO_ROOT.length + 1)} に書いた`);
}
