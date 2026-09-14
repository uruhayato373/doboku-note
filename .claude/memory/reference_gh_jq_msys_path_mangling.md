---
name: reference-gh-jq-msys-path-mangling
description: Git Bash の MSYS パス変換が gh --jq 式内の "/" を Windows パスに化かし、監視ループが無言で空を返す
metadata:
  type: reference
---

Bash ツール（Git Bash）から `gh run view --json status,conclusion --jq '.status+"/"+(.conclusion//"-")'`
を実行すると、MSYS のパス変換が引用符内の `/` を `C:/Program Files/...` に置換し、
jq が `cannot add: string and array` で落ちるか **空文字を返す**。

害: 背景ポーリングのループが「完了を検知できないまま空行を出し続ける」偽の沈黙になる。
2026-08-21 に 3 本の run 監視が全滅し、完了に気づけなかった（run 自体は success だった）。
`[検査ゼロを PASS と呼ばない]` と同型で、**空＝異常なし ではなく 計測できていない**。

回避: `--jq` を使わず `--template` を使う。
`gh run view <id> --json workflowName,status,conclusion --template '{{.status}} | {{.conclusion}}{{"\n"}}'`

関連: [[feedback_tool_output_hallucination]] [[feedback_gate_zero_coverage_false_pass]]
