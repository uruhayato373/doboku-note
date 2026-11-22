/**
 * category-breadcrumb.ts — 資格・領域のパンくずの先頭の段（唯一の規則・DN-1219）。
 * 資格試験の資格は「ホーム › 資格試験 › 資格」、実務・法令は資格ページが領域の入口を兼ねるので「ホーム › 資格」。
 * 記事の見出し（ArticleHeader）・資格トップ（CategoryPage）・構造化データの BreadcrumbList（StructuredData）が共用する。
 */
import { getAreaHubPath, getAreaLabel, getCategoryArea } from './content-taxonomy';

/** 資格名の前に並ぶ段（ホームと、資格試験なら領域の入口） */
export function categoryBreadcrumbHead(category: string | undefined): { label: string; href: string }[] {
  return [
    { label: 'ホーム', href: '/' },
    ...(category && getCategoryArea(category) === 'exam' ? [{ label: getAreaLabel('exam'), href: getAreaHubPath('exam') }] : []),
  ];
}
