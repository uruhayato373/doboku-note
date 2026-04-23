# SpecSheetList コンポーネント

doboku-note の記事本文中で使う**仕様書調リスト**。点検項目・留意事項・手順などを整った体裁で列挙するための MDX コンポーネント。

2026-04-22 Claude Design ハンドオフ（box-handoff.zip）の提案に基づき、従来の `CustomOrderedList` と `CustomUnorderedList` を**統合した単一コンポーネント**として導入。

## 使い方（MDX 側）

```mdx
<SpecSheetList
  title="コンクリート構造物の維持管理における点検項目"
  items={[
    "ひび割れの発生状況と進展傾向の把握",
    "中性化深さとかぶり厚さの測定",
    "鉄筋腐食に起因する錆汁・剥離の確認",
  ]}
  ordered
/>

<SpecSheetList
  title="施工時の安全確保に関する留意事項"
  items={["重機稼働範囲への立入禁止", "墜落防止措置の徹底"]}
  ordered={false}
  marker="dot"
/>
```

## Props

| Prop | Type | Default | 説明 |
|---|---|---|---|
| `title` | `string` | - | リストのタイトル（省略可） |
| `items` | `ListItem[]` | 必須 | `string` / `ReactNode` / `{ content: ReactNode }` |
| `ordered` | `boolean` | `true` | `true` = `<ol>` 連番（01, 02, ...）、`false` = `<ul>` マーカー |
| `marker` | `"dot" \| "dash" \| "square"` | `"dot"` | unordered 時のマーカー形状 |
| `className` | `string` | `""` | 追加クラス名 |

## デザイン仕様

- 上罫 **2px 実線**（`--color-ink-strong`）+ 下罫 1px（`--color-border`）
- ヘッダー: タイトル（15px bold）+ 右にモノスペースで「`05 items`」カウント
- 各行: `grid-template-columns: 38px 1fr` — 左マーカー + 右本文
- 行間の区切りは **破線 1px**（最終行のみ破線なし）
- 連番: `JetBrains Mono` `01` `02` でブランドカラー（`--color-brand`）
- マーカー 3 種: `dot`（6px 円）/ `dash`（—）/ `square`（▪）
- ダークモードは `.dark` クラス上書きで自動切替（既存機構）

デザイントークン（`src/styles/globals.css`）を利用: `--color-ink-strong` / `--color-ink-body` / `--color-ink-muted` / `--color-border` / `--color-brand`

視覚的イメージは [`docs/ui/speclist-gallery.md`](../../../../docs/ui/speclist-gallery.md) を参照（各バリエーションのスクリーンショット付き）。

## 旧コンポーネントからの移行（2026-04-22 PR で実施済み）

| 旧コンポーネント | 新書き方 |
|---|---|
| `<CustomOrderedList title=".." items={[..]} />` | `<SpecSheetList title=".." items={[..]} ordered />` |
| `<CustomUnorderedList title=".." items={[..]} style="modern" />` | `<SpecSheetList title=".." items={[..]} ordered={false} marker="dot" />` |

既存 MDX 4 箇所（essay-exam-strategy × 2, exam-application-guide × 2）は移行済み。`CustomOrderedList` / `CustomUnorderedList` コンポーネントは削除済み。

## 関連ファイル

- 実装: [`SpecSheetList.tsx`](./SpecSheetList.tsx)
- スタイル: [`SpecSheetList.module.css`](./SpecSheetList.module.css)
- Storybook: [`SpecSheetList.stories.tsx`](./SpecSheetList.stories.tsx)
- ギャラリー（PNG スクショ付き）: [`docs/ui/speclist-gallery.md`](../../../../docs/ui/speclist-gallery.md)
