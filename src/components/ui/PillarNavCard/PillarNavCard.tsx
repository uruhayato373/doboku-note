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
      <MetaCard as="div" padding="compact">
        <div
          className="text-gray-900 dark:text-white"
          style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "1px", marginBottom: "8px" }}
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
                      ? "text-sm font-bold text-gray-900 dark:text-gray-100"
                      : "text-sm text-gray-600 dark:text-gray-400 hover:text-brand hover:underline"
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
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
        5 管理学習ガイド
      </h2>
      <ul className="space-y-2">
        {PILLARS.map((p) => {
          const isActive = p.sectionPrefix === activePrefix;
          return (
            <li
              key={p.slug}
              className={`rounded-sm border px-4 py-3 transition-colors ${
                isActive
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                  : "border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500"
              }`}
            >
              <Link
                href={`${PE_PREFIX}${p.slug}`}
                aria-current={isActive ? "true" : undefined}
                className={
                  isActive
                    ? "text-sm font-bold text-gray-900 dark:text-gray-100"
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
