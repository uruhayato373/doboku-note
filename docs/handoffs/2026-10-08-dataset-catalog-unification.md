# 2026-10-08 台帳を1つにして「DB のように扱う」— 方針の文書化と段階1の実装（引き継ぎ）

> [!note] 状態
> 運営者が「方針を文書化＋段階1を実装」を選んだ（2026-10-08）。まだ着手していない。抽出が終わったらこのファイルは削除する。

## 運営者の決定と要望
- DB は置かない（data-storage-decision.md の D1 不採用は維持）が、**DB のように扱えるデータ運用**にしたい。
- **すべて git か Drive で共有し、複数 PC で作業できること**。「手元だけ（local）」の置き場は作らない。
- `.claude/state/` を data/ へ物理的に集約する案は採らない。**台帳（`scripts/lib/datasets.mjs`）を1本にし、置き場は格納場所と割り切る**。

## やること
1. **方針の文書化**: `.claude/knowledge/reference/data-storage-decision.md` に追記（台帳1本・置き場は格納場所・公開できないものは Drive vault に置き台帳で宣言・local を作らない）。information-architecture.md の判断フローも1行合わせる。
2. **段階1の実装**（feature ブランチ＋PR・base=develop）:
   - `datasets.mjs` の `AREAS` に `.claude/state`（作業状態）を足し、git 管理下の557件（exam-keyword-cycles 288・pe-first-stage-audit 63・pe-essay-review 40・quality 28 など）を宣言。`check-datasets` が `.claude/state` も網羅するように。
   - 実体が Drive にあるものを宣言できるようにする（drive-vault.json の group と結ぶ欄。`local` の代わり）。
   - パスの直書き（`.claude/state` を参照するコード約124ファイル）は一度に直さず、ラチェットで段階的に減らす。
   - 最初の利用者: 書籍の網羅の結果。**見出しを含まない要約**＝git 管理・型付き（本ごとの判定件数・判定日・展開した記事とコミット）、**見出し入りの詳細**＝Drive vault（`原資料PDF/書籍/<id>__…/` の中）。
3. **段階2・3を backlog に起票**: 段階2 `npm run data -- list/get/query <id>`（SELECT 相当・管理画面からも）、段階3 参照（資格 id・商品 id・記事 slug）を台帳に宣言し汎用の参照整合検査へ（外部キー相当）。

## 現在の状態（2026-10-08 時点）
- コンクリート系5冊の網羅→展開は完了。22記事（追記20・新規2）を develop へ push 済み。sources 宣言 24/24、逐語一致 0、AI 写真 49/49 合格。
- **網羅の詳細は、この Mac の `.claude/state/book-coverage/` にしかない**（`<id>.json`＝候補表・`<id>.verdict.json`＝意味判定、5冊分）。段階1で Drive vault へ移して台帳に登録する。git 管理外（PR #927 の `.gitignore`）。
- 展開の作業ファイル（brief・指示書）は `.tmp/book-coverage/`（破棄してよい。手順は content-taxonomy.md §7 と memory `project_book_to_guide_expansion` に記録済み）。
- **PR #927**（`audit-reference-book-coverage` スクリプト・feat/book-coverage-audit・worktree `.claude/worktrees/book-coverage-audit`）は open。knip・gate-parity は修正 push 済み。develop 側の image-assets 容量超過は修正済み（PR #928、複雑な試験図1枚を容量例外へ追加・検査合格）。マージは運営者の判断。段階1の実装で出力先と `.gitignore` の扱いを変えるので、PR #927 のマージ後に着手するか、同じブランチに積むかを最初に決める。
- 関連カード: DN-0580（1級土木の既存4記事の逐語一致80件）。
