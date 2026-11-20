// note の本文の図は同名の SVG が正本で、note へ上げる PNG は投稿の直前に作る（scripts/lib/note-figure-png.mjs・2026-11-19）。
//
// 経緯: SVG と、その書き出しの PNG を両方 Git に持っていた（110 組）。PNG は図ごとの生成スクリプトか手作業で作られ、
// 倍率は 3 通り・書体は作ったマシン任せで、SVG だけ直して PNG が古いまま投稿される食い違いを止めるものも無かった。
// ここでは (1) 対の PNG を Git に戻さない (2) 原稿の画像参照が、Git の checkout（土曜の同期の worktree・CI）だけで
// 解決できる (3) 変換・解決・再公開の判定が SVG を正本として動く、を固定する。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';
import { figureSvgFor, renderNoteFigure, NOTE_FIGURE_SCALE } from '../scripts/lib/note-figure-png.mjs';
import { extractBodyImages, resolveAuthorBannerOrigin } from '../scripts/lib/note-images.mjs';
import { assetHash, referencedImages } from '../scripts/lib/note-republish-hash.mjs';

const tracked = execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files', 'content/note'], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\n').filter(Boolean);
const trackedSet = new Set(tracked);

test('同名の SVG がある PNG を Git で追跡しない（PNG は投稿のときに SVG から作る）', () => {
  const pngs = tracked.filter((f) => /\.png$/i.test(f));
  assert.ok(pngs.length > 0, '検査不成立: content/note の追跡中の PNG が 0 件');
  const paired = pngs.filter((f) => trackedSet.has(f.replace(/\.png$/i, '.svg')));
  assert.deepEqual(paired, [], `SVG と対の PNG が追跡されている（git rm --cached する）: ${paired.slice(0, 5).join(' / ')}`);
});

test('原稿の画像参照は Git の checkout だけで解決できる（同名 SVG・追跡中のファイル・著者バナー・カバー）', () => {
  const articles = tracked.filter((f) => /\/article(-[^/]+)?\.md$/.test(f));
  let refs = 0;
  const broken = [];
  for (const a of articles) {
    const dir = dirname(a);
    for (const rel of referencedImages(readFileSync(join(REPO_ROOT, a), 'utf8'))) {
      refs++;
      const repoRel = join(dir, rel).replace(/\\/g, '/');
      const abs = join(REPO_ROOT, repoRel);
      if (trackedSet.has(repoRel.replace(/\.png$/i, '.svg')) && /\.png$/i.test(repoRel)) continue; // 図: SVG が正本
      if (trackedSet.has(repoRel)) continue;
      if (resolveAuthorBannerOrigin(abs) || /\/figure-author-authority[^/]*\.png$/.test(repoRel)) continue;
      if (/\/img\/cover[^/]*\.png$/.test(repoRel)) continue; // カバーは private R2（asset-hydrate）
      broken.push(`${a} → ${rel}`);
    }
  }
  console.log(`[note-figure-sources] 原稿 ${articles.length} 本・画像参照 ${refs} 件を検査`);
  assert.ok(refs > 0, '検査不成立: 画像参照が 0 件');
  assert.deepEqual(broken, [], `Git に無い画像を指している（追跡外の PNG は checkout に無い）: ${broken.slice(0, 5).join(' / ')}`);
});

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20" viewBox="0 0 40 20"><rect x="10" y="5" width="20" height="10" fill="#1e73c8"/></svg>';

function fakeArticle() {
  const root = mkdtempSync(join(tmpdir(), 'note-fig-'));
  const art = join(root, 'content', 'note', '技術士総監', '記事A');
  mkdirSync(join(art, 'img'), { recursive: true });
  writeFileSync(join(art, 'img', 'figure-1-x.svg'), SVG); // PNG は無い（Git の checkout の状態）
  return { root, art };
}

test('変換: SVG の寸法の倍率どおりで、背景は白（四隅が不透明）', async () => {
  const { root, art } = fakeArticle();
  const out = renderNoteFigure(join(art, 'img', 'figure-1-x.svg'), { outDir: join(root, 'out'), root });
  assert.equal(relative(join(root, 'out'), out).replace(/\\/g, '/'), 'content/note/技術士総監/記事A/img/figure-1-x.png');
  const { data, info } = await sharp(out).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 40 * NOTE_FIGURE_SCALE);
  assert.equal(info.height, 20 * NOTE_FIGURE_SCALE);
  const px = (x, y) => [...data.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 4)];
  assert.deepEqual(px(0, 0), [255, 255, 255, 255], '四隅は白・不透明');
  assert.deepEqual(px(info.width - 1, info.height - 1), [255, 255, 255, 255]);
});

test('extractBodyImages: PNG が無くても同名の SVG があれば欠落にせず、render のときは PNG を作る', () => {
  const { art } = fakeArticle();
  const body = '本文\n\n![図](img/figure-1-x.png)\n';
  const plan = extractBodyImages(body, art);
  assert.deepEqual(plan.missing, []);
  assert.equal(plan.images.length, 1);
  assert.ok(plan.images[0].abs.endsWith('figure-1-x.svg'), '既定（計画・検査）は作らずに SVG を指す');
  assert.equal(figureSvgFor(join(art, 'img', 'figure-1-x.png')), join(art, 'img', 'figure-1-x.svg'));
  const up = extractBodyImages(body, art, { render: true });
  assert.ok(up.images[0].abs.endsWith('.png'), '上げる側は PNG を作って渡す');
  assert.ok(readFileSync(up.images[0].abs).subarray(1, 4).toString() === 'PNG');
});

test('assetHash: 図は SVG の中身で決まる（PNG が無い checkout でも、SVG を直すと変わる）', () => {
  const { root, art } = fakeArticle();
  writeFileSync(join(art, 'article.md'), '---\ntitle: x\n---\n\n![図](img/figure-1-x.png)\n');
  const cwd = process.cwd();
  process.chdir(root);
  try {
    const key = relative(root, join(art, 'article.md')).replace(/\\/g, '/');
    const before = assetHash(key);
    writeFileSync(join(art, 'img', 'figure-1-x.svg'), SVG.replace('#1e73c8', '#c81e1e'));
    const after = assetHash(key);
    assert.notEqual(before, after, 'SVG を直したら再公開の対象になる');
    assert.notEqual(before, 'none');
  } finally {
    process.chdir(cwd);
  }
});
