import Breadcrumb from '@/components/ui/Breadcrumb/Breadcrumb';

type StandardsCrumb = {
  label: string;
  href?: string;
};

type StandardsArticleHeaderProps = {
  breadcrumb: StandardsCrumb[];
  label: string;
  title: string;
  meta?: string | readonly string[];
};

/**
 * 基準類の章記事・逐語文字起こしで使う記事内ヘッダー。
 * 通常記事の ArticleHeader と同じ文字組み・読み始め位置へ揃えつつ、
 * 発行機関・原本ページ等の資料固有メタデータを保持する。
 */
export default function StandardsArticleHeader({
  breadcrumb,
  label,
  title,
  meta,
}: StandardsArticleHeaderProps) {
  return (
    <header className="border-b border-(--rule-soft) pb-6 dark:border-(--rule-soft)">
      <Breadcrumb items={breadcrumb} className="mb-4" />

      <div className="mb-1 text-[11px] font-bold tracking-[0.06em] text-(--accent)">
        {label}
      </div>
      <h1
        className="m-0 text-balance font-sans text-[26px] font-bold leading-[1.4] tracking-[0.02em] text-(--ink) [word-break:auto-phrase] sm:text-[28px]"
        style={{ fontFeatureSettings: '"palt" 1' }}
      >
        {title}
      </h1>
      {meta && (
        <div className="mt-2 text-balance text-[13px] leading-6 text-(--ink-muted)">
          {typeof meta === 'string' ? meta : (
            <div className="flex flex-wrap gap-x-3">
              {meta.map(item => <span key={item} className="whitespace-nowrap">{item}</span>)}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
