import AuthorProfile from "@/components/ui/AuthorProfile/AuthorProfile";
import { WIDE_CONTAINER } from '@/components/layout/container';

// トップの運営者枠。共通の AuthorProfile（variant="wide"）を短い形（summary: 肩書きの 1 行と資格の数・経歴の全文と保有資格の一覧は /about）で出す。
// 以前は経歴の全文と保有資格の一覧で PC 650px・スマホ 1.5 画面を占め、収益の導線より手前にあった（2026-11-22）。note CTA は上の「いまの教材」と重なるので出さない。
export default function AboutSection() {
  return (
    <section className={`${WIDE_CONTAINER} py-8 sm:py-10`}>
      <AuthorProfile variant="wide" showNoteCta={false} summary />
    </section>
  );
}
