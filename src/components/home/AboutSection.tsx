import AuthorProfile from "@/components/ui/AuthorProfile/AuthorProfile";

// トップの運営者枠。共通 SSOT の AuthorProfile を variant="wide" で使い、下の note教材ヒーローと
// 同じ横幅（max-w-[1280px]）で詳細な経歴（AUTHOR.bio）を表示する。画像サイズ（120px）・保有資格の
// 箇条書きは SSOT として docs サイドバー等と統一。note CTA は直下ヒーローと重複するため出さない。
export default function AboutSection() {
  return (
    <section className="mx-auto max-w-[1280px] border-t border-[var(--rule-soft)] px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
      <AuthorProfile variant="wide" showNoteCta={false} />
    </section>
  );
}
