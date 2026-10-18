import { readFileSync, realpathSync } from 'node:fs';
import { resolve, relative, isAbsolute, join } from 'node:path';
import { createHash } from 'node:crypto';

const hash = (value) => createHash('sha256').update(value).digest('hex');
const digest = /^[a-f0-9]{64}$/;

// 語り・コピー・出典の変更後に、以前の画像を使い回さない。
export function popSceneHash(scene) {
  return hash(JSON.stringify({ narration: scene.narration, caption: scene.caption, visual: scene.visual, sourceRef: scene.sourceRef }));
}

function inside(root, path) {
  if (typeof path !== 'string' || !path || isAbsolute(path)) throw new Error('POP画像はリポジトリ相対パスで指定してください');
  const result = resolve(root, path);
  const rel = relative(root, result);
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('POP画像のパスがリポジトリ外です');
  return result;
}

/** CIではGit上の生成記録を検査。実画像はレンダー時に同じ契約でSHA照合する。 */
export function readLongformPopImages(root, packDir, storyboard, { local = false } = {}) {
  const contract = storyboard.imageDesign;
  const manifestPath = join(packDir, 'pop-image.json');
  let pop;
  try { pop = JSON.parse(readFileSync(manifestPath, 'utf8')); } catch (error) {
    if (contract) throw new Error(`POP生成記録が読めません: ${error.message}`);
    return new Map();
  }
  // 一方だけ消してテンプレートへ戻す事故も止める。
  if (!contract && !pop.activeBodyRevision) return new Map();
  if (contract?.mode !== 'codex-pop' || contract.scope !== 'all-body' || contract.revision !== pop.activeBodyRevision) {
    throw new Error('storyboard.imageDesign と pop-image.activeBodyRevision が一致しません');
  }
  if (storyboard.format !== 'longform-16x9') throw new Error('本文POP画像は longform-16x9 用です');
  if (contract.coverRevision || pop.activeCoverRevision) {
    if (!contract.coverRevision || contract.coverRevision !== pop.activeCoverRevision) {
      throw new Error('POP表紙の改訂指定が一致しません');
    }
    const cover = pop.revisions?.[contract.coverRevision];
    const spec = JSON.parse(readFileSync(join(packDir, 'cover-design.json'), 'utf8')).covers?.longform;
    if (cover?.version !== 'pop-poster-v3' || cover.generation?.tool !== 'image_gen' || !cover.generation.prompt?.trim()) {
      throw new Error('POP表紙のCodex生成記録が必要です');
    }
    if (spec?.design !== 'pop-poster-v3' || !digest.test(cover.output?.sha256 ?? '') ||
        spec.approvedImage?.sha256 !== cover.output.sha256 || spec.approvedImage?.path !== cover.output.path) {
      throw new Error('POP表紙の採用画像が改訂記録と一致しません（旧表紙への逆戻り）');
    }
    inside(root, cover.output.path);
  }
  const revision = pop.revisions?.[contract.revision];
  const scenes = storyboard.scenes?.slice(1) ?? [];
  if (!scenes.length || !Array.isArray(revision?.images) || revision.images.length !== scenes.length) {
    throw new Error(`POP画像は表紙を除く全${scenes.length}場面分が必要です`);
  }
  const images = new Map();
  for (const scene of scenes) {
    const matches = revision.images.filter(x => x.sceneId === scene.sceneId);
    if (matches.length !== 1) throw new Error(`${scene.sceneId}: POP画像の欠落・重複`);
    const image = matches[0];
    if (image.inputSha256 !== popSceneHash(scene)) throw new Error(`${scene.sceneId}: POP画像の原稿が古い`);
    if (image.generation?.tool !== 'image_gen' || !image.generation.prompt?.trim() || !image.generation.references?.length) {
      throw new Error(`${scene.sceneId}: Codex画像生成の指示・参照記録が必要です`);
    }
    for (const ref of [...image.generation.references, image.generation.output, image.output]) {
      if (!ref || !digest.test(ref.sha256)) throw new Error(`${scene.sceneId}: 画像SHAが不正`);
      inside(root, ref.path);
    }
    if (image.output.width !== 1920 || image.output.height !== 1080) throw new Error(`${scene.sceneId}: 採用画像は1920×1080が必要です`);
    if (local) {
      const path = inside(root, image.output.path);
      const real = realpathSync(path);
      inside(realpathSync(root), relative(realpathSync(root), real));
      const bytes = readFileSync(real);
      if (hash(bytes) !== image.output.sha256) throw new Error(`${scene.sceneId}: 採用画像SHA不一致`);
      // PNG IHDRを実検査。寸法の自己申告だけで合格にしない。
      if (bytes.length < 24 || !bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || bytes.toString('ascii',12,16) !== 'IHDR' || bytes.readUInt32BE(16) !== 1920 || bytes.readUInt32BE(20) !== 1080) {
        throw new Error(`${scene.sceneId}: 採用PNGの実寸・形式が不正`);
      }
    }
    images.set(scene.sceneId, image.output);
  }
  return images;
}
