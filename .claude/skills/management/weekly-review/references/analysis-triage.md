# Phase 2 分析・統合と Phase 2.5 全件トリアージ

`SKILL.md` の Phase 2（backlog 消化サマリ・点検と Issue）と Phase 2.5 を実行するとき、「## 点検と Issue」「## 計測→改善トリアージ」を書くときに読む。

### Phase 2: 分析・統合

1. **達成率**: 計画タスクの完了率
2. **成果ハイライト**: 今週のトップ成果
3. **課題・ブロッカー**: 未達タスクの原因分析
4. **学び**: 発見・改善点
5. **backlog 消化サマリ**（下記）

#### backlog 消化サマリ（親が直接集計）

`/backlog-sweep` の実績を読む。**この節が dispatch-log の唯一の読み手**なので、省略すると記録が誰にも読まれないログになる（§9「読む人がいない検査は無いのと同じ」）。

```bash
node scripts/backlog-sweep-pick.mjs --json   # 現在の残量と分類率
node scripts/check-backlog-health.mjs         # 台帳の健全性（沈んだ不具合・定期の混入・重複候補）
node scripts/check-backlog-verify.mjs        # [検証:cmd] を実走し、赤→緑になったカード（完了の疑い）を出す
node scripts/report-defect-learning.mjs --since <今週月曜>  # 起票・完了した不具合と再発防止（検査 / memory / 正典 / 残すもの無し）の内訳
node -e "const d=require('./.claude/state/dispatch/dispatch-log.json');const w=d.entries.filter(e=>e.at>='<今週月曜>');const by=k=>w.filter(e=>e.outcome===k).length;console.log(JSON.stringify({total:w.length,done:by('done'),swept:by('swept'),blocked:by('blocked'),fail:by('fail'),byExecutor:w.reduce((a,e)=>((a[e.executor]=(a[e.executor]||0)+1),a),{})}))"
```

レビューには次の各行で書く:

- **消化**: done N 件 / 掃除（swept＝実査したら既に完了）M 件
- **残量**: カード総数 X 件（🔴/🟡/🟢）・前週比 ±Y
- **分類率**: `[種類:]` 付与済み A / 全体 B（旧 `[実行:]` 軸は 2026-08-26 廃止。未分類は選定順序〔不具合優先〕に乗らない）
- **モデル別**: executor 別の件数と失敗/手戻り（Phase C のモデル分業を見直す材料）
- **再発防止**: `report-defect-learning` の起票した不具合 N 件 / 閉じた不具合 M 件（検査・memory・正典・残すもの無し の内訳）。「残すもの無し」が続く種類の不具合は、検査にできないかを次週のカードにする
- **期日と時期**: `check-backlog-health` の S14（期日超過）と S15（`[時期:]` の月を過ぎたまま）。S14 はそのレビューで片付けるか期日を直す。S15 は終わっていれば削除、残りは月初の `npm run roll-backlog-when -- --write` で翌月へ回す。S16（マージ済み・閉じた PR を「PR #N（未マージ）」と書いたまま、または origin に無いブランチを同じ行にマージ・削除の記述なしで書いたまま。ブランチ名の無い「10/26 にマージ予定」は拾えない）は、そのレビューでカードの表記を「マージ済み・本番反映日」に直し、完了条件を満たしていれば完了にする。月次レビューの未実施は週次の点検（`npm run quality:audit:weekly`）の `monthly-review-due` と SessionStart が知らせる
- **台帳の健全性**: `check-backlog-health` の S2（🟢/🟣 に沈んだ不具合）・S4（`種類:定期`＝backlog の役割違反）・S9（`.claude/todo` の 4 層以外）。**この 3 つが 0 でない週は放置しない**（S2 は選定順で先頭に出るのに tier が嘘をついている状態、S4/S9 は置き場違い）。しきい値を超えたら次セッションで `/backlog-sweep --audit`

- **完了の疑い**: `check-backlog-verify` が `赤→緑` を出した週は、そのカードを次の `/backlog-sweep` で**実査**する（緑は完了の証明ではない——2026-08-18 に check-note-attachments の正規表現が案内済み 77 本を誤検出した実例がある）。`常時緑` が出たら、そのカードの `[検証:]` が surfacer を指していて**完了判定に使えない**ということなので、検証コマンドを差し替えるか外す。
- **外部書き込みの孤児**: weekly-review-guard の report digest（quality-audit `external-write-orphans`）が `orphan` を Issue にした週は**最優先**。「外部には出たのに台帳に記録が無い」状態で、台帳を信じて再開すると同じものを二重に外部へ出す。run ログから外部側の実体（videoId 等）を回収して台帳へ反映してから再開する。`silent-stop` は「未処理が残っているのに誰も回していない」通知（手動投入ジョブでは異常ではない）。**exit 2（検査不成立 N/M 取得失敗）は「痕跡なし」ではない**＝社内プロキシ配下などで run ログが取れていない。取れる環境で再実行してから結論する（DN-0225）。2026-06-17 の YouTube run が実例＝6 本アップ済みなのに台帳 pending のまま 2 か月放置された。
- **品質censusのdelta**: weekly-review-guard の report digest（quality-audit `quality-census`）が悪化（薄層への逆戻り・スコア低下）を Issue にした週だけ、該当記事を backlog へ（週次では実行しない）。
- **収益カバレッジ**: `npm run report-monetization-coverage` の配置別 CTA CTR・note label × 同期間の商品売上（ID付き比率）を1行確認する。売上は全流入経路の商品合計で、CTA別購入の帰属ではない。同じ商品の複数ラベルに表示する売上を合算しない。

blocked / fail があれば「課題・ブロッカー」へ、繰り返し blocked になるタスクは前提条件を backlog 本文へ書き足す。

#### 点検と Issue（全件に行き先・親が直接確認）

開いている Issue（`automation-failure` ほか全ラベル）と週次の点検を毎週読む。**Issue は起票されても閉じられなければ意味が無い**——
#457 は 2026-08-07 から 17 日 open のまま誰も見ておらず、しかも dedup 仕様で以後の同 channel の
失敗はすべてこの Issue へのコメント追記に埋没していた（2026-08-24 実査）。2026-10-01 にも #478 workflow-health（8/31〜）・
#455 security bump（8/6〜）が 1 か月開いたままだった。**通知チャネル自体が消化されていなければ、CI の赤を Issue にしても同じことが起きる**。

```bash
npm run review-checks -- --cadence weekly --run YYYY-Www --write
```

（点検は `review-wiring.json` の `checks`＝`npm run check-workflow-health` と `node scripts/check-backlog-health.mjs` と `npm run quality:audit:weekly`（quality-audit の cadence weekly＝期日が週・月の単位の点検と、結果がリポジトリの中身だけで決まる点検。毎日は回さない・DN-0847）と `npm run check-taxonomy-wiring`（分類と回遊の配線の要対応。赤なら `npm run report-taxonomy-wiring` で中身を読み、テーマ所属なしは分野・管理のタグか `topics:` を付け、昇格できる育成中のテーマは status を hub にするか判断し、一次資料で確かめてから 180 日を超えた計画・施策は一次資料で確かめ直して `config/policy-registry.json` の `checkedAt` を更新する。法令の節が出ない公開ハブは、そのテーマの記事 2 本以上の本文で関係する法令の条を e-Gov へリンクして引く（条文は一次資料で照合する）。規則は `.claude/knowledge/reference/content-taxonomy.md` §6）。結果は回ごとに `data/business/records/checks-weekly-<週>-<実行時刻>.json` に追記で残る。）
レポートの「## 点検と Issue」に、失敗・検査不成立の点検と開いている Issue・Dependabot の脆弱性の**全件**を
`- <コマンド名 or #番号 or dependabot:パッケージ名> 状況 → 振り分け: DN-xxxx / 定常 / 理由` で書く。行き先の無い項目が残る週は「実施できた」にならない（管理画面のレビュー手順が数える）。

- **自動化の失敗**: channel 別に「未復旧なら原因を 1 行」。
  **7 日以上 open のものは DN カードへ起票する**（放置＝チャネルが死ぬ）。復旧した Issue は起票元 workflow の次の
  成功で `report-automation-failure.mjs --resolve` が自動クローズする（2026-09-18 から。それ以前は人手クローズで
  open 8 件・最古 43 日が溜まり、この節自体が「消化停止」と書く状態だった）。したがって **open のまま残っている
  ＝まだ復旧していない**と読む。`--resolve` の配線が無い channel（人手ルーティン起票）だけ復旧確認後に人が閉じる。
  起票元は `ci.yml`（Pre-merge が赤）・`uptime-ping.yml`・`weekly-review-guard.yml`（記録層の沈黙／workflow health／
  report 区分 FAIL）・`index-coverage.yml`・`ops-audit.yml`（quality-audit の ops 区分のうち毎日の分＝会員配信・添付・広告の期限・Cloudflare・sitemap・
  収集の死活）・Mac の weekly-collect（channel weekly-collect＝土曜の収集の段の失敗と検算・note の公開状態の照合の検査不成立・DN-0847）・Mac の GSC の記録層（channel gsc-auto-review＝記録が書けなかった・Claude の【要確認】・DN-0849）


### Phase 2.5: 全件トリアージ（必須・計測→改善の起票）

ダイジェストの表示対象を**1 件残らず**処分して台帳へ起票する。散文のまま翌週へ持ち越さない
（月曜の `weekly-review-guard` が `check-growth-triage` で未処分・未反映を Issue にする）。

1. `npm run growth-triage -- list --json` で未処分を得る
2. 各 `OPP-…` の処分を決め、判断ファイル `.tmp/growth-triage-YYYY-Www.json` を書く（`{ "digestWeek": "YYYY-Www", "decisions": [...] }`）

   | action | いつ | 必須項目 | 行き先と実行者 |
   |---|---|---|---|
   | `backlog` | 単発の実装（CTA 配置・文言、title/description、計測の修理、導線ゼロの解消） | title / tier（high・mid・low・hold）/ category / domain（領域ラベル）/ kind / doing / done（high・mid は period＝YYYY-MM[..YYYY-MM]、任意 verify） | `.claude/todo/backlog.md` の DN → `/backlog-sweep` |
   | `experiment` | 効果を前後で測るべき変更（配置・文言の試行など） | title / hypothesis / targetMetric / targetDelta（任意 measure） | `experiments.json`（proposed）→ `/nsm-experiment start`。measure を付ければ CI が自動計測 |
   | `verdict` | 期限の来た実験（VERDICT_DUE 等。kind `search-strategy` は `verdict` で閉じず `search-improvement close`） | result（success・partial・no-effect・negative）/ learnings | 実験を close |
   | `bundle` | 既存カード・実験や同じバッチの起票で足りる | into（DN / EXP / OPP） | 起票しない |
   | `reject` | 対応しない | reason（10 字以上） | 12 週は再表示しない |
   | `defer` | 今は判断できない | until / reason | until まで再表示しない |

   申し送りのうち backlog へ送る単発作業は `"id": null` の `backlog` で起票できる。起票後の DN を Phase 4 の書式
   （`→ 振り分け: DN-####`）で末尾に書く（振り分けの検査は `check-handoff-extraction` が持つ）
3. `npm run growth-triage -- apply --decisions .tmp/growth-triage-YYYY-Www.json` で検証（dry-run）→ 問題なければ `--commit`
   （全件を先に検証し 1 件でも不正なら何も書かない。DN の採番に git の全履歴が要るのでローカルで実行する）
4. 出力された変更ファイルを**明示指定で** `git add` してコミット・push（`git add -A` 禁止）
5. 「## 計測→改善トリアージ」節に `OPP → 処分 → DN/EXP/理由` の表を書く

処分の目安: 期待効果/週が大きいものから。計測（measurement）は他の判断の前提なので先に直す。1 件の判断に
迷ったら `defer` ではなく、確かめる作業自体を `backlog` にする（保留の山を作らない）。
