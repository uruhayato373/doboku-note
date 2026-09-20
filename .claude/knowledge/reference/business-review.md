# 事業計測とレビュー

判断理由の正典は [プロダクト戦略](../../../docs/strategy/01_プロダクト戦略.md)。機械設定は `.claude/config/business-direction.json`。重点資格・指標定義をスキルや別JSONへ複製しない。CLAUDE.md、管理画面、SEO、レビューが同じ設定を参照する。

## 記録の置き場

- 既存実績: note=`.claude/state/sales/sales-log.json`、KDP=`.claude/state/sales/kdp-royalties.json`、ココナラ=`.claude/state/coconala/{analytics-snapshot,orders-snapshot,orders-log}.json`（閲覧は30日窓、注文・販売額は暦月）、GSC/GA4=`.claude/state/metrics/`。商品状態・価格・顧客対応の台帳は従来どおり。
- 追加計測・目標・凍結スナップショット・判断履歴: `.claude/state/metrics/business/`。1回1ファイル・追記専用。訂正は `supersedes` で旧ファイルを参照し、削除・上書きしない。
- 改善の状態: `.claude/state/experiments.json`。レビューは実験IDを参照するだけで別の実験状態台帳を作らない。

## 計測

```bash
npm run fetch-business-metrics -- --commit
npm run business-review -- report
npm run business-review -- report --monthly
npm run business-review -- snapshot --monthly --commit
npm run business-review -- record --input .tmp/business-record.json --commit
npm run check-business-direction
```

Googleの取得は既存CI認証を使い、前の完了した週・月の資格別集計を取得する。ローカル認証が無い場合は既存CIスナップショットを読み、未取得は欠測として残す。GSCの確定データを待つため、終了日から4日未満は取得を止める。既存CIへの追加ステップはワークフロー定義がmainへ届いてから定期実行される。developだけの時期は同じCLIを利用できる認証済み環境で実行する。

GA4人数は期間全体に対するAPI集計。資格別は正規URL配下の閲覧を条件とするため、複数資格を見る同一人を資格間で足さない。旧URLの期間を含む月との増減は対象範囲の変化を含み、改善効果と判定しない。演習イベントは既存1級土木ツールの範囲。GSCの資格別クリックは正規URL配下を条件とし、旧URLや一般実務ページと混ぜない。異なるタイムゾーンの厳密な購買率は計算しない。

自動集計対象外の値は、各管理画面で期間・対象・定義を確認し `/metrics/business` のフォーム、またはJSONから記録する。`source` に取得面・確認範囲を記す。新PVと旧全体ビューは接続しない。ココナラの閲覧数は `/coconala-analytics` の30日窓を使い、暦月へ換算しない。KDPは月次台帳の書籍別行からcatalog対象だけを集計し、共有口座総額やサイト帰属できないKENPを事業実績へ入れない。認証・ログイン・UI変更で取得できなければ、値を作らず次回の取得対象へ残す。

note の `notePv` / `noteImpressions` は `npm run note-traffic-fetch -- --month YYYY-MM --commit` が書く `.claude/state/metrics/note/referrers-YYYY-MM.json` の `summary` を全体値の出典にする（自己閲覧を含む・`coverage: complete`）。資格別は `articles-pv-YYYY-MM.json` の記事タイトルを公開台帳と資格名へ照合する。未帰属記事を残すため資格別はpartialとし、全体値と一致するよう按分しない。流入元の内訳（`targetMonth.sources`）は指標にせず findings に書く。

ココナラの暦月販売件数・販売額は、全タブ取得済みの `orders-snapshot.json` を `orders-log.json` のtalkroomIdへ突合して集計する。分析画面の閲覧数は30日ローリングのまま別期間として表示し、暦月へ換算しない。購入前相談はDMスレッドの最新日しか取れず月内メッセージ数を復元できないため、専用記録がない月は欠測とする。

`measurement` の必須項目: `kind`, `qualification`（allまたは重点資格ID）, `period.startDate/endDate`, `channel`（GA4/GSC/note/KDP/coconala/operations）, `subject`, `source`, `coverage`（complete/partial/not-applicable）, `values`（指標ID→非負整数またはnull）。`not-applicable` は指標の `appliesTo` 外だけに使う。資格全体の集計は `subject: aggregate`。特定記事・商品はそのIDを用い、合計欄へ自動加算しない。全体には重点資格外・資格未帰属を含む。指標の `appliesTo` 外は対象外として欠測の母数へ入れない。note売上の既存台帳集計は登録分であり、月次表示との一致を確認するまでは部分集計と表示する。KDPは確定月かつcatalogのLIVE全冊を照合できた期間だけcompleteとする。

顧客名・メール・相談本文・認証情報を含めない。`null`は欠測。0は対象を確認した実測。費用・受取・時間が揃わない状態で利益や時給を推計しない。

## レビュー

週次は前の月曜〜日曜、月次は前の暦月を対象にする。`--start YYYY-MM-DD --end YYYY-MM-DD` で過去期間も表示できる。期間がまだ終了していなければ記録できない。GSCの窓は太平洋時間、レビューの期限は日本時間。

1. `report` で対象・欠測・レビュー期日・実験期日を確認し、既存ソースの鮮度と計測範囲を読む。
2. 対象期間の `snapshot` を保存する。集計値・元ファイルのhash・その時点の方針が凍結される。売上の個人情報は複製しない。
3. 重点資格ごとに実測と未確認を分け、商品説明・記事・導線の現物を照合する。
4. `review` を記録する。`qualification: all`, `cadence: weekly/monthly`, `period`, `snapshot`, `qualificationsReviewed`（重点資格ID全て）, `status: complete/provisional`, `findings`, `decision`, `nextAction`, `experimentIds`, `nextReviewDate` が必要。資格別の実測がない場合はprovisional。completeはレビュー作業の完了であり、改善効果・全指標の計測完了を意味しない。
5. 次の改善は `/nsm-experiment propose` へ渡す。対象資格、読者の課題、現物で確認した不足、変更案、評価指標、基準期間、再計測日とレビュー記録の参照を付ける。SEOは `/weekly-improve --rank-watch` の専用契約を使う。単発実装はbacklogへ起票し、定常運用はweeklyから直接扱う。
6. 再計測後に実験を評価し、学びを次のレビューへ返す。判定に必要なデータが足りなければ保留理由と次回日を記す。同じ周期・期間の二重レビューは拒否し、訂正は追記する。

目標は `target` 記録。対象指標・資格のcompleteな実測snapshot、目標値、方向（at-least/at-most）、適用日、見直し日、設定理由を持つ。適用期間の開始日以前の目標を表示する。後から設定した目標で過去の達成を装わない。

## 実行と検査

管理画面の保存は127.0.0.1/localhostの同一OriginからのJSONのみ。既存台帳の任意編集・外部投稿・本番デプロイは行わない。保存はローカル追記で、スキルの終了時に対象JSONを明示してGitへコミットする。複数書込みはロックで排他する。

`check-business-direction` は設定、履歴、実行可能な集計、既存履歴の改変を検査する。CIのquality gateとpre-commitから実行。データ0件はそのまま0件と表示し、計測できたこととは呼ばない。定期実行は既存SEO Rank Watch/週次PDCAが同じ期間キー・期日を読み、不要な二重実行を避ける。記録がなく期限を過ぎたレビューは管理画面に残る。
