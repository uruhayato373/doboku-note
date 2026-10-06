---
name: feedback_multi_session_concurrent_git
description: "複数Claudeセッションが同じ作業ツリー・.gitで並行するのが常態。reflog/develop/未コミットが勝手に動くのは正常。pathspec commit・staged確認・復元禁止・push前の巻き込み確認"
metadata:
  type: feedback
---

doboku-note では**複数の Claude Code セッションが同じワークツリー・同じ `.git` で並行作業（commit 含む）するのが常態**（ユーザー確認済み 2026-06-11）。驚かず・事故らず動く。共有 index / HEAD は作業ツリー単位なので、次の事故が起きる。

- **共有 index 汚染**: 並行側が `git add -A` した直後に自分が `git commit` すると相手の staged ごと commit する（2026-05-29 affiliate コミット 0de02a7b4 が note カバー約100件を巻き込み）。逆に自分の大量生成物も相手の `git add -A` に sweep される（2026-04-29 SNS 画像140ファイルが「90番ドラフト」commit 35d3edb3 に混入）。
- **HEAD churn**: 並行 `git checkout -b` / `checkout` で作業ツリーのブランチが切り替わり、自分の commit が意図しないブランチに乗る。
- **`git add` 明示指定でも混入する**: 2026-05-19、`docs/reference/*.md` 20件の commit に `.local/r2/posts/...r8-essay-theme-*` 8件・`src/config/*.json` 5件など計37 files が混入（原因未特定。push 済みで force-push 回避）。2026-06-25・06-01 にも「`git add <paths>` + `git diff --cached` 確認の直後、commit までの一瞬に別セッションが stage」で混入。**競合の窓は確認と commit の間**。確認結果は commit 時点の index を保証しない。

**Why:** 2026-06-11、私が「並行エージェントの干渉」「私の操作」と二転三転して誤帰属した事象の真因は別セッションの同一 `.git` への commit だった（私がターン間で完全停止していた 10:35:55 に develop が eff5266c1→7d2e5b364 に進んだ）。`.git/logs/HEAD` はその `.git` を使う全プロセスの HEAD 移動を混在記録するので、reflog に出ても自分が実行したとは限らない。別エージェントの正当な変更を「想定外の diff」と誤解して `git checkout`/`restore` で復元すると成果を破壊する（create-svg/SKILL.md の変更を消失させた実例）。

**How to apply:**
- **驚かない・切り分ける**: reflog・develop 先頭・未コミットが自分と無関係に動くのは正常。原因は「自分のツール呼び出し履歴に該当 git コマンドがあるか」「committer 時刻」「`.git/logs/HEAD` 生ログ（`<old> <new> <committer> <email> <unix-ts> <tz>\t<msg>`）」で見る。
- **pathspec commit 厳守**: `git commit -m "..." -- <pathspec>`（`-m` は `--` の前）。bare `git commit` / `git add -A` / `git add .` 禁止。`src/app/docs/[...slug]/page.tsx` はグロブ文字を含むので `--literal-pathspecs` か `:(literal)` を付ける。pathspec commit では pre-commit が書き換えた内容（dateModified 等）が index に入らず古い版が残るので、post-commit（`scripts/sync-index-after-commit.mjs`）が HEAD に揃える。フックが古くて `MM` が残ったら `git reset -q -- <path>`（2026-10-06）。
- **commit 前に `git diff --cached --name-only` で staged 一覧を確認**（5ファイル以上・ディレクトリ単位 add・並行稼働中は必須。単一ファイルは省略可）。想定外は `git restore --staged <file>`。
- **他セッションの変更は触らない**: 想定外の diff は無視してそのまま残す。自分の産物以外を `checkout --`/`restore` で復元しない。
- **重要ファイルは編集即 commit**（5分以内）。大量生成は生成完了直後に commit。追跡性が失われたら `git commit --allow-empty -m "説明"` で後追い記録。
- **push 前に `git log origin/develop..HEAD`** で自分以外のコミットが混ざっていないか確認・報告。develop の前進と「巻き込み push」（別セッションがローカル develop を進め、その上に commit→push で全未push分が上がる）は git の正常動作。
- **ブランチ操作前に `git branch --show-current`**。checkout は最小限（往復が無関係ファイルの mtime/EOL を揺らし modified に見せる＝内容差分ゼロなら `numstat` 空で確認、`checkout --` で正規化可）。
- **feature ブランチは共有ツリーで `checkout -b` しない**。先に `ListAgents` で並行セッションを確認し、いれば `git worktree add .claude/worktrees/<name> -b <branch> origin/develop`。2026-09-24、共有ツリーで feature へ切替中に別セッション（「Git同期」2本）が共通方針の再配布コミットを私の feature ブランチへ積んだ。復旧は worktree で cherry-pick→PR、共有ツリーを develop に戻し相手のコミットを同 SHA のまま `merge --ff-only`（push は相手に任せた）。2026-06-01 には売上ログツールを feature に切った直後に並行の note コミットが乗って融合（ff-merge で develop に巻き取り・履歴整形しない）。
- **特定ブランチへ確実に載せる plumbing**: 一時 `GIT_INDEX_FILE` に `git read-tree <base>` → `git update-index --cacheinfo <mode>,<blob>,<path>` → `git write-tree` → `git commit-tree` → `git update-ref <ref> <new> <expected-old>`（旧値ガードで原子的。並行が動かしていたら fail）。作業ツリー・共有 index・フックに触れない。
- **隔離 worktree は node_modules が無いので pre-commit が落ちる**。フックが要る commit は主ツリーで pathspec 限定。worktree に node_modules/.local を symlink すればフック/ブラウザが動く（symlink は worktree remove が安全に外す）。最安全は develop を別 worktree に分離（`git worktree add <dir> develop`→編集→pathspec commit→`push origin develop:develop`→`worktree remove`）。
- **develop は秒単位で動く共有ブランチ**。並行稼働中の履歴是正（reset/rebase）は futile かつ危険。内容が載っていれば良しとし、履歴整形は全エージェント idle 時に。アフィリ等のコード変更は並行バッチが落ち着いてから単独実行する。
- 真実源は CLAUDE.md §10。関連: [[feedback_session_start_git_sync]] [[feedback_session_start_git_sync]]
