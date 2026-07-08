#!/usr/bin/env node
/**
 * figure-recrop.mjs — 既存の記事図クロップを「タイト再クロップ」する反復手作業の機械化。
 *
 * 今セッションで確立したノウハウ（答え漏らし/写り込みを既存画像から除く再クロップ）のうち、
 * 視覚判断（どこで切るか）以外の反復部分を 1 コマンドに束ねる:
 *   ① png を crop（-trim +repage -border で外周整形） → ② webp 再生成
 *   → ③ MDX の <img>/<ArticleImage> width/height を新寸法へ更新 → ④ OCR で残存テキストを報告
 *
 * 切り位置（人/エージェントが図を見て決める）は下記いずれかで渡す:
 *   --top F        上から F(0-1) を除去（上帯＝答え/問題文を落とす）
 *   --bottom F     下から (1-F) を除去＝上 F を残す（下帯＝答え/表を落とす）
 *   --band Y0 Y1   [Y0,Y1](0-1) の帯だけ残す（上下ともテキストの中央図）
 *   --crop WxH+X+Y 明示ピクセル
 *
 * Usage:
 *   node scripts/figure-recrop.mjs <figure.webp|png> --top 0.15
 *   node scripts/figure-recrop.mjs <fig> --band 0.10 0.72 --dry-run   # 適用せず dims+OCR だけ
 *   node scripts/figure-recrop.mjs <fig> --bottom 0.43 --no-mdx       # MDX更新をスキップ
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const has = (k) => argv.includes(k);
const input = argv.find((a) => !a.startsWith("--") && /\.(png|webp|jpg)$/i.test(a));
if (!input) { console.error("usage: figure-recrop.mjs <figure.webp|png> [--top F|--bottom F|--band Y0 Y1|--crop WxH+X+Y] [--dry-run] [--no-mdx]"); process.exit(2); }

const abs = path.isAbsolute(input) ? input : path.join(ROOT, input);
const dir = path.dirname(abs);                         // .../img
const baseName = path.basename(abs).replace(/\.(png|webp|jpg|jpeg)$/i, "");
const pngPath = path.join(dir, baseName + ".png");
const webpPath = path.join(dir, baseName + ".webp");
const dryRun = has("--dry-run");
const noMdx = has("--no-mdx");

// crop の元 png（無ければ webp/jpg から一時 png を作る）
let srcPng = fs.existsSync(pngPath) ? pngPath : null;
let tmpSrc = null;
if (!srcPng) {
  tmpSrc = path.join(dir, `.recrop-src-${baseName}.png`);
  execSync(`magick "${abs}" "${tmpSrc}"`, { stdio: "pipe" });
  srcPng = tmpSrc;
}
const [W, H] = execSync(`magick identify -format "%w %h" "${srcPng}"`, { encoding: "utf8" }).trim().split(" ").map(Number);

// crop 矩形を算出
let cropGeom;
if (arg("--crop")) {
  cropGeom = arg("--crop");
} else if (arg("--top") != null) {
  const y0 = Math.round(H * Number(arg("--top")));
  cropGeom = `${W}x${H - y0}+0+${y0}`;
} else if (arg("--bottom") != null) {
  const h = Math.round(H * Number(arg("--bottom")));
  cropGeom = `${W}x${h}+0+0`;
} else if (has("--band")) {
  const i = argv.indexOf("--band");
  const y0 = Math.round(H * Number(argv[i + 1]));
  const y1 = Math.round(H * Number(argv[i + 2]));
  cropGeom = `${W}x${y1 - y0}+0+${y0}`;
} else {
  console.error("切り位置指定が必要: --top / --bottom / --band / --crop");
  process.exit(2);
}

const outPng = dryRun ? path.join(dir, `.recrop-preview-${baseName}.png`) : pngPath;
execSync(`magick "${srcPng}" -crop ${cropGeom} +repage -trim +repage -bordercolor white -border 12 "${outPng}"`, { stdio: "pipe" });
const [nW, nH] = execSync(`magick identify -format "%w %h" "${outPng}"`, { encoding: "utf8" }).trim().split(" ").map(Number);

// OCR で残存テキストを報告（答え語・句点）
let ocr = "";
try { ocr = execSync(`tesseract "${outPng}" - -l jpn --psm 6 2>/dev/null`, { encoding: "utf8", maxBuffer: 1 << 24 }); } catch { /* noop */ }
const clean = ocr.replace(/\s+/g, "");
const answer = (clean.match(/したがって|正\s*解/g) || []);
const periods = (clean.match(/。/g) || []).length;

const result = { figure: `${baseName}`, from: `${W}x${H}`, to: `${nW}x${nH}`, crop: cropGeom, ocr: { answer_markers: answer, periods } };

if (dryRun) {
  fs.rmSync(outPng, { force: true });
  if (tmpSrc) fs.rmSync(tmpSrc, { force: true });
  console.log(JSON.stringify({ ...result, mode: "dry-run" }, null, 2));
  process.exit(0);
}

// webp 再生成
execSync(`magick "${pngPath}" -quality 82 "${webpPath}"`, { stdio: "pipe" });
if (tmpSrc) fs.rmSync(tmpSrc, { force: true });

// MDX の <img>/<ArticleImage> width/height を更新（{N} と "N" 両形式・webp/png 参照両対応・既存 EOL 保持）
let mdxUpdated = false;
if (!noMdx) {
  const parts = path.relative(path.join(ROOT, ".local/r2/posts"), dir).split(path.sep); // [cat, localSlug, img]
  const slug = parts.slice(0, 2).join("/");
  const cands = [
    path.join(ROOT, ".local/r2/posts", slug, "article.mdx"),
    path.join(ROOT, ".local/r2/posts", slug + ".mdx"),
    path.join(ROOT, ".local/r2/posts", slug.replace(/\//g, "-"), "article.mdx"),
  ];
  const mdxPath = cands.find((p) => fs.existsSync(p));
  if (mdxPath) {
    let src = fs.readFileSync(mdxPath, "utf8");
    const eol = src.includes("\r\n") ? "\r\n" : "\n";
    const lines = src.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const refsFile = lines[i].includes(`${baseName}.webp`) || lines[i].includes(`${baseName}.png`);
      const isImgTag = lines[i].includes("<img") || lines[i].includes("<ArticleImage");
      if (refsFile && isImgTag) {
        lines[i] = lines[i]
          .replace(/(width=[{"])\d+([}"])/, `$1${nW}$2`)
          .replace(/(height=[{"])\d+([}"])/, `$1${nH}$2`);
        mdxUpdated = true;
      }
    }
    if (mdxUpdated) fs.writeFileSync(mdxPath, lines.join(eol));
  }
}

console.log(JSON.stringify({ ...result, mode: "applied", webp: true, mdx_updated: mdxUpdated }, null, 2));
if (answer.length) console.error(`  [!] 答え語が残存: ${answer.join(",")} → 切り位置を深くして再実行`);
