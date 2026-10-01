/**
 * note-cover-category.mjs — note 記事のカバー画像分類を決める唯一の実装。
 * 語彙とルールの正本は config/note-cover-categories.json。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function loadNoteCoverCategories(root) {
  const cfg = JSON.parse(readFileSync(join(root, 'config/note-cover-categories.json'), 'utf8'));
  return buildNoteCoverCategories(cfg);
}

export function buildNoteCoverCategories(cfg) {
  const categories = new Map((cfg.categories ?? []).map((category) => [category.id, category]));
  const assertCategory = (id, at) => {
    if (!categories.has(id)) throw new Error(`note-cover-categories.json: ${at} が未知の分類 ${id} を指している`);
  };
  for (const [channel, rules] of Object.entries(cfg.rules ?? {})) {
    for (const rule of rules) assertCategory(rule.category, `rules.${channel}`);
  }
  for (const [theme, category] of Object.entries(cfg.defaults?.themeIds ?? {})) assertCategory(category, `defaults.themeIds.${theme}`);
  for (const [pricing, category] of Object.entries(cfg.defaults?.qualification ?? {})) assertCategory(category, `defaults.qualification.${pricing}`);
  return { categories, rules: cfg.rules ?? {}, defaults: cfg.defaults ?? {} };
}

/** @returns {string|null} カバー分類 id。未知の上書きや規則漏れは null（未分類）。 */
export function classifyNoteCover(ctx, rel, fm = {}, themeId = null, themeKind = null) {
  const path = String(rel).replace(/\\/g, '/').replace(/^\/+/, '');
  const override = typeof fm.coverCategory === 'string' ? fm.coverCategory.trim() : '';
  if (override) return ctx.categories.has(override) ? override : null;

  for (const rule of ctx.rules.note ?? []) {
    if (rule.pathPrefix && !path.startsWith(rule.pathPrefix)) continue;
    if (rule.noteSeries && fm.noteSeries !== rule.noteSeries) continue;
    if (!rule.pathPrefix && !rule.noteSeries) continue;
    return rule.category;
  }

  const byTheme = themeId ? ctx.defaults.themeIds?.[themeId] : null;
  if (byTheme) return byTheme;
  if (themeKind === 'qualification' || themeKind === 'family') {
    const pricing = fm.notePricing === 'paid' || fm.notePricing === 'membership' ? 'paid' : 'free';
    return ctx.defaults.qualification?.[pricing] ?? null;
  }
  return null;
}

export function noteCoverCategoryLabel(ctx, id) {
  if (!id) return '未分類';
  return ctx.categories.get(id)?.label ?? id;
}
