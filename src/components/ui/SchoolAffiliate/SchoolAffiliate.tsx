import { ArrowRight } from "lucide-react";

interface SchoolAffiliateProps {
  readonly provider: string;
  readonly course: string;
  readonly description?: string;
  readonly href: string;
  readonly pixelUrl?: string;
  readonly cta?: string;
  /** 外側コンテナの縦マージン等を上書き。BookSection 等に内包する場合は "my-0" を渡す。既定は単独配置用の "my-6"。 */
  readonly className?: string;
}

/**
 * SchoolAffiliate — 通信講座・スクール系アフィリエイトを「テキストリンク カード」で表示する。
 *
 * CourseAffiliate（画像必須・mat 指定で www19 固定）の姉妹だが、
 * こちらは画像を持たず本文に馴染むテキストリンク主体。creative ごとに
 * 配信ドメインが異なるため pixelUrl は完全 URL で受け取る（CareerAffiliate と同設計）。
 *
 * ステマ規制（2023-10〜）対応のため「PR」バッジを必ず表示。
 * rel="nofollow sponsored noopener" / target="_blank" は自動付与。
 *
 * 配置原則: 記事末・hub末のCTA。ファーストビュー禁止（メイン導線と矛盾するため）。
 */
export default function SchoolAffiliate({
  provider,
  course,
  description,
  href,
  pixelUrl,
  cta = "講座を見る",
  className = "my-6",
}: SchoolAffiliateProps) {
  return (
    <div className={`not-prose ${className}`}>
      <a
        href={href}
        rel="nofollow sponsored noopener"
        target="_blank"
        className="group relative block rounded-card-content border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 pr-12 shadow-card-content hover:shadow-card-hover hover:border-brand dark:hover:border-brand transition-shadow"
        style={{ textDecoration: "none" }}
      >
        <span
          className="absolute right-3 top-3 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white"
          style={{ background: "var(--color-ink-muted)" }}
          aria-label="広告"
        >
          PR
        </span>

        <div className="text-[11px] font-bold tracking-wider text-brand-deep dark:text-brand uppercase">
          {provider}
        </div>
        <div className="mt-0.5 text-[15px] font-bold text-ink-strong dark:text-gray-100 group-hover:underline">
          {course}
        </div>
        {description && (
          <div className="mt-1.5 text-sm leading-6 text-ink-body dark:text-gray-400">
            {description}
          </div>
        )}
        <div className="mt-2.5 inline-flex items-center gap-1 text-sm font-bold text-brand dark:text-brand group-hover:gap-2 transition-all">
          {cta}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </div>
      </a>

      {pixelUrl && (
        <img
          src={pixelUrl}
          width={1}
          height={1}
          alt=""
          aria-hidden
          style={{ position: "absolute", left: "-9999px" }}
          suppressHydrationWarning
        />
      )}
    </div>
  );
}
