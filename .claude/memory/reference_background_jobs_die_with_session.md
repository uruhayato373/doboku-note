---
name: background-jobs-die-with-session
description: Claude Code の Bash から nohup/& で起動した長時間ジョブはセッション終了でプロセスグループごと殺される。数時間ものは launchctl submit（絶対パス・PATH に node@20 を明示）で切り離す
metadata: 
  node_type: memory
  type: reference
  originSessionId: 4493fa3c-b0d0-4f24-9b81-ba293298dc72
  modified: 2026-09-19T01:39:53.475Z
---

2026-09-19 実測: `nohup npm run note-cover-rollout -- run &` と、その終了を待つ `nohup ... after-rollout.sh &` の 2 本が、Claude Code セッションの終了（/resume の前）で**同時に死んだ**。runner は chunk 途中で止まり、後続の verify / W8 収録は一度も走らなかった（ログは待機開始の 1 行だけ）。`caffeinate -w <pid>` も親が死ねば意味がない。

**How to apply:**
- 1 時間を超えるジョブは `launchctl submit -l <label> -o <out> -e <err> -- /usr/bin/caffeinate -i -s /abs/path/wrapper.sh` で起動する（macOS には setsid が無い）
- wrapper は **絶対パス**で書き、先頭で `export PATH=/opt/homebrew/opt/node@20/bin:/opt/homebrew/bin:/usr/bin:/bin`（launchd は login PATH を持たず `npm: command not found`＝exit 127 になる）、`DOBOKU_PW_MIN_FREE_MB=1024`、`cd` を明示する
- **`launchctl submit` のジョブは終了後に自動再起動する**（KeepAlive 相当）。完了を確認したら即 `launchctl remove <label>`。冪等でない後続処理（マガジン収録等）を chain に入れる場合は特に注意
- 状態確認は `launchctl list | grep <label>`（第 2 列が終了コード・`-` は実行中）と wrapper のログ。停止は `launchctl remove <label>`
- Bash の `run_in_background` は「このセッション内で結果を受け取る」用途に限り、セッションをまたぐ待機には使わない
- 関連: [[reference_note_cover_v5_rollout]]
