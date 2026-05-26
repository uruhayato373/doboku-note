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
| **デザイン** | 明色 SVG ベース（既存 quiz-ig.mjs） | type3 デザイン・5管理別色 |
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

### B 過去問パック（type3）

| 要素 | 仕様 |
|---|---|
| キャンバス | 1080×1350 (Carousel) / 1080×1920 (Reels) |
| 配色 | 5 管理別テーマ（[SKILL.md](../../.claude/skills/social/ig-post-create/SKILL.md) §B 参照） |
| フォント | NotoSansJP-Bold (日本語) / Inter-Bold (英数) |
| 改行ロジック | 句点で必ず改行 + Satori 自動 wrap |
| 動的フォントサイズ | 問題文 26-42px / 解説 24-44px |
| 選択肢カード高さ | 1 行 116px / 2 行 156px / 3 行 196px |

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

## 10. 関連ドキュメント

- `docs/project/03_SNS/01_SNS集客戦略.md` — IG 戦略 v6
- `docs/sns/instagram/profile.md` — IG プロフィール SoT
- `docs/sns/instagram/README.md` — IG 運用基本
- `.claude/skills/social/ig-post-create/SKILL.md` — スキル詳細
- `docs/reference/links-hub.md` — `/links` SNS bio 中継ページ
