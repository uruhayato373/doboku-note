---
title: GSC・GA4 Playwright 自動取得システム実装指示書
description: Claude CodeでGSC/GA4のブラウザCSV取得、API取得、正規化、診断、サブエージェント連携を実装するための仕様と実行プロンプト。
---

# GSC・GA4 Playwright 自動取得システム実装指示書

## 1. 目的

Claude Codeに、次の処理を安全かつ再実行可能な形で実装させる。

1. ログイン済みChromeプロファイルでGoogle Search Consoleを開く。
2. Page indexingの理由別詳細画面からCSVをダウンロードする。
3. GA4のランディングページ等も必要に応じてCSV取得する。
4. CSVを共通JSONへ正規化する。
5. 既存GSC API、GA4 Data API、URL Inspection、sitemap、redirect、生成HTMLと突合する。
6. URLごとに「修正・統合候補・監視・正常除外」を分類する。
7. サブエージェントにcoverage、performance、technical SEOを分担させる。
8. レポートだけを自動生成し、301/noindex/本文統合などの変更は人間承認後に行う。

## 2. 重要な制約

- GoogleのID・パスワード・Cookie・サービスアカウントJSONをGit管理しない。
- Playwrightの永続プロファイルは `.local/playwright-google-profile/` に保存する。
- 初回ログイン、2段階認証、CAPTCHAは人間がheadedブラウザで完了する。
- ブラウザ自動化はローカル限定。CIではサービスアカウントAPIだけを使う。
- GSCのPage indexing CSVは例URLが最大1,000件で、総数そのものではない。
- Indexing APIを一般記事の登録要求に使わない。対象はJobPostingまたはBroadcastEventに限定される。
- 「検証を開始」「インデックス登録をリクエスト」「GA4設定変更」は外部状態を変えるため自動実行しない。
- selectorはCSSクラス名を第一候補にしない。role、可視ラベル、URL、downloadイベントを優先する。
- UI変更時は推測でクリックを続けず、スクリーンショット・HTML・アクセシビリティスナップショットを保存して停止する。

## 3. 推奨構成

```text
.claude/
├── agents/
│   ├── gsc-browser-collector.md
│   ├── gsc-csv-auditor.md
│   └── seo-fix-planner.md
├── config/
│   └── google-console-automation.json
├── skills/
│   └── management/
│       └── google-search-growth/
│           ├── SKILL.md
│           └── references/
│               ├── csv-schema.md
│               └── recovery.md
└── state/
    └── metrics/
        ├── gsc-ui/
        └── ga4-ui/
scripts/
├── google-console-login.mjs
├── fetch-gsc-ui-csv.mjs
├── fetch-ga4-ui-csv.mjs
├── normalize-google-console-csv.mjs
└── report-search-growth.mjs
```

生成物:

```text
.local/playwright-google-profile/       # 認証済みプロファイル・gitignore
.local/playwright-google-debug/         # 失敗時スクリーンショット・HTML
.claude/state/metrics/gsc-ui/<run-id>/  # raw CSV + manifest + normalized JSON
.claude/state/metrics/ga4-ui/<run-id>/  # raw CSV + manifest + normalized JSON
.claude/state/improvements/search-growth-latest.md
```

## 4. 設定ファイル

`.claude/config/google-console-automation.json`:

```json
{
  "schemaVersion": 1,
  "gsc": {
    "property": "sc-domain:doboku-note.com",
    "baseUrl": "https://search.google.com/search-console",
    "issueLabels": {
      "crawledNotIndexed": [
        "クロール済み - インデックス未登録",
        "Crawled - currently not indexed"
      ],
      "redirect": [
        "ページにリダイレクトがあります",
        "Page with redirect"
      ],
      "notFound": [
        "見つかりませんでした（404）",
        "Not found (404)"
      ],
      "alternateCanonical": [
        "代替ページ（適切な canonical タグあり）",
        "Alternate page with proper canonical tag"
      ],
      "forbidden": [
        "アクセス禁止（403）が原因でブロックされました",
        "Blocked due to access forbidden (403)"
      ]
    }
  },
  "ga4": {
    "propertyId": "419382901",
    "baseUrl": "https://analytics.google.com/"
  },
  "browser": {
    "channel": "chrome",
    "headless": false,
    "profileDir": ".local/playwright-google-profile",
    "debugDir": ".local/playwright-google-debug",
    "timeoutMs": 30000
  }
}
```

`propertyId`は公開設定として扱えるが、ユーザーIDやメールアドレスは設定へ書かない。

## 5. Playwright実装要件

### 5.1 ログイン

`google-console-login.mjs`:

- `chromium.launchPersistentContext(profileDir, { channel: "chrome", headless: false })`
- GSCを開き、ユーザーがログインと2FAを完了するまで待つ。
- 成功条件はGSCページ上に対象プロパティまたは「検索パフォーマンス」「Search results」が見えること。
- メールアドレスやCookieを標準出力しない。
- `storageState`は別ファイルへ書かず、persistent profileだけを使う。
- 120秒ごとに状態を表示し、無限待機しない。

### 5.2 GSC CSV取得

`fetch-gsc-ui-csv.mjs`のCLI:

```bash
node scripts/fetch-gsc-ui-csv.mjs --dry-run
node scripts/fetch-gsc-ui-csv.mjs --issues crawledNotIndexed,redirect,notFound
node scripts/fetch-gsc-ui-csv.mjs --issues all --headed
```

処理:

1. `page.goto()`でGSCを開く。
2. 対象プロパティが選択されていることを可視テキストでassertする。
3. Page indexingへ移動する。
4. sitemapフィルタは次の2パターンを取得する。
   - `All known pages`
   - `All submitted pages`
5. `issueLabels`の日本語・英語候補から理由行を探す。
6. 対象行をクリックし、詳細ページのタイトルが期待理由と一致することをassertする。
7. `Promise.all([page.waitForEvent("download"), exportButton.click()])`でエクスポートを開始する。
8. メニューが出た場合はCSVをrole/textで選ぶ。
9. `download.suggestedFilename()`を信用せず、`<issue-key>--<scope>--<run-id>.csv`として保存する。
10. CSVの先頭行、ファイルサイズ、行数を検証する。
11. `manifest.json`に取得日時、最終URL、issue、scope、画面上件数、CSV行数、sha256、成功/失敗を記録する。

ダウンロードボタン候補:

```js
const exportButton = page
  .getByRole("button", { name: /エクスポート|export/i })
  .or(page.getByLabel(/エクスポート|export/i));
```

候補が複数なら、画面上部のtoolbar内へ絞る。0件または複数件のままならクリックせずdebug dumpして停止する。

### 5.3 GA4 CSV取得

GA4はData APIを主経路とし、UI CSVは次に限定する。

- APIで再現できない探索レポート
- UI設定検証
- 管理画面上の数値との照合

最低限の取得対象:

- Reports > Acquisition > Traffic acquisition
- Reports > Engagement > Landing page
- Reports > Engagement > Events

すべて既存期間と比較できる28日窓を使用し、Asia/Tokyo基準の日付をmanifestへ記録する。UIの言語差に備えて日本語・英語ラベルを持つ。

### 5.4 UI変更時の復旧情報

失敗時は以下を保存する。

```text
.local/playwright-google-debug/<run-id>/
├── screenshot.png
├── page.html
├── url.txt
├── visible-text.txt
└── failure.json
```

`failure.json`:

```json
{
  "step": "select-csv-export",
  "expected": ["CSVをダウンロード", "Download CSV"],
  "url": "...",
  "message": "...",
  "timestamp": "..."
}
```

## 6. CSV正規化

GoogleのCSVはロケール、BOM、ファイル分割、列名が変化し得る。raw CSVを直接分析せず、次の共通形式へ変換する。

```json
{
  "schemaVersion": 1,
  "source": "gsc-ui-page-indexing",
  "runId": "2026-07-24T12-00-00Z",
  "property": "sc-domain:doboku-note.com",
  "issue": "crawledNotIndexed",
  "scope": "allSubmittedPages",
  "uiTotal": 346,
  "exportedRows": 346,
  "truncated": false,
  "rows": [
    {
      "url": "https://doboku-note.com/docs/...",
      "lastCrawled": "2026-07-11",
      "raw": {}
    }
  ]
}
```

正規化ルール:

- UTF-8 BOMを除去する。
- CRLF/LF両対応。
- quoted comma、quoted newline対応のCSV parserを使う。`split(",")`は禁止。
- URLはtrimし、parse不能行は`rejects.json`へ送る。
- `www`、末尾slash、percent encodingを壊さず、比較用の別キーだけ作る。
- 同一URL重複は残しつつ`duplicateCount`を付ける。
- UI総数が1,000超なら`truncated: true`。
- raw CSVとmanifestは上書きしない。

## 7. 診断・分類

`report-search-growth.mjs`は以下をjoinする。

- GSC UI正規化JSON
- `.claude/state/metrics/url-inspection/` 最新batch
- `.claude/state/metrics/gsc/gsc-page-query-*` 最新2件
- `.claude/state/metrics/ga4/ga4-page-*` 最新2件
- live `sitemap.xml`
- `public/_redirects`
- `out/`の生成HTML
- `src/config/doc-meta-index.json`

URLごとの出力:

| フィールド | 内容 |
|---|---|
| `inSitemap` | live sitemap掲載 |
| `httpStatus` | HEAD、必要時GET |
| `redirectTarget` | redirect最終到達先 |
| `redirectHops` | hop数 |
| `selfCanonical` | HTML canonical |
| `robots` | meta robots |
| `gscState` | UI/API状態 |
| `clicks/impressions/ctr/position` | GSC |
| `activeUsers/sessions/engagementRate` | GA4 |
| `internalInbound` | build link graph |
| `contentFamily` | 総監/1級土木等 |
| `action` | 下記分類 |

分類:

- `FIX_TECHNICAL`: sitemap内404/redirect、canonical不一致、403、robots/fetch失敗
- `REDIRECT_LEGACY`: sitemap外の旧URLで明確な後継がある
- `KEEP_MONITOR`: 200/self canonicalで検索需要または利用実績あり
- `CONSOLIDATE_CANDIDATE`: 類似ページ群、低需要、低利用、親ページあり
- `NOINDEX_CANDIDATE`: 固有価値が低く統合先もない。ただし自動適用しない
- `EXPECTED_EXCLUSION`: 意図したredirect、canonical代替、noindex
- `UNKNOWN_REVIEW`: 判断材料不足

自動でコード変更してよいのは、機械的に決定できる内部リンクの旧URL修正まで。redirect追加、削除、統合、noindexは計画だけ出す。

## 8. サブエージェント

### `gsc-browser-collector`

- 種別: Generator
- model: `sonnet`
- tools: `Read, Glob, Grep, Bash`
- Playwright収集スクリプトを実行し、manifestとdebug artifactを確認する。
- ログイン、2FA、CAPTCHA、対象プロパティ不一致で停止する。
- 分析やSEO判断はしない。

### `gsc-csv-auditor`

- 種別: Evaluator
- model: `sonnet`
- tools: `Read, Glob, Grep, Bash`
- raw/normalized CSV、manifest、行数、sha256、truncation、前回差分を検査する。
- 外部サイトへアクセスせず、データ品質のみ返す。

### `seo-fix-planner`

- 種別: Evaluator
- model: `sonnet`
- tools: `Read, Glob, Grep, Bash`
- join済みJSONを読み、URLごとのactionと根拠を返す。
- コード・MDX・redirectを変更しない。

既存エージェントとの連携:

- coverage診断: `gsc-index-auditor`
- performance診断: `metrics-analyzer`
- build SEO: `technical-seo-auditor`
- 最終戦略判断と変更承認: 親Claude

## 9. オーケストレータースキル

`.claude/skills/management/google-search-growth/SKILL.md`は副作用があるため以下を指定する。

```yaml
---
name: google-search-growth
description: GSC/GA4のPlaywright CSV取得、APIデータ突合、index coverage・検索performance・技術SEOの統合診断を実行する。
user-invocable: true
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Bash, Task
---
```

フェーズ:

1. `preflight`: profile、依存関係、対象property、git状態を確認
2. `collect`: browser collectorと既存API取得を並列実行
3. `validate`: CSV auditor
4. `normalize`: deterministic script
5. `join`: search growth report生成
6. `evaluate`: 既存3 evaluatorを並列起動
7. `integrate`: 親Claudeが一つの優先順位表へ統合
8. `approval gate`: 修正案を提示して停止
9. ユーザーが明示的に承認した対象だけ修正
10. build、SEO監査、handoff

## 10. npm scripts

```json
{
  "google-console:login": "node scripts/google-console-login.mjs",
  "gsc-ui:fetch": "node scripts/fetch-gsc-ui-csv.mjs",
  "ga4-ui:fetch": "node scripts/fetch-ga4-ui-csv.mjs",
  "google-console:normalize": "node scripts/normalize-google-console-csv.mjs",
  "search-growth:report": "node scripts/report-search-growth.mjs",
  "search-growth:audit": "npm run gsc-ui:fetch; npm run google-console:normalize && npm run search-growth:report && npm run check-google-ui-ssot",
  "check-gsc-ui-due": "node scripts/check-gsc-ui-due.mjs",
  "check-google-ui-ssot": "node scripts/check-google-ui-ssot.mjs",
  "ga4-admin:check": "node scripts/ga4-admin-setup.mjs",
  "ga4-admin:apply": "node scripts/ga4-admin-setup.mjs --commit",
  "check-ga4-dimensions": "node scripts/check-ga4-custom-dimensions.mjs"
}
```

> [!warning] `search-growth:audit` の連鎖（2026-07-30 修正）
> 修正前は `gsc-ui:fetch && google-console:normalize && search-growth:report` で、**中間の normalize が
> 引数なし**のため `resolveRunDir` が null → 「run ディレクトリが見つかりません」で毎回 exit 2 になり、
> report まで一度も到達していなかった。現在は (1) normalize の既定を最新 run に変更、
> (2) 取得が**部分成功**（exit 2）でも取れた分は正規化するため `;` で繋ぎ、
> (3) 末尾に SSOT 整合ゲートを置いて「取得したつもり」で終われないようにしている。
> normalize 自体は downloaded 0 件なら exit 1 で止まる（検査ゼロを PASS にしない）。

## 10.1 完全性と SSOT（2026-07-30 追加）

取得の成否は「例外が飛ばなかったか」ではなく**ユニットの完全性**で決める。実装は
`scripts/lib/google-console-units.mjs` に集約（`judgeRun` / `buildMarker` / `exitCodeFor`）。

| 概念 | 意味 |
|---|---|
| `okUnits` | `downloaded`（dry-run は `dry-ok`） |
| `zeroUnits` | `row-not-found`＝そのスコープに当該理由のページが **0 件（正常なゼロ）** |
| `failedUnits` | それ以外の非取得（`scope-switch-failed` / `ambiguous-row` / `export-button-ambiguous` / `empty-download` 等） |
| `suspiciousScopes` | ある面で `okUnits === 0` かつ `zeroUnits > 0`＝UI 変更で理由行を取り違えている疑い |
| status | `ok`（失敗ゼロかつ取得あり）/ `partial` / `empty` / `error` / `no-units` / 致命状態 |

マーカー（`{gsc-ui,ga4-ui}/last-run.json`・schemaVersion 3）は **`lastAttempt`（毎回更新）と
`lastComplete`（完全な run のみ更新）を分けて持つ**。失敗 run が直前の成功記録を消さないため。
`legacy` には旧スキーマの記録を畳み込んで残す。

CSV から得た情報は **追跡 SSOT** として commit する（raw CSV は再取得しかできないため）:

```
.claude/state/metrics/gsc-ui/
  last-run.json          # 追跡（マーカー）
  ssot/
    urls/<issue>--<scope>.json   # 追跡: 最新の正規化 URL 一覧（lean 射影・raw 列は落とす）
    history.json                 # 追跡: run 別のユニット件数履歴
    diff/<runId>.json            # 追跡: 直前 SSOT との URL 増減
  <runId>/               # gitignore（raw CSV / ZIP / manifest / normalized）
```

`.gitignore` は `.claude/state/metrics/{gsc-ui,ga4-ui}/*/` を無視しつつ `!.../ssot/` で例外化する。
`report-search-growth.mjs` は **SSOT を優先**して読み（`gscUiSource: "ssot"`）、無ければ run ローカルへ
フォールバックする。整合は `scripts/check-google-ui-ssot.mjs` が検査する。

## 10.2 GA4 管理画面 設定の自動化（2026-07-30 追加）

`fetch-ga4-cta-clicks -- --by-label` / `--by-placement` は GA4 の**イベントスコープ カスタム
ディメンション**（`event_label` / `cta_placement`）が未登録だと Data API が失敗する。実装側は
登録手順を出して exit 0、CI 側も `continue-on-error: true` のため、**未登録のあいだ CI は緑のまま
プログラム別 EPC と配置別 CTR だけが永久に欠測**していた。

| 要素 | 実体 |
|---|---|
| 期待値（SSOT） | `.claude/config/ga4-admin-desired-state.json`（customDimensions / dataRetention / unwantedReferrals） |
| 観測＋作成 | `scripts/ga4-admin-setup.mjs`（Playwright・**既定 dry-run**・`--commit` で作成） |
| 観測結果（追跡） | `.claude/state/metrics/ga4-admin/inventory-latest.json` ＋ `history.json` |
| ドリフト ゲート | `scripts/check-ga4-custom-dimensions.mjs`（blocking な未登録は exit 1・オフライン） |

### 実機で判明した GA4 UI のクセ（2026-07-30 初回実走で確定）

| クセ | 対処 |
|---|---|
| hash ルートが **アカウント ID で正規化**される（`#/p419382901/...` → `#/a121193537p419382901/...`） | `url.includes("/p"+id)` では一致しない。`ga4PropertyInUrl` / `ga4RoutePrefix`（`google-console-browser.mjs`）で接頭辞非依存に照合し、まずホームを開いて接頭辞を確定してから深いルートへ行く。**これが `fetch-ga4-ui-csv` が property-mismatch で止まっていた原因** |
| カスタム定義の route は `/admin/customdefinitions/**hub**`（`/hierarchy` は拒否されホームへ戻る） | `customDefinitionsUrl` を hub に。URL 直打ちが効かない場合は UI クリック（管理 → カスタム定義）へフォールバック |
| hash だけの `goto` は SPA 内移動になりルーターが反応しないことがある | 到達を URL で検査し、届いていなければ `reload` でドキュメントごと起動し直す（`gotoGa4Route`） |
| 左プライマリナビ（`ga-primary-nav.opened`）が展開時にクリック対象へ重なり、通常クリックが intercept で無限リトライになる | **ナビの遷移だけ** DOM click（`el.click()`）で hit-test を回避（`domClick`）。保存・削除など破壊的ボタンには使わない |
| データ保持は左ナビ「データの収集と修正」を**展開しないと**「データの保持」が可視にならない | `clickToAdminItem(section, item)` でセクション展開 → 項目クリック |
| カスタムディメンション表の列順は ディメンション名 / 説明 / スコープ / パラメータ / 最終変更日（空セルは innerText に出ない） | パラメータ名は**スコープ列の次のセル**として読む。**値の比較で除外してはいけない**（表示名とパラメータ名が同一の行が実在＝`cta_placement`。値比較だと未登録と誤判定する） |

初回実走の結果: カスタムディメンション 4 件を観測（`affiliate`/`event_label`/`cta_placement`/`event_category`）、
desired の 2 件（`event_label`・`cta_placement`）は**いずれも登録済み**、データ保持は **14 か月（期待どおり）**。
つまり blocking な欠測は無く、`--by-label` / `--by-placement` は機能していた——が、**それを機械で確認する手段が
無かった**のが問題だった（未登録になっても緑のままになる）。今は `check-ga4-dimensions` が赤/緑を出す。
安全弁: **作成のみ**（編集・アーカイブ・削除はしない）／property を URL と画面の両方で assert／
候補が一意でないステップは推測クリックせず debug dump して停止／作成後に一覧を読み直して
「実際に増えたか」を確認する（自己申告で成功としない）／`dataRetention` と `unwantedReferrals` は
**観測して差分を報告するだけ**（アカウント設定の自動変更はしない）。

## 11. テスト

追加するテスト:

- `tests/google-console-csv.test.mjs`
- `tests/search-growth-classifier.test.mjs`
- `tests/fixtures/google-console/ja-page-indexing.csv`
- `tests/fixtures/google-console/en-page-indexing.csv`
- `tests/fixtures/google-console/quoted-newline.csv`

最低条件:

- BOM、日本語/英語ヘッダー、CRLF、quoted comma/newlineを処理できる。
- URL比較用キーがfragmentを除外し、path/queryを保持する。
- sitemap内redirect/404を`FIX_TECHNICAL`にする。
- sitemap外の正常な旧301を`EXPECTED_EXCLUSION`または`REDIRECT_LEGACY`にする。
- UI total > exported rowsならtruncatedになる。
- raw CSV、manifest、normalized JSONの再実行で上書きしない。
- Playwrightの実サイトテストは通常の`npm test`に含めない。

## 12. 完了条件

- headedログインが成功する。
- dry-runで対象propertyと理由行を検出できる。
- 3理由以上のCSVをdownloadイベント経由で保存できる。
- manifestの件数とCSV行数を検証できる。
- 正規化テストが通る。
- 既存APIデータとjoinしたMarkdown/JSONレポートが生成される。
- 収集失敗時にdebug artifactが残る。
- 認証情報がgit diff、ログ、生成JSONに含まれない。
- `npm run type-check`、`npm run lint`、`npm test`が通る。

- **部分成功が `ok` として記録されない**（`zeroUnits` と `failedUnits` が分離されている）。
- **失敗 run が `lastComplete` を上書きしない**。
- **不完全な取得・正規化が exit 0 を返さない**。
- **正規化結果が `ssot/` として commit され、run ディレクトリが無いマシンでもレポートが再現する**。
- **GA4 の blocking カスタムディメンションの登録状態が `check-ga4-dimensions` で赤/緑になる**。

# Claude Codeへ渡す実装プロンプト

以下をClaude CodeのPlan Modeでそのまま渡す。

```text
このリポジトリに、GSC・GA4のPlaywright CSV取得と既存APIデータを統合する
「Google Search Growth Automation」を実装してください。

最初に必ず次を全文で読んでください。
- docs/project/04_運営/gsc-ga4-playwright-automation-spec.md
- .claude/knowledge/reference/gsc-management.md
- .claude/knowledge/reference/playwright-auth-profiles.md
- .claude/skills/management/gsc-review/SKILL.md
- .claude/agents/gsc-index-auditor.md
- .github/workflows/fetch-metrics.yml
- .github/workflows/index-coverage.yml
- .claude/scripts/inspect-url.mjs
- .claude/skills/analytics/fetch-gsc-data/scripts/fetch-gsc-data.mjs
- .claude/scripts/fetch-ga4-data.mjs

ゴール:
1. ログイン済み永続Chromeプロファイルを使い、GSC Page indexingの理由別詳細画面から
   CSVをPlaywrightのdownloadイベントで取得する。
2. CSVをロケール非依存の共通JSONへ正規化する。
3. URL Inspection、GSC page×query、GA4 page、live sitemap、_redirects、out HTMLとjoinする。
4. URL単位のaction分類と根拠をJSON/Markdownで出力する。
5. 収集・CSV品質監査・SEO修正計画をサブエージェントで分業する。
6. skill /google-search-growth で全体をオーケストレーションする。

実装対象:
- scripts/google-console-login.mjs
- scripts/fetch-gsc-ui-csv.mjs
- scripts/fetch-ga4-ui-csv.mjs
- scripts/normalize-google-console-csv.mjs
- scripts/report-search-growth.mjs
- .claude/config/google-console-automation.json
- .claude/skills/management/google-search-growth/SKILL.md
- .claude/skills/management/google-search-growth/references/csv-schema.md
- .claude/skills/management/google-search-growth/references/recovery.md
- .claude/agents/gsc-browser-collector.md
- .claude/agents/gsc-csv-auditor.md
- .claude/agents/seo-fix-planner.md
- testsとfixtures
- package.jsonのnpm scripts
- 必要なregistry/CLAUDE.mdのエージェント一覧更新

絶対条件:
- 認証情報、Cookie、メールアドレスをコード・ログ・git管理ファイルへ書かない。
- profileは .local/playwright-google-profile、debugは .local/playwright-google-debug。
- 初回ログイン・2FA・CAPTCHAは人間が行う。自動突破しない。
- GSC propertyが sc-domain:doboku-note.com と一致しなければ停止する。
- selectorはrole/label/text優先。CSS class依存を主経路にしない。
- ダウンロードは必ず page.waitForEvent('download') を使う。
- UI変更時はスクリーンショット、HTML、URL、visible text、failure.jsonを保存して停止する。
- CSVをsplit(',')で解析しない。
- GSC UIの例URLは最大1,000件であることをmanifest/reportへ明記する。
- 一般記事へIndexing APIを使わない。
- 「検証を開始」「インデックス登録をリクエスト」「設定保存」はクリックしない。
- redirect追加、ページ削除、noindex、本文統合は自動適用しない。approval gateで止める。
- 既存のユーザー変更を保持し、無関係なファイルを整形しない。

進め方:
Phase 1: 現行コード・規約・git状態を調査し、実装計画を提示する。
Phase 2: deterministic scripts、config、fixtures、testsを実装する。
Phase 3: 3サブエージェントとオーケストレータースキルを実装する。
Phase 4: npm test、type-check、lintを実行する。
Phase 5: headedログインを起動する。人間操作が必要なら明確に待つ。
Phase 6: --dry-runでDOM検出だけ確認する。
Phase 7: crawledNotIndexed,redirect,notFoundをCSV取得する。
Phase 8: normalize、join、reportを実行する。
Phase 9: raw/manifest/normalized/reportを検証し、URL分類件数を報告する。
Phase 10: docs/handoffs/へ実施ログを残す。

サブエージェントを並列利用してください。
- Agent A: 既存Playwright永続プロファイル実装と安全弁の調査
- Agent B: GSC/GA4既存API・state schema・workflowの調査
- Agent C: CSV schema、分類器、fixture/test設計
親エージェントは調査結果を統合してから実装し、ファイル競合がない範囲のみ委任してください。

テスト完了だけで止めず、可能なら実ブラウザのdry-runとCSV取得まで進めてください。
ログイン、2FA、CAPTCHA、Google UI変更だけを人間待ちの正当な停止条件とします。
```

# 運用時プロンプト

実装後の毎月実行:

```text
/google-search-growth --scope monthly

GSCのPage indexingについて、All known pagesとAll submitted pagesの両方から
crawledNotIndexed、redirect、notFound、alternateCanonical、forbiddenを取得してください。
既存GSC/GA4 APIの最新データと突合し、前月差分、技術エラー、旧URL、統合候補、
CTR改善候補を分けて報告してください。

外部状態を変える操作とコンテンツ変更は行わず、修正候補を
impact × confidence × effortで優先順位付けしたところで停止してください。
```

GSC UI変更時:

```text
GSC CSV取得が失敗しました。
.local/playwright-google-debug の最新runを読み、
screenshot、page.html、visible-text、failure.jsonからUI変更点を特定してください。

認証情報を表示しないでください。
推測クリックはせず、現在のアクセシブルなrole/label/textを根拠にselectorを更新し、
--dry-runでproperty・issue title・export button・CSV menuの一意性だけ検証してください。
ダウンロードや外部状態変更はまだ実行しないでください。
```
