# GSC/GA4 Playwright 取得の復旧手順（UI 変更・失敗時）

Google の UI は予告なく変わる。取得が失敗したら**推測でクリックを続けず**、debug artifact を
根拠に selector を更新する。認証情報は一切表示・保存しない。

## 1. まず状態を切り分ける

`manifest.json` の `status` と各 `units[].status` を読む:

| status | 意味 | 対応 |
|---|---|---|
| `not-signed-in` | 未ログイン | `npm run google-console:login`（人間がログイン/2FA/CAPTCHA） |
| `property-mismatch` | 対象プロパティ不一致 | GSC/GA4 でプロパティを切替（人間） |
| `page-indexing-unreachable` | レポート到達不可 | UI 変更の可能性 → debug artifact を確認 |
| `ambiguous-row` | 理由行の候補が複数 | selector 更新（下記） |
| `export-button-ambiguous` | Export ボタンが一意でない | selector 更新 |
| `csv-menu-ambiguous` / `csv-menu-not-found` | CSV メニュー項目が拾えない | selector 更新 |
| `row-not-found` | 理由行 0 件 | **該当 0 件（正常）** か **UI 変更** かを区別（断定しない） |
| `download-failed` | download イベント不発 | ネットワーク/権限/UI を確認 |
| `csv-no-urls` | データ行はあるが URL 0 件 | **別シート（グラフのデータ）を掴んだ**疑い。ZIP のヘッダー同定を確認（2026-07-30 に実発生） |
| `zip-no-table` | ZIP 内に URL 表が無い | ヘッダーに URL 列を持つシートが 1 つも無い。UI の export 形式変更を疑う |
| `scope-switch-failed` | スコープ切替を検証できず | 誤ラベル防止でそのスコープを skip。`scopeParams` を確認 |

run 全体の status は **ユニットの完全性**で決まる（例外の有無ではない）:
`ok`（失敗 0 かつ取得あり）/ `partial`（失敗あり or 疑わしい面あり）/ `empty`（全部「対象なし」）/
`no-units`（検査対象 0）/ `error`。exit code は 0=完全 / **2=不完全** / 3=未ログイン / 5=property / 6=到達不能。

> [!important] `row-not-found` は失敗ではない
> `zeroUnits`（正常なゼロ）と `failedUnits`（実失敗）を分けて数える。混ぜて「7/10」と報告すると
> 異常かどうか判断できない。2026-07-30 の実走では 10 ユニット中 **取得 7・正常なゼロ 3・失敗 0** で
> `complete=true` だった（allSubmittedPages の notFound/redirect/forbidden が正常なゼロ）。

## 2. debug artifact を読む

`.local/playwright-google-debug/<run-id>/`:

- `screenshot.png` — その瞬間の全画面
- `page.html` — DOM（email / Bearer token はマスク済み）
- `visible-text.txt` — 可視テキスト（マスク済み）
- `url.txt` — 現在 URL
- `failure.json` — `{ step, expected, actual, url, message, candidateCount, ... }`

`candidateCount` が 0 → ラベルが変わった / 別画面。`>1` → 同名要素が複数（toolbar 内へ絞る必要）。

## 3. selector を更新する（優先順位）

`.claude/config/google-console-automation.json` の各ラベル配列（`issueLabels` / `exportButtonLabels`
/ `csvMenuLabels` / `scopes`）に、`visible-text.txt` から拾った**現行の可視ラベル**（ja/en）を追加する。
selector 実装（`scripts/lib/google-console-browser.mjs` の `findUniqueByLabels`）は role → text の順で
一意な要素だけを返す。**config のラベル追加で対応できることが多い**（コード変更を先にしない）。

## 3.5 GA4 管理画面／レポートの実機クセ（2026-07-30 実走で確定）

| クセ | 対処 |
|---|---|
| hash ルートがアカウント ID で正規化（`#/p419382901/…` → `#/a121193537p419382901/…`） | `ga4PropertyInUrl` / `ga4RoutePrefix` で接頭辞非依存に照合。ホームを開いて接頭辞を確定してから深いルートへ |
| カスタム定義の route は `/admin/customdefinitions/**hub**`（`/hierarchy` は拒否されホームへ戻る） | hub を使い、URL 直打ちが効かなければ UI クリックへフォールバック |
| hash だけの `goto` は SPA 内移動でルーターが反応しないことがある | 到達を URL で検査し、届かなければ `reload` でブートし直す |
| 左プライマリナビ（`ga-primary-nav.opened`）がクリック対象に重なり通常クリックが intercept で無限リトライ | **ナビ遷移のみ** DOM click（`el.click()`）。保存・削除には使わない |
| データ保持は「データの収集と修正」を展開しないと項目が可視にならない | セクション展開 → 項目クリックの 2 段 |

selector 選定の原則（実装指示書 §7）:

1. `getByRole`（button / link / menuitem / row / option）
2. `getByLabel`
3. `getByText`
4. 安定した data 属性
5. URL
6. CSS class は最後の手段（主経路にしない）

## 4. 再検証（ダウンロードはまだしない）

```bash
npm run gsc-ui:fetch -- --dry-run
```

`manifest.dryRun` で property / pageIndexingReachable / 各 issue の rowDetected /
exportButtonUnique / csvMenuDetected がすべて true になることだけ確認する。
一意性が取れてから本取得へ進む。

## 5. やってはいけないこと

- 候補が 0 / 複数のまま推測でクリックする（別要素を誤操作する）
- CAPTCHA / 2FA を自動で突破しようとする
- Cookie / storageState / メールアドレスを標準出力・ファイルへ書く
- 「検証を開始」「インデックス登録をリクエスト」「設定を保存」を押す（外部状態を変える）
- worktree から実行してまっさらプロファイルで再ログインを強いる（本体 `~/doboku-note` から実行）

## 6. GA4 特有

GA4 は重い Angular アプリ。UI 取得が不安定なら**無理に UI を使わず API（`npm run fetch-ga4-data`）**へ
フォールバックする。UI は「API で再現できない探索レポート / 表示照合」に限定する（manifest に
`apiPreferred: true` を残す）。
