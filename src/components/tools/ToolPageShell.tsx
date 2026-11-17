import type { ReactNode } from 'react';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import AffiliateSlot from '@/components/ui/AffiliateSlot/AffiliateSlot';
import { READING_CONTAINER } from '@/components/layout/container';

/**
 * 無料ツールのページの枠（帯の見出し・Tools までのパンくず・「無料ツール」のラベル・ページ末の転職の案内 1 枠）。
 * 2026-11-17 に 12 本の page.tsx が同じ組み立てを持っていたのをまとめた。中身（client のツール）は children。
 */
export default function ToolPageShell({ title, lead, children, affiliate = true }: {
  readonly title: ReactNode;
  readonly lead?: ReactNode;
  readonly children: ReactNode;
  /** ページ末の転職の案内（AffiliateSlot tool-end）。商品導線を自前で持つツールは false */
  readonly affiliate?: boolean;
}) {
  return (
    <PageShell variant="default">
      <PageHeader
        variant="band"
        width="760"
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Tools', href: '/tools' }]}
        label="無料ツール"
        title={title}
        {...(lead ? { lead } : {})}
      />
      {children}
      {/* 転職の案内（ページ末に 1 枠。案件は配置ルール） */}
      {affiliate && <AffiliateSlot page={{ pageKind: 'tool' }} slot="tool-end" className={`${READING_CONTAINER} pb-10`} />}
    </PageShell>
  );
}
