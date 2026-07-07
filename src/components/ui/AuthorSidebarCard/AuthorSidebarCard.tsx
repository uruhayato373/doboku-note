import Link from "next/link";
import { AUTHOR } from "@/config/author";

/**
 * AuthorSidebarCard — 右サイドバー用の縦型 運営者プロフィールカード。
 *
 * 著者 SSOT（src/config/author.ts）を読み、アバター・名前・一文紹介（tagline）・保有資格（全件・リスト）・
 * 統一 note CTA・X / about 導線を縦に積む。E-E-A-T／合格体験者ポジションの提示が目的。
 * 役割・姿勢は tagline、資格は qualifications に役割分担し、肩書き/bio との情報重複を避ける。
 * tagline は最初の句点で改行して「役割」「姿勢」を 2 行に分ける。
 * note CTA は全ページ統一（AUTHOR.noteCta）でカテゴリ別の出し分けはしない。
 * 記事末尾の横型 AuthorCard（日付つき）とは別フォーマットで、カテゴリ hub と docs で共有する。
 * 意匠はカテゴリサイドバー（PopularRanking 等）と同じエディトリアル系トークンに合わせる。
 */
export default function AuthorSidebarCard({
  showNoteCta = true,
}: {
  /** note CTA ボタンを出すか（既定 true）。トップの運営者枠は直下に note教材ヒーローがあるため false。 */
  showNoteCta?: boolean;
} = {}) {
  // tagline（"役割。姿勢。"）を最初の句点で 2 行に分割して表示する。
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
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-muted)] mb-3">
          Profile
        </div>
        <div className="flex flex-col items-center text-center">
          <Link href="/about" className="shrink-0">
            <img
              src={AUTHOR.imageUrl}
              alt={`${AUTHOR.name}のプロフィール画像`}
              width={120}
              height={120}
              className="h-[120px] w-[120px] rounded-full border border-[var(--rule-soft)]"
            />
          </Link>
          <Link
            href="/about"
            className="mt-3 font-serif text-lg font-black text-[var(--ink)] hover:text-[var(--accent)] transition-colors"
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
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--ink-muted)] mb-2">
            保有資格
          </div>
          <ul className="space-y-1">
            {AUTHOR.qualifications.map((q) => (
              <li
                key={q}
                className="flex items-start gap-1.5 text-[14px] leading-snug text-[var(--ink-body)]"
              >
                <span
                  aria-hidden
                  className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]"
                />
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
        {showNoteCta && (
          <a
            href={AUTHOR.noteCta.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-3.5 py-2 text-[14px] font-bold text-[var(--paper)] hover:opacity-90 transition-opacity"
          >
            {AUTHOR.noteCta.label}
          </a>
        )}
        <div className="mt-2 flex items-center justify-center gap-4 text-[13px] text-[var(--ink-muted)]">
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
      </div>
    </aside>
  );
}
