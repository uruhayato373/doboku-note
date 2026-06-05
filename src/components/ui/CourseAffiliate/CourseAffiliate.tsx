import { ArrowRight } from "lucide-react";

interface CourseAffiliateProps {
  readonly provider: string;
  readonly course: string;
  readonly description?: string;
  readonly href: string;
  readonly imageSrc: string;
  readonly trackingPixel?: string;
  readonly cta?: string;
}

/**
 * CourseAffiliate — 資格講座のアフィリエイトリンクを統一カードで表示する。
 *
 * ステマ規制（2023-10〜）対応のため「PR」バッジを必ず表示。
 * rel="nofollow sponsored" / target="_blank" は自動付与。
 * trackingPixel に A8.net の mat 値を渡すと 1x1 計測ピクセルを内部で組み立てる。
 *
 * 配置原則: 記事末・hub末のCTA。ファーストビュー禁止（メイン導線と矛盾するため）。
 */
export default function CourseAffiliate({
  provider,
  course,
  description,
  href,
  imageSrc,
  trackingPixel,
  cta = "詳細を見る",
}: CourseAffiliateProps) {
  return (
    <div className="not-prose my-6">
      <a
        href={href}
        rel="nofollow sponsored noopener"
        target="_blank"
        data-cta="affiliate"
        data-cta-label={provider}
        className="group relative flex flex-col sm:flex-row items-stretch gap-4 rounded-card-content border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-card-content hover:shadow-card-hover hover:border-brand dark:hover:border-brand transition-shadow"
        style={{ textDecoration: "none" }}
      >
        <span
          className="absolute right-3 top-3 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white"
          style={{ background: "var(--color-ink-muted)" }}
          aria-label="広告"
        >
          PR
        </span>

        <div className="flex shrink-0 items-center justify-center sm:w-40 w-full">
          <img
            src={imageSrc}
            alt={`${provider} ${course}`}
            loading="lazy"
            className="max-h-32 sm:max-h-28 w-auto object-contain"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center pr-10 sm:pr-12">
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
        </div>
      </a>

      {trackingPixel && (
        <img
          src={`https://www19.a8.net/0.gif?a8mat=${trackingPixel}`}
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
