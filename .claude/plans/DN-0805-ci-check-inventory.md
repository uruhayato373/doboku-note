---
taskId: DN-0805
type: implementation-plan
createdAt: 2026-10-21
deleteOnComplete: true
---

# DN-0805 検査の棚卸し材料

## 判断（2026-10-21・運営者「全て推奨案で」）

- **退役**: public-bloat（build の prebuild が同じ検査を必ず回す）・frequent-topics（generated-indexes が refresh-indexes を丸ごと回す）を quality-audit から外した。generated-indexes の退役は DN-0804（生成物の追跡をやめる）の完了が前提なので、それまで残す。
- **格下げ**: knip-ratchet・review-wiring・x-card-render・codex-compat・x-review を ci から ops（日次 ops-audit → automation-failure Issue）へ。「週次の報告」は読み手が無いので ops にした。pre-commit の同名の検査（x-review・knip-ratchet・review-wiring）は別の一覧なので commit 前では引き続き止まる。
- **統合（束ねる）**: admin-ui（3）・workflow-static（3）・sns-urls（3）・report-generators（11）を quality-audit の `steps` で 4 項目に。実行する内容は変えていない。
- **統合（二重の実データのテストを外す）**: project-task-refs・orphan-ogp（2 本）・content-series・topic-wiring（ファイルごと）・qualification-market・backlog-schema（2 本）。検査と pre-commit が同じ判定を回す。youtube-authority-metadata は通常動画まで見ていて youtube-shorts の検査と範囲が同じと言い切れないので残した。
- **見送り**: standards-data の quality-audit 側（`tests/e2e-execution.test.mjs` が「CI で生成漏れを飛ばさない」意図で固定している）。information-architecture・content-layout は保留のまま（定義の追随と移行完了の確認が先）。
- **残す 112 本**: 案どおり（コンテンツ品質・台帳整合・本番 SSR は対象外）。
（Pre-merge check の失敗実績 2026-09-14〜10-20）

- 対象の実行数: **650**（develop への push の失敗 305 + base が develop の pull_request の失敗 345）。base が main の PR の失敗 18 件（develop→main の昇格 PR）は集計から除いた（failures.json の runs には残してある）
- ログを取れた実行: **649** / 取れなかった実行: **1**（run 36953791939。PR #817 の 14 分かかった実行で `gh run view --log-failed` が "log not found"。ジョブも空で、検査名は取れない。0 件に混ぜず別に数えた）
- 期間は UTC の作成日で 2026-09-14〜2026-10-20（最初の実行 09-14 00:12Z・最後 10-20 23:26Z）。PR の base は `gh pr list --state all` の headRefName と作成時刻で突き合わせた（PR の実行の pull_requests 欄は空のため）。再実行（run_attempt>1）は 1 件、取り消し(cancelled)は失敗に含まない

## 読み方と限界

- **失敗実行数** = その検査が [FAIL] で落ちた実行の数（push + PR）。同じ実行内の重複行は 0 件を確認した。**失敗回数(エピソード)** = develop への push で、同じ検査の連続した赤を 1 回と数えた回数。直しの中身を見立てる単位はこちら。
- **見立て R/H/B/F/U** は develop push のエピソード単位。R=本物の不具合（読者・本番・データに実害のある誤りを止めた）／H=規約・衛生の逸脱（ラチェット超過・上限超過。実害は無いが規約どおり止めた）／B=帳簿合わせ（生成物のコミット漏れ・台帳登録・基準値・参照・時刻依存）／F=誤検知（検査・テスト側を直した／タイムアウト）／U=不明。
- 直しの特定は「最後に赤だった push の sha」から「その検査が赤でなかった次の push（成功、または別の検査だけが赤）」までのコミットを `git log` で見て、メッセージと失敗ログの中身（違反の種類）で判定した。cancel-in-progress で途中の実行が取り消されると 1 つの区間に多数のコミットが入り、直しを特定できず U にした。
- **PR の失敗は中身を分類していない**（直しは PR ブランチの次のコミットだが、`Merge origin/develop` のように「develop 側が赤かった」ものが混ざり、判別に手がかかるため）。PR の失敗は件数と、直しの次コミットの例だけを failures.json に入れた。したがって R/H/B/F/U は **develop push 305 件分**の見立てで、PR 345 件は含まない。
- 9/14 00:12Z の「7 検査同時赤」(unit-tests・local-resources・content-quality-ratchet・video-publication・claude-md-size・youtube-cover-handoff・knip-ratchet)は develop が赤のまま 7 実行続き、PR #507 の統合(e939a3368)で解消した 1 事象で、検査ごとの失敗数を押し上げている。10/16〜10/18 の standards 系 PR の orphan-ogp 30 連続赤も 1 事象。
- 区分(対象外): C=コンテンツ品質のゲート／L=台帳とデータの整合／S=本番 SSR／T=その他(対象)。C・L・S の検査は案が「残す」になる（二重実行の解消だけは統合として別に書く）。本番 SSR(check-production-ssr)は CI の検査ではないため表に出ない。

## 全体の数字

- develop push の赤の区間(エピソード、検査ごと)の見立て: R 14 / H 8 / B 57 / F 2 / U 42（unit-tests の行を除く検査単位の合計。unit-tests はテスト名単位で下の表に別掲）
- 失敗した検査: 52 種（ci:true 51・ops 1(membership-drip)）。quality-audit の ci:true は 145 本なので、**期間中 1 回も落ちなかった ci:true は 94 本**（うち追加から 14 日未満 9 本）
- 検査の定義: quality-audit の CHECKS 182 本（ci:true 145 / ops 20 / report 17）。期間中に追加された検査は 72 本
- 検査名を持たない失敗(build ジョブ・書き戻しジョブ等): 9 実行（下の表）

## 1. 検査ごとの失敗実績（落ちた 52 種）

| 検査 | tier | 区分 | 失敗実行数 (push/PR) | 失敗回数(エピソード) | 単独赤 | 初回 | 最後 | 代表 run | 見立て (R H B F U) | 案 |
|---|---|---|---|---|---|---|---|---|---|---|
| unit-tests | ci | T | 322 (161/161) | 36 | 94 | 09-14 | 10-20 | 34919474333 | テスト名別の表を参照 | 統合 |
| video-publication | ci | L | 110 (58/52) | 4 | 65 | 09-14 | 10-18 | 37895112203 | R0 H0 B3 F0 U1 | 残す |
| project-task-refs | ci | L | 51 (30/21) | 8 | 0 | 09-24 | 10-10 | 35953725037 | R0 H0 B8 F0 U0 | 残す |
| content-quality-ratchet | ci | C | 42 (12/30) | 3 | 6 | 09-14 | 10-06 | 34791931544 | R0 H3 B0 F0 U0 | 残す |
| knip-ratchet | ci | T | 41 (7/34) | 1 | 17 | 09-14 | 10-09 | 34791931544 | R0 H1 B0 F0 U0 | 格下げ(週次報告) |
| orphan-ogp | ci | L | 39 (34/5) | 5 | 5 | 10-06 | 10-18 | 37538560702 | R0 H0 B5 F0 U0 | 統合 |
| coconala-wiring | ci | L | 38 (19/19) | 2 | 16 | 09-25 | 09-29 | 36137798438 | R0 H0 B1 F1 U0 | 残す |
| image-assets | ci | C | 36 (21/15) | 4 | 22 | 09-30 | 10-08 | 36677128205 | R0 H1 B2 F0 U1 | 残す |
| magazine-membership | ci | L | 35 (17/18) | 4 | 6 | 09-15 | 10-05 | 35331720130 | R1 H0 B3 F0 U0 | 残す |
| youtube-cover-handoff | ci | L | 32 (7/25) | 1 | 0 | 09-14 | 10-15 | 34791931544 | R0 H0 B1 F0 U0 | 残す |
| generated-indexes | ci | L | 31 (13/18) | 9 | 18 | 09-30 | 10-20 | 37005262130 | R0 H0 B9 F0 U0 | 退役 |
| coconala-blog | ci | C | 28 (15/13) | 2 | 5 | 09-21 | 10-03 | 36530071224 | R2 H0 B0 F0 U0 | 残す |
| note-paid-cta | ci | C | 25 (11/14) | 3 | 19 | 09-18 | 10-01 | 36810474472 | R2 H0 B0 F0 U1 | 残す |
| youtube-shorts | ci | C | 20 (8/12) | 1 | 4 | 10-08 | 10-18 | 39004552100 | R1 H0 B0 F0 U0 | 残す |
| qualification-market | ci | L | 20 (8/12) | 3 | 1 | 10-11 | 10-14 | 38114352678 | R0 H0 B3 F0 U0 | 残す |
| local-resources | ci | T | 19 (7/12) | 1 | 0 | 09-14 | 09-14 | 34791931544 | R1 H0 B0 F0 U0 | 残す |
| content-registry | ci | L | 17 (8/9) | 1 | 4 | 10-17 | 10-18 | 39004552100 | R1 H0 B0 F0 U0 | 残す |
| membership-drip | ops | T | 14 (2/12) | 1 | 13 | 09-16 | 09-17 | 35201045216 | R0 H0 B1 F0 U0 | 済(ops へ移行) |
| review-wiring | ci | T | 13 (6/7) | 2 | 13 | 09-28 | 10-20 | 36494455714 | R0 H0 B2 F0 U0 | 格下げ(週次報告) |
| content-series | ci | L | 12 (8/4) | 4 | 0 | 10-15 | 10-16 | 38675161289 | R0 H0 B4 F0 U0 | 残す |
| command-guidance | ci | T | 12 (1/11) | 1 | 1 | 09-21 | 10-16 | 38367822190 | R1 H0 B0 F0 U0 | 残す |
| topic-wiring | ci | C | 11 (7/4) | 1 | 0 | 10-15 | 10-15 | 38687973365 | R1 H0 B0 F0 U0 | 残す |
| figure-crop-integrity | ci | C | 11 (9/2) | 2 | 11 | 10-06 | 10-11 | 37463664051 | R2 H0 B0 F0 U0 | 残す |
| gate-parity | ci | T | 10 (5/5) | 1 | 2 | 09-14 | 10-19 | 39199842318 | R0 H0 B1 F0 U0 | 残す |
| magazine-cta-reachability | ci | C | 9 (5/4) | 1 | 7 | 10-10 | 10-17 | 38056045900 | R0 H0 B0 F0 U1 | 残す |
| keiken-answer-split | ci | C | 9 (6/3) | 1 | 8 | 10-08 | 10-08 | 37843339266 | R0 H0 B0 F0 U1 | 残す |
| note-funnel | ci | C | 9 (2/7) | 1 | 4 | 09-15 | 10-01 | 35807495232 | R0 H0 B0 F0 U1 | 残す |
| backlog-schema | ci | L | 8 (7/1) | 4 | 1 | 09-17 | 10-13 | 38215863615 | R0 H0 B4 F0 U0 | 残す |
| katex-warnings | ci | C | 8 (4/4) | 1 | 8 | 10-02 | 10-06 | 37316463462 | R1 H0 B0 F0 U0 | 残す |
| domains | ci | L | 7 (4/3) | 1 | 1 | 10-08 | 10-15 | 38707479958 | R0 H0 B1 F0 U0 | 残す |
| claude-md-size | ci | T | 7 (3/4) | 1 | 0 | 09-14 | 09-14 | 34791931544 | R0 H1 B0 F0 U0 | 残す |
| x-review | ci | T | 6 (1/5) | 1 | 2 | 09-27 | 10-03 | 37155200635 | R0 H0 B1 F0 U0 | 格下げ(ops 日次) |
| git-binary-policy | ci | T | 5 (2/3) | 2 | 3 | 09-18 | 10-16 | 35333956268 | R0 H1 B1 F0 U0 | 残す |
| egov-links | ci | L | 5 (2/3) | 1 | 0 | 10-15 | 10-15 | 38677747844 | R0 H0 B1 F0 U0 | 残す |
| datasets | ci | L | 4 (1/3) | 1 | 4 | 10-07 | 10-09 | 37557713792 | R0 H0 B1 F0 U0 | 残す |
| relative-links | ci | T | 3 (3/0) | 2 | 3 | 10-08 | 10-10 | 37743523434 | R0 H0 B2 F0 U0 | 残す |
| products | ci | L | 3 (0/3) | 0 | 0 | 10-05 | 10-05 | 37266935604 | PR のみ・未分類 | 残す |
| admin-ui-debt | ci | T | 3 (1/2) | 1 | 2 | 09-28 | 09-29 | 36512704896 | R0 H1 B0 F0 U0 | 統合 |
| sns-landing-cta | ci | C | 2 (0/2) | 0 | 2 | 10-02 | 10-20 | 37004361172 | PR のみ・未分類 | 残す |
| x-card-render | ci | T | 2 (2/0) | 2 | 1 | 10-12 | 10-20 | 39373752197 | R0 H0 B2 F0 U0 | 格下げ(週次報告) |
| orphan-figures | ci | C | 2 (1/1) | 1 | 2 | 10-07 | 10-07 | 37613743896 | R1 H0 B0 F0 U0 | 残す |
| script-imports | ci | T | 2 (0/2) | 0 | 1 | 09-25 | 09-27 | 36313595111 | PR のみ・未分類 | 残す |
| table-references | ci | C | 1 (0/1) | 0 | 1 | 10-18 | 10-18 | 39172045437 | PR のみ・未分類 | 残す |
| validate-mdx | ci | C | 1 (1/0) | 1 | 0 | 10-14 | 10-14 | 38488468339 | R0 H0 B0 F1 U0 | 残す |
| note-meta-lint | ci | C | 1 (0/1) | 0 | 1 | 10-11 | 10-11 | 38100020458 | PR のみ・未分類 | 残す |
| workflow-publish-ref | ci | T | 1 (0/1) | 0 | 0 | 10-08 | 10-08 | 37769829637 | PR のみ・未分類 | 統合 |
| workflow-hygiene | ci | T | 1 (0/1) | 0 | 0 | 09-29 | 09-29 | 36643359737 | PR のみ・未分類 | 統合 |
| note-cover-tokens | ci | L | 1 (1/0) | 1 | 0 | 09-29 | 09-29 | 36573338497 | R0 H0 B1 F0 U0 | 残す |
| svg-audit | ci | C | 1 (0/1) | 0 | 1 | 09-18 | 09-18 | 35407294255 | PR のみ・未分類 | 残す |
| type-check | ci | T | 1 (0/1) | 0 | 0 | 09-18 | 09-18 | 35407282433 | PR のみ・未分類 | 残す |
| eslint | ci | T | 1 (0/1) | 0 | 0 | 09-18 | 09-18 | 35407282433 | PR のみ・未分類 | 残す |
| playwright-auth-wiring | ci | T | 1 (0/1) | 0 | 0 | 09-14 | 09-14 | 34804758578 | PR のみ・未分類 | 残す |

補足: 「単独赤」は、その実行で落ちた検査がその 1 つだけ(unit-tests を 1 検査と数える)だった実行の数。値が小さい検査は他の検査と同時に落ちている＝同じ事象で赤くなった。

### 1-1. 赤の区間ごとの見立て（develop push・unit-tests 以外）

| 検査 | 開始(UTC) | 連続実行 | 見立て | 理由と直しのコミット |
|---|---|---|---|---|
| video-publication | 09-14T00:12 | 7 | B | V02: 公開済みなのに照合記録が無い（記録の追従） ← e939a3368 Merge pull request #507 from uruhayato373/codex/re ほか9件 |
| video-publication | 10-09T06:44 | 4 | B | V02: 同上（shorts[1]） ← c6b4815e6 content(civil-practice): 入札・契約方式と下請取引のルールの新規 2 記事を ほか5件 |
| video-publication | 10-12T22:57 | 43 | B | V05: YouTube 側で動画が消えた（承認済みの 688 本削除）。台帳の reconcile と「停止した公開は未配分でよい」の検査側修正（fcaa56668）で解消。外部状態依存で、DN-0791（10-20）で V05 を ops へ移し済み ← fcaa56668 test(youtube): allow stopped publications to remai ほか2件 |
| video-publication | 10-17T04:58 | 4 | U | 直しが特定できない（同時に content-registry・youtube-shorts が赤） ← 30032c794 chore(todo): DN-0398 の照合結果（公開題名は 2 本とも旧表現・1級はカバーも旧 ほか3件 |
| project-task-refs | 09-24T03:59 | 1 | B | 閉じたカード・削除したカードの DN 参照の置換や復元（台帳の掃除） ← 57037a132 todo: DN-0292 を DN-0294（PDF なし 169 本・9/24 夜に実行）と D |
| project-task-refs | 09-24T12:35 | 3 | B | 閉じたカード・削除したカードの DN 参照の置換や復元（台帳の掃除） ← 613f0d4ca fix(ci): 閉じた DN-0299 の参照と会員マガジンの snapshot を今夜の作業に合 |
| project-task-refs | 09-25T06:29 | 15 | B | 閉じたカード・削除したカードの DN 参照の置換や復元（台帳の掃除） ← 9e6d81a40 docs(marketing): 07b の廃止済み DN-0282 参照を出品結果の記述に置き換え |
| project-task-refs | 09-27T09:22 | 4 | B | 閉じたカード・削除したカードの DN 参照の置換や復元（台帳の掃除） ← c78470e73 fix: develop の CI 失敗 2 件を直す（公務員ハブの文末 3 連続・13 が閉じた  |
| project-task-refs | 09-28T07:41 | 3 | B | 閉じたカード・削除したカードの DN 参照の置換や復元（台帳の掃除） ← 95de47a25 todo: 誤って削除した DN-0400・DN-0115・DN-0393 を戻す |
| project-task-refs | 09-30T10:36 | 1 | B | 閉じたカード・削除したカードの DN 参照の置換や復元（台帳の掃除） ← ed9f4a8f4 docs: 完了して削除したカード（DN-0405・DN-0365）への参照を完了記録へ置換 ほか2件 |
| project-task-refs | 10-08T04:50 | 1 | B | 閉じたカード・削除したカードの DN 参照の置換や復元（台帳の掃除） ← ae04fca17 docs(handoff): 台帳の一本化の引き継ぎを削除する（段階1は PR #927 に実装、段 ほか8件 |
| project-task-refs | 10-10T13:11 | 2 | B | 閉じたカード・削除したカードの DN 参照の置換や復元（台帳の掃除） ← cb2de90b2 review: 月次レポート 2026-09 から、台帳に無いカード（DN-0303・DN-0621 ほか1件 |
| content-quality-ratchet | 09-14T00:12 | 7 | H | 文末単調（15-1）の baseline 超過。9/14 起点の 7 検査同時赤の一部（PR #507 の統合で解消） ← e939a3368 Merge pull request #507 from uruhayato373/codex/re ほか9件 |
| content-quality-ratchet | 09-22T09:58 | 1 | H | 出典脚注の 1 文 143 字を 3 文へ分割（c8a211b48）。文体規約 ← c8a211b48 fix(rccm): 出典脚注の 1 文 143 字を 3 文へ分割する ほか2件 |
| content-quality-ratchet | 09-27T09:22 | 4 | H | 公務員ハブの文末 3 連続を直した（c78470e73）。文体規約 ← c78470e73 fix: develop の CI 失敗 2 件を直す（公務員ハブの文末 3 連続・13 が閉じた  |
| knip-ratchet | 09-14T00:12 | 7 | H | Unlisted binaries 2（baseline 0）。9/14 起点の 7 検査同時赤（PR #507 の統合で解消） ← e939a3368 Merge pull request #507 from uruhayato373/codex/re ほか9件 |
| orphan-ogp | 10-06T22:07 | 1 | B | 章 OGP の退避台帳・R2 供給の追従（ogp-supply の bot コミットが間に入って解消） ← da2d5f1ac chore(todo): Kindle の EPUB・表紙を Git から出すカードを起票（DN-0 ほか1件 |
| orphan-ogp | 10-09T06:00 | 1 | B | 章 OGP の退避台帳・R2 供給の追従（ogp-supply の bot コミットが間に入って解消） ← c3d7018a7 content(civil-construction-1/textbook-sabo-landsli ほか40件 |
| orphan-ogp | 10-11T04:50 | 1 | B | 章 OGP の退避台帳・R2 供給の追従（ogp-supply の bot コミットが間に入って解消） ← c08d5b071 todo: DN-0680・DN-0674・DN-0678 に着手する（claim） ほか1件 |
| orphan-ogp | 10-16T01:27 | 30 | B | 章 OGP の退避台帳・R2 供給の追従（ogp-supply の bot コミットが間に入って解消） ← 6f7ced990 Merge pull request #1092 from uruhayato373/feat/st ほか20件 |
| orphan-ogp | 10-18T22:02 | 1 | B | 章 OGP の退避台帳・R2 供給の追従（ogp-supply の bot コミットが間に入って解消） ← 09a761f9c Merge pull request #1122 from uruhayato373/feat/st ほか18件 |
| coconala-wiring | 09-25T07:35 | 15 | B | 商品画像 4 件を Drive vault 台帳へ登録（1afb73f97） ← 1afb73f97 state(assets): 2級経験記述4件の商品画像を Drive vault 台帳へ登録し c |
| coconala-wiring | 09-29T01:01 | 4 | F | 検査を承認済み POP 画像から見る形に直した（3f2efc535）。検査側の修正 ← a7178d305 Merge pull request #713 from uruhayato373/fix/coco ほか1件 |
| image-assets | 09-30T06:13 | 2 | B | 画像サイズ基準の更新（6ac95602f: 基準を実サイズへ） ← dc18e69cc state(note): 2級土木91記事・1級3記事・1級2級共通の無料5記事の反映記録 ほか1件 |
| image-assets | 09-30T07:53 | 7 | U | SVG 2 枚が 10KB 超過。直しは圧縮か基準更新かが 16 コミット混在の PR 統合で特定できない ← 9c8565c22 state(note): 会員特典マガジンへ直前総点検を収録したのでライブ snapshot を更新 ほか16件 |
| image-assets | 10-07T22:26 | 9 | B | 詳細図に限定した例外を登録（e5df3a4bc） ← bea95cb53 Merge pull request #928 from uruhayato373/codex/af ほか3件 |
| image-assets | 10-08T22:28 | 3 | H | 展開で作った図 2 枚を 10KB 上限へ収め直した（7a9d56d68）。規約逸脱の是正 ← de7f5bc57 content(civil-construction-1/textbook-rebar-formwo ほか6件 |
| magazine-membership | 09-18T09:51 | 1 | B | 価格に件数表記の無い 2 商品が未照合（台帳の記載漏れ） ← 80813e014 fix(lifecycle,kdp): kindle status 'ready' を review ほか37件 |
| magazine-membership | 09-24T10:53 | 7 | B | 会員マガジンの snapshot を作業に合わせて更新（613f0d4ca） ← 613f0d4ca fix(ci): 閉じた DN-0299 の参照と会員マガジンの snapshot を今夜の作業に合 |
| magazine-membership | 09-25T12:36 | 3 | R | 軸D（束ね商品の記事 key 包含）が まるごとパック 68 本の漏れを検出（6f9eda90a・PR #641 で収録を直した） ← fdfbe5b4e Merge pull request #641 from uruhayato373/feature/ ほか1件 |
| magazine-membership | 09-30T08:13 | 6 | B | ライブ snapshot の更新（9c8565c22） ← 9c8565c22 state(note): 会員特典マガジンへ直前総点検を収録したのでライブ snapshot を更新 ほか16件 |
| youtube-cover-handoff | 09-14T00:12 | 7 | B | Drive 台帳に載っていない承認済みカバー 346 件を台帳へ復元（3effaf1f5） ← e939a3368 Merge pull request #507 from uruhayato373/codex/re ほか9件 |
| generated-indexes | 10-02T12:11 | 1 | B | 生成物（索引・カタログ・llms.txt・演習データ）のコミット漏れ。直しは refresh-indexes の再実行 ← dcfeac88e chore(note): 2級土木 施工経験記述の値上げ（EXP-013）を記事カタログ note- |
| generated-indexes | 10-02T12:34 | 1 | B | 生成物（索引・カタログ・llms.txt・演習データ）のコミット漏れ。直しは refresh-indexes の再実行 ← b9133f069 Merge pull request #836 from uruhayato373/codex/ct ほか7件 |
| generated-indexes | 10-06T05:26 | 1 | B | 生成物（索引・カタログ・llms.txt・演習データ）のコミット漏れ。直しは refresh-indexes の再実行 ← 6bbd61afd fix(state): note 記事カタログに 2級の無料下書き 2 本を足す（5cf185c9a ほか2件 |
| generated-indexes | 10-08T13:20 | 1 | B | 生成物（索引・カタログ・llms.txt・演習データ）のコミット漏れ。直しは refresh-indexes の再実行 ← 94940f827 chore(indexes): 展開した記事に合わせて静的インデックスを作り直す（refresh-i ほか2件 |
| generated-indexes | 10-11T02:17 | 2 | B | 生成物（索引・カタログ・llms.txt・演習データ）のコミット漏れ。直しは refresh-indexes の再実行 ← 7c8b8119b todo: DN-0666 を起票する（書籍の展開で触った 24 記事の SEO を GSC に沿っ ほか3件 |
| generated-indexes | 10-13T02:59 | 2 | B | 生成物（索引・カタログ・llms.txt・演習データ）のコミット漏れ。直しは refresh-indexes の再実行 ← 0e97c2972 config(reference-sources): 国交省のコンクリートの品質確保の通知（国官技第 ほか4件 |
| generated-indexes | 10-13T08:02 | 2 | B | 生成物（索引・カタログ・llms.txt・演習データ）のコミット漏れ。直しは refresh-indexes の再実行 ← 2f9b0f377 feat(egov-laws): 法令の台帳に e-Gov の法令 ID を持たせ、リンクと改正を照 |
| generated-indexes | 10-15T06:35 | 2 | B | 生成物（索引・カタログ・llms.txt・演習データ）のコミット漏れ。直しは refresh-indexes の再実行 ← d92862291 config(content-series): 写真 8 枚の置き場を台帳の計画に書き、補強を終えた ほか9件 |
| generated-indexes | 10-15T07:15 | 1 | B | 生成物（索引・カタログ・llms.txt・演習データ）のコミット漏れ。直しは refresh-indexes の再実行 ← c10c9f8b9 chore(indexes): 第4波の 4 本のタグの追加に合わせて静的インデックスを作り直す（r ほか1件 |
| coconala-blog | 09-29T06:14 | 13 | R | 模試ブログ 2 本の送客先が休止した商品を指していた。読者を行き止まりに送る ← 7780317dd coconala(blog): 模試ブログ2本の送客先を、休止した模試PDFから全3テーマ添削へ付け |
| coconala-blog | 09-29T12:48 | 2 | R | 同上（全 15 記事の送客を添削・骨子へ揃えた 40c4dfe7f） ← 40c4dfe7f coconala blog: 全15記事の送客を添削・骨子の2本に揃え、休止したPDFへの送客をやめ |
| note-paid-cta | 09-18T10:17 | 1 | R | 有料記事 3 本のもくじ CTA が無料プレビュー外（a81761771）。購入導線の欠落 ← a81761771 fix(ci): pack-lineup 着地で赤になった 2 ゲートを解消（有料記事 3 本のもく ほか2件 |
| note-paid-cta | 09-29T23:11 | 1 | U | 直しが state(note) を含む 10 コミットの統合に埋もれて特定できない ← aa41f7361 state(note): 手動反映の記録を残し、保存前に止まった6件を実査のうえ解除する ほか10件 |
| note-paid-cta | 10-01T03:25 | 9 | R | 主任技士の有料 5 本の無料域にもくじ導線を入れた（PR #790）。購入導線の欠落 ← f9db85467 feat(cce): 主任技士 小論文を令和形式テーマ別へ一本化し、削除した旧版の商品・導線を片付け |
| youtube-shorts | 10-17T04:58 | 8 | R | 2 級シリーズ 9 本の概要欄に制作（AI 補助）の表記が無かった。入れ直した ← d12d676af Merge pull request #1112 from uruhayato373/fix/you ほか5件 |
| qualification-market | 10-11T02:40 | 1 | B | 売上 1 件の資格分類を確定（1d5f0d773） ← 7c8b8119b todo: DN-0666 を起票する（書籍の展開で触った 24 記事の SEO を GSC に沿っ ほか3件 |
| qualification-market | 10-11T03:55 | 6 | B | カタログ id を売上台帳の bk-* 系統へ寄せた（f4e8fb080） ← 40c0f32fc Merge pull request #992 from uruhayato373/work3 ほか6件 |
| qualification-market | 10-14T00:08 | 1 | B | 10/12 の売上を商品へ結び付けた（20703f0ac） ← 20703f0ac fix(sales): 建設部門 口頭試験対策の 10/12 の売上を商品へ結び付け、develop |
| local-resources | 09-14T00:12 | 7 | R | ダウンロード競合（部分ファイルの破損拒否）を直した（bdca4f467） ← e939a3368 Merge pull request #507 from uruhayato373/codex/re ほか9件 |
| content-registry | 10-17T04:58 | 8 | R | 改訂候補の素材追加で公開行の最終承認が無効になった（docs/incidents 2026-10-15）。承認し直した ← d12d676af Merge pull request #1112 from uruhayato373/fix/you ほか5件 |
| membership-drip | 09-17T08:41 | 2 | B | 配信予定日を過ぎた未配信。壁時計依存（PR #520 で ops へ移した） ← 374d028cc Merge pull request #520 from uruhayato373/feat/ci- ほか8件 |
| review-wiring | 09-28T22:47 | 5 | B | 週次の note 点検の配線正本を置き換え（173aa0af2） ← 58f48afe2 Merge pull request #705 from uruhayato373/fix/revi ほか1件 |
| review-wiring | 10-20T04:25 | 1 | B | 配線正本に check-drive-vault を足した（2f50e3930） ← 2f50e3930 fix(ops): 週次レビューの配線正本に check-drive-vault を足す（devel |
| content-series | 10-15T03:13 | 1 | B | 新しい章・法令・事実を台帳（カリキュラム・e-Gov の写し）に登録し忘れ ← d7505db66 content(civil-practice): 既存の実務記事 9 本から第2波の 8 本へつなぎ ほか20件 |
| content-series | 10-15T03:43 | 2 | B | 新しい章・法令・事実を台帳（カリキュラム・e-Gov の写し）に登録し忘れ ← 0bb521b03 content(civil-practice): 既存の実務記事 9 本から第3波の 8 本へつなぎ ほか21件 |
| content-series | 10-15T05:51 | 1 | B | 新しい章・法令・事実を台帳（カリキュラム・e-Gov の写し）に登録し忘れ ← 41351387f chore(todo): 推奨案の採用を反映する（DN-0348・0705・0709 完了、DN-0 ほか32件 |
| content-series | 10-16T04:16 | 4 | B | 新しい章・法令・事実を台帳（カリキュラム・e-Gov の写し）に登録し忘れ ← ca3ed6522 chore(series): DN-0753 の13章の図と写真の計画（47件）を台帳に入れ、執筆で ほか19件 |
| command-guidance | 10-13T08:13 | 1 | R | 実在しないコマンドの案内（2f9b0f377 の feat 内で直した） ← 2f9b0f377 feat(egov-laws): 法令の台帳に e-Gov の法令 ID を持たせ、リンクと改正を照 |
| topic-wiring | 10-15T05:39 | 7 | R | 第 4 波の 4 本が topic へつながるタグを欠き、検索だけに孤立（968b55e1c） ← 968b55e1c fix(civil-practice): 第4波の 4 本に topic へつながるタグを足し、de |
| figure-crop-integrity | 10-06T12:29 | 6 | R | 図の写り込み（山留工概略図）を切り出し直した（3a60a5923） ← 024b1749e test(sync-index): pre-commit を模したフックの sed -i を mac ほか7件 |
| figure-crop-integrity | 10-11T01:56 | 3 | R | 図の上端に残った切れ端を切り落とした（c0b2340a6） ← c0b2340a6 content(civil1): 平成18年度 問題B No.12 の図の上端に残った切れ端を切り落 |
| gate-parity | 10-19T04:30 | 5 | B | 新規検査の配線・ラチェット基準の取り込み漏れ（2a3f57d6d） ← 43fbde8f9 Merge pull request #1128 from uruhayato373/feature ほか8件 |
| magazine-cta-reachability | 10-10T13:18 | 5 | U | サイトから到達できない公開マガジン 1 件（cd-problem-a-pack）。CTA 追加か baseline 登録かが特定できない ← afa1c8bb6 chore(book-coverage): コンクリート 5 冊の展開後に要約を作り直す（5 冊とも ほか36件 |
| keiken-answer-split | 10-08T20:57 | 6 | U | A〜E の違反 1 件。ログに中身が出ておらず直しも特定できない ← 3082cc085 chore(indexes): 展開した記事に合わせて静的インデックスを作り直す（refresh-i ほか18件 |
| note-funnel | 09-23T01:43 | 2 | U | 冒頭パック CTA の対象外にする修正。記事側の直しか検査の除外かが特定できない（825320235） ← 825320235 fix(note): 第2波の転職 note 5 本を冒頭パック CTA の対象外にする ほか4件 |
| backlog-schema | 09-27T06:54 | 1 | B | 手書き起票の DN 重複を振り直し ← 30f2fe572 docs(todo): 手書きメモ起票分の ID 重複を DN-0370〜0373 へ振り直す |
| backlog-schema | 09-29T05:49 | 1 | B | DN 重複の解消・付け替え ← d40cdd370 todo: DN-0442 の重複を解消し、2級直前のカードを DN-0445 に付け替える |
| backlog-schema | 10-12T07:05 | 1 | B | 完了カードの行を weekly.md から消し忘れ ← e9e91fafc todo: 週間計画から完了した DN-0654 の行を消す（DN-0654 の完了コミットで漏れた |
| backlog-schema | 10-13T13:39 | 4 | B | weekly.md に残った DN-0643 の行（バックログに無いカード） ← cf05e924d chore(registry): reflect approved deletion of 688  |
| katex-warnings | 10-05T13:23 | 4 | R | ブロック数式の区切りに単独 $（build が \text{} を壊す）。記事の実害 ← 292f6cd28 fix(scripts): Windows の CRLF 作業ツリーで build-quiz-dat ほか1件 |
| domains | 10-15T08:41 | 4 | B | 文書・事実ファイルの領域登録漏れ（805264cd0） ← 805264cd0 fix(config): 技術士上下水道部門の note にテーマを付け、建設材料の事実ファイルの領 |
| claude-md-size | 09-14T00:12 | 3 | H | CLAUDE.md が 323 行（上限 150）に戻っていた。9/14 起点の 7 検査同時赤（PR #507 の統合で解消） ← 2adf1042b Merge pull request #504 from uruhayato373/feat/age ほか7件 |
| x-review | 10-03T21:28 | 1 | B | 移した主任技士 1 本をレビュー期間内へ移し直し（6ca1aea52）。予定・時刻の食い違い ← 720b2c0d2 content(coconala-blog): 1級二次後、経験記述ブログ12本の送客先を2級の全3 ほか1件 |
| git-binary-policy | 09-18T10:17 | 1 | H | 追跡 blob の budget 超過 1 件（baseline 0）。pack-lineup 着地の同時赤 ← a81761771 fix(ci): pack-lineup 着地で赤になった 2 ゲートを解消（有料記事 3 本のもく ほか2件 |
| git-binary-policy | 10-16T05:05 | 1 | B | content/site の追跡総量の上限を 140→150 MiB に上げた（c83c09bff） ← c83c09bff chore(policy): content/site の追跡総量の上限を140→150 MiB に ほか16件 |
| egov-links | 10-15T03:43 | 2 | B | 記事が引く法令 3 件を台帳と e-Gov の写しに登録（c6a166104） ← 0bb521b03 content(civil-practice): 既存の実務記事 9 本から第3波の 8 本へつなぎ ほか21件 |
| datasets | 10-07T01:33 | 1 | B | data/inbox/mail-events.json を台帳に宣言し忘れ（909dcd465） ← 2dc7a5db8 content(note): コンクリート資格もくじの主任技士の節に、ココナラの小論文添削への導線を ほか2件 |
| relative-links | 10-08T07:27 | 1 | B | backlog.md が指す削除済み docs への相対リンク ← 28bddb94d feat(video): 解説画面に先生の常駐・悪い例と良い例の対比・解答用紙の図を足し、競合動画の |
| relative-links | 10-10T01:56 | 2 | B | 削除した週次レビューへの相対リンクを記述に置換（59dd897f3） ← e9cc1373a review(weekly): 2026-W40 ダイジェストを全件処分（DN-0649〜0651  ほか2件 |
| admin-ui-debt | 09-29T02:27 | 1 | H | 管理画面の生 card クラス増（shadcn の Card へ置換 664ec68ec）。UI 負債ラチェット ← 4b39dd44a Merge pull request #714 from uruhayato373/fix/ledg ほか4件 |
| x-card-render | 10-12T08:30 | 1 | B | 差し替えで使わなくなった画像カードを描画台帳から外した（9de35f0e5） ← 9de35f0e5 chore(x): 差し替えで使わなくなった 097#7 の画像カードを描画の台帳から外す（DN-0 |
| x-card-render | 10-20T05:13 | 1 | B | X 下書きカード画像 56 件の追跡を戻した（3f98fbff7）。対象 0 件で検査不成立 ← aa6f43630 todo: DN-0778 を起票する（X 下書きカード画像は無視対象なのに追跡が要る：check- ほか1件 |
| orphan-figures | 10-07T11:23 | 1 | R | 記事本文から参照されていない図 1 枚（過去問解説に図が出ない） ← f79bb010e data(experiments): EXP-018 を running にする（2026-10-0 ほか2件 |
| validate-mdx | 10-14T00:08 | 1 | F | TIMEOUT（実行時間超過）。内容の不具合ではない ← 20703f0ac fix(sales): 建設部門 口頭試験対策の 10/12 の売上を商品へ結び付け、develop |
| note-cover-tokens | 09-29T13:11 | 1 | B | カバー設定に測量士・管工事の dir が先に登録され、記事 dir がまだ無かった（設定と実体の順序） ← 9656f51e9 note(管工事): 施工記述 機器別模範解答バンクの下書き ほか3件 |

## 2. unit-tests のテスト名ごとの失敗

unit-tests は 322 実行(push 161 / PR 161)で失敗。テスト名(`not ok N - 名前`)は 57 種。ほかに TIMEOUT で止まった実行が 2（push 1・PR 1）あり別に数える。

| テスト名 | 失敗実行数 (push/PR) | エピソード | 初回 | 最後 | 代表 run | 見立て | 同時に赤になる検査 |
|---|---|---|---|---|---|---|---|
| 実 docs/ は error 0（廃止参照・参照切れなし） | 51 (30/21) | 8 | 09-24 | 10-10 | 35953725037 | R0 H0 B8 F0 U0 | project-task-refs (51/51) |
| 孤児判定: 章 OGP は孤児にならない（現状のリポジトリで exit 0） | 33 (31/2) | 2 | 10-16 | 10-18 | 38835199484 | R0 H0 B2 F0 U0 | orphan-ogp (33/33) |
| 退避台帳: 全章分の ogp.png エントリがそろっている | 33 (31/2) | 2 | 10-16 | 10-18 | 38835199484 | R0 H0 B2 F0 U0 | orphan-ogp (33/33) |
| 既存の判断画面はすべてサイドバーのどこか 1 か所に置かれている | 28 (0/28) | 0 | 09-27 | 09-27 | 36301677848 | PR のみ | - |
| 全YouTubeメタデータが著者主体・AI制作補助の表記を持つ | 27 (8/19) | 1 | 10-11 | 10-18 | 39004552100 | R1 H0 B0 F0 U0 | - |
| パスを列挙する git 呼び出しは core.quotepath=false を明示している | 26 (13/13) | 1 | 09-14 | 10-09 | 36532659887 | R0 H1 B0 F0 U0 | - |
| 実データ: 検索語・追跡リスト・売上の分類が正本と整合している | 20 (8/12) | 3 | 10-11 | 10-14 | 38105932725 | R0 H0 B3 F0 U0 | qualification-market (16/20) |
| 基準値は今の数のまま（減らしたら BASELINE を下げる＝ラチェットを締める） | 19 (5/14) | 1 | 10-11 | 10-20 | 39199842318 | R0 H0 B1 F0 U0 | - |
| streamed download verifies bytes/hash and removes partial corrupt downloads | 19 (7/12) | 1 | 09-14 | 09-14 | 34791931544 | R1 H0 B0 F0 U0 | - |
| 各自の定義は基準値より増えない | 16 (5/11) | 1 | 10-11 | 10-20 | 39199842318 | R0 H0 B1 F0 U0 | - |
| 日時: ココナラの返信期限は JST の時差付き（時差なしは UTC で動く CI が 9 時間ずれて読むので止める） | 16 (6/10) | 1 | 10-11 | 10-11 | 38109936060 | R0 H0 B1 F0 U0 | qualification-market (12/16) |
| coconala.orders-snapshot: タブの数・状態の食い違い、取引の重複、販売日の誤りを止める（見積りなど販売前の行は null で通る） | 16 (6/10) | 1 | 10-11 | 10-11 | 38109936060 | R0 H0 B1 F0 U0 | qualification-market (12/16) |
| 実際の note の記事はすべてテーマに分類できる（新しいフォルダを足したらルールも足す） | 13 (12/1) | 2 | 09-29 | 10-15 | 36573338497 | R0 H0 B2 F0 U0 | - |
| 実際の note 記事はすべてカバー分類を持つ | 13 (12/1) | 2 | 09-29 | 10-15 | 36573338497 | R0 H0 B2 F0 U0 | - |
| 実データ: 台帳 config/content-series.json は違反 0 で、項目の状態が出る | 12 (8/4) | 4 | 10-15 | 10-16 | 38675161289 | R0 H0 B4 F0 U0 | content-series (12/12) |
| 柱分類: 実在の career 記事が 1 本も unclassified に落ちない | 12 (10/2) | 1 | 10-01 | 10-01 | 36846991461 | R0 H0 B1 F0 U0 | - |
| need → pillar が career-funnel.json の柱分類と矛盾しない | 12 (10/2) | 1 | 10-01 | 10-01 | 36846991461 | R0 H0 B1 F0 U0 | - |
| 全 note 記事でカバー PNG が解決でき、1280×670 である | 12 (2/10) | 2 | 09-15 | 09-22 | 35333956268 | R0 H0 B2 F0 U0 | - |
| topics・全国11機関（地方 10＋本省）・公開実務ガイドの回遊配線が完全である | 11 (7/4) | 1 | 10-15 | 10-15 | 38687973365 | R1 H0 B0 F0 U0 | topic-wiring (11/11) |
| 全ラベルが labels / packs / excluded のどれかに分類されている（未分類 0） | 11 (7/4) | 1 | 09-15 | 09-29 | 36573338497 | R0 H0 B1 F0 U0 | - |
| allowlist された全ルートが列挙でき、移行 fallback を持たない | 9 (7/2) | 1 | 09-15 | 09-15 | 34919474333 | R0 H0 B1 F0 U0 | - |
| GscReports: 実データの全日が通り、keys・行数・クリックの誤りが落ちる | 8 (5/3) | 1 | 10-14 | 10-15 | 38534521032 | R0 H0 B0 F1 U0 | - |
| GscIndexingPriority: 実データが通り、件数の不整合・分類・重複・切り詰めが落ちる | 8 (5/3) | 1 | 10-14 | 10-15 | 38534521032 | R0 H0 B0 F1 U0 | - |
| git の一覧・差分・履歴を読む同期呼び出しは maxBuffer を明示している | 7 (0/7) | 0 | 09-14 | 10-09 | 34802184311 | PR のみ | - |
| .env.example: コードが読む process.env.X をすべて列挙し、値は書かない | 5 (0/5) | 0 | 09-17 | 10-09 | 35287166317 | PR のみ | - |
| NoteStatusSnapshot: 件数の関係・失敗率・検査ゼロの緑・drift の語彙が落ちる | 4 (0/4) | 0 | 10-05 | 10-05 | 37266935604 | PR のみ | magazine-membership (3/4) |
| 全MDXの旧 /docs URLが正規公開URLへ301接続されている | 4 (0/4) | 0 | 09-24 | 09-24 | 36069796652 | PR のみ | content-quality-ratchet (3/4) |
| GscIndexingRequests: 実データが通り、語彙・集計の不整合・dry-run の申請・summary 欠けが落ちる | 3 (3/0) | 2 | 10-15 | 10-17 | 38741225460 | R0 H0 B0 F1 U1 | - |
| Ga4Reports: 実データの全日が通り、枠・日付・行・分け方の誤りが落ちる | 3 (3/0) | 1 | 10-16 | 10-16 | 38827832855 | R0 H0 B0 F0 U1 | - |
| 走査範囲に skills・knowledge・agents・docs・workflows が入っている（--json の scopes） | 3 (1/2) | 1 | 10-13 | 10-16 | 38367822190 | R1 H0 B0 F0 U0 | command-guidance (3/3) |
| 実 backlog がスキーマゲートを通る（違反 0） | 3 (2/1) | 2 | 09-17 | 09-29 | 36301503690 | R0 H0 B2 F0 U0 | backlog-schema (3/3) |
| 実 backlog は全カードが一意な DN-\#\#\#\# を持つ | 3 (2/1) | 2 | 09-17 | 09-29 | 36301503690 | R0 H0 B2 F0 U0 | backlog-schema (3/3) |
| readJson を各自定義するファイルは基準値より増えない | 2 (0/2) | 0 | 10-16 | 10-17 | 38868569869 | PR のみ | - |
| 実台帳の通常動画を全件表示し、45本の未配分をなくす。期間は年間台帳から取得 | 2 (1/1) | 1 | 10-13 | 10-13 | 38480203963 | R0 H0 B0 F1 U0 | video-publication (2/2) |
| 計画内で販売投稿が隣り合うと NG（理由が無い） | 2 (2/0) | 1 | 10-12 | 10-12 | 38223985931 | R0 H0 B0 F1 U0 | - |
| content は段階的列挙で、空のときの説明を持つ | 2 (0/2) | 0 | 10-01 | 10-06 | 36863226880 | PR のみ | - |
| note 記事の会員CTAは段階導線を守る: content/note/1級・2級土木/土木もくじ/article.md | 2 (1/1) | 1 | 09-29 | 09-29 | 36643864898 | R0 H0 B0 F0 U1 | - |
| note 記事の会員CTAは段階導線を守る: content/note/1級・2級土木/経験記述-落ちる答案診断-無料/article.md | 2 (1/1) | 1 | 09-29 | 09-29 | 36643864898 | R0 H0 B0 F0 U1 | - |
| note 記事の会員CTAは段階導線を守る: content/note/1級・2級土木/経験記述-独学添削の限界-無料/article.md | 2 (1/1) | 1 | 09-29 | 09-29 | 36643864898 | R0 H0 B0 F0 U1 | - |
| note 記事の会員CTAは段階導線を守る: content/note/1級・2級土木/経験記述-予想問題で書く練習-無料/article.md | 2 (1/1) | 1 | 09-29 | 09-29 | 36643864898 | R0 H0 B0 F0 U1 | - |
| note 記事の会員CTAは段階導線を守る: content/note/1級・2級土木/1級土木/magazines/1級土木-二次まるごとパック/article.md | 2 (1/1) | 1 | 09-29 | 09-29 | 36643864898 | R0 H0 B0 F0 U1 | - |
| --file 実行で exit 0 かつ stderr に git の fatal が出ない | 2 (0/2) | 0 | 09-19 | 09-21 | 35432049751 | PR のみ | - |
| /home/runner/work/doboku-note/doboku-note/tests/standards-ogp-guards.test.mjs | 2 (0/2) | 0 | 09-19 | 09-21 | 35432049751 | PR のみ | - |
| /home/runner/work/doboku-note/doboku-note/tests/youtube-channel-inventory.test.mjs | 2 (0/2) | 0 | 09-19 | 09-21 | 35432049751 | PR のみ | - |
| /home/runner/work/doboku-note/doboku-note/tests/youtube-thumbnail-batch.test.mjs | 2 (0/2) | 0 | 09-19 | 09-21 | 35432049751 | PR のみ | - |
| キャリア記事の記事末 affiliate が内部次行動へ置き換わっている | 1 (0/1) | 0 | 10-20 | 10-20 | 39515064017 | PR のみ | - |
| 標準順に組み直し、商品案内は1組だけにする | 1 (0/1) | 0 | 10-15 | 10-15 | 38696246017 | PR のみ | topic-wiring (1/1) |
| renderSlide: cover 型で 1080×1920（YouTube Shorts）の PNG を生成 | 1 (0/1) | 0 | 10-11 | 10-11 | 38144590997 | PR のみ | - |
| renderSlide: cover 型で 1080×1350（IG カルーセル）も動作 | 1 (0/1) | 0 | 10-11 | 10-11 | 38144590997 | PR のみ | - |
| renderSlide: cover 型で 1920×1080（YouTube 標準動画）も動作 | 1 (0/1) | 0 | 10-11 | 10-11 | 38144590997 | PR のみ | - |
| renderSlide: 未知の type は throw する | 1 (0/1) | 0 | 10-11 | 10-11 | 38144590997 | PR のみ | - |
| 記録が古い → V03（実査が止まっているのを surface する） | 1 (0/1) | 0 | 10-11 | 10-11 | 38134093505 | PR のみ | - |
| 現物の workflow が全て合格し、対象が 0 件ではない | 1 (0/1) | 0 | 10-08 | 10-08 | 37769829637 | PR のみ | workflow-publish-ref (1/1) |
| エントリポイント判定に Windows で必ず false になる書き方が無い | 1 (0/1) | 0 | 09-30 | 09-30 | 36652344951 | PR のみ | - |
| CI が赤いことを届ける経路が実在する（ci.yml の失敗通知） | 1 (0/1) | 0 | 09-29 | 09-29 | 36643359737 | PR のみ | workflow-hygiene (1/1) |
| /home/runner/work/doboku-note/doboku-note/tests/coconala-analytics.test.mjs | 1 (0/1) | 0 | 09-21 | 09-21 | 35553146862 | PR のみ | coconala-blog (1/1) |
| 起票している channel には --resolve の配線がある（起票だけで閉じない channel を増やさない） | 1 (0/1) | 0 | 09-18 | 09-18 | 35404018490 | PR のみ | - |

## 3. 検査名を持たない失敗（build・書き戻し・生成の手順）

| run | 種別 | 日時(UTC) | 内容 |
|---|---|---|---|
| 39171349436 | pr-develop | 2026-10-18T22:14 | audit/Build standards data for audit: check-standards-data が「文書数が不一致: 10/12」で例外（検査名の [FAIL] 行なし） |
| 38472846987 | push-develop | 2026-10-13T21:44 | publish-seo-summary ジョブ: CI の書き戻し（ci-data add）が backlog-schema・video-publication の失敗で止まった（audit ジョブも同じ検査で赤） |
| 38470252376 | push-develop | 2026-10-13T21:23 | publish-seo-summary ジョブ: 同上 |
| 37877322098 | push-develop | 2026-10-09T03:01 | build/Check build-time SEO: check-seo-build の error（broken_internal_link） |
| 36574443613 | pr-develop | 2026-09-29T13:21 | build: 記事日付の frontmatter 欠け（backfill-mdx-dates を要求して exit 1） |
| 35430660355 | pr-develop | 2026-09-19T07:56 | build: Turbopack build failed（dependabot tailwindcss 更新） |
| 35416375561 | pr-develop | 2026-09-19T02:40 | build: Turbopack build failed（dependabot tailwindcss 更新） |
| 35404177607 | pr-develop | 2026-09-18T23:03 | build/Check build-time SEO: check-seo-build の error（sitemap_page_missing） |
| 35404087543 | pr-develop | 2026-09-18T23:02 | build/Check build-time SEO: check-seo-build の error 133 件 |

build ジョブ・生成手順の失敗は 7 実行で、対象 650 実行の 1.1%。赤の大半は quality-audit(audit ジョブ)。9/30 の分割前の実行は build ジョブの中で quality-audit が走るため、ジョブ名ではなく [FAIL] 行の有無で振り分けた。

## 4. 期間中に 1 回も落ちなかった ci:true の検査（止めた実績 0）

ci:true 145 本のうち 94 本。注意: 「CI で 0」は、pre-commit が先に止めた分や、PR の作者が手元で直した分を含まない。観測日数は max(追加日, 09-14) から 10-20 まで。

| 検査 | 追加日 | 観測日数 | 区分 | 案 | 理由 |
|---|---|---|---|---|---|
| content-expansion | 2026-09-13 | 37 | L | 残す | 台帳とデータの整合は対象外 |
| affiliate-placements | 2026-10-07 | 14 | L | 残す | 台帳とデータの整合は対象外 |
| agent-config | 2026-10-15 | 6 | L | 残す | 台帳整合は対象外（10-15 追加で観測 6 日） |
| shadcn-parity | 2026-09-28 | 23 | T | 統合 | 管理画面(tools/admin-app)の UI・型を admin-ui-debt と別々に見ている。admin-ui 1 検査にまとめる |
| memory | 2026-10-02 | 19 | T | 残す | pre-commit と同じ検査で重複は対象外 |
| business-direction | 2026-09-13 | 37 | L | 残す | 台帳とデータの整合は対象外 |
| type-check-admin | 2026-10-12 | 9 | T | 統合 | 管理画面(tools/admin-app)の UI・型を admin-ui-debt と別々に見ている。admin-ui 1 検査にまとめる |
| ads-tests | 2026-08-22 | 37 | T | 残す | A8 のサイト帰属ガードの単体テスト。共用口座の誤配置を止める |
| public-bloat | 2026-08-22 | 37 | T | 退役 | build ジョブの prebuild が同じ check-public-bloat を必ず走らせ、落ちれば build が止まる。audit 側は二重 |
| pe-first-stage-historical | 2026-09-05 | 37 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| published-vs-redirects | 2026-08-23 | 37 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| frontmatter | 2026-08-22 | 37 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| callout-types | 2026-08-26 | 37 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| lint-ja | 2026-09-26 | 25 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| video-content | 2026-08-28 | 37 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| instagram-reels | 2026-09-06 | 37 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| codex-compat | 2026-08-27 | 37 | T | 格下げ(週次報告) | AGENTS.md 等の生成物ドリフトのみ。サイト・読者に影響せず、pre-commit でも見ている |
| workflow-clone-depth | 2026-08-22 | 37 | T | 統合 | workflow-hygiene・workflow-publish-ref と同じ .github/workflows の静的検査。workflow 1 検査にまとめる |
| information-architecture | 2026-08-22 | 37 | T | 保留 | 定義が「4 領域モデル」のまま。現行は 6 領域なので定義の追随確認が先（確認後に残す/退役） |
| content-layout | 2026-08-22 | 37 | T | 保留 | 2026-08 の content 移行の観測用。移行が完了していれば退役。完了確認が先 |
| mdx-dates | 2026-08-22 | 37 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| standard-articles | 2026-08-30 | 37 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| standards-page-images | 2026-09-05 | 37 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| standards-library | 2026-10-19 | 2 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| standards-amendments | 2026-10-19 | 2 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| standards-data | 2026-09-13 | 37 | L | 統合 | audit ジョブの build-standards-data 手順(= tsx 生成 + 同じ check-standards-data.mjs)と build の refresh-indexes でも同じ検査が走る。quality-audit 側の登録を外す |
| reference-book-pages | 2026-09-08 | 37 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| figure-embed-dims | 2026-08-22 | 37 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| bold-rendering | 2026-08-22 | 37 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| note-duplicate-images | 2026-09-23 | 28 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| note-inline-code | 2026-09-24 | 27 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| note-content-type | 2026-09-29 | 22 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| table-rendering | 2026-08-28 | 37 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| kindle-format | 2026-08-22 | 37 | C | 残す | コンテンツ品質のゲートは対象外。ただし EPUB を private R2 から取り寄せる手順が全 PR に付く（EPUB 変更時だけ要る） |
| kindle-epub-leak | 2026-08-22 | 37 | C | 残す | コンテンツ品質のゲートは対象外。ただし EPUB を private R2 から取り寄せる手順が全 PR に付く（EPUB 変更時だけ要る） |
| kdp-category-coverage | 2026-08-28 | 37 | L | 残す | 台帳とデータの整合は対象外 |
| kindle-prices | 2026-09-23 | 28 | L | 残す | 台帳とデータの整合は対象外 |
| image-origin | 2026-10-08 | 13 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| guide-length | 2026-08-22 | 37 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| lcp-image-hints | 2026-08-22 | 37 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| home-exam-coverage | 2026-08-22 | 37 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| character-avatars | 2026-08-22 | 37 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| category-curriculum | 2026-08-22 | 37 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| pe-construction-subject-links | 2026-09-04 | 37 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| career-separation | 2026-08-22 | 37 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| ssot-consumers | 2026-08-22 | 37 | L | 残す | 台帳とデータの整合は対象外 |
| sales-mapping | 2026-08-22 | 37 | L | 残す | 台帳とデータの整合は対象外 |
| note-hashtags | 2026-08-22 | 37 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| note-boundary | 2026-08-22 | 37 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| web-vitals-fetch-check | 2026-09-27 | 24 | T | 統合 | 週次・月次が読む生成器の「fixture で完走するか」だけを 11 本の別検査にしている。1 検査(report-generators)にまとめて検査数と台帳の行を減らす（§9 の「生成器を CI で担保」は維持） |
| note-traffic-fetch-check | 2026-09-16 | 35 | T | 統合 | 週次・月次が読む生成器の「fixture で完走するか」だけを 11 本の別検査にしている。1 検査(report-generators)にまとめて検査数と台帳の行を減らす（§9 の「生成器を CI で担保」は維持） |
| rccm-essay | 2026-09-15 | 36 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| cce-essay | 2026-09-30 | 21 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| product-db-check | 2026-10-01 | 20 | T | 統合 | 週次・月次が読む生成器の「fixture で完走するか」だけを 11 本の別検査にしている。1 検査(report-generators)にまとめて検査数と台帳の行を減らす（§9 の「生成器を CI で担保」は維持） |
| note-frontmatter-dup | 2026-08-22 | 37 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| note-vocabulary-boundary | 2026-08-26 | 37 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| note-link-cards | 2026-08-22 | 37 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| note-site-utm | 2026-09-22 | 29 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| x-length | 2026-09-23 | 28 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| x-utm | 2026-09-22 | 29 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| sns-urls | 2026-09-22 | 29 | C | 統合 | 同じ check-sns-urls.mjs を 3 つの検査(既定・--mdx・--note)として別々に起動。引数 1 つにまとめて 1 検査に |
| sns-urls-mdx | 2026-09-22 | 29 | C | 統合 | 同じ check-sns-urls.mjs を 3 つの検査(既定・--mdx・--note)として別々に起動。引数 1 つにまとめて 1 検査に |
| sns-urls-note | 2026-09-22 | 29 | C | 統合 | 同じ check-sns-urls.mjs を 3 つの検査(既定・--mdx・--note)として別々に起動。引数 1 つにまとめて 1 検査に |
| note-membership | 2026-08-22 | 37 | L | 残す | 台帳とデータの整合は対象外 |
| content-taxonomy | 2026-09-11 | 37 | L | 残す | 台帳とデータの整合は対象外 |
| doc-refs | 2026-08-22 | 37 | T | 残す | 全量 backstop（pre-commit は staged のみ）。重複は対象外 |
| agent-descriptions | 2026-09-14 | 37 | T | 残す | 全量 backstop（pre-commit は staged のみ）。重複は対象外 |
| task-plan-links | 2026-08-25 | 37 | L | 残す | 台帳とデータの整合は対象外 |
| dispatch-log | 2026-08-26 | 37 | L | 残す | 台帳とデータの整合は対象外 |
| dead-handles | 2026-08-22 | 37 | T | 残す | 全量 backstop（pre-commit は staged のみ）。重複は対象外 |
| jst-date | 2026-08-22 | 37 | T | 残す | 全量 backstop（pre-commit は staged のみ）。重複は対象外 |
| exam-calendar | 2026-08-22 | 37 | L | 残す | 台帳とデータの整合は対象外 |
| qualification-ssot | 2026-10-02 | 19 | L | 残す | 台帳とデータの整合は対象外 |
| past-exam-inventory | 2026-09-29 | 22 | L | 残す | 台帳とデータの整合は対象外 |
| past-exam-ledger | 2026-10-10 | 11 | L | 残す | 台帳とデータの整合は対象外 |
| answer-marks | 2026-10-11 | 10 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| search-opportunities | 2026-09-27 | 24 | T | 統合 | 週次・月次が読む生成器の「fixture で完走するか」だけを 11 本の別検査にしている。1 検査(report-generators)にまとめて検査数と台帳の行を減らす（§9 の「生成器を CI で担保」は維持） |
| search-improvements | 2026-10-13 | 8 | L | 残す | 台帳とデータの整合は対象外 |
| x-campaign-plan | 2026-08-22 | 37 | L | 残す | 台帳とデータの整合は対象外 |
| internal-links | 2026-08-22 | 37 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| asset-storage | 2026-08-22 | 37 | L | 残す | 台帳とデータの整合は対象外 |
| drive-vault | 2026-09-05 | 37 | L | 残す | 台帳とデータの整合は対象外 |
| figure-references | 2026-10-12 | 9 | C | 残す | コンテンツ品質のゲートは対象外（pre-commit との重複もここでは見ない） |
| reference-sources | 2026-09-06 | 37 | L | 残す | 台帳とデータの整合は対象外 |
| asset-reentry | 2026-08-29 | 37 | T | 残す | 全量 backstop（pre-commit は staged のみ）。重複は対象外 |
| snapshot-lifetime | 2026-09-14 | 37 | L | 残す | 台帳とデータの整合は対象外 |
| monetization-coverage | 2026-08-22 | 37 | T | 統合 | 週次・月次が読む生成器の「fixture で完走するか」だけを 11 本の別検査にしている。1 検査(report-generators)にまとめて検査数と台帳の行を減らす（§9 の「生成器を CI で担保」は維持） |
| buildjob-affiliate-report | 2026-09-19 | 32 | T | 統合 | 週次・月次が読む生成器の「fixture で完走するか」だけを 11 本の別検査にしている。1 検査(report-generators)にまとめて検査数と台帳の行を減らす（§9 の「生成器を CI で担保」は維持） |
| career-funnel-report | 2026-09-19 | 32 | T | 統合 | 週次・月次が読む生成器の「fixture で完走するか」だけを 11 本の別検査にしている。1 検査(report-generators)にまとめて検査数と台帳の行を減らす（§9 の「生成器を CI で担保」は維持） |
| exam-ssot-status | 2026-09-26 | 25 | T | 統合 | 週次・月次が読む生成器の「fixture で完走するか」だけを 11 本の別検査にしている。1 検査(report-generators)にまとめて検査数と台帳の行を減らす（§9 の「生成器を CI で担保」は維持） |
| roll-backlog-when | 2026-09-26 | 25 | T | 統合 | 週次・月次が読む生成器の「fixture で完走するか」だけを 11 本の別検査にしている。1 検査(report-generators)にまとめて検査数と台帳の行を減らす（§9 の「生成器を CI で担保」は維持） |
| qualification-market-report | 2026-09-26 | 25 | T | 統合 | 週次・月次が読む生成器の「fixture で完走するか」だけを 11 本の別検査にしている。1 検査(report-generators)にまとめて検査数と台帳の行を減らす（§9 の「生成器を CI で担保」は維持） |
| site-to-sales-report | 2026-09-25 | 26 | T | 統合 | 週次・月次が読む生成器の「fixture で完走するか」だけを 11 本の別検査にしている。1 検査(report-generators)にまとめて検査数と台帳の行を減らす（§9 の「生成器を CI で担保」は維持） |
| frequent-topics | 2026-08-25 | 37 | T | 退役 | generated-indexes が refresh-indexes(build-frequent-topics を含む)を丸ごと回す。--check の完走確認は重なる |

## 5. 分類案

### 5-1. 件数

- 対象は ci:true 145 本 = 失敗した 51 本 + 0 件 94 本。案の内訳: 統合 23 / 残す 112 / 格下げ 5 / 退役 3 / 保留 2
  - 失敗した検査: 統合 5 / 残す 41 / 格下げ 4 / 退役 1
  - 止めた実績 0: 残す 71 / 統合 18 / 退役 2 / 格下げ 1 / 保留 2
- 3 つの候補区分(重なりあり): **止めた実績 0** 94 本のうち「残す」以外 = 23 本／**誤検知・帳簿合わせが大半** = 下の 5-3 の 17 本／**CI の中で同じ対象を二重に見ている** = 5-4 の検査↔test 7 組 + 検査↔検査 7 グループ

### 5-2. 止めた実績 0（案が「残す」以外）

| 検査 | 案 | 理由 |
|---|---|---|
| shadcn-parity | 統合 | 管理画面(tools/admin-app)の UI・型を admin-ui-debt と別々に見ている。admin-ui 1 検査にまとめる |
| type-check-admin | 統合 | 管理画面(tools/admin-app)の UI・型を admin-ui-debt と別々に見ている。admin-ui 1 検査にまとめる |
| public-bloat | 退役 | build ジョブの prebuild が同じ check-public-bloat を必ず走らせ、落ちれば build が止まる。audit 側は二重 |
| codex-compat | 格下げ(週次報告) | AGENTS.md 等の生成物ドリフトのみ。サイト・読者に影響せず、pre-commit でも見ている |
| workflow-clone-depth | 統合 | workflow-hygiene・workflow-publish-ref と同じ .github/workflows の静的検査。workflow 1 検査にまとめる |
| information-architecture | 保留 | 定義が「4 領域モデル」のまま。現行は 6 領域なので定義の追随確認が先（確認後に残す/退役） |
| content-layout | 保留 | 2026-08 の content 移行の観測用。移行が完了していれば退役。完了確認が先 |
| standards-data | 統合 | audit ジョブの build-standards-data 手順(= tsx 生成 + 同じ check-standards-data.mjs)と build の refresh-indexes でも同じ検査が走る。quality-audit 側の登録を外す |
| web-vitals-fetch-check | 統合 | 週次・月次が読む生成器の「fixture で完走するか」だけを 11 本の別検査にしている。1 検査(report-generators)にまとめて検査数と台帳の行を減らす（§9 の「生成器を CI で担保」は維持） |
| note-traffic-fetch-check | 統合 | 週次・月次が読む生成器の「fixture で完走するか」だけを 11 本の別検査にしている。1 検査(report-generators)にまとめて検査数と台帳の行を減らす（§9 の「生成器を CI で担保」は維持） |
| product-db-check | 統合 | 週次・月次が読む生成器の「fixture で完走するか」だけを 11 本の別検査にしている。1 検査(report-generators)にまとめて検査数と台帳の行を減らす（§9 の「生成器を CI で担保」は維持） |
| sns-urls | 統合 | 同じ check-sns-urls.mjs を 3 つの検査(既定・--mdx・--note)として別々に起動。引数 1 つにまとめて 1 検査に |
| sns-urls-mdx | 統合 | 同じ check-sns-urls.mjs を 3 つの検査(既定・--mdx・--note)として別々に起動。引数 1 つにまとめて 1 検査に |
| sns-urls-note | 統合 | 同じ check-sns-urls.mjs を 3 つの検査(既定・--mdx・--note)として別々に起動。引数 1 つにまとめて 1 検査に |
| search-opportunities | 統合 | 週次・月次が読む生成器の「fixture で完走するか」だけを 11 本の別検査にしている。1 検査(report-generators)にまとめて検査数と台帳の行を減らす（§9 の「生成器を CI で担保」は維持） |
| monetization-coverage | 統合 | 週次・月次が読む生成器の「fixture で完走するか」だけを 11 本の別検査にしている。1 検査(report-generators)にまとめて検査数と台帳の行を減らす（§9 の「生成器を CI で担保」は維持） |
| buildjob-affiliate-report | 統合 | 週次・月次が読む生成器の「fixture で完走するか」だけを 11 本の別検査にしている。1 検査(report-generators)にまとめて検査数と台帳の行を減らす（§9 の「生成器を CI で担保」は維持） |
| career-funnel-report | 統合 | 週次・月次が読む生成器の「fixture で完走するか」だけを 11 本の別検査にしている。1 検査(report-generators)にまとめて検査数と台帳の行を減らす（§9 の「生成器を CI で担保」は維持） |
| exam-ssot-status | 統合 | 週次・月次が読む生成器の「fixture で完走するか」だけを 11 本の別検査にしている。1 検査(report-generators)にまとめて検査数と台帳の行を減らす（§9 の「生成器を CI で担保」は維持） |
| roll-backlog-when | 統合 | 週次・月次が読む生成器の「fixture で完走するか」だけを 11 本の別検査にしている。1 検査(report-generators)にまとめて検査数と台帳の行を減らす（§9 の「生成器を CI で担保」は維持） |
| qualification-market-report | 統合 | 週次・月次が読む生成器の「fixture で完走するか」だけを 11 本の別検査にしている。1 検査(report-generators)にまとめて検査数と台帳の行を減らす（§9 の「生成器を CI で担保」は維持） |
| site-to-sales-report | 統合 | 週次・月次が読む生成器の「fixture で完走するか」だけを 11 本の別検査にしている。1 検査(report-generators)にまとめて検査数と台帳の行を減らす（§9 の「生成器を CI で担保」は維持） |
| frequent-topics | 退役 | generated-indexes が refresh-indexes(build-frequent-topics を含む)を丸ごと回す。--check の完走確認は重なる |

残す側(71 本)は区分で見ると: コンテンツ品質 42・台帳整合 22・その他 7。その他の 7 本は pre-commit と同じ検査の全量 backstop（重複は対象外）か、共用口座の誤配置のような壊れ方が重い検査。

### 5-3. 誤検知・帳簿合わせが大半（develop push の区間で B+F が過半、区間 2 以上、または H のみ）

| 検査 | 区分 | 失敗実行数 | 見立て (R H B F U) | 案 | 理由 |
|---|---|---|---|---|---|
| video-publication | L | 110 | R0 H0 B3 F0 U1 | 残す | 台帳とデータの整合。外部状態の V05 は 10-20 に ops へ移し済み（DN-0791）で、以降の赤は縮む見込み |
| project-task-refs | L | 51 | R0 H0 B8 F0 U0 | 残す | 台帳整合は対象外。ただし unit-tests「実 docs/ は error 0」と 51/51 同時赤なので test 側だけ外す |
| content-quality-ratchet | C | 42 | R0 H3 B0 F0 U0 | 残す | コンテンツ品質のゲート。H 3/3（文体規約の baseline 超過） |
| knip-ratchet | T | 41 | R0 H1 B0 F0 U0 | 格下げ(週次報告) | 超過 41 回(PR 34)の中身は未宣言 binary・依存の宣言漏れ等で実害の不具合 0。直す価値はあるが merge を止める必要は薄い |
| orphan-ogp | L | 39 | R0 H0 B5 F0 U0 | 統合 | bot の ogp-supply 追従待ちの帳簿 5/5。unit-tests 2 本(孤児判定・退避台帳)と 33/39 同時赤＝二重なので test 側を外し検査 1 本に |
| coconala-wiring | L | 38 | R0 H0 B1 F1 U0 | 残す | 台帳整合は対象外。B 1・F 1(検査側の修正) |
| image-assets | C | 36 | R0 H1 B2 F0 U1 | 残す | コンテンツ品質のゲート。B 2・H 1・U 1 |
| magazine-membership | L | 35 | R1 H0 B3 F0 U0 | 残す | 台帳整合は対象外。B 3・R 1(まるごとパック 68 本漏れ) |
| generated-indexes | L | 31 | R0 H0 B9 F0 U0 | 退役 | 帳簿 9/9。赤の区間 9 回は unit-tests を除く検査で最多（失敗 31 実行）。DN-0804 で生成物の追跡をやめて build/CI で作れば検査ごと不要 |
| qualification-market | L | 20 | R0 H0 B3 F0 U0 | 残す | 台帳整合は対象外。B 3/3 だが unit-tests 3 本(実データ・日時・orders-snapshot)と二重なので test 側だけ外す |
| review-wiring | T | 13 | R0 H0 B2 F0 U0 | 格下げ(週次報告) | 帳簿 2/2(配線正本の更新漏れ)。ずれても本番・読者に影響せず、読み手は週次レビューなので週次側の検査で足りる |
| content-series | L | 12 | R0 H0 B4 F0 U0 | 残す | 台帳整合は対象外。B 4/4 だが unit-tests「実データ: 台帳…」と 12/12 同時赤なので test 側だけ外す |
| backlog-schema | L | 8 | R0 H0 B4 F0 U0 | 残す | 台帳整合は対象外。B 4/4 だが unit-tests 2 本(実 backlog)と二重なので test 側だけ外す |
| claude-md-size | T | 7 | R0 H1 B0 F0 U0 | 残す | H 1。pre-commit と同じ検査だが重複は対象外。9/14 の同時赤の一部 |
| relative-links | T | 3 | R0 H0 B2 F0 U0 | 残す | B 2/2(削除済み docs への参照)。pre-commit と重複は対象外 |
| admin-ui-debt | T | 3 | R0 H1 B0 F0 U0 | 統合 | H 1。shadcn-parity・type-check-admin と同じ tools/admin-app の UI を見ている。admin-ui 1 検査にまとめる |
| x-card-render | T | 2 | R0 H0 B2 F0 U0 | 格下げ(週次報告) | 帳簿 2/2(描画台帳・追跡の戻し)。X 下書きカード画像の置き場決め(DN-0778)が済めば検査不成立も止まる |

該当 17 本。案が「残す」のものは区分が C・L の検査（台帳整合・コンテンツ品質は対象外）か、代替の無いメタ検査。**対象外でない側の案は 退役: generated-indexes ／ 統合: orphan-ogp・admin-ui-debt ／ 格下げ: knip-ratchet・review-wiring・x-card-render**。membership-drip は 9/18 に ops へ移し済み。

帳簿合わせが多い原因は 3 つに寄る。(1) 生成物のコミット漏れ(generated-indexes 9・orphan-ogp 5・テストの cover 供給 2)＝DN-0804 の対象、(2) 台帳・登録の更新漏れ(project-task-refs 8・content-series 4・backlog-schema 4・qualification-market 3 ほか)＝pre-commit か書き手側の自動化で先に止める余地、(3) 基準値・ラチェットの更新(image-assets・git-binary-policy・gate-parity)。

### 5-4. 同じ対象を CI の中で 2 か所で見ている（pre-commit との重複は除く）

**(a) 実データ版の unit-tests と quality-audit の検査**（test がライブラリ関数を呼び、検査と同じ判定を実データに当てている。同時赤は「両方が落ちた実行数 (検査が落ちた実行数 / test が落ちた実行数)」）

| 検査 | 重複している test(tests/*.test.mjs) | 同時赤 | 案 |
|---|---|---|---|
| project-task-refs | 実 docs/ は error 0（廃止参照・参照切れなし）（project-task-refs.test.mjs:96） | 51 (検査 51 / test 51) | 統合: test を外す(判定は検査と同じ auditProjectDoc) |
| orphan-ogp | 孤児判定: 章 OGP は孤児にならない… / 退避台帳: 全章分の ogp.png エントリがそろっている（standards-ogp-guards.test.mjs:100,150） | 33 (検査 39 / test 33) | 統合: 実リポジトリ版 test 2 本を外し検査 1 本に(fixture 版の test は残す) |
| content-series | 実データ: 台帳 config/content-series.json は違反 0…（content-series.test.mjs:44） | 12 (検査 12 / test 12) | 統合: 実データ版 test を外す |
| topic-wiring | topics・全国11機関…の回遊配線が完全である（topic-wiring.test.mjs:5） | 11 (検査 11 / test 11) | 統合: 実データ版 test を外す(auditTopicWiring は検査と同じ) |
| qualification-market | 実データ: 検索語・追跡リスト・売上の分類が正本と整合… ほか(日時・orders-snapshot の 2 本は同じ売上台帳)（qualification-market.test.mjs:23） | 20 (検査 20 / test 20) | 統合: 実データ版 test 3 本を外す |
| backlog-schema | 実 backlog がスキーマゲートを通る / 全カードが一意な DN-#### を持つ（backlog-schema-check.test.mjs:108） | 3 (検査 8 / test 3) | 統合: 実 backlog の test 2 本を外す |
| youtube-shorts / content-registry | 全YouTubeメタデータが著者主体・AI制作補助の表記を持つ（youtube-authority-metadata.test.mjs:11） | 16 (検査 20 / test 27) + content-registry 13 (検査 17 / test 27) | 統合: test か検査のどちらかに寄せる(同時赤 16+13/27) |

**(b) 検査どうし**

| 対象 | 重複している検査 | 案 |
|---|---|---|
| check-standards-data.mjs | audit ジョブの「Build standards data for audit」手順(build-standards-data に含まれる)／quality-audit の standards-data／build ジョブの refresh-indexes | quality-audit 側 standards-data を外す(統合) |
| check-public-bloat | quality-audit の public-bloat／build ジョブの prebuild | quality-audit 側を外す(退役) |
| build-frequent-topics | quality-audit の frequent-topics(--check)／generated-indexes(refresh-indexes 全体) | frequent-topics を外す(退役) |
| check-sns-urls.mjs | sns-urls／sns-urls-mdx／sns-urls-note(同じスクリプトを 3 回起動) | 1 検査に統合 |
| .github/workflows の静的検査 | workflow-hygiene／workflow-clone-depth／workflow-publish-ref | 1 検査に統合 |
| 管理画面(tools/admin-app)の UI・型 | admin-ui-debt／shadcn-parity／type-check-admin | 1 検査(admin-ui)に統合 |
| 週次・月次が読む生成器の完走確認 | web-vitals-fetch-check ほか 11 本 | 1 検査に統合(実行内容は変えない) |

### 5-5. すでに手が入っているもの（二重に着手しないための記録）

- membership-drip: 2026-09-18 に ci から ops(日次)へ移した(PR #520 `feat/ci-signal-tiers`)。期間中の失敗 14 実行はすべて 09-16〜09-17 で、その後は CI では落ちていない。
- video-publication の V05(YouTube 側の削除・非公開): 2026-10-20 に ci から ops 日次へ移した(DN-0791・#1158)。10/12〜10/13 の 43 連続赤（外部で動画を削除した状態に台帳が追いつくまで）の原因がこれ。V02(照合記録の追従)は ci に残っている。
- pre-commit: 2026-10-20 に「develop を赤くしてきた検査と実データのテスト」を commit 前に回す設定を入れた(DN-0790・#1157)。以後、帳簿合わせの赤は pre-commit で先に落ちるので、この表の B の数は今後減る見込み(期間中の数字には効いていない)。
- generated-indexes に当たる生成物は DN-0804 が追跡をやめる前提で起票済み。

## 6. 判断できなかった点・限界

- PR 345 実行は直しの中身を分類していない(R/H/B/F/U は develop push 305 実行分)。PR でだけ落ちた検査(products・sns-landing-cta・script-imports・table-references・note-meta-lint・workflow-*・svg-audit・type-check・eslint・playwright-auth-wiring の 10 検査)は「止めた実績あり、種類は不明」。
- U（不明）が多い。unit-tests は 36 区間あり、test 名単位で見立てた(表 2)。検査単位では 42 区間が U で、原因は (1) cancel-in-progress による取り消しで直しのコミットが 10〜40 件の区間に埋もれる、(2) 直しが feat の大きなコミットに混ざる、(3) ログに違反の中身が出ない（keiken-answer-split）。
- 「次の緑」までの区間を直しとして扱うので、赤が自然に消えた(時刻依存・外部状態・bot の追従コミット)ものは B にした。実際に誰かが直したかの確認はしていない。
- 0 件の検査は「CI で止めた実績 0」であって「不要」ではない。pre-commit が先に止めた分・PR の作者が手元の quality:audit で直した分は数えていない。追加から 14 日未満の検査(9 本)は観測が足りない。
- 検査どうしの重複は、スクリプト名・実行手順・同時赤の統計から見立てた。同じ関数を呼ぶ(test と検査)ことは tests/*.test.mjs の該当行で確認したが、standards-data の三重実行は ci.yml と package.json の手順の読みで、実行ログでの確認はしていない。
- information-architecture・content-layout は定義の古さ（4 領域・移行観測）から「保留」にしたが、スクリプトの中身までは読んでいない。
- 「本物」の線引きは見立て。H（規約逸脱）を R に入れていないので、R だけを「止めた実績」と読むと下限になる。
