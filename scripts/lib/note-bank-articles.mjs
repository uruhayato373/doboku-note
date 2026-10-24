/**
 * note-bank-articles.mjs — 施工経験記述の「想定工事バンク」の単品記事の題名から、売上台帳の productId を引く索引。
 * ---------------------------------------------------------------------------
 * なぜ要るか（2026-10-24・DN-0817 の調査）: 単品記事の productId は、前に売れたときの記録（同じ題名）か手当表でしか
 * 解決できず、初めて売れた記事は `article:unknown-*` になっていた。unknown の売上は資格に分類できないので、
 * 書き戻しの commit が check-qualification-market で止まり、その回の取得（他の売上・アクセス）もまるごと捨てられた
 * （2026-10-22: 2級 工事65 小口径推進工法の ¥1,680 1 件で、login-collectors の note の書き戻し全体が落ちた）。
 * バンクの記事は 2 冊で 180 本を超え、初めて売れるたびに同じことが起きるので、ディレクトリの規則で引く。
 *
 * 規則（既存の売上の id と同じ）: 番号はディレクトリ名の数字をそのまま使う（工事08 → 08、工事105 → 105）。
 *   2級土木-想定工事バンク/工事NN-*      → article:civil-2-koji-bank-NN
 *   1級土木-経験記述-完全攻略パック/工事NN-* → article:civil-1-keiken-pack-NN
 * ---------------------------------------------------------------------------
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { frontmatterValue } from './note-attachments.mjs';
import { NOTE_CONTENT_ROOT } from './repository-paths.mjs';

export const BANKS = [
  { dir: join('1級・2級土木', '2級土木', 'magazines', '2級土木-想定工事バンク'), prefix: 'article:civil-2-koji-bank-' },
  { dir: join('1級・2級土木', '1級土木', 'magazines', '1級土木-経験記述-完全攻略パック'), prefix: 'article:civil-1-keiken-pack-' },
];

/** 題名の照合用の正規化（全角半角・空白のゆれを吸収） */
export const normalizeTitle = (title) => String(title || '').normalize('NFKC').replace(/\s+/g, ' ').trim();

/** ディレクトリ名（工事NN-…）から productId（pure）。規則に当たらなければ null */
export function bankProductId(dirName, prefix) {
  const m = /^工事(\d+)-/.exec(dirName);
  return m ? `${prefix}${m[1]}` : null;
}

/**
 * 題名（正規化）→ productId の索引。題名が重なる記事は曖昧なので索引に入れない（推定しない）。
 * @param {string} [noteRoot]
 * @returns {Map<string, string>}
 */
export function bankArticleIndex(noteRoot = NOTE_CONTENT_ROOT) {
  const index = new Map();
  const dup = new Set();
  for (const bank of BANKS) {
    const root = join(noteRoot, bank.dir);
    if (!existsSync(root)) continue;
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const id = bankProductId(entry.name, bank.prefix);
      const file = join(root, entry.name, 'article.md');
      if (!id || !existsSync(file)) continue;
      const title = normalizeTitle(frontmatterValue(readFileSync(file, 'utf8'), 'title'));
      if (!title) continue;
      if (index.has(title)) dup.add(title);
      index.set(title, id);
    }
  }
  for (const t of dup) index.delete(t);
  return index;
}
