import type { ReactNode } from "react";

interface BookSectionProps {
  /** セクション見出し。デフォルト "参考書籍"。記事内 h2 と区別するため div + 小ラベルでレンダリング */
  readonly title?: string;
  /** 見出し直下の説明文（誘導コピー） */
  readonly caption: string;
  /** 1枚または複数の <BookCard /> を子に渡す */
  readonly children: ReactNode;
  /** 外側コンテナの className を上書き／拡張したい場合に使用 */
  readonly className?: string;
}

/**
 * BookSection — 記事末・トップ末の補完導線として、見出し + キャプション + BookCard 群を
 * 1つの軽量コンテナにまとめて表示するセクションラッパー。
 *
 * 設計判断（2026-05-27）:
 * - moshimo `.easyLink-box` は独自に白背景 + 1px border + 20px padding を持つため、
 *   外側に border 付きカードを被せると二重カードになる。
 *   → 外側は薄い背景 (bg-gray-50/dark:bg-gray-900/40) のみで境界を作る。
 * - 旧実装は `<h2>` を使っており TOC に紛れていた。
 *   → div + 小ラベル（uppercase tracking-wide）に格下げし TOC ノイズを除去。
 * - 複数 BookCard（civil-textbook の合格テキスト + 一次過去問ペア等）を1キャプションで
 *   束ねる既存パターンを維持するため、`children` を可変個受け取る。
 */
export default function BookSection({
  title = "参考書籍",
  caption,
  children,
  className,
}: BookSectionProps) {
  const containerClass = [
    "rounded-card-content bg-gray-50 dark:bg-gray-900/40 px-4 py-4",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={containerClass}>
      <div className="text-[11px] font-bold tracking-[0.12em] text-ink-muted dark:text-gray-500 mb-1 uppercase">
        {title}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{caption}</p>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
