/**
 * figure-recipe.mjs — 図の切り出しを「記録から同じ画像に作り直す」ための共通の手順（DN-0570）。
 *
 * 手順（この順で固定。worker が切り出すときも、figure-reextract.mjs が検証するときも同じ関数を通す）:
 *   1. pdftoppm で PDF の page を dpi で PNG に描画
 *   2. rotate（0/90/180/270）だけ時計回りに回す（書籍スキャンには 180° 逆さのページがある）
 *   3. cropBox [left, top, right, bottom]（回した後のページ画像の画素）で切る
 *   4. post.despeckle（面積が N 画素未満の孤立した黒い点を白にする）→ post.width（その幅へ縮小）
 *   5. 書き出し: png は post.colors 色のパレット（無ければフルカラー）／webp は同じ中間 png から quality 80
 * 記録は config/figure-sources.json の provenance の cropBox・rotate・post（型は dataset-schemas-config-media.mjs）。
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';

export const WEBP_QUALITY = 80;
/** 2 値化の閾値（despeckle の「黒い点」の判定）。worker の PIL インクプロファイルと同じ 160 */
export const INK_THRESHOLD = 160;

/**
 * 作り直した画像と配信中の画像が「一致」とみなす差の上限（DN-0570 で決定）。
 *  - 寸法は完全一致が前提（1px でも違えば切り出し枠・縮小が記録と違う）。
 *  - meanAbs: 灰色化した画素値の平均絶対差（0〜255）。同じ手順なら poppler・libwebp の版差で出るのは
 *    アンチエイリアス縁の ±数階調だけで、ほぼ 0 になる。切り出し枠が 1px ずれた線画は 1.0 を大きく超える。
 *  - badFrac: 差が badLevel(48) を超える画素の割合。減色・webp のノイズは細い線の縁に出るため 0 ではないが、
 *    0.2% を超えるなら線や文字そのものが動いている。
 * 実測（2026-10-12・4 枚、webp 配信）: 一致する記録の差は 平均 0〜0.42・大差 0%。枠を 1px ずらすと 平均 1.41〜7.3・大差 1.1〜5.4%
 * （最小は線の細い測量の図）。その間の 1.0 / 0.2% に置いた。
 */
export const RECIPE_DIFF = { meanAbs: 1.0, badFrac: 0.002, badLevel: 48 };


/** 記録（provenance の 1 件）→ 手順の入力。作り直せない記録（PDF・ページ・dpi・枠のどれかが無い）は理由を返す */
export function recipeOf(prov) {
  if (!prov?.pdf) return { error: 'provenance に原典 PDF が無い' };
  if (!Number.isInteger(prov.page)) return { error: 'provenance に page が無い' };
  if (!(prov.dpi > 0)) return { error: 'provenance に dpi が無い（0 は PDF でなく画像から切り出した図）' };
  if (!prov.cropBox) return { error: 'provenance に cropBox が無い（DN-0570 より前の記録。切り出し直して記録し直す）' };
  return { recipe: { pdf: prov.pdf, page: prov.page, dpi: prov.dpi, cropBox: prov.cropBox, rotate: prov.rotate ?? 0, post: prov.post ?? {} } };
}

/** `vault:原資料PDF/...` を手元のマウント先の絶対パスへ開く。https や絶対パスはそのまま */
export function resolvePdfPath(pdf, vaultRoot) {
  if (!pdf.startsWith('vault:')) return pdf;
  if (!vaultRoot) return null;
  return `${vaultRoot}/${pdf.slice('vault:'.length)}`;
}

/** PDF の 1 ページを PNG にする（pdftoppm・-singlefile で連番の桁数の揺れを避ける） */
export function renderPage(pdfAbs, page, dpi) {
  const dir = mkdtempSync(join(tmpdir(), 'figure-recipe-'));
  try {
    execFileSync('pdftoppm', ['-r', String(dpi), '-f', String(page), '-l', String(page), '-png', '-singlefile', pdfAbs, join(dir, 'p')], { stdio: ['ignore', 'ignore', 'pipe'] });
    return readFileSync(join(dir, 'p.png'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** 黒い孤立した点（面積 < maxArea 画素の 8 近傍連結成分）を白にする。raw は RGB の Buffer。消した成分の数を返す */
export function despeckleRaw(raw, w, h, maxArea) {
  const dark = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const g = (raw[i * 3] * 299 + raw[i * 3 + 1] * 587 + raw[i * 3 + 2] * 114) / 1000;
    dark[i] = g < INK_THRESHOLD ? 1 : 0;
  }
  const seen = new Uint8Array(w * h);
  const stack = [];
  let removed = 0;
  for (let s = 0; s < w * h; s++) {
    if (!dark[s] || seen[s]) continue;
    const comp = [];
    stack.push(s);
    seen[s] = 1;
    while (stack.length) {
      const p = stack.pop();
      comp.push(p);
      const x = p % w;
      const y = (p - x) / w;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q = ny * w + nx;
          if (dark[q] && !seen[q]) { seen[q] = 1; stack.push(q); }
        }
      }
    }
    if (comp.length < maxArea) {
      for (const p of comp) { raw[p * 3] = 255; raw[p * 3 + 1] = 255; raw[p * 3 + 2] = 255; }
      removed++;
    }
  }
  return removed;
}

/** ページ PNG に手順 2〜5 を当てて、書き出した画像（Buffer）を返す。ext は 'png' か 'webp' */
export async function applyRecipe(pagePng, { cropBox, rotate = 0, post = {} }, ext) {
  let img = sharp(pagePng).removeAlpha();
  if (rotate) img = img.rotate(rotate);
  const rotated = await img.png().toBuffer();
  const meta = await sharp(rotated).metadata();
  const [l, t, r, b] = cropBox;
  if (r > meta.width || b > meta.height) throw new Error(`cropBox ${cropBox.join(',')} が回転後のページ ${meta.width}x${meta.height} をはみ出す`);
  let cur = await sharp(rotated).extract({ left: l, top: t, width: r - l, height: b - t }).png().toBuffer();
  if (post.despeckle) {
    const { data, info } = await sharp(cur).raw().toBuffer({ resolveWithObject: true });
    despeckleRaw(data, info.width, info.height, post.despeckle);
    cur = await sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toBuffer();
  }
  if (post.width) cur = await sharp(cur).resize({ width: post.width, kernel: 'lanczos3' }).png().toBuffer();
  const png = post.colors
    ? await sharp(cur).png({ palette: true, colors: post.colors, compressionLevel: 9 }).toBuffer()
    : await sharp(cur).png({ compressionLevel: 9 }).toBuffer();
  return ext === 'webp' ? sharp(png).webp({ quality: WEBP_QUALITY }).toBuffer() : png;
}

/** 2 枚の画像を白地に重ねて灰色にし、画素ごとに比べる。寸法が違えば sameSize: false */
export async function diffImages(aBuf, bBuf) {
  const load = async (b) => {
    const { data, info } = await sharp(b).flatten({ background: '#ffffff' }).greyscale().raw().toBuffer({ resolveWithObject: true });
    return { data, w: info.width, h: info.height };
  };
  const a = await load(aBuf);
  const b = await load(bBuf);
  if (a.w !== b.w || a.h !== b.h) return { sameSize: false, a: [a.w, a.h], b: [b.w, b.h] };
  let sum = 0;
  let bad = 0;
  for (let i = 0; i < a.data.length; i++) {
    const d = Math.abs(a.data[i] - b.data[i]);
    sum += d;
    if (d > RECIPE_DIFF.badLevel) bad++;
  }
  const n = a.data.length;
  return { sameSize: true, size: [a.w, a.h], meanAbs: sum / n, badFrac: bad / n };
}

/** 差が閾値以下か */
export function withinThreshold(d) {
  return Boolean(d.sameSize) && d.meanAbs <= RECIPE_DIFF.meanAbs && d.badFrac <= RECIPE_DIFF.badFrac;
}
