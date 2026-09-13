// node content/sns/x/draft/097-civil1-diagram-reuse/render.mjs
import { readFileSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateFigurePack } from '../../../../../scripts/render-figure-pack.mjs';
import { renderFigureSns } from '../../../../../.claude/scripts/sns/render-figure-sns.mjs';
const dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(dir, '../../../../..');
const images = JSON.parse(readFileSync(join(dir, 'images.json'), 'utf8'));
for (const item of images) {
  if (!/^img\/tweet-\d{2}-[a-z0-9-]+\.png$/.test(item.file)) throw new Error('画像名が不正');
  const { source } = validateFigurePack(item.pack, root);
  const [, , category, slug] = source.article.path.split('/');
  const temp = join(dir, 'img', '.render-tmp');
  const [output] = await renderFigureSns({ slug: `${category}/${slug}`, figure: basename(source.figure.path), concept: item.concept, format: 'ig-single', 'out-dir': temp }, root);
  mkdirSync(join(dir, 'img'), { recursive: true });
  renameSync(output.file, join(dir, item.file));
  rmSync(temp, { recursive: true });
  console.log(item.file);
}
