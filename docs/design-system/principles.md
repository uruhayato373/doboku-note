# デザイン原則

> melta-ui の 5 設計原則を doboku-note に適応。
> ブランドパーソナリティ: 「正確・明快・信頼」

**本ドキュメントは UI（React/Tailwind コンポーネント）と SVG 図版の両方に適用されるカラー・レイアウト原則の真実源**。カラートークンは `src/styles/globals.css` の `--color-*` 変数で定義され、Tailwind には `brand` / `ink` / `positive` / `warn` / `danger` / `surface` として登録されている。SVG 側は同じ値をリテラル hex で書き、コメントでトークン名を併記する（詳細は `.claude/skills/authoring/create-svg/SKILL.md`）。

---

## 1. Layered（レイヤー構造）

UI は 3 層で構成する:

| レイヤー | 役割 | 実装 |
|---------|------|------|
| Background | 最下層・画面の地色 | `body` のデフォルト背景 |
| Surface | Background の上に乗る表層 | カード、blockquote、表の背景 |
| Text/Object | Surface 上のテキスト・アイコン | `#333333`（メインテキスト）、`#434343`（本文） |

**doboku-note 適用**: カスタム CSS (`src/styles/globals.css`) + Tailwind で制御。

---

## 2. Contrast（コントラスト）

WCAG 2.1 AA 準拠:

| 対象 | 最低比率 |
|------|---------|
| 通常テキスト（16px未満） | 4.5:1 |
| 大きなテキスト（18px bold / 24px+） | 3:1 |
| UI 要素（アイコン、ボーダー） | 3:1 |

**特記**: 本文 14px + `#434343` on white = コントラスト比 9.7:1（十分）

---

## 3. Semantic（セマンティック）

色は用途で使い分ける:

| 用途 | カラー |
|------|--------|
| メインテキスト | `#333333` |
| 本文テキスト | `#434343` |
| リンク | `#0066cc` → hover: `#004080` |
| 見出し h2 背景 | `#333333`（白抜き文字） |
| 見出し h3 ボーダー | `#333333`（左 5px） |
| ボーダー（通常） | `#d7d7d7` 〜 `#a3a3a3` |
| blockquote | 点線ボーダー `#666` |

---

## 4. Minimal（ミニマル）

- 装飾は最小限。情報の正確な伝達が最優先
- 見出し階層（h1〜h5）で視覚的ヒエラルキーを構成する
- カード・枠は情報のグルーピング目的のみに使用
- アニメーションは不要（技術文書には動きは要らない）

---

## 5. Grid（グリッド）

- **本文幅**: レイアウトコンポーネントで max-width 制限
- **行間**: `line-height: 1.8`（日本語の長文に最適化）
- **文字間**: `letter-spacing: 0.08em`（日本語の可読性向上）
- **段落間**: 適度な margin で区切りを明確に
- **セクション間**: 見出しの margin-top/bottom で十分な間隔

---

## doboku-note 固有の注意事項

1. **本文フォントサイズは 14px** — 技術文書の情報密度を考慮（モバイルでの要検証事項）
2. **h2 は白抜き** — 黒背景に白文字で章の区切りを明確化（独自スタイル）
3. **h3 は左ボーダー** — 節の区切りを視覚的に表現
4. **h4 はアイコンプレフィックス** — Font Awesome のアロー（`\f138`）で項を示す
5. **数式は横スクロール可能** — `scroll-equation` クラスで対応
6. **表は中央寄せ** — `table-wrapper` で flex 中央配置

---

## 7. Instagram カルーセル系（独立サブシステム）

本文記事の UI/SVG とは別系統で、Instagram カルーセル（exam-packs）専用のデザイントークンを管理する。1080×1350 のラスター画像生成専用で、`src/styles/globals.css` の `--color-*` とは独立。

- **真実源 JSON**: [`instagram-carousel-tokens.json`](./instagram-carousel-tokens.json)
- **人間可読仕様書**: [`instagram-carousel.md`](./instagram-carousel.md)
- **生成パイプライン**: Satori vDOM → Resvg PNG（`.claude/scripts/lib/sns-common/quiz-slides.mjs`）
- **フォント**: Manrope（英数）+ NotoSansJP（日本語）の 2 フォントスタック
- **配色方針**: 5管理別カラーテーマは廃止。単一 brand 色 + semantic（green 正答 / coral 誤答 / navy CTA）に統一。管理識別は cover-title 156px のテキストで行う

詳細は [`instagram-carousel.md`](./instagram-carousel.md) を読む。
