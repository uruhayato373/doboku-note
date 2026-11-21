---
name: project-x-state-in-registry
description: X の投稿の状態の正本はコンテンツ台帳。承認は月次計画ごと（approve-x-plan）。下書きの status.json は無い。X のログイン処理と承認・停止はエージェントのセッションでは断られる
metadata:
  type: project
---

2026-11-21、X の投稿の状態をコンテンツ台帳へ一本化した（DN-0612 P7・PR #1692・#1693・#1695・#1696・#1697）。

- **正本**: `content/registry/publications/x/{exam}.json`。文面は下書きフォルダの `tweets.md`（台帳の `copy: tweets.md#tweet/N`）。下書きの `status.json` は無い。読み手は `scripts/lib/registry-x-store.mjs` の `loadXPosts`。
- **状態**: draft（未承認・ストック）→ approved（承認済み・未投入）→ scheduled（publish-x が予約に入れた。キューで確かめた時刻は `times.queueVerified`）→ published。
- **予約の流れ**: `registry -- import-x --folder <フォルダ> --commit` → 月次計画（`content/sns/x/campaigns/`）に date・time・slot（時間帯 A/B/C）・frame（年間の枠 id）→ 運営者が `registry -- approve-x-plan --plan <月次計画> --expect <digest>` → `publish-x` → `x-sync-status` → 日時を過ぎたら `registry -- reconcile-x --commit`（先に `x-own-metrics`）。
- **片付け**: 出し切った下書きフォルダは消し、`registry -- retire-x --commit` で台帳を片付ける（stopped・draft・日時を過ぎた approved の行を消し、published は copy を外して ID・URL・日付だけ残す）。scheduled が残る作品は止まる。
- **エージェントからは断られる処理**: X のログインを使う `x-sync-status`・`publish-x`、運営者の判断の `approve`・`approve-x-plan --expect`・`stop`（`CLAUDECODE=1` を見て断る）。運営者に頼むときは、打つ worktree・コマンド全文・成功の見分け方を書く。

**Why:** status.json と台帳の二重管理で、予約の日時を過ぎた行が一律に止まる・偽成功が台帳に残る、が起きていた。関門は、エージェントが承認なしに外へ出すのを防ぐためのもの。

**How to apply:** X の状態を読む・書くコードは台帳の入口（`loadXPosts`・`recordX`）を通す。status.json を前提にした古い記憶や手順（[[project_x_account_reboot_2026_06]] の当時の経緯）は使わない。関門を外して実行するのは、運営者がその場で明示的に頼んだときだけ（2026-11-21 は運営者の指示で `env -u CLAUDECODE` で実行した）。偽成功の確認は [[feedback_publish_x_false_success]]。
