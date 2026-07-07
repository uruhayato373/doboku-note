import Link from "next/link";
import { AUTHOR } from "@/config/author";

/**
 * AuthorProfile — 運営者プロフィールの共通コンポーネント（SSOT）。
 *
 * SSOT（全ページ統一）: プロフィール画像サイズ（120px）＋保有資格（AUTHOR.qualifications・箇条書き）。
 * ページ可変（props）: レイアウト（variant）・経歴文の詳しさ・note CTA の有無。
 *   - variant="sidebar": docs / カテゴリ hub の右サイドバー（縦・中央・narrow・一文 tagline）
 *   - variant="wide":   トップ / about（横・full 幅・詳細 bio ＝ AUTHOR.bio）
 * 記事末尾の日付つき AuthorCard は別フォーマット（本コンポーネントの対象外）。
 * 意匠はエディトリアル系トークンのみ（生 hex なし）。
 */

// SSOT: プロフィール画像サイズ（全カード共通）。ここ1箇所を変えれば全ページに反映。
const AVATAR_CLASS = "h-[120px] w-[120px] shrink-0 rounded-full border border-[var(--rule-soft)]";

type Variant = "sidebar" | "wide";

interface AuthorProfileProps {
  /** レイアウト（既定 sidebar）。 */
  readonly variant?: Variant;
  /** note CTA ボタンを出すか（既定 true）。直下に別の note CTA がある面では false。 */
  readonly showNoteCta?: boolean;
  /** 見出しラベル（既定「運営者」）。 */
  readonly eyebrow?: string;
}

function Avatar() {
  return (
    <img
      src={AUTHOR.imageUrl}
      alt={`${AUTHOR.name}のプロフィール画像`}
      width={120}
      height={120}
      className={AVATAR_CLASS}
    />
  );
}

function Qualifications({ columns = 1 }: { columns?: 1 | 2 }) {
  return (
    <div>
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--ink-muted)]">
        保有資格
      </div>
      <ul
        className={
          columns === 2
            ? "space-y-1 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-1 sm:space-y-0"
            : "space-y-1"
        }
      >
        {AUTHOR.qualifications.map((q) => (
          <li
            key={q}
            className="flex items-start gap-1.5 text-[14px] leading-snug text-[var(--ink-body)]"
          >
            <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" />
            <span>{q}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NoteCta() {
  return (
    <a
      href={AUTHOR.noteCta.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-3.5 py-2 text-[14px] font-bold text-[var(--paper)] transition-opacity hover:opacity-90"
    >
      {AUTHOR.noteCta.label}
    </a>
  );
}

function SocialLinks({ center = false }: { center?: boolean }) {
  return (
    <div
      className={`flex items-center gap-4 text-[13px] text-[var(--ink-muted)] ${center ? "justify-center" : ""}`}
    >
      <a
        href={AUTHOR.twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-[var(--accent)] hover:underline"
      >
        X @doboku373
      </a>
      <Link href="/about" className="hover:text-[var(--accent)] hover:underline">
        運営者について →
      </Link>
    </div>
  );
}

export default function AuthorProfile({
  variant = "sidebar",
  showNoteCta = true,
  eyebrow = "運営者",
}: AuthorProfileProps) {
  if (variant === "wide") {
    return (
      <aside
        aria-label="運営者プロフィール"
        className="overflow-hidden rounded-card-section border border-[var(--rule-soft)] bg-[var(--paper)] shadow-soft"
      >
        <span aria-hidden className="block h-[3px] w-full bg-[var(--color-brand)] opacity-70" />
        <div className="p-6 sm:p-8">
          <div className="mb-5 font-mono text-[10px] tracking-[0.2em] text-[var(--ink-muted)]">
            {eyebrow}
          </div>
          <div className="flex flex-col items-start gap-6 sm:flex-row">
            <Link href="/about" className="mx-auto shrink-0 sm:mx-0">
              <Avatar />
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href="/about"
                className="font-serif text-xl font-black text-[var(--ink)] transition-colors hover:text-[var(--accent)]"
              >
                {AUTHOR.name}
              </Link>
              <p className="mt-3 text-sm leading-[1.95] text-[var(--ink-body)]">{AUTHOR.bio}</p>
              <div className="mt-5">
                <Qualifications columns={2} />
              </div>
              {showNoteCta && (
                <div className="mt-5 max-w-xs">
                  <NoteCta />
                </div>
              )}
              <div className="mt-4">
                <SocialLinks />
              </div>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // sidebar: tagline を最初の句点で 2 行に分割（役割 / 姿勢）。
  const dot = AUTHOR.tagline.indexOf("。");
  const taglineRole = dot >= 0 ? AUTHOR.tagline.slice(0, dot + 1) : AUTHOR.tagline;
  const taglineRest = dot >= 0 ? AUTHOR.tagline.slice(dot + 1) : "";

  return (
    <aside
      aria-label="運営者プロフィール"
      className="overflow-hidden rounded-card-content border border-[var(--rule-soft)] bg-[var(--paper)]"
    >
      <span aria-hidden className="block h-[3px] w-full bg-[var(--color-brand)] opacity-70" />
      <div className="p-5">
        <div className="mb-3 font-mono text-[10px] tracking-[0.2em] text-[var(--ink-muted)]">
          {eyebrow}
        </div>
        <div className="flex flex-col items-center text-center">
          <Link href="/about" className="shrink-0">
            <Avatar />
          </Link>
          <Link
            href="/about"
            className="mt-3 font-serif text-lg font-black text-[var(--ink)] transition-colors hover:text-[var(--accent)]"
          >
            {AUTHOR.name}
          </Link>
          <p className="mt-2 text-[14px] leading-[1.8] text-[var(--ink-body)]">
            {taglineRole}
            {taglineRest && (
              <>
                <br />
                {taglineRest}
              </>
            )}
          </p>
        </div>
        <div className="mt-4">
          <Qualifications />
        </div>
        {showNoteCta && (
          <div className="mt-4">
            <NoteCta />
          </div>
        )}
        <div className="mt-2">
          <SocialLinks center />
        </div>
      </div>
    </aside>
  );
}
