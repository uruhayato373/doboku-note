import Link from "next/link";
import { AUTHOR } from "@/config/author";

interface AuthorSidebarCardProps {
  /** 表示中ページのカテゴリ。note 送客先をカテゴリ別に出し分ける（未指定/未登録は L1 全資格案内）。 */
  readonly category?: string | undefined;
}

/**
 * AuthorSidebarCard — 右サイドバー用の縦型 運営者プロフィールカード。
 *
 * 著者 SSOT（src/config/author.ts）を読み、アバター・名前・肩書き・短縮 bio・note 送客・
 * /about 導線を縦に積む。E-E-A-T／合格体験者ポジションの提示が目的。
 * 記事末尾の横型 AuthorCard（日付つき）とは別フォーマットで、カテゴリ hub と docs の
 * 両サイドバーで共有する。資格は jobTitle / shortBio に既に含まれるため重複表示しない。
 * 意匠はカテゴリサイドバー（PopularRanking 等）と同じエディトリアル系トークンに合わせる。
 */
export default function AuthorSidebarCard({ category }: AuthorSidebarCardProps) {
  const noteMap = AUTHOR.noteByCategory as Record<string, { noteUrl: string; noteLabel: string }>;
  const note = (category && noteMap[category]) || AUTHOR.noteDefault;

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
              width={72}
              height={72}
              className="h-[72px] w-[72px] rounded-full border border-[var(--rule-soft)]"
            />
          </Link>
          <Link
            href="/about"
            className="mt-3 font-serif text-lg font-black text-[var(--ink)] hover:text-[var(--accent)] transition-colors"
          >
            {AUTHOR.name}
          </Link>
          <p className="mt-1 text-[12px] leading-snug text-[var(--ink-muted)]">{AUTHOR.jobTitle}</p>
        </div>
        <p className="mt-3 text-[13px] leading-[1.8] text-[var(--ink-body)]">{AUTHOR.shortBio}</p>
        <div className="mt-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--ink-muted)] mb-1.5">
            保有資格
          </div>
          <p className="text-[11.5px] leading-[1.7] text-[var(--ink-body)]">
            {AUTHOR.qualifications.join("・")}
          </p>
        </div>
        <a
          href={note.noteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-3.5 py-2 text-[12px] font-bold text-[var(--paper)] hover:opacity-90 transition-opacity"
        >
          {note.noteLabel}
        </a>
        <div className="mt-2 flex items-center justify-center gap-4 text-[11px] text-[var(--ink-muted)]">
          <a
            href={AUTHOR.twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--accent)] hover:underline"
          >
            X @dobokunotecom
          </a>
          <Link href="/about" className="hover:text-[var(--accent)] hover:underline">
            運営者について →
          </Link>
        </div>
      </div>
    </aside>
  );
}
