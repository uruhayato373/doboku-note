import lineup from '../../config/product-lineup.json';
import { classifyProduct } from './product-classification.mjs';
import { getMagazine, NOTE_MAGAZINES, type MagazineId } from './note-magazines';

/** 形式は商品のIDで決める。価格・商品名・対象範囲は商品台帳だけが持つ。 */
const MATERIAL_RULES = [
  ['membership', /^civil-membership-/],
  ['oral', /oral/],
  ['reading', /reading-guide$/],
  ['pdf', /takuitsu.*pdf$/],
  ['notes', /anki-note$|ichiji-ronten$|r8-bunseki$/],
  ['practice', /mock3-pdf$|mix-.*practice$|r8-mc-50$|takuitsu-yosou-50$|^r8-essay-forecast$/],
  ['written', /^essay-.*-magazine$|experience-essay$|pastexam-essay$|combo-essay$|keiken-|koji-bank$|small-infra-|gakka-kijutsu$|essay-reiwa-pack$|^cd-(essay-magazine|structure-case-bank|road-bridge-pack|water-underground-pack|building-facility-pack|problem-[ab]-pack)$|^pe-construction-.*-magazine$|^rccm-mondai[13]-|^setsumon3-|^tradeoff-/],
  ['pack', /pack$/],
] as const;

export function classifyNoteProduct(id: string) {
  if (!getMagazine(id as MagazineId)) return null;
  const cells = classifyProduct(lineup.rules.note, id);
  const material = MATERIAL_RULES.find(([, pattern]) => pattern.test(id))?.[0];
  if (!cells?.length || !material) return null;
  const [qualification, stage] = cells[0]!.split(':');
  return { qualification: qualification!, stage: stage!, cells, material, family: `${qualification}-${material}` };
}

/** 商品台帳の対象範囲でページを照合する。複数一致は曖昧な配線として止める。 */
export function matchNoteProductPage(slug: string): MagazineId | null {
  const matches = Object.values(NOTE_MAGAZINES).filter(product =>
    getMagazine(product.id as MagazineId) && product.pageMatch && new RegExp(product.pageMatch).test(slug));
  if (matches.length > 1) throw new Error(`Ambiguous note products for ${slug}: ${matches.map(p => p.id).join(', ')}`);
  return matches[0]?.id as MagazineId | undefined ?? null;
}
