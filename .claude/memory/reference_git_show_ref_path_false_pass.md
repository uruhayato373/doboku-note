---
name: reference_git_show_ref_path_false_pass
description: "Windows Git Bash 時代のシェル罠。git show <ref>:<path> のパス破壊で偽PASS(git grep を使う)・gh --jq の MSYS パス変換で空出力・heredoc の CRLF 失敗"
metadata:
  type: reference
---
Bash ツール（Git Bash on Windows）で `git show 'origin/develop:.local/r2/.../article.mdx'` を実行すると、
パス中の `:` が `;` に、`/` が `\` に変換され、`fatal: ambiguous argument 'origin\develop;.local\r2\...'`
で **exit 128・標準出力0バイト**になる。クォートしても防げない。

**危険なのは失敗そのものではなく、失敗の形**。次のように grep へ繋ぐと偽 PASS になる:

```bash
git show 'origin/develop:path/to/file' 2>&1 | grep -noE 'パターン' || echo "(該当なし)"
```

エラーメッセージに対して grep がヒット0を返すため「(該当なし)＝解消済み」と表示される。
2026-08-03、これで「site-investigation の図参照は origin/develop で解消済み」と誤結論を出しかけた
（実際には未解消のまま残っていた）。[[feedback_gate_zero_coverage_false_pass]] の実例そのもの。

**正しいやり方** — ref 上のファイル内容を検査するときは:

```bash
git grep -noE 'パターン' origin/develop -- 'path/to/file'   # パス引数が壊れない
git ls-tree -r --name-only origin/develop -- 'path/'        # 存在確認
```

どうしても `git show` が要るなら、リダイレクト後に `exit code` と `wc -c`（バイト数）を必ず出して、
0バイトを PASS と読まないこと。

関連: [[feedback_verify_your_excuses]]（ツール出力は実体で確認）

---

## gh --jq 内の "/" が Windows パスに化ける

Bash ツール（Git Bash）から `gh run view --json status,conclusion --jq '.status+"/"+(.conclusion//"-")'`
を実行すると、MSYS のパス変換が引用符内の `/` を `C:/Program Files/...` に置換し、
jq が `cannot add: string and array` で落ちるか **空文字を返す**。

害: 背景ポーリングのループが「完了を検知できないまま空行を出し続ける」偽の沈黙になる。
2026-08-21 に 3 本の run 監視が全滅し、完了に気づけなかった（run 自体は success だった）。
`[検査ゼロを PASS と呼ばない]` と同型で、**空＝異常なし ではなく 計測できていない**。

回避: `--jq` を使わず `--template` を使う。
`gh run view <id> --json workflowName,status,conclusion --template '{{.status}} | {{.conclusion}}{{"\n"}}'`

関連: [[feedback_verify_your_excuses]] [[feedback_gate_zero_coverage_false_pass]]

---

## Bash の heredoc は CRLF で終端不一致

Bash ツール（Git Bash on Windows）で `cat > file <<'EOF' ... EOF` の**heredoc は失敗する**。コマンドが CRLF で渡るため終端行が `EOF\r` となり区切りと一致せず、`unexpected EOF while looking for matching '` で落ちてファイルは 1 バイトも作られない（2026-08-28 実測）。

**対処**:
- 新規ファイル作成は **Write ツール**を使う（Bash 優先の指示があっても、これは Bash が実際にできない作業）
- 既存ファイルの機械的な書き換えは `python -X utf8 - <<'PY'` … も同じ理由で危険。実際には**動く場合がある**（python 側が `\r` を無視する経路）が、確実性を取るなら Write / Edit
- python で編集するときは `io.open(p, newline='')` で読み、既存の改行（CRLF）を保ったまま書き戻す。`newline=''` を忘れると全行 LF 化して pre-commit の CRLF ゲートに弾かれる

関連: [[feedback_verify_your_excuses]]
