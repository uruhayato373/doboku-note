import Link from "next/link";
import { HardHat, GraduationCap, ArrowRight } from "lucide-react";

interface ExamData {
  slug: string;
  label: string;
  en: string;
  subtitle: string;
  description: string;
  stats: { k: string; v: string }[];
  nextExam: string;
  variant: "civil" | "pe";
}

interface ExamCardsProps {
  exams: ExamData[];
}

function ExamIcon({ variant }: { variant: ExamData["variant"] }) {
  if (variant === "civil") return <HardHat className="w-7 h-7" strokeWidth={1.5} />;
  return <GraduationCap className="w-7 h-7" strokeWidth={1.5} />;
}

function ExamCard({ e }: { e: ExamData }) {
  return (
    <Link
      href={`/category/${e.slug}`}
      className="group block bg-[var(--paper)] border border-[var(--rule-soft)] rounded-card-section p-6 sm:p-8 transition-all hover:border-[var(--accent)] hover:shadow-lift hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="w-14 h-14 bg-[var(--accent-fill)] text-[var(--accent)] rounded-card-content flex items-center justify-center transition-colors group-hover:bg-[var(--accent)] group-hover:text-[var(--paper)]">
          <ExamIcon variant={e.variant} />
        </div>
        <div className="text-right">
          <div className="font-mono text-[10px] tracking-widest text-[var(--ink-muted)] uppercase">{e.en}</div>
          <div className="font-mono text-[10px] text-[var(--ink-body)] mt-1.5">{e.nextExam}</div>
        </div>
      </div>
      <h3 className="font-serif font-black text-xl sm:text-2xl leading-tight text-[var(--ink)] mb-1.5">{e.label}</h3>
      <div className="text-[13px] text-[var(--ink-muted)] mb-4">{e.subtitle}</div>
      <p className="text-[14px] leading-[1.85] text-[var(--ink-body)] mb-5">{e.description}</p>
      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[var(--rule-soft)] mb-5">
        {e.stats.map((s) => (
          <div key={s.k}>
            <div className="font-serif font-black text-lg sm:text-xl text-[var(--ink)] tabular-nums">{s.v}</div>
            <div className="font-mono text-[10px] text-[var(--ink-muted)] uppercase tracking-wider mt-0.5">{s.k}</div>
          </div>
        ))}
      </div>
      <div className="inline-flex items-center gap-2 font-mono text-[11px] tracking-widest uppercase text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors">
        <span>Read the notes</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </div>
    </Link>
  );
}

export default function ExamCards({ exams }: ExamCardsProps) {
  return (
    <section id="exams" className="scroll-mt-24 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
      <div className="mb-6 sm:mb-8">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-muted)] mb-3">Exams</div>
        <h2 className="font-serif text-2xl sm:text-3xl font-black text-[var(--ink)]">対応する資格・試験</h2>
        <p className="text-[14px] text-[var(--ink-muted)] mt-1.5">現場と試験を往復する、体系的な学習コンテンツ</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {exams.map((e) => (
          <ExamCard key={e.slug} e={e} />
        ))}
      </div>
    </section>
  );
}
