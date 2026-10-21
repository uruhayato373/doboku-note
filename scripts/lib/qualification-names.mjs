/**
 * qualification-names.mjs — registry（qualification-registry.json の中身）から資格の名前と並びを引く純粋関数。
 *
 * ファイルを読まないのでサイト（src/lib/qualification-names.ts）・管理画面・スクリプトのどこからでも使える。
 * 読み込みは qualification-registry.mjs の loadRegistry（Node）か、JSON の import（Next.js）で行う。
 * 名前を画面やコードに写さず、必ずここを通す（npm run check-qualification-ssot が写しを止める）。
 */

/** 資格を registry の並び順で返す（portfolio で絞れる）。画面の並びは全てこの順にする */
export function orderedQualifications(registry, portfolio = null) {
  return (registry.qualifications ?? []).filter((q) => !portfolio || q.portfolio === portfolio);
}

/**
 * 画面の並び順の位置（0 始まり）。資格は registry の qualifications の位置、group はメンバーの最小、
 * ファミリーはそのファミリーの資格の最小。registry に無い id は null（画面側の order をそのまま使う）
 */
export function qualificationRank(registry, id) {
  const qs = registry.qualifications ?? [];
  const pos = (qid) => qs.findIndex((q) => q.id === qid);
  if (pos(id) >= 0) return pos(id);
  const members = registry.groups?.[id]?.members ?? qs.filter((q) => q.family === id).map((q) => q.id);
  const ranks = members.map(pos).filter((i) => i >= 0);
  return ranks.length ? Math.min(...ranks) : null;
}

/** 資格 id か group id（registry.groups）の項目。どちらでもなければ null */
function entry(registry, id) {
  return registry.qualifications?.find((q) => q.id === id) ?? (registry.groups?.[id] ? { id, ...registry.groups[id] } : null);
}

/** id が資格・group・ファミリーのどれかとして registry にあるか（設定の qualification: 参照の検査に使う） */
export function isQualificationRef(registry, id) {
  return Boolean(entry(registry, id) || registry.families?.[id]);
}

/** 資格（または group）の正式名。資格ファミリーは families の名前。未知の id は id のまま */
export function qualificationLabel(registry, id) {
  return entry(registry, id)?.label ?? registry.families?.[id] ?? id;
}

/** 画面の短い名前（shortLabel、無ければ正式名）。資格ファミリーは familyShortLabels、無ければ families */
export function qualificationShortLabel(registry, id) {
  const q = entry(registry, id);
  if (q) return q.shortLabel || q.label;
  return registry.familyShortLabels?.[id] ?? registry.families?.[id] ?? id;
}

/** バッジ・カバーのリード代替・狭い列に出すごく短い名前（badgeLabel → shortLabel → label） */
export function qualificationBadgeLabel(registry, id) {
  const q = entry(registry, id);
  return q?.badgeLabel || qualificationShortLabel(registry, id);
}
