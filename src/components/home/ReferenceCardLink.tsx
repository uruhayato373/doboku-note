import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";

export default function ReferenceCardLink() {
  return (
    <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 pb-8 sm:pb-10">
      <Link
        href="/category/reference-materials"
        className="block bg-[var(--ct-reference-bg)] border border-[var(--ct-reference-bd)]/30 rounded-card-section p-5 sm:p-6 flex items-center justify-between gap-4 hover:border-[var(--accent)] hover:shadow-soft transition-all"
      >
        <div className="flex items-center gap-4 sm:gap-5 min-w-0">
          <div className="w-11 h-11 flex items-center justify-center rounded-card-content shrink-0 text-white" style={{ background: "var(--ct-reference-bd)" }}>
            <BookOpen className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--ct-reference-fg)" }}>
              REFERENCE · 実務参照資料
            </div>
            <div className="font-serif font-bold text-base sm:text-lg text-[var(--ink)] mt-0.5">
              近畿地整 設計便覧 / 兵庫県 共通仕様書
            </div>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-[var(--ink-muted)] shrink-0" />
      </Link>
    </section>
  );
}
