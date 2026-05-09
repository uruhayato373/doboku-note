import Link from "next/link";
import { Award } from "lucide-react";
import { AUTHOR } from "@/config/author";

export default function AboutSection() {
  return (
    <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-14 border-t border-[var(--rule-soft)]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
        <div className="lg:col-span-7">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-muted)] mb-3">About</div>
          <h2 className="font-serif text-2xl sm:text-3xl font-black text-[var(--ink)] mb-5">このノートについて</h2>
          <p className="text-[15px] leading-[1.95] text-[var(--ink-body)] max-w-[55ch]">
            doboku-note は、土木系資格試験の合格を目指す受験者と、実務で法令・仕様書を扱う技術者のためのノートです。日々の学習と実務から得た知見を、体系的な読み物として整理しています。
          </p>
          <p className="mt-4 text-[15px] leading-[1.95] text-[var(--ink-body)] max-w-[55ch]">
            試験対策のみならず、実務参照資料もあわせて公開し、「試験で学んだ知識が現場でどう活きるか」「現場の課題が試験でどう問われるか」を往復できる構成です。
          </p>
          <Link
            href="/about"
            className="mt-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-[var(--accent)] hover:underline"
          >
            <span>About this site</span>
            <span aria-hidden>→</span>
          </Link>
        </div>
        <aside className="lg:col-span-5 bg-[var(--paper)] border border-[var(--rule-soft)] rounded-card-section shadow-soft p-6 sm:p-8">
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--ink-muted)] mb-4">Editor</div>
          <div className="flex items-start gap-4 mb-5">
            <img
              src={AUTHOR.imageUrl}
              alt={AUTHOR.name}
              width={56}
              height={56}
              className="w-14 h-14 rounded-full shrink-0"
            />
            <div className="min-w-0">
              <div className="font-serif font-bold text-lg text-[var(--ink)]">{AUTHOR.name}</div>
              <div className="text-xs text-[var(--ink-muted)] mt-1">{AUTHOR.jobTitle}</div>
            </div>
          </div>
          <p className="text-sm leading-[1.85] text-[var(--ink-body)] mb-5">
            {AUTHOR.bio}
          </p>
          <div>
            <div className="font-mono text-[10px] tracking-widest uppercase text-[var(--ink-muted)] mb-2.5">Qualifications</div>
            <ul className="space-y-1.5 text-sm text-[var(--ink-body)]">
              {AUTHOR.qualifications.map((c) => (
                <li key={c} className="flex gap-2 items-start">
                  <Award className="w-3.5 h-3.5 text-[var(--accent)] mt-1 shrink-0" strokeWidth={1.5} />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}
