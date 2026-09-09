# .tmp/ — 一時出力置き場

- **中身は 3 日で消える**。`scripts/prune-tmp.mjs`（Claude の SessionStart フックと日次の
  `disk-hygiene:fix`）が mtime 3 日超のファイルを削除する。残したいものはここに置かない。
- スクショ・SVG の確認・図クロップ・動画/TTS レンダー・OCR の中間生成物はここへ出す（CLAUDE.md §3）。
- **git worktree をここに作らない**。置き場は `.claude/worktrees/`（Claude）と
  `~/.codex/worktrees/`（Codex）だけ（CLAUDE.md §10・[disk-hygiene.md](../.claude/knowledge/reference/disk-hygiene.md)）。
  prune は `.git` を持つディレクトリを飛ばすので実害は止めてあるが、置き場違反は
  `npm run check-disk-hygiene` が FAIL にする。
- git 追跡下にあるのはこの README と `.gitkeep` だけ（`.gitignore` の `/.tmp/*`）。
