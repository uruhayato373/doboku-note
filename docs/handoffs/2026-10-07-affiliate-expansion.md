# 転職アフィリエイトの展開拡大（EXP-017）の引き継ぎ

2026-10-07 に別 PC へ移るため区切った。計画の要点と残りをここに置く（計画ファイルは元の PC のローカルにしか無い）。

## 経緯と決定（2026-10-07 ユーザー）

- A8 で 10 月にビルドジョブの発生 1 件（¥13,534・未確定・サイト経由）。どの面から出たかは、サイトの全部の面が同じ mat なので A8 では分からない。
- 展開先: 実務（/practice）・経験記述の書き方と例文・ツール・公的基準の章末・トップ。抜けていた枠（コンクリート技士の本文中間、RCCM の本文中間と資格トップ）も埋める。
- 案件: 2級の学習ページは建設JOBs に替える（20〜30代・経験者が条件）。2級のキャリア記事はビルドジョブのまま。
- 成果の分け方: GA4 のページ別クリック（#910）に加え、A8 にサイトを 2 つ足して面ごとに mat を分ける（PR-3）。
- note: 転職系の無料 note にビルドジョブのリンクを足す。

## 済んだこと

| 内容 | 場所 |
|---|---|
| 管理画面の表を shadcn の Data Table に | #906（develop） |
| ページ別のクリック（pagePath × ラベル × 面 × 日付）と配置ルールへの一意な割り当て、管理画面の「クリックの出どころ」 | #910（develop） |
| 経験記述の書き方・例文 4 ページに本文カード | develop 03f957a80 |
| note 3 本にビルドジョブのリンク（「公務員技術職の試験を受けるか決める」は読者が就職前中心で対象外） | develop 97d6f605a |
| 配置ルール 12 → 34 本・建設JOBs の復帰・AffiliateSlot・EXP-017（proposed） | **#911（下書き・未マージ）** |
| fetch-metrics の手動実行（`affiliate_days=45`） | run 37593507340 |

## 次にやること（順番）

1. **10 月の 1 件の出どころを絞る**: run 37593507340 で取得済み（窓 2026-08-23〜10-06・`data/analysis/career-funnel.json` の `clickLog`・管理画面 `/affiliate` の「クリックの出どころ」）。9/08 以降のビルドジョブのクリックは、9/19 の記事サイドバー 1 件を除いて全部が二次試験の年度別ページの本文カード（10/02 1級 r03・2級 r04、10/01 2級 r07、9/28 1級 r05、9/26 1級 r07・2級 r07・建設部門キャリア、9/25・9/16 1級 r07）。ユーザーに A8 の発生日時を聞いて日付で突き合わせ、ページまで絞る。
   - この run は全体が赤（Issue #912）。原因は水曜の手動実行で成長パックが「GSC 確定前」の検査不成立になったことで、今回の改修とは無関係。金曜の定期実行が通れば自動で閉じる。
2. **#911 を仕上げる**
   - develop（#910 入り）へ rebase し、`.claude/scripts/report-career-funnel.mjs` の `pageContextOf` に `/`（home）と `/standards/…`（standards）を足す（テストは `tests/career-funnel-report.test.mjs`）。
   - HTML での確認: 本体のチェックアウトで `npm run dev`（worktree の dev は Turbopack が node_modules の junction を拒む）。/practice の記事と実務トップ・/standards の章ページ・トップ・/tools/keiken-charcount・/tools/juken-shikaku・2級の学習ページとキャリア記事で、広告枠（`data-cta-placement`）とピクセル（`0.gif?a8mat=` が mat ごとに 1 発）を確かめる。
   - /doc-sync: `affiliate-operations.md` §6「現在の配置」の表と裁定ログ 2026-10-07（建設JOBs の再開理由）、`design-system.md` の StandardsNavigation の行（ナビ欄は広告なしのまま・本文末に 1 枠）。
   - 下書きを外してマージ。
3. **本番デプロイはユーザーが決める**（`/deploy`）。実験はデプロイから始まる。デプロイした日に EXP-017 の `status` を running、`started_at`、`next_check_date`（28 日後）を入れる。2級の試験（10/25）の前に出すほど建設JOBs の分母が早く貯まる。
4. **PR-3（A8 の別サイト）**: ユーザーが A8 で「doboku-note（実務・基準）」（`https://doboku-note.com/practice/`）と「doboku-note（ツール・トップ）」（`https://doboku-note.com/tools/`）を登録し、ビルドジョブへ提携を申請する。承認後に広告リンクを共有してもらい、エージェントが次をする。同じドメインの別パスが登録できなければ GA4 の照合だけで進める。
   - mat を `config/affiliate-mats.json` に登録
   - `config/a8-report-automation.json` の `relatedSites` を足す
   - `scripts/lib/dataset-schemas.mjs` の `siteSummary.site` の enum を広げる
   - 配置ルールに `a8Site` を足し、`src/lib/affiliate-placement.ts` が「案件 × A8 サイト」の素材を選ぶようにする（素材は href・画像・ピクセルとも site ごとに違う）
   - 実務・公的基準・トップ・ツールのルールを閉じて、`a8Site` 付きで開き直す
5. **10/20 の EXP-008 判定**: 2級のルールは 2026-10-07 17:00 に閉じて開き直した。`byRule` は閉じた前後を分けて数える（分けられない分は `*Shared`）ので、窓を混ぜずに読む。

## 注意

- 新しいルールの開始は `2026-10-07T17:00:00+09:00`。SSG なので本番の再ビルドで効く。
- この PC の worktree（affiliate-by-page・content-affiliate・affiliate-expansion）は push 済みで片付ける。続きは `git fetch` して `feat/affiliate-expansion` から。
