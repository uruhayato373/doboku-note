# Instagram カルーセル 運用ガイド

doboku-note の Instagram カルーセル投稿は次の系統で運用する：

- **A. 択一クイズパック**: 運営者作問のシンプル知識クイズ
- **B. 過去問パック（年度括り）**: 公式試験問題 H21-R7。**総監（cem）専用**
- **C. 論点パック（1級/2級土木）**: 頻出問題を**論点（科目×論点）で括り**、複数年度から4問採録。競合 @miyabi_labo 分析（2026-07）を受けて年度括りから移行。cover は「科目＋論点＋頻出度★＋第1問Q＋出題年度」

スキル詳細: [`.claude/skills/social/ig-post-create/SKILL.md`](../../skills/social/ig-post-create/SKILL.md)

最終更新: 2026-07-16（シリーズ C 新設: 1級/2級土木を論点括りへ移行・年度括り exam-packs は総監のみに）

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

## 1.5 論点パック（シリーズ C・1級/2級土木）

年度括り（旧 `civil-{1,2}/exam-packs`）を廃し、**1論点 × 4問（異なる年度から採録）**で括る。分類は Kindle A系（`scripts/build-takuitsu-reconstruct.mjs` の `THEMES` = 6管理テーマ・39論点）と**同一ロジックを import**して一致させる（テーマ間の重複は GOUBON 順の先勝ちで解消）。

- **対象**: 6管理テーマ（安全/法規/施工計画/環境/品質/工程）＝施工管理法＋法規ドメイン。土木一般・専門土木の技術系論点は THEMES 未定義のため対象外（別途論点設計が必要）
- **頻出度★**: 論点の出現年数 / 総回数（1級=12・2級=10）を 0.6/0.3 で ★★★/★★☆/★☆☆
- **生成**: `node .claude/scripts/sns/generate-civil-theme-packs.mjs --exam both`（slide-data.json・**exam-packs を総入れ替え**）→ `node .claude/scripts/sns/render-civil-theme-packs.mjs --exam both`（PNG + caption）
- **出力**: `content/sns/instagram/civil-{1,2}/theme-packs/{themeKey}-{subtopicKey}/pack-NN/`
- **cover**: `.claude/scripts/sns/templates/exam-quiz-cover-ig.mjs`（科目ピル＋論点見出し＋頻出度★＋第1問Q＋出題年度）
- **caption**: `generate-caption.cjs`（`_meta.theme`/`subtopic` で `isThemePack` 分岐）
- **IG適性フィルタ**: 個数型（選択肢が全て「Nつ」）・解説合計>420字は固定カードで破綻（解答スライドが「ここがポイント」箱に重なる）ため generate 時に除外
- **予約投稿（波状）**: `node .claude/scripts/sns/schedule-civil-theme-packs.mjs --count 30`（決定的プラン・status.json で予約済skip・**1セッション30件上限＝凍結回避**）。詳細 → .claude/todo/backlog.md「IG 論点パック 残92件」
- **実績（2026-07）**: 1級 85パック/39論点、2級 37パック/26論点 = 計122パック（適性フィルタ後）。うち30件予約済

## 2. 投稿ペース計画

戦略 v6 §IG「Carousel 週 2 本」と整合：

- **B（過去問）** = 週 1 本（自動生成可能・約 130 パック / 18 年度分）
- **A（運営者作問）** = 月 1-2 本（質重視）
- **両者並行で週 2 本ペース達成**

B のみで全網羅: 130 ÷ 52 ≈ **約 2.5 年**

## 3. ファイル構造

> [!note] ディレクトリ規約（試験軸）
> `{exam}/exam-packs/{年度}/pack-NN/` で**全資格を対称配置**する。試験軸は
> `技術士総監` / `1級土木` / `2級土木`（将来）。`ig-post-create.mjs` 等の
> `--exam-dir` 省略時は `技術士総監` が既定。1級・2級は明示指定する。

```
content/sns/instagram/
├── cem/exam-packs/                       ← B 過去問パック
├── cem/keyword-packs/                    ← キーワード図解パック（ig-figure-pack スキル生成）
│   ├── cash-flow-statement/             ← {exam}/keyword-packs/{keyword}/ が規約
│   ├── herzberg-two-factor-theory/
│   └── ...（site slug と 1:1 対応）
│   ├── 技術士総監/                     ← 試験軸（既定）。1級土木 / 2級土木 と対称
│   │   └── r07/                       ← （以下 技術士総監/r07 を例示）
│   │       ├── _summary/              ← 年度目次カルーセル（ストーリー入口）
│   │       │   ├── slide-data.json
│   │       │   ├── carousel/img/{00-03}.png  ← 1080×1350 PNG × 4
│   │       │   └── reels/img/{00-03}.png     ← 1080×1920 PNG × 4（ストーリー投稿用）
│   │       ├── pack-01/
│   │       │   ├── slide-data.json    ← データソース（cover/problem/answer/cta）
│   │       │   ├── carousel/          ← フィード投稿用
│   │       │   │   ├── caption.txt    ← 正答リスト + 保存喚起 CTA
│   │       │   │   └── img/{00-09}.png  ← 1080×1350 PNG × 10
│   │       │   ├── reels/             ← Reels 投稿用
│   │       │   │   ├── caption.txt    ← 主題のみ（ネタバレなし）+ エンゲージメント CTA
│   │       │   │   ├── img/{00-09}.png  ← 1080×1920 PNG × 10
│   │       │   │   ├── script.txt     ← TTS 読み上げ台本（ig-reel-create）
│   │       │   │   ├── wav/slide-NN.wav  ← VOICEVOX 音声（gitignore・R2退避＝再生成可 / sns-archive-policy.md）
│   │       │   │   └── video.mp4      ← 最終 Reels 動画（gitignore・JIT生成/R2退避＝コミットしない）
│   │       │   └── stories/           ← ストーリー連投用（reels から 4 枚厳選）
│   │       │       ├── img/01-cover.png   ← 表紙
│   │       │       ├── img/02-problem.png ← Q1（典型問題）
│   │       │       ├── img/03-answer.png  ← A1（解説）
│   │       │       ├── img/04-cta.png     ← CTA
│   │       │       ├── caption.txt
│   │       │       └── note.md        ← 投稿手順（リンクスタンプ・タグ）
│   │       └── pack-02..09/
│   ├── 1級土木/                        ← 第一次検定 過去問（h26..r07, 228 パック・carousel+reels）
│   │   └── {年度}/pack-NN/（同構造）
│   └── 2級土木/                        ← 第一次検定 過去問（前期/後期分離 r05z/r05k 等, 10回 123 パック・carousel+reels）
│       └── {年度z|年度k}/pack-NN/（同構造。z=前期 k=後期）
├── _quiz-sample/                       ← A 択一クイズサンプル
│   ├── source.md
│   ├── instagram-carousel/img/01-経済性/{01..10}.png
│   └── x/img/...
├── _keyword-findings.md
├── profile.md
└── README.md

src/config/
└── exam-questions.json                 ← 過去問 SoT (18 年度 720 問)

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

`content/sns/instagram/_dev/source.md` のフォーマットをコピーして新規パック作成：

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
node .claude/scripts/sns/render-quiz-pack.mjs content/sns/instagram/_quiz-sample
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
| **既存 note 記事を角度展開（反論・数字・ハウツー等）** | **角度型**（`angle` 指定・[content-angle-policy.md](./content-angle-policy.md)） |

> **コンテンツ角度レイヤー（`angle`）**: A/B/C は出題・知識ベースのシリーズだが、その上に **6 切り口（結論／理由／体験／反論／数字／ハウツー）の角度型**を載せられる（[content-angle-policy.md](./content-angle-policy.md) が真実源）。源は角度が立った既存 note 記事（自動要約ではない＝§9 で廃止した汎用要約の轍を踏まない）。保存狙いの `counter`（反論）が IG Carousel と最も相性が良い。slide-data.json は `meta.angle` で角度を識別し、cover コピーと本文の論理骨子を角度別に切り替える。

## 7. やらないこと

- **両シリーズを混同する命名**: A は `<NNN>-クイズ-...`、B は `{exam}/exam-packs/<year>/pack-<NN>` で物理的に分離
- **B の自動生成内容を投稿前に確認しない**: 必ず 1 パックずつ視覚確認してから投稿
- **A の source.md を機械生成する**: 運営者の手書きクラフトが A の価値の中核

## 8. デザイン仕様

### B 過去問パック（AIDesigner 新意匠）

> **真実源**: [`.claude/knowledge/design-system/instagram-carousel-tokens.json`](../design-system/instagram-carousel-tokens.json) + [`.claude/knowledge/design-system/instagram-carousel.md`](../design-system/instagram-carousel.md)

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

> **B（過去問 `exam-packs`）のカバーは別レンダラ**（`.claude/scripts/sns/templates/exam-cover-ig.mjs` の `renderExamCoverIg`、上表の A 用 tokens は不使用）。2026-06-17 に**カバー1枚目を「管理分野」主役に変更**＝上部色帯を 5 管理別色（`sns-config.mjs managementMap[].color`）にし、管理分野ラベルを大見出し、年度＋形式は従（小）へ降格。YT Shorts カバー（`per-problem-shorts.mjs` / `generate-thumbnails.mjs`）も同様に管理分野主役＋「この動画の論点」併記。真実源は sns-image-policy.md §12。本文 problem/answer スライドは単一 brand 配色のまま。

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

### 実装（2026-05-27 完了）

ストーリー素材は **reels サイズ（1080×1920）から 4 枚を厳選 → `stories/img/` にコピー** する自動化を採用：

```bash
# Reels サイズ PNG を 1080×1920 で生成
node .claude/skills/social/ig-post-create/scripts/ig-post-create.mjs --exam r07-pack-01 --size reels

# stories/img/ に 4 枚（cover/Q1/A1/cta）を抽出 + caption + note.md 自動生成
node .claude/scripts/instagram/build-stories.mjs --pack r07-pack-01
# → content/sns/instagram/cem/exam-packs/r07/pack-01/stories/{img/01-cover.png ...}
```

`quiz-slides.mjs` は `reelsWrapper`（1350px コンテンツを 1920px キャンバスの中央に配置）で縦長キャンバスにも対応済み。R3-R7 全 42 パック × 4 枚 = 168 PNG 整備完了。

### 年度目次カルーセル（`_summary/`）

**問題**: IG ストーリーのリンクスタンプは 1 個までで、1 ストーリーから 9 パックの個別投稿に直接リンクできない。

**解決**: 各年度に「目次カルーセル」を新設し、ストーリー → 目次 → 個別パックの 3 階層誘導にする。

```
ストーリー（1 枚）= reels/img/00-cover.png をストーリーに投稿
   ↓ リンクスタンプ
目次カルーセル投稿（4 枚）= _summary/carousel/img/{00-cover, 01-pack-list, 02-pack-list, 03-cta}.png
   ↓ プロフィール経由
個別パック投稿（pack-01〜09）
```

生成は `.tmp/build-summary-slide-data.mjs <year>` → `.tmp/render-summary.mjs <year>` の 2 段（`pack-titles` から半自動生成）。出力は 5 年度 × 4 枚 × 2 サイズ = 40 PNG。

将来は doboku-note サイト側に `/exam/r07` のような中継 LP を新設し、`IG 投稿 URL + サイト解説 URL` の二段構えに発展可能（試験後の課題）。

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

## 11. 投稿フロー全体図（B シリーズ・過去問パック）

```
slide-data.json
       ↓
[ig-post-create]  ← --size both: 1080×1350 (carousel) + 1080×1920 (reels) PNG 各 10 枚
       ↓
[generate-caption] ← --format carousel|reels: メディア別 caption.txt 生成
       ↓
[ig-reel-create]  ← reels PNG + VOICEVOX TTS + ffmpeg で video.mp4 生成（任意）
       ↓
┌─────────────────────────────────┬─────────────────────────────────┐
│ カルーセル投稿（フィード）       │ Reels 投稿                       │
│ - carousel/img/*.png (10 枚)     │ - reels/video.mp4               │
│ - carousel/caption.txt           │ - reels/caption.txt             │
│ → 保存ストック                   │ → リーチ獲得（+ ストーリー転用） │
└─────────────────────────────────┴─────────────────────────────────┘
```

トークン変更後の一括再生成は `ig-carousel-restyle --year r07`（lint pre-check 付き）。

## 12. 関連ドキュメント

- `docs/marketing/01_SNS集客戦略.md` — IG 戦略 v6
- `content/sns/instagram/profile.md` — IG プロフィール SoT
- `content/sns/instagram/README.md` — IG 運用基本
- `.claude/skills/social/ig-post-create/SKILL.md` — カルーセル PNG 生成
- `.claude/skills/social/ig-carousel-restyle/SKILL.md` — 一括再生成
- `.claude/skills/social/ig-reel-create/SKILL.md` — Reels 動画生成
- `.claude/skills/social/publish-ig-bs/SKILL.md` — Business Suite 予約投稿エンジン
- `.claude/knowledge/reference/ig-publish-reconcile.md` — **公開状態の照合＋未公開の予約投稿の運用 SSOT**（`verify-ig-status` でライブ↔SoT 突合・`/ig-reconcile` スキル・`ig-publish-auditor` ゲート。投稿後の posted.json ドリフトを定期是正）
- `scripts/lint-exam-pack-structure.mjs` — 構造違反 lint
- `.claude/knowledge/design-system/instagram-carousel.md` — デザイン仕様
- `.claude/knowledge/design-system/instagram-carousel-tokens.json` — トークン真実源
- `.claude/knowledge/reference/links-hub.md` — `/links` SNS bio 中継ページ
