import { readFileSync, realpathSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');

/** 原本の比率を保ち、追加キャンバスなしで動画寸法へ合わせる。 */
export async function normalizeLearningFrame(bytes, width = 1920, height = 1080) {
  const source = await sharp(bytes).metadata();
  if (!source.width || !source.height || Math.abs(source.width / source.height / (width / height) - 1) > 0.005) {
    throw new Error('図解原本の縦横比が動画と違います。余白で埋めず、構図を作り直してください');
  }
  return sharp(bytes).resize(width, height, { fit: 'contain', background: '#ffffff' }).png().toBuffer();
}

/** 採用PNGが原本を縮めた額縁や追加余白へ差し替わっていないか、実画素で照合する。 */
export async function verifyLearningFrame(root, image) {
  if (!image.normalization) return;
  if (image.normalization.mode !== 'full-frame-v1' || image.normalization.sourceSha256 !== image.source?.sha256) {
    throw new Error('図解の全面採用記録が不正です');
  }
  const read = path => {
    if (!path || isAbsolute(path)) throw new Error('図解はリポジトリ相対パスが必要です');
    const file = realpathSync(resolve(root, path));
    const rel = relative(realpathSync(root), file);
    if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('図解原本がリポジトリ外です');
    return readFileSync(file);
  };
  const raw = read(image.source.path);
  if (sha(raw) !== image.source.sha256) throw new Error('図解原本のSHAが一致しません');
  const expected = await normalizeLearningFrame(raw, image.width, image.height);
  const pixels = bytes => sharp(bytes).removeAlpha().raw().toBuffer();
  const [a, b] = await Promise.all([pixels(expected), pixels(read(image.path))]);
  if (!a.equals(b)) throw new Error('図解が全面採用の原本と一致しません（追加余白・縮小・改変）');
}
