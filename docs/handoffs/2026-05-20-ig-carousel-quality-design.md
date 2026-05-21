# 設計＆引き継ぎ: Instagram カルーセル品質パイプライン

最終更新: 2026-05-20 / develop（feature ブランチは develop/main へ統合・削除済み）

## ゴール

Instagram カルーセル（727本）の中身（`slide-data.json`）を、一括機械生成の低品質状態から、agent が1本ずつ丁寧に執筆した状態へ引き上げる。YouTube Shorts キャンペーンと同じ「編集可能 SSOT → agent 執筆 → 機械ゲート → Evaluator → 一括画像化」方式。加えて SVG 図版の活用と doboku-note との相互品質改善を組み込む。

## 確定した方針（2026-05-20 ユーザー判断）

- **SVG**: 「再利用＋新規スペック→別工程描画」。writer は既存 SVG を活用し、図が要る箇所は仕様を記述するのみ。SVG の実制作は別エージェント/スキルが design-system 準拠で行う。良い図は doboku-note へ寄贈。
- **進め方**: 設計を docs 化（本書）→ Phase 0 実装に着手。YouTube と並行。

## 作業環境

- 2026-05-20 に feature ブランチ `feature/ig-carousel-quality` と worktree `C:/tmp/doboku-note-ig` は develop / main へ統合し削除済み。**作業は develop（`C:/Users/m004195/doboku-note`）で直接行う**。
- 他セッションと並行する場合のみ worktree を再作成する（`node_modules` は main からジャンクション）。

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

## Phase 1 実行手順（キャンペーン）

YouTube Shorts キャンペーンと同方式。develop（`C:/Users/m004195/doboku-note`）で作業する。

1. 投稿日が近い分から **7本ずつバッチ**で進める。`ls docs/sns/instagram/` を投稿日順にスライスして対象を決める。
2. **Generator**: general-purpose agent（sonnet）を起動し、`.claude/agents/ig-carousel-writer.md` の指示に従わせる（`docs/reference/ig-carousel-policy.md` を必ず読ませる）。7本の `slide-data.json` を v2 で執筆させる。
3. **機械字数チェック**: 下記スクリプトで字数超過をゲートする。超過があれば Generator に差し戻す。
4. **Evaluator**: general-purpose agent（sonnet）を起動し、`.claude/agents/ig-carousel-qa.md` の指示に従わせて 5 軸採点。合格ライン = 平均 4.0 以上かつ全軸 3 以上。不合格は Generator に差し戻す。
5. バッチ全件合格で `git add docs/sns/instagram/{date-slug}/slide-data.json`（7本）→ commit。`_keyword-findings.md` に追記があれば同時に add。
6. 全 727 本完了後に Phase 2（一括 PNG 化）へ。

### 字数チェックスクリプト

```bash
node -e '
const fs=require("fs");
const dirs=[/* date-slug の配列 */];
const L={kw:14,bh:16,bb:120,bn:45,fh:18,fn:30};
let over=0;
for(const d of dirs){const j=JSON.parse(fs.readFileSync(`docs/sns/instagram/${d}/slide-data.json`,"utf8"));
 if((j.cover?.keyword||"").length>L.kw){over++;console.log(`OVER ${d} cover.keyword`);}
 (j.slides||[]).forEach((s,i)=>{
  if(s.type==="board"){
   if((s.heading||"").length>L.bh){over++;console.log(`OVER ${d} slides[${i}].heading`);}
   if((s.body||"").length>L.bb){over++;console.log(`OVER ${d} slides[${i}].body ${(s.body||"").length}`);}
   if((s.noteText||"").replace(/\\n/g,"").length>L.bn){over++;console.log(`OVER ${d} slides[${i}].noteText`);}
  }else if(s.type==="figure"){
   if((s.heading||"").length>L.fh){over++;console.log(`OVER ${d} slides[${i}].heading`);}
   if((s.note||"").length>L.fn){over++;console.log(`OVER ${d} slides[${i}].note`);}
  }});}
console.log(over===0?"字数OK":`${over}件超過`);'
```

### Phase 2（一括 PNG 化）

全 slide-data.json 確定後、`node .claude/skills/social/ig-post-create/scripts/ig-post-create.mjs --slug {slug} --date {date} --size both` を全件に流す（`--reset` は付けない＝確定済み slide-data.json を使う）。figure の SVG は自動で PNG 焼き込みされる。

## 現在の状況

- 設計確定・本書作成済み。
- **Phase 0 完了**（2026-05-20）。slide-data.json v2 スキーマを実装・動作確認済み:
  - `slide-data.json` v2 = `{cover, slides[], cta}`。`slides` は `type: "board"|"figure"` の可変配列（カルーセル合計 3〜10 枚）。
  - `notebook-slides.mjs`: キャプション帯（`buildCaptionArea`）を廃止しコンテンツ領域を全高化、`buildNotebookFigure` を追加。
  - `slide-render.mjs`: `notebook-figure` 型を登録。
  - `ig-post-create.mjs`: SLIDES を可変化、v1→v2 後方互換シム `normalizeSlideData`（既存 727 ファイルは無改修で描画可）、figure の `imagePath` を data URI 解決。SVG は resvg＋フォントで PNG に焼いてから埋め込む（Satori の `<img>` 内 SVG はフォント未解決でテキストが消えるため）。`parseArgs` の連続フラグ取りこぼしバグも修正。
  - `publish-ig.mjs`: caption 生成を v1/v2 両対応に。
  - 検証済み: 既存 v1 ファイルの後方互換描画、v2 multi-slide（cover+board+figure×2+cta=5枚）描画、figure の実 SVG 埋め込み（図中ラベル完全描画）・スペックプレースホルダ描画、`--config-only`。
- **Phase 1 基盤 完了**（commit 5c9b7c169・46a8aae0b）: `docs/reference/ig-carousel-policy.md`（5軸ルーブリック）・`ig-carousel-writer`/`ig-carousel-qa` エージェント・実行手順を整備。
- **Phase 1 キャンペーン進行中**: 2026-05-20〜 自動ループで cycle 1-10 完了し **IG 77/727 本完了**（投稿日順ソート位置 1-77）。
  - 機械可読の真実源: `.claude/state/sns/quality-campaign-progress.json`（`ig.totalDoneIndex`）。
  - commit: `revise(ig)` / `revise(sns)` バッチ群。
  - **残り: 650本**。再開は投稿日順ソート位置 78 から（`ls -d docs/sns/instagram/2*/ | sort | sed -n '78,84p'`）。
- 関連: 727枚の IG 画像再生成（日付削除・見出し修正）は commit 53c19fba9 済み。内容改善後に再描画される。
- 既知の課題: batch 1（commit e49ac3121）の7本は `cta.related` が slug 文字列。cycle 1 以降は表示用ラベル文字列に統一済み。batch 1 の7本も後でラベルへ変換要（レンダラは `▷ ${related}` で直接描画）。
