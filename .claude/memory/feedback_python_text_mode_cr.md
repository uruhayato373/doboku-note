---
name: python-text-mode-cr
description: "Python の open() テキストモードで repo ファイルを書き換えると単独の \\r が \\n に化ける（CLAUDE.md が 151 行になった）。newline='' か bytes で編集する"
metadata:
  node_type: memory
  type: feedback
  originSessionId: c810297c-e3bd-4390-99c3-3cb4efdff09a
  modified: 2026-09-26T04:36:46.499Z
---

2026-09-26、CLAUDE.md の 1 行を python3 の `open(p).read()` → `write()` で書き換えたら、既存の行中の単独 `\r` が改行に変わり 150→151 行になって `check-claude-md-size` が落ちた（HEAD の bytes から 1 行だけ置換して復元）。

**Why:** テキストモードは universal newlines で `\r` を `\n` に変換する。気づかないと関係ない行の差分や行数超過・CRLF 混在を生む。

**How to apply:** repo のファイルを Python で編集するときは `open(p, encoding='utf-8', newline='')` か bytes（`rb`/`wb`）で読み書きする。編集後は `git diff --stat` で想定外の行数が無いか、CR 数（`tr -cd '\r' | wc -c`）が HEAD と同じかを見る。MDX は従来どおり `writeMdxFile`。関連: [[own-command-byproducts]]。
