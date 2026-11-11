import AuthorProfile from "@/components/ui/AuthorProfile/AuthorProfile";
import { WIDE_CONTAINER } from '@/components/layout/container';

// トップの運営者枠。共通 SSOT の AuthorProfile を variant="wide" で使い、下の note教材ヒーローと
// 同じ横幅（max-w-[1280px]）で詳細な経歴（AUTHOR.bio）を表示する。画像サイズ（120px）・保有資格の
// 箇条書きは SSOT として docs サイドバー等と統一。note CTA は直下ヒーローと重複するため出さない。
export default function AboutSection() {
  return (
    <section className={`${WIDE_CONTAINER} py-8 sm:py-10`}>
      <AuthorProfile variant="wide" showNoteCta={false} />
    </section>
  );
}
