# 2026-10-09 書籍の網羅の展開 — 週の利用上限で中断（再開の手順）

> [!note] 状態
> 2026-10-08 夜に、サブエージェント（Sonnet）が週の利用上限で止まった。リセットは 2026-10-11 19:00（日本時間）。リセット後にこの手順で再開する。終わったら、残りを DN-0591 に抽出してこのファイルを削除する。

## どこまで済んだか（2026-10-09 午後に更新）

- 上限は同日中に解け、Sonnet で再開した。
- 退避した 33 記事（`wip/book-coverage-expansion-2026-10-09`）は、QA から仕上げて develop へコミット済み。ブランチは不要になった。
- 1級・2級土木・土木実務の残り 35 記事もコミット済み。新規 9 記事のカリキュラム登録と逆向きのリンクも済んだ（6c24c3ed7）。
- `civil-construction-1/textbook-construction-business` の追記 42 件は、教科書に 19 件を残し、23 件を主題ごとの実務記事（新規の `civil-practice/subcontract-fair-dealing` を含む）へ判定の計画で振り分けた。
- 防災・業界・DX・AI の残り 73 記事（新規 21）を workflow 2 本（`tools/batch-r34-a.json`・`batch-r34-b.json`、`tools/expand-wf-v3.js`）で展開中。中断したら、コミットの有無（`git log --grep=書籍の網羅から追記`）で済んだ記事を外して、残りを同じ workflow で回す。
- 写真（案 46 枚）は未着手。
- 範囲外の既存の誤りは DN-0606（技術士）・DN-0618（1級土木）、逐語一致の残りは DN-0580、検査の改善は DN-0617。

## 再開の手順（Mac）

1. 道具（Mac の `.tmp/book-coverage/` に置いてある。git 管理外）:
   - 記事ごとの brief: `briefs/<資格>__<slug>.md`、QA 用の節の一覧: `.qa.md`
   - コミット用: `commit-article.sh`（排他・trailer・索引の作り直しつき）
   - workflow: `tools/expand-wf-v2.js`（後の段を先に回す版）
   - 対象の一覧: `tools/expand-items.json`・`tools/batch-r*.json`
   - 状態: `tools/resume-state.json`（`wip`・`partial`・`notStarted`）
2. 退避した 33 記事: `git checkout wip/book-coverage-expansion-2026-10-09 -- content/site/<資格>/<slug>` でメインツリーへ戻し、`git restore --staged` で stage を外す。そのうえで QA → 修正 → コミットの段から回す。執筆を回し直すと二重に追記するので、workflow の執筆の段は飛ばす（QA から始める版を用意する）。途中の 2 本は退避の版を捨てて、執筆から回す。
3. 未着手の 109 記事は、`tools/expand-wf-v2.js` に `batch-r*.json` の対象を渡して回す。同時に動かすのは 1 本の workflow で 3 体まで、workflow は 2 本まで。
4. 防災・業界の前に、`civil-construction-1/textbook-construction-business` に集まった追記 42 件の分け方を決める（建設業法の実務の新規記事に分けるか）。
5. 棚が終わるたびに、PR #927 の作業ツリーで `audit-reference-book-coverage -- --summary` を回して要約をコミットし、新規記事のカリキュラム登録と逆向きのリンクを入れる。範囲外の既存の誤りは起票する（技術士の分は DN-0606）。
6. 全部が終わったら写真の段に進む。`gen-article-photo` は台帳の JSON を書くので 1 枚ずつ回し、`ai-image-fidelity-auditor` で監査して `check-image-origin.mjs record-ai` で記録する。

## 注意

- メインツリーで `refresh-indexes` を回したり、pre-commit が生成物を作ったりすると、書きかけの記事まで生成物に入る。生成物は `commit-article.sh` が一時の作業ツリー（`.claude/worktrees/refresh-indexes-tmp`）で作り直す。
- 1 本目の workflow の失敗: 順番待ちを先着順で組んだので、全記事の執筆が並び、QA とコミットが後回しになった。`expand-wf-v2.js` は後の段を先に回すように直してある。
- 利用上限の目安: 技術士の 21 記事で、サブエージェント 82 体・約 1,170 万トークンを使った。
