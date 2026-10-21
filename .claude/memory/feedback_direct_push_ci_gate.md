---
name: feedback_direct_push_ci_gate
description: develop 直 push（doc・追跡解除・todo）でも CI ゲートは落ちる。push 前に該当ゲートを手元で回す
metadata:
  type: feedback
---

develop へ直 push する変更でも、quality:audit の ci ゲートが読む面に触れていれば develop が赤になる。2026-10-20 に 1 日で 2 回起きた: (1) 週次スキルにコマンドを書き足して `review-wiring.json` への登録を忘れ `check-review-wiring` が赤、(2) 無視対象の追跡解除で `check-x-card-render` の対象が 0 件になり検査不成立。

**Why:** doc・todo・追跡解除は「コードではない」ので PR を通さず、CI の結果を見るのが push の後になる。赤の develop は他セッションの PR まで巻き込む。

**How to apply:** スキル本文・config・`.gitignore`・`git rm --cached` を含む直 push の前に `npm run quality:audit:ci` を回す（重いので worktree で background）。push 後は develop 先端の Pre-merge check が success になるまで見届けてから完了と言う。関連 [[feedback_deploy_discipline]] [[feedback_gate_zero_coverage_false_pass]]
