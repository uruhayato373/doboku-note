---
name: feedback_commit_result_check
description: commit・push・Workflow の起動は出力を grep で絞らず、HEAD・exit・引数の実体で成否を確かめる（2026-10-10 に 3 回空振り）
metadata:
  node_type: memory
  type: feedback
  originSessionId: 3c72cd1c-c293-47b9-b4e5-0885769894f1
  modified: 2026-10-12T08:47:15.690Z
---

コマンドの成否は、出力の見た目でなく実体で確かめる。

- `git commit … | grep -E "✗|FAIL"` で絞ると、pre-commit が別の文言（`lint-ja` の表記の指摘・`content-quality` の「baseline 比の新規違反」）で止めたときに何も表示されず、コミットできたように見える。2026-10-10 に 2 回、HEAD が動いていないまま次へ進みかけた。commit の後は `git log --oneline -1` で HEAD が新しいコミットか確かめる。止まったら grep せずに全文を読む
- `git push … | grep -v remote:` が空でも push できたとは限らない（rebase の失敗で push が走っていなかった）。`git log origin/develop -1` で確かめる
- Workflow の args に仮の文字列（`"__PARTS__"`）を入れたまま起動し、`parts.map is not a function` で即失敗した。配列はファイルから読んだ実物を JSON の値として渡す
- サブエージェントに「git 操作禁止」と書いても `git checkout --` を 1 回使われた（自分の編集を戻すため・実害なし）。報告に逸脱が書かれていたら差分を確かめる
- `npm run todo:add` は `--commit` 無しだと dry-run で、次の番号（例 `DN-0683`）を印字するだけで書かない。`| tail -1` で番号だけ見て 14 枚起票したつもりになった（2026-10-11）。起票の後は `git log origin/develop -1` か backlog の実体で確かめる。ツールの出力は `tail`/`grep` で削らず全文を読む。逆に `--commit` 付きは**手元ではなく origin/develop へ直接 push する**（手元の HEAD と backlog.md は動かない）。手元の HEAD だけ見て「書かれていない」と思い再実行し、同じカードを 2 枚起票した（2026-10-21・DN-0806/0807。重複は消した）
- `npm run todo:complete … --commit` は backlog.md・dispatch-log.json に加えて、週間計画に行があれば `.claude/todo/weekly.md` も書き換える。2 つだけ pathspec で commit して weekly.md を残し、develop の backlog-schema（weekly-ref）が赤になった（2026-10-12・DN-0654）。完了の後は `git status --short .claude/todo .claude/state/dispatch` で書き換わった全ファイルを見て commit する
- 実データ（計画 JSON など）を複製して作るテストは、後で同じ実データに書いた値を引き継ぐ。`salesAdjacencyReason` を計画に書いた直後に「理由が無ければ NG」のテストが落ち、develop が赤になった（2026-10-12・#1013）。複製したら検査対象の欄を先に消してから変える。仕様（cards.json）を消したら、同じ物を指す台帳（x-card-render.json）の行も同じコミットで消す
- `git status` の一覧から add するファイルを作らない。ローカルで `quality-audit` を回すと `.claude/state/quality/figure-crop-report.json`・`.claude/state/svg-audit.json` などを書き換え、一覧に紛れて自分の変更と一緒に commit した（2026-10-21・taxonomy PR。push 前に amend で外した）。add は自分が編集したファイルの一覧から作り、commit 後に `git show --stat HEAD` で入ったファイルを見る

**Why:** 緑に見える出力と実体の食い違いは、後から気づくほど手戻りが大きい（[[feedback_gate_zero_coverage_false_pass]] と同じ構造）。
**How to apply:** commit・push・rebase・Workflow 起動の直後に、HEAD・origin・args の実体を 1 回見る。
