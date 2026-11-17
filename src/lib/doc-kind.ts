/**
 * 記事の種類のラベル（受験ガイド・テキスト・用語・過去問・まとめ・演習・実務・法令・基準資料・解説）の唯一の実装。
 * 2026-11-17 に、テーマのページ（記事のメタから）と検索結果（公開 URL から）で別々に判定し、言葉も違っていたのをまとめた。
 * 言葉はテーマのページのもの（運営者判断）。台帳を読まないので client の部品（検索結果）からも使える。
 */

const BY_GROUP: Record<string, string> = {
  guide: '受験ガイド',
  textbook: 'テキスト',
  keyword: '用語',
  primary: '過去問',
  secondary: '過去問',
  'past-exam': '過去問',
  pillar: 'まとめ',
};

/** 公開 URL の記事型のセグメント（/exam/<資格>/<段>/…）→ frontmatter の group */
const SEGMENT_GROUP: Record<string, string> = {
  guide: 'guide',
  textbook: 'textbook',
  keywords: 'keyword',
  primary: 'primary',
  secondary: 'secondary',
  'past-exams': 'past-exam',
  pillar: 'pillar',
};

/** テーマのページで「はじめに読む」に優先して出す種類（受験ガイドと実務）。ラベルの言葉はここと docKindLabel が同じ値を返す */
export const ENTRY_KIND_LABELS: readonly string[] = [BY_GROUP.guide!, '実務'];

/** 記事のメタ（category・group）から種類のラベルを決める */
export function docKindLabel(doc: { readonly category?: string | undefined; readonly group?: string | undefined }): string {
  if (doc.category === 'laws') return '法令';
  if (doc.category === 'civil-practice') return '実務';
  if (doc.category === 'reference-materials') return '基準資料';
  if (doc.category === 'concrete-engineer' && doc.group === 'primary') return '演習';
  return BY_GROUP[String(doc.group)] ?? '解説';
}

/** 公開 URL（検索結果など、メタを持たない所）から種類のラベルを決める。category は URL から決めたもの */
export function docKindLabelFromPath(path: string, category: string): string {
  if (path.startsWith('/laws/')) return docKindLabel({ category: 'laws' });
  if (path.startsWith('/practice/')) return docKindLabel({ category: 'civil-practice' });
  if (path.startsWith('/standards/')) return docKindLabel({ category: 'reference-materials' });
  const segment = path.match(/^\/exam\/[^/]+\/([^/]+)\//)?.[1];
  return docKindLabel({ category, group: segment ? SEGMENT_GROUP[segment] : undefined });
}
