// category（フルslug）→ OGP のテーマ色キー（note-cover-tokens.json の exams のキー）。
// 正本は src/config/categories.json の layout.ogpExamKey（DN-0793）。ogp-create（描画）と check-home-exam-coverage
// （網羅の検査）がここから読む。色そのものは note-cover-tokens.json の base が真実源で、ここは対応だけ。
// 表に無いカテゴリは枠色なしで出荷されるので、表示中のカテゴリには ogpExamKey が要る（2026-10-20 に測量士・舗装が漏れた）。
import { readFileSync } from 'node:fs';

const categories = JSON.parse(readFileSync(new URL('../../../../../../src/config/categories.json', import.meta.url), 'utf8'));

/** categories.json の行の配列 → { slug: ogpExamKey }（テストは架空のカテゴリを足した配列で呼ぶ） */
export function categoryExamKeys(rows) {
  return Object.freeze(Object.fromEntries(rows.filter((c) => c.layout?.ogpExamKey).map((c) => [c.slug, c.layout.ogpExamKey])));
}

export const CATEGORY_TO_EXAM_KEY = categoryExamKeys(categories);
