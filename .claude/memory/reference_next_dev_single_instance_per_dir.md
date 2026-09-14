---
name: reference_next_dev_single_instance_per_dir
description: Next 16 は同一プロジェクトdirのdev serverを2つ起動できない（ポート変更でも不可）。admin scriptのkill-portは他セッションを殺す
metadata: 
  node_type: memory
  type: reference
  originSessionId: 37edd7d1-b4e2-42e0-a481-7e143b8d32ab
  modified: 2026-08-28T10:56:12.582Z
---

Next 16 (Turbopack) は **同一プロジェクトディレクトリに対する `next dev` を 1 プロセスしか許さない**。別ポートを与えても Ready 表示の直後に `⨯ Another next dev server is already running.` で落ちる（`.next/dev` の単一プロセスロック・PID と既存 URL を出して終了）。

**帰結**: 並行セッションが `tools/admin-app` の dev server（:3021）を持っているとき、こちらのセッションが自前の admin server を持つことは**できない**。`autoPort: true` を launch.json に足しても解決しない（ポート競合ではないため）。動かない起動経路を launch.json に残すと次に触る人を誤らせるので、追加したら撤回する。

**正しい対処**: `preview_start({url: "http://127.0.0.1:3021/..."})` で**既存サーバーにタブを向ける**（サーバーを起動せずブラウザタブだけ開く）。検証はこれで足りる。

**もう1つの罠**: `npm run admin` は先頭で `node scripts/kill-port.mjs 3021` を実行する。そのまま叩くと**別セッションの admin server を問答無用で殺す**。並行時は絶対に実行しない。

admin が 3021 に縛られる理由は OAuth/webhook/CORS ではなく、`playwright.admin.config.ts` の baseURL と webServer、および手順書が 3021 前提であること。

関連: [[feedback_multi_session_concurrent_git]] / [[reference_admin_worktree_turbopack]]
