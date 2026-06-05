---
name: yt-shorts-create
description: IG Reels パック (slide-NN.mp4) から 30-60 秒の YouTube Shorts mp4 + meta.json を派生生成する。戦略 v7 (Instagram 一次・YouTube 二次展開) に整合。
allowed-tools: Bash, Read, Write
---

# YouTube Shorts 派生スキル（v7）

`docs/sns/instagram/_exam-packs/{試験}/<year>/pack-NN/reels/` の **IG Reels mp4 から、1080×1920 縦型 30-60 秒の YouTube Shorts を派生生成**する。本スキルは mp4 出力 + meta.json までを担当（YouTube への upload は `media-uploader.mjs` で別途）。

**v7 で MDX 直結モード（旧 `--slug`）は廃止**。詳細は [`docs/project/03_SNS/01_SNS集客戦略.md`](../../../../docs/project/03_SNS/01_SNS集客戦略.md) v7、品質ルーブリックは [`docs/reference/yt-shorts-publisher-policy.md`](../../../../docs/reference/yt-shorts-publisher-policy.md)。

## 前提

1. **ffmpeg / ffprobe が PATH にある**
   ```bash
   # macOS
   brew install ffmpeg
   # Linux
   sudo apt install ffmpeg
   # Windows (winget)
   winget install Gyan.FFmpeg
   ffmpeg -version
   ```
2. **対象パックの Reels mp4 が既に生成済み**
   - `ig-reel-create` で生成: `docs/sns/instagram/_exam-packs/{試験}/<year>/pack-NN/reels/slide-NN.mp4`
   - 必要なファイル: `slide-00.mp4` (cover) / `slide-01.mp4` (problem 1) / `slide-02.mp4` (answer 1) / `slide-09.mp4` (cta)
3. **slide-data.json が存在**: `docs/sns/instagram/_exam-packs/{試験}/<year>/pack-NN/slide-data.json`

## 使い方

```bash
node .claude/skills/social/yt-shorts-create/scripts/yt-shorts-create.mjs \
  --from-reels r03-pack-01
```

### 引数

| 引数 | 必須 | 既定 | 説明 |
|---|---|---|---|
| `--from-reels` | ✅ | - | IG Reels パック ID（例: `r03-pack-01`） |
| `--out` | - | `docs/sns/youtube/<date>-<pack-id>/` | 出力ディレクトリ |

### 廃止された引数（v7）

| 引数 | 状態 | 移行 |
|---|---|---|
| `--slug` | **廃止（v7 で deprecated）** | IG Reels 一次制作（ig-reels-writer + ig-reel-create）→ `--from-reels <pack-id>` に移行 |
| `--date` | 廃止 | 出力 dir 自動生成（今日の日付） |
| `--category` | 廃止 | pe-comprehensive-management 固定 |
| `--speaker` | 廃止 | IG Reels mp4 の音声をそのまま流用 |

## 出力

```
docs/sns/youtube/<date>-<pack-id>/
├ shorts.mp4              最終動画（YouTube Shorts として upload 可能）
├ thumbnail.png           1080×1920 サムネ（cover をコピー）
└ meta.json               タイトル・概要欄（UTM 付き）・タグ・privacyStatus
```

## 派生ロジック（v7）

10 スライド構成（cover + problem×4 + answer×4 + cta）から **4 スライドを抜粋して concat**：

| YT スライド | IG Reels 由来 | 役割 |
|---|---|---|
| 1 | `slide-00.mp4` | cover（題材告知） |
| 2 | `slide-01.mp4` | problem 1（出題） |
| 3 | `slide-02.mp4` | answer 1（解答 + 解説） |
| 4 | `slide-09.mp4` | cta（サイト誘導） |

各スライドは IG Reels で既に **VOICEVOX TTS が乗った独立 mp4** なので、ffmpeg concat で結合するだけで音声付きの 30-60 秒 mp4 になる。

```
docs/sns/instagram/_exam-packs/{試験}/<year>/pack-NN/reels/
  slide-00.mp4 (cover)        ┐
  slide-01.mp4 (problem 1)    │ ffmpeg concat
  slide-02.mp4 (answer 1)     │ → shorts.mp4 (約 40-50 秒)
  slide-09.mp4 (cta)          ┘
  img/00-cover.png            → thumbnail.png (cover をそのまま使用)
slide-data.json + _meta       → meta.json (UTM = utm_source=youtube)
```

## 字幕（MVP では未対応）

v7 MVP では字幕焼き込み無し。IG Reels の slide-NN.mp4 に既に音声があるため字幕無しでも 30-60 秒視聴は成立する。

字幕焼き込みは Phase D2 で対応予定:
- IG Reels の `reels/subtitle.ass`（存在する場合）から該当 4 スライド分を抽出 → ffmpeg `-vf subtitles=` で焼き込み

## 検証

```bash
# 1. ffmpeg 起動確認
ffmpeg -version

# 2. 対象 IG Reels パックが生成済みか確認
ls docs/sns/instagram/_exam-packs/技術士総監/r03/pack-01/reels/slide-{00,01,02,09}.mp4

# 3. YT 派生実行
node .claude/skills/social/yt-shorts-create/scripts/yt-shorts-create.mjs --from-reels r03-pack-01

# 4. 出力確認
ls docs/sns/youtube/$(date +%Y-%m-%d)-r03-pack-01/
# 期待: shorts.mp4, thumbnail.png, meta.json

# 5. 動画再生確認
# Windows: start docs/sns/youtube/.../shorts.mp4
# macOS:   open docs/sns/youtube/.../shorts.mp4

# 6. 品質チェック（yt-shorts-publisher-qa エージェント呼出）
# 親エージェントから yt-shorts-publisher-qa --pack-id r03-pack-01 で 4 軸採点
```

## 投稿運用（2026-06-05 確定 / 真実源 policy §5-7）

- **必ずこの `shorts.mp4`（≤60 秒）をアップロードする**。IG Reels のフル `video.mp4`（≈145 秒）を直アップすると **YouTube が「通常動画」扱い**にし Shorts フィードに乗らない（実機確認）。
- **予約投稿**: `node .claude/scripts/youtube/upload.js <shorts.mp4> --title … --description … --tags … --schedule <ISO8601>`（または `post.js <dir>`）。`--schedule` で `private + publishAt` ＝指定時刻に自動公開。
- **カーデンス**: 1 日 3 本・JST 07:30 / 12:30 / 20:00（policy §5）。quota は約 6 本/日が上限。
- **タイトル**: **`yt-shorts-title-writer`（Generator）が論点タイトルを自動生成**して既定タイトルを上書き（policy §2）。親が featured 設問文を抽出して渡す（agent は Bash 不可）。`yt-shorts-publisher-qa` が規約適合を採点。
- **偽成功検証**: アップロード後 `videos.list(part=status)` で privacyStatus=private + publishAt + duration≤60s を実査（policy §7）。`upload.js` のログ「公開設定: unlisted」は表示バグで実値は private。

## 範囲外（後続タスク）

- **YouTube Data API upload** → `media-uploader.mjs`（PR #169、実投稿は T-003 Meta 認証準備の後）
- **スケジューラ統合** → task-queue T-004
- **字幕焼き込み** → Phase D2（IG Reels subtitle.ass からの派生実装）
- **動的な抜粋スライド選択** → 現状は cover + problem 1 + answer 1 + cta 固定。問題 2/3/4 のどれを抜粋するかは将来対応

## 関連

- 戦略: [`docs/project/03_SNS/01_SNS集客戦略.md`](../../../../docs/project/03_SNS/01_SNS集客戦略.md) v7
- 品質ルーブリック: [`docs/reference/yt-shorts-publisher-policy.md`](../../../../docs/reference/yt-shorts-publisher-policy.md)
- 上流: `ig-reel-create` スキル（IG Reels mp4 を生成）+ `ig-reels-writer` エージェント（script.json 執筆）
- 親タスク: task-queue T-005c（YT 派生スクリプト + Evaluator、v7 Phase D）

## 改訂履歴

- v2（2026-05-28）: 戦略 v7 化に伴い `--slug` 廃止 → `--from-reels` 一本化。IG Reels mp4 から ffmpeg concat で派生する設計に再構築。
- v1（2026-05-02）: 初版。MDX 直結で TTS + 字幕焼き込み（v6 まで）。
