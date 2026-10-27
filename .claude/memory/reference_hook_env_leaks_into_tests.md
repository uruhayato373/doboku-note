---
name: reference_hook_env_leaks_into_tests
description: pre-commit の中で走るテストは GIT_INDEX_FILE を引き継ぎ、一時リポジトリの git add が commit 用の index を書き換える。unit-tests は gateEnv で外してある
metadata:
  type: reference
---

pre-commit（`git commit` の中）では `GIT_INDEX_FILE` が commit 用の一時 index を指す。そこから起動した子プロセスが一時リポジトリを作って `git add` すると、cwd が別のリポジトリでも、その index に書き込む。2026-10-27、`tests/todo-add.test.mjs` が commit 用の index を 17,802 件から 2 件に置き換えた。後段の `check-relative-links` が手元に無い blob を取りに行って `not our ref` で落ちたため、壊れた tree はコミットされなかった（[[reference_partial_clone_repack_hazard]]）。

**Why:** 検査が全部通っていれば、ファイルがほぼ全部消えたコミットができていた。症状は「無関係な検査が `unable to read <sha>` で落ちる」で、原因が見えにくい。

**How to apply:** `scripts/pre-commit-ci-gates.mjs` の unit-tests は `isolateGit: true`（`gateEnv` が `GIT_INDEX_FILE`・`GIT_DIR`・`GIT_WORK_TREE` などを外す。`tests/pre-commit-ci-gates.test.mjs` が固定）。hook から子プロセスで一時リポジトリの git を動かす検査を新しく足すときも、同じく外す。`--staged` で commit 用の index を読む検査には外さず渡す。コミット後は `git ls-tree -r HEAD | wc -l` が親と同じくらいかを見る。
