import { NotebookPen, FileText, Hash, Calendar } from "lucide-react";

interface HeroProps {
  articleCount: number;
  keywordCount?: number | undefined;
  lastUpdated?: string | undefined;
}

export default function Hero({ articleCount, keywordCount, lastUpdated }: HeroProps) {
  return (
    <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 pt-10 sm:pt-14 pb-6 sm:pb-8">
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wider uppercase text-[var(--accent)] px-2.5 py-1 bg-[var(--accent-fill)] rounded-full">
          <NotebookPen className="w-3 h-3" strokeWidth={1.75} />
          doboku-note
        </span>
        <span className="font-mono text-[11px] text-[var(--ink-muted)]">土木系資格試験 対策ノート</span>
      </div>
      <h1 className="font-serif font-black tracking-tight leading-[1.2] text-[var(--ink)] text-[32px] sm:text-[44px] md:text-[56px] lg:text-[64px] max-w-[22ch]">
        土木の現場と試験を、<br />ひとつのノートに。
      </h1>
      <p className="mt-5 sm:mt-6 text-[15px] sm:text-[17px] leading-[1.95] text-[var(--ink-body)] max-w-[62ch]">
        <strong className="text-[var(--ink)]">1級土木施工管理技士</strong> および <strong className="text-[var(--ink)]">技術士（総合技術監理部門）</strong> の試験対策を中心とした学習ノート。現場経験に裏打ちされた設計・施工の知見を、体系的な読み物としてお届けします。
      </p>
      <div className="mt-6 flex items-center gap-5 flex-wrap font-mono text-[11px] text-[var(--ink-muted)] tabular-nums">
        <span className="flex items-center gap-1.5">
          <FileText className="w-3 h-3" />
          {articleCount.toLocaleString()} articles
        </span>
        {keywordCount && (
          <>
            <span aria-hidden>·</span>
            <span className="flex items-center gap-1.5">
              <Hash className="w-3 h-3" />
              {keywordCount.toLocaleString()} keywords
            </span>
          </>
        )}
        {lastUpdated && (
          <>
            <span aria-hidden>·</span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              更新 {lastUpdated}
            </span>
          </>
        )}
      </div>
    </section>
  );
}
