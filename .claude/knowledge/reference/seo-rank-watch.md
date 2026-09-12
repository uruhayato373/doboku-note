# SEO Rank Watch — 1件改善と実測のループ

## 真実源と入口

- 監視対象: `.claude/config/seo-watchwords.json`（query、正規URL、MDX、priority=1が最高、country、device）。日本 `jpn`・全端末が初期値。条件を変える場合は別idを作る。
- 順位履歴: `.claude/state/metrics/gsc/rank-watch/watch-*.json`。GSC生データ・期間・集計・固定条件を追記専用で保存する。既存履歴は修正しない。
- 改善履歴: `.claude/state/experiments.json` の `kind: seo-rank-watch`。actions/historyは追記専用。別の改善台帳を作らない。
- 実装: `scripts/seo-rank-watch.mjs` と `scripts/lib/seo-rank-watch.mjs`。管理画面 `/metrics/seo-watch` は同じ判定関数を読む。
- スキル入口: `/weekly-improve --rank-watch`（「SEO Rank Watch」もこのモードへルーティング）。本番反映は従来の `/deploy`。

## 1回の実行

1. 既定はCI取得済みデータで `npm run seo-rank-watch -- report --json`。ローカルで取得できるときだけ `npm run seo-rank-watch -- collect`。既存 `fetch-metrics.yml` が週次に同じcollectを実行する。GSCを使えなければ欠測のまま保留し、WebSearchの順番を順位履歴へ混ぜない。
2. `npm run seo-rank-watch -- review --no-fetch` で期限到来分の判定を確認し、`--commit` で実験台帳へ記録する。正確な前後期間のsnapshotが無ければ保留。ローカルAPIが使える場合は `--no-fetch` を外して取得する。CLIの `--commit` はJSON保存の意味で、Git commitは別工程。
3. reportのselectedを1件だけ扱う。2〜10位→11〜20位→前回未達→高優先度の欠測。1位のワードは改善対象にせず、十分な非重複7日×2ならreviewでachievedへ移す。順位履歴が9日超古い、観察中、同じページが観察中、既存NSMの同時実行上限2件なら着手しない。候補ゼロで新たな改善を作らない。
4. 「誰が・何を知りたいか」を1〜2文にし、WebSearchで現在の上位参考1〜3ページを実読する。対象記事に何が不足するかを比較して記録する。検索順は地域・時刻等に依存する参考で、厳密なGSC順位とは区別する。
5. 不足に合わせ、selectedのMDXを1キーワード分だけ改善する。title/description/intro/FAQ/本文/内部リンク/実データの必要なものだけ。内部リンクは次に知りたいことへつなぐ。noindex・大規模な構造変更は提案と承認を経る。MDXの既存検証を行う。
6. 次のJSONをローカル一時ファイルへ作り、`npm run seo-rank-watch -- record --id ID --action FILE` を確認後 `--commit` で記録する。記録は変更後の本文hashと計測snapshotを結び、同じページを本番反映待ちとして保護する。

```json
{
  "method": "faq",
  "needs": "誰が、何を知るために検索したかを記す。",
  "gap": "上位ページと比較して確認した不足を書く。",
  "done": "実際に変更した箇所と内容を具体的に書く。",
  "serp": [{ "url": "https://example.com/reference", "gap": "この参考ページとの違いを記す。" }]
}
```

7. 変更MDX・設定・順位snapshot・実験台帳を明示指定してGit commitする。本番反映が成功したら `npm run seo-rank-watch -- deploy --id ID --run-id NUMBER` を確認して `--commit`。ghが返す**最新の成功したmainのcloudflare-deploy.yml**と、展開commitの本文hashが一致しない限り観察を開始しない。必要なcommitがローカルに無ければ先にgit fetchする。
8. 期限までは再改善しない。次の実行で実測レビューへ戻る。毎回、順位の大きな変化・判定・選定理由・検索意図・実施内容・観察期限を簡潔に報告し、効果を予測で断定しない。

`discover` は既存のpage×queryから有望な未登録クエリを最大10件提示する。登録・改善は自動で行わず、正規URL・検索意図・対象ファイルを確認する。

## 期間と効果判定

GSCの日付はAmerica/Los_Angeles、開始・終了日をともに含む。共有fetcherを7日指定すると正確に7日になる。既定はPTの今日−3日まで、`dataState: final`・web検索のみ。query/pageはequals、国/端末も固定する。日次平均順位は表示回数で重み付けし、0表示・position 0の行は順位なしとして保持する。履歴欠落や0表示を未インデックスと断定しない。

本番反映日の翌日から完全な7日を取り、反映日前の非重複7日と比較する。反映日は混在日なので両方から除く。レビュー予定は対象期間の末日+4日（JSTの表示・PT確定データ取得の余裕）。APIの返却状態・比較期間を確認してから裁定する。

- 前後とも20表示以上・表示のある日3日以上が必要（設定policy）。不足は14日、28日へ延長する。同じ長さの前期間と比較し、28日でも不足ならabandoned＝再検討待ち。
- 平均順位1.00が十分な非重複の連続7日×2で確認できればdone＝achieved。達成後は7日ごとの監視を継続し、低下・欠測を表示して自動再編集しない。
- 前後で0.5以上上昇したが未達ならproposed＝active。それ以外は運用上「no-effect」とし、次回は異なるmethodにする。統計的な有意差や因果効果の断定ではない。クリック・CTR・季節性も人が確認する。
- no-effectが3回に達したらabandoned。`resume --id ID --reason TEXT --commit` は再検討理由を残し、失敗回数の区切りを作る。

## 状態と保護

| 台帳status / 最新イベント | 表示 | 次の操作 |
|---|---|---|
| 未登録 / proposed | active（改善候補） | 1件選定・検索意図の分析 |
| proposed + record | 本番反映待ち | 成功したdeployを照合 |
| running | observing（観察中） | 期限後にreview |
| done | achieved（1位達成・監視） | 7日ごとに監視 |
| abandoned | 再検討待ち | 理由付きresume |

pre-commitの `check-seo-rank-watch --staged` は、**変更前HEAD**で観察中または本番反映待ちだったMDXの同一commitでの再変更を拒否する。判定記録と次の改善は別commitにする。共有のsrc/app・components・stylesやredirect変更も観察に影響するため停止する。

緊急の事実誤り修正などで観察を中断する場合のみ `interrupt --id ID --reason TEXT --commit` を先にGit commitする。理由を残さずガードを迂回しない。通常のSEO改善のために7日待機を短縮する用途には使わない。履歴の改変・削除は拒否する。無関係なNSM実験はこのCLIから終了させない。

ローカル認証は既存の `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` を使う。CIは既存secretを使う。鍵・Cookie・トークンを出力／コミットしない。Google SERPを独自スクリプトで取得しない。

検証: `npm run check-seo-rank-watch`、`node --test tests/seo-rank-watch.test.mjs tests/gsc-pagination.test.mjs`。画面は読み取り専用で、外部公開・任意shell実行ボタンは設けない。
