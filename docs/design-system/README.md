# doboku-note デザインシステム

土木工学ドキュメントサイトとしての可読性・学習効率・アクセシビリティを最優先するデザインシステム。

> 出典: melta-ui デザインシステムを doboku-note 向けに適応。

## ファイル構成

| ファイル | 内容 |
|---|---|
| `principles.md` | 5つのデザイン原則 + § 7 Instagram カルーセル系への入口 |
| `prohibited.md` | 禁止パターン一覧（SSOT） |
| `quick-reference.md` | コンポーネント・レイアウトのクイックリファレンス |
| `svg-tokens.json` | 記事内 SVG 用デザイントークン真実源（colors / font / geometry） |
| `instagram-carousel.md` | Instagram カルーセル（_exam-packs）デザイン仕様書 |
| `instagram-carousel-tokens.json` | Instagram カルーセル用デザイントークン真実源（Satori vDOM 生成が参照） |
| `note-cover.md` | note カバー画像（G2「全幅バナー帯」）デザイン仕様書。試験=色 / 系列=濃淡 |
| `note-cover-tokens.json` | note カバー用デザイントークン真実源（generate-note-covers.mjs / renderNoteCoverG2 が参照） |
| `proposals/` | リデザイン検討案アーカイブ（各サブフォルダに README + 静的プレビュー） |

> サイト OGP（mono-tag・全幅＋資格別テーマ色外枠）のデザイン SSOT は [`docs/reference/ogp-prompts.md`](../reference/ogp-prompts.md)。テーマ色は `note-cover-tokens.json` の `exams[].base` を OGP 外枠と共用する。

## 読み方

1. **原則** (`principles.md`) を最初に読んで全体の方向性を理解する
2. **禁止パターン** (`prohibited.md`) で「やってはいけないこと」を把握する
3. **クイックリファレンス** (`quick-reference.md`) で具体的な実装パターンを確認する

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フレームワーク | Next.js 16 + next-mdx-remote |
| スタイル | カスタム CSS (`src/styles/globals.css`) + Tailwind CSS |
| コンテンツ | MDX (Markdown + JSX) |
| 数式 | KaTeX |
| 図表 | Mermaid, PNG画像 |
| フォント | Noto Sans JP (本文), M PLUS 1 |
| アイコン | Font Awesome 5 |

## doboku-note 固有の注意事項

1. **ドキュメントサイト** — ダッシュボードやデータ可視化ではなく、長文テキスト・数式・図表の閲覧が主目的
2. **技術文書の可読性** — 土木工学の専門文書を読みやすく提示することが最重要
3. **モバイル対応** — 現場（屋外）でスマートフォンから参照されることが多い
4. **印刷対応** — 技術文書として印刷されることも想定
5. **数式のスクロール** — 長い数式は横スクロール可能にする（`scroll-equation` クラス）
