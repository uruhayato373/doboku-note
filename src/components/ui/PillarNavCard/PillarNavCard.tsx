/**
 * 5 管理ピラーナビカード
 * pe-comprehensive-management のキーワードページで、サイドバー（デスクトップ）
 * または記事末尾（モバイル）に 5 つの管理学習ガイドへのリンクを表示する。
 *
 * frontmatter `section` の先頭数字（'2'〜'6'）から所属管理を判定して active 表示。
 * section 不在の場合は active なしで全項目通常表示。
 */
import Link from "next/link";
import MetaCard from "@/components/ui/MetaCard/MetaCard";

interface PillarNavCardProps {
  variant: "sidebar" | "mobile";
  /** frontmatter `section`（例: '2.7'）。先頭の数字で所属管理を判定 */
  currentSection?: string | undefined;
}

interface Pillar {
  sectionPrefix: "2" | "3" | "4" | "5" | "6";
  label: string;
  slug: string;
}

const PILLARS: readonly Pillar[] = [
  { sectionPrefix: "2", label: "経済性管理", slug: "economic-management-pillar" },
  { sectionPrefix: "3", label: "人的資源管理", slug: "human-resource-management-pillar" },
  { sectionPrefix: "4", label: "情報管理", slug: "information-management-pillar" },
  { sectionPrefix: "5", label: "安全管理", slug: "safety-management-pillar" },
  { sectionPrefix: "6", label: "社会環境管理", slug: "social-environment-management-pillar" },
] as const;

const PE_PREFIX = "/docs/pe-comprehensive-management-";

function getActivePrefix(currentSection?: string | undefined): string | null {
  if (!currentSection) return null;
  const head = currentSection.split(".")[0];
  if (!head) return null;
  return PILLARS.some((p) => p.sectionPrefix === head) ? head : null;
}

export default function PillarNavCard({ variant, currentSection }: PillarNavCardProps) {
  const activePrefix = getActivePrefix(currentSection);

  if (variant === "sidebar") {
    return (
      <MetaCard as="div" padding="compact" trackNav="pillar-nav">
        <div
          className="nav-card-title text-[var(--ink)]"
        >
          5 管理学習ガイド
        </div>
        <ul className="space-y-1.5">
          {PILLARS.map((p) => {
            const isActive = p.sectionPrefix === activePrefix;
            return (
              <li key={p.slug}>
                <Link
                  href={`${PE_PREFIX}${p.slug}`}
                  aria-current={isActive ? "true" : undefined}
                  className={
                    isActive
                      ? "text-sm font-bold text-[var(--ink)]"
                      : "text-sm text-[var(--ink-body)] hover:text-brand hover:underline"
                  }
                >
                  {p.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </MetaCard>
    );
  }

  return (
    <MetaCard>
      <h2 className="text-lg font-bold text-[var(--ink)] mb-4">
        5 管理学習ガイド
      </h2>
      <ul className="space-y-2">
        {PILLARS.map((p) => {
          const isActive = p.sectionPrefix === activePrefix;
          return (
            <li
              key={p.slug}
              className={`rounded-card-content border px-4 py-3 transition-colors ${
                isActive
                  ? "bg-[var(--accent-fill)] border-[var(--accent)]"
                  : "border-[var(--rule-soft)] hover:border-[var(--accent)]"
              }`}
            >
              <Link
                href={`${PE_PREFIX}${p.slug}`}
                aria-current={isActive ? "true" : undefined}
                className={
                  isActive
                    ? "text-sm font-bold text-[var(--ink)]"
                    : "text-sm text-brand hover:underline"
                }
              >
                {p.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </MetaCard>
  );
}
