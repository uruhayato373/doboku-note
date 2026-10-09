---
name: feedback_video_visual_check_before_audio
description: 動画は音声・mp4 を作る前に、無音プレビューと10秒ごとのコンタクトシートで画面を目視してユーザーに見せる
metadata:
  node_type: memory
  type: feedback
  originSessionId: 8e02001d-fa7b-42f8-a0e1-5c8ab3bfedbc
  modified: 2026-10-08T10:56:50.885Z
---

動画（通常動画・総まとめ・図解版）は、VOICEVOX の音声や mp4 を作る前に `render-longform --skip-tts` の PNG と字幕で無音プレビューを作り、10秒ごとのコンタクトシートを目視してユーザーに見せる。

**Why:** 2026-10-08、2級の総まとめを作るときにユーザーが「音声の前に画像から目視確認したら？」と指示した。実際にこの順で、公開・予約中の個別動画にも出ていた語の途中での改行（「リ/スク」「1,500m/3」）と字幕の行頭の句読点が見つかり、描画部品ごと直せた。音声を先に作っていたら作り直しになっていた。

**How to apply:** 手順と見る点は video-content-policy §4（Mac は Homebrew の ffmpeg に libass が無いので ffmpeg-full を使う）。見つけた画面の不具合が既存の公開動画にも出ているかは、Drive の video.mp4 から1コマ切り出して確かめてから報告する。関連: [[feedback_svg_arrow_marker]]
