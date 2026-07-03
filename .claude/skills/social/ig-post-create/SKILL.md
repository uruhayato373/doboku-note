---
name: ig-post-create
description: Instagram カルーセル PNG の**新規生成**。2 系統運用 (A: 択一クイズパック / B: 過去問パック)。Satori vDOM → Resvg PNG。1080×1350 (Carousel) と 1080×1920 (Reels) 対応。使い分け＝既存パックの意匠一括再生成は ig-carousel-restyle、site figure SVG からの変換は ig-figure-pack。
allowed-tools: Bash, Read, Write
---

# Instagram カルーセル投稿 生成スキル

doboku-note の Instagram カルーセル投稿用 PNG を生成する。**2 シリーズ運用**：

| シリーズ | 用途 | デザイン | パイプライン |
|---|---|---|---|
| **A. 択一クイズパック** | 運営者作問のシンプル知識クイズ | 既存 SVG ベース（明色） | `.claude/scripts/sns/render-quiz-pack.mjs` |
| **B. 過去問パック** | 公式試験問題 H21-R7 全 640 問 | AIDesigner 新意匠（単一 brand + semantic、Manrope+NotoSansJP） | `ig-post-create.mjs --exam` |
| C. 単独 KW 解説（旧） | キーワード 1 件の Study Notebook | notebook デザイン | `ig-post-create.mjs --slug` |

新規投稿の主軸は **A** または **B**。C は旧運用で残置（量産は基本しない）。

## 関連ファイル

| 役割 | ファイル |
|---|---|
| 過去問パック生成 (B) | `.claude/skills/social/ig-post-create/scripts/ig-post-create.mjs` (`--exam`) |
| 過去問 MDX パーサ | `scripts/parse-exam-questions.mjs` |
| 過去問パック構造化 | `scripts/generate-exam-pack-dirs.mjs` |
| 過去問パック 一括生成 | `scripts/bulk-generate-exam-packs.mjs` |
| 過去問 SoT | `src/config/exam-questions.json` (640 問) |
| 過去問 slide-data SoT | `docs/sns/instagram/{exam}/exam-packs/<year>/pack-<NN>/slide-data.json` |
| 過去問スライドビルダー | `.claude/scripts/lib/sns-common/quiz-slides.mjs`（tokens.json 参照） |
| 過去問デザイン真実源 | `docs/design-system/instagram-carousel-tokens.json` + `docs/design-system/instagram-carousel.md` |
| 択一クイズパック生成 (A) | `.claude/scripts/sns/render-quiz-pack.mjs` |
| 択一クイズ source パーサ | `.claude/scripts/sns/lib/quiz-parser.mjs` |
| 択一クイズテンプレ | `.claude/scripts/sns/templates/quiz-ig.mjs` |
| 単独 KW (notebook) ビルダー | `.claude/scripts/lib/sns-common/notebook-slides.mjs` |
| キャプション生成 | `.claude/scripts/instagram/generate-caption.cjs` |

---

## B. 過去問パック（AIDesigner 新意匠・現行主軸）

> **デザイン真実源**: [`docs/design-system/instagram-carousel-tokens.json`](../../../../docs/design-system/instagram-carousel-tokens.json) と [`docs/design-system/instagram-carousel.md`](../../../../docs/design-system/instagram-carousel.md)。色・フォント・余白・スライド種別仕様はすべて tokens.json が真実源。`quiz-slides.mjs` はここから値を import する。
>
> **配色方針**: 単一 brand 色（デフォルト `#1858B5`）+ semantic（green 正答 / coral 誤答 / navy CTA）。**5 管理別配色は廃止**。管理識別は cover-title の 156px テキスト（例「経済性管理」）で行う。
>
> **フォント**: Manrope (latin) + NotoSansJP (jp)。`@fontsource/manrope` / `@fontsource/noto-sans-jp` を npm で導入し、`slide-render.mjs` の `loadFonts` が weight 別に登録する。
>
> **トークン変更後の一括再生成**: `ig-carousel-restyle` スキル。

### 構造

**1 パック = 1 管理 = 4 問 = 10 枚カルーセル**

| 枚 | ファイル | 内容 |
|---|---|---|
| 1 | 00-cover.png | 「総監過去問」pill + 管理名 156px（大）+ 「<年度> ／ 4問パック」+ cover-big-q "Q" 装飾 + 「スワイプで4問にチャレンジ →」chip |
| 2 | 01-problem.png | PROBLEM 1/4 + 問題本文 + 5 択カード（動的高さ） |
| 3 | 02-answer.png | ANSWER 1/4 + 緑カード（正答番号 + 主題）+ EXPLANATION |
| 4-9 | 03..08 | Q2-Q4 の problem / answer 計 6 枚 |
| 10 | 09-cta.png | 「もっと解きたい人は doboku-note で全問解説をチェック」+ stats（640問 PRACTICE / 5管理 SCOPE）+ 保存ボタン（brand 塗りつぶし）|

### 5 管理別色テーマ

| 管理 | primary | deep | light |
|---|---|---|---|
| economic | #2e6da4 (青) | #1a3a5c | #e8f0fe |
| human | #a36b2c (橙) | #5e3d18 | #fce8d0 |
| info | #5a3aa3 (紫) | #321f5e | #ede4fa |
| safety | #b22234 (赤) | #6b1320 | #fce0e3 |
| social | #3a7d44 (緑) | #1f4824 | #d8eddc |

### 運用手順

```bash
# 1. 過去問 MDX をパース（H21-R7 全 640 問抽出）
node scripts/parse-exam-questions.mjs

# 2. R7 全年度を 4 問パックに集約（管理別グループ化）
node scripts/generate-exam-pack-dirs.mjs --year r07
# → docs/sns/instagram/cem/exam-packs/r07/pack-{01..09}/slide-data.json

# 3. 1 パック分の PNG + caption 生成
node .claude/skills/social/ig-post-create/scripts/ig-post-create.mjs --exam r07-pack-01 --size carousel

# 4. 全パック一括生成
node scripts/bulk-generate-exam-packs.mjs --year r07 --size carousel

# 5. 全年度展開
node scripts/generate-exam-pack-dirs.mjs --force  # H21-R7 全パック
node scripts/bulk-generate-exam-packs.mjs --all   # 約 130 パック生成
```

### slide-data.json スキーマ（exam パック）

```jsonc
{
  "slides": [
    { "type": "cover", "title": "経済性管理", "subtitle": "R07 4問パック", "sectionTag": "2 経済性管理", "pageIndex": 1, "totalPages": 10 },
    { "type": "problem", "bodyLines": [...], "options": [{num, text}], "qNum": 1, "totalQ": 4 },
    { "type": "answer", "correctNum": 2, "correctText": "...", "correctSub": "...", "explanationLines": [...], "qNum": 1, "totalQ": 4 },
    // Q2-Q4 ...
    { "type": "cta", "pageIndex": 10, "totalPages": 10 }
  ],
  "_meta": { "year": "r07", "packNum": "01", "totalPacks": 9, "management": "economic", "questionIds": [...] }
}
```

### 動的レイアウト

- **問題文フォント**: 文字数で 26-42px 動的（短いほど大きく）
- **選択肢カード高さ**: 1 行 116px / 2 行 156px / 3 行 196px
- **解説フォント**: 行数で 24-44px 動的
- **改行**: 句点で必ず改行・読点で idealLen 超過時改行 + Satori 自動 wrap
- **緑カード correctText**: 20 字超で 32px / 以下で 38px（単文字分断防止）

---

## A. 択一クイズパック（運営者作問・別パイプライン）

### 構造

**1 パック = 1 管理 = 4 問 = 10 枚カルーセル**（B と同枚数だが内容・デザイン別）

| 枚 | ファイル | 内容 |
|---|---|---|
| 1 | 01-cover.svg/png | 「総監択一クイズ」+ 管理名（大）+ 「4問パック」+ 5管理シリーズチップ |
| 2-9 | 02-q1 〜 09-a4 | Q/A 4 ペア |
| 10 | 10-cta.svg/png | 「もっと解きたい人は doboku-note で全問解説を見る」 |

### 運用手順

```bash
# 1. source.md を運営者が手書き作成
# 場所: docs/sns/<channel>/draft/<NNN>-クイズ-...-/source.md
# フォーマットは docs/sns/instagram/_dev/source.md 参照

# 2. レンダリング
node .claude/scripts/sns/render-quiz-pack.mjs docs/sns/<channel>/draft/<NNN>-...

# 出力: <pack-dir>/instagram-carousel/img/{NN-管理名}/{01..10}.{svg,png}
```

### source.md フォーマット

```markdown
## 経済性管理（Q1〜Q4）

### Q1. {topic}

**問題文**: {問題文}

**選択肢**:
(1) {選択肢1}
(2) {選択肢2}
(3) {選択肢3}
(4) {選択肢4}

**正答**: ({N})

**解説**: {解説本文}

**関連キーワード**: [{label}](/docs/...)
```

5 管理（経済性 / 人的資源 / 情報 / 安全 / 社会環境）に対応。

### サンプル

- ソース: `docs/sns/instagram/_dev/source.md`
- 出力: `docs/sns/instagram/_dev/instagram-carousel/img/01-経済性/{01..10}.png`

---

## C. 単独 KW 解説（旧運用・参考保持）

```bash
node .claude/skills/social/ig-post-create/scripts/ig-post-create.mjs --slug heinrich-law --date 2026-05-09 --size carousel
```

- 出力: `docs/sns/instagram/{date}-{slug}/{reels,carousel}/img/`
- 構造: cover + board (定義) + figure (図解 任意) + board (応用) + board (試験ポイント) + cta = 6 枚程度
- データ: `.local/r2/posts/pe-comprehensive-management/<slug>/article.mdx` から自動抽出

---

## 共通仕様

### サイズ

| 用途 | 解像度 |
|---|---|
| Instagram Carousel | 1080×1350 (4:5) |
| Instagram Reels / YouTube Shorts | 1080×1920 (9:16) |

### フォント

`.claude/skills/conversion/ogp-create/assets/fonts/`
- NotoSansJP-Bold.ttf (日本語・700)
- Inter-Bold.ttf (英数字・700)

Satori 制約：fontWeight 800/900 → 700 にフォールバック。絵文字は搭載なし（▷ ▶ 等で代替）。

### 使い分け方針

| シーン | 推奨 |
|---|---|
| 試験前 6 ヶ月の高頻度配信 | **B (過去問パック)** — 自動量産可能（130 パック / 4 年運用） |
| 「気軽に解いて学ぶ」初学者向け | **A (択一クイズパック)** — 運営者作問の質の高さ |
| 単独 KW を深掘り（バイラル狙い） | **C (単独 KW)** — 量産せず厳選 |

### 投稿ペース試算（戦略 v6 §IG: Carousel 週 2 本）

- B: 130 パック ÷ 週 1 本 = **約 2.5 年で全網羅**
- A: 月 1-2 パック（運営者作問のペース）
- 両者並行で週 2 本ペースを実現

---

## 廃止された運用（参考）

| 旧運用 | 廃止日 | 理由 |
|---|---|---|
| 65 bundle 集約モデル（`_section-bundles/`） | 2026-05-26 | サイト記事の自動要約では IG カルーセルの情報密度に合わず、過去問パック方式に切替 |
| `--bundle` CLI モード | 2026-05-26 | 同上、`--slug` / `--exam` の 2 モードに整理 |
| `notebook-intro` / `notebook-summary` スライド型 | 2026-05-26 | bundle 集約専用だったため廃止 |
