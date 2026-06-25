import { NotebookPen, ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 pt-16 sm:pt-24 pb-10 sm:pb-16 text-center">
      <div className="flex items-center justify-center gap-2 mb-7 flex-wrap">
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wider uppercase text-[var(--accent)] px-2.5 py-1 bg-[var(--accent-fill)] rounded-full">
          <NotebookPen className="w-3 h-3" strokeWidth={1.75} />
          doboku-note
        </span>
        <span className="font-mono text-[11px] text-[var(--ink-muted)]">土木系資格試験 対策ノート</span>
      </div>
      <h1 className="font-serif font-black tracking-tight leading-[1.18] text-[var(--ink)] text-[36px] sm:text-[52px] md:text-[64px] lg:text-[72px] mx-auto max-w-[18ch] text-balance">
        土木の試験対策を、ひとつに。
      </h1>
      <p className="mt-6 sm:mt-7 text-[15px] sm:text-[18px] leading-[1.9] text-[var(--ink-body)] mx-auto max-w-[56ch]">
        土木・建設系の実務資格を、合格者が体系化した試験対策サイト。
        <br />
        ここだけで合格を目指せます。
      </p>
      <div className="mt-8 sm:mt-9 flex items-center justify-center">
        <a
          href="#exams"
          className="inline-flex items-center gap-2 font-mono text-[12px] tracking-wider uppercase text-[var(--paper)] bg-[var(--accent)] px-5 py-3 rounded-full hover:opacity-90 transition-opacity"
        >
          <span>資格を選んで学ぶ</span>
          <ArrowRight className="w-4 h-4" strokeWidth={2} />
        </a>
      </div>
    </section>
  );
}
