import AuthorSidebarCard from "@/components/ui/AuthorSidebarCard";

// トップの運営者枠。docs / カテゴリ hub の右サイドバーと同一の AuthorSidebarCard を再利用し、
// プロフィール画像サイズ（120px）・保有資格（箇条書き）・意匠を完全に統一する（旧・独自カードの
// サイズ/リスト不一致を解消）。直下に note教材ヒーロー（PremiumNoteHero）があるため note CTA は出さない。
export default function AboutSection() {
  return (
    <section className="mx-auto max-w-[1280px] border-t border-[var(--rule-soft)] px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
      <div className="mx-auto max-w-sm">
        <AuthorSidebarCard showNoteCta={false} />
      </div>
    </section>
  );
}
