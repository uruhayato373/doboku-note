---
name: feedback_shared_index_commit_safety
description: 同一作業ツリーで並行エージェント稼働中のコミットは共有index/HEAD競合で汚染される。pathspecコミット・plumbing・update-ref原子ガードで防ぐ
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 9c925904-c7ea-40ea-851e-b1e406ef6742
---

doboku-note では複数エージェント/セッションが**同一作業ツリー**で同時稼働することがある（note カバー生成・過去問マガジン等のバッチ）。git の index と HEAD は作業ツリー共有なので、次の事故が起きる:

1. **共有index汚染**: 並行エージェントが `git add -A` した直後に自分が `git commit` すると、相手の staged ファイルごとコミットしてしまう（2026-05-29、affiliate コミット 0de02a7b4 が note カバー約100件を巻き込んだ）。
2. **HEAD churn**: 並行 `git checkout -b` / `git checkout` で作業ツリーのブランチが切り替わり、自分のコミットが意図しないブランチに乗る（develop / 別 feature ブランチを転々）。

**Why:** リンク worktree でなく単一ツリーを共有しているため。これは [[feedback_parallel_agent_git]] の別側面（あちらは checkout 復元、こちらは index/HEAD 競合）。

**How to apply:**
- コミットは**明示 pathspec で**: `git commit -- <paths>`（bare `git add <files>` + `git commit` は index に他者の staged が残っていると巻き込む）。`src/app/docs/[...slug]/page.tsx` はディレクトリ名にグロブ文字 `[...]` を含むので `--literal-pathspecs` か `:(literal)` を付ける。
- 特定ブランチに確実に載せるには**plumbing**: 一時 `GIT_INDEX_FILE` に `git read-tree <base>` → `git update-index --cacheinfo <mode>,<blob>,<path>` で自分の blob だけ差し替え → `git write-tree` → `git commit-tree` → `git update-ref <ref> <new> <expected-old>`（**第3引数の旧値ガードで原子的更新**。並行が動かしていたら clobber せず fail する）。作業ツリー・共有index・フックに一切触れない。
- 隔離 `git worktree` は作業ツリー非干渉だが **node_modules を持たないので pre-commit フック（gray-matter 等）が落ちる**。フックが要るコミットは node_modules のある主ツリーで、ただし pathspec 限定で。
- **develop は秒単位で動く共有ブランチ**。並行稼働中の履歴是正（reset/rebase）は futile かつ危険。内容が載っていれば良しとし、履歴整形は全エージェント idle 時に。
- 根本対策はユーザーへ: アフィリ等のコード変更は並行バッチが落ち着いたタイミングで単独実行する方が事故が出ない。
- **「コード→PR」規約のための `git checkout -b` も共有ツリーでは逆効果**（2026-06-01 再発: 売上ログツールを feature ブランチに切った直後、並行エージェントの note コミットが自分のブランチに乗り、私の3ファイルを巻き込んで融合）。並行稼働中はブランチを切らず develop に pathspec 限定コミットするか、隔離 worktree を使う。融合後の復旧は ff-merge で develop に巻き取り（全作業保全・履歴整形しない）が最小リスク。
- **`git add <paths>` + `git diff --cached` 確認だけでは防げない**（2026-06-01 同 sales-log サガで再々発: note ですます変換6ファイルを add→diff確認で6件と確認した直後・commit実行までの一瞬に、並行セッションがブランチを切替＋sales系3ファイルを stage し、私の `style(note)` コミット 6c34fca37 にそれらが混入）。**競合の窓は「確認」と「commit」の間**にある。確認結果は commit 時点の index を保証しない。→ **commit 自体をパス限定する** `git commit -- <6 paths>` を使えば、他者が割り込み stage しても自分の指定パスだけがコミットされる。`git add` 後の `git commit`（パス無指定）は共有 index 全体を拾うので不可。
