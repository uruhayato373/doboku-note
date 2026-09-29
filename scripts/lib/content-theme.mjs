/**
 * content-theme.mjs — 制作物の「テーマ」（資格・資格ファミリー・資格以外の話題）を決める唯一の実装（DN-0437）。
 *
 * 語彙とルールの正本は .claude/config/content-themes.json、資格の名前は qualification-registry.json。
 * note の記事は content/note/ 直下のフォルダ名をそのまま資格として扱っていたため、資格のフォルダに
 * 置いた転職・キャリアの記事が資格の記事として数えられていた。ここではフォルダを動かさず、ルールで写す。
 * 管理画面（tools/admin-app）と検査が同じ関数を使う。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const UNCLASSIFIED = null;

/** テーマの一覧（id → { id, label, kind }）とチャネルごとのルールを読む。 */
export function loadThemes(root) {
  const cfg = JSON.parse(readFileSync(join(root, '.claude/config/content-themes.json'), 'utf8'));
  const registry = JSON.parse(readFileSync(join(root, '.claude/config/qualification-registry.json'), 'utf8'));
  return buildThemes(cfg, registry);
}

/** 設定と資格台帳からテーマの一覧を組み立て、ルールが未知のテーマを指していないか確かめる。 */
export function buildThemes(cfg, registry) {
  const themes = new Map();
  for (const q of registry.qualifications ?? []) themes.set(q.id, { id: q.id, label: q.label, kind: 'qualification' });
  for (const [id, label] of Object.entries(registry.families ?? {})) {
    if (!themes.has(id)) themes.set(id, { id, label, kind: 'family' });
  }
  for (const t of cfg.topics ?? []) themes.set(t.id, { id: t.id, label: t.label, kind: 'topic' });
  const rules = cfg.rules ?? {};
  for (const [channel, list] of Object.entries(rules)) {
    for (const r of list) {
      if (!themes.has(r.theme)) throw new Error(`content-themes.json: rules.${channel} が未知のテーマ ${r.theme} を指している`);
    }
  }
  return { themes, rules };
}

/**
 * note の記事をテーマへ写す。
 * @param {{ themes: Map, rules: object }} ctx loadThemes の戻り値
 * @param {string} rel content/note からの相対パス（区切りは / でも \ でもよい）
 * @param {Record<string, unknown>} fm frontmatter（上書きは contentTheme:。theme: は総監・建設部門の記事が出題テーマ名に使っているので読まない）
 * @returns {string|null} テーマ id。どのルールにも当たらなければ null（未分類）
 */
export function classifyNote(ctx, rel, fm = {}) {
  const path = String(rel).replace(/\\/g, '/').replace(/^\/+/, '');
  const override = typeof fm.contentTheme === 'string' ? fm.contentTheme.trim() : '';
  if (override) return ctx.themes.has(override) ? override : UNCLASSIFIED;
  const utm = typeof fm.utmCampaign === 'string' ? fm.utmCampaign : '';
  for (const r of ctx.rules.note ?? []) {
    if (r.utmCampaignPrefix && !utm.startsWith(r.utmCampaignPrefix)) continue;
    if (r.pathPrefix && !path.startsWith(r.pathPrefix)) continue;
    if (!r.utmCampaignPrefix && !r.pathPrefix) continue;
    return r.theme;
  }
  return UNCLASSIFIED;
}

/** テーマ id の表示名。未分類は '未分類'。 */
export function themeLabel(ctx, id) {
  if (!id) return '未分類';
  return ctx.themes.get(id)?.label ?? id;
}
