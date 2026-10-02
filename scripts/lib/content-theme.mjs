/**
 * content-theme.mjs — 制作物の「テーマ」（資格・資格ファミリー・資格以外の話題）を決める唯一の実装（DN-0437）。
 *
 * 語彙とルールの正本は config/content-themes.json、資格の名前は qualification-registry.json、
 * 試験区分は exam-formats.json（lib/exam-stages.mjs）。splitByStage の資格は「資格:区分」のテーマに分ける。
 * note の記事は content/note/ 直下のフォルダ名をそのまま資格として扱っていたため、資格のフォルダに
 * 置いた転職・キャリアの記事が資格の記事として数えられていた。ここではフォルダを動かさず、ルールで写す。
 * 管理画面（tools/admin-app）と検査が同じ関数を使う。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { loadExamStages } from './exam-stages.mjs';
import { datasetPath } from './datasets.mjs';

export const UNCLASSIFIED = null;
/** 区分に分ける資格で、どの区分にも決まらない制作物の区分 id（例 civil-construction-1:common） */
export const COMMON_STAGE = 'common';

/** テーマの一覧（id → { id, label, kind }）とチャネルごとのルールを読む。 */
export function loadThemes(root) {
  const cfg = JSON.parse(readFileSync(join(root, datasetPath('config.content-themes')), 'utf8'));
  const registry = JSON.parse(readFileSync(join(root, datasetPath('config.qualification-registry')), 'utf8'));
  return buildThemes(cfg, registry, loadExamStages(root));
}

/** 設定と資格台帳からテーマの一覧を組み立て、ルールが未知のテーマを指していないか確かめる。 */
export function buildThemes(cfg, registry, examStages = new Map()) {
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
  if (cfg.shortLabels) throw new Error('content-themes.json: shortLabels は qualification-registry.json の shortLabel・familyShortLabels へ（名前を写さない）');
  // 短い名前は registry が正本（資格は shortLabel、ファミリーは familyShortLabels）
  const shortLabels = { ...(registry.familyShortLabels ?? {}) };
  for (const q of registry.qualifications ?? []) if (q.shortLabel) shortLabels[q.id] = q.shortLabel;
  const split = new Map();
  for (const id of cfg.splitByStage ?? []) {
    const stages = examStages.get(id) ?? [];
    if (!themes.has(id) || stages.length === 0) throw new Error(`content-themes.json: splitByStage の ${id} が未知のテーマか、exam-formats.json に区分が無い`);
    split.set(id, stages);
  }
  const keys = new Set([...examStages.values()].flat().map((st) => st.id));
  for (const [channel, list] of Object.entries(cfg.stageRules ?? {})) {
    for (const r of list) if (!keys.has(r.stage)) throw new Error(`content-themes.json: stageRules.${channel} が未知の区分 ${r.stage} を指している`);
  }
  return { themes, rules, shortLabels, split, stageRules: cfg.stageRules ?? {}, stageCommonLabel: cfg.stageCommonLabel ?? '全般' };
}

/**
 * テーマを区分つきのテーマにする。splitByStage に無い資格はそのまま返す。
 * 区分が 1 つに決まれば「資格:区分」、決まらない（0 個・複数）なら「資格:common」。
 * @param {string[]} stageIds 制作物が属する区分（商品はラインナップのマス、記事は classifyNoteStage）
 */
export function stageTheme(ctx, theme, stageIds) {
  const stages = theme ? ctx.split?.get(theme) : undefined;
  if (!stages) return theme;
  const hit = [...new Set(stageIds)].filter((id) => stages.some((st) => st.id === id));
  return `${theme}:${hit.length === 1 ? hit[0] : COMMON_STAGE}`;
}

/**
 * note の記事の区分。stageRules.note を上から当て、決まらなければ null。
 * @param {string} rel リポジトリ相対のパス（区切りは / でも \ でもよい）
 */
export function classifyNoteStage(ctx, rel) {
  const path = String(rel).replace(/\\/g, '/');
  for (const r of ctx.stageRules?.note ?? []) if (new RegExp(r.pattern).test(path)) return r.stage;
  return null;
}

/** 区分に分ける資格の枝（区分の順＋全般）。分けない資格は [theme] */
export function stageThemeIds(ctx, theme) {
  const stages = ctx.split?.get(theme);
  return stages ? [...stages.map((st) => `${theme}:${st.id}`), `${theme}:${COMMON_STAGE}`] : [theme];
}

/**
 * サイドメニューなどでテーマを並べる順（registry の資格の順 → 資格ファミリー → 話題。区分に分ける資格は区分の順＋全般）。
 * 画面ごとに件数順・ファイル順で並べず、全てこの順にする。
 */
export function orderedThemeIds(ctx) {
  return [...ctx.themes.keys()].flatMap((id) => stageThemeIds(ctx, id));
}

/** 「資格:区分」を分ける。区分の無いテーマは stage が null */
function splitThemeId(ctx, id) {
  const i = id.lastIndexOf(':');
  if (i < 0 || !ctx.split?.has(id.slice(0, i))) return { base: id, stage: null };
  return { base: id.slice(0, i), stage: id.slice(i + 1) };
}

function stageLabel(ctx, base, stage) {
  if (stage === COMMON_STAGE) return ctx.stageCommonLabel;
  return ctx.split.get(base)?.find((st) => st.id === stage)?.label ?? stage;
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

/** サイドメニュー用の短い名前（shortLabels に無ければ正式名）。 */
export function themeShortLabel(ctx, id) {
  if (!id) return '未分類';
  const { base, stage } = splitThemeId(ctx, id);
  if (stage) return `${ctx.shortLabels?.[base] ?? themeLabel(ctx, base)} ${stageLabel(ctx, base, stage)}`;
  return ctx.shortLabels?.[id] ?? themeLabel(ctx, id);
}

/** テーマ id の表示名。未分類は '未分類'。 */
export function themeLabel(ctx, id) {
  if (!id) return '未分類';
  const { base, stage } = splitThemeId(ctx, id);
  if (stage) return `${ctx.themes.get(base)?.label ?? base} ${stageLabel(ctx, base, stage)}`;
  return ctx.themes.get(id)?.label ?? id;
}
