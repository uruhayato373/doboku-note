/**
 * author-banner-match.mjs — 著者オーソリティ・バナーの版を画素で見分ける。
 *
 * 標準版と POP 版はどちらも正方形、旧版は本文の比較図と同じ 16:9 で、比率や位置だけでは区別できない
 * （2026-09-29 DN-0450/DN-0455: H2 より前の 16:9 本文図を旧バナーとして削除対象にしていた）。
 * 画像を 16×16 に縮小した画素の平均差で原本と照合する。同一原本は約 0、版どうしは約 69 離れる。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

export const BANNER_REFERENCE_FILES = {
  pop: 'figure-author-authority-pop.png',
  standard: 'figure-author-authority.png',
  'concrete-pop': 'figure-author-authority-concrete-pop.png',
  concrete: 'figure-author-authority-concrete.png',
  legacy: 'legacy-author-authority-16x9.png',
};

/** POP 版の原本ファイル名 → 版。記事の先頭バナーがこれなら、それ以外の正方形版（SQUARE_BANNER_VARIANTS）を差し替え対象にする。 */
export const POP_BANNER_VARIANTS = {
  'figure-author-authority-pop.png': 'pop',
  'figure-author-authority-concrete-pop.png': 'concrete-pop',
};
/** 正方形の著者バナーの版（標準版と POP 版。土木とコンクリート）。 */
export const SQUARE_BANNER_VARIANTS = ['pop', 'standard', 'concrete-pop', 'concrete'];
export const BANNER_MATCH_MAX_DISTANCE = 25;

export async function imageSignature(buffer) {
  return sharp(buffer).resize(16, 16, { fit: 'fill' }).removeAlpha().raw().toBuffer();
}

export function signatureDistance(left, right) {
  let sum = 0;
  for (let index = 0; index < left.length; index++) sum += Math.abs(left[index] - right[index]);
  return sum / left.length;
}

export async function loadBannerReferences(referenceDir) {
  const references = {};
  for (const [variant, file] of Object.entries(BANNER_REFERENCE_FILES)) {
    references[variant] = await imageSignature(readFileSync(join(referenceDir, file)));
  }
  return references;
}

/** @returns {{ variant: 'pop'|'standard'|'legacy'|'unknown', distances: Record<string, number> }} */
export async function matchBannerBuffer(buffer, references) {
  const signature = await imageSignature(buffer);
  const distances = {};
  let best = null;
  for (const [variant, reference] of Object.entries(references)) {
    distances[variant] = signatureDistance(signature, reference);
    if (!best || distances[variant] < distances[best]) best = variant;
  }
  return { variant: distances[best] < BANNER_MATCH_MAX_DISTANCE ? best : 'unknown', distances };
}
