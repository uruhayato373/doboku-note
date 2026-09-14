---
name: reference_git_show_ref_path_false_pass
description: "この環境で git show <ref>:<path> はパスの : と / が壊れて exit 128・0バイトを返す。grep に繋ぐと「ヒット0」＝偽PASSになる。ref 上のファイル検査は git grep <ref> -- <path> を使う"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 331df6df-7206-4349-a058-f0cc1643abec
  modified: 2026-08-03T05:05:32.572Z
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

関連: [[feedback_tool_output_hallucination]]（ツール出力は実体で確認）
