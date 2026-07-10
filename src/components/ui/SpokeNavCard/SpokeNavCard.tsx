import { BookmarkPlus } from "lucide-react";
import NavLinkCard from '@/components/ui/NavLinkCard';

interface SpokeNavCardProps {
  readonly href: string;
  readonly label: string;
  readonly title: string;
}

/**
 * SpokeNavCard — hub-spoke ナビ専用のコンパクトリンクカード。
 *
 * hub ページから個別 spoke (深掘りページ) へ誘導する用途。
 * SeeAlso（1 記事 5 個以内、汎用「あわせて読みたい」）と異なり、
 * テーマセクション末尾に並ぶ「定型ナビゲーション」として個数上限なし。
 *
 * 使い分け:
 * - <SeeAlso>: 文中で 1 件強調誘導 (5 個以内 / 「あわせて読みたい」ラベル + reason)
 * - <SpokeNavCard>: hub のテーマセクション末尾で spoke へのナビ (個数上限なし / label + title のみ)
 * - 本文 inline link: 軽い参照
 *
 * 1 ページに 9 個並ぶこともある（R8 予測 hub の T1-T9 が典型）。
 */
export default function SpokeNavCard({ href, label, title }: SpokeNavCardProps) {
  return (
    <NavLinkCard
      href={href}
      eyebrow={label}
      title={title}
      icon={BookmarkPlus}
      compact
      truncate
    />
  );
}
