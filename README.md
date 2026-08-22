# doboku-note

土木・建設系の実務資格受験者向け技術ノート・試験対策サイト。現在は **1 級土木施工管理技士** と **技術士（総合技術監理部門）** を整備中、将来的に技術士（建設部門）・コンクリート主任技士・コンクリート診断士・行政書士へ段階的に拡張。Next.js + MDX + Cloudflare Pages で構築。

本番サイト: <https://doboku-note.com>

## ローカル開発

```bash
npm install
npm run dev
```

`npm run dev` はサイト（3020番）とローカル画像サーバー（3022番）を同時に起動し、`content/site` の画像を `/posts/*` で配信します。開発画面は R2 に直接依存せず、ローカルに無い画像だけプレースホルダーで表示します。必要な画像を取得できるネットワークでは `npm run download-images`、特定範囲だけなら `npm run download-images -- --prefix <category/slug>` を使用します。R2 へのアップロードと同期監査は GitHub Actions が担当します。

## ドキュメント

プロジェクト構造・運用・執筆ガイドの真実源は [`CLAUDE.md`](./CLAUDE.md) のリファレンス索引から辿れます。代表的なエントリ:

### 執筆者・コンテンツ生成者向け

- [`.claude/knowledge/reference/content-principles.md`](./.claude/knowledge/reference/content-principles.md) — コンテンツ品質ルールの真実源（ExamPoint 個数・参考資料構成・Callout 12 種の使い分け等）
- [`.claude/knowledge/reference/content-authoring.md`](./.claude/knowledge/reference/content-authoring.md) — MDX コンポーネント・過去問構造・モバイル視認性詳細・frontmatter テンプレ
- [`.claude/knowledge/reference/image-policy.md`](./.claude/knowledge/reference/image-policy.md) — 図版種別判定フロー・CC/PD 写真ソース・出典表記

### UI コンポーネント視覚リファレンス

- **[`docs/design/callout-gallery.md`](./docs/design/callout-gallery.md)** — Callout 全 12 種の視覚ギャラリー（PNG スクショ + MDX 用例）
- **[`docs/design/speclist-gallery.md`](./docs/design/speclist-gallery.md)** — SpecSheetList 全 5 バリエーションの視覚ギャラリー（仕様書調リスト）
- [`src/components/ui/Callout/README.md`](./src/components/ui/Callout/README.md) — Callout コンポーネントの実装リファレンス
- [`src/components/ui/SpecSheetList/README.md`](./src/components/ui/SpecSheetList/README.md) — SpecSheetList コンポーネントの実装リファレンス

### プロジェクト管理

- [`docs/README.md`](./docs/README.md) — 恒久文書の領域構成と入口
- [`docs/strategy/02_設計思想.md`](./docs/strategy/02_設計思想.md) — プロジェクトの設計思想
- [`docs/strategy/03_事業戦略.md`](./docs/strategy/03_事業戦略.md) — 事業戦略
- [`docs/strategy/04_収益化戦略.md`](./docs/strategy/04_収益化戦略.md) — 収益化戦略

## ライセンス

本プロジェクトのコードは個人運営のため、明示的なライセンスを設定していません。コンテンツの引用・参照は出典明記の上お願いします。
