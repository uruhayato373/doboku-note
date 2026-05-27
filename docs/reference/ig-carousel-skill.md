# Instagram カルーセル 2 シリーズ運用ガイド

doboku-note の Instagram カルーセル投稿は **2 系統** で運用する：

- **A. 択一クイズパック**: 運営者作問のシンプル知識クイズ
- **B. 過去問パック**: 公式試験問題 H21-R7 全 640 問

スキル詳細: [`.claude/skills/social/ig-post-create/SKILL.md`](../../.claude/skills/social/ig-post-create/SKILL.md)

最終更新: 2026-05-26（Phase 7: bundle 廃止 + 2 シリーズ整備）

---

## 1. 2 シリーズの比較

| 観点 | A. 択一クイズパック | B. 過去問パック |
|---|---|---|
| **ソース** | 運営者手書き source.md | 公式 article.mdx (H21-R7) |
| **問題の質** | 入門〜中級・シンプルな知識クイズ | 公式試験問題そのまま（長文） |
| **デザイン** | 明色 SVG ベース（既存 quiz-ig.mjs） | AIDesigner 新意匠（単一 brand + semantic、Manrope+NotoSansJP） |
| **選択肢** | 4 択 | 5 択 |
| **生成パイプライン** | `.claude/scripts/sns/render-quiz-pack.mjs` | `ig-post-create.mjs --exam` |
| **1 パック構造** | cover + 4×(Q+A) + cta = 10 枚 | cover + 4×(problem+answer) + cta = 10 枚 |
| **量産可能性** | △ 運営者作問が必要 | ◎ 自動量産 |
| **適した投稿時期** | 平時の「気軽に解く」入門訴求 | 試験前 6 ヶ月の高頻度配信 |

## 2. 投稿ペース計画

戦略 v6 §IG「Carousel 週 2 本」と整合：

- **B（過去問）** = 週 1 本（自動生成可能・約 130 パック / 16 年度分）
- **A（運営者作問）** = 月 1-2 本（質重視）
- **両者並行で週 2 本ペース達成**

B のみで全網羅: 130 ÷ 52 ≈ **約 2.5 年**

## 3. ファイル構造

```
docs/sns/instagram/
├── _exam-packs/                       ← B 過去問パック (新)
│   ├── r07/
│   │   ├── pack-01/
│   │   │   ├── slide-data.json
│   │   │   ├── caption.txt
│   │   │   ├── carousel/img/{00-09}.png
│   │   │   └── reels/
│   │   └── pack-02..09/
│   ├── r06/...
│   └── h21..r05/
├── _quiz-sample/                       ← A 択一クイズサンプル
│   ├── source.md
│   ├── instagram-carousel/img/01-経済性/{01..10}.png
│   └── x/img/...
├── _keyword-findings.md
├── profile.md
└── README.md

src/config/
└── exam-questions.json                 ← 過去問 SoT (16 年度 640 問)

scripts/
├── parse-exam-questions.mjs            ← B 過去問 MDX パーサ
├── generate-exam-pack-dirs.mjs         ← B パック構造化
└── bulk-generate-exam-packs.mjs        ← B 一括生成

.claude/
├── scripts/sns/
│   ├── render-quiz-pack.mjs            ← A 一括生成
│   ├── templates/quiz-ig.mjs           ← A IG テンプレ
│   ├── templates/quiz-x.mjs            ← A X テンプレ
│   └── lib/quiz-parser.mjs             ← A source.md パーサ
├── scripts/lib/sns-common/
│   ├── quiz-slides.mjs                 ← B type3 ビルダー
│   ├── notebook-slides.mjs             ← C 単独 KW ビルダー
│   └── slide-render.mjs                ← dispatch
└── skills/social/ig-post-create/
    ├── SKILL.md
    └── scripts/ig-post-create.mjs      ← --slug / --exam モード
```

## 4. B 過去問パック 運用手順

### 初期生成

```bash
# 1. 過去問 MDX を 1 度だけパース（src/config/exam-questions.json 出力）
node scripts/parse-exam-questions.mjs

# 2. 全年度を 4 問パックに集約
node scripts/generate-exam-pack-dirs.mjs            # H21-R7 全パック
# または
node scripts/generate-exam-pack-dirs.mjs --year r07 # 単年度

# 3. PNG + caption 一括生成
node scripts/bulk-generate-exam-packs.mjs --year r07 --size carousel
# または
node scripts/bulk-generate-exam-packs.mjs --all  # 全 130 パック
```

### 単一パック生成・修正

```bash
node .claude/skills/social/ig-post-create/scripts/ig-post-create.mjs --exam r07-pack-01 --size carousel
```

### 投稿時の調整

slide-data.json を手動編集して個別修正可能：
- `slides[i].bodyLines`: 問題本文の改行調整
- `slides[i].options[k].text`: 選択肢の表現修正
- `slides[i].explanationLines`: 解説の追加・削除
- `slides[i].correctText`: 緑カードの主題変更

修正後は同じパックを再生成: `--exam <packId> --size carousel`

## 5. A 択一クイズパック 運用手順

### source.md 作成

`docs/sns/instagram/_quiz-sample/source.md` のフォーマットをコピーして新規パック作成：

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
複数管理の問題を 1 つの source.md に含めるのも可（管理ごとに 1 パック = 10 枚生成）。

### レンダリング

```bash
node .claude/scripts/sns/render-quiz-pack.mjs docs/sns/instagram/_quiz-sample
# → instagram-carousel/img/{NN-管理名}/{01..10}.{svg,png}
```

## 6. 使い分け方針

| 配信目的 | 推奨シリーズ |
|---|---|
| 試験前 6 ヶ月の高頻度配信（試験対策） | **B** |
| 入門者向け「気軽に学ぶ」 | A |
| 単独 KW を深掘り（バイラル狙い） | C (単独 KW モード) |
| 5 管理シリーズ感を出す | A（5 管理同時パック生成可） |
| 公式の難易度を体感させる | B（5 択・長文） |

## 7. やらないこと

- **両シリーズを混同する命名**: A は `<NNN>-クイズ-...`、B は `_exam-packs/<year>/pack-<NN>` で物理的に分離
- **B の自動生成内容を投稿前に確認しない**: 必ず 1 パックずつ視覚確認してから投稿
- **A の source.md を機械生成する**: 運営者の手書きクラフトが A の価値の中核

## 8. デザイン仕様

### B 過去問パック（AIDesigner 新意匠）

> **真実源**: [`docs/design-system/instagram-carousel-tokens.json`](../design-system/instagram-carousel-tokens.json) + [`docs/design-system/instagram-carousel.md`](../design-system/instagram-carousel.md)

| 要素 | 仕様 | tokens path |
|---|---|---|
| キャンバス | 1080×1350 (Carousel) / 1080×1920 (Reels) | `canvas.width` / `canvas.height` |
| 配色 | 単一 brand（`#1858B5`）+ semantic（green 正答 / coral 誤答 / navy CTA）。**5管理別配色は廃止** | `colors.brand.presets[active]` |
| フォント | Manrope (latin, weights 500/700/800) + NotoSansJP (jp, 500-900) | `fonts.primary` / `fonts.japanese` |
| パッケージ | `@fontsource/manrope` + `@fontsource/noto-sans-jp`（`--legacy-peer-deps` 必須） | — |
| 改行ロジック | 文字数固定（writer が短く調整）+ Satori 自動 wrap | — |
| dense 切り替え | 選択肢中 60 字超 or 合計 250 字超で自動 | `geometry.opt.*Dense` |
| スライド枚数 | cover 1 + (problem + answer) × 4 + cta 1 = 10 枚 | `slides.order` |
| 管理識別 | cover-title 156px（例「経済性管理」） | `typography.coverTitle` |

**変更フロー**: tokens.json を編集 → `ig-carousel-restyle --pack ...` で再生成 → `ig-carousel-qa` で 6 軸採点。

### A 択一クイズパック（既存 SVG）

| 要素 | 仕様 |
|---|---|
| キャンバス | 1080×1350 (Carousel) |
| 配色 | brand 青 (chip は管理別) |
| 番号バッジ | 円 + 数字 1-4 |
| 答えカード | 緑系大カード + 解説 |
| 詳細 | `.claude/scripts/sns/templates/quiz-ig.mjs` |

## 9. 廃止された運用

| 旧運用 | 廃止日 | 理由 |
|---|---|---|
| 65 bundle 集約モデル（`_section-bundles/`） | 2026-05-26 | サイト記事の自動要約では IG カルーセルの情報密度に合わず、過去問パック方式に切替 |
| `ig-post-create.mjs --bundle` モード | 2026-05-26 | bundle 集約モデルの廃止に伴い |
| `notebook-intro` / `notebook-summary` スライド型 | 2026-05-26 | bundle 集約専用だったため |
| サイト記事 description からの自動 body 充実 | 2026-05-26 | 「〜の定義、種類、実務上の要点、関連用語を技術士総合技術監理の視点で整理」汎用テンプレが大半で実用に耐えなかった |

## 10. ストーリー / ハイライト連携運用

カルーセル投稿（フィード）と並んで、**ストーリー → ハイライト** で永続的なストック教材を作る。

### Instagram 機能の関係

```
[投稿タイプ]
├── フィード投稿（カルーセル / 単一）  ← 永続表示・プロフィール下半分
├── Reels（縦動画 9:16）              ← 永続表示・別タブ
└── ストーリー（24h で消える）        ← プロフィール上部の丸アイコン
        ↓ アーカイブ
    ハイライト（永続）                ← プロフィール上部の丸アイコン
```

**直接「カルーセル → ストーリー」変換機能はない**。IG アプリで「フィード投稿をストーリーにシェア」は可能（カルーセル 1 枚目のみ・縮小）。本格運用では別途ストーリー版を作る。

### ストーリー / ハイライトの仕様

| 項目 | 値 |
|---|---|
| サイズ | **1080×1920 (9:16 縦長)** |
| 1 枚あたり再生時間 | 5 秒（画像）／最大 60 秒（動画） |
| ストーリー連投 | 自動再生で次のスライドへ |
| 24h 後 | 自動消去（ただし IG が自動でアーカイブ保存） |
| ハイライト | アーカイブから手動で「ハイライトに追加」→ プロフィール上部に永続表示 |
| ハイライト容量 | 1 つあたり最大 100 ストーリー |
| 文字・スタンプ | IG アプリ内で後乗せ可（リンクスタンプ含む） |

### 既存パイプラインでの対応

`ig-post-create.mjs` は **`--size reels` で 1080×1920 を生成**（Reels と同サイズ = ストーリーと同じ）：

```bash
# 過去問パックをストーリー版で生成
node .claude/skills/social/ig-post-create/scripts/ig-post-create.mjs --exam r07-pack-01 --size reels
# → docs/sns/instagram/_exam-packs/r07/pack-01/reels/img/{00..09}.png
```

⚠️ `quiz-slides.mjs` のレイアウトは **1080×1350 基準で設計**されているため、1080×1920 で生成すると要素位置がズレる可能性あり。本格運用前に視覚検証が必要。

### 3 つの実装オプション

| 案 | 内容 | 工数 | 仕上がり |
|---|---|---|---|
| **A. カルーセル PNG をそのまま流用** | 1080×1350 を IG アプリで 9:16 にトリミング（上下余白） | 0（手動のみ） | 余白多・簡易 |
| **B. `--size reels` で 1080×1920 生成** ★推奨 | 既存パイプライン流用、縦長キャンバスで再レンダリング | 中（1-2 時間で微調整） | 既存と同内容で縦長 |
| C. ストーリー専用デザイン | `buildStoryCover/Problem/Answer` を新規実装 | 大（5-8 時間） | 凝った仕上がり |

### ハイライト戦略例（doboku-note 向け）

| ハイライト | カバー画像 | 中身 |
|---|---|---|
| ① 総監過去問 R07 | 「R07」 | R7 9 パック × 各 4 問 = 36 問の選抜ストーリー |
| ② 5管理早見表 | 「5管理」 | 各管理の概要 5 枚 |
| ③ note 商品案内 | note ロゴ | M9 / M5-M8 / M3 を 1 ストーリーずつ |
| ④ 試験まで | カウントダウン | 試験日まで動的更新（試験期のみ） |
| ⑤ キーワード TOP10 | 「TOP10」 | 頻出 KW を厳選 |

### 運用順序

1. **カルーセル（フィード）投稿** — 永続表示の主役
2. **同じ素材を `--size reels` で再生成** → IG アプリでストーリー投稿
3. **24h 経過前にハイライトに追加**（IG アプリ内）
4. **ハイライト追加後はストーリーが永続化**、新規ストーリーで同じハイライトに追加可

### 戦略的価値

- **保存性最大化**: カルーセル「保存」 + ハイライト「ピン留め」で 2 重に資産化
- **指名検索強化**: プロフィールに丸アイコンが並ぶことで「専門アカウント」の見栄えが上がる
- **新規フォロワー獲得**: プロフィール訪問者が「ハイライトを巡る」習慣で滞在時間延長
- **note 商品 LP 化**: ハイライト「note 商品案内」が note 売上の補助 CTA に

### 着手判断

| シーン | 推奨 |
|---|---|
| 試験前 6 ヶ月（高頻度配信期） | カルーセル + ストーリー両方並行で配信し、ハイライトに即追加 |
| 平時 | ハイライト「note 商品」「キーワード TOP10」など固定コンテンツのみ追加 |
| Reels と同 mp4 流用時 | ストーリー連動は薄め（mp4 はストーリーには不向き） |

---

## 11. 関連ドキュメント

- `docs/project/03_SNS/01_SNS集客戦略.md` — IG 戦略 v6
- `docs/sns/instagram/profile.md` — IG プロフィール SoT
- `docs/sns/instagram/README.md` — IG 運用基本
- `.claude/skills/social/ig-post-create/SKILL.md` — スキル詳細
- `docs/reference/links-hub.md` — `/links` SNS bio 中継ページ
