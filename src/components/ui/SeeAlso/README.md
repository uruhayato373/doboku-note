# SeeAlso コンポーネント

本文中の内部リンクを「あわせて読みたい」カードとして強調するコンポーネント。Callout（1 記事 3 個ルール）から独立した、内部リンク専用の誘導カード。

## 使い方（MDX 側）

```mdx
<SeeAlso
  href="/docs/pe-comprehensive-management-management-tradeoffs"
  title="5 管理間トレードオフ 頻出パターンと解決フレーム"
  reason="5 管理の交差点で起こる調整パターンを、出題頻度・解答テンプレ込みで一箇所に集約している。"
/>
```

`reason` は省略可能。タイトルだけでも動く。

## デザイン仕様

- 左に円形 BookOpenCheck アイコン（28px、`brand` 色背景 + 白アイコン）
- 中央: 「あわせて読みたい」ラベル（11px・brand-deep）+ 太字タイトル（15px・ink-strong）+ reason（14px・ink-body）
- 右に矢印（`ArrowRight`、hover で brand 色）
- カード全体クリッカブル（`hover:shadow-card-hover` + `hover:border-brand`）
- 角丸 `rounded-card-content` / shadow `shadow-card-content`（CLAUDE.md のデザイントークン準拠）
- ダークモード対応（`dark:bg-gray-900` / `dark:border-gray-700` / `dark:text-gray-100`）

## 使い分け（類似コンポーネント比較）

| コンポーネント | 用途 | 視覚 | 1 記事の上限 |
|---|---|---|---|
| `<SeeAlso>` | 内部リンクを 1 件強調誘導 | 単独カード（青ブック + 矢印） | **5 個** |
| `<Callout type="note">` | 本文の単発アクセント | 左アクセント + 円形アイコン | 3 個（全 type 合計） |
| `<RelatedKeywords>` | 末尾の関連キーワード一覧 | slate トーン Callout（パイプ区切り） | 1 個 |
| `<LinkCard>` | **外部** URL（メタデータ自動取得） | 横型カード（OG 画像を左に本来比・モバイルは画像上） | - |
| 本文 inline link | 軽い参照（「詳細は [X] 参照」） | プロセス青下線リンク | 制限なし |

## 使用ルール

- **1 記事 5 個以内**（過剰な装飾を避ける、content-principles 準拠）
- **内部リンク専用**（外部 URL を渡さない。外部は `<LinkCard>` を使う）
- **「ここで深掘りせず、別ページに集約しているもの」を本文中で目立たせる用途**。重要度の低い参照は本文 inline link でよい

## 関連ファイル

- 実装: [`SeeAlso.tsx`](./SeeAlso.tsx)
- 使用ガイド: [`.claude/knowledge/reference/content-principles.md`](../../../../.claude/knowledge/reference/content-principles.md)
