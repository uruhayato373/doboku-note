---
name: feedback_commit_result_check
description: commit・push・Workflow の起動は出力を grep で絞らず、HEAD・exit・引数の実体で成否を確かめる（2026-10-10 に 3 回空振り）
metadata:
  type: feedback
---

コマンドの成否は、出力の見た目でなく実体で確かめる。

- `git commit … | grep -E "✗|FAIL"` で絞ると、pre-commit が別の文言（`lint-ja` の表記の指摘・`content-quality` の「baseline 比の新規違反」）で止めたときに何も表示されず、コミットできたように見える。2026-10-10 に 2 回、HEAD が動いていないまま次へ進みかけた。commit の後は `git log --oneline -1` で HEAD が新しいコミットか確かめる。止まったら grep せずに全文を読む
- `git push … | grep -v remote:` が空でも push できたとは限らない（rebase の失敗で push が走っていなかった）。`git log origin/develop -1` で確かめる
- Workflow の args に仮の文字列（`"__PARTS__"`）を入れたまま起動し、`parts.map is not a function` で即失敗した。配列はファイルから読んだ実物を JSON の値として渡す
- サブエージェントに「git 操作禁止」と書いても `git checkout --` を 1 回使われた（自分の編集を戻すため・実害なし）。報告に逸脱が書かれていたら差分を確かめる

**Why:** 緑に見える出力と実体の食い違いは、後から気づくほど手戻りが大きい（[[feedback_gate_zero_coverage_false_pass]] と同じ構造）。
**How to apply:** commit・push・rebase・Workflow 起動の直後に、HEAD・origin・args の実体を 1 回見る。
