# Instagram 投稿自動化アーキテクチャ

技術士（総合技術監理部門）向け Instagram 運用を「サイト・iOS アプリ・note への動線」として立ち上げるための画像・動画生成基盤の設計書。

- 最終更新: 2026-04-28（v3: Carousel + Reels 両軸へ転換、YT Shorts mp4 を IG Reels に流用）
- 親戦略: [07_SNS集客戦略.md](./07_SNS集客戦略.md)（v5・X / YouTube / Instagram 統合、Reels 流用ハイブリッド）
- 関連: [05_収益化戦略.md](./05_収益化戦略.md)（iOS・note・YouTube 3 本柱）, [Umbrella Issue #161](https://github.com/uruhayato373/doboku-note/issues/161)

## v1 からの変更点（2026-04-26 v2）

| 項目 | v1（撤回） | v2（採用） | 理由 |
|---|---|---|---|
| Meta API 連携 | Phase 5 で任意実施 | Phase 1 から実施（必須） | 手動運用前提を撤回。共通基盤 `media-uploader.mjs` で抽象化 |
| 共通基盤 | 未定義 | `.claude/scripts/lib/sns-common/` で YouTube と共有 | チャネル独立ではなく 1 ソース → 多チャネル派生 |
| Meta Business Suite 手動投稿 | 主運用 | 緊急時フォールバックのみ | API 完全自動化を主軸に |
| Phase 数 | 1〜5 | 1〜4 | 旧 Phase 5（API 連携）を Phase 1 に統合 |

## v2 からの変更点（2026-04-28 v3）

| 項目 | v2（撤回） | v3（採用） | 理由 |
|---|---|---|---|
| Reels 着手時期 | Phase 3-4（試験後 2026-08〜） | **Phase 1 から流用開始** | YT Shorts MVP（#166）が生成する mp4 を Meta Graph API に投げるだけで実装可能 |
| Reels 生成技術 | 独自 ffmpeg / Remotion パイプライン | **YT Shorts MVP の mp4 を流用** | 共通基盤 sns-common の真価。追加実装 ≈ 100 行（ig-reel-publish.mjs 1 日） |
| Reels vs Carousel 比率 | 未決（Phase 3 着手時に判断） | **Phase 1 は Carousel 週 2 + Reels 週 3 で開始** | データドリブンで 6 週後にトリガー判定 |
| 投稿頻度 | 未決（Phase 1 試走後判断） | **Carousel 週 2（火金 07:00）+ Reels 週 3（月水金 19:30）= 週 5 タッチ** | YT Shorts と同時投稿のため追加コストなし |
| 役割分担 | Reels = 表現力豊かな動画（型 7 用） | **Reels = フィード偶発接触のリーチ獲得器、Carousel = 保存ストック教材** | チャネル別ジョブを明確に棲み分け |

## 1. 目的とスコープ

### 位置づけ
- **動線チャネル**として運用。Instagram 単体の収益は追わない（受験者数 年 3,000〜5,000 人規模でフィード広告収益は見込み薄）
- **顔出しなし**。運営者の個性ではなく「テーマ × 図解」のストック性で勝負
- ゴール: プロフィール在 bio → doboku-note / note 有料記事 / iOS アプリへの遷移数の最大化

### やらないこと
- Meta 広告出稿（オーガニックのみ）
- ~~投稿 API 連携（Phase 1〜3 は Meta Business Suite で手動予約投稿）~~ → **v2 で撤回**: Phase 1 から API 連携を実施。Meta Business Suite は障害時のフォールバックのみ
- ~~他 SNS（X・YouTube・TikTok）との共通基盤化（各 SNS は独立設計）~~ → **v2 で撤回**: YouTube とは `.claude/scripts/lib/sns-common/` で基盤を共有（X・TikTok は引き続き独立）
- ~~Reels は Phase 3-4 で defer（ffmpeg / Remotion で独自生成）~~ → **v3 で撤回**: Phase 1 から YT Shorts MVP（#166）の mp4 を Meta Graph API REELS endpoint に流用投稿（ig-reel-publish.mjs）

### 07_SNS集客戦略との関係
親戦略 v5 では Instagram は「Carousel + Reels の両軸で Q3 から並列稼働」と位置づけられている。本書は **Q3 までに Phase 1 基盤を整備し、Carousel と Reels の両方を同時稼働できる状態を作る** ためのインフラ設計に特化する。投稿頻度・KPI・トリガー判定の詳細は親戦略 §2.3 を参照。

## 2. 設計原則

1. **既存 OGP スキル基盤を横展開する** — ゼロから作らない。`.claude/skills/content/ogp-create/` が Satori + Sharp + 4 層日本語改行で完全稼働しているため、Instagram 向けはサイズ・テンプレ・運用レイヤーだけ追加する
2. **画像を人間のセンスに任せない** — `queue.json` にキーワードと型を指定すれば PNG/MP4 が機械生成される状態を目指す。「デザイン判断」は `.claude/config/ig-post/templates.json` に閉じ込める
3. **カルーセルと Reels は同一データソースから派生** — カルーセル PNG を ffmpeg で縦動画化できる設計にしておく（Phase 3 で Remotion へ差し替え可能）
4. **既存 SVG の再利用** — `.local/r2/posts/pe-comprehensive-management/**/img/*.svg` は base64 inline で Satori に埋め込む（外部ファイル参照は Satori の制約で不可）
5. **顔出しなしゆえの差別化軸**: テキスト画像の情報密度・保存されやすさ・5 管理別カテゴリのストック性

## 3. アーキテクチャ全体像

```
┌─ 入力層 ─────────────────────────────────────────────────────┐
│ .claude/config/ig-post/queue.json                           │ 投稿キュー（slug + 型 + 公開日 + media_type）
│ .local/r2/posts/pe-comprehensive-management/**              │ MDX（frontmatter + 本文）
│ .claude/state/backlinks.json                                │ 関連キーワード
│ .claude/pdfs/**                                             │ 過去問（5択抽出用）
│ .tmp/yt-shorts/YYYY-MM-DD/{slug}.mp4                        │ YT Shorts MVP の mp4（Reels 流用元）
└──────────────────────────────────────────────────────────────┘
              ↓
┌─ 生成層 ─────────────────────────────────────────────────────┐
│ カルーセル (1080×1350 4:5 portrait)                         │
│   ig-post-create.mjs → Satori → @resvg/resvg-js → PNG      │
│                                                              │
│ Reels (1080×1920 9:16) — v3 で Phase 1 に前倒し            │
│   ig-reel-publish.mjs → YT Shorts mp4 をそのまま流用         │
│   キャプションのみ ig-caption-gen.mjs で IG 用に再生成       │
│   （旧 Phase 3 ffmpeg / Phase 4 Remotion 独自生成は撤回）   │
│                                                              │
│ 共通基盤                                                     │
│   lib/jp-text-wrap.mjs  OGPから抽出（4 層改行）             │
│   lib/ig-slide-types.mjs  8型のスライド構成ロジック          │
└──────────────────────────────────────────────────────────────┘
              ↓
┌─ 出力層 ──────────────────────────────────────────────────────┐
│ .tmp/instagram/YYYY-MM-DD/{slug}-{type}/                    │
│   01-cover.png  02-def.png  ...  10-cta.png                 │
│   reel.mp4                                                   │
│   meta.json（キャプション・ハッシュタグ・在 bio リンク）       │
└───────────────────────────────────────────────────────────────┘
              ↓
Meta Graph API v18+ で自動投稿（共通基盤 media-uploader.mjs 経由）
  - Carousel: /media (media_type=CAROUSEL_ALBUM) → /media_publish
  - Reels:    /media (media_type=REELS) → /media_publish
              ↓
.claude/state/sns-post/published.json（API レスポンスの URL/ID 永続化）
```

## 4. ディレクトリ構成

```
.claude/skills/social/
  ig-post-create/                  # 【新規】Carousel 生成 + Reels 投稿（v3 で統合）
    SKILL.md
    scripts/
      ig-post-create.mjs           # Carousel エントリ
      ig-reel-publish.mjs          # 【v3 新規】YT Shorts mp4 を IG Reels に流用投稿（約 100 行）
      lib/
        ig-templates.mjs           # 8 型のレンダラ（OGP の ogp-templates.mjs を踏襲）
        ig-slide-types.mjs         # スライド構成ロジック（型ごとのスライド配列定義）
        ig-quiz-data.mjs           # 過去問 MDX から 5 択問題を抽出
        ig-content-loader.mjs      # queue.json + MDX 読込
        ig-caption-gen.mjs         # 投稿本文・ハッシュタグ自動生成（Carousel/Reels 兼用）

# 注: ig-reel-create/ ディレクトリ（独自 Reels 生成）は v3 で撤回。
# Reels は YT Shorts MVP の mp4 を流用するため、独自スキルは不要。

.claude/config/ig-post/            # 【新規】設定・キュー
  templates.json                   # 型別デザイン定義
  rules.json                       # slug → 型の自動選定
  text.json                        # 改行・フォントサイズ（OGP text.json を継承）
  design-tokens.json               # IG 用カラー・サイズトークン
  queue.json                       # 投稿キュー（設定扱い）
  caption-templates.json           # キャプションひな形（型別）

.claude/state/ig-post/             # 【新規】実行状態
  generated.json                   # 生成済み投稿の履歴
  published.json                   # 公開済みマーク（手動更新 or 将来 API 連携）

.claude/scripts/lib/
  jp-text-wrap.mjs                 # 【抽出】OGP の ogp-text.mjs を OGP/IG 共用化

.tmp/instagram/                    # 生成物置き場（gitignore 済）
```

### 情報蓄積 3 層モデルとの整合
- **Tier 1（状態）**: 投稿キュー運用は [docs-issue-separation.md](../.claude/reference/docs-issue-separation.md) に従い GitHub Umbrella Issue で管理（投稿予定・済 → label: `ig-post-queue`）。`queue.json` は「次週分の実行指示」だけ保持
- **Tier 2（固定知識）**: 本書 + `SKILL.md` + `.claude/config/ig-post/*.json`
- **Tier 3（機械データ）**: `.claude/state/ig-post/*.json`

## 5. 技術選定と理由

| レイヤー | 採用 | 代替検討 | 選定理由 |
|---|---|---|---|
| カルーセル画像 | **Satori + @resvg/resvg-js** | Puppeteer / Playwright screenshot | 既に OGP で稼働・高速・軽量・CSS 互換性ブレが少ない |
| 既存 SVG の埋め込み | `<img src="data:image/svg+xml;base64,...">` | Satori が外部 SVG を直接読めないため base64 inline で強制的に解決 |
| Reels（v3 採用） | **YT Shorts MVP の mp4 を流用** | ffmpeg / Remotion 独自生成 | 共通基盤 sns-common により追加実装ほぼゼロ。同 mp4 を YT/IG 両方に投稿してもアルゴリズム重複なし（YT=検索、IG=Explore/フィード） |
| 旧 Reels Phase 3 | ~~ffmpeg + 既存 PNG~~ | — | **v3 で撤回**: YT Shorts mp4 流用に統合 |
| 旧 Reels Phase 4 | ~~Remotion 高度 Reel~~ | — | **v3 で defer**: 型 8（数字カウントダウン等）が必要になったら #168 で再検討 |
| フォント | Noto Sans JP Bold + Inter Bold | Google Fonts 他 | OGP と共用（既配置済み・ライセンス確認済み） |
| 改行戦略 | OGP の 4 層戦略流用 | 新規設計 | `lib/jp-text-wrap.mjs` に抽出し OGP/IG 両方から import。OGP の改行テストが資産 |
| 画像サイズ | **1080×1350 (4:5)** | 1080×1080 (1:1) | 4:5 の方がフィードでの占有面積が大きい。情報密度を上げられる |
| Reels サイズ | 1080×1920 (9:16) | Instagram 標準 |

### Satori 採用時の既知の制約

- **外部 SVG 読み込み不可** → base64 inline で解決
- **CSS Grid / Flex の子の auto 配置が限定的** → `position: absolute` + 手動座標のテンプレが OGP で既に確立
- **絵文字フォント別途** → 本プロジェクトは絵文字を使わないルールのため影響なし（CLAUDE.md 参照）
- **カーニング微調整不可** → デザイン要件として許容

## 6. 投稿タイプ（8 型）

v3 で Reels/Carousel 振り分けを明示。**Reels は YT Shorts の mp4 を流用**するため独自生成は不要。

| # | 型 ID | 名称 | フォーマット | スライド数/尺 | 素材ベース | 着手 Phase |
|---|---|---|---|---|---|---|
| 1 | `definition` | キーワード定義カード | **Carousel** | 7 枚 | MDX + Satori | Phase 1（#165） |
| 2 | `illustrated` | 図解キーワード解説 | **Carousel** | 7-10 枚 | 既存 SVG + Satori | Phase 2（#168） |
| 3 | `quiz` | 5 択クイズ | **Carousel** | 5 枚 | 過去問 MDX 抽出 | Phase 1（#165） |
| 4 | `compare` | 用語比較（FMEA vs FTA 等） | **Carousel** | 5 枚 | 既存 SVG or 表 | Phase 2（#168） |
| 5 | `past-question` | 過去問 → キーワード逆引き | **Carousel** | 5-7 枚 | 過去問 MDX 流用 | Phase 2（#168） |
| 6 | `mnemonic` | 覚え方・語呂 | **Carousel** | 1-3 枚 | テキスト画像 | Phase 2（#168） |
| 7 | `skima-time` | スキマ時間キーワード | **Reels（YT 流用）** | 30-60 秒 | YT Shorts mp4 | **Phase 1（v3 前倒し）** |
| 8 | `weekly-top5` | 今週の頻出 Top5 | **Reels（YT 流用）or Carousel** | 30-60 秒 / 6-7 枚 | YT Shorts mp4 or テキスト画像 | Phase 2（#168） |

**Reels 投稿対象（type7/type8）の選定基準**:
- YT Shorts MVP（#166）が生成する全 mp4 が IG Reels の流用対象
- queue.json の `media_type: "reel"` で IG Reels 投稿、`media_type: "carousel"` で Carousel 投稿を指定
- 同一キーワードで Carousel + Reels を両方投稿することも可能（ザイオンス効果）

### スライド構成ロジック

各型は「スライド数 × 構成パーツ」を `lib/ig-slide-types.mjs` で宣言する。カルーセルは単発 OGP 生成と同じパターンを N 枚ループするだけ。

```js
// lib/ig-slide-types.mjs の概念
export const SLIDE_TYPES = {
  definition: {
    slides: [
      { role: 'cover',      render: renderCoverSlide },       // 1: 表紙フック
      { role: 'definition', render: renderDefinitionSlide },  // 2: 定義
      { role: 'context',    render: renderContextSlide },     // 3: なぜ重要か
      { role: 'example',    render: renderExampleSlide },     // 4: 具体例
      { role: 'points',     render: renderPointsSlide },      // 5: 3 つの要点
      { role: 'related',    render: renderRelatedSlide },     // 6: 関連キーワード
      { role: 'cta',        render: renderCtaSlide },         // 7: 在 bio リンク
    ],
  },
  quiz: {
    slides: [
      { role: 'cover',   render: renderQuizCover },
      { role: 'problem', render: renderQuizProblem },
      { role: 'pause',   render: renderQuizPause },   // 「考えてみて」ページ
      { role: 'answer',  render: renderQuizAnswer },
      { role: 'explain', render: renderQuizExplain },
      { role: 'cta',     render: renderCtaSlide },
    ],
  },
  // ... 他 6 型
};
```

### デザイントークン

`.claude/config/ig-post/design-tokens.json` にサイト（`src/styles/globals.css` の `--color-*`）と同じ色階層を持たせる。Satori は CSS 変数を解釈しないので JSON から直接 hex を参照する。

| 用途 | hex | サイトトークン名 |
|---|---|---|
| ブランドメイン | `#2e6da4` | `brand` |
| ブランドフィル | `#e8f0fe` | `brand-fill` |
| ブランド濃 | `#1a3a5c` | `brand-deep` |
| 本文 | `#222` | `ink-strong` |
| サブ本文 | `#555` | `ink-body` |
| ミュート | `#8a8a8a` | `ink-muted` |
| 肯定 | `#3a7d44` | `positive` |
| 警告 | `#d4a017` | `warn` |
| 否定 | `#b22234` | `danger` |

## 7. 運用フロー

v3 で Carousel と Reels の 2 系統並行運用に。

### Carousel 投稿フロー

```
1. queue.json に投稿予定を追加
     [{ slug: "mbo", type: "definition", date: "2026-05-01", media_type: "carousel" }, ...]
          ↓
2. npm run ig-post:build -- --date 2026-05-01
     → .tmp/instagram/2026-05-01/mbo-definition/ に PNG 7 枚 + meta.json
          ↓
3. 目視確認（Phase 初期は全件、慣れたら 5 投稿に 1 本サンプリング）
          ↓
4. media-uploader.mjs が Meta Graph API へ自動投稿
     /media (CAROUSEL_ALBUM) → /media_publish で公開
          ↓
5. API レスポンスを .claude/state/sns-post/published.json に自動記録
```

### Reels 投稿フロー（v3 新規）

```
1. queue.json に投稿予定を追加（YT Shorts と同じ slug を指定）
     [{ slug: "mbo", date: "2026-05-01", media_type: "reel" }, ...]
          ↓
2. YT Shorts MVP（#166）が事前に mp4 を生成
     .tmp/yt-shorts/2026-05-01/mbo.mp4
          ↓
3. node ig-reel-publish.mjs --slug mbo --date 2026-05-01
     → ig-caption-gen.mjs で IG 用キャプション生成（hashtag 密度 YT より高め）
     → meta-ig.json に保存
          ↓
4. media-uploader.mjs が Meta Graph API へ自動投稿
     /media (REELS) → /media_publish で公開
          ↓
5. API レスポンスを .claude/state/sns-post/published.json に自動記録
```

### 投稿スケジュール

| 曜日 | 時刻 (JST) | 投稿 | 備考 |
|---|---|---|---|
| 月 | 19:30 | YT Shorts + IG Reels（同 mp4） | 平日夜の通勤・帰宅時間帯 |
| 火 | 07:00 | IG Carousel | 平日朝の通勤時間帯（保存されやすい） |
| 水 | 19:30 | YT Shorts + IG Reels（同 mp4） | 同上 |
| 金 | 07:00 | IG Carousel | 同上 |
| 金 | 19:30 | YT Shorts + IG Reels（同 mp4） | 同上 |

**週合計**: Carousel 2 + Reels 3 = 5 投稿（YT Shorts は同じ 3 mp4 で別途 3 投稿）

### キャプション自動生成ルール

`lib/ig-caption-gen.mjs` で MDX の `description` + `title` + 型別定型文 + 固定ハッシュタグから生成。

```
【{title}】

{description 100 字以内に整形}

図解でまとめました。
保存しておくと試験直前に見返せます。

詳細は在 bio リンクから。
→ doboku-note.com（技術士総監キーワード集 690 件）

#技術士 #技術士総監 #技術士二次試験 #{管理分類} #{該当キーワード}
#総合技術監理 #技術士試験 #技術士受験 #エンジニア学習 #土木
```

ハッシュタグは `.claude/config/ig-post/caption-templates.json` で管理（型別・管理分類別）。

## 8. 実装フェーズ（v3）

| Phase | 期間目安 | 内容 | 完了判定 |
|---|---|---|---|
| **0 共通基盤** | 4-6 日 | `.claude/scripts/lib/sns-common/` の 6 ファイル整備（jp-text-wrap / design-tokens / mdx-extract / slide-render / tts-client / media-uploader） | YouTube と共通の素材生成・API 投稿基盤が動作（PR #169） |
| **1 Carousel MVP + Reels 流用** | 4-5 日 | `ig-post-create` スキル新設・型1(definition)+型3(quiz) の 2 型 Carousel・10 キーワードで試走・**Meta Graph API で実投稿** + **ig-reel-publish.mjs 新設**（YT Shorts mp4 を REELS endpoint へ） | Carousel PNG + Reels mp4 流用の両方が 1 周できる |
| **2 型拡充** | 3-5 日 | 型2(図解・既存 SVG 連携)+型4(比較)+型5(過去問逆引き)+型6(覚え方) Carousel 追加 | 6 型 Carousel で 50 キーワード分の素材バンク |
| **3 ~~Reels 着手~~** | — | **v3 で撤回**: Phase 1 に統合済み | — |
| **4 高度 Reel（必要時）** | 必要時 | Remotion 導入・型8 週次 Top5（数字カウント等）の独自アニメーション | YT 流用ではなくアニメ付き独自 Reel 投稿 |

Phase 0 を YouTube と並行で先行整備（Issue #164 SNS-0）。Phase 1 で「Carousel + Reels 流用の運用インフラ完成」、Phase 2 は試験後（2026-08 以降）の継続運用で型拡充する想定。Phase 0 と Phase 1 は 2026-04〜06 に整備（2026-07 試験前に稼働可能）。Phase 4 は KPI 評価で必要性が確認された場合のみ。

### 実行タスクの管理場所

本書は Why・設計の固定知識。**具体的な実行タスク・進捗・完了判定は GitHub Umbrella Issue で管理**する（[docs-issue-separation.md](../.claude/reference/docs-issue-separation.md) 参照）。

- Umbrella Issue（作成予定）: `[Umbrella] Instagram 投稿自動化基盤整備`
- Phase ごとに子 Issue を切る（`[IG-1] MVP`・`[IG-2] 型拡充` 等）
- ラベル: `umbrella` / `ig-post`

## 9. 未決事項

| 項目 | 選択肢 | 決定時期 |
|---|---|---|
| 初投稿タイミング | A: インフラ完成後すぐ / B: 試験後（2026-08）/ C: 親戦略の Q3 判断に従う | Phase 1 完了時 |
| 在 bio リンクの着地点 | A: doboku-note トップ / B: 技術士総監トップ / C: Linktree 的 LP | Phase 1 着手時 |

### v2 → v3 で決定済みに移動された項目

| 項目 | v3 決定内容 | 決定日 |
|---|---|---|
| Meta Graph API 連携 | Phase 1 で実施 | 2026-04-26 |
| Reels vs Carousel 比率 | **Phase 1 は Carousel 週 2 + Reels 週 3 で開始**、6 週評価で調整 | 2026-04-28 |
| Reels 生成技術 | **YT Shorts MVP の mp4 を流用**（ffmpeg/Remotion 独自実装は不要） | 2026-04-28 |
| 1 日の投稿数 | **Carousel 週 2（火金 07:00）+ Reels 週 3（月水金 19:30）** | 2026-04-28 |

## 10. リスクと対策

| リスク | 影響度 | 対策 |
|---|---|---|
| 受験者数の少なさでリーチが伸びない | 中 | 収益目的でないため許容。動線貢献で評価。Reels 流用により少ない労力で多面接触を狙う |
| 画像生成のデザイン品質が単調になる | 中 | Carousel 型を 6-8 種持つことで視覚的飽和を防ぐ。Phase 2 で拡張 |
| アカウント BAN（Meta の規約違反） | 低 | 過去問の著作権配慮・出典明記・無断転載回避 |
| Satori の CSS 制約で表現したい図が作れない | 低〜中 | 既存 SVG の base64 inline で逃げる。Satori 単体で足りなければ該当スライドだけ Playwright screenshot で代替 |
| 運用者の投稿作業負荷 | 低 | Meta Graph API 完全自動化（v2）+ queue.json バッチ仕込み + cron スケジューラ（#167）により、月の人手介入は 5 分以内（目視確認のみ） |
| YT Shorts mp4 が IG で「品質低」判定 | 低 | yt-shorts-create.mjs の出力が IG ガイドライン（H.264 yuv420p, AAC 128k, ≤ 1080×1920, ≤ 60 秒）に準拠していることを #166 で確認 |
| 同 mp4 を YT/IG 投稿で「リポスト」判定されエンゲージ低下 | 低 | IG はクリエイターのクロスポスト推奨。他社プラットフォームのウォーターマーク検知のみペナルティ。自家製エンコード mp4 ならウォーターマークなし |
| Meta API REELS endpoint の仕様変更 | 中 | media-uploader.mjs に集約してあるため切替コストは局所的 |
| Reels 平均リーチが Carousel の 3 倍未満 | 中 | 6 週運用後の KPI トリガーで判定（縮小: Reels 月 1 本 + Carousel 週 3 / 維持: 現状 / 拡大: Reels 比率引き上げ） |

## 11. 参照

- 親戦略: [07_SNS集客戦略.md](./07_SNS集客戦略.md)（v5・X / YouTube / Instagram 統合、Reels 流用ハイブリッド）— YouTube 戦略は本書と同 doc 内に統合済み。Instagram は Carousel + Reels の両軸で YouTube と共通基盤を共有
- 収益化戦略: [05_収益化戦略.md](./05_収益化戦略.md)（動線先の note・iOS アプリ）
- 既存 OGP スキル: `.claude/skills/content/ogp-create/SKILL.md`（本書の設計ベース）
- Tier 分離ルール: [.claude/reference/docs-issue-separation.md](../.claude/reference/docs-issue-separation.md)
- SVG 作成ルール: `.claude/skills/content/create-svg/SKILL.md`（既存 SVG の再利用ガイド）
