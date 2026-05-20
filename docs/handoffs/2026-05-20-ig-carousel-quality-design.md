# 設計＆引き継ぎ: Instagram カルーセル品質パイプライン

最終更新: 2026-05-20 / ブランチ `feature/ig-carousel-quality`

## ゴール

Instagram カルーセル（727本）の中身（`slide-data.json`）を、一括機械生成の低品質状態から、agent が1本ずつ丁寧に執筆した状態へ引き上げる。YouTube Shorts キャンペーンと同じ「編集可能 SSOT → agent 執筆 → 機械ゲート → Evaluator → 一括画像化」方式。加えて SVG 図版の活用と doboku-note との相互品質改善を組み込む。

## 確定した方針（2026-05-20 ユーザー判断）

- **SVG**: 「再利用＋新規スペック→別工程描画」。writer は既存 SVG を活用し、図が要る箇所は仕様を記述するのみ。SVG の実制作は別エージェント/スキルが design-system 準拠で行う。良い図は doboku-note へ寄贈。
- **進め方**: 設計を docs 化（本書）→ Phase 0 実装に着手。YouTube と並行。

## 作業環境（並行作業のための隔離）

- worktree `C:/tmp/doboku-note-ig`、ブランチ `feature/ig-carousel-quality`（develop 起点）。
- `node_modules` は main checkout からのジャンクション。
- YouTube は別 worktree `C:/tmp/doboku-note-yt`。main checkout `C:/Users/m004195/doboku-note` は別セッション用。**IG 作業はすべて `C:/tmp/doboku-note-ig` 内で行う**。

## 既存資産（流用するもの）

- `docs/sns/instagram/{date-slug}/slide-data.json` — 編集可能 SSOT（既存）。
- `.claude/skills/social/ig-post-create/scripts/ig-post-create.mjs` — slide-data.json → PNG レンダラ（config→画像の別工程は既に分離済み）。
- `.claude/scripts/lib/sns-common/notebook-slides.mjs` — Study Notebook スタイルのスライド要素ビルダー。
- doboku-note キーワード記事の SVG: 86/741 キーワードが保有。`<ArticleImage src="/posts/pe-comprehensive-management/{slug}/img/*.svg">` で埋め込み。実体は `.local/r2/posts/pe-comprehensive-management/{slug}/img/*.svg`。

## アーキテクチャ

### slide-data.json v2（可変枚数スキーマ）

現行の固定 `{cover, board, cta}` を、可変枚数へ:

```
{
  "cover": { ... },
  "slides": [ { "type": "board"|"figure"|..., ... }, ... ],   // 1〜8 枚
  "cta": { ... }
}
```

- カルーセル合計は cover + slides + cta = 3〜10 枚（Instagram API 制約 2〜10 に収める）。
- 各スライドに `type`。`board`（文字解説）と `figure`（SVG 主役）を用意。
- writer がキーワードの説明量に応じて枚数を決める。
- 途中切れキャプション帯（`ig-post-create.mjs` の `truncateCaption`）は**廃止**。

### figure スライド

- doboku-note の SVG を再利用する場合、IG の 4:5（1080×1350）に合わせてレイアウト調整した変種を描画する（記事用 SVG は横長前提のため）。
- SVG が無く図が有用な場合、writer は figure スペック（何を・どう図示するか）を slide-data.json に記述。実 SVG は別工程。

## コンポーネント設計

### エージェント（`.claude/agents/` に正式登録・agents-registry 同時更新）

| エージェント | 種別 | 役割 |
|---|---|---|
| `ig-carousel-writer` | Generator | キーワード MDX＋既存 SVG＋IG ルーブリックを読み、slide-data.json v2 を執筆。枚数決定・figure 判断 |
| `ig-carousel-qa` | Evaluator | IG ルーブリックで採点（枚数妥当性・図文整合・事実正確性・尺/字数） |

SVG 実制作は writer に持たせない（design-system 準拠の視覚デザインは別領域）。figure スペック → 別の SVG 制作工程。

### IG 品質ルーブリック

`docs/reference/ig-carousel-policy.md`（新規）。YT の `yt-shorts-script-policy.md` に相当。slide-data.json v2 の各フィールドの品質基準・字数・図文整合・固有名詞チェック等。

### 相互改善ループ（IG ↔ doboku-note）

discovery（並行・安全）と application（直列）を分離して MDX 編集衝突を防ぐ:

- writer/QA がキーワード MDX を読む過程で気づいた doboku-note 側の問題（説明不足・事実誤認・図が欲しい箇所）を **findings ログ**（`docs/sns/instagram/_keyword-findings.md`）に追記。MDX は直接編集しない。
- IG 用に作成した良い SVG は「doboku-note 寄贈候補」として findings ログに記録。
- キーワードページ改善・SVG 寄贈は別途まとめて直列に反映。

## フェーズ

- **Phase 0（コード・1回）**: slide-data.json v2 スキーマ対応。`notebook-slides.mjs` のレンダラをループ化＋figure レイアウト追加、`ig-post-create.mjs` の SLIDES 可変化、`publish-ig.mjs` のカルーセル枚数対応、キャプション帯廃止。`--config-only` 相当（既存）で SSOT 往復をテスト。
- **Phase 1**: IG ルーブリック作成 → `ig-carousel-writer`/`ig-carousel-qa` で投稿日順に1本ずつ slide-data.json v2 を執筆・採点。727本は巨大なので近い投稿日から優先。
- **Phase 2**: `ig-post-create.mjs` で一括画像化（既存工程）。
- SVG 制作・doboku-note 寄贈は findings ログを基に随時。

## 現在の状況

- 設計確定・本書作成済み。
- **Phase 0 完了**（2026-05-20）。slide-data.json v2 スキーマを実装・動作確認済み:
  - `slide-data.json` v2 = `{cover, slides[], cta}`。`slides` は `type: "board"|"figure"` の可変配列（カルーセル合計 3〜10 枚）。
  - `notebook-slides.mjs`: キャプション帯（`buildCaptionArea`）を廃止しコンテンツ領域を全高化、`buildNotebookFigure` を追加。
  - `slide-render.mjs`: `notebook-figure` 型を登録。
  - `ig-post-create.mjs`: SLIDES を可変化、v1→v2 後方互換シム `normalizeSlideData`（既存 727 ファイルは無改修で描画可）、figure の `imagePath` を data URI 解決。SVG は resvg＋フォントで PNG に焼いてから埋め込む（Satori の `<img>` 内 SVG はフォント未解決でテキストが消えるため）。`parseArgs` の連続フラグ取りこぼしバグも修正。
  - `publish-ig.mjs`: caption 生成を v1/v2 両対応に。
  - 検証済み: 既存 v1 ファイルの後方互換描画、v2 multi-slide（cover+board+figure×2+cta=5枚）描画、figure の実 SVG 埋め込み（図中ラベル完全描画）・スペックプレースホルダ描画、`--config-only`。
- 次は **Phase 1**: `docs/reference/ig-carousel-policy.md`（ルーブリック）作成 → `ig-carousel-writer`/`ig-carousel-qa` エージェント登録 → 投稿日順に slide-data.json v2 を執筆。
- 関連: 727枚の IG 画像再生成（日付削除・見出し修正）は develop に commit 53c19fba9 済み。内容改善後に再描画される。
