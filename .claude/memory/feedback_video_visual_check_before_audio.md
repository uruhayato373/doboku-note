---
name: feedback_video_visual_check_before_audio
description: 動画は全場面シートで表紙と本文を確認し、10秒ごとのシートで画面遷移を確認する
metadata:
  node_type: memory
  type: feedback
  originSessionId: 8e02001d-fa7b-42f8-a0e1-5c8ab3bfedbc
  modified: 2026-10-26T11:52:48.000Z
---

動画（通常動画・総まとめ・図解版）は、VOICEVOX の音声や mp4 を作る前に `render-longform --skip-tts` の PNG と字幕で無音プレビューを作り、`video-scene-sheet.mjs` の全場面シートと10秒ごとのコンタクトシートをユーザーに見せる。前者は意匠、後者は画面遷移を見る。

**Why:** 2026-10-08、2級の総まとめを作るときにユーザーが「音声の前に画像から目視確認したら？」と指示した。実際にこの順で、公開・予約中の個別動画にも出ていた語の途中での改行（「リ/スク」「1,500m/3」）と字幕の行頭の句読点が見つかり、描画部品ごと直せた。音声を先に作っていたら作り直しになっていた。

**How to apply:** 手順と見る点は video-content-policy §4（Mac は Homebrew の ffmpeg に libass が無いので ffmpeg-full を使う）。見つけた画面の不具合が既存の公開動画にも出ているかは、Drive の video.mp4 から1コマ切り出して確かめてから報告する。関連: [[feedback_svg_arrow_marker]]

**2026-10-26 の再発:** 技術士第一次試験の動画で、表紙POP・本文図解の採用指定 `storyboard.imageDesign` が無いまま旧カード版をレンダーし、10秒シートでは2.4秒の表紙も見落とした。表紙・本文の改訂キーをパックに固定し、全場面画像のSHAを検査するシートを追加した。`media preview --commit` は同シートを台帳へ取り込み、`media sync --commit` 後にDriveで復元できる。旧カード版のシートを新意匠の確認結果として示さない。
