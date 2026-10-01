---
name: youtube-competitor-video-analysis
description: 競合YouTube動画を映像ごと解析する手順と罠。既存yt-dlpは動画DLが403、deno+最新yt-dlp別venvが必要。twitter CLI searchは404
metadata:
  node_type: memory
  type: reference
  originSessionId: a6093a8c-1e6c-4843-bcef-9365a15a8951
  modified: 2026-09-23T13:07:41.779Z
---

2026-09-23 のちゃんさと全131本分析（成果は docs/marketing/07b_販売動線分析_ちゃんさと_2026-09.md）で確立した手順と罠。

- **動画DLは既存 yt-dlp では 403**: /opt/homebrew/bin/yt-dlp は agent-reach の venv（~/.agent-reach-venv）の 2026.06.09 で、メタデータ・字幕は取れるが映像 DL は 403（SABR/PO token）。node@20 は yt-dlp が unsupported 扱い。**deno を brew で入れ（2026-09-23 導入済み）、最新 yt-dlp を別 venv に入れて `--js-runtimes deno`** で通る。agent-reach の venv は触らない。それでも 403 が数%出るので失敗分は再実行。
- **シーン検出は `-skip_frame nokey` だと0件**（白背景スライドは差分が小さい）。`fps=1,scale=320:-2,select='gt(scene,0.08)'` のフルデコードで1本2〜3秒。
- **1本4枚のコンタクトシート**（切替12コマ/冒頭45秒/最後60秒/字幕の販売語時刻）＋間引き字幕の dossier を作り、sonnet エージェント1体15本で読ませると 1体約28万トークン。字幕の販売語検出は「購入者」（生コンJIS用語）で誤検出するので画像で補正させる。
- **twitter CLI**: `user-posts -n` は最大200件で頭打ち。`search`（--from/--since）は ClientTransaction 初期化失敗で 404 → 凍結リスクがあるので再試行しない。
- 著作権配慮: 切り出し画像・字幕は分析後に削除し、docs には要旨だけ書く（[[no-verbatim-book-reflection]]）。

関連: [[competitors-civil]]
