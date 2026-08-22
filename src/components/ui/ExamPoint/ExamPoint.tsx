import SpecSheetList from "../SpecSheetList/SpecSheetList";

interface ExamPointProps {
  summary: string;
  items: string[];
}

/**
 * ExamPoint — 記事末尾の試験対策ポイント総括ボックス。
 *
 * 2026-04-24 から SpecSheetList のラッパーとして再実装（コンポーネント統一）。
 * 「試験対策ポイント」固定ラベル + ブランド色上罫線アクセントで視覚的ポジションを維持しつつ、
 * 仕様書調デザインに統合されている。
 *
 * 旧実装（浮きカード + 左にはみ出す青チップ）はモバイル視認性の問題があったため廃止。
 * API（summary + items）は 690 MDX 呼び出しと完全互換。
 */
export default function ExamPoint({ summary, items }: ExamPointProps) {
  if (!items || items.length === 0) return null;

  return (
    <SpecSheetList
      title="試験対策ポイント"
      subtitle={summary}
      items={items}
      ordered={false}
      marker="dot"
      accent="brand"
    />
  );
}
