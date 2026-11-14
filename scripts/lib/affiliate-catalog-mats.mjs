/**
 * 提携台帳の素材を広告リンクの許可情報へ変換する。URL の正本は catalog.creatives。
 * 旧リンクの surfaces・期限は registry に残し、note 用リンクのサイト分離を保つ。
 */
import { linkKeys } from './affiliate-link-keys.mjs';

export function catalogMatEntries(catalog, { activeOnly = false } = {}) {
  const entries = [];
  for (const [program, p] of Object.entries(catalog?.programs ?? {})) {
    if (p.redLine || (activeOnly && p.placement !== 'active')) continue;
    for (const c of p.creatives ?? []) {
      if (c.avoid || p.asps?.[c.asp]?.status !== 'approved') continue;
      for (const mat of new Set(linkKeys(c.href))) {
        entries.push({ mat, program, label: p.label, surfaces: [], expiresAt: null });
      }
    }
  }
  return entries;
}

export function affiliateMatEntries(catalog, legacy = [], options) {
  const result = new Map(catalogMatEntries(catalog, options).map(m => [m.mat, m]));
  for (const m of legacy) {
    if (result.has(m.mat) && result.get(m.mat).program !== m.program) throw new Error(`素材 ${m.mat} の案件が台帳と許可情報で異なる`);
    result.set(m.mat, m);
  }
  return [...result.values()];
}

/** 許可として読む前に、台帳のリンク・ピクセルの組とサイト帰属を検査する。 */
export function validateCatalogCreatives(catalog) {
  const errors = [];
  let checked = 0;
  for (const [program, p] of Object.entries(catalog?.programs ?? {})) {
    for (const c of p.creatives ?? []) {
      checked++;
      const key = `${program}/${c.asp}/${c.materialId}`;
      const hrefKeys = linkKeys(c.href);
      const pixelKeys = linkKeys(c.pixelSrc);
      if (p.redLine || p.asps?.[c.asp]?.status !== 'approved') errors.push(`${key}: 未提携または配置禁止の素材`);
      if (['a8', 'moshimo'].includes(c.asp)) {
        if (hrefKeys.length !== 1 || pixelKeys.length !== 1 || hrefKeys[0] !== pixelKeys[0]) errors.push(`${key}: リンクとピクセルの素材が一致しない`);
      }
      if (c.asp === 'a8' && c.imageSrc && new URL(c.imageSrc).searchParams.get('wid') !== '002') errors.push(`${key}: A8 の画像が doboku-note の素材でない`);
      if (c.asp === 'moshimo') {
        const href = new URL(c.href);
        const pixel = new URL(c.pixelSrc);
        if (href.searchParams.get('a_id') !== pixel.searchParams.get('a_id')) errors.push(`${key}: もしものリンクとピクセルのサイトが異なる`);
        if (href.searchParams.get('p_id') !== String(p.asps.moshimo.promotionId)) errors.push(`${key}: もしもの案件 ID が提携記録と異なる`);
      }
    }
  }
  return { checked, errors };
}
