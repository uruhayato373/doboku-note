# Instagram ハイライト デザインポリシー (v7.1)

技術士・総合技術監理および 1 級土木施工管理技士の **Instagram ハイライト系統 A 6 種**（`docs/sns/instagram/highlights/NN_*/`）の Stories 用 slide-data.json + 生成 PNG を、agent が 1 ハイライトずつ設計・採点するための品質基準。`ig-highlight-designer`（Generator）と `ig-highlight-qa`（Evaluator）の両方がこの文書を真実源とする。

関連:
- 戦略 v7.1 §2 ハイライト 6 種 → [`docs/project/03_SNS/01_SNS集客戦略.md`](../project/03_SNS/01_SNS集客戦略.md)
- デザイントークン → [`docs/design-system/instagram-carousel-tokens.json`](../design-system/instagram-carousel-tokens.json) の `highlightStories`
- builder → `.claude/scripts/lib/sns-common/highlight-stories-slides.mjs`
- 過去問パック Stories の運用 → [`docs/reference/ig-stories-policy.md`](./ig-stories-policy.md)（別文脈）

最終更新: 2026-05-28（v1: ユーザー指摘「Stories が過去問デザインを引きずっている」に対応、モダンシック意匠で新設）

---

## 1. 設計思想

過去問パック（Carousel 1080×1350 / Reels 1080×1920、`quiz-slides.mjs`）と **意匠を切り分ける**ことで、ハイライトの「サムネ識別性」「ジャンル別フォロー判断」を構造的に確保する。

| | 過去問パック | ハイライト Stories |
|---|---|---|
| **視聴文脈** | フィード上で意図的に開かれる | プロフィール上の **サムネ円形アイコン**で選別 → タップで連続再生 |
| **意匠キーワード** | 真面目・情報密度 | **キャッチー・色面・ジャンル識別** |
| **背景** | 白（`#FFFFFF`） | ハイライト別パレット（淡色） |
| **タイポ階層** | cover-title 156px / chip / body | overline → hero → lead → body の 4 段 |
| **下半分の使い方** | 情報を詰める | リンクスタンプ・投票ステッカー用余白を確保 |

過去問パックと統一しないのは戦略的判断であり、`ig-highlight-qa` でも統一性チェックはしない。

---

## 2. パレット・アイコン（6 種）

`tokens.json highlightStories.palettes` が真実源。

| highlightSlug | bg | accent | icon | 意図 |
|---|---|---|---|---|
| `01_intro` | `#EFF6FF` | `#1858B5` | `→` | 信頼・始まり |
| `02_carousel-index` | `#F0FDF4` | `#16A34A` | `▦` | 体系・目次 |
| `03_reels-roundup` | `#FAF5FF` | `#7C3AED` | `▷` | 動的・再生 |
| `04_faq` | `#FFFBEB` | `#D97706` | `?` | 問答 |
| `05_announcement` | `#FFF1F2` | `#E11D48` | `!` | 告知・速報 |
| `06_materials` | `#F8FAFC` | `#1858B5` | `¶` | 落ち着き・教材 |

低彩度の `-50` 系を背景、`-600` 系をアクセントに揃え、低テンションながら識別可能にする。

---

## 3. レイアウト構造（1080×1920）

```
┌────────────────────────────┐
│ HIGHLIGHT 01/05    [tag]   │  overline (top: 96)
│ ─                          │  accent bar (120×8)
│                            │
│      hero title            │  hero (top: 280, 132px)
│      lead subtitle         │  lead (56px)
│                            │
│  • body 行 1               │  body (top: 720, 38px)
│  • body 行 2               │
│  • body 行 3               │
│  ...                       │
│                            │
│  [chipCta →]               │  chip pill
│                            │
│   icon 装飾 (opacity 0.08) │  background symbol
│                            │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    │  y=1280 (sticker area boundary)
│                            │
│       (リンクスタンプ用     │  Stories overlay 領域
│        投票ステッカー用)    │
│                            │
│              doboku-note ● │  credit (右下)
└────────────────────────────┘
```

---

## 4. slide-data.json スキーマ

```jsonc
{
  "_meta": {
    "kind": "highlight-<name>",
    "format": "stories",
    "size": { "width": 1080, "height": 1920 },
    "slidesCount": 5,
    "purpose": "...",
    "policy": "docs/reference/ig-highlight-design-policy.md",
    "strategy": "docs/project/03_SNS/01_SNS集客戦略.md v7.1 §2"
  },
  "slides": [
    {
      "index": 1,
      "filename": "01-cover.png",
      "role": "cover",            // 任意の識別子。レイアウトには影響しない
      "tagText": "まず読む",      // 右上 tag chip
      "title": "ここを読めば",     // hero (4-7 文字)
      "subtitle": "doboku-note の歩き方",  // lead (8-15 文字)
      "chipCta": "5 枚で全体像"   // 下部 chip pill (任意)
    },
    {
      "index": 2,
      // ...
      "body": [                  // 箇条書き 4-7 行
        "行 1（18 文字程度）",
        "行 2",
        "..."
      ]
    },
    {
      "index": 3,
      // ...
      "items": [                 // chip カード形式 3-5 個（任意）
        { "label": "経済性管理" },
        { "label": "人的資源管理" }
      ]
    }
  ]
}
```

### フィールド字数ルール

| フィールド | 推奨字数 | 評価軸 |
|---|---|---|
| `title` | **4-7 文字**（漢字・ひらがな・カタカナ）| 軸 2 リードコピー力 |
| `subtitle` | 8-15 文字（1-2 行） | 軸 2 |
| `body[]` | 各行 18 文字程度、4-7 行 | 軸 4 余白配分 |
| `items[].label` | 4-10 文字 | 軸 4 |
| `chipCta` | 5-12 文字 | 軸 2 |
| `tagText` | 2-6 文字（ハイライト名と一致）| 軸 3 ジャンル一貫性 |

---

## 5. 4 軸ルーブリック

| 軸 | 観点 | 5 点満点の基準 |
|---|---|---|
| **1. サムネ識別性** | ジャンル別パレット・アイコン・hero 7 文字以内 | 1 秒でハイライト識別可能 |
| **2. リードコピー力** | title 7 文字以内・絵文字なし・3 秒で伝わる | 全スライド折り返しなし |
| **3. ジャンル一貫性** | パレット・tagText・icon が 5-7 枚すべて統一 | 06_materials の二段ロケット遵守 |
| **4. 余白配分** | 本文 y < 1280、ステッカー余白確保 | body 4-7 行 |

### 合否ライン

- **合格**: 平均 4.0 以上 **かつ** 全軸 3 以上
- **重大減点（-2）**:
  - 軸 1: hero title 8 文字以上で折り返し
  - 軸 3: 06_materials で直接 note 有料リンク（系統 C の二段ロケット違反）
  - 軸 4: 本文が y >= 1280 まで侵入

---

## 6. ハイライト別の指針

### 01_intro（まず読む）
- 役割: プロフィール訪問者の「何を扱うサイトか」3 秒判断
- 5 枚構成: cover → author → scope → content → cta
- 訴求: 運営者経歴・対象資格・コンテンツの柱・サイトへの誘導

### 02_carousel-index（カルーセル目次）
- 役割: 5 管理別の代表 Carousel への入口
- 7 枚構成: cover → 5 管理 × 5 枚 → cta
- リンクスタンプ: 実投稿後に各管理スライドに対応カルーセル URL を貼る

### 03_reels-roundup（Reels まとめ）
- 役割: 直近代表 Reels の入口
- 5 枚構成: cover → 3-4 シリーズ → cta
- リンクスタンプ: 実投稿後に各 Reels URL を貼る

### 04_faq（FAQ）
- 役割: 受験相談の定型回答
- 6 枚構成: cover → Q1〜Q5
- subtitle に `Q1 ／ 5` を表記

### 05_announcement（お知らせ）
- 役割: 新記事公開・キャンペーン・受験期スポット情報（フロー型）
- 3 枚構成: cover → body → cta（テンプレ）
- title / body はフロー型で都度書き換え

### 06_materials（教材、系統 C）
- 役割: note プロフィール → 無料記事 → 有料マガジンの二段ロケット
- 6 枚構成: cover → author → essay → readguide → sample → cta
- **重要**: 全スライドのリンクスタンプは note プロフィール URL に統一着地（直接 note 有料リンク禁止）

---

## 7. 担当境界

| 工程 | 担当 |
|---|---|
| slide-data.json 執筆 | `ig-highlight-designer` |
| 4 軸採点 | `ig-highlight-qa` |
| PNG レンダリング | `build-highlight-materials.mjs`（機械処理） |
| ビルダー実装 | `.claude/scripts/lib/sns-common/highlight-stories-slides.mjs` |
| トークン JSON の修正 | design-system 担当（人手 or 別タスク） |
| 過去問パック 4 枚連投 Stories | `ig-stories-writer` + `ig-stories-qa`（別文脈） |

## 改訂履歴

- v1（2026-05-28）: 初版。ユーザー指摘「Stories が過去問デザインを引きずっている」に対応、モダンシック意匠で新設。Generator/Evaluator 分離を正式運用化。
