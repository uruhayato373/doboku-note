# Instagram カルーセル 51 bundle 集約運用ガイド

`src/config/ig-section-bundles.json` を SoT とする Instagram カルーセル投稿の集約モデル。1 bundle = 1 投稿で 5 管理 600+ キーワードを **51 投稿**で全網羅する設計。

最終更新: 2026-05-26

## 1. 設計思想

### 旧モデル（〜2026-05-25）
- 1 KW = 1 投稿 = 1 ディレクトリ (`YYYY-MM-DD-<slug>/`)
- 5 年分プレースホルダ 722 件
- 利点: 完全自動・SEO 個別 KW 強・量産モデル
- 欠点: 投稿数膨大・git 重い・同テーマの重複露出

### 新モデル（2026-05-26〜）
- 1 bundle = 1 投稿 = 10-20 KW のカルーセル
- 5 管理 26 セクション 124 太字グループから **51 bundle** に再集約
- 公式キーワード集の章立てに準拠
- 利点: 投稿数 92% 削減・体系学習動線・「保存して試験前日に見返す」価値最大化
- 欠点: 個別 KW 検索流入は弱体化（→ サイト記事側で補完）

## 2. ファイル構造

```
src/config/
├── pe-keyword-bundles.json       ← MDX パース結果（L1/L2/L3/L4 階層）
└── ig-section-bundles.json       ← 51 投稿 bundle SoT（パイプラインから参照）

scripts/
├── extract-pe-keyword-bundles.mjs  ← keyword-2026/article.mdx パーサ
└── generate-ig-bundle-plan.mjs     ← 集約ルール適用器（51 bundle 計算）
└── generate-ig-bundle-dirs.mjs     ← bundle ディレクトリ + slide-data.json 生成器

docs/sns/instagram/
├── _section-bundles/               ← 新構造（51 ディレクトリ）
│   ├── 2-2-1-part1/                ← 経済性管理 事業企画 Part 1
│   │   ├── slide-data.json
│   │   ├── carousel/img/
│   │   └── reels/
│   ├── 2-2-1-part2/
│   ├── 2-2-2/
│   └── ...（計 51）
│
│   ※ `_` prefix で upload-instagram-assets.yml の `grep -v '^_'` 除外ルールに乗る
│     → 本番準備未完了 bundle が R2 にアップロードされる事故を防止
├── _backlog/                       ← 旧構造（722 ディレクトリ退避済）
│   ├── 2026/  102 件
│   ├── 2027/  157 件
│   ├── 2028/  156 件
│   ├── 2029/  150 件
│   └── 2030/  157 件
├── profile.md                      ← IG プロフィール SoT
├── README.md
└── _keyword-findings.md
```

## 3. データフロー

```
.local/r2/posts/pe-comprehensive-management/keyword-2026/article.mdx (公式キーワード集 MDX)
  │
  ▼ scripts/extract-pe-keyword-bundles.mjs (MDX → 構造化 JSON)
  │
src/config/pe-keyword-bundles.json (5 章 × 26 セクション × 124 グループ × 655 KW)
  │
  ▼ scripts/generate-ig-bundle-plan.mjs (集約ルール適用: 1 投稿 ≤ 20 KW)
  │
src/config/ig-section-bundles.json (51 bundle)
  │
  ▼ scripts/generate-ig-bundle-dirs.mjs (ディレクトリ生成)
  │
docs/sns/instagram/_section-bundles/<bundle-dir>/slide-data.json (運営者が body を埋める)
  │
  ▼ ig-post-create.mjs (slide → PNG/Reels) ※次フェーズで bundle 対応
  │
Meta Graph API → Instagram (本番投稿) ※T-003 認証ブロッカー解消後
```

## 4. bundle 命名規約

bundleId は `<chapter-id>-<section-id>[-part<N>]` 形式：

| bundleId | 意味 | ディレクトリ名 |
|---|---|---|
| `2-2.1-part1` | 経済性管理 → 事業企画 Part 1 | `2-2-1-part1` |
| `2-2.2` | 経済性管理 → 品質の管理（分割不要） | `2-2-2` |
| `3-3.2-part4` | 人的資源管理 → 労働関係法と労務管理 Part 4 | `3-3-2-part4` |

ディレクトリ名は `.` を `-` に置換（Windows / git 互換性のため）。

## 5. slide-data.json スキーマ

```jsonc
{
  "cover": {
    "keyword": "事業企画 Part 1",        // = bundle.bundleTitle
    "subtitle": "事業企画",                // = bundle.sectionTitle
    "stickyText": "経済性管理\n17KW",     // 章 + KW 数
    "management": "economy"                // 5 管理色: economy/hr/info/safety/environment
  },
  "slides": [
    {
      "type": "intro",                     // 1 枚目: 全 KW 一覧
      "heading": "この投稿で学ぶこと",
      "body": "市場調査、需要予測、...",    // KW タイトルをカンマ区切り
      "noteText": "経済性管理 事業企画（...グループ名...）"
    },
    {
      "type": "board",                     // 2〜N-1 枚目: 1 KW = 1 slide
      "heading": "市場調査",                // KW タイトル
      "body": "",                           // ★運営者が記述（要編集）
      "noteText": "",                       // ★運営者が記述
      "slug": "market-research"             // サイト解説ページへのリンク用
    },
    // ... 残り KW slides
    {
      "type": "summary",                   // 最終枚目: まとめ
      "heading": "まとめ｜試験のポイント",
      "body": "",                           // ★運営者が記述
      "noteText": "保存して試験前日に見返してください"
    }
  ],
  "cta": {
    "related": ["市場調査", "需要予測", "投資回収計画", "割引率"]  // 上位 4 KW
  },
  "_meta": {
    "bundleId": "2-2.1-part1",
    "chapterTitle": "経済性管理",
    "sectionTitle": "事業企画",
    "groupNames": ["フィージビリティスタディ", "事業投資計画", "事業投資評価", "事業評価（政策評価）"],
    "keywordCount": 17,
    "partOf": "2.1"
  }
}
```

### type 別の役割

| type | 役割 | 必須フィールド |
|---|---|---|
| `intro` | 投稿 1 枚目。全 KW 概観 | heading, body |
| `board` | 中盤。1 KW = 1 slide | heading (=KW title), body, slug |
| `figure` | 図解スライド（任意） | heading, imagePath, note |
| `summary` | 最終枚目。試験ポイント要約 | heading, body |

## 6. 配信ロードマップ

### 戦略 v6 と連動した配信ペース

| 期間 | ペース | 完了 |
|---|---|---|
| 試験前 (〜2026-07-13) | 慎重期。投稿せず原稿準備 | — |
| Phase R-1 (2026-07〜) | Carousel 週 2 本 | 約 6.4 ヶ月で全 51 bundle 配信完了 |
| 2 周目 (2027-01〜) | bundle 内容の更新 + 新作 KW 追加 | 翌年新 KW 反映と組み合わせ |

### 配信優先順位（推奨）

| 優先度 | bundle 群 | 理由 |
|---|---|---|
| 高 | 安全管理（5-5-1〜5-5-6） | 5 管理で最頻出・受験者の関心高 |
| 高 | 経済性管理「品質の管理」「工程管理」 | 試験 R7 で頻出論点 |
| 中 | 情報管理「情報セキュリティ」 | 2025-2026 出題増加傾向 |
| 中 | 社会環境管理「地球的規模の環境問題」 | 白書 R7 連動 |
| 低 | 人的資源管理「労働関係法」Part 1-2 | 法律名羅列で映え薄い |

詳細な配信スケジュールは `.claude/state/instagram-schedule.json` で管理（次フェーズで bundle ID 対応）。

## 7. 次フェーズ: パイプライン書き換え

### 必須改修ファイル

| ファイル | 改修内容 | 影響 |
|---|---|---|
| `.claude/skills/social/ig-post-create/scripts/ig-post-create.mjs` | `--bundle <bundleId>` フラグ追加。slide-data.json の `intro` / `summary` type を新規対応 | 投稿生成スクリプト |
| `.claude/scripts/sns/bulk-generate.mjs` | 入力を slug リスト → bundleId リストに切替 | 一括生成 |
| `.claude/state/instagram-schedule.json` | content_key を slug → bundleId に | スケジューラ |
| `.claude/skills/social/ig-post-create/SKILL.md` | type1 definition → bundle 集約モデルの仕様書更新 | スキル定義 |
| `.claude/skills/social/ig-post-create/design/` | intro/summary slide テンプレート追加 | デザイン定義 |

### 改修順序

1. `ig-post-create.mjs` の `--bundle` フラグ実装（既存 `--slug` と並行運用可能に）
2. テンプレートデザイン拡張（intro / summary slide）
3. テスト 1 bundle を実生成（e.g., `2-2-2 品質の管理` 18 KW）
4. `bulk-generate.mjs` 切替
5. `instagram-schedule.json` を bundle ID に再設定
6. Meta API 認証（T-003 ブロッカー）解消後、実投稿開始

### 既存資産の互換性

- `slide-data.json` の `cover` / `cta` フィールドは旧構造と互換
- 旧スキーマの `board` / `figure` type は引き続き使える
- 新 type `intro` / `summary` は追加のみ（既存ロジックを壊さない）

## 8. やらないこと

- **`_backlog/` の削除** — git 履歴で復活可能。スクリプトが新構造に完全移行確認できるまで保持
- **個別 KW 投稿の完全廃止** — 季節イベント・新 KW 緊急投稿等は単独 KW 投稿を残す選択肢を維持
- **bundle のさらなる細分化** — 51 → 100 等への増加は IG リーチ低下要因。20 KW/bundle 上限内で完結

## 9. 編集ワークフロー（運営者向け）

bundle 配信前に slide-data.json の `body` / `noteText` を埋める作業：

```bash
# 1. 編集対象の bundle を選択
$ cat docs/sns/instagram/_section-bundles/2-2-2/slide-data.json

# 2. board slide の body / noteText を編集
# (各 KW について 80-120 字程度の本文)

# 3. (次フェーズ) ig-post-create.mjs で PNG 生成
$ node .claude/skills/social/ig-post-create/scripts/ig-post-create.mjs --bundle 2-2-2 --size carousel

# 4. 生成された PNG を確認後、schedule.json に追加
```

## 10. データ整合性検証コマンド

```bash
# bundle 総数と KW 総数の整合
node -e "
const d = require('./src/config/ig-section-bundles.json');
console.log('bundles:', d.bundles.length);
console.log('total KW:', d.bundles.reduce((a,b) => a + b.keywords.length, 0));
console.log('max KW:', Math.max(...d.bundles.map(b => b.keywords.length)));
"
# 期待値: bundles 51 / total KW 655 / max KW 20

# 物理ディレクトリ数
ls docs/sns/instagram/_section-bundles/ | wc -l
# 期待値: 51

# _backlog 退避数
find docs/sns/instagram/_backlog -mindepth 2 -maxdepth 2 -type d | wc -l
# 期待値: 722
```

## 11. 関連ドキュメント

- `docs/project/03_SNS/01_SNS集客戦略.md` — SNS 戦略 v6 (IG = SEO カタログ動線)
- `docs/sns/instagram/profile.md` — IG プロフィール SoT
- `docs/sns/instagram/README.md` — IG 運用基本ルール
- `docs/reference/links-hub.md` — `/links` SNS bio 中継ページ
- `.claude/skills/social/ig-post-create/SKILL.md` — 投稿生成スキル
- `src/config/pe-chapters.json` — 旧キーワードツリー (1 KW = 1 投稿時代の SoT)

## 12. 改訂履歴

- 2026-05-26 v1: 初版。MDX パース + 集約ルール (≤20 KW/bundle) で 660 → 51 bundle 圧縮。旧 722 ディレクトリは `_backlog/` 退避
