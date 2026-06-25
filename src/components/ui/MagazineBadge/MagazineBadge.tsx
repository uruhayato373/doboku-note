import type { ReactNode } from "react";

interface MagazineBadgeProps {
  readonly children: ReactNode;
}

/**
 * マガジンカードの種別バッジ（brand 背景・カード画像左上に絶対配置）。
 * MagazineInlineCard（横長・本文用）と MagazineSidebarPromoCard（縦長・サイドバー用）で共有。
 * 親側の画像コンテナは `relative` を持つこと。
 */
export default function MagazineBadge({ children }: MagazineBadgeProps) {
  return (
    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[10px] font-medium text-white rounded-sm shadow-sm bg-brand">
      {children}
    </div>
  );
}
