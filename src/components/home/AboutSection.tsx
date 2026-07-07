import Link from "next/link";
import { AUTHOR } from "@/config/author";

// トップの運営者カード（旧「このノートについて＋Editor」の2ブロックを1枚に統合）。
// サイト説明の散文は /about に集約し、ホームからはリンクで送る（シンプル構成）。
// プロフィール画像は docs の AuthorCard（64px＋枠）と統一。note CTA は直下の
// PremiumNoteHero が担うため、ここには置かない（重複回避）。
export default function AboutSection() {
  return (
    <section className="mx-auto max-w-[1280px] border-t border-[var(--rule-soft)] px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
      <div className="mx-auto max-w-2xl rounded-card-section border border-[var(--rule-soft)] bg-[var(--paper)] p-6 shadow-soft sm:p-8">
        <h2 className="mb-5 font-serif text-lg font-bold text-[var(--ink)]">運営者</h2>
        <div className="flex items-start gap-4">
          <img
            src={AUTHOR.imageUrl}
            alt={AUTHOR.name}
            width={64}
            height={64}
            className="h-16 w-16 shrink-0 rounded-full border border-[var(--rule-soft)]"
          />
          <div className="min-w-0 flex-1">
            <div className="font-serif text-lg font-bold text-[var(--ink)]">{AUTHOR.name}</div>
            <p className="mt-2 text-sm leading-[1.85] text-[var(--ink-body)]">{AUTHOR.tagline}</p>
            <div className="mt-3">
              <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-[var(--ink-muted)]">
                保有資格
              </div>
              <p className="text-xs leading-relaxed text-[var(--ink-body)]">
                {AUTHOR.qualifications.join("・")}
              </p>
            </div>
            <Link
              href="/about"
              className="mt-4 inline-flex items-center gap-2 rounded-md border border-[var(--rule-soft)] px-4 py-2 text-sm font-bold text-[var(--accent)] transition-colors hover:border-[var(--accent)]"
            >
              運営者・サイトについて
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
