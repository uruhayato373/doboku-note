---
name: ig-reel-create
description: 過去問パックのカルーセル PNG をベースに 1080×1920 縦型 IG Reels mp4 を生成。Satori で reels サイズの PNG 10 枚再生成 → VOICEVOX TTS → ffmpeg 連結まで自動化。
allowed-tools: Bash, Read, Write
---

# Instagram Reels 自動生成スキル

`docs/sns/instagram/_exam-packs/<year>/pack-<NN>/slide-data.json` を入力に、**1080×1920 縦型 60-120 秒の IG Reels 動画を完全機械生成**する。

## 前提

1. **ffmpeg / ffprobe が PATH にある**
   ```bash
   ffmpeg -version
   ```
2. **VOICEVOX エンジンがローカル起動している**
   ```bash
   docker run --rm -p 50021:50021 voicevox/voicevox_engine:cpu-latest
   curl http://localhost:50021/version
   ```
3. **対象パックの slide-data.json が新スキーマ**（optionExplanations + pointText 必須）

## 使い方

```bash
node .claude/skills/social/ig-reel-create/scripts/ig-reel-create.mjs \
  --exam r07-pack-01
```

### 引数

| 引数 | 必須 | 既定 | 説明 |
|---|---|---|---|
| `--exam` | ✅ | - | パック ID（例: `r07-pack-01`） |
| `--speaker` | - | 1（四国めたん） | VOICEVOX speaker ID |
| `--skip-png` | - | false | PNG 再生成をスキップ（既存 reels/img/*.png を使う） |
| `--problem-pause` | - | 3 | problem スライド読み上げ後に挿入する無音秒数（考える間）。`0` で無効 |

## 出力

```
docs/sns/instagram/_exam-packs/<year>/pack-<NN>/reels/
├ video.mp4              最終動画（IG Reels として upload 可能）
├ img/{00..09}.png       1080×1920 各スライド PNG（中間ファイル）
├ wav/slide-NN.wav       各スライドの TTS 音声（中間ファイル）
└ script.txt             読み上げ台本（デバッグ用）
```

## 工程

1. VOICEVOX / ffmpeg の利用可能チェック
2. slide-data.json 読み込み（10 slides: cover/problem×4/answer×4/cta）
3. PNG 10 枚を `--size reels` で再生成（既存 ig-post-create.mjs 流用）
4. 各スライドの台本生成（cover/problem/answer/cta 型別）
5. VOICEVOX で WAV 10 個生成
6. ffmpeg で連結 → mp4

## 台本テンプレート

| スライド | 台本 |
|---|---|
| **cover** | 「{管理名}。{年度} 4 問パック。スワイプして挑戦しましょう」 |
| **problem** | 「問題{N}。{bodyLines}」 |
| **answer** | 「正答は{N}番。{correctText}。{pointText}」 |
| **cta** | 「保存して試験前日に見返しましょう。doboku-note で全問解説をチェック」 |

選択肢は読み上げない（時間制約のため、視聴者は画面で読む）。

## 時間目安

- cover: 約 6 秒
- problem: 約 12-15 秒（問題文の長さによる）
- answer: 約 10-12 秒（pointText の長さによる）
- cta: 約 6 秒
- **合計: 約 90-110 秒**（IG Reels の理想範囲 60-90 秒に近い）

## 関連スキル

- `ig-post-create`（カルーセル PNG 生成、本スキルが内部で利用）
- `yt-shorts-create`（YouTube Shorts、共通基盤 sns-common を共有）

## 担当外

- IG への自動投稿（手動アップロード前提。将来 `ig-reel-publish.mjs` で対応）
- BGM / 効果音（サイレント + TTS のみ）
- 字幕焼き込み（PNG にテキスト既存のため不要）
