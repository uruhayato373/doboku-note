import { createHash } from 'node:crypto';

export const cardSpecHash = spec => createHash('sha256').update(JSON.stringify(spec)).digest('hex');
export function validateCharacterCard(spec) {
  for (const [key, min, max, chars] of [['headline', 2, 2, 10], ['points', 2, 3, 22]]) {
    if (!Array.isArray(spec?.[key]) || spec[key].length < min || spec[key].length > max ||
      spec[key].some(s => typeof s !== 'string' || !s.trim() || /[\r\n]/.test(s) || [...s].length > chars)) {
      throw new Error(`${key}: ${min}〜${max}行、各${chars}文字以内。縮小・省略せず原稿を修正してください`);
    }
  }
  if (!spec.character?.pose || !spec.character?.frame || typeof spec.alt !== 'string' || !spec.alt.trim()) throw new Error('先生の指定と画像の説明が必要です');
  if (!Array.isArray(spec.sourcePaths) || !spec.sourcePaths.length) throw new Error('画像の根拠となる原稿パスが必要です');
  return spec;
}
