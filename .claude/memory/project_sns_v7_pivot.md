---
name: project_sns_v7_pivot
description: SNS 戦略 v7/v7.1 — Instagram メイン化・YouTube 派生・新規エージェント 7 つ・ハイライト 6 種
metadata: 
  node_type: memory
  type: project
  originSessionId: 5fec0808-9f01-44eb-b55a-39b94a725764
---

doboku-note の SNS 戦略を 2026-05-28 に v6 → v7/v7.1 へ大規模ピボット。

## v7 のコア変更（Instagram 一次・YouTube 派生）

- **戦略と実装の乖離を解消**: v6 は「YT Shorts mp4 を IG Reels に流用」と明文化していたが、実装は逆（IG カルーセル PNG → Reels mp4）。実装に合わせて戦略を逆転
- **Instagram = 一次制作**（slide-data.json → カルーセル PNG → Reels mp4）
- **YouTube Shorts = IG Reels mp4 の二次展開**（30-60 秒トリム + 概要欄差替）
- `yt-shorts-create` は `--slug`（MDX 直結）廃止 → `--from-reels <pack-id>` 一本化

## v7.1（ハイライト 6 種）

- IG ハイライト固定 5 種 → **6 種**（「教材」追加）
- **二段ロケット動線**: 06_materials のみ note 着地（プロフィール → 無料記事 → 有料マガジン）、他 5 種はサイト着地。直接 note 有料リンク禁止
- `docs/sns/instagram/highlights/{01_intro..06_materials}/` に slide-data.json + img + note.md。NN_ プレフィックスは投稿順

## 新規エージェント 7 つ（すべて Generator/Evaluator 分離・sonnet）

| Generator | Evaluator | 対象 |
|---|---|---|
| ig-reels-writer | ig-reels-qa | Reels 台本・キャプション |
| ig-stories-writer | ig-stories-qa | 過去問 4 枚連投 Stories |
| ig-highlight-designer | ig-highlight-qa | ハイライト Stories（モダンシック）|
| —（既存スキル）| yt-shorts-publisher-qa | YT 派生 mp4 |

## 意匠の使い分け（重要）

- **過去問パック**（quiz-slides.mjs）: 白背景・1080×1350/1920、情報密度重視
- **ハイライト**（highlight-stories-slides.mjs）: モダンシック、ジャンル別カラー 6 種（blue/green/purple/amber/rose/slate）、サムネ識別性重視
- 文脈が独立のため統一しない（過去問は教材、ハイライトはジャンル別エントリーポイント）

## 残作業

- Meta API 認証（T-003）・GitHub Actions cron（T-004）未着手
- **Phase D2**: yt-shorts-create の ffmpeg E2E + 字幕焼き込み未検証（ローカル ffmpeg 不在）
- ハイライト実投稿は 7 月中旬（カルーセル 4-5 本投稿後）

## How to apply

SNS 作業再開時は `docs/handoffs/2026-05-28-sns-v7-instagram-pivot.md` を先に読む。真実源は `docs/project/03_SNS/01_SNS集客戦略.md` v7.1 と各 policy（ig-highlight-design-policy / ig-reels-policy / ig-stories-policy / yt-shorts-publisher-policy）。

## 関連メモリ

- [[project_ig_carousel_quality_campaign]]（過去問パック整備、v7 の前提）
- [[feedback_title_autofit]]（title 不適切改行の auto-fit 対策）
- [[project_obsidian_sync_routines]]
