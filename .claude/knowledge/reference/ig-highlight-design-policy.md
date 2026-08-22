# Instagram ハイライト デザインポリシー (v7.1)

技術士・総合技術監理および 1 級土木施工管理技士の **Instagram ハイライト系統 A 6 種**（`content/sns/instagram/highlights/NN_*/`）の Stories 用 slide-data.json + 生成 PNG を、agent が 1 ハイライトずつ設計・採点するための品質基準。`ig-highlight-designer`（Generator）と `ig-highlight-qa`（Evaluator）の両方がこの文書を真実源とする。

関連:
- 戦略 v7.1 §2 ハイライト 6 種 → [`docs/marketing/01_SNS集客戦略.md`](../../../docs/marketing/01_SNS集客戦略.md)
- デザイントークン → [`.claude/knowledge/design-system/instagram-carousel-tokens.json`](../design-system/instagram-carousel-tokens.json) の `highlightStories`
- builder → `.claude/scripts/lib/sns-common/highlight-stories-slides.mjs`
- 過去問パック Stories の運用 → [`.claude/knowledge/reference/ig-stories-policy.md`](./ig-stories-policy.md)（別文脈）

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
│  ▓▓ IG UI セーフエリア ▓▓   │  y=0〜200（プログレスバー＋プロフィール＋⋯/×）
│ HIGHLIGHT 01/05    [tag]   │  overline (top: 220)
│ ─                          │  accent bar (120×8)
│                            │
│      hero title            │  hero (top: 350, 132px)
│      lead subtitle         │  lead (56px)
│                            │
│  • body 行 1               │  body (38px)
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
│  ▓▓ IG UI セーフエリア ▓▓   │  y=1670〜1920（返信バー）
│              doboku-note ● │  credit (右下、装飾扱い)
└────────────────────────────┘
```

### 3.1 セーフエリア（IG Stories UI オーバーレイ）

Instagram は Stories 再生中、画像の上に独自 UI を重ねる。この帯に重要要素を置くと**ボタンと衝突して読めなくなる**。

| 帯 | 重なる UI | 範囲 | 対策 |
|---|---|---|---|
| 上 | プログレスバー＋プロフィール行（アバター/ユーザー名/⋯/×）| 上端から **約 250px** | `overlineTop >= 200`（現 220）。右上 tag chip が ⋯/× と衝突しないこと |
| 下 | 返信バー（メッセージを送信）| 下端から **約 250px**（Reels 流用時 ~310px）| 本文は `y < 1280` に収め下部を空ける。credit は装飾扱いで許容 |

**真実源**: `tokens.json highlightStories.geometry._safeArea` / `_stickerArea`。`overlineTop` / `heroTop` を変更する際は必ずこの帯を侵さないこと（過去に `overlineTop: 96` でトップ UI と衝突した事故あり、2026-05-28 是正）。

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
    "policy": ".claude/knowledge/reference/ig-highlight-design-policy.md",
    "strategy": "docs/marketing/01_SNS集客戦略.md v7.1 §2"
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
| `title` | **段階フォント auto-fit**（下記表参照、推奨 4-7 字）| 軸 2 リードコピー力 |
| `subtitle` | 8-15 文字（1-2 行） | 軸 2 |
| `body[]` | 各行 18 文字程度、4-7 行 | 軸 4 余白配分 |
| `items[].label` | 4-10 文字 | 軸 4 |
| `chipCta` | 5-12 文字 | 軸 2 |
| `tagText` | 2-6 文字（ハイライト名と一致）| 軸 3 ジャンル一貫性 |

### title の段階フォント auto-fit（v7.1 追加）

`highlight-stories-slides.mjs` が title の **visualLength**（全角=1.0、半角英数=0.55）を計測し、4 段階で自動分岐する。**folder back（折り返し）は構造的に発生しない**：

| 視覚字数 | フォント | 推奨度 | 例 |
|---|---|---|---|
| **`<= 7`** | hero (132px) | ✅ 推奨 | 「ここを読めば」(6) |
| **`8-11`** | heroMid (100px) | ⚠ 許容（意味が崩れない限り短縮検討、lint WARN）| 「ここでわかること」(8)、「Reels ピックアップ」(9.3) |
| **`12-16`** | heroSm (80px) | ⚠⚠ 警告（可能なら短縮、lint NOTICE）| 「もっと長い文章タイトル」(12) |
| **`17+`** | — | ❌ エラー（auto-fit でも収まらない、必須短縮、lint ERROR）| — |

**重要**: 過去のセッションで「7 文字制限」を厳守していたが、auto-fit 導入により **意味の希薄化を回避できる場合は heroMid (8-11) も推奨範囲**。例：「わかること」(5) より「ここでわかること」(8) の方が意味が明確で文脈通りなら、後者を優先する。

機械検証: `node .claude/scripts/lint-stories-titles.mjs` で全 slide-data.json の字数判定を一覧化。詳細は §7 担当境界参照。

---

## 5. 4 軸ルーブリック

| 軸 | 観点 | 5 点満点の基準 |
|---|---|---|
| **1. サムネ識別性** | ジャンル別パレット・アイコン・hero/heroMid 視覚字数 11 字以内 | 1 秒でハイライト識別可能 |
| **2. リードコピー力** | title 推奨 4-7 字（許容 8-11、警告 12-16、エラー 17+）・絵文字なし・3 秒で伝わる | 意味が伝わる最短表現 |
| **3. ジャンル一貫性** | パレット・tagText・icon が 5-7 枚すべて統一 | 06_materials の二段ロケット遵守 |
| **4. 余白配分・セーフエリア** | overline が y >= 200（トップ UI 回避）・本文 y < 1280・ステッカー余白確保 | body 4-7 行、上下セーフエリア（§3.1）を侵さない |

### 合否ライン

- **合格**: 平均 4.0 以上 **かつ** 全軸 3 以上
- **採点プロセス**: ig-highlight-qa は `node .claude/scripts/lint-stories-titles.mjs --dir <path>` を実行 → 出力を Read → 軸 2 採点に反映（自己判定ではなく機械結果を引用）
- **重大減点（-2）**:
  - 軸 2: lint **ERROR** あり（visualLength 17+ で auto-fit でも収まらない）
  - 軸 3: 06_materials で直接 note 有料リンク（系統 C の二段ロケット違反）
  - 軸 4: 本文が y >= 1280 まで侵入、または overline / tag がトップセーフエリア（y < 200）に侵入（§3.1）
- **lint WARN / NOTICE**: builder が auto-fit するため折り返しは発生しない。減点ではなく採点コメントに記載のみ。意味が崩れない範囲で短縮できれば視覚インパクト向上（hero 132px が最も強い）

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

- **v3（2026-05-28）**: IG Stories セーフエリア（§3.1）を明文化。`overlineTop: 96 → 220`・`heroTop: 280 → 350` に是正（過去に overline がトップ UI＝プロフィール行/⋯/× と衝突していた）。トークンに `_safeArea` 注記を追加し、軸 4 を「余白配分・セーフエリア」に拡張、overline が y<200 に侵入したら -2 重大減点。
- **v2（2026-05-28）**: title の段階フォント auto-fit を導入（hero 132 / heroMid 100 / heroSm 80）。「7 文字制限」から「視覚字数 4 段階判定」に変更し、意味の希薄化（「わかること」5字 vs 「ここでわかること」8字）を回避。機械検証 `lint-stories-titles.mjs` を新設、Evaluator は lint 出力を Read して軸 2 採点に反映する運用に統一。
- v1（2026-05-28）: 初版。ユーザー指摘「Stories が過去問デザインを引きずっている」に対応、モダンシック意匠で新設。Generator/Evaluator 分離を正式運用化。
