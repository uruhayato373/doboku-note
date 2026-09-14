---
name: reference-scheduled-workflow-default-branch
description: GitHub の scheduled workflow はデフォルトブランチ(main)版で走るため、CI workflow 変更は main へ deploy しないと週次実行に効かない
metadata: 
  node_type: memory
  type: reference
  originSessionId: d2619dc0-18bc-4105-b5f6-9edc2c8913ce
  modified: 2026-07-28T03:01:50.760Z
---

GitHub Actions の **scheduled（cron）workflow はデフォルトブランチ = `main` の版で実行される**。このプロジェクトは develop に蓄積→main へ deploy する運用なので、`.github/workflows/*.yml`（fetch-metrics.yml 等）を develop でマージしても、**main へ deploy するまで週次 scheduled run には反映されない**。

- 例（2026-07-03）: crosswalk 配線（PR #348）を develop にマージしただけでは金曜の `fetch-metrics.yml`（cron `0 21 * * 4`）に載らず、`develop→main` を ff deploy して初めて反映された。
- 判定: `gh repo view --json defaultBranchRef` でデフォルトブランチ確認。main の workflow 内容は blob 経由で確認（`git ls-tree origin/main <path>` → `git cat-file blob <hash>`。Windows Git Bash では `git show origin/main:<path>` の `:` がパス変換で壊れるので blob 経由が確実）。
- 逆に `on: push`/`pull_request` トリガーの workflow はブランチ版で走るので deploy 不要。scheduled/`workflow_dispatch` 既定は main。
- **新規 workflow は develop 段階では手動実行すらできない**（2026-07-28 実測）: ファイルが既定ブランチに無いと `gh workflow run <name>.yml --ref develop` も `HTTP 404: not found on the default branch` になる。`--ref` を付けても既定ブランチにその workflow が存在することが前提。つまり「develop で dispatch して動作確認 → 問題なければ main へ」という順序は取れず、**main へマージしてから初めて検証できる**。未実証の前提（外部 API への到達性など）を含む workflow を入れるときは、マージ直後に手動実行して確認する手順を backlog へ残すこと。

関連: [[feedback_deploy_mechanics_parallel_safe]]（develop→main ff 昇格の安全手順）・[[feedback_metrics_cicd_supplied]]（計測は CI/CD 供給）。
