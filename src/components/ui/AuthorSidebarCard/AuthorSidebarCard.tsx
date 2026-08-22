import AuthorProfile from "@/components/ui/AuthorProfile/AuthorProfile";

/**
 * AuthorSidebarCard — 右サイドバー（docs / カテゴリ hub）用の運営者プロフィール。
 * 実体は共通 SSOT コンポーネント AuthorProfile（variant="sidebar"）。既存呼び出しとの
 * 後方互換のため薄いラッパーとして残す（画像サイズ・保有資格の描画は AuthorProfile が SSOT）。
 */
export default function AuthorSidebarCard({
  showNoteCta = true,
}: {
  readonly showNoteCta?: boolean;
} = {}) {
  return <AuthorProfile variant="sidebar" showNoteCta={showNoteCta} />;
}
