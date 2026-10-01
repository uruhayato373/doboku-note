---
name: codex-local-automation-sleep-catchup
description: Codex のローカル自動化は Mac スリープ中に発火せず、起床時(05:30前後)にまとめて遅延実行される。夜の予定は時刻窓ゲートを外して止まる。automation.toml の rrule 直接編集はアプリに読まれない(実測)→時刻変更はアプリ UI＋台帳を同時に／発火の証拠は memory.md
metadata: 
  node_type: memory
  type: reference
  originSessionId: 4493fa3c-b0d0-4f24-9b81-ba293298dc72
  modified: 2026-09-19T23:19:53.782Z
---

2026-09-20 実測: X Article パイロット（`content/sns/x/draft/094-career-longform-pilot`）の 1 回限り Codex 自動化 `x-article-1/2` は、予定 19:50 / 20:30 に対して **翌朝 04:50 / 05:30 に発火**（3 回とも）。`x-article:publish` の公開窓（15 分前〜120 分後）を外れて exit 1 で止まり、「自動化が動かない」ように見えた。原因は Mac のスリープ（`pmset` sleep 1 分）で、Codex の cron は起床時に遅延分をまとめて走らせる。

**How to apply:**
- 発火したかは `~/.codex/automations/<id>/memory.md`（自動化が自分で書く実行記録）で見る。`status`/`rrule` は `automation.toml`。Claude Code の codex MCP 接続とは無関係
- Mac が寝ている時間帯の予定は組まない。**実際に起きる時刻（05:30 前後）から 2 時間以内**に置くと、遅延発火でも時刻窓に収まる（09-20 に早朝へ移そうとしたが下記の理由で台帳は夕方枠へ戻した・移すならアプリ UI から）
- **`automation.toml` の `rrule` を直接書き換えてもアプリは読まない**（09-20 に 19:35→09:20 へ書き換え、Mac 稼働・アプリ起動中でも 09:37 まで発火せず）。時刻を変えるときは ChatGPT アプリの Automations 画面で変え、同時に台帳（`article-drafts.json`/`status.json` の `scheduled_at`）を合わせる。片方だけ変えると `x-article:publish` の時刻窓で必ず止まる
- Claude Code の auto mode は X への公開（`x-article:publish --publish`）を Real-World Transactions として拒否する。手動復旧は人が起動する（DN-0257）
- 関連: [[background-jobs-die-with-session]]（Claude 側の nohup も同様にセッション依存）
