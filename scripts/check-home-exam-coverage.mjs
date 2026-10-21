/**
 * トップページの資格カード（src/config/home-exam-cards.json）と
 * カテゴリ定義（src/config/categories.json）の整合を検査する。
 *
 * 背景（2026-06-15 制定）:
 *   ナビは categories.json から自動生成されるが、トップの資格カードは別管理だったため、
 *   公開済みの新資格（pe-first-stage 21本）がトップに出ていない事故が起きた。
 *   再発防止として「visible≠false かつ資格カテゴリ（variant=civil|pe）は必ず
 *   home-exam-cards.json にカードを持つ」ことを機械的に強制する。
 *
 *   variant=reference（公的資料の抜粋）と variant=general（資格に紐づかない実務コンテンツ）は
 *   資格カードの対象外。試験区分を持たないため、
 *   トップに出す場合も資格カードとは別の入口を用意する。
 *
 * 不整合（赤落ち）条件:
 *   - visible≠false・資格カテゴリ（civil|pe）に対応する home カードが無い
 *   - home カードの slug が categories.json に存在しない / visible:false / 非資格カテゴリ
 *   - home カードに必須フィールドが欠落
 *   - visible≠false のカテゴリが OGP のテーマ色の対応表（ogp-create の lib/category-exam-key.mjs）に無い、
 *     またはその色キーが note-cover-tokens.json に無い（DN-0786: 測量士・舗装の OGP が枠色なしで出ていた）
 *
 * Usage: node scripts/check-home-exam-coverage.mjs
 */

import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { REPO_ROOT } from "./lib/repository-paths.mjs";
import { runBody, isCliEntry, runAsCli } from './lib/cli-run.mjs';
import { CATEGORY_TO_EXAM_KEY } from '../.claude/skills/conversion/ogp-create/scripts/lib/category-exam-key.mjs';

const COVER_TOKENS = join(REPO_ROOT, '.claude/knowledge/design-system/note-cover-tokens.json');

/**
 * 表示中のカテゴリが OGP のテーマ色を持つか。表に無いと ogp-create は枠色なしで画像を作る。
 * @returns {{ checked: number, errors: string[] }}
 */
export function ogpCoverageErrors(categories, categoryToExamKey, coverTokens) {
  const errors = [];
  let checked = 0;
  for (const c of categories) {
    if (c.visible === false) continue;
    checked += 1;
    const key = categoryToExamKey[c.slug];
    if (!key) {
      errors.push(`カテゴリ "${c.slug}" が OGP の対応表（.claude/skills/conversion/ogp-create/scripts/lib/category-exam-key.mjs）に無い → OGP が枠色なしで出ます。`);
    } else if (!coverTokens.exams?.[key]?.base) {
      errors.push(`カテゴリ "${c.slug}" の色キー "${key}" が note-cover-tokens.json の exams に無い（base が無い）。`);
    }
  }
  return { checked, errors };
}

// in-process でも呼べるよう run() に包んである（DN-0688・pre-commit-dispatch が import して呼ぶ）。
// process.argv / process.exit / process.exitCode は runBody が渡す __argv / __exit / __status への読み替え。
// 本文は字下げしていない（複数行の文字列を壊さないため）。CLI として起動したときの引数・出力・終了コードは従来と同じ。
export async function run({ argv = process.argv.slice(2) } = {}) {
  return runBody(argv, import.meta.url, async ({ argv: __argv, exit: __exit, status: __status }) => {

const CATEGORIES = join(REPO_ROOT, "src/config/categories.json");
const HOME_CARDS = join(REPO_ROOT, "src/config/home-exam-cards.json");
const rel = (p) => relative(REPO_ROOT, p).split("\\").join("/");
// カードが持つのは並びと名前だけ（画面に出すのは名前のみ。説明文・試験日・件数は持たない）
const REQUIRED_FIELDS = ["slug", "order", "label"];

function load(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    console.error(`[check-home-exam-coverage] ✗ ${rel(path)} を読めません: ${e.message}`);
    __exit(1);
  }
}

const categories = load(CATEGORIES);
const homeCards = load(HOME_CARDS);

const catBySlug = new Map(categories.map((c) => [c.slug, c]));
const homeSlugs = new Set(homeCards.map((c) => c.slug));
const errors = [];

// 資格カードに載せる対象は資格カテゴリのみ（reference / general は別入口）
const NON_EXAM_VARIANTS = new Set(["reference", "general"]);

// 1) トップに出すべきカテゴリ（visible≠false・資格カテゴリ）に home カードがあるか
for (const c of categories) {
  if (c.visible === false) continue;
  if (NON_EXAM_VARIANTS.has(c.variant)) continue;
  if (!homeSlugs.has(c.slug)) {
    errors.push(
      `カテゴリ "${c.slug}"（visible・variant=${c.variant}）が ${rel(HOME_CARDS)} に未掲載 ` +
        `→ トップの資格カードに出ません。意図的に出さない場合は categories.json で visible:false に。`,
    );
  }
}

// 2) home カードが正当なカテゴリを指しているか＋必須フィールド
for (const card of homeCards) {
  const cat = catBySlug.get(card.slug);
  if (!cat) {
    errors.push(`${rel(HOME_CARDS)} の "${card.slug}" が ${rel(CATEGORIES)} に存在しません。`);
  } else {
    if (cat.visible === false) {
      errors.push(`${rel(HOME_CARDS)} の "${card.slug}" は categories.json で visible:false（トップに出すべきでない）。`);
    }
    if (NON_EXAM_VARIANTS.has(cat.variant)) {
      errors.push(`${rel(HOME_CARDS)} の "${card.slug}" は variant=${cat.variant}（資格カードに不適）。`);
    }
  }
  for (const f of REQUIRED_FIELDS) {
    if (card[f] === undefined) errors.push(`${rel(HOME_CARDS)} の "${card.slug}" に必須フィールド "${f}" が欠落。`);
  }
}

// 3) order の重複検出（カード並びが不定になるのを防ぐ）
const seenOrder = new Map();
for (const card of homeCards) {
  if (seenOrder.has(card.order)) {
    errors.push(`${rel(HOME_CARDS)} の order=${card.order} が重複（"${seenOrder.get(card.order)}" と "${card.slug}"）。`);
  } else {
    seenOrder.set(card.order, card.slug);
  }
}

// 4) 表示中のカテゴリが OGP のテーマ色を持つか
const ogp = ogpCoverageErrors(categories, CATEGORY_TO_EXAM_KEY, load(COVER_TOKENS));
errors.push(...ogp.errors);
if (ogp.checked === 0) errors.push('OGP の網羅を検査したカテゴリが 0 件（categories.json の読み込みを疑う）。');

if (errors.length) {
  console.error("[check-home-exam-coverage] ✗ トップの資格カードとカテゴリ定義に不整合:");
  for (const e of errors) console.error("  - " + e);
  __exit(1);
}

console.log(
  `[check-home-exam-coverage] ✓ トップ資格カード ${homeCards.length} 件と categories.json が整合・表示中のカテゴリ ${ogp.checked} 件が OGP のテーマ色を持つ`,
);
  });
}

if (isCliEntry(import.meta.url)) runAsCli(run);
