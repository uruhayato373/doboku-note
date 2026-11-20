#!/usr/bin/env node
// render-note-figures.mjs — note の本文の図（figure-*.svg）から、note へ上げるのと同じ PNG を .tmp/note-figures/ に作る（目視の確認用）。
//
// note の本文の図は SVG が正本で、PNG は Git で追跡しない。投稿系（note-publish・note-update-body など）は
// 上げる直前に同じ変換（scripts/lib/note-figure-png.mjs）で PNG を作るので、普段このコマンドは要らない。
// SVG を直したあと、note での見え方を PNG で確かめたいときに使う。
//
// 使い方:
//   node scripts/build/render-note-figures.mjs content/note/技術士総監/4フェーズ学習法/img/figure-2-phases.svg
//   node scripts/build/render-note-figures.mjs content/note/技術士総監/4フェーズ学習法   # 下の figure-*.svg を全部
//
// 罠: 文字はシステムフォント（SVG の font-family の先頭は Hiragino Sans）で描くので、Mac 以外では書体が変わる。
// exit 0 = 1 件以上作った / exit 1 = 対象の SVG が 0 件
import { statSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { REPO_ROOT } from '../lib/repository-paths.mjs';
import { listFiles } from '../lib/fs-walk.mjs';
import { renderNoteFigure } from '../lib/note-figure-png.mjs';

const targets = process.argv.slice(2).flatMap((arg) => {
  const abs = resolve(REPO_ROOT, arg);
  if (statSync(abs, { throwIfNoEntry: false })?.isDirectory()) {
    return listFiles(abs).filter((f) => /[\\/]figure-[^\\/]+\.svg$/.test(f));
  }
  return /\.svg$/i.test(abs) ? [abs] : [];
});
if (!targets.length) {
  console.error('[render-note-figures] 対象の figure-*.svg が 0 件（SVG のパスか、それを含むディレクトリを渡す）');
  process.exit(1);
}
for (const svg of targets) console.log(relative(REPO_ROOT, renderNoteFigure(svg)));
console.log(`[render-note-figures] ${targets.length} 件を作った`);
