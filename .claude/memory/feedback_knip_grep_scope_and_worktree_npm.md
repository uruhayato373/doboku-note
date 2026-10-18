---
name: feedback_knip_grep_scope_and_worktree_npm
description: knip の「未使用」は repo 全体（.claude/scripts を含む）を grep で裏取りする。worktree で npm install/uninstall すると node_modules の symlink が実体に置き換わる（2026-10-11）
metadata:
  type: feedback
---

- knip が未使用と言う依存・ファイルは、消す前に **repo 全体**（`git grep -i <name>`）で裏取りする。2026-10-11 に `@fontsource/manrope` を src・tools だけ grep して消し、`.claude/scripts/lib/sns-common/slide-render.mjs` が `node_modules/@fontsource` を**パス文字列で読んでいた**ため CI の unit-tests（renderSlide 4 件）が落ちた。import 文で見えない利用（フォント・画像・CLI の実体）は knip に映らない。正当な例外は `knip.json` の `ignoreDependencies` に登録し、理由を読む側のソースにコメントで残す
- worktree の `node_modules` は親への symlink で用意しているが、その worktree で `npm install` / `npm uninstall` を実行すると npm が symlink を実体の `node_modules` に置き換える（1,297 パッケージを書き直す）。以後その worktree のテストは親と別の node_modules を見る。依存を変える作業は親の checkout で行い、worktree では `package.json` の編集だけにして `npm ci` は CI に任せる。直すときは `rm -rf <wt>/node_modules && ln -s <repo>/node_modules <wt>/node_modules`

**Why:** 「未使用」の判定は検出器の視野の内側でしか正しくない（[[feedback_gate_zero_coverage_false_pass]] と同じ構造）。worktree の環境差は「手元では通るのに CI で落ちる／手元だけ落ちる」の形で出て、原因が依存の置き場だと気づきにくい。
**How to apply:** 依存・ファイルの削除は `git grep` を repo 全体で 1 回。worktree で npm を書き換え系で叩かない。手元とCIの結果が食い違ったら `ls -la <wt>/node_modules` を見る。
