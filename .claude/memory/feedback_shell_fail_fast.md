---
name: feedback_shell_fail_fast
description: "複数段階のマージやJSON修復は失敗時に次のGit操作へ進めない"
metadata:
  type: feedback
---

2026-10-10、Drive台帳の3-way統合で件数assertが失敗した後も、同じシェルの後続git addが実行され、未解消JSONをstageした。pre-commitが拒否し、不正なコミットは作られなかった。統合を修正してから再実行した。

依存する処理は別ツール呼出しに分けてexit codeを確認する。functions.exec内で順にawaitするだけでは失敗後も次の呼出しへ進むため、結果のexit_codeが0かを明示的に検査し、失敗時は後続のGit操作を呼ばない。シェル内で続ける必要がある場合は `set -e` を付け、JSONのparse・既存件数維持・競合マーカー0を通してからGit操作へ進む。`head` は巨大な1行JSONを短くしないため、台帳差分はparse後のキー・件数・変更行で確認する。

## zsh で変数名 path を使わない（2026-10-22）
zsh の `path` は PATH と連動する配列なので、`for f in ...; do path=${f%%:*}; ...` と書くと PATH が壊れ、後続の git・cut が command not found になる（何も実行されずに終わる）。ループの変数は `p`・`file` などにする。

## 作業ツリーは push を確かめてから消す（2026-10-22）
サブシェルで rebase が「未ステージの変更」で失敗したのに、外側で続けて `git worktree remove --force` を実行し、push していないコミット 2 つを作業ツリーごと失いかけた（ハッシュから取り戻した）。消す前に必ず `git merge-base --is-ancestor <作業ツリーの HEAD> origin/develop` を通し、その成否で `&&` につなぐ。refresh-indexes の後は生成物（src/config/*.json）が変わっていないかも見る。

## ancestor の確認は「何も commit していない」ときも通る（2026-10-23）
`todo-complete --commit`（完了処理の実行で、git commit はしない）の後に ancestor 確認 → `git worktree remove --force` とつなぎ、未 commit のカード削除を作業ツリーごと消した。HEAD が origin/develop のままなら ancestor は必ず真になる。消す前は ancestor に加えて `git status --porcelain` が空であることも確かめ、`--force` は空を確かめた後だけ使う。

## 外向きの操作は commit の成否に && でつなぐ（2026-10-28）
note の無料記事の下書きを commit してから公開する手順を `git commit … ; git push … ; node scripts/note-publish.mjs --commit` と `;` でつなぎ、pre-commit が止めた（記事カタログの stage 漏れ）のに公開まで進んだ。中身は検査済みで実害は無かったが、検査の止めを素通りして取り消しの効かない操作をした。note の公開・push・デプロイのような外向きの操作は、直前の commit と検査に `&&` でつなぎ、`git log -1` で commit ができたことを確かめてから実行する。
