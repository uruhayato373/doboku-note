/**
 * 資格の名前と並び ── サイト（Next.js）向けラッパー。
 *
 * 正本は config/qualification-registry.json、引き方の実装は scripts/lib/qualification-names.mjs
 * （スクリプト・管理画面と同じ関数）。サイトのコードに資格名を直書きせず、ここから引く
 * （npm run check-qualification-ssot が直書きを止める）。
 */
import registry from '../../config/qualification-registry.json';
import {
  isQualificationGroupMember,
  qualificationLabel as labelOf,
  qualificationShortLabel as shortOf,
} from '../../scripts/lib/qualification-names.mjs';

/** 正式名（例: 技術士（総合技術監理部門））。資格 id・group id・ファミリー id を受ける */
export const qualificationLabel = (id: string): string => labelOf(registry, id);
/** 画面の短い名前（例: 技術士 総監） */
export const qualificationShortLabel = (id: string): string => shortOf(registry, id);
/** 1級・2級土木（registry の groups.civil-construction-1-2）の資格か。資格 id を並べて書かずにこれで判定する */
export const isCivilConstructionCategory = (id: string | null | undefined): id is string =>
  isQualificationGroupMember(registry, 'civil-construction-1-2', id);
