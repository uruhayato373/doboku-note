import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { join, relative, isAbsolute } from 'node:path';
import { validateFraming } from './character-frame-geometry.mjs';

/** @typedef {{uses: string[], facing: string, gestureDirection: string, placements: string[], crops: string[], note: string, reviewedAt: string}} Composition */
/** @typedef {{slug: string, file: string, label: string, category: string, beats: string[], verified: boolean, siteCta?: boolean, composition?: Composition, framing?: import('./character-frame-geometry.mjs').Framing, quality?: {status: string, note: string, reviewedAt: string}}} Pose */
/** @typedef {{uses: Record<string,string>, facings: Record<string,string>, gestures: Record<string,string>, placements: Record<string,string>, crops: Record<string,string>, qualities: Record<string,string>}} Vocabulary */
/** @typedef {{assetsDir: string, identity: {name: string, brandColors: {main: string[], sub: string[]}}, catalog: Vocabulary, poses: Pose[]}} Manifest */

/** Catalog entries stay visible when assets are absent on another PC. No remote fetching. */
export function readCharacterCatalog(root) {
  /** @type {Manifest} */
  const manifest = JSON.parse(readFileSync(join(root, '.claude/config/character-poses.json'), 'utf8'));
  const vocab = manifest.catalog;
  if (manifest.assetsDir !== 'content/sns/_assets/character' || !Array.isArray(manifest.poses) || !manifest.poses.length) {
    throw new Error('キャラクター台帳の素材ルートまたはポーズ一覧が不正です');
  }
  for (const key of ['uses', 'facings', 'gestures', 'placements', 'crops', 'qualities']) {
    if (!vocab?.[key] || !Object.keys(vocab[key]).length || Object.values(vocab[key]).some(v => typeof v !== 'string' || !v)) {
      throw new Error(`キャラクター台帳の分類が不正です: ${key}`);
    }
  }
  const seen = new Set();
  const base = join(root, manifest.assetsDir);
  const poses = manifest.poses.map(pose => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pose.slug) || seen.has(pose.slug) ||
        !/^[a-z0-9-]+\.png$/.test(pose.file) || !pose.label || typeof pose.verified !== 'boolean') {
      throw new Error(`キャラクター台帳のID・画像名・品質状態が不正です: ${pose.slug}`);
    }
    seen.add(pose.slug);
    validateFraming(pose.framing);
    if (pose.quality && (!Object.hasOwn(vocab.qualities, pose.quality.status) || !pose.quality.note || !/^\d{4}-\d{2}-\d{2}$/.test(pose.quality.reviewedAt))) {
      throw new Error(`${pose.slug}: 画像品質の記録が不正です`);
    }
    const c = pose.composition;
    if (c) {
      for (const key of ['uses', 'placements', 'crops']) {
        if (!Array.isArray(c[key]) || !c[key].length || c[key].some(v => !Object.hasOwn(vocab[key], v))) {
          throw new Error(`${pose.slug}: ${key} の分類が不正です`);
        }
      }
      if (!Object.hasOwn(vocab.facings, c.facing) || !Object.hasOwn(vocab.gestures, c.gestureDirection) ||
          !c.note || !/^\d{4}-\d{2}-\d{2}$/.test(c.reviewedAt)) {
        throw new Error(`${pose.slug}: 構図の分類が不正です`);
      }
    }
    const full = join(base, pose.file);
    const available = existsSync(full) && statSync(full).isFile();
    if (available) {
      const rel = relative(realpathSync(base), realpathSync(full));
      if (isAbsolute(rel) || rel.startsWith('..')) throw new Error(`${pose.slug}: 素材ルート外の画像です`);
    }
    return {
      ...pose,
      available,
      path: `${manifest.assetsDir}/${pose.file}`,
      url: available ? `/media/sns/_assets/character/${encodeURIComponent(pose.file)}` : null,
    };
  });
  return { name: manifest.identity.name, vocabulary: vocab, poses,
    backgrounds: { navy: manifest.identity.brandColors.main[0], paper: manifest.identity.brandColors.sub[0] } };
}
