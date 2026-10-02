import Link from "next/link";
import { getCategoryHubPath } from '@/lib/categories';


export interface ExamData {
  slug: string;
  label: string;
  variant: "civil" | "pe";
}

interface ExamCardsProps {
  exams: ExamData[];
}

// 試験別テーマ色（SSOT: globals.css --exam-* / .claude/knowledge/reference/ogp-prompts.md テーマ色表）。
// カラーライン・hover 枠へ展開し note カバー/OGP と色を揃える。JIT が拾えるよう完全なクラス文字列で保持。
type ExamTheme = { bar: string; hoverBorder: string };
const EXAM_THEME: Record<string, ExamTheme> = {
  "civil-construction-1": { bar: "bg-(--exam-civil-1)", hoverBorder: "hover:border-(--exam-civil-1)" },
  "civil-construction-2": { bar: "bg-(--exam-civil-2)", hoverBorder: "hover:border-(--exam-civil-2)" },
  "pe-first-stage": { bar: "bg-(--exam-pe)", hoverBorder: "hover:border-(--exam-pe)" },
  "pe-construction": { bar: "bg-(--exam-pe-construction)", hoverBorder: "hover:border-(--exam-pe-construction)" },
  "pe-comprehensive-management": { bar: "bg-(--exam-pe)", hoverBorder: "hover:border-(--exam-pe)" },
  "concrete-engineer": { bar: "bg-(--exam-concrete)", hoverBorder: "hover:border-(--exam-concrete)" },
  "concrete-chief-engineer": { bar: "bg-(--exam-concrete-chief)", hoverBorder: "hover:border-(--exam-concrete-chief)" },
  "concrete-diagnostician": { bar: "bg-(--exam-concrete-diagnosis)", hoverBorder: "hover:border-(--exam-concrete-diagnosis)" },
  rccm: { bar: "bg-(--exam-rccm)", hoverBorder: "hover:border-(--exam-rccm)" },
  surveyor: { bar: "bg-(--exam-surveyor)", hoverBorder: "hover:border-(--exam-surveyor)" },
  pavement: { bar: "bg-(--exam-pavement)", hoverBorder: "hover:border-(--exam-pavement)" },
};
const FALLBACK_THEME: ExamTheme = { bar: "bg-(--accent)", hoverBorder: "hover:border-(--accent)" };

// 検索ゼロステートでも同じ資格入口を使う。
export function ExamCard({ e }: { e: ExamData }) {
  const t = EXAM_THEME[e.slug] ?? FALLBACK_THEME;
  return (
    <Link
      href={getCategoryHubPath(e.slug)}
      className={`focus-ring group relative flex min-h-[88px] items-center overflow-hidden rounded-card-section border border-(--rule-soft) bg-(--paper) py-3 pl-4 pr-7 transition-[border-color,box-shadow] hover:shadow-card-hover dark:border-(--rule-soft) sm:min-h-[76px] sm:pl-5 ${t.hoverBorder}`}
    >
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-[3px] ${t.bar}`} />
      <h3 className="text-[14px] font-bold leading-relaxed text-(--ink) sm:text-[16px]">{e.label}</h3>
      <span aria-hidden="true" className="absolute right-3 text-xl text-(--accent)">›</span>
    </Link>
  );
}
export default function ExamCards({ exams }: ExamCardsProps) {
  return (
    <section id="exams" className="scroll-mt-24 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
      <div className="mb-6 sm:mb-8">
        <h2 className="font-serif text-2xl sm:text-3xl font-black text-(--ink)">
          <Link href="/exam" className="focus-ring rounded-card-inline hover:text-(--accent) transition-colors">
            資格を選んで学ぶ
          </Link>
        </h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3.5">
        {exams.map((e) => (
          <ExamCard key={e.slug} e={e} />
        ))}
      </div>
    </section>
  );
}
