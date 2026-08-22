/**
 * トップページの資格カード（src/config/home-exam-cards.json）と
 * カテゴリ定義（src/config/categories.json）の整合を検査する。
 *
 * 背景（2026-06-15 制定）:
 *   ナビは categories.json から自動生成されるが、トップの資格カードは別管理だったため、
 *   公開済みの新資格（pe-first-stage 21本）がトップに出ていない事故が起きた。
 *   再発防止として「visible≠false かつ variant≠reference のカテゴリは必ず
 *   home-exam-cards.json にカードを持つ」ことを機械的に強制する。
 *
 * 不整合（赤落ち）条件:
 *   - visible≠false・variant≠reference のカテゴリに対応する home カードが無い
 *   - home カードの slug が categories.json に存在しない / visible:false / variant=reference
 *   - home カードに必須フィールドが欠落
 *
 * Usage: node scripts/check-home-exam-coverage.mjs
 */

import { readFileSync } from "node:fs";

const CATEGORIES = "src/config/categories.json";
const HOME_CARDS = "src/config/home-exam-cards.json";
const REQUIRED_FIELDS = ["slug", "order", "label", "en", "subtitle", "description", "nextExam", "stats"];

function load(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    console.error(`[check-home-exam-coverage] ✗ ${path} を読めません: ${e.message}`);
    process.exit(1);
  }
}

const categories = load(CATEGORIES);
const homeCards = load(HOME_CARDS);

const catBySlug = new Map(categories.map((c) => [c.slug, c]));
const homeSlugs = new Set(homeCards.map((c) => c.slug));
const errors = [];

// 1) トップに出すべきカテゴリ（visible≠false・variant≠reference）に home カードがあるか
for (const c of categories) {
  if (c.visible === false) continue;
  if (c.variant === "reference") continue;
  if (!homeSlugs.has(c.slug)) {
    errors.push(
      `カテゴリ "${c.slug}"（visible・variant=${c.variant}）が ${HOME_CARDS} に未掲載 ` +
        `→ トップの資格カードに出ません。意図的に出さない場合は categories.json で visible:false に。`,
    );
  }
}

// 2) home カードが正当なカテゴリを指しているか＋必須フィールド
for (const card of homeCards) {
  const cat = catBySlug.get(card.slug);
  if (!cat) {
    errors.push(`${HOME_CARDS} の "${card.slug}" が ${CATEGORIES} に存在しません。`);
  } else {
    if (cat.visible === false) {
      errors.push(`${HOME_CARDS} の "${card.slug}" は categories.json で visible:false（トップに出すべきでない）。`);
    }
    if (cat.variant === "reference") {
      errors.push(`${HOME_CARDS} の "${card.slug}" は variant=reference（資格カードに不適）。`);
    }
  }
  for (const f of REQUIRED_FIELDS) {
    if (card[f] === undefined) errors.push(`${HOME_CARDS} の "${card.slug}" に必須フィールド "${f}" が欠落。`);
  }
}

// 3) order の重複検出（カード並びが不定になるのを防ぐ）
const seenOrder = new Map();
for (const card of homeCards) {
  if (seenOrder.has(card.order)) {
    errors.push(`${HOME_CARDS} の order=${card.order} が重複（"${seenOrder.get(card.order)}" と "${card.slug}"）。`);
  } else {
    seenOrder.set(card.order, card.slug);
  }
}

if (errors.length) {
  console.error("[check-home-exam-coverage] ✗ トップの資格カードとカテゴリ定義に不整合:");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}

console.log(
  `[check-home-exam-coverage] ✓ トップ資格カード ${homeCards.length} 件と categories.json が整合`,
);
