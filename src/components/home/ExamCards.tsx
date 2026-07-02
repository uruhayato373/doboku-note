import Link from "next/link";
import { HardHat, GraduationCap, ArrowRight } from "lucide-react";

interface ExamData {
  slug: string;
  label: string;
  en: string;
  subtitle: string;
  description: string;
  stats: { k: string; v: string; anchor?: string }[];
  nextExam: string;
  variant: "civil" | "pe";
}

interface ExamCardsProps {
  exams: ExamData[];
}

// 試験別テーマ色（SSOT: globals.css --exam-* / docs/reference/ogp-prompts.md テーマ色表）を
// カードのカラーバー・アイコン・hover 枠へ展開し、note カバー/OGP と色を揃える。
// JIT が拾えるよう完全なクラス文字列で保持する。
type ExamTheme = { bar: string; icon: string; iconHoverBg: string; hoverBorder: string; statHover: string };
const EXAM_THEME: Record<string, ExamTheme> = {
  "civil-construction-1": {
    bar: "bg-[var(--exam-civil-1)]",
    icon: "text-[var(--exam-civil-1)]",
    iconHoverBg: "group-hover:bg-[var(--exam-civil-1)]",
    hoverBorder: "hover:border-[var(--exam-civil-1)]",
    statHover: "group-hover/stat:text-[var(--exam-civil-1)]",
  },
  "civil-construction-2": {
    bar: "bg-[var(--exam-civil-2)]",
    icon: "text-[var(--exam-civil-2)]",
    iconHoverBg: "group-hover:bg-[var(--exam-civil-2)]",
    hoverBorder: "hover:border-[var(--exam-civil-2)]",
    statHover: "group-hover/stat:text-[var(--exam-civil-2)]",
  },
  "pe-first-stage": {
    bar: "bg-[var(--exam-pe)]",
    icon: "text-[var(--exam-pe)]",
    iconHoverBg: "group-hover:bg-[var(--exam-pe)]",
    hoverBorder: "hover:border-[var(--exam-pe)]",
    statHover: "group-hover/stat:text-[var(--exam-pe)]",
  },
  "pe-construction": {
    bar: "bg-[var(--exam-pe-construction)]",
    icon: "text-[var(--exam-pe-construction)]",
    iconHoverBg: "group-hover:bg-[var(--exam-pe-construction)]",
    hoverBorder: "hover:border-[var(--exam-pe-construction)]",
    statHover: "group-hover/stat:text-[var(--exam-pe-construction)]",
  },
  "pe-comprehensive-management": {
    bar: "bg-[var(--exam-pe)]",
    icon: "text-[var(--exam-pe)]",
    iconHoverBg: "group-hover:bg-[var(--exam-pe)]",
    hoverBorder: "hover:border-[var(--exam-pe)]",
    statHover: "group-hover/stat:text-[var(--exam-pe)]",
  },
  "concrete-chief-engineer": {
    bar: "bg-[var(--exam-concrete-chief)]",
    icon: "text-[var(--exam-concrete-chief)]",
    iconHoverBg: "group-hover:bg-[var(--exam-concrete-chief)]",
    hoverBorder: "hover:border-[var(--exam-concrete-chief)]",
    statHover: "group-hover/stat:text-[var(--exam-concrete-chief)]",
  },
};
const FALLBACK_THEME: ExamTheme = {
  bar: "bg-[var(--accent)]",
  icon: "text-[var(--accent)]",
  iconHoverBg: "group-hover:bg-[var(--accent)]",
  hoverBorder: "hover:border-[var(--accent)]",
  statHover: "group-hover/stat:text-[var(--accent)]",
};

// 資格別アクセント画像（カード上部の帯・文字なし・テーマ色に寄せた明色写真）。Codex 生成 → webp。
const EXAM_IMAGE: Record<string, string> = {
  "civil-construction-1": "/images/card-civil-construction-1.webp",
  "civil-construction-2": "/images/card-civil-construction-2.webp",
  "pe-first-stage": "/images/card-pe-first-stage.webp",
  "pe-construction": "/images/card-pe-construction.webp",
  "pe-comprehensive-management": "/images/card-pe-comprehensive-management.webp",
  "concrete-chief-engineer": "/images/card-concrete-chief-engineer.webp",
};

function ExamIcon({ variant }: { variant: ExamData["variant"] }) {
  if (variant === "civil") return <HardHat className="w-7 h-7" strokeWidth={1.5} />;
  return <GraduationCap className="w-7 h-7" strokeWidth={1.5} />;
}

function ExamCard({ e }: { e: ExamData }) {
  const t = EXAM_THEME[e.slug] ?? FALLBACK_THEME;
  const img = EXAM_IMAGE[e.slug];
  return (
    // stretched-link パターン: カード全体はタイトルリンク(疑似要素)でカテゴリへ。stats は z-10 で
    // その上に乗り、各種別セクション(/category/{slug}#sec-<group>)へ個別に直行できる。
    <article
      className={`group relative overflow-hidden bg-[var(--paper)] border border-[var(--rule-soft)] rounded-card-section transition-all hover:shadow-lift hover:-translate-y-0.5 ${t.hoverBorder}`}
    >
      {/* 資格別アクセント写真帯＋テーマ色ライン（note カバーと同一の資格アイデンティティ色）。
          画像が無い資格はテーマ色バーのみ表示。 */}
      {img ? (
        <>
          <div className="overflow-hidden">
            <img
              src={img}
              alt=""
              aria-hidden="true"
              width={1000}
              height={565}
              loading="lazy"
              decoding="async"
              className="block h-28 sm:h-32 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          </div>
          <span aria-hidden="true" className={`block h-[3px] w-full ${t.bar}`} />
        </>
      ) : (
        <span aria-hidden="true" className={`block h-1 w-full ${t.bar}`} />
      )}
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div
            className={`w-14 h-14 bg-[var(--accent-fill)] ${t.icon} rounded-card-content flex items-center justify-center transition-colors ${t.iconHoverBg} group-hover:text-white`}
          >
            <ExamIcon variant={e.variant} />
          </div>
          <div className="text-right">
            <div className="font-mono text-[10px] tracking-widest text-[var(--ink-muted)] uppercase">{e.en}</div>
            <div className="font-mono text-[10px] text-[var(--ink-body)] mt-1.5">{e.nextExam}</div>
          </div>
        </div>
        <h3 className="font-serif font-black text-xl sm:text-2xl leading-tight text-[var(--ink)] mb-1.5">
          <Link href={`/category/${e.slug}`} className="after:absolute after:inset-0 after:content-['']">
            {e.label}
          </Link>
        </h3>
        <div className="text-[13px] text-[var(--ink-muted)] mb-4">{e.subtitle}</div>
        <p className="text-[14px] leading-[1.85] text-[var(--ink-body)] mb-5">{e.description}</p>
        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[var(--rule-soft)] mb-5">
          {e.stats.map((s) => {
            const href = s.anchor ? `/category/${e.slug}#sec-${s.anchor}` : `/category/${e.slug}`;
            return (
              <Link
                key={s.k}
                href={href}
                className="relative z-10 rounded-card-inline px-1.5 py-2 hover:bg-[var(--accent-fill)] transition-colors group/stat"
              >
                <div className={`font-serif font-black text-lg sm:text-xl text-[var(--ink)] tabular-nums transition-colors ${t.statHover}`}>
                  {s.v}
                </div>
                <div className={`font-mono text-[10px] text-[var(--ink-muted)] uppercase tracking-wider mt-0.5 transition-colors ${t.statHover}`}>
                  {s.k}
                </div>
              </Link>
            );
          })}
        </div>
        <div className="inline-flex items-center gap-2 font-mono text-[11px] tracking-widest uppercase text-[var(--ink)] transition-colors">
          <span>Read the notes</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </article>
  );
}

export default function ExamCards({ exams }: ExamCardsProps) {
  return (
    <section id="exams" className="scroll-mt-24 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
      <div className="mb-6 sm:mb-8">
        <h2 className="font-serif text-2xl sm:text-3xl font-black text-[var(--ink)]">対応する資格・試験</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {exams.map((e) => (
          <ExamCard key={e.slug} e={e} />
        ))}
      </div>
    </section>
  );
}
