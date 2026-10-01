---
name: reference_youtube_schedule
description: "YouTube予約投稿は実装+認証済。upload.js --schedule で private+publishAt。ログ「unlisted」は表示バグ→videos.listで実査"
metadata:
  type: reference
---
YouTube Data API 予約投稿はこの事業に**実装済み・認証済み**。

- 認証: `.env.local` に `YOUTUBE_CLIENT_ID/SECRET/REFRESH_TOKEN` 3点設定済（scope `youtube.upload`、再認証不要）。`oauth-setup.js` で再取得。client は `…d7j.apps.googleusercontent.com`、GCP project `doboku-note-492906`。
- **OAuth 公開ステータス = 本番環境（In production）を Console で実査確認（2026-06-05）**。→ refresh token は「テスト中アプリの7日失効」対象外＝**期限切れしない**。よって GitHub Secrets に載せれば無人 CI 予約投稿が安全に成立する（残作業は secrets 登録 + mp4 置き場のみ）。公開ステータスは API では読めず Console `https://console.cloud.google.com/auth/audience?project=doboku-note-492906` の「対象(Audience)」で目視。
- 予約: `node .claude/scripts/youtube/upload.js <mp4> --title --description --tags --schedule <ISO8601>`（任意mp4可）。または dir 方式 `post.js <dir>`（meta.json 駆動）。
- 仕組み: `--schedule` で `privacyStatus: private` + `publishAt` を設定 → 指定時刻に自動公開（YouTube native 予約）。

**落とし穴（2026-06-05 実証）**:
- `upload.js` のログ「公開設定: unlisted」は**表示バグ**（`opts.privacy` 既定値を出力するだけ）。`--schedule` 指定時は実際には private+publishAt が設定される。**ログを信用せず `videos.list(part=status)` で privacyStatus=private かつ publishAt 存在を実査**する（X の偽成功検証と同じ思想 → [[feedback_publish_x_false_success]]）。検証例: `.tmp/yt-verify.js`。
- **unlisted だと publishAt は発火しない**（自動公開は private のみ）。予約成立の条件は private+publishAt。
- **quota**: `videos.insert` ≈ 1600 units、日次割当 10,000 → **約6本/日が上限**。大量投稿は「6本/日×数日」。X の Playwright 予約（quota無し）との決定的違い。

**yt-shorts-create の量産ゴッチャ（2026-06-05 実証）**: `--from-reels` の固定4枚連結（cover+問題1+解答1+cta）は **≤60s を保証しない**。解説スライドが長いパックは60〜90s に膨らみ、YouTube で通常動画化する。総監26本一括生成では 5本（r03-08=81s/r04-06=90s/r05-01=88s/r07-04=83s/r07-06=66s）が60s超だった。**生成後は必ず `ffprobe -show_entries format=duration` で全本実査**し、60s超は**同一パック内の短い設問ペアに差し替えて再連結**で収める（`ffmpeg -f concat -safe 0 -i concat.txt -c copy` ＝再エンコード無し・画質劣化なし。slide-00/問N/答N/slide-09 の問Nを slide-03/05/07 等に変更）。総監26本量産時は5本を問4/4/3/2/3に差替えて全本≤60sに。meta.json の durationSeconds と featuredProblemSlide/Index も更新する。加えて既定タイトルは「令和X年度 択一式 過去問（管理名）」の汎用どまりで、論点タイトルは `yt-shorts-title-writer` で別途上書きが必要（policy §2）。一部 slide-data の category が「（information）」等の崩れデータを持つ個体あり（r03-08）。

**IG Reels 流用と尺の注意（2026-06-05 実証で訂正）**: YT Shorts として扱わせるには **縦9:16 ＋ ≤60秒 ＋ #Shorts** が必要。IG Reels の**フル mp4（pack 全4問＝145秒）をそのまま上げると「通常動画」扱い**になる（縦動画が横長プレーヤーでピラーボックス＋Shortsフィードに乗らず低リーチ）。YouTube 名目上の Shorts上限3分は **API アップロードの>60秒では当てにならない**（実機で145秒→通常動画を確認）。→ **`yt-shorts-create --from-reels` が cover+1問+1答+cta の ≤60秒 Short を生成するのが正**（戦略doc v7「30-60秒に短縮」は**正しい**。前メモの『古い』は誤りで撤回）。直アップロードで `video.mp4`(フル) を流用するのは不可。YouTube側で別途要るのは概要欄(title/description/tags + `utm_source=youtube`)。CTA焼き込みは「doboku-noteで全問解説/フォロー」等の中立表現なら流用可。**初パイロット 7XfOEi-XQ0E は145秒＝通常動画扱いのため要差し替え**。
