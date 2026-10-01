---
name: reference_background_jobs_die_with_session
description: "長時間・定時ジョブの罠。nohup/& はセッション終了で死ぬ→launchctl submit・Codexローカル自動化はMacスリープ中に発火せず起床時に遅延"
metadata:
  type: reference
---
2026-09-19 実測: `nohup npm run note-cover-rollout -- run &` と、その終了を待つ `nohup ... after-rollout.sh &` の 2 本が、Claude Code セッションの終了（/resume の前）で**同時に死んだ**。runner は chunk 途中で止まり、後続の verify / W8 収録は一度も走らなかった（ログは待機開始の 1 行だけ）。`caffeinate -w <pid>` も親が死ねば意味がない。

**How to apply:**
- 1 時間を超えるジョブは `launchctl submit -l <label> -o <out> -e <err> -- /usr/bin/caffeinate -i -s /abs/path/wrapper.sh` で起動する（macOS には setsid が無い）
- wrapper は **絶対パス**で書き、先頭で `export PATH=/opt/homebrew/opt/node@20/bin:/opt/homebrew/bin:/usr/bin:/bin`（launchd は login PATH を持たず `npm: command not found`＝exit 127 になる）、`DOBOKU_PW_MIN_FREE_MB=1024`、`cd` を明示する
- **`launchctl submit` のジョブは終了後に自動再起動する**（KeepAlive 相当）。完了を確認したら即 `launchctl remove <label>`。冪等でない後続処理（マガジン収録等）を chain に入れる場合は特に注意
- 状態確認は `launchctl list | grep <label>`（第 2 列が終了コード・`-` は実行中）と wrapper のログ。停止は `launchctl remove <label>`
- Bash の `run_in_background` は「このセッション内で結果を受け取る」用途に限り、セッションをまたぐ待機には使わない
- 関連: [[reference_note_cover_v5_rollout]]

---

## Codex ローカル自動化はスリープで遅延発火

2026-09-20 実測: X Article パイロット（`content/sns/x/draft/094-career-longform-pilot`）の 1 回限り Codex 自動化 `x-article-1/2` は、予定 19:50 / 20:30 に対して **翌朝 04:50 / 05:30 に発火**（3 回とも）。`x-article:publish` の公開窓（15 分前〜120 分後）を外れて exit 1 で止まり、「自動化が動かない」ように見えた。原因は Mac のスリープ（`pmset` sleep 1 分）で、Codex の cron は起床時に遅延分をまとめて走らせる。

**How to apply:**
- 発火したかは `~/.codex/automations/<id>/memory.md`（自動化が自分で書く実行記録）で見る。`status`/`rrule` は `automation.toml`。Claude Code の codex MCP 接続とは無関係
- Mac が寝ている時間帯の予定は組まない。**実際に起きる時刻（05:30 前後）から 2 時間以内**に置くと、遅延発火でも時刻窓に収まる（09-20 に早朝へ移そうとしたが下記の理由で台帳は夕方枠へ戻した・移すならアプリ UI から）
- **`automation.toml` の `rrule` を直接書き換えてもアプリは読まない**（09-20 に 19:35→09:20 へ書き換え、Mac 稼働・アプリ起動中でも 09:37 まで発火せず）。時刻を変えるときは ChatGPT アプリの Automations 画面で変え、同時に台帳（`article-drafts.json`/`status.json` の `scheduled_at`）を合わせる。片方だけ変えると `x-article:publish` の時刻窓で必ず止まる
- Claude Code の auto mode は X への公開（`x-article:publish --publish`）を Real-World Transactions として拒否する。手動復旧は人が起動する（DN-0257）
- 関連: [[reference_background_jobs_die_with_session]]（Claude 側の nohup も同様にセッション依存）
