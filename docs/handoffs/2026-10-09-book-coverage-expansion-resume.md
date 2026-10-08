# 2026-10-09 書籍の網羅の展開 — 週の利用上限で中断（再開の手順）

> [!note] 状態
> 2026-10-08 夜に、サブエージェント（Sonnet）が週の利用上限で止まった。リセットは 2026-10-11 19:00（日本時間）。リセット後にこの手順で再開する。終わったら、残りを DN-0591 に抽出してこのファイルを削除する。

## どこまで済んだか

- 判定は 26/27 冊で済んでいる。要約は `.claude/state/book-coverage.json`（PR #927 のブランチ）で、一覧は `npm run audit-reference-book-coverage -- --status`。
- 展開済みの棚:
  - 技術士: 21 記事。品質確認から develop へのコミットまで済んでいる（trailer `Book-Coverage`）。
  - コンクリート 4 冊・建設材料 1 冊: 以前に展開済み。
- 執筆まで済んで、品質確認（QA）の前に止まった 33 記事は、ブランチ `wip/book-coverage-expansion-2026-10-09`（d89df5df0）へ退避した。develop には入れていない（pre-commit も通していない）。
  - 1級・2級土木: 28 記事。
  - 土木実務: 3 記事（`textbook-coast-port`・`flood-season-river-work`・`earthquake-tsunami-site-response`）。
  - 執筆の途中で止まった 2 記事: `civil-construction-1/guide-structural-mechanics-basics`（新規）・`civil-construction-1/secondary-quality-management-basics`。この 2 本は書き直す。
- 未着手は 109 記事。
  - 1級・2級土木: 12 記事（`textbook-construction-business` を含む。逐語一致の書き直しだけの 3 本もここ）。
  - 土木実務: 24 記事。
  - 防災・業界: 65 記事。
  - DX・AI: 8 記事。
- 写真（案 46 枚）は未着手。

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
