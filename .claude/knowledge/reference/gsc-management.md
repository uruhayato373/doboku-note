---
title: GSC 管理 SSOT（index coverage / performance / hygiene）
---

# GSC 管理 SSOT

Google Search Console の継続管理（インデックス被覆・検索パフォーマンス・衛生）の**分業・閾値・cadence・判断マトリクス・観測ログ**の真実源。計測は CI/CD 供給が正（ローカル creds 不要・会社 PC はプロキシ遮断＝[measurement-incidents.md](measurement-incidents.md) 2026-06-05）。

> [!note]
> 2026-06-19 のトラフィック減調査で「サイトの約半分が未 index（原因はドメイン権威性）」が真因と判明。だが当時 index coverage を継続追跡する担当が無く、診断は memory の一回限り手順に留まっていた。本 doc + `gsc-index-auditor` + `index-coverage.yml`（月次）+ `/gsc-review` でこれを恒久構造化した。

## 管理対象と定義

| 領域 | 定義 | 主指標 |
|---|---|---|
| **Coverage** | sitemap 申告 URL のうち Google が index した割合 | `indexed_ratio = indexed / sitemap_urls` |
| **Performance** | index 済みページの検索成績 | impressions / clicks / CTR / position |
| **Hygiene** | sitemap の無効・重複申告 | 404 / redirect / canonical 不一致 |

## 分業表（誰が何を担当するか）

| 担当 | 種別 | 責務 | 入力 → 出力 |
|---|---|---|---|
| `index-coverage.yml` | CI（月次・JST 11:00 毎月1日） | 全 sitemap URL の URL Inspection + 履歴追記 | API/sitemap → `url-inspection/*.json` + `index-coverage-history.json`（develop） |
| `fetch-metrics.yml` | CI（週次・金 JST 6:00） | GSC query/date/page/page×query + GA4 | API → `.claude/state/metrics/{gsc,ga4}/` |
| `gsc-index-auditor` | Evaluator（sonnet） | coverage 分類・indexed_ratio・履歴差分・原因バケット・hygiene URL surface | url-inspection + history → 診断テキスト（audit-only） |
| `metrics-analyzer` | Evaluator（sonnet） | index 済みページの performance 8 パターン（SNS-Source-Shift＋page×query の Cannibalization/Content-Decay 含む） | gsc/ga4（`gsc-page-query-*` 含む）→ `improvements/*.md` |
| `performance-auditor` | Evaluator（sonnet） | CWV / PSI | psi → improvements |
| **`gsc-auto-review.yml`** | **CI（週次・金 JST 12:00・要 `CLAUDE_CODE_OAUTH_TOKEN`）** | **記録層の自動化**。オーケストレータ＝`claude-fable-5`。毎週 metrics-analyzer を起動し観測ログへ週次エントリを追記。未記録の inspection-batch があれば同一実行で gsc-index-auditor も起動し月次エントリを追記。異常時のみ `automation-failure` Issue 起票。**重い JSON 走査は sonnet サブエージェント側**（親は生の計測 JSON とログ全文を読まない） | committed state → `gsc-management.md` 観測ログ ＋ `improvements/*.md`（develop へ push） |
| ~~`doboku-note GSC auto review`~~ | クラウドルーティン（**退役 2026-08-06**） | 上記 CI が引き継ぎ自走を確認したため `enabled:false`。実行履歴が repo から見えないためクラウドは正にしない | — |
| `/gsc-review` | Skill（月次・**手動**） | 上記ルーティンの応急・深掘り・上書き用。CI データ確認 → gsc-index-auditor 起動 → 観測ログ追記 | — |
| `/weekly-improve` | Skill（週次・**手動**） | 同上（performance 側）。metrics-analyzer 起動 | — |
| `/google-search-growth` | Skill（月次・**ローカル手動**） | GSC 理由別 **UI CSV**（API で取れない例 URL）を Playwright 取得 → 正規化 → URL Inspection/GSC page×query/GA4/sitemap/_redirects/生成HTML と突合 → 修正アクション分類（gsc-browser-collector/gsc-csv-auditor/seo-fix-planner）→ approval gate | ブラウザ → `gsc-ui/<run>/`（raw・gitignore）＋ **`gsc-ui/ssot/`（追跡 SSOT）** ＋ `improvements/search-growth-latest.md` |
| `check-gsc-ui-due` | Script（surfacer） | 月次 UI 取得の期限催促。**日数だけでなく完全性も見る**＝`lastComplete` の年齢（30日）／`lastAttempt.complete !== true` のいずれかで DUE。gsc-ui（必須）と ga4-ui（任意）の 2 チャネル | committed `{gsc-ui,ga4-ui}/last-run.json` → weekly-review が DUE を surface |
| `check-gsc-auto-review` | Script（surfacer・オフライン） | **記録層の沈黙検知**。観測ログの見出しを走査し「週次エントリが 8 日超前」「最新 inspection-batch が 8 日超未記録」を DUE 判定。走査 0 件は OK でなく「検査不能」。weekly-review-guard が実行し DUE なら Issue 起票 | `gsc-management.md` 見出し + batch 日付 → DUE 一覧 |
| `check-coverage-thresholds` | Script（ゲート・CI） | 月次データ publish 直後の機械ゲート。**赤=無条件異常のみ**（inspected 0 / sitemap > 1,900 の上限到達 / ratio < 60%）。前月比 −5pt・discovered > 20%・hygiene > 0 は warning に留めルーティンの判断へ回す | `index-coverage-history.json` → exit 0/1 |
| `check-google-ui-ssot` | Script（ゲート） | 追跡 SSOT の整合（marker ↔ history ↔ urls の runId・スキーマ・truncated・**検査ゼロ**）。SSOT が空／直近実行が不完全なら exit 1 | `gsc-ui/ssot/**` → exit 0/1 |
| `ga4-admin-setup` | Script（ローカル手動・Playwright） | GA4 管理画面の設定を desired state と突合し、**不足カスタムディメンションを作成**（既定 dry-run・`--commit` で実行）。データ保持は観測のみ | `config/ga4-admin-desired-state.json` → `metrics/ga4-admin/inventory-latest.json` |
| `check-ga4-dimensions` | Script（ゲート・オフライン） | desired state と最後の実機観測を突合。blocking なカスタムディメンション（`event_label`/`cta_placement`）が未登録なら exit 1 | inventory-latest → exit 0/1 |
| `check-internal-links-vs-gsc` | Script（ゲート・オフライン） | **公開ページ**が GSC の 404/リダイレクト URL を指していないか（SSOT と全 MDX/src を突合）。旧 URL 件数を能動的に減らせる唯一のレバー | `gsc-ui/ssot` + MDX → exit 0/1 |
| `gsc-request-indexing` | Script（ローカル手動・Playwright） | 未登録 URL を URL 検査で診断し、**インデックス登録をリクエスト**（既定 dry-run・`--commit` gate・上限 10 件/回）。crawled-not-indexed への直接レバー | SSOT → `gsc-indexing/{requests-latest,history}.json` |
| `check-experiment-due` | Script（surfacer） | 実験台帳の再計測/close 期限（サイクルの最後の輪）。weekly-review が列挙 | `experiments.json` → DUE 一覧 |
| 機械履歴 | `index-coverage-history.json` | indexed_ratio の時系列 | CI が append |
| 人間判断履歴 | 本 doc「観測・判断ログ」 | 何を打ち手にしたかの意思決定記録 | `/gsc-review` がユーザーと追記 |

> [!important]
> Coverage（gsc-index-auditor）と Performance（metrics-analyzer）は**守備範囲が直交**。前者は「載っているか」、後者は「載っているページがどう成績を出すか」。混同しない。

## 閾値

| 指標 | 警戒 | 目標 |
|---|---|---|
| `indexed_ratio` | < 60% | ≥ 80% |
| `discovered_not_indexed` 割合 | > 20% | ≤ 20% |
| hygiene（404 / redirect） | > 0 | 0 |
| 未検査差分（`inspected < sitemap_urls`） | sitemap > 1,900（quota 上限） | — |

## cadence

- **週次（CI・自動）**: `gsc-auto-review.yml`（金 JST 12:00＝fetch-metrics の 6 時間後）が
  metrics-analyzer を起動 → 観測ログへ週次エントリ。**未記録の inspection-batch があれば同一実行で月次診断も行う**
  （月初後の最初の金曜に発火）。よって下の月次 CI → 記録の流れは**人手を介さず閉じる**。
  `/gsc-review`・`/weekly-improve` は応急・深掘り・上書き用として存続
- **月次（CI・自動）**: `index-coverage.yml`（毎月1日 JST 11:00）→ `check-coverage-thresholds` が無条件異常を赤落ち →
  次の金曜にルーティンが観測ログへ記録（手動で先回りするなら `/gsc-review`）
- **月次（ローカル・手動）**: `/google-search-growth` で理由別 UI CSV を取得 → 突合 → 修正計画 → 観測ログ追記。**放置防止**は `check-gsc-ui-due`（30日）を weekly-review が surface（DUE なら次セッションで実行）。`/gsc-review`（coverage 全体）の深掘り＝理由ごとの例 URL を足す層。
- **週次**: `fetch-metrics.yml`（CI・金 JST 6:00）→ `/weekly-improve`（performance 側）

> [!warning] 何が自動で回り、何が回らないか（2026-08-06 更新）
> **自動（GitHub Actions cron・実績で確認）**: fetch-metrics（週次）/ psi-audit（日次）/
> index-coverage（月次）/ link-audit / r2-audit / note-live-audit / uptime-ping。
> **オフライン surfacer も CI 側で自動**（`weekly-review-guard.yml` が毎週月曜に実行）:
> check-experiment-due / check-gsc-ui-due / **check-gsc-auto-review** / check-google-ui-ssot /
> check-ga4-dimensions を job summary へ出力し、check-internal-links-vs-gsc は hard fail させる。
> **意味判断層**: GSC 記録層は **CI へ移行済み**（`gsc-auto-review.yml`・金曜・claude-code-action）。
> クラウドルーティンに残るのは `doboku-note weekly PDCA`（月曜・週次レビュー文章化）のみ。
> 生存確認は前者が `check-gsc-auto-review`、後者が `check-weekly-review` で、
> どちらも repo 側から沈黙を検知し `automation-failure` Issue になる。
>
> **自動で回っていないもの**:
> 1. **Playwright 経路は原理的に CI 化不可**（Google ログインが必要）＝`search-growth:audit` /
>    `ga4-admin:check` / `gsc-indexing:request` は月次の手動儀式。放置検知は上の surfacer が担う。
> 2. **`/nsm-experiment measure` の実行も手動**。期限の surface は自動、判断と記録は人（セッション）。
>    実験の start（`running` 遷移）も人の判断＝ルーティンは**推奨までで登録しない**。
>
> **訂正（2026-08-06）**: 本ブロックは 2026-07-30 まで「`/weekly-review` のクラウドルーティンは
> 停止している（W30/W31 手動・guard 2 週連続赤）」と記していたが、**これは誤りだった**。
> 赤の原因は guard の判定方法（保持方針で先週分が削除され構造的に必ず赤くなる偽赤）で、
> ルーティン自体は回っていた（W31・W32 とも自動生成の実績あり）。guard は
> 「現存する最新レビューが先週以降か」判定へ作り替え済み。詳細は
> [measurement-incidents.md](measurement-incidents.md) の 2026-07-30 エントリ。
> **教訓: ゲートが赤いとき、まずゲート自身の欠陥を疑う**（偽赤は偽緑と同じくらい有害）。

- **GA4 管理画面 設定（ローカル手動・随時＋90日で再観測）**: `npm run ga4-admin:check`（観測・dry-run）→ 不足があれば `npm run ga4-admin:apply`（`--commit`）。
  オフラインの `npm run check-ga4-dimensions` が desired state と最後の観測を突合し、blocking な未登録を FAIL にする。

> [!warning] 「取得したつもり」を作らないための不変条件（2026-07-30 制定）
> 1. **失敗は月次サイクルの時計をリセットしない**。マーカーは `lastAttempt`（毎回更新）と `lastComplete`（完全な run のみ更新）を分けて持つ。未ログインで即中断した run が直前の成功記録を消した事故の再発防止。
> 2. **部分成功を `ok` と記録しない**。`row-not-found`（そのスコープに当該理由のページが 0 件＝正常なゼロ）と、`export-button-ambiguous` 等の**失敗**を分けて数え、失敗が 1 件でもあれば `partial`。取得成功 0 件の面は UI 変更の疑いとして `suspiciousScopes` に出す。
> 3. **不完全なら exit 0 にしない**（fetch/normalize ともに）。合成コマンドの `&&` 連鎖がそこで止まる。
> 4. **CSV から得た情報は commit する**。raw CSV は再取得しかできないのに run ディレクトリは gitignore だったため、worktree を捨てた時点で URL 情報が消えていた（2026-07-23 の 1,952 行が実際に消失）。

> [!important] CI 例外＝ブラウザは本人セッションで通る
> 本 doc の原則は「計測は CI/CD 供給が正・ローカル creds 不要（会社 PC はプロキシで外部 API 遮断）」。
> だが `/google-search-growth` は **正当な例外**＝Playwright が**ユーザーの実 Google セッション**で GSC UI を
> 開くため、サービスアカウント API が遮断される環境でも UI CSV を取得できる。ログイン/2FA/CAPTCHA は人間、
> CI 化不可（ゆえに `check-gsc-ui-due` で月次を催促する手動儀式）。将来セッションはこれを「ローカルで計測する
> な」ルール違反と誤認して退役させないこと（[measurement-incidents.md](measurement-incidents.md) 2026-06-05 の対象は API）。

## 判断マトリクス（原因バケット → 打ち手）

URL Inspection の `coverage_state` と `page_fetch_state` から真因を切り分ける（推測ではなく実データで）。memory `reference_gsc_diagnosis_toolkit` の判定ロジックを本 doc に移植・SSOT 化。

| 観測 | 真因 | 打ち手 |
|---|---|---|
| `検出-未登録` 多 + `page_fetch=SUCCESSFUL` | **ドメイン権威性**（技術問題なし。Google が登録価値を低く判定） | 外部被リンク獲得・独自データ資産・薄いページの統合／**量の抑制**（低権威ドメインへの大量追加は index 率を下げる）。内部リンク追加・title 調整では動かない |
| `page_fetch` が SUCCESSFUL 以外 | **技術**（fetch 失敗 / robots / 5xx / SSR 破壊） | 最優先で修正。SSR は curl で `<main>` + 主要キーワード確認（[measurement-incidents.md](measurement-incidents.md) W16 BAILOUT） |
| `404` / `redirect` / canonical 不一致 | **hygiene**（sitemap が無効/重複を申告） | 該当 URL を sitemap から除外 or 正リダイレクト。`.claude/todo/` に起票 |
| `代替ページ(canonical)` | 重複判定 | canonical 統合の意図と一致するか確認 |
| index 済みなのに 90 日 imp=0 | 戦略資産集中の根拠 | 低価値ロングテールは強化対象外 |

### 補助ツール（深掘り時）

- 母集合生成: `node .claude/scripts/list-sitemap-urls.mjs`（公開 sitemap → 全 URL・creds 不要）
- URL Inspection: `npm run inspect-url -- --file <list>`（2,000 URL/日/property 上限）
- 集計→履歴: `node .claude/scripts/append-coverage-history.mjs --batch <path> --date <YYYY-MM-DD> --sitemap-count N`
- 既存分析: `.claude/scripts/{analyze-gsc-coverage,analyze-hubs,build-noindex-candidates}.mjs`

## データの所在

| 種別 | パス |
|---|---|
| URL Inspection 生データ | `.claude/state/metrics/url-inspection/inspection-batch-*.json` |
| indexed_ratio 時系列 | `.claude/state/metrics/gsc/index-coverage-history.json` |
| GSC query/page/date | `.claude/state/metrics/gsc/gsc-*.json` |
| 改善候補（performance） | `.claude/state/improvements/*.md` |
| GSC UI 理由別 CSV（生・**gitignore**・再取得のみ） | `.claude/state/metrics/gsc-ui/<run>/`（raw ZIP + manifest + `normalized/*.json`） |
| **GSC UI 情報の SSOT（committed）** | `.claude/state/metrics/gsc-ui/ssot/urls/<issue>--<scope>.json`（最新 URL 一覧）＋ `ssot/history.json`（run 別件数）＋ `ssot/diff/<runId>.json`（URL 増減） |
| GSC UI 取得マーカー（committed） | `.claude/state/metrics/gsc-ui/last-run.json`（schemaVersion 3＝`lastAttempt`／`lastComplete`／`legacy`。`check-gsc-ui-due` が参照） |
| GA4 UI 取得マーカー（committed） | `.claude/state/metrics/ga4-ui/last-run.json`（任意チャネル・一次経路は Data API） |
| GA4 管理画面 設定の期待値 | `.claude/config/ga4-admin-desired-state.json` |
| GA4 管理画面 設定の観測（committed） | `.claude/state/metrics/ga4-admin/inventory-latest.json` ＋ `history.json` |
| インデックス登録リクエストの記録（committed・**SSOT**） | `.claude/state/metrics/gsc-indexing/requests-latest.json` ＋ `history.json`（診断 state / reason / crawl・index 許可 / 送信結果）|
| 実験台帳（committed） | `.claude/state/experiments.json`（`/nsm-experiment` が管理・`check-experiment-due` が期限判定）|
| 検索流入 修正計画 | `.claude/state/improvements/search-growth-latest.md`（run JSON は gitignore） |

## 観測・判断ログ（append-only・人間の意思決定記録）

> 数値は `index-coverage-history.json` を正とする。ここには「何を観測し、何を打ち手に決めたか」を記す。

書き手は 4 系統（自動 2 + 手動 2）。見出しに区別を付けて同じ時系列に積む:

- `### YYYY-MM-DD（月次・自動レビュー）` / `### YYYY-MM-DD（週次・自動レビュー）` — クラウドルーティン
  `doboku-note GSC auto review`（金 JST 12:00）の自動記録。**人間の上書き・追記は歓迎**（後から
  同日付で手動エントリを足しても良い）。エントリ長は週次 20 行 / 月次 25 行以内に収める。
  沈黙検知は `check-gsc-auto-review`（weekly-review-guard が毎週実行し DUE なら Issue 起票）
- `### YYYY-MM-DD（月次・/gsc-review）` — coverage の観測と打ち手（手動。応急・深掘り・上書き用）
- `### YYYY-MM-DD（週次・/weekly-improve）` — performance 候補の裁定（採用→EXP-ID / 見送り→理由 /
  保留→**再浮上の条件**）。`improvements/{date}.md` は候補の生データ、ここはそれが**どう裁定されたか**の記録

> [!important] 自動エントリは「裁定済み」を上書きしない
> ルーティンは追記前に直近 2 エントリを読み、**再浮上の条件**を満たさない候補を再提案しない。
> 既存エントリの編集・削除もしない（append-only）。同じ候補が毎週蒸し返される状態は
> 「保留に条件が書かれていない」サインなので、人間側が条件を明記して解消する。

### 2026-08-04（performance・High-Impr-Low-CTR 4 本の裁定 → 全部見送り）

**候補**（`gsc-page-2026-07-30`・窓 6/29〜7/27）: 表示は多いのにクリックが付かない 4 URL。
当初はメタ（title / description）改善の 28 日実験にする想定だった。

| URL | 表示 | CTR | 平均順位 | 主クエリ（`gsc-page-query`） |
|---|--:|--:|--:|---|
| civil-1-textbook-scraper | 244 | 0.82% | 9.7 | スクレーパとは（112） |
| civil-1-textbook-network-schedule | 131 | 0.76% | 32.5 | ネットワーク工程表（31・**順位 63.7**） |
| pe-comprehensive-management-break-even-point | 85 | 1.18% | 8.2 | 優劣分岐点(とは)（61） |
| civil-1-primary-r07-b | 78 | 1.28% | 6.7 | **クエリ行なし**（全て閾値未満） |

**裁定: 4 本とも見送り。メタ改善の余地が無い。**

本番の `<title>` を実機で確認したところ、**既に主クエリと完全に一致**していた:

- scraper: `スクレーパとは｜3種類の違いと運搬距離を図解【1級土木】`
- break-even-point: `優劣分岐点とは｜計算式・損益分岐点との違い・CVP分析【技術士総監 経済性管理】`
- network-schedule: `ネットワーク式工程表とは｜EST・LFT・クリティカルパス・フロート【1級土木施工管理技士】`

そのうえで、これは **CTR の異常ですらない**。平均 8〜10 位の期待 CTR は 1〜2% 程度で、
表示 112 なら期待クリックは 1〜2 本。0 本の観測はポアソンで珍しくない（P(0|1.7)≈18%）。
「High-Impr-Low-CTR」として拾われたのは**表示の絶対数が小さいまま比を取った**ため。

- network-schedule は主クエリの順位が **63.7**＝メタを変えても表示すら増えない。順位の問題。
- primary-r07-b はクエリが 1 行も閾値を超えず、**何に向けて直すのかを決められない**。

**再浮上の条件**: 同一 URL が「順位 ≤ 10 かつ表示 ≥ 300/28日 かつ CTR < 2%」を 2 期間連続で満たしたとき。
それ未満でメタ実験を起こさない（分母不足で効果を読めず、実験台帳だけが埋まる）。

**学び**: 「表示が多いのに CTR が低い」を機械が surface した候補は、**実験を起こす前に
①本番の title/description を実機で見る ②主クエリの順位を見る ③期待クリック数を出す**
の 3 点を通す。今回は 4 本中 4 本がこの 3 点で落ちた。

### 2026-08-04（EXP-006 中間読み・偶然の対照群つき）

**観測**（URL 検査 20 本を再診断・7/30 リクエストから 5 日後）

7/30 の run は送信上限 10 件で打ち止めになり、対象 20 本が**リクエスト群 10 / 未リクエスト群 10**に
割れていた（`requests-latest.json` の `accepted` と `limit-reached`）。意図した実験ではないが、
同じ日に同じ基準で選ばれた 20 本なので、そのまま対照群として使える。

| 群 | 5 日後に登録された本数 |
|---|--:|
| リクエストした 10 本 | **5**（road-act / port-regulations / leveling / explosives-act / loader） |
| 上限で送れなかった 10 本 | **2**（grader-compaction / river-act） |

> [!warning] URL 検査の 1 回読みは信用しない（この run で判明）
> 同じ 20 本を **30 分あけて 2 回**読んだところ（dry-run 05:04 → commit 05:35）、
> **4 本で判定が食い違った**（一致 16/20＝**不一致率 20%**）。
> 内訳: leveling / explosives-act / river-act は「未登録 → 登録済み」、
> demolition は逆に「登録済み → 未登録」。30 分で実際に index 状態がこう動くとは考えにくく、
> **パネルの読み取りが不安定**（描画完了前に判定している疑い）と見るのが妥当。
> 上表は新しい方（05:35）の読みを採用しているが、**±2 本程度はぶれる前提**で扱う。
> 登録本数の権威は URL 検査の単発読みではなく **GSC のカバレッジレポート**（月次 CI）に置く。

**判断**: 「crawled-not-indexed へのインデックス登録リクエストは効く」と**まだ断定しない**。
5/10 vs 2/10 は方向としては支持的で、古い読み（4/10 vs 1/10）とも向きは一致するが、
n=10+10 では偶然と区別できず（Fisher の正確検定で p≈0.35）、しかも上のとおり**測定器自体が 20% ぶれる**。
EXP-006 の本判定は予定どおり next_check 2026-08-27 に、カバレッジレポートで行う。

**打ち手**: 残る未登録へ 2 回目のリクエストを送信 → **受理 10 / 送信失敗 3**。
これで civil-1 textbook はリクエスト済み 20 に近づき、次回の読みでは対照群が消える。
**対照群を潰す前に今回の差を記録として残す**のがこのエントリの目的。

**副産物（スクリプトの偽成功を 1 件修正）**: この run で 3 本が `button-not-found`
（labor-standards / work-scheduling / management-subplans）だったのに、コンソールのサマリーは
「リクエスト受理 10 件」としか出さず**失敗に一切触れず exit 0** だった。
受理数だけを出す設計は「全部送れた」と誤読させる。失敗の内訳を必ず出し、
1 件でも送れなければ exit 2 にするよう `gsc-request-indexing.mjs` を修正した
（CLAUDE.md §9「検査ゼロを PASS と呼ばない・実行系も同じ」）。
この 3 本は次回 run に持ち越す。
判定は `scripts/lib/report-honesty.mjs` の `collectFailedRequests` へ切り出し、
`tests/report-honesty.test.mjs` で固定した（同じ形のバグが同日に A8 側でも 2 件出たため共通化）。
要点は **未知の status を成功側へ倒さない**こと＝新しい失敗理由が増えても静かに通らない。

### 2026-07-30（月次・UI CSV 全量取得 → 未登録の切り分け）

**観測**（GSC UI CSV 1,964 行を全量取得・truncation なし・`complete=true`）

| GSC の理由 | 件数 | サイトマップの URL そのもの | 実体 |
|---|--:|--:|---|
| ページにリダイレクトがあります | 856 | **0** | 旧階層 URL ＋ `http://`・`www.` バリアント。301 が正しく効いている |
| 見つかりませんでした(404) | 297 | **0** | 全部サイトマップ外＝過去に存在した URL |
| 代替ページ(canonical) | 157 | **0** | 全 157 件が `?tag=` 付きのタグ絞り込みページ。canonical が正しく効いている |
| アクセス禁止(403) | 5 | **0** | サイトマップ外 |
| クロール済み - インデックス未登録 | 350 | **300** | ← 唯一の実質的な未登録 |

> [!important] 1,315 件は正常な除外＝触らない（この判断を再調査しないこと）
> redirect 856 / 404 297 / canonical 157 / 403 5 は **サイトマップに 1 件も入っていない**。
> 直近 28 日の表示は redirect で 1・404 で 0。内部リンクからの参照も 0（公開ページからは 0 件。
> 未公開ページ同士のリンク 3 件のみ）。**ここを直しても登録ページは 1 件も増えない。**
> 旧 URL 自体を GSC から消す方法は無く、Google が再クロールをやめるまで数ヶ月〜年単位で残る。
> 301 を 410 に変えれば「リダイレクト」バケットからは早く外れるが「404」バケットへ移るだけで、
> 外部被リンクの評価を捨てるリスクがあるため**推奨しない**。
> 能動的に減らせるレバーは「内部リンクが旧 URL を指さないこと」だけ → `check-internal-links-vs-gsc` で機械化した。

**判断**: 登録ページ数を KPI にしない。理由は期待値。

- 総監キーワードページは **登録済み 471 本の 28 日実績が表示 447・クリック 2**（表示>0 は 36 本＝7.6%）。
  未登録 190 本を全部登録できても期待は表示 +180・クリック +0〜1。
- サイト全体 1,073 本で表示 1,141・クリック 25。**うちクリック 21（84%）が `keyword-2026` 1 ページ**
  （表示 242・平均 7.8 位・CTR 18.7%）。指名検索に完全一致する束ねページが効いている。
- 未登録 300 件を group 別に期待値化すると **civil-1 textbook 20 本（13.2 表示/本 → 期待 +264）が最大**で、
  190 本のキーワードページ（+180）を上回る。工数は 1/10。

**打ち手**: EXP-006（civil-1 textbook 20 本のインデックス登録リクエスト）を start。next_check 2026-08-27。
20 本すべて robots ALLOWED・canonical 一致・カテゴリページから直リンク有＝技術的阻害ゼロを URL 検査で確認済み。
効果が出なければ「リクエストは crawled-not-indexed に効かない」を学びとして記録し、施策候補から外す。

**未解決**: 190/661 が未登録な理由は特定できなかった。本文長（未登録の方が長い: 中央値 3,474 vs 2,819 字）・
公開月（両群ほぼ 2026-04）・内部被リンク数（両群とも中央値 4）のどれでも登録済みと分離しない。
ページ単位の属性では説明がつかず、サイト全体の選別と見ている。期待値が低いため原因究明は保留。
### 2026-04-27（初回計測）

- batch: `inspection-batch-2026-04-27*.json`（756 件）
- 送信して登録 **407（54%）** / 検出-未登録 **219（29%）** / クロール済み未登録 17 / redirect 48 / 404 20 / other 45
- 診断: `page_fetch=SUCCESSFUL` 多数 → 技術問題なし＝**ドメイン権威性**が主因
- 判断: 内部施策は天井（2026-04 GSC pivot）。独自データ + 外部被リンクへ集中。noindex 判断は受験期ピーク後（2026-08 以降）

### 2026-06-19（トラフィック減の再調査）

- published 1,012 / sitemap 1,030。GSC clicks ≈ 5/日（横ばい）、impressions 3 週で約 −30%、平均順位 約23→37（ブレンド悪化）。GA4 organic 760/週は GSC クリックの約20倍＝大半 Bing/Yahoo
- 診断: 4 月以降 +256 ページ追加。**低権威ドメインへの量追加は index 率を下げる方向**（discovered-not-indexed を増やす仮説）。スクレープドーザ等の定義ロングテール個別 SEO は換金性ゼロで誤差
- 判断: ①量の追加を止める（`no-new-keyword-pages` と整合）②独自データ + 被リンクで権威性 ③hygiene 即修正。本管理システム（gsc-index-auditor + 月次 CI + /gsc-review）を新設して継続追跡へ
- 残課題: 「+256 ページで index 率が実際に下がったか」は最新 URL Inspection で確定予定（`index-coverage.yml` 実行後に `/gsc-review`）→ **2026-06-22 に決着。No（下がっていない）**

### 2026-06-22（残課題の決着 + 流入減の再診断）

- batch: `inspection-batch-2026-06-19T13-26-17.json`（1,030 件）を `append-coverage-history.mjs` で履歴へ反映（4/27 以降止まっていた履歴を是正）
- 送信して登録 **840（index_ratio 81.6%）** / クロール済み-未登録 144 / 検出-未登録 39 / redirect **0** / 404 **0** / other 7。page_fetch は 986 SUCCESSFUL（43 は UNSPECIFIED＝直近追加の新規ページで本登録待ち）
- 決着: +256 ページ後も index 率は **54% → 82%** に改善。**「ドメイン権威性の壁で半分未 index」という 4/27〜6/19 の前提は失効**。`indexed_ratio` は目標 80% を達成、hygiene は 0
- 流入減（impr 3 週で −30% / 平均順位 23→37）の真因再診断: ①順位悪化の大半は新規ページ（pos 80-90）による **blended 平均の希釈アーティファクト**で、価値ページ（scraper pos 9.1 / keyword-2026 pos 7.2）は安定 ②本損失は **CTR 欠落**（上位表示なのに near-zero click。break-even-point pos 5.4 で CTR 0.5%、primary-r07-a pos 7.1 で 0 click 等）
- 追検証（同日・現物照合）: ①空 description 仮説は**外れ**（YAML 折りたたみで本文あり）。pos 7-10 の CTR 1.4-2.5% はその順位帯で標準値＝スニペット書換の上積みは数クリック。タイトルは 5/17 リライトで実クエリ整合済 ②過去問 56 本中 **23 本が crawled-not-indexed** だが、robots=ALLOWED / indexing=ALLOWED / canonical 一致 / fetch=SUCCESSFUL ＝**技術バグ無し**。本文も 8-13 万字で薄くない。旧年度（h26-r05）中心の低需要ページを Google が価値判断で未登録にしているだけで、on-page で強制 index 不可。在庫高需要の r07 は index 済
- 判断（確定）: 在庫下の技術・on-page SEO レバーは**全数健全/最適化済み**。GSC 流入を実質的に動かせるのは**ドメイン権威性（独自データ + 外部被リンク）のみ**で、これは code 編集でなく継続プログラム。個別ページの seoTitle/description 微修正の量産はしない（換金性ゼロ・上積み誤差）。実行タスクは `.claude/todo/backlog.md`「SEO 権威性トラック」へ起票。GSC 数値悪化を見ても on-page を増やさない（[[hub-strengthening-approach]]・2026-04 pivot と整合）

### 2026-07-02（月次・/gsc-review — index 率の揺り戻し）

- batch: `inspection-batch-2026-07-01T05-04-05.json`（1,051 件）
- 送信して登録 **784（index_ratio 74.6%）** / クロール済み-未登録 240 / 検出-未登録 25 / 代替canonical 2 / redirect **0** / 404 **0**
- 前回差分（6/19→7/1）: indexed 840→784（**−56**）、index_ratio 81.6%→**74.6%**、クロール済み-未登録 144→240。**駆動要因＝既存 indexed 126 本が「クロール済み-未登録」へ回帰**（新規 URL の登録待ちは僅か 8 本＝登録待ちバックログではない）
- 回帰の分布: **総監キーワード 97 / civil-1 guide・過去問 21 / civil-2 3 / concrete 3 / pe-construction 1 / category 1**（サンプル: guide-career-salary / guide-four-management / primary-h30-a / secondary-*-past-problems ほか）
- 診断: hygiene 0（404/redirect ゼロ・page_fetch 健全）＝技術問題なし。原因バケット＝**ドメイン権威性/index selection**（Google が既存ページの登録価値を再評価し demote）。6/22 の「82% 達成・権威性の壁失効」は**部分的に揺り戻し**＝index 選択は低権威ドメインで volatile。6/22 で観測した「低需要ページの未登録」が総監キーワード群にも広がった形
- 判断（推奨・様子見＋権威性トラック継続）: ①on-page 微修正はしない（マトリクス：権威性バケットは title/内部リンクで動かない・6/22 確定判断を踏襲）②hygiene タスクなし（404/redirect=0）③打ち手は独自データ + 外部被リンク（`.claude/todo/backlog.md`「SEO 権威性トラック」）④**7月は受験期の需要変動が交絡＝単月で結論しない。8月 再測定で回帰が継続・拡大するなら総監キーワード薄ページの統合を検討**（[[no-new-keyword-pages]] と整合＝新規作成でなく既存の統合）

### 2026-07-10（5/17 前後の急落の遡及 root cause 診断）

- 発端: ユーザーが GSC UI で「5/17 あたりからパフォーマンスが極端に下がった（それまでは順調に成長）」を観測。当時 W20 の週次レビューが欠落しており即時 RCA が無かったため遡及診断
- 突合方法: `gsc-page-2026-05-16`（4/15-5/13）と `gsc-page-2026-06-19`（5/19-6/16）の**同一 URL 集合**（before top200）を追跡（新規ページ混入による blended 希釈を排除）。中間窓 `gsc-page-2026-05-29`（4/28-5/26）で消失時期を挟み撃ち
- 観測（下落はサイト全面でなく**総監キーワード群に集中**）:
  - 総監キーワード（n=110）: clicks **103→38（−63%）**・impressions −15%・**24 本が検索結果から完全消失**・ほか 10 本が順位 5 以上悪化（human-error-probability 5.9→15.1 / digital-rights 8.9→28.3 / process-safety-mgmt 10.8→68 等）
  - 対照群は無傷〜改善: civil その他 clicks +47%・civil primary（5/16 ExamPoint 1,144 件削除の対象）clicks 2→7・impressions +27% ＝ **ExamPoint 削除は原因から除外**
  - GA4 週次はサイト全体で**一貫成長**（W20 673 → W26 1,801 sessions）＝下落は Google 検索のみ。W21 レビューの「セッション −51.7%」は取得窓欠損の**計算アーティファクト**（正: W20→W21 は 673→907 と増加）
  - 消失 24 本は 4/28-5/26 窓では表示あり（うち複数が pos 44〜79 に崩落済み）→ 5/19-6/16 窓でゼロ ＝ 消失時期は **5月中旬〜下旬**。7/2 の「クロール済み-未登録 回帰 126 本（総監 97）」の前段
- 外因の確定: **Google May 2026 core update が 5/21〜6/2 にロールアウト**（3月 update 完了 4/8 からわずか 6 週の異例の短間隔・ロールアウト前週から volatility 報告あり）。消失・順位崩落の時期と正確に一致。既存ログ（6/19・6/22・7/2）はこの外因に言及がなく「権威性 volatile」とだけ診断していた＝**demote の引き金はコアアップデートによる品質再評価**と特定
- 副因: 5/11 deploy（0e2acbdad）の **seoTitle 723 件一括変更**。旧「{title} ｜ 総合技術監理 キーワード集 2026」→新「{title} ｜ 技術士 総合技術監理部門 キーワード集」で **「2026」トークンを全ページから削除** → 「総監キーワード2026」（pos 6.6）等の年度系クエリがクエリレポートから消失。またコアアップデート直前に最大コーパスの全面書き換え＝再クロール churn を最大化。robots.txt AI ブロック（5/16）は Googlebot 非対象で無関係
- 診断（確定）: **主因＝May 2026 コアアップデート（5/21-6/2）が総監キーワード薄ページ群を品質再評価で demote**（順位崩落→index selection 除外の連鎖）。副因＝直前の 723 件 title 一括変更（年度クエリ喪失＋churn）。時期・対象の集中・対照群の無傷がすべて整合。この demote が 7月の AdSense「非インデックス 265 本」問題の源流
- 判断: ①打ち手は既に正しい方向で進行中（薄層 112 本フルリライト完遂＝コアアップデート demote への正攻法。次のコアアップデートで再評価される）② title の再変更はしない（年度クエリは hub keyword-2026 が捕捉・一括改変の反復はリスク）③**教訓: 大規模一括改変（数百件単位の title/本文）はコアアップデート時期と重なると被害を増幅する＝分割デプロイし、改変直後 2 週間は GSC 日次を監視**④GSC 日次データの 5/4-5/24 欠損と W20 レビュー欠落が RCA を 2 ヶ月遅らせた＝週次 PDCA の継続で再発防止

### 2026-08-06（週次・自動レビュー）

- 観測: GSC 07/01-07/29（page 453行・完全）＋ query 06/29-07/27、GA4 28日比 07/23→07/30。候補: High-Impr-Low-CTR 33 / Rank-Stuck 17 / Traffic-Drop 9 / Hidden-Winner 27 / SNS-Source-Shift 2。Cannibalization・Content-Decay・Orphan-Query は ✓（0件）
- 上位候補と推奨:
  1. **SNS-Source-Shift**: note/referral 427→91 sessions（−78.7%）・x/social 152→16（−89.5%）。推奨=投稿停止/UTM欠落/リンク切れの現物照合
  2. **Traffic-Drop**: `/docs/civil-construction-1-guide-strategy` sessions 641→421（−34.3%）。engagement 悪化なし＝流入元側の変化を疑う
  3. **CTR実験候補**: `/docs/civil-construction-1-textbook-scraper` impr 236・clicks 2-3・pos 9.6（「スクレーパとは」impr 112・clicks 0・pos 8.7）。CEM demote バケット外
  - 他 5 件（Hidden-Winner 非総監群の実需要 27 件・network-schedule pos 63.7 等）→ improvements/2026-08-06.md
- 自動裁定:
  - SNS 急落 → 推奨=現物照合タスク化（実験でなく運用確認。note/X の投稿状況と UTM を実体で確認）
  - guide-strategy 減 → 保留（再浮上条件: 8月再測定でも −20% 超継続なら要診断。単月ローリング比のため）
  - scraper CTR → 推奨=実験化候補（メタ実験・最大 5 URL・14〜28 日の形で /nsm-experiment propose へ）
  - CEM 権威性バケットの減（whitepaper-study-map 等）→ 保留（裁定済み方針どおり on-page 修正せず。再浮上条件: 8月再測定で回帰継続・拡大なら薄ページ統合を検討）
- 注記: 自動生成（metrics-analyzer・人間の上書き歓迎）。GA4 は limit=100 打切りアーティファクト 8 件を Traffic-Drop から除外済み

### 2026-08-06（月次・自動レビュー）

- batch: `inspection-batch-2026-08-01T05-03-32.json`（1,109 件・history 8/1 エントリと完全一致）
- 観測: inspected 1,109 / sitemap 1,109 / indexed **795（index_ratio 71.7%）**・前回比 **−2.9pt**（74.6%→71.7%）/ クロール済み-未登録 **292**（240→292・net +52）/ 検出-未登録 4 / redirect 0 / 404 0 / other 18
- 増分内訳（URL 単位遷移の直接比較）: 新規に未登録へ落ちた 126 件＝**総監 89** / pe-construction 12 / civil-1 12 / civil-2 10 / concrete 3。逆に未登録→indexed 回復 74 件（うち総監 66）＝閾値近傍で thrashing しつつ**正味は悪化方向**
- **総監回帰の判定: 継続・拡大**。総監の未登録件数 182→205（net +23）・母数比 25.1%→28.2%（母数 724→728 でほぼ一定）。**7/2 裁定の再浮上条件「8月再測定で回帰が継続・拡大」に該当** → 総監薄ページの統合（[[no-new-keyword-pages]] と整合）＋被リンク等の権威性トラックを検討開始する材料が揃った
- 新規 URL +58（sitemap 1,051→1,109）: indexed 37（64%）/ other 18 / discovered 2 / 未登録 1。新規は速やかに登録されており健全
- 原因バケット:
  - 権威性: 未登録 292 件は全件 page_fetch SUCCESSFUL＝クロール正常で index 価値の低評価。総監が支配的（主因）
  - 技術: 該当なし（fetch 失敗・robots・5xx ゼロ）
  - hygiene: 404/redirect 0。canonical 不一致 2 件（/about・/category/civil-construction-2）は indexed 済みで軽微
- other 18 の中身: 全件 concrete-diagnostician 系の 8月新規ページで「URL 未認識」＝単純な未クロール。9月測定で残留有無のみ確認（放置で可）
- 推奨アクション: ①再浮上条件成立につき、次の対話セッションで総監薄ページ統合の対象選定を検討（実行判断は人間）②hygiene タスクなし ③メタ一括変更は不可（実験形式のみ）
- 異常フラグ: なし（ratio≥60%・低下<5pt・discovered 4・hygiene 0・inspected=sitemap・results 整合）
- 注記: 自動生成（gsc-index-auditor 診断・最終決定は人間）

### 2026-08-14（週次・自動レビュー）

- 観測: GSC page/query 07/13-08/10（各100行・truncated）＋ page×query 176行（完全）、GA4 28日比 07/16-08/12。候補: High-Impr-Low-CTR 4 / Rank-Stuck 13 / Traffic-Drop 37 / Hidden-Winner 32。Orphan-Query・SNS-Source-Shift・Cannibalization・Content-Decay は ✓（0件）
- 上位候補と推奨:
  1. **サイト全体流入減**: GA4 週次 sessions 3335→1577→1458→1053（4週で−68%・直近週も−27.8%）。GSC clicks は 259→221 と緩やか＝GA4 減の主因は SNS/リファラル側の疑い。推奨=検索/SNS の切り分け診断（現物照合）
  2. **guide-strategy 再浮上**: `/docs/civil-construction-1-guide-strategy` sessions 641→421→64→45 と加速崩壊・−20% 超継続で 8/6 保留の再浮上条件成立。engagement 0.58 不変＝流入元側。推奨=要診断（severe 格上げ）
  3. **Hidden-Winner**: `/docs/civil-construction-2-secondary-experience-writing-guide` sessions 386・eng 0.62（`-secondary-r07` も 377・0.74）。戦略外 civil-2 が最大の稼ぎ頭。推奨=導線強化の検討
  - 他 7 件（pe-comprehensive keyword-2026 −172 sessions・network-schedule pos 60 等）→ improvements/2026-08-14.md
- 自動裁定:
  - サイト全体減 → 推奨=切り分け診断タスク化（実験でなく運用確認。Traffic-Drop 37 件の大半は全体トレンド反映疑いのため個別対処より先）
  - guide-strategy → 推奨=要診断（8/6 保留→再浮上条件成立。on-page でなく流入元調査から）
  - civil-2 経験記述 Hidden-Winner → 保留（再浮上条件: 次回計測でも sessions 300 超維持なら導線強化を実験化）
  - SNS 急落（8/6 裁定済み）→ note/referral は回復基調（56→78）・x/social は下げ止まらず（16→11→8）。裁定維持（現物照合タスクの完了確認待ち）
  - scraper CTR（8/6 実験化候補）→ 裁定維持（pos 9.6→8.0 と改善するも CTR 1% 前後で張り付き＝タイトル実験の妥当性むしろ強まる）
- 注記: 自動生成（metrics-analyzer・人間の上書き歓迎）。GSC page/query が limit=100 truncated で前週（453行・完全）よりカバレッジ低下——High-Impr-Low-CTR 33→4 件の急減は実態でなくカバレッジ差の可能性大。GA4 Traffic-Drop から打切りアーティファクト 8 件除外済み

### 2026-08-21（週次・自動レビュー）

- 観測: **最新計測ファイルが前回 8/14 レビューと同一の観測窓**（2026-08-13T21-36 取得・fetch-metrics のその後の更新なし。鮮度ゲートは 8 日で閾値内＝中止条件非該当）。GSC page/query 07/13-08/10（page×query 176行・完全）＋ GA4 28日比。候補: High-Impr-Low-CTR 4（+境界1）/ Rank-Stuck 51 / Traffic-Drop 37 / Hidden-Winner 32。Orphan-Query・SNS-Source-Shift・Cannibalization・Content-Decay は ✓（0件）
- 上位候補と推奨:
  1. **データ窓の停滞**: 本週の新規シグナルなし＝全候補が前回データの再掲。推奨=次回対話セッションで `gh workflow run fetch-metrics.yml` の実行状況を確認（鮮度ゲートが 9 日以上になれば自動で【要確認】化する）
  2. **scraper CTR**: `/docs/civil-construction-1-textbook-scraper` impr 184 / CTR 1.09% / pos 7.9（前週比 pos 9.3→7.9 改善も CTR 横ばい）。推奨=8/6 実験化候補の裁定維持・新規データ確認後に title 実験（最大 5 URL・14〜28 日形式）
  3. **Rank-Stuck 上位**: `pe-comprehensive-management-r8-essay-keyword-forecast` impr 315 / CTR 9.5% / pos 8.6。推奨=新規データ確認後にコンテンツ追記候補として検討
  - 他（keyword-2026 / break-even-point / guide-strategy 等）→ improvements/2026-08-21.md
- 自動裁定:
  - サイト全体流入減（8/14 裁定=切り分け診断タスク化）→ 裁定維持（同一データにつき進展なし・現物照合タスクの完了確認待ち）
  - guide-strategy 要診断（8/14 格上げ）→ 裁定維持（64→45 は前回と同値・流入元調査から）
  - civil-2 経験記述 Hidden-Winner → **保留継続**（386 / 377 sessions は再浮上条件「次回計測で 300 超」を数値上満たすが、同一データの再掲であり新規計測と見なさない）
  - scraper CTR 実験化候補 → 裁定維持（上記 2）
- 注記: 自動生成（metrics-analyzer・人間の上書き歓迎）。GSC page/query 単体は limit=100 truncated、GA4 page も丁度 100 件で上位カットの疑い（meta にフラグなし）。GA4 Traffic-Drop は 4 週ローリング窓の代理指標であり厳密な週次 WoW ではない

### 2026-08-22（GSC UI完全取得・EXP-006終了・総監5分類）

- 観測: GSC UI run `2026-08-22T07-46-59Z` は16ユニット・失敗0・truncated 0・reject 0。allKnownはcrawled-not-indexed 353 / redirect 857 / 404 297 / canonical 160 / 403 5 / noindex 2 / discovered 3、allSubmittedのcrawled-not-indexedは302
- 8/1 URL Inspectionとの比較: 現行sitemap相当のCNIは292→302（+10）、総監は205→209（+4）。総監は追加21・離脱17で、固定障害ではなくindex selectionの入れ替わりが継続
- EXP-006: civil-1 textbook 20本のうちCNI残存13・離脱7（indexed一覧では未確認）。事前基準により`partial`で終了し、同一URLへの登録リクエスト反復を中止。2026-09-01の月次Inspectionで事後確認する
- 総監209本: `KEEP 31 / IMPROVE 19 / CONSOLIDATE 0 / NOINDEX_REVIEW 0 / MONITOR 159`。159本は更新60日未満または直近2回連続未登録を未確認であり、統合不要ではなく判定保留
- 判断: 技術修正候補0。2026-09-01までは総監MDX・title・301・noindexを変更しない。次回全件performanceデータと月次Inspection後に再分類し、統合候補が出ても本文差分を確認した最大5〜10クラスタだけを承認対象にする
