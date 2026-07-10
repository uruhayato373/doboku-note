import type { ReactNode } from "react";

interface MagazineBadgeProps {
  readonly children: ReactNode;
}

/**
 * マガジンカードの種別バッジ（brand 背景・カード画像左上に絶対配置）。
 * MagazineInlineCard（横長・本文用）で使用。記事末尾/サイドバーの縦タイルは
 * NoteMagazineTile が自前の HTML バッジを描く（本コンポーネントは使わない）。
 * 親側の画像コンテナは `relative` を持つこと。
 */
export default function MagazineBadge({ children }: MagazineBadgeProps) {
  return (
    <div className="absolute left-1.5 top-1.5 rounded-card-inline bg-brand px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm">
      {children}
    </div>
  );
}
