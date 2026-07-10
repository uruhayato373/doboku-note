import { BookOpenCheck } from "lucide-react";
import NavLinkCard from '@/components/ui/NavLinkCard';

interface SeeAlsoProps {
  readonly href: string;
  readonly title: string;
  readonly reason?: string;
}

/**
 * SeeAlso — 本文中の内部リンクを「併せて読みたい」カードとして強調するコンポーネント。
 *
 * Callout（1 記事 3 個ルール）から独立した、内部リンク専用の誘導カード。
 * 「ここで深掘りせず、別記事に集約しているもの」を本文中で目立たせる用途。
 *
 * 使い分け:
 * - 本文 inline link: 軽い参照（「詳細は [X] 参照」程度）
 * - SeeAlso: 別ページに論点を切り出していて、回遊を強く促したい時
 * - RelatedKeywords: 末尾の関連キーワード一覧（slate トーン）
 * - LinkCard: 外部 URL（メタデータ自動取得あり）
 *
 * 上限: 1 記事 5 個以内（content-principles 準拠、過剰な装飾を避ける）。
 */
export default function SeeAlso({ href, title, reason }: SeeAlsoProps) {
  return (
    <NavLinkCard
      href={href}
      eyebrow="あわせて読みたい"
      title={title}
      description={reason}
      icon={BookOpenCheck}
    />
  );
}
