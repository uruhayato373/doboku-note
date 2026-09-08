import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { readCharacterCatalog } from './character-catalog.mjs';

import { FRAME_LABELS, frameGeometry } from './character-frame-geometry.mjs';

/** No file writes, remote fetch, background removal, flips or enlargement. */
export async function renderCharacterFrame(root, { pose: slug, frame = 'full', width = 0, preview = false }) {
  const catalog = readCharacterCatalog(root);
  if (!Object.hasOwn(FRAME_LABELS, frame)) throw new Error('指定した切り取りは使用できません');
  const pose = catalog.poses.find(p => p.slug === slug);
  if (!pose) throw new Error('未登録のポーズです');
  if (!pose.available) throw new Error('このPCに原画像がありません');
  if (!preview && pose.quality?.status !== 'ready') throw new Error('要修正・未確認の素材は書き出せません');
  const f = pose.framing;
  const variant = Object.hasOwn(f?.variants ?? {}, frame) ? f.variants[frame] : null;
  if (!variant?.box) throw new Error('このポーズでは指定した切り取りは使用できません');
  const input = readFileSync(join(root, pose.path));
  const sha256 = createHash('sha256').update(input).digest('hex');
  if (sha256 !== f.source.sha256) throw new Error('原画像が変更されています。切り取り位置の再確認が必要です');
  const metadata = await sharp(input).metadata();
  if (metadata.width !== f.source.width || metadata.height !== f.source.height) throw new Error('原画像の寸法が記録と一致しません');
  const geometry = frameGeometry(f.source, variant.box, width);
  const buffer = await sharp(input).extract(geometry.rect)
    .resize({ width: geometry.width, height: geometry.height, fit: 'fill', withoutEnlargement: true }).png().toBuffer();
  return { buffer, pose: slug, frame, sourcePath: pose.path, sourceSha256: sha256,
    sha256: createHash('sha256').update(buffer).digest('hex'), ...geometry,
    filename: `${slug}-${frame}-${geometry.width}.png` };
}
