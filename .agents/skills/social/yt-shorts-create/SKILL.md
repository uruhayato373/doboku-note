---
name: yt-shorts-create
description: IG Reels パック (slide-NN.mp4) から 30-60 秒の YouTube Shorts mp4 + meta.json を派生生成する。戦略 v7 (Instagram 一次・YouTube 二次展開) に整合。
allowed-tools: Bash, Read, Write
---

# YouTube Shorts 派生スキル（v7）

`docs/sns/instagram/{exam}/exam-packs/<year>/pack-NN/reels/` の **IG Reels mp4 から、1080×1920 縦型 30-60 秒の YouTube Shorts を派生生成**する。本スキルは mp4 + thumbnail.png + meta.json の生成まで担当。YouTube への投稿は `post-from-schedule.cjs`（台帳 CI 運用）が担う。

**v7 で MDX 直結モード（旧 `--slug`）は廃止**。詳細は [`docs/project/03_SNS/01_SNS集客戦略.md`](../../../../docs/project/03_SNS/01_SNS集客戦略.md) v7、品質ルーブリックは [`.Codex/knowledge/reference/yt-shorts-publisher-policy.md`](../../../../.Codex/knowledge/reference/yt-shorts-publisher-policy.md)。

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
2. **対象パックの Reels mp4 が生成済み**（`slide-NN.mp4` は gitignore・再生成可＝手元に無ければ先に `ig-reel-create` で生成すること。`ls` 確認が空でも異常ではない）
   - `ig-reel-create` で生成: `docs/sns/instagram/{exam}/exam-packs/<year>/pack-NN/reels/slide-NN.mp4`
   - 必要なファイル: `slide-00.mp4` (cover) / `slide-01.mp4` (problem 1) / `slide-02.mp4` (answer 1) / `slide-09.mp4` (cta)
3. **slide-data.json が存在**: `docs/sns/instagram/{exam}/exam-packs/<year>/pack-NN/slide-data.json`

## 使い方

```bash
node .Codex/skills/social/yt-shorts-create/scripts/yt-shorts-create.mjs \
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
docs/sns/instagram/{exam}/exam-packs/<year>/pack-NN/reels/
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

## カバー同期ガード（2026-06-05 新設）

`--from-reels` は派生前に **`assertCoverInSync`** を実行する。reel の `slide-00.mp4`（動画1枚目）の先頭フレームと最新 `img/00-cover.png` を **SSIM で内容比較**し、**0.90 未満なら例外を投げて派生を中断**する。

- **背景**: カバーPNG/テンプレだけ刷新して reel 動画を再生成しないと「サムネ＝新・動画1枚目＝旧」の desync が起きる（2026-06-02 cover刷新で `video.mp4` 1枚目が旧カバーのまま残った事故、2026-06-05 検出）。
- **検知時の復旧**: `node .Codex/skills/social/ig-reel-create/scripts/ig-reel-create.mjs --exam-dir <試験> --exam <pack-id>` で reel を再生成してから派生する。
- **不変条件**: **カバーPNGだけを更新する運用は禁止**。テンプレ刷新時は必ず ig-reel-create で動画も同時再生成する。
- ffmpeg 不在・SSIM 非搭載・フレーム抽出失敗時は安全側でスキップ（誤検知で正規生成を止めない）。

## 全問展開モード（`per-problem-shorts.mjs`・2026-06-06 新設）

`--from-reels`（1 パック＝1 本・先頭問のみ）に対し、**1 パックの 4 問すべてを個別ショート化**（1 パック＝4 本）するモード。年度の全問を Shorts 化する量産用。

```bash
# 全パック一括（タイトルは yt-shorts-title-writer 出力の JSON を渡す）
node .Codex/skills/social/yt-shorts-create/scripts/per-problem-shorts.mjs \
  --exam-dir 技術士総監 --titles .tmp/yt-gen/titles.json
# 年度/パック限定
node .../per-problem-shorts.mjs --exam-dir 技術士総監 --pack r07-pack-02
```

### IG「1問1リール」出力（`--ig-mode` / `--questions`・2026-06-09 追加）

同じエンジンで **IG リール（1問1本・36-45秒）** も生成できる。出力先と包装だけが YT と異なる。

```bash
node .../per-problem-shorts.mjs --ig-mode --year r07 --pack r07-pack-01 [--questions 1,2]
# → docs/sns/instagram/cem/exam-packs/<軸>/<year>/pack-<NN>/reels-pp/q<N>/{video.mp4, caption.txt}
```

| | YT（既定） | IG（`--ig-mode`） |
|---|---|---|
| 出力 | `docs/sns/youtube/<date>-…/` | `<pack>/reels-pp/q<N>/`（自己完結） |
| メタ | `meta.json`＋`thumbnail.png` | `caption.txt`（論点＋管理ハッシュタグ） |
| 尺ガード | ≤60秒（厳格） | ≤90秒 |
| 公開 | YT API | `publish-ig-bs --reel <q-dir>`（無改修）/ JIT は `scripts/publish-reel-jit.mjs` |

`--questions 1,2` で問番を限定（既定=全4問）。詳細・運用は [ig-reels-policy.md §6](../../../../.Codex/knowledge/reference/ig-reels-policy.md)。

### YT 専用描画（`ytMode`）— IG 流用をやめた理由

IG 用 PNG には **「N / 10」ページ番号・「PROBLEM 1 / 4」通し番号・「まずは1問やってみる →」/「次ページで解答 →」スワイプ前提 CTA** が焼かれており、**単発 1 問動画の YT に流用すると不整合**（4 スライドなのに「N/10」、1 問なのに「1/4」、スワイプできないのに誘導）。2026-06-06 に判明。

→ YT は IG mp4 を流用せず、**`ytMode` で slide PNG を再描画**する（`quiz-slides.mjs` problem/answer/cta ＋ `exam-cover-ig.mjs` cover に実装）。`ytMode` は IG チャームを抑止する。

| スライド | YT 描画（ytMode） | 音声 |
|---|---|---|
| cover | ページ番号・スワイプ CTA を出さず **「この動画の論点 / 〇〇」** を表示 | 年度共通の汎用ナレ（VOICEVOX・年度ごと1回キャッシュ） |
| problem | eyebrow「PROBLEM」のみ（`1/4` なし）・ページ番号なし | **YT専用の短いナレ**「問題。テーマは〇〇。最も適切なものを選んでみましょう」＋3秒読み取りポーズ |
| answer | eyebrow「ANSWER」のみ・ページ番号なし | reel の解答 wav を再利用（簡潔なので可） |
| cta | ページ番号なし（フォロー導線は維持） | reel の cta wav を再利用 |

- **問題ナレーションは reel 流用不可**: reel は設問全文（数式・表含む）を読み上げ、長文設問で最大157秒になる。YT は設問本文を PNG に表示し、音声は「テーマ＋出題形式」のみ（約8秒）にして ≤60 秒に収める。事前生成スクリプトで全問の wav をキャッシュ（VOICEVOX を長時間ループから分離＝クラッシュ耐性）。
- **60秒ガード**: concat 後に >60 秒なら `capDuration` で ≤57 秒へ等速圧縮（atempo=音声ピッチ保持・setpts=映像）。
- **不変条件**: YT 画像・問題音声は IG と別系統。**IG の slide-NN.mp4 / img PNG / 問題 wav を YT にそのまま使わない**。
- 出力 dir: `docs/sns/youtube/<date>-<year>-pack-<NN>-q<N>/`。タイトルは `--titles` JSON（`{"<year>-pack-<NN>-q<N>": "<full title>"}`）を採用、無ければ `answer.correctText` から機械フォールバック。
- 要 VOICEVOX（汎用カバー＋問題ナレーション合成。いずれも事前キャッシュ可で本体ループは非依存）。

## 検証

```bash
# 1. ffmpeg 起動確認
ffmpeg -version

# 2. 対象 IG Reels パックが生成済みか確認
ls docs/sns/instagram/cem/exam-packs/r03/pack-01/reels/slide-{00,01,02,09}.mp4

# 3. YT 派生実行
node .Codex/skills/social/yt-shorts-create/scripts/yt-shorts-create.mjs --from-reels r03-pack-01

# 4. 出力確認
ls docs/sns/youtube/$(date +%Y-%m-%d)-r03-pack-01/
# 期待: shorts.mp4, thumbnail.png, meta.json

# 5. 動画再生確認
# Windows: start docs/sns/youtube/.../shorts.mp4
# macOS:   open docs/sns/youtube/.../shorts.mp4

# 6. 品質チェック（yt-shorts-publisher-qa エージェント呼出）
# 親エージェントから yt-shorts-publisher-qa --pack-id r03-pack-01 で 4 軸採点
```

## 投稿運用（2026-06-08 更新 / 真実源 policy §5-7）

- **必ずこの `shorts.mp4`（≤60 秒）をアップロードする**。IG Reels のフル `video.mp4`（≈145 秒）を直アップすると **YouTube が「通常動画」扱い**にし Shorts フィードに乗らない（実機確認）。
- **予約投稿フロー（台帳 CI 運用）**:
  1. `upload-shorts-to-r2.mjs` で `shorts.mp4` + `thumbnail.png` を Cloudflare R2 へアップ
  2. `youtube-schedule.json`（台帳）に `r2Key` / `publishAt` / `status=pending` エントリを追加
  3. GitHub Actions の日次 cron（`post-youtube-scheduled.yml`、UTC 19:00 = JST 04:00）が `post-from-schedule.cjs` を実行して自動投稿 + `thumbnails.set`
- **カーデンス**: 1 日 3 本・JST 07:30 / 12:30 / 20:00（policy §5）。quota は約 6 本/日が上限。leadDays=4 で 4 日先まで先行アップ。
- **重複防止**: 台帳追加前に `validate-schedule.mjs` で publishAt 重複・perDay 超過・videoId 重複を検証する。CI の pre-check にも組み込まれている。
- **タイトル**: **`yt-shorts-title-writer`（Generator）が論点タイトルを自動生成**して既定タイトルを上書き（policy §2）。親が featured 設問文を抽出して渡す（agent は Bash 不可）。`yt-shorts-publisher-qa` が規約適合を採点。
- **偽成功検証**: アップロード後 `videos.list(part=status)` で privacyStatus=private + publishAt + duration≤60s を実査（policy §7）。CI ログ「公開設定: unlisted」は表示バグで実値は private。

## 範囲外（後続タスク）

- **字幕焼き込み** → Phase D2（IG Reels subtitle.ass からの派生実装）
- **動的な抜粋スライド選択** → 現状は cover + problem 1 + answer 1 + cta 固定。問題 2/3/4 のどれを抜粋するかは将来対応

## 関連

- 戦略: [`docs/project/03_SNS/01_SNS集客戦略.md`](../../../../docs/project/03_SNS/01_SNS集客戦略.md) v7
- 品質ルーブリック: [`.Codex/knowledge/reference/yt-shorts-publisher-policy.md`](../../../../.Codex/knowledge/reference/yt-shorts-publisher-policy.md)
- 上流: `ig-reel-create` スキル（IG Reels mp4 を生成）+ `ig-reels-writer` エージェント（script.json 執筆）
- 親タスク: YT 派生スクリプト + Evaluator（v7 Phase D。.Codex/todo/ で追跡）

## 改訂履歴

- v4（2026-06-08）: 投稿運用を `upload.js`/`post.js` → 台帳 CI 運用（`upload-shorts-to-r2.mjs` + `post-from-schedule.cjs` + `post-youtube-scheduled.yml`）に更新。重複防止（`validate-schedule.mjs`）・サムネイル設定（`thumbnails.set`）・関連スクリプト（`generate-thumbnails.mjs`, `set-thumbnail-uploaded.mjs`）を追加。`media-uploader.mjs` 言及を削除。
- v3（2026-06-06）: `per-problem-shorts.mjs`（1パック4問の全問展開）新設。YT 専用描画 `ytMode`（`quiz-slides.mjs` / `exam-cover-ig.mjs`）で IG 固有チャーム（N/10・PROBLEM 1/4・スワイプ CTA）を抑止し、IG mp4 流用をやめて TTS wav 再利用で再合成する設計に。カバーは年度共通汎用ナレ＋問別論点表示。
- v2（2026-05-28）: 戦略 v7 化に伴い `--slug` 廃止 → `--from-reels` 一本化。IG Reels mp4 から ffmpeg concat で派生する設計に再構築。
- v1（2026-05-02）: 初版。MDX 直結で TTS + 字幕焼き込み（v6 まで）。
