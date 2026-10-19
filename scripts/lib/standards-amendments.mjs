/**
 * standards-amendments.mjs — 地方の訂正・追加表（中国地方整備局版）を原本と照合して組み直した行データの読み書きと照合。
 *
 * 中国地方整備局版（chugoku/local）は、共通仕様書の条ごとの訂正・追加を 5 列の表
 * （編章節条・項以下・見出し・訂正・追加・訂正又は追加仕様事項）で並べた文書。pdftotext の版面は列がずれて
 * 文の断片が入れ替わるので、テキストからは行を組み直せない。ページ画像を見て 1 ページ 1 ファイルの JSON に
 * 組み直す（content/sources/standards/amendments/{agency}-{document}/pNNNN.json）。
 *
 * 規則は表の組み直し（content/sources/standards/tables/README.md）と同じ:
 *   - 文字は版面が正、構造は画像が正。そのページの版面の文字（空白を除く）と、JSON に書いた文字列の
 *     文字が**多重集合で一致**する（並べ替えは自由、追加・欠落は 1 文字も不可）
 *   - 承認（review.status = approved）されたページだけを生成器が使う
 *
 * ページの JSON:
 *   page      PDF のページ番号
 *   group     ページ先頭の `【第１編 共通編 第１章 総則 関係】`（版面どおり）
 *   chapters  group が指す章（`1-1`。2 章を書くページは 2 つ）
 *   columns   列の見出しの行（`編章節条 項以下 見出し 訂正・追加 訂正又は追加仕様事項`。版面どおり・無ければ null）
 *   extras    表の外の文字（表紙の題名・前文・`Ⅰ 共通仕様書編・様式集` など）: [{ role, text }]
 *   entries   表の行。1 行 = 1 件の訂正・追加（訂正・追加の欄に 1 つの印）
 *     continued   前のページの最後の行の続き（行の欄の文字を前の行に足す）
 *     article     編章節条の欄の番号（`1-1-1-3`）。空欄（上の行と結合）は null＝前の行を引き継ぐ。条番号でない書き方
 *                 （`3-追加`・`追加`）も版面どおり書く（その行は条に当たらないものとして章末に出す）。範囲
 *                 （`3-2-3-13～3-2-3-16`）は先頭の条に置く。3 段（`1-3-2`）は編-章-節で、その節の冒頭に置く
 *     articleTitle 条の題名（`設計図書の照査等`）。null＝引き継ぐ
 *     clause      項以下（`34`・`追加`）
 *     heading     見出し
 *     kind        訂正・追加の欄（`追-1`・`追加`・`訂正`）。原本で空欄なら 
 *     body        仕様事項の段落の配列（折り返しはつなぐ。箇条・URL は 1 要素ずつ）。欄の中の小さな表は
 *                 { table: [[セル, …], …] }（1 行目が見出し）。
 *                 原本に画像として貼り込まれ、テキスト層に文字が無いもの（p8・p31・p36・p49 の表、p11・p44・p45 の図）は
 *                 source: "image" を付けて画像から起こす: { table, source }・{ list: [...], source }・{ text, source }・
 *                 { figure: { file, alt, width, height }, source }（file は章記事の img/ に置いた webp）。
 *                 source: "image" の要素は版面に無い文字なので照合の対象から外し、画像と照合する（QA）
 *     joinFirst   continued の行で、body[0] が前のページの最後の段落の続き（文の途中で改ページ）
 *   review    { status: draft|approved|rejected, by, at, note }
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { CONTENT_SOURCES_ROOT } from './repository-paths.mjs';

export const AMENDMENTS_ROOT = join(CONTENT_SOURCES_ROOT, 'standards', 'amendments');
/** 章記事に差し込んだ訂正・追加を囲む目印。検査は本文の表・段落の数からこの範囲を除く */
export const AMENDMENT_BLOCK_START = '{/* amendments:start */}';
export const AMENDMENT_BLOCK_END = '{/* amendments:end */}';
/** 章記事の Markdown から差し込んだ訂正・追加を除く（本文だけを数える検査のため）。 */
export const stripAmendmentBlocks = (markdown) =>
  markdown.replace(/\{\/\* amendments:start \*\/\}[\s\S]*?\{\/\* amendments:end \*\/\}\n*/g, '');

export const amendmentDir = (documentKey) => join(AMENDMENTS_ROOT, documentKey.replace('/', '-'));
export const pageFileName = (page) => `p${String(page).padStart(4, '0')}.json`;

const ENTRY_TEXT_FIELDS = ['article', 'articleTitle', 'clause', 'heading', 'kind'];

/** JSON に書いた文字列（照合の対象）を全部並べる。 */
export function pageStrings(data) {
  const out = [];
  if (data.group) out.push(data.group);
  if (data.columns) out.push(data.columns);
  for (const extra of data.extras ?? []) out.push(extra.text);
  for (const entry of data.entries ?? []) {
    for (const field of ENTRY_TEXT_FIELDS) if (typeof entry[field] === 'string') out.push(entry[field]);
    for (const paragraph of entry.body ?? []) {
      if (typeof paragraph === 'string') out.push(paragraph);
      else if (paragraph?.source === 'image') continue; // 画像から起こした文字は版面に無い
      else for (const row of paragraph?.table ?? []) out.push(...row);
    }
  }
  return out;
}

const charCounts = (text) => {
  const counts = new Map();
  for (const ch of text.replace(/[\s　]/g, '')) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  return counts;
};

/**
 * 版面の文字と JSON の文字を多重集合で比べる。missing＝版面にあって JSON に無い、extra＝JSON にあって版面に無い。
 * @returns {{ ok: boolean, missing: string, extra: string, layoutChars: number }}
 */
export function compareChars(layoutText, strings) {
  const want = charCounts(layoutText);
  const got = charCounts(strings.join(''));
  let missing = '';
  let extra = '';
  for (const [ch, n] of want) {
    const diff = n - (got.get(ch) ?? 0);
    if (diff > 0) missing += ch.repeat(diff);
  }
  for (const [ch, n] of got) {
    const diff = n - (want.get(ch) ?? 0);
    if (diff > 0) extra += ch.repeat(diff);
  }
  let layoutChars = 0;
  for (const n of want.values()) layoutChars += n;
  return { ok: !missing && !extra, missing, extra, layoutChars };
}

const toAscii = (text) =>
  String(text)
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[－‐‑–—ー−]/g, '-')
    .replace(/[\s　]/g, '');

/** 3 段の番号（編-章-節 `1-3-2`）を節として読む。範囲・題名つきでも先頭だけ。節でなければ null。 */
export function normalizeSection(article) {
  if (typeof article !== 'string') return null;
  // `6-8-3-追加`（第6編第8章第3節への追加）も節として読む。4 段目が数字のもの（条）は除く
  const match = toAscii(article).match(/^(\d+-\d+-\d+)(?!-?\d)/);
  return match ? match[1] : null;
}

/** 条番号の表記（全角・ハイフンの揺れ）を `1-1-1-3` にそろえる。範囲（`3-2-3-13～3-2-3-16`）は先頭。条番号でなければ null。 */
export function normalizeArticle(article) {
  if (typeof article !== 'string') return null;
  const match = toAscii(article).match(/^(\d+-\d+-\d+-\d+)(?:[～〜~].*)?$/);
  return match ? match[1] : null;
}

const isStrings = (value) => Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'string' && item.trim());
/** body の 1 要素が決まった形か。 */
function bodyItemOk(item) {
  if (typeof item === 'string') return Boolean(item.trim());
  if (!item || typeof item !== 'object') return false;
  if (item.source !== undefined && item.source !== 'image') return false;
  if (Array.isArray(item.table)) {
    return item.table.length > 0 && item.table.every((row) => Array.isArray(row) && row.every((cell) => typeof cell === 'string'));
  }
  if (item.source !== 'image') return false;
  if (item.list) return isStrings(item.list);
  if (item.text !== undefined) return typeof item.text === 'string' && Boolean(item.text.trim());
  if (item.figure) {
    const { file, alt, width, height } = item.figure;
    return /^[a-z0-9-]+\.webp$/.test(file ?? '') && typeof alt === 'string' && alt.trim() && Number.isInteger(width) && Number.isInteger(height);
  }
  return false;
}

/** 画像から起こした要素（source: "image"）と図のファイル名を数える。 */
export function imageItemsOf(data) {
  const items = [];
  for (const entry of data.entries ?? []) for (const item of entry.body ?? []) if (item?.source === 'image') items.push(item);
  return items;
}

/**
 * 1 ページの形を検査する（文字の照合は別）。違反の文の配列を返す。
 * @param {object} data
 * @param {{ page: number }} expect
 */
export function validatePageShape(data, { page }) {
  const errors = [];
  if (data.page !== page) errors.push(`page が ${data.page}（ファイルは p${page}）`);
  if (!Array.isArray(data.entries)) errors.push('entries が配列でない');
  if (!Array.isArray(data.chapters) || data.chapters.some((id) => !/^\d+-\d+$/.test(id))) errors.push('chapters は `編-章` の配列');
  if (!['draft', 'approved', 'rejected'].includes(data.review?.status)) errors.push('review.status が draft|approved|rejected でない');
  (data.entries ?? []).forEach((entry, i) => {
    const where = `entries[${i}]`;
    if (entry.continued && i !== 0) errors.push(`${where}: continued は先頭の行だけ`);
    if (!entry.continued && typeof entry.kind !== 'string') errors.push(`${where}: kind（訂正・追加の欄）は文字列（原本で空欄なら ""）`);
    if (entry.joinFirst && !entry.continued) errors.push(`${where}: joinFirst は continued の行だけ`);
    if (!Array.isArray(entry.body)) errors.push(`${where}: body が配列でない`);
    for (const p of entry.body ?? []) {
      if (!bodyItemOk(p)) errors.push(`${where}: body に空の段落か、決まった形（文字列・table・image の list/text/figure）でない要素`);
    }
    if (entry.article === '') errors.push(`${where}: article の空欄は null（空文字にしない）`);
    for (const field of ENTRY_TEXT_FIELDS) {
      if (entry[field] !== undefined && entry[field] !== null && typeof entry[field] !== 'string') errors.push(`${where}: ${field} は文字列か null`);
    }
  });
  return errors;
}

/** 1 文書のページ JSON を全部読む（ページ順）。 */
export function loadAmendmentPages(documentKey) {
  const dir = amendmentDir(documentKey);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => /^p\d{4}\.json$/.test(name))
    .sort()
    .map((name) => ({ file: join(dir, name), data: JSON.parse(readFileSync(join(dir, name), 'utf8')) }));
}

/**
 * 承認済みのページを行（件）の列へ畳む。continued は前の行へ足し、空欄の条番号・条の題名は前の行から引き継ぐ。
 * 承認済みでないページが途中にあると引き継ぎが崩れるので、承認済みの連続した範囲だけを返す（範囲外は呼び出し側が数える）。
 * @returns {{ entries: Array<object>, pages: number[] }}
 */
export function resolveAmendmentEntries(pages) {
  const entries = [];
  const used = [];
  let previous = null;
  for (const { data } of pages) {
    if (data.review?.status !== 'approved') {
      previous = null;
      continue;
    }
    used.push(data.page);
    for (const entry of data.entries) {
      if (entry.continued) {
        if (!previous) continue;
        for (const field of ['articleTitle', 'clause', 'heading']) {
          if (typeof entry[field] === 'string' && entry[field]) previous[field] = `${previous[field] ?? ''}${entry[field]}`;
        }
        const body = [...entry.body];
        if (entry.joinFirst && typeof body[0] === 'string' && typeof previous.body.at(-1) === 'string') {
          previous.body[previous.body.length - 1] += body.shift();
        }
        // ページをまたぐ表（p13→p14 の主任技術者の資格表）は、続きの表の行を前の表の行として足す。
        // joinFirst なら続きの表の 1 行目は前の表の最後の行の続き（改ページで 1 行が割れた）なので、セルごとにつなぐ
        const last = previous.body.at(-1);
        if (Array.isArray(body[0]?.table) && Array.isArray(last?.table) && !body[0].source && !last.source) {
          const rows = [...body.shift().table];
          const table = [...last.table];
          if (entry.joinFirst && rows.length) {
            const tail = table.pop();
            const head = rows.shift();
            // 和文どうしは空白なしでつなぐ（`…のうち検` + `定種目…`）。境目が英数字なら 1 空白（`4500 万円以上` + `1 億…`）
            const glue = (a, b) => (a && b && (/[0-9A-Za-z]$/.test(a) || /^[0-9A-Za-z]/.test(b)) ? `${a} ${b}` : `${a}${b}`);
            table.push(tail.map((cell, i) => glue(cell, head[i] ?? '')));
          }
          previous.body[previous.body.length - 1] = { table: [...table, ...rows] };
        }
        previous.body.push(...body);
        if (!previous.pages.includes(data.page)) previous.pages.push(data.page);
        continue;
      }
      const article = entry.article ?? previous?.article ?? null;
      const articleTitle = entry.article ? (entry.articleTitle ?? null) : (entry.articleTitle ?? previous?.articleTitle ?? null);
      previous = {
        chapters: data.chapters,
        article,
        articleNumber: normalizeArticle(article),
        sectionNumber: normalizeArticle(article) ? null : normalizeSection(article),
        articleTitle,
        clause: entry.clause ?? null,
        heading: entry.heading ?? null,
        kind: entry.kind,
        body: [...entry.body],
        pages: [data.page],
      };
      entries.push(previous);
    }
  }
  return { entries, pages: used };
}

const toInt = (value) => Number(String(value).replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)));

/**
 * 訂正・追加の文書のページを、先頭に刷られた `【第１編 共通編 第１章 総則 関係】` で章へ束ねる
 * （1 ページに 2 章を書くこともある: `第１章 築堤・護岸，第３章 樋門・樋管 関係`）。表紙の次のページは題名・第1条・
 * 第2条の後（8 行目）に来るので、先頭の 12 行から探す。生成器と検査が同じ関数を使う。
 * @param {Array<{ page: number, lines: string[] }>} pages loadDocumentPages の戻り値
 * @returns {Map<string, number[]>} 章（`1-1`）→ ページ
 */
export function amendmentScopeByChapter(pages) {
  const byChapter = new Map();
  for (const page of pages) {
    const head = page.lines.filter((line) => line.trim()).slice(0, 12).join('\n');
    const group = head.match(/【\s*第\s*([0-9０-９]+)\s*編([^】]*?)関係\s*】/);
    if (!group) continue;
    for (const chapter of group[2].matchAll(/第\s*([0-9０-９]+)\s*章/g)) {
      const id = `${toInt(group[1])}-${toInt(chapter[1])}`;
      byChapter.set(id, [...(byChapter.get(id) ?? []), page.page]);
    }
  }
  return byChapter;
}

/** 行（件）が属する章。条番号があればその編・章、無ければページの【…関係】の最初の章。 */
export const amendmentChapterOf = (entry) => {
  const number = entry.articleNumber ?? entry.sectionNumber;
  return number ? number.split('-').slice(0, 2).join('-') : entry.chapters[0];
};

