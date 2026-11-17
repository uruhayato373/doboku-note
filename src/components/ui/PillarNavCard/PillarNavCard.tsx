/**
 * 5 管理ピラーナビカード
 * pe-comprehensive-management のキーワードページで、サイドバー（デスクトップ）
 * または記事末尾（モバイル）に 5 つの管理学習ガイドへのリンクを表示する。
 *
 * frontmatter `section` の先頭数字（'2'〜'6'）から所属管理を判定して active 表示。
 * section 不在の場合は active なしで全項目通常表示。
 */
import Link from "next/link";
import LinkRow, { LinkRowList } from "@/components/ui/LinkRow/LinkRow";
import { PILLARS } from "@/lib/pillar-nav";
import MetaCard from "@/components/ui/MetaCard/MetaCard";
import { getPublicDocPath } from '@/lib/content-routes';

interface PillarNavCardProps {
  variant: "sidebar" | "mobile";
  /** frontmatter `section`（例: '2.7'）。先頭の数字で所属管理を判定 */
  currentSection?: string | undefined;
}

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
      <MetaCard as="div" padding="compact" trackNav="pillar-nav" title="5 管理学習ガイド">
        <LinkRowList>
          {PILLARS.map((p) => (
            <LinkRow
              key={p.slug}
              href={getPublicDocPath(`pe-comprehensive-management-${p.slug}`)}
              title={p.label}
              current={p.sectionPrefix === activePrefix}
            />
          ))}
        </LinkRowList>
      </MetaCard>
    );
  }

  return (
    // モバイルの記事末も PC の右の欄と同じラベルで回遊を計測する（2026-11-16 の棚卸しで計測が無かった）
    <MetaCard trackNav="pillar-nav" title="5 管理学習ガイド">
      <ul className="space-y-2">
        {PILLARS.map((p) => {
          const isActive = p.sectionPrefix === activePrefix;
          return (
            <li
              key={p.slug}
              className={`rounded-card-content border px-4 py-3 transition-colors ${
                isActive
                  ? "bg-(--accent-fill) border-(--accent)"
                  : "border-(--rule-soft) hover:border-(--accent)"
              }`}
            >
              <Link
                href={getPublicDocPath(`pe-comprehensive-management-${p.slug}`)}
                aria-current={isActive ? "true" : undefined}
                className={
                  isActive
                    ? "text-sm font-bold text-(--ink)"
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
