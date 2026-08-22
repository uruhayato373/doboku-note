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
| `subtitle` | `string` | - | title 直下にマーカー風ハイライトで表示する補足文。title 省略時は描画されない |
| `items` | `ListItem[]` | 必須 | `string` / `ReactNode` / `{ content: ReactNode }` |
| `ordered` | `boolean` | `true` | `true` = `<ol>` 連番（01, 02, ...）、`false` = `<ul>` マーカー |
| `marker` | `"dot" \| "dash" \| "square"` | `"dot"` | unordered 時のマーカー形状 |
| `accent` | `"default" \| "brand"` | `"default"` | 上罫線の色アクセント。`brand` でブランド色（ExamPoint 用） |
| `className` | `string` | `""` | 追加クラス名 |

## デザイン仕様

- 外枠は `--rule-soft`、上罫は **2px 実線**（`--ink`、または `accent="brand"` で `--accent`）
- 背景は `--paper`、角丸は `--radius-card-content`
- `subtitle` 指定時: title 下に 14px semibold で表示、背景に `--accent-fill` のマーカーペン風グラデ
- ヘッダー: タイトル（15px bold）
- 各行: `grid-template-columns: 20px 1fr` — 左マーカー + 右本文
- 行間の区切りは **破線 1px**（最終行のみ破線なし）
- 連番: system mono stack の `01` `02` でアクセントカラー（`--accent`）
- マーカー 3 種: `dot`（6px 円）/ `dash`（—）/ `square`（▪）
- ダークモードは Editorial token の `.dark` 上書きで自動切替

デザイントークン（`src/styles/globals.css`）を利用: `--ink` / `--ink-body` / `--rule-soft` / `--accent` / `--paper` / `--accent-fill` / `--radius-card-content`

視覚的イメージは [`docs/design/speclist-gallery.md`](../../../../docs/design/speclist-gallery.md) を参照（各バリエーションのスクリーンショット付き）。

## 旧コンポーネントからの移行（2026-04-22 PR で実施済み）

| 旧コンポーネント | 新書き方 |
|---|---|
| `<CustomOrderedList title=".." items={[..]} />` | `<SpecSheetList title=".." items={[..]} ordered />` |
| `<CustomUnorderedList title=".." items={[..]} style="modern" />` | `<SpecSheetList title=".." items={[..]} ordered={false} marker="dot" />` |

既存 MDX 4 箇所（essay-exam-strategy × 2, exam-application-guide × 2）は移行済み。`CustomOrderedList` / `CustomUnorderedList` コンポーネントは削除済み。

## 関連ファイル

- 実装: [`SpecSheetList.tsx`](./SpecSheetList.tsx)
- スタイル: [`SpecSheetList.module.css`](./SpecSheetList.module.css)
- ギャラリー（PNG スクショ付き）: [`docs/design/speclist-gallery.md`](../../../../docs/design/speclist-gallery.md)
