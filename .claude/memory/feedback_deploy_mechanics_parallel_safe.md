---
name: feedback_deploy_mechanics_parallel_safe
description: develop→main 昇格の安全手順と index 再生成不変条件（並行セッション稼働時のデプロイ）
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 45fe9d89-42a6-4fea-95dc-1f2f4c7d32a0
---

develop→main デプロイの実務メカニクス（2026-06-03 確立）。

**Why:** 並行セッション（別 Claude）が同一作業ツリーで commit/編集を continue している最中にデプロイを求められる事故が頻発。ライブツリーを汚さず固定スナップショットを安全に出す必要がある。

**How to apply:**
- **index ドリフトは無視可**: CI の `npm run build`（cloudflare-deploy.yml）は冒頭で `npm run refresh-indexes` を実行する。よって commit 済みの `src/config/*.json`（cross-exam/doc-meta/keyword-relations/pillar-exam-questions/tag-dictionary）の状態は**デプロイ結果に無関係**。デプロイ前に index を commit し直す必要はない。
- **ff 昇格はリモート ref 同士で**: ローカルを checkout せず `git push origin origin/develop:refs/heads/main`（origin/main が origin/develop の祖先＝ff のときのみ）。作業ツリーに一切触れない。
- **並行セッション稼働中の固定スナップショット**: dirty な本体ツリー＆未ステージ変更が rebase を阻むので、`git worktree add --detach C:/tmp/wt <origin/develop>` → 新規コミットだけ `git cherry-pick <last-dup>..<HEAD>` で接ぎ木 → `git push origin HEAD:develop` & `:main`。重複コミットは `git cherry`/cherry-pick が patch-id で skip。worktree 物理削除は権限で失敗しがち→`git worktree prune` で登録だけ消せばよい（無害な leftover）。
- **ローカルビルド検証は当てにしない**: `next dev -p 3020` 並行稼働中は `.next` 競合でローカル `npm run build` がハング（16分+/出力0B）。kill 後の watch exit code も信用不可。**CI build を権威ゲート**にする（build 失敗時は Cloudflare deploy step が走らず本番は前バージョンのまま安全）。
- **CI deploy が Checkout でハング**する事象あり（前例: 18分）。`gh run cancel` → `gh run rerun` で復旧。
- `[[feedback_shared_index_commit_safety]]` / `[[feedback_parallel_agent_git]]` と併読。
