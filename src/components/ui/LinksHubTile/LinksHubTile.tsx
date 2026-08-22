import Link from 'next/link';

/**
 * LinksHubTile — 「note 有料教材まとめ（/links）」への内部リンクタイル。
 *
 * 旧 links-hub-sidebar.webp（焼き込み画像）を置き換える画像レス版。全資格横断のハブなので
 * 単一資格のブランドイラストは使わず、accent トーンのテキストタイルにする。内部遷移（同タブ・Link）
 * だが note 教材ファネルの入口のため data-cta="note" で計測する。
 */
export default function LinksHubTile({
  trackLabel,
}: {
  readonly trackLabel: string;
}) {
  return (
    <Link
      href="/links"
      data-cta="note"
      data-cta-label={trackLabel}
      className="focus-ring not-prose group flex items-center gap-3 rounded-card-content border border-[var(--rule-soft)] bg-[var(--accent-fill)] px-4 py-3.5 shadow-card-content transition-shadow hover:border-brand dark:hover:border-brand hover:shadow-card-hover"
    >
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--accent)]">
          note 有料教材
        </div>
        <div className="text-[15px] font-black leading-tight text-ink-strong">
          教材まとめ・全資格ハブ
        </div>
        <div className="mt-0.5 text-[12px] leading-snug text-ink-muted">
          模範答案集・精読ガイド・施工経験記述
        </div>
      </div>
      <span aria-hidden className="shrink-0 text-brand-deep dark:text-brand">
        &rarr;
      </span>
    </Link>
  );
}
