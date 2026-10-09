---
name: feedback_worktree_ignored_data
description: worktree で git 管理外のデータ（書籍の文字起こし・網羅の判定）を使うときは、リンクでなく中身をコピーし、tracked の未コミットは脇へ置いて rebase する
metadata:
  type: feedback
---

worktree には git 管理外のファイル（`content/sources/books/<dir>/ocr/*.md`・`coverage/*.json`）が無い。持ち込むときの罠（2026-10-10・DN-0591）:

- `ocr/` は README.md だけ git 管理のディレクトリなので、worktree にも空でない `ocr/` がある。`[ -e ocr ] || ln -s …` はリンクを張らず、続く `cp -R <src>/ocr <dst>/ocr` は `ocr/ocr/` に入れ子でコピーした。中身を入れるときは `cp -R <src>/ocr/. <dst>/ocr/`
- `audit-reference-book-coverage` はシンボリックリンクを辿らないので、リンクでは「文字起こしが無い」になる。コピーする
- `--rejudge` などで tracked の要約（`.claude/state/book-coverage.json`）が未コミットのまま変わると、`git rebase` が止まる。stash は共有なので使わず、そのファイルを一時置き場へ cp → `git checkout --` → rebase → 戻す

**Why:** 本体のツリーを汚さずに判定・展開を回すため（[[feedback_multi_session_concurrent_git]]）。
**How to apply:** worktree で書籍の網羅を回す前に、対象の書籍だけ `ocr/.`・`coverage/.` をコピーし、終わったら worktree ごと消す。
