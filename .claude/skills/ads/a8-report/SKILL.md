---
name: a8-report
description: >
  A8.net 成果レポートの収集済み記録を読み、doboku-note 分のサイト別・プログラム別・期間別から EPC 判定の分母を分析する。Use when user says "A8レポート", "EPCを更新", "a8-report".
disable-model-invocation: true
argument-hint: "[--month YYYY-MM]"
domain: affiliate
---

A8.net メディア管理画面（media-console.a8.net）の成果レポートは、**土曜の Mac 収集
（`weekly-collect` の a8 段＝`a8-ui:fetch` → `a8-ui:normalize`）が取得して SSOT へ upsert する**。
このスキルは、その記録を **読んで検証・分析する**。セッションではログインせず、ブラウザを開かない。
判定は決定的スクリプトに委譲し、「伸ばす/畳む」の意思決定だけ人が持つ。

> **正典は `.claude/knowledge/reference/a8-affiliate-pipeline.md`**（レポート節）。本 skill は手順のみ。
> ラベル・URL・列名・プログラム写像は `config/a8-report-automation.json` が SSOT、
> 解析ロジックは `scripts/lib/a8-report-csv.mjs`（node:test 済み）が SSOT。
> 提携申請を回す `/scout-asp` とは別サブシステム（あちらは提携運用・こちらは成果レポート）。

## なぜ必要か

A8 は公開 API が無く、成果は長らく月 1 の手入力前提だった（月次の成果は空のまま）。
その結果、消費側の `report-buildjob-affiliate.mjs`（GA4 クリック × A8 成果 → EPC）が
**分母を持てず**、ビルドジョブ vs 建設JOBs の A/B 勝者判断が保留になっていた。ここを埋める。

## 安全弁（迂回しない）

| 弁 | 実体 |
|---|---|
| 口座 assert | 取得側（土曜の収集）がメディアID 不一致なら **1 バイトも DL しない**（exit 5）。A8 にサイト切替は無い（2026-10-19 の画面改修で program-detail だけはサイトで絞れるようになった。`--site-filter self` で自サイト分を取り、口座全体の検算の内訳に使う）ので、ここで見るのは口座 |
| サイト分離 | 分離できるのは `/report/site` のみ。他は口座横断で allowlist 抽出＋サイト別との検算 |
| ログイン | 運営者。CAPTCHA/2FA を自動突破しない。切れていたら運営者が `npm run auth:login -- --service a8` |
| 推測で埋めない | 記録が無い・古い月は「未取得」と書く。0 や推計で埋めない |
| 取りこぼし | programIdMap 未登録のプログラムは黙って捨てず `missingProgramCandidates` に出す（サイト別を説明しきれないときだけ） |
| 生データ | raw CSV と manifest は書き換えない（append-only・監査可能性） |

## フェーズ

### 1. preflight（記録と最終取得日を読む）

- `git branch --show-current` / `git status`
- `config/a8-report-automation.json` の `mediaId` / `targetSite` / `reports[].siteScope` を Read
- 前回の取得: `data/a8/ui-last-run.json`（最終取得日・成否）と `data/a8/report-log.json` の更新日。**最終取得日を報告の冒頭に書く**
- 古い（`npm run check-a8-report-due` が DUE）、または最新の取得が ok でないときは、数値を埋めず **「未取得」** と書き、
  次の土曜の収集を待つか、運営者が収集用 worktree（`.claude/worktrees/weekly-collect`）の端末で
  `node scripts/weekly-collect.mjs --only a8` を実行する。UI 変更で取得が失敗していたら、運営者が
  `npm run a8-ui:fetch -- --dry-run --probe-isolation` / `--probe-period --headed` で実機を確かめ、
  `config/a8-report-automation.json` の `a8.periodForm` 等を確定する（セッションからは実行しない）

### 2. validate（`a8-csv-auditor` エージェント）

manifest / raw CSV / rejects / 前回差分 / **サイト帰属（`crossCheck` の超過＝stats47 混入の疑い）** を
PASS/WARN/FAIL で判定。FAIL なら分析へ進まず、運営者に取り直しを依頼する。
raw CSV（gitignore）がこの checkout に無いときは、追跡された `data/a8/report-log.json` の差分と
`crossCheck` で見る。

### 3. 正規化の確認（決定的）

正規化は土曜の収集の a8 段が済ませている。差分だけ見るときは次を読み取りで確かめる:

```bash
npm run a8-ui:normalize -- --latest --dry-run   # 差分だけ見る（SSOT は書かない）
```

- `data/a8/report-log.json` — `siteSummary`（doboku 分離済み＝真実源）/
  `programPeriod`（案件に対応した行＋当期の口座横断の行だけ残す）/ `monthly`・`daily`（**口座横断**）/ `crossCheck` を upsert
- 月次の成果（月×案件）は持たない。読み手（`report-buildjob-affiliate`・`report-career-funnel`）が
  `programPeriod` の**単月の期間**から導く（`resultsFromReportLog`）。A8 の既定期間は年初〜当月の累計なので、
  累計の行は月次に写せず `notAttributable` に退避される

`missingProgramCandidates` が出たら config の `a8.programIdMap` に追記して、運営者が取り直す（黙って無視しない）。

### 4. analyze（親が実施）

```bash
npm run report-buildjob-affiliate
```

正規化 JSON と併せて読み、プログラム別 EPC・面別クリックの伸び・撤退候補を surface する。
成果が出たら、どのページの広告からかを `report-log` の `conversions`（成果別 `result-detail`・`page`）で確かめる（2026-10-07 20:00 以降のクリック。それ以前はドメインだけ・a8-affiliate-pipeline.md「サイト帰属」）。
**判断（伸ばす/畳む/価格改定）はユーザー**。「数値がこう動いた」と「だから何をすべきか」を分けて出す。

### 5. finalize

- 分析結果を報告する。SSOT の書き込みと commit は土曜の収集が行う（セッションは記録を書き換えない）
- 大きな変化があれば `.claude/todo/weekly.md` の週次レビューに 1 行残す

## トラブルシューティング

| 症状 | 対処 |
|---|---|
| `account-mismatch` | 取得時に別口座でログインしていた。config の `a8.mediaId` と実機ヘッダーのメディアIDを照合 |
| `site-mismatch` | サイト別レポートに doboku-note 行が無い。A8 側のサイト登録状態を確認 |
| `export-button-ambiguous` | `exportButtonLabels` は `["CSV"]` の 1 語だけにする（増やすと同一ボタンに複数ヒットして曖昧になる） |
| `report-unreachable` | `reports.*.path` の URL が変わった。実機の URL を config へ |
| 文字化け | `csvEncoding` を切替（normalize は U+FFFD を数えて自動フォールバックもする） |
| `fatal: 必須列が見つからない` | `columnAliases` に実機のヘッダー文言を追記 |
| `missingProgramCandidates` | `programIdMap` に raw 名を追記 |

## 参照

- `.claude/knowledge/reference/a8-affiliate-pipeline.md` — A8 運用 SSOT
- `config/a8-report-automation.json` — ラベル/URL/列名/写像
- `scripts/lib/a8-report-csv.mjs` — 解析コア（`tests/a8-report-csv.test.mjs`・`npm test` に含まれる）
- `.claude/scripts/report-buildjob-affiliate.mjs` — EPC 消費側
