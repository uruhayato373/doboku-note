---
name: yt-shorts-create
description: 技術士総監キーワードの YouTube Shorts 自動生成。MDX → Satori スライド + VOICEVOX TTS → ffmpeg 字幕焼き込み → mp4 までをローカルで完結する。
allowed-tools: Bash, Read, Write
---

# YouTube Shorts 自動生成スキル

`.local/r2/posts/pe-comprehensive-management/{slug}/article.mdx` を入力に、**1080×1920 縦型 30-60 秒の YouTube Shorts を完全機械生成**する。本スキルは mp4 出力までを担当（YouTube への upload は `media-uploader.mjs` で別途）。

## 前提

1. **ffmpeg / ffprobe が PATH にある**
   ```bash
   brew install ffmpeg          # macOS
   ffmpeg -version              # 確認
   ```
2. **VOICEVOX エンジンがローカル起動している**
   ```bash
   docker run --rm -p 50021:50021 voicevox/voicevox_engine:cpu-latest
   curl http://localhost:50021/version
   ```
3. **共通基盤** `.claude/scripts/lib/sns-common/` が存在する（PR #169 で整備、merge 待ち）

## 使い方

```bash
node .claude/skills/social/yt-shorts-create/scripts/yt-shorts-create.mjs \
  --slug followership --date 2026-05-02
```

### 引数

| 引数 | 必須 | 既定 | 説明 |
|---|---|---|---|
| `--slug` | ✅ | - | キーワード slug（例: `followership`、`mbo`）|
| `--date` | ✅ | - | 出力日（YYYY-MM-DD）。`.tmp/sns/{date}/` に出力 |
| `--category` | - | `pe-comprehensive-management` | コンテンツカテゴリ |
| `--speaker` | - | env or 1 | VOICEVOX speaker ID（1 = 四国めたん）|
| `--out` | - | `.tmp/sns/{date}/{slug}-shorts/` | 出力ディレクトリ |

## 出力

```
.tmp/sns/{date}/{slug}-shorts/
├ shorts.mp4              最終動画（YouTube Shorts として upload 可能）
├ thumbnail.png           1280×720 サムネイル
├ meta.json               YouTube タイトル・概要欄・ハッシュタグ・privacyStatus
├ slide-NN.png            各スライド画像（中間ファイル）
├ slide-NN.wav            各スライド TTS 音声
├ slide-NN.mp4            各スライド個別動画（中間ファイル、デバッグ用）
├ subtitle.ass            字幕ファイル
├ concat.txt              ffmpeg concat list
└ _combined.mp4           字幕焼き込み前
```

## スライド構成（5 枚・30-60 秒）

| # | 型 | 内容 | 想定尺 |
|---|---|---|---|
| 1 | `cover` | タイトル + 「技術士総監」ラベル | 3-5 秒 |
| 2 | `definition` | 「〜とは」短い定義（80 字以内）| 8-12 秒 |
| 3 | `examPoint` | 試験ポイント 1 | 8-12 秒 |
| 4 | `examPoint` | 試験ポイント 2 | 8-12 秒 |
| 5 | `cta` | doboku-note 誘導 | 4-6 秒 |

## アーキテクチャ

```
MDX article.mdx
  ↓ #lib/sns-common/mdx-extract.mjs
{ title, description, definition, examPoints, ... }
  ↓ lib/build-storyboard.mjs
[ cover, def, ep1, ep2, cta ] (5 slides)
  ↓ lib/build-script.mjs
[ "ナレーション 1", ... "ナレーション 5" ]
  ↓ #lib/sns-common/slide-render.mjs（Satori + @resvg）
[ slide-00.png ... slide-04.png ]
  ↓ #lib/sns-common/tts-client.mjs（VOICEVOX HTTP）
[ slide-00.wav ... slide-04.wav ]
  ↓ ffprobe → lib/build-subtitle.mjs
subtitle.ass
  ↓ lib/ffmpeg-compose.mjs（ffmpeg）
shorts.mp4 + thumbnail.png + meta.json
```

## 字幕方式

- `lib/build-subtitle.mjs` が **TTS 出力 wav の duration を計測 → スライド単位で .ass 字幕を生成**
- whisper.cpp は使わない（word-level 同期は不要、スライド単位で十分）
- スタイル: Noto Sans JP Bold 48px、白文字 + 黒縁取り 4px、下部中央
- 詳細: `docs/project/07_YouTube戦略_技術士総監.md` v4 §字幕

## 検証

```bash
# 1. ffmpeg 起動確認
ffmpeg -version

# 2. VOICEVOX 起動
docker run --rm -p 50021:50021 voicevox/voicevox_engine:cpu-latest &

# 3. サンプル生成（フォロワーシップ）
node .claude/skills/social/yt-shorts-create/scripts/yt-shorts-create.mjs \
  --slug followership --date 2026-05-02

# 4. 出力確認
ls .tmp/sns/2026-05-02/followership-shorts/
# 期待: shorts.mp4, thumbnail.png, meta.json, slide-00..04.png/.wav/.mp4, subtitle.ass

# 5. 動画再生確認
open .tmp/sns/2026-05-02/followership-shorts/shorts.mp4
```

## 範囲外（後続タスクで対応）

- **YouTube Data API へのアップロード** → `media-uploader.mjs` で実装済み（PR #169。実投稿は task-queue T-003 Meta 認証準備の後）
- スケジューラ統合（cron）→ task-queue T-004「SNS スケジューラ統合」
- Instagram Reels への mp4 流用 → task-queue T-005「SNS 型・チャネル拡充」
- whisper.cpp による word-level 字幕 → 視聴完了率データを見てから判断

## 関連

- 戦略: `docs/project/07_YouTube戦略_技術士総監.md` (v4)
- 親タスク: task-queue T-001「SNS 自動投稿基盤（YouTube × Instagram）」
- 共通基盤: `.claude/scripts/lib/sns-common/`
