/**
 * standards-figures.mjs — 章記事の図（原本で画像になっている図・表）の切り出しの台帳（DN-0865）。
 *
 * 原本の図はテキスト層にキャプションしか無く、章記事は `**図3-3**` と `<SourceRef pages kind="figure" />`
 * だけを出していた。原本のページ画像（Drive vault の `{原本名}/pages/pNNNN.jpg`・270dpi）から図をタイトに
 * 切り出した webp を章記事の img/ に置き、どの図をどのページのどこから切ったかをこの台帳に残す。
 *
 *   台帳  content/sources/standards/{agency}/{document}/figures.json
 *   画像  content/site/standards-articles/{agency}/{document}/img/{file}（R2 へは main の r2-sync が送る）
 *
 * 台帳の 1 件:
 *   { chapterId, sourceRef, caption, imagePage, bbox: [x0, y0, x1, y1], file, width, height, review: { status, by, method } }
 *   - chapterId・sourceRef（SourceRef の pages の文字）・caption（キャプションの文字）の 3 つで章記事の図を指す
 *   - imagePage は切り出したページ。キャプションがページの末尾で図が次のページにあるときは sourceRef と違う
 *   - bbox は 270dpi のページ画像のピクセル。file の画像は bbox で切った後、幅 1200px を超えるものだけ縮めている
 *
 *   - 表の領域・組み直した表の中に出た図のキャプション（DN-0881）は、sourceRef にその表の SourceRef のページを書く
 *
 * 生成器（build-standard-articles.mjs）はこの台帳を読んでキャプションの位置に <ArticleImage> を差し込み、
 * check-standard-articles（検査 20）が「図の SourceRef ごとに画像がある」ことと、台帳と章記事の食い違いを見る。
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONTENT_SOURCES_ROOT, SITE_CONTENT_ROOT } from './repository-paths.mjs';

const STANDARDS_SOURCES_ROOT = join(CONTENT_SOURCES_ROOT, 'standards');
const ARTICLES_ROOT = join(SITE_CONTENT_ROOT, 'standards-articles');

export const figureLedgerPath = (documentKey) => join(STANDARDS_SOURCES_ROOT, ...documentKey.split('/'), 'figures.json');
export const figureImagePath = (documentKey, file) => join(ARTICLES_ROOT, ...documentKey.split('/'), 'img', file);
/** サイトの画像の src（/posts/ は R2 のキーと同じ・訂正・追加の図と同じ形） */
export const figureImageSrc = (documentKey, file) => `/posts/standards-articles/${documentKey}/img/${file}`;

/** キャプションの照合は空白（全角を含む）を無視する（版面の桁揃えの空白の数で外れないように） */
const normalizeCaption = (text) => text.replace(/[\s　]/g, '');
export const figureKey = (chapterId, sourceRef, caption) => `${chapterId}|${sourceRef}|${normalizeCaption(caption)}`;

/** 台帳を読む。無ければ null（図を持たない文書）。 */
export function loadFigureLedger(documentKey) {
  const path = figureLedgerPath(documentKey);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** 台帳の 1 件の形を検査して問題の一覧を返す（空なら正しい形）。 */
export function validateFigureEntry(entry) {
  const problems = [];
  for (const key of ['chapterId', 'sourceRef', 'caption', 'file']) {
    if (typeof entry[key] !== 'string' || !entry[key]) problems.push(`${key} が空`);
  }
  if (!Number.isInteger(entry.imagePage) || entry.imagePage < 1) problems.push('imagePage が正の整数でない');
  const bbox = entry.bbox;
  if (!Array.isArray(bbox) || bbox.length !== 4 || !bbox.every(Number.isInteger) || bbox[0] >= bbox[2] || bbox[1] >= bbox[3]) {
    problems.push('bbox が [x0, y0, x1, y1]（x0<x1・y0<y1 の整数）でない');
  }
  if (!Number.isInteger(entry.width) || !Number.isInteger(entry.height) || entry.width < 1 || entry.height < 1) problems.push('width・height が正の整数でない');
  if (typeof entry.file === 'string' && !/^[A-Za-z0-9][A-Za-z0-9._-]*\.webp$/.test(entry.file)) problems.push('file が webp のファイル名でない');
  if (entry.review?.status !== 'approved') problems.push(`照合で承認されていない（review.status=${entry.review?.status}）`);
  return problems;
}

/** 生成器用: (chapterId, sourceRef, caption) → 台帳の 1 件。承認された件だけを引く。重複は投げる。 */
export function figureLookup(documentKey) {
  const ledger = loadFigureLedger(documentKey);
  const byKey = new Map();
  for (const entry of ledger?.figures ?? []) {
    if (entry.review?.status !== 'approved') continue;
    const key = figureKey(entry.chapterId, entry.sourceRef, entry.caption);
    if (byKey.has(key)) throw new Error(`${figureLedgerPath(documentKey)}: 同じ図（${key}）が 2 件ある`);
    byKey.set(key, entry);
  }
  return (chapterId, sourceRef, caption) => byKey.get(figureKey(chapterId, sourceRef, caption)) ?? null;
}

/** 章記事に差し込む <ArticleImage>（alt はキャプション）。 */
export function renderFigureImage(documentKey, entry) {
  const alt = entry.caption.replace(/"/g, '&quot;');
  return `<ArticleImage src="${figureImageSrc(documentKey, entry.file)}" alt="${alt}" width="${entry.width}" height="${entry.height}" size="medium" />`;
}

/**
 * 図のキャプションの文字か（`図3-1`・`図 19 …`・`図−1 …`・`図５−２ …`・`図-4 …`）。図の番号を持たない
 * `図 一 覧`・`図書名` は図ではない。表の領域・組み直した表の中に出た図のキャプション（DN-0881）を拾うのに使う。
 */
export const isFigureCaption = (text) => /^図[\s　]*[-−－]?[\s　]*[0-9０-９]/.test(text);

/**
 * 章記事 1 本の図を数える（検査用）。
 * - `<SourceRef kind="figure">` ごとに、その直前のブロック（空行を除く）が <ArticleImage> かを見て、画像の file を返す。
 *   直前が画像でなければ file は null。
 * - 表の領域・組み直した表の中に出た図のキャプション（太字の 1 行で、図の番号を持つもの・DN-0881）は、
 *   直後のブロックが <ArticleImage> かを見る。sourceRef はその後ろで最初の `<SourceRef kind="table">` のページ
 *   （生成器が台帳を引くのと同じ値）。inTable: true を付ける。
 */
export function figureRefsOf(markdown) {
  const lines = markdown.split('\n');
  const refs = [];
  let inCode = false;
  lines.forEach((line, index) => {
    if (line.startsWith('```')) inCode = !inCode;
    if (inCode) return;
    const bold = line.match(/^\*\*(.+)\*\*$/)?.[1]?.replace(/\\(.)/g, '$1');
    if (bold && isFigureCaption(bold)) {
      let k = index + 1;
      while (k < lines.length && !lines[k].trim()) k += 1;
      // 図の SourceRef の直前のキャプション（下の分岐で数える）
      const imageLine = lines[k]?.match(/^<ArticleImage src="[^"]*\/img\/([^"/]+)"/);
      let n = imageLine ? k + 1 : k;
      while (n < lines.length && !lines[n].trim()) n += 1;
      if (/^<SourceRef pages="[^"]*" kind="figure" \/>$/.test(lines[n] ?? '')) return;
      let s = index + 1;
      while (s < lines.length && !/^<SourceRef /.test(lines[s])) s += 1;
      const sourceRef = lines[s]?.match(/^<SourceRef pages="([^"]*)" kind="table" \/>$/)?.[1] ?? null;
      refs.push({ line: index + 1, sourceRef, file: imageLine?.[1] ?? null, caption: bold, inTable: true });
      return;
    }
    const ref = line.match(/^<SourceRef pages="([^"]*)" kind="figure" \/>$/);
    if (!ref) return;
    let k = index - 1;
    while (k >= 0 && !lines[k].trim()) k -= 1;
    const image = lines[k]?.match(/^<ArticleImage src="[^"]*\/img\/([^"/]+)"/);
    // 画像の前がキャプション（太字の 1 行）
    let c = image ? k - 1 : k;
    while (c >= 0 && !lines[c].trim()) c -= 1;
    // 生成器が逃がした記号（escapeInline）を戻して台帳のキャプションと比べられるようにする
    const caption = lines[c]?.match(/^\*\*(.+)\*\*$/)?.[1]?.replace(/\\(.)/g, '$1') ?? null;
    refs.push({ line: index + 1, sourceRef: ref[1], file: image?.[1] ?? null, caption });
  });
  return refs;
}
