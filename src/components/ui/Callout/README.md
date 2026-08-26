# Callout コンポーネント

doboku-note の記事本文中に表示される、色 + アイコン + 任意タイトルで論点を視覚分離するコンポーネント。MDX から `<Callout type="..." title="...">...</Callout>` で呼び出す。

## 使い方（MDX 側）

```mdx
<Callout type="warn" title="変動性を逆転させた誤答に注意">
  サービスは提供者・顧客・状況に左右されるため、工業製品のような均質な繰り返し提供は本質的に難しい。
</Callout>
```

`title` は省略可能。省略時はアイコン + 色のみのミニマル表示。

## サポートする type（12 種）

| type | 日本語 | 色 | アイコン | 用途 |
|---|---|---|---|---|
| `note` | メモ | 青（blue） | `Info` | 事実の強調・補足情報 |
| `tip` | ポイント | 緑（emerald） | `Lightbulb` | 学習コツ・覚え方のヒント |
| `warn` | 注意 | 橙（amber） | `AlertTriangle` | 行動への警告・頻出引っかけ |
| `danger` | 重大リスク | 赤（red） | `Ban` | 致命的な誤解・重大な誤答 |
| `success` | 合格ライン | 緑濃（green） | `CheckCircle` | 到達水準・達成条件 |
| `exam` | 出題頻度 | 桃（pink） | `Flag` | 本文中の出題頻度アクセント |
| `formula` | 公式 | 藍（indigo） | `Sigma` | 公式・計算原理 |
| `standard` | 基準・規格 | 紫（violet） | `BookOpen` | JIS / ISO / 法令条文 |
| `example` | 実例 | 青緑（cyan） | `Beaker` | 具体的な計算例・事例 |
| `reference` | 参考文献 | 灰（slate） | `Link2` | 書籍・論文への誘導（note 記事は `<NoteLink>`、一般外部 URL は `<LinkCard>`） |
| `faq` | よくある質問 | 黄（yellow） | `MessageSquare` | Q&A 形式の補足 |
| `quote` | 引用 | 中立灰（zinc） | `Quote` | 原典文献の直接引用 |

視覚的イメージは [`docs/design/callout-gallery.md`](../../../../docs/design/callout-gallery.md) を参照（各種のスクリーンショット付き）。

## デザイン仕様

- 左アクセントバー: `border-l-[3px]` + トーン色（`--ct-{tone}-bd`）
- 円形アイコン: 22px、左上絶対配置、トーン色背景 + 白アイコン
- タイトル: `text-[15px] font-bold` + トーン色（`--ct-{tone}-fg`）
- 本文: `text-[1em] leading-relaxed text-[var(--ink-body)]`（周囲の prose と同じ文字サイズを継承。タイトル無しの場合はアイコン分のインデント `pl-9` を付与）
- パネル背景・アクセント色は Tailwind の `bg-{tone}-*` ではなく CSS 変数 `--ct-{tone}-{bg|bd|fg}`（`globals.css` に定義・light/dark で自動切替）を inline style で適用
- 角丸: `rounded-card-inline`（デザイントークン）

型の識別は「アイコン + 色」で行う（zip 原設計準拠）。ラベルテキスト（"NOTE" や "ポイント"）は描画せず、スクリーンリーダー向けには `aria-label="{LABEL}: {jp}"` で補完。

## 旧 type からの移行（2026-04-22 PR #96 で実施済み）

`LEGACY_ALIASES`（`Callout.tsx`）が真実源。この表と実装がずれたら実装を優先し、この表を直す。

| 旧 type | 新 type |
|---|---|
| `info` | `note` |
| `warning` | `warn` |
| `caution` | `warn` |
| `point` | `tip` |
| `error` | `danger` |

上記にない type（`question` など完全に削除済みの旧 type を含む）は未知 type として `note` へフォールバックする（`scripts/check-callout-types.mjs` が検出）。既存 MDX はすべて移行済み。新規執筆では旧 type を使用しない。

## 使用ルール

- **1 記事に 3 個以内**（メリハリ用・過剰装飾禁止）
- **絵文字は使わない**（❌✅💡🔑 等は禁止、Callout で表現する）
- **`<ExamPoint>` との使い分け**: ExamPoint は記事末尾の構造化総括、`<Callout type="exam">` は本文中の単発アクセント

詳細な使用ガイド（どの論点にどの type を使うか）は [`.claude/knowledge/reference/content-principles.md`](../../../../.claude/knowledge/reference/content-principles.md) の「過剰装飾を避ける」節を参照。

## 関連ファイル

- 実装: [`Callout.tsx`](./Callout.tsx)
- ギャラリー（PNG スクショ付き）: [`docs/design/callout-gallery.md`](../../../../docs/design/callout-gallery.md)
- 使用ガイド: [`.claude/knowledge/reference/content-principles.md`](../../../../.claude/knowledge/reference/content-principles.md)
- 型移行スクリプト: [`.claude/scripts/migrate-callout-types.mjs`](../../../../.claude/scripts/migrate-callout-types.mjs)
