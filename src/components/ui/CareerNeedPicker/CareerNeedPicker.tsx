import Link from 'next/link';
import { CAREER_HUB_ENTRIES } from '@/config/career-pathways';

/**
 * CareerNeedPicker — キャリア hub の「いまの状態から読むページを選ぶ」入口。
 *
 * なぜ表ではなくコンポーネントか: 読者がどの悩みを選んだかを `career_need_select` として
 * 計測するため。MDX の Markdown 表ではリンクに `data-cta-*` を付けられず、hub→柱 の遷移が
 * 測れない（Phase 06 の評価が成立しない）。
 *
 * 各リンクに `data-cta="career-need"` / `data-cta-label={need}` / `data-cta-placement="career-hub"`
 * を付け、AnalyticsProvider のデリゲートリスナーが拾う。**個人情報は送らない**（need キーのみ）。
 *
 * 内容の真実源: src/config/career-pathways.ts の CAREER_HUB_ENTRIES
 */
export default function CareerNeedPicker() {
  return (
    <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {CAREER_HUB_ENTRIES.map((e) => (
        <li key={`${e.need}-${e.href}`}>
          <Link
            href={e.href}
            data-cta="career-need"
            data-cta-label={e.need}
            data-cta-placement="career-hub"
            className="block h-full rounded-card-content border border-[var(--rule-soft)] bg-[var(--paper)] px-4 py-3 transition-colors hover:border-brand dark:border-[var(--rule-soft)]"
          >
            <span className="block text-[15px] font-medium text-[var(--ink)]">{e.state}</span>
            <span className="mt-1 block text-[13px] text-[var(--ink-muted)]">
              最初に必要なこと: {e.first}
            </span>
            <span className="mt-2 block text-[13px] font-medium text-brand">{e.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
