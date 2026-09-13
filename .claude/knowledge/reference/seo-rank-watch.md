# SEO Rank Watch — 資格受験者の課題を1件ずつ改善する

## 真実源と入口

- 監視対象・選定方針: `.claude/config/seo-watchwords.json`（資格、意図、読者、必要な情報、登録根拠、次の学習行動、query、正規URL、原稿、priority、country、device）。日本 `jpn`・全端末が初期値。query/URL/国/端末を変える場合は別idを作る。
- 順位履歴: `.claude/state/metrics/gsc/rank-watch/watch-*.json`。GSC生データ・期間・集計・固定条件を追記専用で保存する。既存履歴は修正しない。
- 改善履歴: `.claude/state/experiments.json` の `kind: seo-rank-watch`。actions/historyは追記専用。別の改善台帳を作らない。
- 実行・方針レビュー履歴: 同じGSC保存先の `rank-watch/run-*.json`。当時の設定hash・資格別候補・順位の参照先・選定/待機理由・直近の判定を追記する。改善なしの回も記録し、過去ファイルは変更しない。
- 実装: `scripts/seo-rank-watch.mjs` と `scripts/lib/seo-rank-watch.mjs`。管理画面 `/metrics/seo-watch` は同じ判定関数を読む。
- スキル入口: `/weekly-improve --rank-watch`（「SEO Rank Watch」もこのモードへルーティング）。本番反映は従来の `/deploy`。

## 資格検索を優先する方針

目的は受験者が学習・過去問演習・答案作成へ進める検索流入を増やすこと。順位1位の件数だけで成功としない。事業上の位置づけは [事業戦略のSEO方針](../../../docs/strategy/03_事業戦略.md) を参照する。

| 意図 | 判断 | 例 |
|---|---|---|
| exam-task | 具体的な受験課題を優先して改善 | 年度別解答例、論文の書き方 |
| exam-topic | 試験の論点学習を改善 | 総監キーワード、専門科目の出題テーマ |
| qualification-guide | 広い入口を中長期で監視 | 資格名単独 |
| reference | 一般用語・実務需要を監視 | スクレーパとは |

重点は1級土木・技術士総監・技術士建設部門。各資格に少なくとも1つ、意図を確認した記事候補を持つ。資格名を機械的に付けた記事を増やさず、同義語のために別ページを作らない。アプリ型ツールは関連需要として計測するが、複数ソースから成る改修を記事1件の改善として扱わない。

選定は **受験意図 → 学習上の価値(priority 1が最高) → 試験時期 → 順位・需要の段階 → 直近28日の資格別改善数 → 順位・表示回数**。価値はwatchwordのrationaleとnextStepで説明する。試験時期は `.claude/config/exam-calendar.json` の該当eventを読み、90日以内の試験前を優先する。未発表の次年度日程を補完しない。同条件なら最近の改善が少ない資格を先にし、資格のために無理に候補を作らない。

`mode: monitor` は自動改善しない。資格名の有無だけで意図を決めず、登録時にaudience/need/rationale/nextStep/evidenceを確認する。GSC由来は実際にその語の表示がある保存データを指定する。仮説登録はhypothesisとして需要未確認を明示し、改善前の検索意図・SERP比較を省略しない。

## 1回の実行

1. 既定はCI取得済みデータで `npm run seo-rank-watch -- report --json`。ローカルで取得できるときだけ `npm run seo-rank-watch -- collect`。既存 `fetch-metrics.yml` が週次に同じcollectを実行する。GSCを使えなければ欠測のまま保留し、WebSearchの順番を順位履歴へ混ぜない。
2. `npm run seo-rank-watch -- review --no-fetch` で期限到来分の判定を確認し、`--commit` で実験台帳へ記録する。正確な前後期間のsnapshotが無ければ保留。ローカルAPIが使える場合は `--no-fetch` を外して取得する。CLIの `--commit` はJSON保存の意味で、Git commitは別工程。
3. 方針レビューが期限なら下記の見直しを先に記録する。reportのselectedを1件だけ扱う。資格・受験意図・価値・時期を先に判定し、その中で2〜10位→11〜20位→前回未達→高優先度の欠測とする。1位のワードは改善対象にせず、十分な非重複7日×2ならreviewでachievedへ移す。順位履歴が9日超古い、観察中、同じページが観察中、既存NSMの同時実行上限2件なら着手しない。方針レビューの期限超過も新規改善を停止する。候補ゼロで新たな改善を作らない。
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
8. `npm run seo-rank-watch -- log-run --reason "今回の判断と次に確認する内容"` を確認して `--commit`。改善なし・上限待ち・欠測も記録する。同日・同内容の重複保存はしない。失敗時は `--failure --reason "秘密を含めない失敗理由と再開条件"` で記録し、成功した改善として扱わない。run JSONもGit commitする。期限までは再改善せず、次の実行で実測レビューへ戻る。ユーザーへの通知は順位の大きな変化・実施・判定・失敗・必要な操作がある場合だけ。同じ待機でも記録は続け、通知とは分ける。

`discover` は既存のpage×queryから重点資格ごと最大3件を提示する。少数表示も発見候補には含めるが、効果判定の20表示基準を下げない。旧URLは `_redirects` で候補の正規URLを解決し、数値の出所は旧URLと明示する。正規URLの順位として合算・転記しない。登録・改善は自動で行わず、正規URL・検索意図・対象ファイルを確認する。

## 28日ごとの方針レビュー

1. reportの資格別候補、改善件数、run履歴、experimentsの判定を読む。取得不足・上限待ちが続く場合は、期間・認証・既存実験のレビューなど次に解消する条件を明示する。無関係な実験を枠空け目的で終了しない。
2. 既存のGSC/GA4保存データで資格別の検索クリック、過去問/対策記事への回遊、計測できる学習・商品導線を確認する。出所・期間をnoteに記す。取れない指標は未計測とし、順位やクリックから売上を推測しない。資格ごとの平均順位を混ぜて成果指標にしない。
3. 監視語の追加/監視のみへの変更、priority、時期、登録根拠を見直す。語を追加しただけのクリック増を改善効果にしない。継続比較では同じquery/page/国/端末/期間の集団を使い、設定hashが変わった場合は比較範囲を確認する。
4. 設定・必要な方針文書を更新し、`npm run seo-rank-watch -- log-run --policy-review --reason "確認したデータ・学び・維持/変更の理由"` を確認後 `--commit` する。設定・runをGit commitし、28日後の見直しへつなぐ。方針レビューで7日観察を短縮したり、過去のactionsを修正したりしない。

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
