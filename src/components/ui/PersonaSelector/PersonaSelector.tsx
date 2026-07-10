import Link from "next/link";
import { User, ArrowRight } from "lucide-react";

/**
 * PersonaSelector — 3 固定ペルソナへの分岐選択を視覚カード化した
 * MDX コンポーネント。
 *
 * 用途想定:
 * - R8 spoke の「ペルソナ別の取り組み方」セクション冒頭: 同ページ内 H3 へのアンカー
 * - r0X-secondary の「受験者属性別の論文設計」セクション: 年度別模範論文ページへ直リンク
 * - pattern-essay のハブで使うのも可（同ハブ内で 3 ペルソナ並列提示）
 *
 * 統一性:
 * - 真実源は固定 3 ペルソナ（content-principles.md §21 + note-magazines.ts shortTitle）
 * - persona key は kebab-case で安定。表示名はコンポーネント内で固定マッピング
 *
 * デザイン:
 * - 2×2 grid (PC) / 1 col (モバイル)
 * - href 指定があればリンク、なければ非リンク <div>
 * - SpokeNavCard と同系統のデザイントークン使用（rounded-card-content, shadow-card-content）
 */

const PERSONA_NAMES = {
  "general-contractor": "ゼネコン",
  "river-consultant": "河川コンサル",
  "road-municipality": "道路発注者",
} as const;

type PersonaKey = keyof typeof PERSONA_NAMES;

interface PersonaSelectorItem {
  readonly persona: PersonaKey;
  readonly caption: string;
  readonly href?: string;
}

interface PersonaSelectorProps {
  /**
   * mode 指定で頻出パターンをワンライナーで呼び出す。
   * - "spoke-anchor": R8 spoke 用。固定 3 ペルソナのプロフィール + 同ページ内 H3 アンカー (#ゼネコン 等)
   *
   * mode を渡すと items は不要。両方渡された場合は items 優先。
   */
  readonly mode?: "spoke-anchor";
  readonly items?: readonly PersonaSelectorItem[];
  readonly label?: string;
}

const SPOKE_DEFAULT_ITEMS: readonly PersonaSelectorItem[] = [
  {
    persona: "general-contractor",
    caption: "大手ゼネコン土木支店工事部長クラス",
    href: "#ゼネコン",
  },
  {
    persona: "river-consultant",
    caption: "中堅建設コンサル河川・砂防部門部長クラス",
    href: "#河川コンサル",
  },
  {
    persona: "road-municipality",
    caption: "地方公共団体・道路担当課長クラス",
    href: "#道路発注者",
  },
];

function resolveItems(
  items: readonly PersonaSelectorItem[] | undefined,
  mode: PersonaSelectorProps["mode"]
): readonly PersonaSelectorItem[] {
  if (items && items.length > 0) return items;
  if (mode === "spoke-anchor") return SPOKE_DEFAULT_ITEMS;
  return [];
}

const CARD_BASE_CLASS =
  "not-prose flex items-start gap-3 rounded-card-content border border-[var(--rule-soft)] bg-[var(--paper)] px-3 py-3 shadow-card-content";

const CARD_LINK_CLASS =
  "group hover:shadow-card-hover hover:border-brand dark:hover:border-brand transition-shadow";

interface PersonaCardInnerProps {
  readonly personaName: string;
  readonly caption: string;
  readonly isLink: boolean;
}

function PersonaCardInner({ personaName, caption, isLink }: PersonaCardInnerProps) {
  return (
    <>
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
        style={{ background: "var(--accent)" }}
        aria-hidden
      >
        <User className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1 leading-snug">
        <div
          className={`text-[14px] font-bold text-ink-strong ${isLink ? "group-hover:underline" : ""}`}
        >
          {personaName}
        </div>
        <div className="mt-0.5 text-[12px] text-ink-body">{caption}</div>
      </div>
      {isLink && (
        <ArrowRight
          className="h-4 w-4 shrink-0 self-center text-ink-muted group-hover:text-brand transition-colors"
          aria-hidden
        />
      )}
    </>
  );
}

export default function PersonaSelector({ items, mode, label }: PersonaSelectorProps) {
  const resolvedItems = resolveItems(items, mode);
  if (resolvedItems.length === 0) return null;
  return (
    <div className="not-prose my-5">
      {label && (
        <div className="mb-2 text-[11px] font-bold tracking-wider text-ink-muted uppercase">
          {label}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {resolvedItems.map((item) => {
          const personaName = PERSONA_NAMES[item.persona];
          if (item.href) {
            return (
              <Link
                key={item.persona}
                href={item.href}
                className={`${CARD_BASE_CLASS} ${CARD_LINK_CLASS}`}
                style={{ textDecoration: "none" }}
              >
                <PersonaCardInner personaName={personaName} caption={item.caption} isLink />
              </Link>
            );
          }
          return (
            <div key={item.persona} className={CARD_BASE_CLASS}>
              <PersonaCardInner personaName={personaName} caption={item.caption} isLink={false} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
