# doboku-note

土木・建設系の実務資格受験者向け技術ノート・試験対策サイト。現在は **1 級土木施工管理技士** と **技術士（総合技術監理部門）** を整備中、将来的に技術士（建設部門）・コンクリート主任技師・コンクリート診断士・行政書士へ段階的に拡張。Next.js + MDX + Cloudflare Pages で構築。

本番サイト: <https://doboku-note.com>

## ドキュメント

プロジェクト構造・運用・執筆ガイドの真実源は [`CLAUDE.md`](./CLAUDE.md) のリファレンス索引から辿れます。代表的なエントリ:

### 執筆者・コンテンツ生成者向け

- [`.claude/content-principles.md`](./.claude/content-principles.md) — コンテンツ品質ルールの真実源（ExamPoint 個数・参考資料構成・Callout 12 種の使い分け等）
- [`.claude/reference/content-authoring.md`](./.claude/reference/content-authoring.md) — MDX コンポーネント・過去問構造・モバイル視認性詳細・frontmatter テンプレ
- [`.claude/reference/image-policy.md`](./.claude/reference/image-policy.md) — 図版種別判定フロー・CC/PD 写真ソース・出典表記

### UI コンポーネント視覚リファレンス

- **[`docs/ui/callout-gallery.md`](./docs/ui/callout-gallery.md)** — Callout 全 12 種の視覚ギャラリー（PNG スクショ + MDX 用例）。GitHub 画面で直接視覚確認可能
- [`src/components/ui/Callout/README.md`](./src/components/ui/Callout/README.md) — Callout コンポーネントの実装リファレンス

### プロジェクト管理

- [`docs/project/01_設計思想.md`](./docs/project/01_設計思想.md) — プロジェクトの設計思想
- [`docs/project/02_事業戦略.md`](./docs/project/02_事業戦略.md) — 事業戦略
- [`docs/project/05_収益化戦略.md`](./docs/project/05_収益化戦略.md) — 収益化戦略

## ライセンス

本プロジェクトのコードは個人運営のため、明示的なライセンスを設定していません。コンテンツの引用・参照は出典明記の上お願いします。
