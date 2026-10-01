/**
 * 資格の名前と並び ── サイト（Next.js）向けラッパー。
 *
 * 正本は config/qualification-registry.json、引き方の実装は scripts/lib/qualification-names.mjs
 * （スクリプト・管理画面と同じ関数）。サイトのコードに資格名を直書きせず、ここから引く
 * （npm run check-qualification-ssot が直書きを止める）。
 */
import registry from '../../config/qualification-registry.json';
import {
  qualificationLabel as labelOf,
  qualificationShortLabel as shortOf,
  qualificationBadgeLabel as badgeOf,
} from '../../scripts/lib/qualification-names.mjs';

/** 正式名（例: 技術士（総合技術監理部門））。資格 id・group id・ファミリー id を受ける */
export const qualificationLabel = (id: string): string => labelOf(registry, id);
/** 画面の短い名前（例: 技術士 総監） */
export const qualificationShortLabel = (id: string): string => shortOf(registry, id);
/** バッジなど狭い場所のごく短い名前（例: 総監） */
export const qualificationBadgeLabel = (id: string): string => badgeOf(registry, id);
