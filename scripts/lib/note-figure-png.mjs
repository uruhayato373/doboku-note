/**
 * note-figure-png.mjs — note の本文の図は SVG が正本で、note へ上げる PNG は投稿の直前にここで作る（2026-11-19）。
 *
 * 原稿は `![](img/figure-x.png)` のまま PNG を指す（note は SVG を受け付けない）。同名の `.svg` があれば、
 * それが正本で、PNG は Git で追跡しない（.gitignore の content/note/**\/img/figure-*.png）。手元に古い PNG が
 * 残っていても使わない（SVG を直したのに古い図を上げる食い違いを起こさない）。
 * 同名の SVG が無い PNG（元の無い図・見本・元絵）は PNG 自体が正本で、今までどおり Git で追跡する。
 *
 * 変換: SVG の寸法の NOTE_FIGURE_SCALE 倍・白背景・システムフォント（SVG の font-family の先頭は Hiragino Sans）。
 * note へ書き込むのはログイン済みの Mac だけなので、フォントは同梱しない。変換の設定を変えたら
 * NOTE_FIGURE_RENDER_VERSION を上げる（再公開の判定 assetHash がこの値を含むので、全図が上げ直しの対象になる）。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { REPO_ROOT } from './repository-paths.mjs';
import { svgToPng } from '../sns/lib/svg-to-png.mjs';

export const NOTE_FIGURE_RENDER_VERSION = 1;
export const NOTE_FIGURE_SCALE = 2;
/** 作った PNG の置き場（毎回作り直す使い捨て） */
export const NOTE_FIGURE_OUT_DIR = join(REPO_ROOT, '.tmp', 'note-figures');

/** PNG の参照に同名の SVG があれば、その SVG のパス（正本）。無ければ null。 */
export function figureSvgFor(pngAbs) {
  if (!/\.png$/i.test(pngAbs)) return null;
  const svg = pngAbs.replace(/\.png$/i, '.svg');
  return existsSync(svg) ? svg : null;
}

/** SVG を PNG（Buffer）にする。 */
export function renderNoteFigureBuffer(svgAbs) {
  return svgToPng(readFileSync(svgAbs, 'utf8'), { zoom: NOTE_FIGURE_SCALE, background: '#ffffff' });
}

/**
 * SVG から PNG を作って書き、そのパスを返す。置き場は outDir の下にリポジトリ相対のパスで作る
 * （リポジトリの外の SVG は outDir 直下にファイル名で置く）。
 */
export function renderNoteFigure(svgAbs, { outDir = NOTE_FIGURE_OUT_DIR, root = REPO_ROOT } = {}) {
  const rel = relative(root, svgAbs);
  const name = (rel.startsWith('..') ? svgAbs.split(/[\\/]/).pop() : rel).replace(/\.svg$/i, '.png');
  const out = join(outDir, name);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, renderNoteFigureBuffer(svgAbs));
  return out;
}
