import type { ReactNode } from "react";
import { AFFILIATE_LINKS_ENABLED } from "@/config/affiliate-flags";

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
 * 設計判断（2026-05-27 → 2026-06-03 改訂）:
 * - moshimo `.easyLink-box` / SchoolAffiliate は独自に白背景 + border を持つ「カード」のため、
 *   外側に灰背景 + 左右パディングを被せると、内側カードが他の全幅カード（Callout 等）より
 *   一回り小さく inset され、見出しがカードの外（灰帯）に浮く二重ボックスになっていた。
 *   → 外側の灰背景・左右パディングを撤去し、見出し + キャプションを「リード文」として
 *     上に置き、子カードを本文と同じ全幅で描画する（内側カード = 唯一のカード境界）。
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
  // 書籍アフィリエイト休止中は見出し・キャプションごと非表示にする（子 BookCard は
  // null を返すため、ラッパーを残すと空の「参考書籍」枠だけが出てしまう）。
  if (!AFFILIATE_LINKS_ENABLED) {
    return null;
  }

  const containerClass = [className].filter(Boolean).join(" ");

  return (
    <section className={containerClass || undefined}>
      <div className="text-[11px] font-bold tracking-[0.12em] text-ink-muted dark:text-gray-500 mb-1 uppercase">
        {title}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{caption}</p>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
