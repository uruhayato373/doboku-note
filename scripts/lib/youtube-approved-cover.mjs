import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { ensureLocalFromVault } from './drive-vault.mjs';

export const coverInputDigest = spec => {
  const { approvedImage: _image, ...input } = spec;
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
};

/** Reuse the reviewed pixels on hosts without the original display font. */
export async function readApprovedCover(root, spec, layout) {
  const image = spec.approvedImage;
  if (!image) return null;
  if (!/^\.tmp\/video-render\/[a-z0-9-]+\/[a-z0-9-]+\.png$/.test(image.path ?? '') ||
      !/^[a-f0-9]{64}$/.test(image.sha256 ?? '') || image.specSha256 !== coverInputDigest(spec)) {
    throw new Error('approvedImage のパス・hash・入力が不正、または採用後に見出し/ポーズが変更されています');
  }
  const buffer = await readVerifiedVideoPng(root, image, layout);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}"><image width="100%" height="100%" href="data:image/png;base64,${buffer.toString('base64')}"/></svg>`;
  return { buffer, svg, provenance: { template: 'approved-white-blue-pop-v1', spec,
    width: layout.width, height: layout.height, sha256: image.sha256,
    character: { ...spec.character }, approvedImage: image.path } };
}

/** Full-frame artwork shared by covers and authored CTA cards. */
export async function readVerifiedVideoPng(root, image, layout) {
  if (!/^\.tmp\/video-render\/[a-z0-9-]+\/[a-z0-9-]+\.png$/.test(image?.path ?? '') ||
      !/^[a-f0-9]{64}$/.test(image?.sha256 ?? '')) throw new Error('採用画像のパス・hashが不正です');
  const file = resolve(root, image.path);
  if (!existsSync(file) && !ensureLocalFromVault(file)) {
    throw new Error(`採用画像がありません。引継ぎZIPをリポジトリ直下に展開するか、Drive vaultから復元してください: ${image.path}`);
  }
  const buffer = readFileSync(file);
  if (createHash('sha256').update(buffer).digest('hex') !== image.sha256) throw new Error('採用画像のsha256が不一致です');
  const metadata = await sharp(buffer).metadata();
  if (metadata.format !== 'png' || metadata.width !== layout.width || metadata.height !== layout.height) {
    throw new Error('採用画像の形式・寸法がカバー仕様と不一致です');
  }
  return buffer;
}
