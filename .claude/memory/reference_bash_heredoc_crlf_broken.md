---
name: reference_bash_heredoc_crlf_broken
description: この環境のBashツールでheredocは終端不一致で失敗する（CRLF）。ファイル生成はWriteツールかpython -X utf8で
metadata: 
  node_type: memory
  type: reference
  originSessionId: 37edd7d1-b4e2-42e0-a481-7e143b8d32ab
  modified: 2026-08-28T10:56:21.220Z
---

Bash ツール（Git Bash on Windows）で `cat > file <<'EOF' ... EOF` の**heredoc は失敗する**。コマンドが CRLF で渡るため終端行が `EOF\r` となり区切りと一致せず、`unexpected EOF while looking for matching '` で落ちてファイルは 1 バイトも作られない（2026-08-28 実測）。

**対処**:
- 新規ファイル作成は **Write ツール**を使う（Bash 優先の指示があっても、これは Bash が実際にできない作業）
- 既存ファイルの機械的な書き換えは `python -X utf8 - <<'PY'` … も同じ理由で危険。実際には**動く場合がある**（python 側が `\r` を無視する経路）が、確実性を取るなら Write / Edit
- python で編集するときは `io.open(p, newline='')` で読み、既存の改行（CRLF）を保ったまま書き戻す。`newline=''` を忘れると全行 LF 化して pre-commit の CRLF ゲートに弾かれる

関連: [[feedback_tool_output_hallucination]]
