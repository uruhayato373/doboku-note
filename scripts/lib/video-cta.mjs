import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readVerifiedVideoPng } from './youtube-approved-cover.mjs';

/** Opt-in artwork: an invalid configured asset never falls back to the old CTA. */
export async function readVideoCta(root, packDir, format) {
  const file = join(packDir, 'cta-design.json');
  if (!existsSync(file)) return null;
  const design = JSON.parse(readFileSync(file, 'utf8'));
  if (design.schemaVersion !== 1) throw new Error('cta-design の schemaVersion が不正です');
  const spec = design[format];
  if (!spec) return null;
  const layout = format === 'longform' ? { width: 1920, height: 1080 } : { width: 1080, height: 1920 };
  if (format === 'shorts' && (typeof spec.narration !== 'string' || !spec.narration.trim())) {
    throw new Error('Shorts CTA は画像に対応する narration が必要です');
  }
  const buffer = await readVerifiedVideoPng(root, spec, layout);
  return { buffer, narration: spec.narration, provenance: { ...spec, ...layout, design: design.design } };
}
