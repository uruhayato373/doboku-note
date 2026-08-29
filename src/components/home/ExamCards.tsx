import Link from "next/link";
import { getCategoryHubPath } from '@/lib/categories';

export interface ExamData {
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

// 試験別テーマ色（SSOT: globals.css --exam-* / .claude/knowledge/reference/ogp-prompts.md テーマ色表）。
// カラーライン・hover 枠へ展開し note カバー/OGP と色を揃える。JIT が拾えるよう完全なクラス文字列で保持。
type ExamTheme = { bar: string; hoverBorder: string };
const EXAM_THEME: Record<string, ExamTheme> = {
  "civil-construction-1": { bar: "bg-[var(--exam-civil-1)]", hoverBorder: "hover:border-[var(--exam-civil-1)]" },
  "civil-construction-2": { bar: "bg-[var(--exam-civil-2)]", hoverBorder: "hover:border-[var(--exam-civil-2)]" },
  "pe-first-stage": { bar: "bg-[var(--exam-pe)]", hoverBorder: "hover:border-[var(--exam-pe)]" },
  "pe-construction": { bar: "bg-[var(--exam-pe-construction)]", hoverBorder: "hover:border-[var(--exam-pe-construction)]" },
  "pe-comprehensive-management": { bar: "bg-[var(--exam-pe)]", hoverBorder: "hover:border-[var(--exam-pe)]" },
  "concrete-chief-engineer": { bar: "bg-[var(--exam-concrete-chief)]", hoverBorder: "hover:border-[var(--exam-concrete-chief)]" },
  "concrete-diagnostician": { bar: "bg-[var(--exam-concrete-diagnosis)]", hoverBorder: "hover:border-[var(--exam-concrete-diagnosis)]" },
};
const FALLBACK_THEME: ExamTheme = { bar: "bg-[var(--accent)]", hoverBorder: "hover:border-[var(--accent)]" };

// 資格別アクセント画像（カード背景・文字なし・テーマ色に寄せた明色写真）。Codex 生成 → webp。
const EXAM_IMAGE: Record<string, string> = {
  "civil-construction-1": "/images/card-civil-construction-1.webp",
  "civil-construction-2": "/images/card-civil-construction-2.webp",
  "pe-first-stage": "/images/card-pe-first-stage.webp",
  "pe-construction": "/images/card-pe-construction.webp",
  "pe-comprehensive-management": "/images/card-pe-comprehensive-management.webp",
  "concrete-chief-engineer": "/images/card-concrete-chief-engineer.webp",
  "concrete-diagnostician": "/images/card-concrete-diagnostician.webp",
};

// export: 検索ゼロステート（SearchZeroState）が同じ資格カードデザインを横展開するため（DN-0079③）。
export function ExamCard({ e }: { e: ExamData }) {
  const t = EXAM_THEME[e.slug] ?? FALLBACK_THEME;
  const img = EXAM_IMAGE[e.slug];
  // stats を 1 行のスコープに集約（deep-link はやめ、網羅性の提示のみ残す）。
  return (
    // 画像前面カード: 背景画像＋下部スクリム＋テーマ色ライン、左下にライブ文字を重ねる。カード全体＝カテゴリへのリンク。
    <Link
      href={getCategoryHubPath(e.slug)}
      className={`focus-ring group relative block aspect-[3/2] overflow-hidden rounded-card-section border border-[var(--rule-soft)] transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:shadow-lift ${t.hoverBorder}`}
    >
      {img ? (
        <img
          src={img}
          alt=""
          aria-hidden="true"
          width={1000}
          height={565}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      ) : (
        <div className="absolute inset-0 bg-[var(--accent-fill)]" />
      )}
      {/* 試験別テーマ色ライン（上端） */}
      <span aria-hidden="true" className={`absolute inset-x-0 top-0 z-10 h-1 ${t.bar}`} />
      {/* 下部テキスト帯：黒の半透明フロストパネル（backdrop-blur）。画像は上部をそのまま見せ、
          テキスト範囲にだけ半透明ダークを敷く。上端はソフトなグラデで硬い境界を和らげておしゃれに。 */}
      <div className="absolute inset-x-0 bottom-0">
        <div aria-hidden="true" className="h-6 bg-gradient-to-t from-black/35 to-transparent" />
        <div className="border-t border-white/10 bg-black/45 px-4 py-3 text-white backdrop-blur-md">
          <div className="font-mono text-[10px] uppercase tracking-widest text-white/80">{e.nextExam}</div>
          <h3 className="mt-0.5 font-serif text-lg font-black leading-tight sm:text-xl">{e.label}</h3>
          <div className="mt-1 line-clamp-1 text-[12px] leading-snug text-white/85">{e.subtitle}</div>
        </div>
      </div>
    </Link>
  );
}

export default function ExamCards({ exams }: ExamCardsProps) {
  return (
    <section id="exams" className="scroll-mt-24 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
      <div className="mb-6 sm:mb-8">
        <h2 className="font-serif text-2xl sm:text-3xl font-black text-[var(--ink)]">
          <Link href="/exam" className="focus-ring rounded-card-inline hover:text-[var(--accent)] transition-colors">
            対応する資格・試験
          </Link>
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {exams.map((e) => (
          <ExamCard key={e.slug} e={e} />
        ))}
      </div>
    </section>
  );
}
