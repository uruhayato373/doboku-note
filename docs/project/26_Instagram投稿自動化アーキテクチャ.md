# Instagram 投稿自動化アーキテクチャ

技術士（総合技術監理部門）向け Instagram 運用を「サイト・iOS アプリ・note への動線」として立ち上げるための画像・動画生成基盤の設計書。

- 最終更新: 2026-04-26（v2: API 連携を Phase 1 に前倒し、共通基盤 sns-common に依存）
- 親戦略: [07_SNS集客戦略.md](./07_SNS集客戦略.md)（v4・X / YouTube / Instagram 統合、SNS 量産型）
- 関連: [05_収益化戦略.md](./05_収益化戦略.md)（iOS・note・YouTube 3 本柱）, [Umbrella Issue #161](https://github.com/uruhayato373/doboku-note/issues/161)

## v1 からの変更点（2026-04-26 v2）

| 項目 | v1（撤回） | v2（採用） | 理由 |
|---|---|---|---|
| Meta API 連携 | Phase 5 で任意実施 | Phase 1 から実施（必須） | 手動運用前提を撤回。共通基盤 `media-uploader.mjs` で抽象化 |
| 共通基盤 | 未定義 | `.claude/scripts/lib/sns-common/` で YouTube と共有 | チャネル独立ではなく 1 ソース → 多チャネル派生 |
| Meta Business Suite 手動投稿 | 主運用 | 緊急時フォールバックのみ | API 完全自動化を主軸に |
| Phase 数 | 1〜5 | 1〜4 | 旧 Phase 5（API 連携）を Phase 1 に統合

## 1. 目的とスコープ

### 位置づけ
- **動線チャネル**として運用。Instagram 単体の収益は追わない（受験者数 年 3,000〜5,000 人規模でフィード広告収益は見込み薄）
- **顔出しなし**。運営者の個性ではなく「テーマ × 図解」のストック性で勝負
- ゴール: プロフィール在 bio → doboku-note / note 有料記事 / iOS アプリへの遷移数の最大化

### やらないこと
- Meta 広告出稿（オーガニックのみ）
- ~~投稿 API 連携（Phase 1〜3 は Meta Business Suite で手動予約投稿）~~ → **v2 で撤回**: Phase 1 から API 連携を実施。Meta Business Suite は障害時のフォールバックのみ
- ~~他 SNS（X・YouTube・TikTok）との共通基盤化（各 SNS は独立設計）~~ → **v2 で撤回**: YouTube とは `.claude/scripts/lib/sns-common/` で基盤を共有（X・TikTok は引き続き独立）

### 07_SNS集客戦略との関係
親戦略では Instagram は「Q3 以降・YouTube 軌道後の補助チャネル」と位置づけられていた。本書は **Q3 を待たずに Phase 1 基盤だけ先行整備し、いつでも着手できる状態を作る** ためのインフラ設計に特化する。運用開始の時期判断は親戦略側に委ねる。

## 2. 設計原則

1. **既存 OGP スキル基盤を横展開する** — ゼロから作らない。`.claude/skills/content/ogp-create/` が Satori + Sharp + 4 層日本語改行で完全稼働しているため、Instagram 向けはサイズ・テンプレ・運用レイヤーだけ追加する
2. **画像を人間のセンスに任せない** — `queue.json` にキーワードと型を指定すれば PNG/MP4 が機械生成される状態を目指す。「デザイン判断」は `.claude/config/ig-post/templates.json` に閉じ込める
3. **カルーセルと Reels は同一データソースから派生** — カルーセル PNG を ffmpeg で縦動画化できる設計にしておく（Phase 3 で Remotion へ差し替え可能）
4. **既存 SVG の再利用** — `.local/r2/posts/pe-comprehensive-management/**/img/*.svg` は base64 inline で Satori に埋め込む（外部ファイル参照は Satori の制約で不可）
5. **顔出しなしゆえの差別化軸**: テキスト画像の情報密度・保存されやすさ・5 管理別カテゴリのストック性

## 3. アーキテクチャ全体像

```
┌─ 入力層 ─────────────────────────────────────────────────────┐
│ .claude/config/ig-post/queue.json                           │ 投稿キュー（slug + 型 + 公開日）
│ .local/r2/posts/pe-comprehensive-management/**              │ MDX（frontmatter + 本文）
│ .claude/state/backlinks.json                                │ 関連キーワード
│ .claude/pdfs/**                                             │ 過去問（5択抽出用）
└──────────────────────────────────────────────────────────────┘
              ↓
┌─ 生成層 ─────────────────────────────────────────────────────┐
│ カルーセル (1080×1350 4:5 portrait)                         │
│   ig-post-create.mjs → Satori → @resvg/resvg-js → PNG      │
│                                                              │
│ Reels (1080×1920 9:16)                                      │
│   Phase 1-2: 生成対象外                                      │
│   Phase 3:   ig-reel-from-slides.mjs → ffmpeg で静止画連結  │
│   Phase 4:   ig-reel-remotion/ → Remotion → MP4            │
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
  - /media → /media_publish の 2 段階（カルーセル/Reels）
              ↓
.claude/state/sns-post/published.json（API レスポンスの URL/ID 永続化）
```

## 4. ディレクトリ構成

```
.claude/skills/content/
  ig-post-create/                  # 【新規】カルーセル生成
    SKILL.md
    scripts/
      ig-post-create.mjs           # エントリ
      lib/
        ig-templates.mjs           # 8 型のレンダラ（OGP の ogp-templates.mjs を踏襲）
        ig-slide-types.mjs         # スライド構成ロジック（型ごとのスライド配列定義）
        ig-quiz-data.mjs           # 過去問 MDX から 5 択問題を抽出
        ig-content-loader.mjs      # queue.json + MDX 読込
        ig-caption-gen.mjs         # 投稿本文・ハッシュタグ自動生成
  ig-reel-create/                  # 【新規・Phase 3〜】Reels 生成
    SKILL.md
    scripts/ig-reel-create.mjs     # ffmpeg / Remotion

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
| Reels Phase 3 | **ffmpeg + 既存 PNG** | Remotion 先行導入 | 既存カルーセル PNG を連結するだけで済み、200MB+ の依存追加を遅らせられる |
| Reels Phase 4 | Remotion | ffmpeg のみで継続 | React で時系列アニメーションが書ける。型 7・型 8（数字カウントダウン等）の表現力が必要になった時点で導入 |
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

| # | 型 ID | 名称 | 形式 | スライド数 | 素材ベース | 制作コスト |
|---|---|---|---|---|---|---|
| 1 | `definition` | キーワード定義カード | カルーセル | 5-7 | テキスト画像 | 低 |
| 2 | `illustrated` | 図解キーワード解説 | カルーセル | 7-10 | 既存 SVG + テキスト | 中 |
| 3 | `quiz` | 5 択クイズ | カルーセル | 3-5 | 過去問 MDX 抽出 | 低 |
| 4 | `compare` | 用語比較（FMEA vs FTA 等） | カルーセル | 5 | 既存 SVG or 表 | 中 |
| 5 | `past-question` | 過去問 → キーワード逆引き | カルーセル | 5-7 | 過去問 MDX 流用 | 低 |
| 6 | `mnemonic` | 覚え方・語呂 | 単発 or カルーセル | 1-3 | テキスト画像 | 低 |
| 7 | `skima-time` | スキマ時間キーワード | Reels 15-30 秒 | 動画 | テロップ動画 | 中 |
| 8 | `weekly-top5` | 今週の頻出 Top5 | Reels or カルーセル | 6-7 | テキスト画像 | 低 |

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

```
1. queue.json に投稿予定を追加（手動 or /ig-queue 的スキルで半自動）
     [{ slug: "mbo", type: "definition", date: "2026-05-01" }, ...]
          ↓
2. npm run ig-post:build -- --date 2026-05-01
     → .tmp/instagram/2026-05-01/mbo-definition/ に PNG 7 枚 + meta.json
          ↓
3. 目視確認（Phase 初期は全件、慣れたら 5 投稿に 1 本サンプリング）
          ↓
4. media-uploader.mjs が Meta Graph API へ自動投稿
     /media コンテナ作成 → /media_publish で公開（カルーセル/Reels 共通）
          ↓
5. API レスポンスを .claude/state/sns-post/published.json に自動記録
```

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

## 8. 実装フェーズ

| Phase | 期間目安 | 内容 | 完了判定 |
|---|---|---|---|
| **0 共通基盤** | 4-6 日 | `.claude/scripts/lib/sns-common/` の 6 ファイル整備（jp-text-wrap / design-tokens / mdx-extract / slide-render / tts-client / media-uploader） | YouTube と共通の素材生成・API 投稿基盤が動作 |
| **1 MVP + API** | 3-4 日 | `ig-post-create` スキル新設・型1(定義)+型3(5択) の 2 型・10 キーワードで試走・**Meta Graph API で実投稿** | カルーセル PNG 生成と API 自動投稿が 1 周できる |
| **2 型拡充** | 3-5 日 | 型2(図解・既存 SVG 連携)+型4(比較)+型5(過去問逆引き)+型6(覚え方) 追加 | 6 型で 50 キーワード分の素材バンク |
| **3 Reels 着手** | 2-3 日 | ffmpeg でカルーセル PNG を縦動画化（型7 = スキマ時間） | 静止画連結 Reel が API 投稿できる |
| **4 本格 Reel** | 必要時 | Remotion 導入・型8 週次 Top5（数字カウント等） | アニメ付き Reel 投稿 |

Phase 0 を YouTube と並行で先行整備（Issue #164 SNS-0）。Phase 1+2 で「運用インフラ完成」、Phase 3-4 は試験後（2026-08 以降）の継続運用で段階追加する想定。Phase 0 と Phase 1 は 2026-04〜05 に整備（2026-07 試験前に稼働可能）。

### 実行タスクの管理場所

本書は Why・設計の固定知識。**具体的な実行タスク・進捗・完了判定は GitHub Umbrella Issue で管理**する（[docs-issue-separation.md](../.claude/reference/docs-issue-separation.md) 参照）。

- Umbrella Issue（作成予定）: `[Umbrella] Instagram 投稿自動化基盤整備`
- Phase ごとに子 Issue を切る（`[IG-1] MVP`・`[IG-2] 型拡充` 等）
- ラベル: `umbrella` / `ig-post`

## 9. 未決事項

| 項目 | 選択肢 | 決定時期 |
|---|---|---|
| 初投稿タイミング | A: インフラ完成後すぐ / B: 試験後（2026-08）/ C: 親戦略の Q3 判断に従う | Phase 1 完了時 |
| 1 日の投稿数 | A: 1 投稿 / B: 週 3 / C: 週 2 | Phase 1 試走後 |
| Reels vs カルーセル比率 | A: カルーセル 8:Reels 2 / B: 5:5 / C: 運用で決める | Phase 3 着手時 |
| 在 bio リンクの着地点 | A: doboku-note トップ / B: 技術士総監トップ / C: Linktree 的 LP | Phase 1 着手時 |
| Reels 生成技術 | A: ffmpeg（軽量）/ B: Remotion（表現力）/ C: ハイブリッド | Phase 3 着手時 |

**v2 で削除された未決事項**: Meta Graph API 連携 → Phase 1 で実施に決定（2026-04-26）

## 10. リスクと対策

| リスク | 影響度 | 対策 |
|---|---|---|
| 受験者数の少なさでリーチが伸びない | 中 | 収益目的でないため許容。動線貢献で評価 |
| 画像生成のデザイン品質が単調になる | 中 | 型を 6-8 種持つことで視覚的飽和を防ぐ。Phase 2 で拡張 |
| アカウント BAN（Meta の規約違反） | 低 | 過去問の著作権配慮・出典明記・無断転載回避 |
| Satori の CSS 制約で表現したい図が作れない | 低〜中 | 既存 SVG の base64 inline で逃げる。Satori 単体で足りなければ該当スライドだけ Playwright screenshot で代替 |
| 運用者の投稿作業負荷 | 中 | Meta Business Suite の予約投稿で週 1 まとめ投稿運用に集約。Phase 5 で API 化 |

## 11. 参照

- 親戦略: [07_SNS集客戦略.md](./07_SNS集客戦略.md)（v4・X / YouTube / Instagram 統合）— YouTube 戦略は本書と同 doc 内に統合済み（Instagram は YouTube と共通基盤を共有）
- 収益化戦略: [05_収益化戦略.md](./05_収益化戦略.md)（動線先の note・iOS アプリ）
- 既存 OGP スキル: `.claude/skills/content/ogp-create/SKILL.md`（本書の設計ベース）
- Tier 分離ルール: [.claude/reference/docs-issue-separation.md](../.claude/reference/docs-issue-separation.md)
- SVG 作成ルール: `.claude/skills/content/create-svg/SKILL.md`（既存 SVG の再利用ガイド）
