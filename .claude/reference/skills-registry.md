# スキル一覧レジストリ

`.claude/skills/` 配下に定義されたスキル全量のインデックス。

**いつ読むか**: 利用可能なスキルを探すとき、新スキル作成時に重複がないか確認するとき、Phase 別の運用スコープを確認するとき。

個別スキルの詳細仕様・引数・手順は各 `SKILL.md` 本体を参照。このファイルは「どんなスキルがあるか」を俯瞰するためのインデックス。

---

## management — 計画・分析・戦略

| スキル | 用途 | 定義 |
|---|---|---|
| `/weekly-plan` | 週次計画を生成 | `.claude/skills/management/weekly-plan/SKILL.md` |
| `/weekly-review` | 週次レビューを生成 | `.claude/skills/management/weekly-review/SKILL.md` |
| `/north-star-metric` | NSM と Input Metrics を定義 | `.claude/skills/management/north-star-metric/SKILL.md` |
| `/growth-loops` | 成長ループの設計・評価 | `.claude/skills/management/growth-loops/SKILL.md` |
| `/monetization-strategy` | 収益化戦略のブレインストーム | `.claude/skills/management/monetization-strategy/SKILL.md` |
| `/critical-review` | 批判的レビュー | `.claude/skills/management/critical-review/SKILL.md` |
| `/knowledge` | 過去の失敗と学びを参照・追記 | `.claude/skills/management/knowledge/SKILL.md` |
| `/pre-mortem` | Pre-Mortem の実施 | `.claude/skills/management/pre-mortem/SKILL.md` |

## analytics — サイト分析（Phase 2で復活）

⏸️ **現在のスコープ**: Phase 1（試験対策 web サイト作成）では不要。
Phase 2（note 記事展開・iOS アプリ開発）時に以下を復活:

- `/fetch-gsc-data` — Google Search Console のデータ取得
- `/fetch-ga4-data` — Google Analytics 4 のアクセスデータ取得
- `/seo-audit` — SEO 総合監査

## dev — 開発

| スキル | 用途 | 定義 |
|---|---|---|
| `/review` | 対象ファイルの種類を自動判定し、適切なレビュースキル（review-mobile/check-mdx/code-review/design-review/critical-review 等）を実行して結果を集約する統一エントリーポイント | `.claude/skills/dev/review/SKILL.md` |
| `/dev-start` | ポート3020をクリーンアップして開発サーバー起動 | `.claude/skills/dev/dev-start/SKILL.md` |
| `/deploy` | Cloudflare Pages へデプロイ | `.claude/skills/dev/deploy/SKILL.md` |
| `/create-skill` | スキル作成ガイド | `.claude/skills/dev/create-skill/SKILL.md` |
| `/reset-git-history` | Git 履歴リセット | `.claude/skills/dev/reset-git-history/SKILL.md` |
| `/allow-tool` | ツール許可を settings.local.json に追加 | `.claude/skills/dev/allow-tool/SKILL.md` |
| `/sync-r2-images` | R2 上の画像をローカルに同期（npm run dev で画像が見えないとき） | `.claude/skills/dev/sync-r2-images/SKILL.md` |
| `/diff-r2` | ローカル `.local/r2/posts/` と R2 バケットの双方向差分を検出（only-local/only-remote/size-mismatch） | `.claude/skills/dev/diff-r2/SKILL.md` |
| `/generate-ogp` | OGP 画像の一括生成・個別生成（satori + resvg-js） | `.claude/skills/dev/generate-ogp/SKILL.md` |
| `/code-review` | Next.js コード品質レビュー（セキュリティ・パフォーマンス・保守性・a11y） | `.claude/skills/dev/code-review/SKILL.md` |
| `/monitor` | Monitor tool でバックグラウンド監視（dev/mojibake/ci/build/r2/frontmatter/health/mdx-validation） | `.claude/skills/dev/monitor/SKILL.md` |
| `/zenn-audit` | Zenn 本番 CSS と記事ページのタイポグラフィ＋レイアウトを比較し差分を Critical/Warning/Matches/Intentional で報告 | `.claude/skills/dev/zenn-audit/SKILL.md` |

## content — コンテンツ作成

### 試験対策ガイド生成（複数資格対応・テンプレート駆動）

| スキル | 用途 | 対応試験 | 汎用化 | 定義 |
|---|---|---|---|---|
| `/exam-guide --exam {exam-id}` | 試験対策ガイド生成（既存資産再構成、試験別設定ファイルでパラメタライズ） | civil-construction-1 / pe | 対応済み | `.claude/skills/content/exam-guide/SKILL.md` |

**テンプレート管理**: `.claude/skills/content/templates/exam-guide/` （新資格追加時は設定ファイル追加のみ）

### 試験問題集インポート（複数資格対応予定）

| スキル | 用途 | 対応試験 | 汎用化 | 定義 |
|---|---|---|---|---|
| `/exam-questions-import` | 試験第1次問題集 PDF→MDX 変換 | civil-construction-1 | Phase 2 で汎用化検討 | `.claude/skills/content/exam-questions-import/SKILL.md` |
| `/exam-questions-2-import` | 試験第2次問題集 PDF→MDX 変換 | civil-construction-1 | Phase 2 で汎用化検討 | `.claude/skills/content/exam-questions-2-import/SKILL.md` |

### 汎用的なコンテンツ作成スキル

| スキル | 用途 | 定義 |
|---|---|---|
| `/audit-staging` | Obsidian ステージングの公開準備度監査 | `.claude/skills/content/audit-staging/SKILL.md` |
| `/promote-to-site` | Obsidian MD → doboku-note MDX 変換・配置 | `.claude/skills/content/promote-to-site/SKILL.md` |
| `/pdf-to-mdx` | PDF/画像からテキスト抽出→MDX 変換 | `.claude/skills/content/pdf-to-mdx/SKILL.md` |
| `/clean-pdf-artifacts` | PDF 変換残骸の自動検出・除去 | `.claude/skills/content/clean-pdf-artifacts/SKILL.md` |
| `/check-mdx` | MDX 構文チェック | `.claude/skills/content/check-mdx/SKILL.md` |
| `/check-links` | 外部リンク切れ検出（HTTP HEAD 検証） | `.claude/skills/content/check-links/SKILL.md` |
| `/qa-pdf-mdx` | PDF→MDX 変換の品質検証・修正（PDF 照合＋修正の2段階） | `.claude/skills/content/qa-pdf-mdx/SKILL.md` |
| `/verify-pdf-mdx` | MDX の category/group を判定し、視覚検証・テキスト網羅率・5軸ルーブリック評価を適切な Evaluator エージェント（civil-construction-qa / cem-qa / content-qa）へルーティング | `.claude/skills/content/verify-pdf-mdx/SKILL.md` |
| `/add-exam-answers` | 択一式過去問 MDX の未解答設問に正答 PDF 準拠の解答・解説を追加 | `.claude/skills/content/add-exam-answers/SKILL.md` |
| `/keyword-page` | 総合技術監理キーワードページの作成・校正 | `.claude/skills/content/keyword-page/SKILL.md` |
| `/exam-backlinks` | 過去問⇔キーワード紐付けの確認・再生成・品質改善 | `.claude/skills/content/exam-backlinks/SKILL.md` |
| `/review-mobile` | モバイル視認性・可読性レビュー（表の適切性・数式・簡潔性） | `.claude/skills/content/review-mobile/SKILL.md` |
| `/create-svg` | MDX 記事用 SVG 図版の作成（モバイル視認性・デザイントークン準拠） | `.claude/skills/content/create-svg/SKILL.md` |
| `/illustrate-concept` | 概念図の視覚的メタファーを Web 画像から調査・提示し、合意後に `/create-svg` へ引き渡す着想スキル | `.claude/skills/content/illustrate-concept/SKILL.md` |

### PDF→MDX 試験特化スキル

| スキル | 用途 | 定義 |
|---|---|---|
| `/cem-pdf-to-mdx` | 技術士 CEM 用 PDF→MDX 変換（論文・事例特化） | `.claude/skills/content/cem-pdf-to-mdx/SKILL.md` |
| `/civil-construction-1-pdf-to-mdx` | 1級土木用 PDF→MDX 変換（過去問・基準特化） | `.claude/skills/content/civil-construction-1-pdf-to-mdx/SKILL.md` |

## ui — UI/UX

| スキル | 用途 | 定義 |
|---|---|---|
| `/design-review` | デザインシステム準拠レビュー（7カテゴリ・重大度判定） | `.claude/skills/ui/design-review/SKILL.md` |

## marketing — マーケティング

| スキル | 用途 | 定義 |
|---|---|---|
| `/x-post` | X（旧 Twitter）投稿テキスト生成（過去問・キーワードからサイト誘導） | `.claude/skills/marketing/x-post/SKILL.md` |
| `/note-post` | note.com 記事ドラフト生成（過去問分析・ガイド・キーワードまとめ） | `.claude/skills/marketing/note-post/SKILL.md` |
| `/find-x-accounts` | X でトピック別発信アカウント調査（Playwright 半自動・要手動ログイン） | `.claude/skills/marketing/find-x-accounts/SKILL.md` |

## strategy — 競合調査・市場分析（Phase 2で復活）

⏸️ **現在のスコープ**: Phase 1 では不要。Phase 2 時に以下を復活:

- `/keyword-gap` — GSC + 競合比較でコンテンツギャップを特定
- `/exam-demand` — 資格試験の検索需要調査・不足コンテンツ提案
- `/discover-exam-season` — 試験日程に基づく季節性コンテンツ戦略
- `/plan-affiliate` — 書籍・教材・通信講座のアフィリエイト記事企画

**その他のスキル** （competitor-audit, discover-trends-civil, content-roadmap）は Phase 3 で復活予定。

## ads — 広告・アフィリエイト（Phase 2で復活）

⏸️ **現在のスコープ**: Phase 1 では不要。Phase 2 時に以下を復活:

- `/register-affiliate-banner` — アフィリエイトバナーの登録
- `/audit-ads` — AdSense・アフィリエイトの現状監査と最適化提案

---

## 複数資格対応の進め方（Phase別）

複数の土木系資格試験（1級土木・技術士・コンクリート技士・測量士等）に対応するため、以下の段階的アプローチを採用している。

### Phase 1（2026-04-01〜）: テンプレート外部化

スキル本体は汎用のまま。**試験固有の設定をテンプレートフォルダで管理**し、新資格追加時はスキル追加を不要に。

```
/exam-guide --exam {exam-id}
  → 設定参照: .claude/skills/content/templates/exam-guide/{exam-id}.md

対応済み:
  - civil-construction-1.md（1級土木施工管理技士）
  - pe.md（技術士建設部門 / pe-comprehensive-management）
```

**新資格追加時の作業**:
1. `templates/exam-guide/{exam-id}.md` を新規作成（テンプレートのコピー＋設定入力）
2. スキル側は変更なし

**退役済み**:
- `/pe-exam-guide`（2026-04-15 削除）: 試験別個別スキルの廃止方針に従い `/exam-guide --exam pe` に統合

**メリット**: スキル数削減。ハーネス設計原則4「スキルを増やすより既存スキルのパラメータ化を優先」に完全準拠。

### Phase 3（2027年以降）: 医師・弁護士など他分野対応

同じテンプレート駆動アプローチで、医療系・法律系資格にも対応可能。スキル追加ゼロ。
