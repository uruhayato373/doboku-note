import { BookOpen, NotebookPen, PencilLine, Package } from 'lucide-react';

/**
 * 外部チャネルの識別アイコン。
 *
 * 方針（2026-07-28 決定）: **公式ロゴを使う**。ただしロゴは商標なので
 *  - 改変・着色・回転をしない（各社ブランドガイドラインの共通要件）
 *  - `public/images/brand/{note,coconala,brain}.svg` に原本を置き、そのまま原寸比で出す
 *  - 素材が未配置の間は lucide の汎用アイコンにフォールバックする（表示が壊れないようにする）
 *
 * 注意: 「note ロゴを使わない」という既存方針（handoff 2026-07-25）は
 * **リンクカードのサムネ画像に焼き込まない**という文脈のもので、`check-note-link-cards` も
 * `/images/note-links/*.webp` だけを検査する。ここで扱うのは別物の「サービス識別バッジ」。
 */
export type ServiceChannel = 'site' | 'note' | 'coconala' | 'brain';

/** 公式ロゴの配置先。ここにファイルを置けば自動でロゴ表示に切り替わる。 */
const LOGO_SRC: Partial<Record<ServiceChannel, string>> = {
  // note: '/images/brand/note.svg',
  // coconala: '/images/brand/coconala.svg',
  // brain: '/images/brand/brain.svg',
};

const FALLBACK_ICON = {
  site: BookOpen,
  note: NotebookPen,
  coconala: PencilLine,
  brain: Package,
} as const;

export default function ServiceIcon({
  channel,
  className = 'w-[18px] h-[18px] text-[var(--ink-muted)] shrink-0 mt-0.5',
}: {
  channel: ServiceChannel;
  className?: string;
}) {
  const logo = LOGO_SRC[channel];
  if (logo) {
    // 商標のため next/image の最適化・加工は通さず、原本をそのまま出す
    // （next.config は images.unoptimized なので img と next/image で配信結果は変わらない）。
    return <img src={logo} alt="" width={18} height={18} className="shrink-0 mt-0.5" aria-hidden="true" />;
  }
  const Icon = FALLBACK_ICON[channel];
  return <Icon className={className} aria-hidden="true" />;
}
