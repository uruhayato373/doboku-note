# 2026-05-28 SNS 戦略 v7 — Instagram メイン化 + エージェント分業 + Stories 刷新

> 1 セッションで SNS 戦略を v6 → v7/v7.1 にピボットし、Instagram を一次制作・
> YouTube を派生に再定義。新規エージェント 7 つ・ハイライト 6 種・title auto-fit
> までを実装した。試験まで 5-6 週で IG 運用基盤が整った状態を引き継ぐ。

## セッション開始時の状態

- 戦略 v6: 「YT Shorts mp4 を IG Reels に流用」と明文化（しかし実装は逆方向）
- IG カルーセル/Reels は過去問パック 42 パック完成済み（2026-05-27 ハンドオフ）
- Reels の cover に「スワイプで4問にチャレンジ」（カルーセル流用の不整合 CTA）が残存
- IG ハイライト未整備、エージェントはカルーセルのみ（ig-carousel-writer/qa）

## セッション終了時の状態

### 1. 戦略 v7 / v7.1（`docs/project/03_SNS/01_SNS集客戦略.md`）

| 変更 | 内容 |
|---|---|
| **v7: IG 一次・YT 派生** | 「YT mp4 → IG Reels 流用」を逆転。Instagram を一次制作、YouTube Shorts は IG Reels mp4 の二次展開（30-60 秒トリム + 字幕 + 概要欄差替）に再定義 |
| **YT MDX 直結廃止** | `yt-shorts-create --slug` を廃止 → `--from-reels <pack-id>` 一本化 |
| **v7.1: ハイライト 6 種** | 固定 5 種 → 6 種（「教材」追加、note 二段ロケット動線） |

`docs/project/03_SNS/02_チャネル動線設計.md` も v2 に同期。

### 2. 新規エージェント 7 つ（Generator/Evaluator 分離）

| エージェント | 種別 | 対象 |
|---|---|---|
| `ig-reels-writer` | Generator | Reels `script.json` 台本・キャプション・ハッシュタグ |
| `ig-reels-qa` | Evaluator | Reels 5 軸（尺・読み上げ・タグ・音声画面整合・保存導線）|
| `ig-stories-writer` | Generator | 過去問 4 枚連投 Stories の caption.txt / note.md |
| `ig-stories-qa` | Evaluator | Stories 3 軸（コピー力・リンク導線・ステッカー双方向性）|
| `yt-shorts-publisher-qa` | Evaluator | YT 派生 mp4 4 軸（尺・UTM・タイトル・字幕）|
| `ig-highlight-designer` | Generator | ハイライト slide-data.json（モダンシック意匠）|
| `ig-highlight-qa` | Evaluator | ハイライト 4 軸（サムネ識別性・コピー力・ジャンル一貫性・余白配分）|

policy: `ig-reels-policy.md` / `ig-stories-policy.md` / `yt-shorts-publisher-policy.md` / `ig-highlight-design-policy.md`

### 3. IG ハイライト 6 種 × 32 PNG（`docs/sns/instagram/highlights/`）

```
highlights/
├ 01_intro/          まず読む (5枚, blue)
├ 02_carousel-index/ カルーセル目次 (7枚, green)
├ 03_reels-roundup/  Reels まとめ (5枚, purple)
├ 04_faq/            FAQ (6枚, amber)
├ 05_announcement/   お知らせ (3枚テンプレ, rose)
└ 06_materials/      教材 (6枚, slate, note 二段ロケット)
```

各ディレクトリに `slide-data.json` + `img/*.png` + `note.md`（投稿手順・リンクスタンプ着地点・UTM）。
NN_ 数値プレフィックスは戦略 v7.1 §2 の投稿順に対応。

### 4. Reels CTA モード分岐（過去問パック）

`tokens.json` の `swipeText`（Carousel）/ `swipeTextReels`（Reels「答えは動画内で発表」）/ `swipeTextStories`（Stories「まずは1問やってみる」）を 3 分岐。`quiz-slides.mjs` の `buildQuizCover` が `data.mode` + `height` で自動選択。全 42 パックの Reels/Stories cover を再生成済み。

### 5. title auto-fit（不適切改行の構造的解消）

| ファイル | 役割 |
|---|---|
| `fit-title.mjs`（新規） | `visualLength`（全角=1.0/半角=0.55）+ `pickTitleSize`（3 階層）+ `classifyTitle` |
| `tokens.json` | hero/heroMid/heroSm（132/100/80）+ coverTitle/Mid/Sm（120/90/72）、各 `_maxLen` |
| `highlight-stories-slides.mjs` / `quiz-slides.mjs` | title visualLength で 3 階層自動選択 |
| `lint-stories-titles.mjs`（新規） | 4 段階判定（OK<=7/WARN 8-11/NOTICE 12-16/ERROR 17+）|

「文字数制限による意味希薄化」と「フォント縮小による視覚崩壊」を段階フォントで吸収。Evaluator は lint 出力を Read して採点に引用。

## 重要な設計判断

1. **過去問パックとハイライトの意匠分離**: ハイライトはモダンシック（ジャンル別カラー）、過去問パックは白背景。文脈が独立のため統一しない（戦略 v7.1 §2）
2. **二段ロケット動線**: 06_materials のみ note 着地、他 5 種はサイト着地。直接 note 有料リンク禁止
3. **YT 単一障害点リスク**: `--from-reels` 一本化により IG 障害時は YT も停止。フォールバックは IG カルーセル単独運用（戦略 §8）
4. **auto-fit でエージェント分業を維持**: Generator は推奨字数遵守、Evaluator は機械 lint 結果を引用（自己判定バイアス排除）

## 残作業・次のアクション

| タスク | 状態 |
|---|---|
| Meta API 認証準備（T-003）| 未着手 |
| GitHub Actions cron 統合（T-004）| 未着手 |
| **Phase D2: yt-shorts-create の ffmpeg E2E 検証 + 字幕焼き込み** | 未検証（ローカル ffmpeg 未インストール）|
| ハイライト実投稿（7 月中旬予定）| カルーセル 4-5 本投稿後 |
| カルーセル目次/Reels まとめの実リンクスタンプ URL 貼り替え | 実投稿後 |

## 既知の未検証部分

- `yt-shorts-create --from-reels` の ffmpeg concat 動作（ローカル ffmpeg 不在）。`--slug` deprecation エラーとモジュールロードは確認済み
- auto-fit の視覚字幅係数（全角=1.0/半角=0.55）は実測ベースの目安。乖離があれば tokens.json で調整

## 関連コミット（このセッション、develop）

- `b896a2a77` 戦略 v7 docs
- `11e2749a6` Phase B: Reels エージェント + CTA 分岐
- `d03c4e538` Phase C: Stories エージェント
- `d143b3b5e` Phase D: YT --from-reels 一本化
- `72ee392cd` Phase E: task-queue 整理
- `614a0c453` 41 パック Reels cover 再生成
- `4e749441f` Stories cover 独立生成
- `dae3251f9` Stories インシデント再発防止 4 件
- `c516964ac` v7.1 ハイライト 6 種 + 教材
- `29ca21650` 教材ハイライト 6 PNG
- `80151c6cd` ハイライト 5 種 PNG
- `e2637b722` highlights/ 集約
- `b0ae154bc` NN_ プレフィックス
- `dd500fd95` 01_intro 内容充実化
- `0401cb42a` Stories モダンシック意匠
- `4144044b6` ig-highlight-designer/qa
- `b7f4267d0` 6 ハイライト note.md
- `974b4c511` title auto-fit

## 真実源リファレンス

- 戦略: `docs/project/03_SNS/01_SNS集客戦略.md` v7.1
- ハイライト意匠: `docs/reference/ig-highlight-design-policy.md`
- Reels: `docs/reference/ig-reels-policy.md`
- Stories: `docs/reference/ig-stories-policy.md`
- YT 派生: `docs/reference/yt-shorts-publisher-policy.md`
- エージェント一覧: `docs/reference/agents-registry.md`
- デザイントークン: `docs/design-system/instagram-carousel-tokens.json`
