import LinkTile from '@/components/ui/LinkTile/LinkTile';
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
          <LinkTile
            href={e.href}
            title={e.state}
            description={`最初に必要なこと: ${e.first}`}
            className="bg-(--paper)"
            data={{ 'data-cta': 'career-need', 'data-cta-label': e.need, 'data-cta-placement': 'career-hub' }}
          >
            {/* 行き先の名前 */}
            <span className="mt-2 block text-[13px] font-medium text-brand">{e.label}</span>
          </LinkTile>
        </li>
      ))}
    </ul>
  );
}
