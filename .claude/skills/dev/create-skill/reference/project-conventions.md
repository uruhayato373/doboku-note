# stats47 プロジェクトのスキル規約

## ディレクトリ分類

```
.claude/skills/
├── db/          # データベース・ストレージ操作
├── estat/       # e-Stat API 操作
├── blog/        # ブログ記事
├── note/        # note.com 記事
├── sns/         # SNS 投稿
├── content/     # ランキングページ向けコンテンツ
├── analytics/   # サイト分析
├── ads/         # 広告・アフィリエイト
├── ranking/     # ランキング画像
├── management/  # 経営・計画
├── ui/          # UI/UX レビュー
└── dev/         # 開発・デプロイ
```

新しいスキルは適切なカテゴリに配置する。

## CLAUDE.md への登録

スキル作成後、`CLAUDE.md` のスキル一覧テーブルに追加する:

```markdown
| `/skill-name` | 用途の説明 | `.claude/skills/<category>/<name>/SKILL.md` |
```

## 命名規則

- ケバブケース: `generate-note-charts`, `sync-remote-d1`
- 動詞始まり: `generate-`, `fetch-`, `sync-`, `render-`, `publish-`, `validate-`
- 対象を含める: `-note-`, `-blog-`, `-estat-`

## ワークフロー内での位置づけ

多くのスキルはワークフローチェーンの一部。SKILL.md 冒頭にフロー図を記載する:

```markdown
## フロー
/validate-note-idea → /investigate-note-data → /design-note-structure → ★/write-note-section → /edit-note-draft
```

★ で現在のスキルの位置を示す。

## DB 操作パターン

ローカル D1 を操作するスキルの共通パターン:

```js
const Database = require('better-sqlite3');
const db = new Database('.local/d1/v3/d1/miniflare-D1DatabaseObject/baffe56c6b0173e34c63a5333065bcdb6642a01b4c2cfecd70ad3607b00c9972.sqlite');
```

リモート D1 への反映は別スキル (`/sync-remote-d1`) で行う。

## 一時スクリプトの扱い

- 使い捨てスクリプトは `scripts/temp-*.mjs` の命名
- Phase の最後で必ず削除
- スキルの `scripts/` ディレクトリに置くスクリプトは永続的なもののみ

## SVG/PNG 生成パターン

画像生成スキルの共通パターン:

1. SVG を Node.js スクリプトで生成
2. `sharp` ライブラリで PNG 変換（`density: 288` が標準、カバー画像は `density: 72`）
3. `.gitignore` 対象の `images/` ディレクトリに出力

## 既存スキルの参考例

| パターン | 参考スキル | 特徴 |
|----------|-----------|------|
| scripts/ 同梱 | `/generate-note-charts` | scatter.js (パラメータ駆動), cover-template.js (テンプレート), svg-to-png.js (汎用) |
| reference/ 分離 | `/generate-note-charts` | design-system.md, chart-patterns.md |
| examples/ 同梱 | `/generate-note-charts` | 完成 SVG を保存 |
| ワークフローチェーン | `/write-note-section` | validate → investigate → design → write → edit |
| Phase 構成 | `/register-ranking` | 5 Phase（事前確認→登録→投入→検証→後処理）|
| サブエージェント委譲 | `/weekly-plan` | 並列サブエージェントで収集→分析→レビュー |
| svg-builder 連携 | `/generate-article-charts` | パッケージ API リファレンス付き |
