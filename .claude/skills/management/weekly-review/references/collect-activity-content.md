# Phase 1 の収集（開発・コンテンツ・計画差分・校正学習・棚卸し・SNS キュー）

`SKILL.md` の Phase 1 から、Agent A・B・D・E・H・I を書くときに読む。下書き（draft.json）にある節は写すだけで、ここのコマンドは下書きに無い・欠けた材料だけ回す。

#### Agent A: 開発活動

```
調査項目:
- git log --since="7 days ago" --oneline
- git log --since="7 days ago" --stat --format="" | tail -1
- git diff --stat

出力形式:
- 「開発した機能・修正」を箇条書き
- 「変更規模」（コミット数、ファイル数）
```

#### Agent B: コンテンツ実績

```
調査項目:
- docs/ 配下で今週新規作成・更新されたファイル
- カテゴリ別のページ数変動
- **note の同期間PV・表示・流入元**: 土曜の収集の note-traffic 段が対象週（レビューの期間）を直接取得している。`note.traffic-period`（`data/note/traffic-period/`）を読む（無ければ未取得として書き、作らない）。business-reviewは全体をcomplete、資格別をpartialとして集計する。月次は `referrers` / `articles-pv` を別期間として読む。月次を週次へ按分しない。記事別販売にはマガジン販売が含まれないため、売上の正本はsales.json。流入元だけで販売理由を断定しない。
- note 公開状態ドリフト: `npm run verify-note-status` を実行（noteId 保有 article.md の
  frontmatter noteStatus ↔ ライブ公開状態を note 公開 API で突合・creds 不要）。
  ドリフト（ライブ=published / frontmatter=draft）があれば `-- --fix` で是正してコミット。
  ※予約投稿は go-live がサーバ側後刻で writeback できず draft 取り残しが起きるため週次で自己修復する
- IG 公開状態ドリフト: SNS 保留中は照合を回していない（土曜の収集に IG の段は無い）。`.claude/state/ig-reconcile/snapshot.json` は保留前の記録なので、日付を添えて読むだけにする（Graph API は使わない＝2026-09-23 ユーザー決定）。★ドリフトが出たら SNS の再開を待つ（`/ig-reconcile` スキルと照合の手順書は 2026-10-25 に外した）。
  SNS を再開するときは土曜の収集に IG の段を足す（weekly-collect-plan.mjs）。
- 競合再スキャンの期限: 週次の点検（`npm run quality:audit:weekly`・review-checks が下書きで回す・DN-0847）の `competitor-scan-due` が 90 日超を知らせる。FAIL の週だけ「点検と Issue」に行き先を書き、チャネルは `/competitor-review`、market（資格キーワードの市場スキャン）は次の月次レビューでの再取得を申し送る。
- 競合の変化と追跡候補（ココナラ）: `npm run report-competitor-watch -- --json` を実行（オフライン・committed state 参照・creds不要）。
  `changes[]`（値下げ・出品増減・撤収・累計販売 +20 件以上）、`candidates[]`（追跡外で関連サービスの販売実績 20 件以上の売り手）、
  `partial[]`（売上推定が一部だけの売り手）を読む。候補は次セッションで handle を解決して `config/competitors.json` の coconala に足すかを判断。一覧は管理画面 戦略 ＞ 資格と市場 ＞ 競合
- GSC/GA4 UI 取得・登録リクエスト・sitemap・GA4 カスタムディメンション: 経路は 3 つ（DN-0847）。`gsc-ui-due`・`gsc-indexing-due` は土曜の収集の gsc 段の検算（runs.json の理由「検算 gsc-ui-due: …」・落ちると Issue channel weekly-collect）、`ga4-dimensions` は週次の点検（`npm run quality:audit:weekly`）、`gsc-sitemaps-due` だけが日次の ops（automation-failure Issue channel ops）。どれかが赤の週だけ理由をそのまま列挙し、直し方（土曜の収集の gsc 段の結果・Google の再ログイン・`fetch-metrics.yml` の再実行と Search Console の権限・GA4 設定の反映）を申し送る。GA4 の不足が続くあいだはプログラム別 EPC／配置別 CTR が CI で欠測している点を必ず書く。
- **note の商品が購入者に届いているか（最重要）**: 日次の ops 点検（quality-audit の `ops:true`・赤は automation-failure Issue channel ops・復旧で自動クローズ）の `note-delivery-due` が、本文で約束した PDF がライブに無い（購入者が受け取れない）・実査が 14 日超・添付を捨てたまま、を知らせる（週次では実行しない）。Issue が開いていれば**レポート最上段**に置き、次セッションで添付の live 実査と再添付を行う（2026-08-11 の事故の再発防止）。
- **ココナラブログの健全性**: 送客先が販売中でない・下書き放置は CI ゲート（quality-audit `coconala-blog`・ci:true）が止めるので週次では実行しない。
- **ココナラの取引・評価**: `npm run check-coconala-orders -- --json`（オフライン・committed snapshot 参照・creds不要）。
  `actions[]` をそのまま列挙する。特に **`評価未送信`** は放置すると期限（取引完了から概ね2週間）を過ぎて
  **こちらの評価が永久に公開されない**。ココナラの取引通知・評価依頼は出品アカウントの登録アドレス
  `dobokunotecom@gmail.com` にしか届かず、Gmail コネクタが繋がっている `uruhayato373` 側には**1通も来ない**ので、
  メールでは気づけない（2026-08-11 実査）。`scanned.ratings` が 0 なら「静か」ではなく**検査対象ゼロ**を疑う。
  `snapshotAgeDays` が大きければ実体が古い＝土曜の収集の coconala 段が落ちている（runs.json の理由を書く）。
  その場合 `inconclusive:true` と理由が返るので、`actions` が空でも**「実体が検査不成立」として必ず surface する**（静かなのは
  「問題が無い」ではなく「見ていない」）。
- **教材からの展開**: `npm run check-content-expansion -- --json` で全教材の未確認・必要制作・原典待ち・確認後の変更を確認する。判定手順は `.claude/knowledge/reference/content-expansion.md`、対応表は管理画面 `/materials`（教材ページの「要確認のみ」）。対象0件や概念名の対応だけを完了にしない。残務は既存backlog IDへ接続し、公開・予約・効果は各チャネルと事業レビューのSSOTで別に確認する。
- **検索キーワード戦略（直す・記録・本番反映・判定・処置。その週のうちに回し、カードに積まない）**: 実験台帳（`experiments.json` の kind `search-strategy`）で回す（`docs/strategy/16_検索キーワード戦略.md`「改善サイクル」）。
  1. `npm run search-improvement -- sync --commit`（記録した commit を含む本番デプロイの日から計測を始める。CI も毎週回すので差分が無ければ何もしない）
  2. **直す**: `npm run report-search-opportunities -- --json` の `fileable[]`（直してよい候補。`lastResult` は前回の判定）を表示の多い順に `config.cycle.improvePerWeek` 件、develop で直して commit・push する（title・seoTitle・description・冒頭の答え・見出し・内部リンク。MDX の規約と refresh-indexes に従う。前回が効果なしのページは同じ直し方を繰り返さない。新規ページは作らない。冒頭に答えの段落を足すと「〜ます。」の 3 文連続〔content-quality 15-1〕に掛かりやすいので、常体へ逃げず、です・ます の中で文末を変える。サブエージェントに任せるときもこれを指示に入れる）。
  3. **記録する**: 直したページごとに `npm run search-improvement -- record --page <path> --change "何を直したか" --commit`（commit は develop に入ったもの。`--commit` の後は `git pull --ff-only` で取り込む）
  4. **週次の処置（全件）**: `npm run search-improvement -- triage --weekly` の要処置をすべて片付ける。判定待ちは `close --id EXP-### --result <success|partial|no-effect|negative> --learning "…" --commit`。本番に入らない改善は commit の所在を確かめる。受け皿外は `decide --cluster <id> --page <接頭辞> --accept --reason "…" --commit`（受け皿に加える）か `--route-to <狙いのページ>`（受け皿外のページから狙いのページへ内部リンクを足して commit してから記録）。旧 URL は表示どおりに処置する（転送・転送先の公開・サイト内リンクの張り替え。期限切れは `npm run gsc-indexing:request -- --urls <正規 URL> --commit`＝Google への送信なので運営者の承認を得てから。送信は indexing-history に残り、次の週から観察に戻る）。誘導の期限切れは判断をやり直す
  5. **完了条件**: `npm run search-improvement -- triage --check --weekly` が exit 0（要処置 0 件・今週の改善が `improvePerWeek` 件以上か候補が尽きた）。観察中のものは期限まで待つ
- **実験サイクルの期限**: `npm run check-experiment-due -- --json`（オフライン・`experiments.json` 参照）。
  これが「計測→記録→改善→**再計測**」の最後の輪。`due[]` の MEASURE_DUE / CLOSE_DUE / PENDING /
  NO_BASELINE をそのまま列挙する。改善を打って再計測されていない実験は学びが台帳に入らず
  サイクルが閉じない（EXP-004 は 27 日、EXP-005 は 4 日以上放置された実績がある）。
- **内部リンク健全性**: 公開ページの壊れた内部リンクは CI ゲート（quality-audit `internal-links`・ci:true）が止める。GSC の理由別 CSV との突合は `/google-search-growth` で行う（週次では実行しない）。
- A8 成果取込期限（月次）: 土曜の収集の a8 段の検算 `a8-report-due`（runs.json の理由「検算 a8-report-due: …」・DN-0847）が 30 日超・取得後に台帳が進んでいないことを知らせる。落ちている週だけ `/a8-report` を申し送る。掲載中の広告の未集計・混入疑い（`issues[]`）は `/a8-report` の中で扱う。
- **note の記事単位の同期（2026-09-29〜）**: 反映は土曜の収集の note-sync 段（レビューの後・1記事1回の更新）が行う。週次では**結果を読むだけ**: `data/note/sync-log.json` の最新run（更新した記事と部品・失敗・問題。deferredは日次添付上限による翌日再開待ち）と `npm run note-sync-plan`（反映待ち・止まっている記事と直し方）。管理画面 `/content/note-sync` でも同じものが見える。止まっている記事（中断・会員特典の公開範囲未指定・画像欠け・有料境界の見出しが無い・価格変更）はカードの直し方どおりに次セッションで直す。止まっていないかは note-sync 段の検算 `note-sync-freshness` と `npm run check-weekly-collect`（段ごとの最新）が見る。日次の ops は収集の死活（`check-weekly-collect:alive`）だけ（DN-0847）。落ちていれば `~/Library/Logs/doboku-note/weekly-review.log` と runs.json を確認する。旧 `/docs` → 新 URL の張り替えだけの「301 等価」は同期の対象にしない（`check-note-republish` が別に数える）。
- **土曜の収集とログインの健康診断**: `npm run check-weekly-collect` で土曜の収集の段ごとの最新の合否（運営者の取り直しを含む）を読み、runs.json の auth 段（ログインの確認と入り直し）の結果から期限切れのサービスを書く。期限切れは運営者の再ログイン（playwright-auth-profiles.md の「標準操作」のログイン。パスワードと 2 段階認証は人）として申し送る。Claude の中から `auth:status` やログインは回さない。
- **Drive vault の実体照合（Mac だけで成立）**: `npm run check-drive-vault` を回す（CI の quality:audit は `--metadata-only` で実体を見ないので、ローカルにしか無い正本はここでしか見つからない）。FAIL が 1 件でもあれば「## バックログの関門」に件数と group を書き、正本は `drive-vault-sync --group <g> --commit`、作り直したものは `--force` で反映する。WARN の `local-newer` は作り直しの反映待ちなので件数だけ記録する
- note 構成監査: 有料境界の破損（FULL_LOCK/PAYWALL_LEAK/BOUNDARY_SHIFT 等）は土曜の収集の note-audit 段（weekly-collect・公開 API）が検査し、指摘は runs.json の同じ段の理由、検査不成立は Issue（channel weekly-collect）で届く（レビューでは実行しない・DN-0847）。

  **出力の「実検査 N本（対象M・取得失敗K）」を必ず読む**。live 系の検査は取得できていなければ「異常なし」ではなく「検査できていない」＝ N が対象数から大きく欠けていたら結果を信用しない（取得失敗率 >20% ならスクリプト側が exit 1 で落とす）。2026-07-28 まで 675/675 が取得失敗でも緑を返していた実績がある。同種の live 検査 `check-note-live-headings` も同じ観点で見る。

- **公開ページの目視確認（note・YouTube／エージェント・2026-09-23〜）**: 土曜の Mac の収集（weekly-collect の `note-public-view` 段・レビューの前）は数値で判定し（note 全件＝公開 API で添付 PDF・価格・全文会員限定・本文の画像の欠け、代表ページ＝ブラウザでカード・はみ出し）、加えて**代表ページ**（資格×記事の種類ごと 1 本＝約 30 本）を**note のブレイクポイントで区切った帯ごとの画面幅**（`config/public-view-breakpoints.json`・5 幅）で撮って手元の置き場に残す（YouTube は SNS 保留中で撮っていない・DN-0852）。数値で決められない見た目の崩れはここで見る。
  1. `node scripts/fetch-note-public-view-shots.mjs --json` でその日の撮影を `.tmp/note-public-view-review/<撮影日>/` へ写す。exit 2（撮影なし・8 日より古い・欠け）は「未確認」と書く（画像 0 枚を「異常なし」と呼ばない）。`coverage` の撮影成立数/予定数を確認する。`breakpointDrift` はCSSが全部読めた場合だけ見直しの根拠にし、`unreadable` があれば判定保留とする。
  2. sonnet のサブエージェント（`general-purpose`・1 体。note と YouTube で分けてもよい）に各 `review/index.json` と画像の場所を渡し、ページごとに**画面幅を並べて**見て次を報告させる（判定の根拠は画像に写っているものだけ・推測で埋めない）: 特定の画面幅でだけ崩れる（重なり・はみ出し・切れ・空の枠・カードや図の欠け）／記号がそのまま出ている（`**`・バッククォート・`\*`）／カバー・サムネイルの文字が切れる／本文の図が題材と合わない／画面の価格表示と `index.json` の原稿価格の食い違い／**有料エリアの直前までで何が手に入るか分からない**（購入判断に要る情報が無い）。返り値はページごとに `ID・URL・画面幅・何が・どの画像か・重さ（直す/様子見）` の表。
  3. 「直す」は親が画像を見て確かめてから backlog へ DN を起票する（原因が原稿なら原稿を直して再公開、共通の型なら検査側で機械化できないかも書く）。

出力形式:
- 「今週追加したページ」
- 「更新したページ」
- 「note 公開状態ドリフト是正（N 本）」（あれば）
- 「note 同期（週次で更新 N 本・反映待ち M 本・止まっている K 本）」（止まっている記事があれば理由ごとの件数も）
- 「公開ページの目視確認（run・note N ページ／YouTube M 本・画像 K 枚・指摘 L 件）」（画像を取れなかった週は「未確認」と理由）
- 「競合再スキャン DUE」（週次の点検 `quality:audit:weekly` の `competitor-scan-due` が FAIL のときのみ・チャネル名つき。market は市場スキャン）
- 「ココナラ競合の変化 N 件 / 追跡候補 M 社」（`report-competitor-watch` の `changes[]`・`candidates[]` が空でないときのみ・1 行ずつ。新規追跡のみの変化は件数だけ）
- 「検索の改善を記録 N 件（EXP-###…）/ 計測開始 M 件 / 判定 K 件 / 週次の処置 要処置 0」（`search-improvement` の record・sync・close・triage を行ったとき）
- 「GSC・GA4 自動化の異常」（gsc 段の検算 `gsc-ui-due`・`gsc-indexing-due`、週次の点検の `ga4-dimensions`、ops Issue の `gsc-sitemaps-due` のどれかが赤のときのみ・理由と直し方つき）
- 「**note 未着（購入者が受け取れない）**」（ops Issue `note-delivery-due` が開いているときのみ・**レポート最上段に置く**）
- 「ココナラ 評価未送信 / 要対応」（`check-coconala-orders` の `actions[]` が空でないときのみ・→ 評価は `npm run coconala-rate-buyer`、実体の採り直しは運営者が端末で `scripts/weekly-collect.mjs --only coconala`）
- 「ココナラ 実体が検査不成立」（`check-coconala-orders` が `inconclusive:true` のときのみ・理由つき・→ 運営者が端末で `scripts/weekly-collect.mjs --only coconala`。Claude の中からは取りに行かない）
- 「実験の再計測 DUE」（`check-experiment-due` の dueCount > 0 のときのみ・id と理由つき・→ 各要素の `review` コマンドを転記）
- 「A8 成果取込 DUE（月次）」（a8 段の検算 `a8-report-due` が落ちているときのみ・→ 次セッションで `/a8-report`）
- 「実験の再測定 DUE」（`check-experiment-due` の `dueCount > 0` のときのみ・→ 次セッションで各要素の `review` コマンドを実行）
- 「実験の未処理の申し送り」（`check-experiment-due` の `issues[]` が空でないとき・due でなくても出す）
```

#### Agent D: 計画との差分

```
調査項目:
- .claude/state/weekly-reports/ の当週計画ファイルを読み込み
- 計画タスクの完了/未達を判定

出力形式:
- 「計画タスク vs 実績」の対照表
```

#### Agent E: 校正学習の蒸留

```
目的: 今週の校正作業から新ルール・原則精緻化・ユーザー嗜好・ワークフロー改善を抽出
      次週以降の校正品質を底上げする継続改善ループを週次で回す

実行方法:
- /distill-proofread-learnings --since "7d" を呼び出す
  （スキル実体: .claude/skills/management/distill-proofread-learnings/SKILL.md）
- 分析対象: git log で直近 7 日の `content/site/` 配下の MDX/SVG コミット
- 出力: .claude/state/proofread-learnings/YYYY-MM-DD.md

出力形式: 「## 校正学習の蒸留」セクションに以下を埋め込む:

## 校正学習の蒸留

### 今週の抽出結果
- 既存原則の適用: N 件（学習対象外）
- 新規ルール候補: N 件
- 既存原則の精緻化: N 件
- ユーザー嗜好: N 件
- ワークフロー改善: N 件

### 採択候補（ユーザー承認待ち）
| # | カテゴリ | 概要 | 反映先 |
|---|---|---|---|
| 1 | 新規ルール | ... | content-principles.md §X |

### 学習ログ
- `.claude/state/proofread-learnings/YYYY-MM-DD.md` に詳細記録

注意:
- 2 回以上適用されたパターンのみ新規ルール候補に昇格（偶然排除）
- 本エージェントは候補を surface するのみ。適用はユーザー承認後に別途実行
- 候補がなければ「今週の学習候補: なし」と記録して次週へ
```

#### Agent H: handoff/doc ライフサイクル棚卸し（surface）

```
目的: docs/handoffs/ に active handoff が溜まるのを週次で検出する。
      機械 surfacer の候補を列挙し、タスク抽出・退避を促す。判定も適用もしない。

調査項目:
- weekly-review-guard の report digest（quality-audit `doc-lifecycle`・`--report-only`）が候補を Issue にしている週だけ、その候補を読む（週次では実行しない）
- 各候補が .claude/todo/ から参照されているか
  （tracked=あり → 生きたタスクは backlog 済みで DELETE 候補（抽出済みの見込み） /
   tracked=なし → backlog へのタスク抽出漏れの疑い）

出力形式: 「## ドキュメント棚卸し（handoff 抽出→削除候補）」セクションに以下を埋め込む

## ドキュメント棚卸し（handoff 抽出→削除候補）

### active handoff 候補（{m} 件）
| handoff | 経過 | tracked(todo) | 完了シグナル(PR/SHA) | 推奨 |
|---|---|---|---|---|
| 2026-MM-DD-xxx.md | 21d | あり | #123 | /doc-declutter で削除判定 |

- 既定方針: handoff は「extract→削除」（残作業があっても KEEP しない・handoffs/ は溜めない・記録は git 履歴・`_archive/` は 2026-07-11 廃止。真実源=information-architecture.md「handoff のライフサイクル」）
- tracked=あり: 生きたタスクは backlog 済み → そのまま削除候補
- tracked=なし: backlog へタスク抽出してから削除（抽出漏れ注意）

### デッドコード在庫（knip）

デッドコードの増加は週次の点検（`npm run quality:audit:weekly` の `knip-ratchet`・pre-commit でも見る）が知らせる。CI ゲートではない（DN-0805 で ops へ・DN-0847 で週次へ）。在庫の返済（baseline の締め直し）は四半期の棚卸しで行う。knip は false positive を出す（npm scripts 経由・動的 import・スキルから叩かれる .mjs）ため、消すには grep 裏取りが要る（真実源: memory `knip-dead-code-audit`）。

> なぜ週次で出すか: ラチェット（CI ゲート）は**増加を止めるだけ**で、既存の在庫は永久に残る。
> 返済は人間の判断が要るので、既に読まれる場（本レビュー）に載せて棚卸しの機会を作る。
> report のまま放置すると誰も読まない——`knip` は `batch-approve.mjs` の壊れ import を
> 報告し続けたまま 4 か月放置され、`note-meta-lint` は 3 週間ゼロ件検査のまま FAIL を
> 出し続けていた（2026-08-16 発覚）。

### アクション提案
- 候補が 1 件以上 → 次のローカルセッションで `/doc-declutter` を実行（外部実体を検証して抽出→削除）

注意:
- 本エージェントは surface のみ。削除/抽出/commit はしない（判定・適用は doc-curator + /doc-declutter）
- 候補 0 件なら「棚卸し不要」と記録し次節をスキップ
- _archive 内は対象外（check-doc-lifecycle が既に除外済み）
```

#### Agent I: SNS 予約キュー投入 surfacer（X カウントダウン）

```
目的: content/sns/x/draft/ のコミット済み下書きで「X 予約キューへ未投入のまま go-live が近い」
      ものを週次で検出し、次バッチの投入を促す。直前カウントダウンのように週次小分けで投入する
      運用（§11 凍結回避＝一括投入しない）で、投入忘れ＝予約キューの穴を防ぐ。

調査項目:
- npm run x-queue-surfacer   （オフライン・status.json + tweets.md 読みのみ。
  ルーチンのリモート checkout でもローカル creds 無しで動く）
  - 投入済み台帳の最終予約日時（last_queued_at、ISO形式。途中の空白を含み、連続した充足を保証しない）と、lookahead（既定 8 日）内に go-live を迎える
    未投入下書きを DUE / OVERDUE で列挙する

出力形式: スクリプト出力（📮 ヘッダ + 表 + 投入手順）をそのまま「## SNS 予約キュー投入（X）」
セクションに埋め込む。DUE/OVERDUE が 1 件以上あれば「## 来週への申し送り」にも 1 行起票する。

注意:
- 本エージェントは surface のみ。実際の投入は次のローカルセッションで
  x-schedule-guard --queue 緑 → publish-x → x-sync-status の手順で人手（クラウドルーチンは
  ローカル Playwright プロファイルを持たないため投入できない）。
- 「✅ 投入待ちなし」なら本節は 1 行で記録して次へ。
```
