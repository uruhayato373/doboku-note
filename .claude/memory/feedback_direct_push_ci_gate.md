---
name: feedback_direct_push_ci_gate
description: develop 直 push（doc・追跡解除・todo）でも CI ゲートは落ちる。push 前に該当ゲートを手元で回す
metadata:
  type: feedback
---

develop へ直 push する変更でも、quality:audit の ci ゲートが読む面に触れていれば develop が赤になる。2026-10-20 に 1 日で 2 回起きた: (1) 週次スキルにコマンドを書き足して `review-wiring.json` への登録を忘れ `check-review-wiring` が赤、(2) 無視対象の追跡解除で `check-x-card-render` の対象が 0 件になり検査不成立。2026-10-23 にも (3) note マガジンへ今の版を足した収録記録（`data/note/magazines.json`）を直 push し、旧版が残るぶんライブの本数が増えて `check-magazine-membership` が赤、無関係の PR まで落ちた。pre-commit の `--staged` はライブ軸を見ないので素通りしていた → snapshot を含む commit では手元でもライブ軸を見るようにした（回帰テスト付き）。

**Why:** doc・todo・追跡解除は「コードではない」ので PR を通さず、CI の結果を見るのが push の後になる。赤の develop は他セッションの PR まで巻き込む。

**How to apply:** スキル本文・config・`data/`・`.gitignore`・`git rm --cached` を含む直 push の前に `npm run quality:audit:ci` を回す（重いので worktree で background）。push 後は develop 先端の Pre-merge check が success になるまで見届けてから完了と言う。関連 [[feedback_deploy_discipline]] [[feedback_gate_zero_coverage_false_pass]]

**コンテンツの直 push も同じ（2026-11-10）**: ショート 6 本の台本（`content/sns/video-packs/**/shorts-design.json` と `youtube.json` の shorts）を develop へ直 push し、`check-youtube-shorts`（描画前の sha・予約日時を必須にしていた）と `registry-video-state` の往復のテスト（台帳に行が無い）が赤になった。他セッションの PR（水産部門の入口）が数時間止まった。`youtube.json`・`content/registry/**`・`pop-image.json` を変える push は、コンテンツでも audit:ci を回してから。

**台帳だけの push は CI が走らない（2026-11-06）**: `.claude/todo/**` と `.claude/state/todo-claims.json` だけの push は `ci.yml` の `paths-ignore` で飛ばす。push の 37% がこれだった。ゲートは pre-commit と `todo:add`。文書だけの push のビルドは残した（300 回中 8 回で、ジョブの分岐を足すほどの効果が無い）。

**PR に出す変更は手元で全件を回さない（2026-11-06）**: `quality:audit:ci` は `unit-tests`（`npm test`）を含み、PR の CI が同じものを回す。手元は変更に関係するテストと検査だけにして、全件は CI に任せる。上の手元の全件は develop へ直 push する変更と、他セッションの未コミット作業を拾うときだけ。**Why:** 同じ全件を手元と CI で二重に回し、手元の分は結果を待つ時間の分だけ作業が止まった。

**config の 1 値でも同じ・赤の PR を merge した（2026-11-12）**: 棚卸しの続きで `config/business-direction.json` の `qualityDefects` を `supply: none` に変え、audit:ci を回さずに develop へ直 push した。`tests/business-direction.test.mjs` が実 config の supply を期待値に持っていて赤になり、次の PR（#1567）の CI で初めて見えた。さらに `gh pr checks --watch` の終了だけを見て `gh pr merge --squash` を叩き、FAILURE 1 件のまま #1567 を merge した（`gh pr merge` は赤でも止めない）。**How to apply:** merge の前に `gh pr view <n> --json statusCheckRollup` で FAILURE が 0 件か必ず読む（watch の終了は緑の意味ではない）。`config/` の値を変える直 push は、値を期待値に持つテストを `git grep '<id>' tests` で探して回してから。
