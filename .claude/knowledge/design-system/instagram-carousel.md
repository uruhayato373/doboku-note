# Instagram カルーセル デザインシステム

> exam-packs（H21〜R7 過去問パック）の真実源。トークンの実体は [`instagram-carousel-tokens.json`](./instagram-carousel-tokens.json)。

## 1. 概要

doboku-note の Instagram カルーセル（B シリーズ：過去問パック）は、1パック 10 枚（cover 1 + problem×4 + answer×4 + cta 1）で構成する。本ドキュメントは AIDesigner プロトタイプ（2026-05-27 取得）に準拠した統一デザインを定義する。

**設計判断**: 過去存在した「5管理別カラーテーマ」（経済性=青／人的=橙／情報=紫／安全=赤／社会環境=緑）は本デザインで**廃止**する。管理識別は cover-title の 156px テキスト（例: 「経済性管理」）で行う。配色は単一ブランド色 + semantic（正答=green / 誤答=coral / CTA=navy）で統一する。

## 2. キャンバスと安全領域

| 項目 | 値 | tokens path |
|---|---|---|
| 幅 × 高さ | 1080 × 1350 | `canvas.width` / `canvas.height` |
| 内側余白 X / Y | 72 / 80 | `canvas.padding.x` / `canvas.padding.y` |
| gap | lg 40 / md 24 / sm 16 | `canvas.gap.*` |

キャンバスは IG カルーセル標準 4:5。Reels / ストーリー 1080×1920 は本ドキュメント対象外。

## 3. フォント階層

| 用途 | フォント | weight | npm パッケージ |
|---|---|---|---|
| 数字・英字・装飾（big-q / opt-num / page / brand-name 等） | Manrope | 500/700/800/900 | `@fontsource/manrope` |
| 日本語本文・タイトル（cover-title / q-text / opt-text 等） | NotoSansJP | 500/700/800/900 | `@fontsource/noto-sans-jp` |

実装側（`quiz-slides.mjs` / `ig-post-create.mjs`）は Satori の `fonts` 配列に上記 2 フォントを weight 別に登録する。各テキスト要素には `fontFamily` を tokens から渡し、日英混在は Satori のフォントフォールバックに委ねる。

## 4. カラーシステム

### 4.1 ink（テキスト）

| token | 値 | 用途 |
|---|---|---|
| `colors.ink.strong` | #14191F | 本文の主役テキスト |
| `colors.ink.body`   | #3F4754 | 副テキスト |
| `colors.ink.muted`  | #8B93A1 | ページ番号・brand-url |

### 4.2 surface（面）

| token | 値 | 用途 |
|---|---|---|
| `colors.surface.page`   | #FFFFFF | スライド背景（cta 以外） |
| `colors.surface.sunken` | #F6F8FB | chip / opt-num の沈み込み |
| `colors.surface.line`   | #E4E8EE | 境界線 |

### 4.3 brand プリセット（4 色から選択）

| preset | primary | deep | tint | line |
|---|---|---|---|---|
| `default` (active) | #1858B5 | #0E3F87 | #EDF3FB | #C9DAF0 |
| `violet`           | #4338CA | #312984 | #EEEDFB | #CFCAEC |
| `teal`             | #0F766E | #0A5450 | #E6F3F1 | #B6DAD4 |
| `warmRed`          | #D9533F | #A93C2D | #FBEDEA | #F0C5BD |

`colors.brand.active` を切り替えるとカルーセル全体の brand 色が変わる。

### 4.4 semantic（意味色）

| token | 値 | 用途 |
|---|---|---|
| `colors.semantic.correct.primary` | #2C8B5F | answer-hero 背景緑 / 正答 badge |
| `colors.semantic.correct.deep`    | #1E6B47 | answer-hero label 文字 |
| `colors.semantic.correct.tint`    | #E5F2EB | a-hero 背景 |
| `colors.semantic.correct.line`    | #B8DAC6 | a-hero border |
| `colors.semantic.incorrect.primary` | #C8443A | 誤答 ex-num 背景 / ex-mark ✕ |

### 4.5 cta（CTA スライド専用）

| token | 値 | 用途 |
|---|---|---|
| `colors.cta.background` | #0E2C53 | navy 全面 |
| `colors.cta.decor`      | #15406F | 装飾円 |
| `colors.cta.accent`     | #6FB0FF | headline 強調文字（doboku-note） |

## 5. スライド種別ごとの仕様

### 5.1 cover (01)

要素構成:
1. topbar: `cover-tag`「総監過去問」（pill / brand-tint 背景 / brand-deep 文字、B シリーズ専用）+ `page` 番号
2. cover-body:
   - `cover-big-q` 装飾 "Q"（240px Manrope 800 / brand-tint 色、右上に半分はみ出す）
   - `cover-meta`「R07 ／ 4問パック」（Manrope 700 26px brand 色 letter-spacing 0.08）
   - `cover-title` 管理名 / 主題（156px 900 ink-strong line-height 1.0）
   - `cover-sub` サブタイトル（32px 700 ink-body）
   - `cover-chips` 4問のタイトル予告（2×2 grid、各 chip に Manrope 800 番号 + 短いタイトル）
   - `cover-swipe`「スワイプで4問にチャレンジ →」（brand 色）
3. brand footer: **左下のみ**（brand-dot + "doboku-note"）。右下は空白

tokens.slides.cover に文字列テンプレ。

### 5.2 problem (02/04/06/08)

要素構成:
1. topbar: `eyebrow` "PROBLEM N / 4"（Manrope 800 24px brand 色 + underline 3px brand）+ `page`
2. body:
   - `q-label`: `q-tag`「Q」（Manrope 22px white-on-brand pill）+ 主題（700 24px ink-body）
   - `q-text`: 設問本文（700 44px ink-strong line-height 1.45、`<b>` で強調）
   - `options`: 5 択カード（min-height 96 / radius 18 / border 2 surface-line）
     - 左 78px に `opt-num` Manrope 800 34px brand 色（sunken 背景）
     - 右に `opt-text` 500 26px ink-strong padding 22/26
     - 長文時は `data-density="dense"` で min-height 92 / 24px / padding 18/24
3. brand footer: 左下に brand-dot + "doboku-note" / **右下に「次ページで解答 →」**（誘導テキスト・problem のみ）

### 5.3 answer (03/05/07/09)

**slide-data.json スキーマ**:
```jsonc
{
  "type": "answer",
  "correctNum": 1,                 // 1-5
  "correctText": "品質管理の統計的手法",  // a-hero の title（主題、800 30px）
  "optionExplanations": [          // 必須・5 要素・順序は num 順
    { "num": 1, "correct": false, "text": "管理限界は統計的に計算される工程監視用の値であり、規格値に設定するのは誤り。" },
    { "num": 2, "correct": true,  "text": "工程能力が不十分な場合に不適合品リスクが大きい、という記述は適切。" },
    ...
  ],
  "pointText": "管理限界＝工程監視の値／規格値＝顧客要求の許容範囲。混同の引っかけが頻出。",
  "qNum": 1, "totalQ": 4
}
```
`explanationLines` は **廃止**（旧スキーマ、互換維持なし）。

要素構成:
1. topbar: `eyebrow` "ANSWER N / 4" + `page`
2. body:
   - `a-hero`: 正答カード（green-tint 背景 / green-line border 2 / radius 20 / padding 22/28）
     - `a-hero-badge` 96×96 円 green 背景 / 白 Manrope 800 56px 正答番号
     - `a-hero-meta`: label「正答 ／ ANSWER」(800 20px green-deep letter-spacing 0.12) + title `correctText` (800 30px ink-strong)
   - `a-explain`: **5 行固定**（`optionExplanations[5]` から描画、**border-bottom 線なし**、gap 12-16px で区切り）
     - `ex-num` 56×56 radius 14 / **正誤に関わらず sunken 背景 + ink-body**（解説エリアで色強調しない）
     - `ex-mark` ○（NotoSansJP 28px ink-muted）/ X（Manrope 800 30px ink-muted、純粋な Latin X）
     - `ex-text` 500 24px ink-strong / `<b>` で重要句強調
   - `a-point`: 「ここがポイント」（白背景 / brand 3px border / radius 18 / margin-top 36）。`pointText` 必須
     - `a-point-label` 浮きラベル（brand 背景 / 白 800 20px）
     - `a-point-icon` 44×44 brand-tint 背景 / brand 色 / `!` 800 26px
     - `a-point-text` 700 26px ink-strong / `<b>` は 800 brand-deep
3. brand footer: **左下のみ**（brand-dot + "doboku-note"）。右下は空白

### 5.4 cta (10)

要素構成:
1. topbar: "FULL CONTENT" eyebrow（白系）+ `page`
2. cta-body（中央配置）:
   - `cta-hello`「もっと解きたい人は」(500 28px white/70)
   - `cta-headline`（900 96px white、`<accent>doboku-note</accent>` は #6FB0FF）
   - `cta-stats` 2 カード:
     - 「720問 / PRACTICE」「5管理 / SCOPE」（数字 Manrope 800 56px、unit 28px、量×範囲の対比）
   - `cta-action` 白カード:
     - icon（brand-tint 背景の保存マーク SVG）
     - 「保存ボタンを押して 試験前日に見返そう」(brand 色 Manrope 800 22px + ink 700 20px)
3. 装飾: 右上 460×460 / 左下 360×360 の navy-2 円（背後）
4. brand footer: 左下に brand-dot（白反転）+ "doboku-note"（白）。右下は空白

## 6. variant（拡張オプション、Phase A スコープ外）

`variants.available: ['refined', 'bold', 'editorial']`。Phase A では `refined` のみ実装。bold（opt 全面塗り / a-hero 全面 green）と editorial（border-bottom のみのミニマル）は将来。

## 7. 4 段階自動圧縮モード（problem スライド）

q-text と opt-text は問題文と選択肢の総文字数で **4 段階を自動判定**して圧縮する。table/lists がある問題（複雑度高）も compact 以上に格上げ：

| モード | 発動条件 | q-text | opt min-height | opt text | block gap |
|---|---|---|---|---|---|
| **normal** | 総文字数 ≤ 320 | 44px / 600 | 96px | 26px / 500 | 36 |
| **dense** | 320-550 字 or 選択肢 60+ 字 | 36px / 600 | 84px | 24px / 500 | 26 |
| **compact** | 550-700 字 or 選択肢 100+ 字 or `table`/`lists` あり | 30px / 600 | 76px | 24px / 500 | 18 |
| **ultra** | 700+ 字 | 26px / 600 | 68px | 22px / 500 | 14 |

`cover-title` は **156px 固定**。管理名（5 文字前後）でない長文タイトルは禁止。

旧 `quiz-slides.mjs` の動的フォントスケール表（40字以下:42px / 80字以下:36px / ...）は廃止。`MGMT_THEME` も廃止。

## 8. トークン参照方法

### コード（Node.js）

```js
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKENS = JSON.parse(
  readFileSync(resolve(__dirname, '../../../../.claude/knowledge/design-system/instagram-carousel-tokens.json'), 'utf8')
);

const brand = TOKENS.colors.brand.presets[TOKENS.colors.brand.active];
const ty    = TOKENS.typography;
const geo   = TOKENS.geometry;
```

### Generator エージェント（[ig-carousel-writer](../../agents/ig-carousel-writer.md)）

- slide-data.json 作成時、色を **本文に書かない**（quiz-slides.mjs が tokens から塗る）
- 管理タグは `meta.management: 'economic' | 'human' | 'info' | 'safety' | 'social'` で持つが、これは cover-title 表示用ラベル決定だけに使う（色決定には使わない）

### Evaluator エージェント（[ig-carousel-qa](../../agents/ig-carousel-qa.md)）

第 6 軸「デザイン統一性」で以下を確認:
1. cover 背景が `#FFFFFF`、cover-big-q `#EDF3FB`、cover-title 文字が ink-strong
2. eyebrow が Manrope 24px、brand-line 3px underline
3. ex-num の正誤に関わらず sunken 背景 + ink-body（**色強調なし**）
4. ex-mark は ○ (NotoSansJP) / X (Manrope 800 純粋な Latin)、いずれも ink-muted
5. CTA 背景が `#0E2C53`、accent が `#6FB0FF`
6. brand-dot 28×28、footer wordmark が Manrope 800 24px、**右下は problem のみ「次ページで解答 →」、cover/answer/cta は空白**
7. a-explain に **border-bottom 線が無い**こと（gap だけで区切る）
8. 「ここがポイント」枠が a-point として表示されている（`pointText` 必須）

## 9. 失敗パターン

| 失敗 | 原因 | 対処 |
|---|---|---|
| cover-title が 2 行になる | 管理名が長すぎる（10 字超） | 改行可能なら明示改行、不可なら fontSize を 132/120 に下げる例外を許容 |
| opt-text が枠から溢れる | 選択肢が 100 字超 | `data-density="dense"` 自動切り替え、または writer 側で意味を変えない範囲で短縮 |
| q-text の `<b>` が描画されない | NotoSansJP 800 weight が Satori に登録されていない | `ig-post-create.mjs` の fonts 配列に 800 を追加 |
| Manrope が描画されない | `@fontsource/manrope` 未インストール、または fontFamily 指定が `'Manrope, sans-serif'` のような複合形式になっている | Satori は単一フォント名を期待。fontFamily は `'Manrope'` 単独で渡す |
| 5管理別の色が出る | 旧 MGMT_THEME 参照コードの残骸 | `quiz-slides.mjs` の `MGMT_THEME` を完全削除し、tokens.colors.brand.presets を参照 |
| answer の解説エリアが赤一色 | ex-num / ex-mark に coral 色が残っている | 色強調は a-hero（緑）と a-point（青枠）に集中、解説エリアは sunken+ink-muted で中立に |
| answer に「ここがポイント」枠が出ない | slide-data.json に `pointText` キーが無い | writer が新スキーマで `pointText` を必須記述する |
| answer の解説が選択肢別になっていない | `explanationLines` 旧スキーマを使っている | `optionExplanations[5]` に分解する。旧 `explanationLines` は廃止 |
| ex-mark の ✕ がフォントで掠れる | `✕` (U+2715) はフォントによって描画品質が落ちる | 純粋な Latin `X` を Manrope 800 で描画する（仕様確定） |
| 右下に `doboku-note.com` が表示される | 旧コードの `brandFooter(SLIDES.*.footerUrl)` 残骸 | `brandFooter(null)` を渡す。problem のみ `nextText` を渡す |

## 10. 関連ドキュメント

- [`instagram-carousel-tokens.json`](./instagram-carousel-tokens.json) — 真実源 JSON
- [`.claude/knowledge/reference/ig-carousel-skill.md`](../reference/ig-carousel-skill.md) — 運用方針・2 シリーズ全体像
- [`.claude/knowledge/reference/ig-carousel-policy.md`](../reference/ig-carousel-policy.md) — slide-data.json v2 スキーマ・ルーブリック
- [`.claude/skills/social/ig-post-create/SKILL.md`](../../skills/social/ig-post-create/SKILL.md) — 単発生成
- [`.claude/skills/social/ig-carousel-restyle/SKILL.md`](../../skills/social/ig-carousel-restyle/SKILL.md) — 統一再生成
