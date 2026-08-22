# Playwright E2E導入設計

> [!done]
> **2026-07-25 実装・検証完了**。本書はdoboku-note本体のPlaywright E2E設計SSOT。実装は `playwright.config.ts`、`e2e/`、`.github/workflows/e2e.yml` に配置している。

## 1. 目的

静的検査や単体テストでは検出しにくい、実際のブラウザ上の回帰を早期に検出する。

優先するのは次の3点。

1. 主要ページがブラウザで表示される
2. トップ、カテゴリ、記事の回遊が成立する
3. 記事からnote商品へ向かうCTAが正しいURLを持つ

全記事の完全網羅、デザインのピクセル一致、note.com上の購入操作は初版の対象外とする。

## 2. 現状

### 既にあるもの

- Next.js 16／React 19
- 本番ビルド時は `output: 'export'`
- `@playwright/test` がdevDependencyに存在
- Node標準テスト：`npm test`
- 型検査：`npm run type-check`
- lint：`npm run lint`
- ビルド：`npm run build`
- リンク、SEO、CTA、noteファネル等の決定的検査
- 本番監視：`.github/workflows/uptime-ping.yml`

### 実装済み

- `playwright.config.ts`
- `e2e/smoke.spec.ts`
- `e2e/navigation.spec.ts`
- `e2e/cta.spec.ts`
- `e2e/mobile.spec.ts`
- `e2e/fixtures.ts`（ブラウザエラー監視）
- `test:e2e`／`test:e2e:ui`／`test:e2e:headed`／`test:e2e:report`
- `.github/workflows/e2e.yml`
- 失敗時のtrace／screenshot／HTML report保存

E2Eは既存検査を置き換えず、ブラウザ操作が必要な部分だけを補完する。

## 3. テスト境界

### E2Eで保証する

- HTTP応答後に `<main>` と主要コンテンツが描画される
- トップページから主要カテゴリへ到達できる
- 1級土木、2級土木、技術士総監の代表ページが開く
- 記事内目次のアンカーが実在する見出しを指す
- 内部リンクが同一サイトの実在ページへ移動する
- note CTAの `href` が `https://note.com/` 配下である
- 必要なCTAにUTMが付いている場合、その値を保持する
- モバイル幅で横方向の重大なオーバーフローがない
- 存在しないURLが404画面を返す

### E2Eで保証しない

- noteへのログイン、公開、購入、決済
- 外部サイトの本文やUI
- 全記事・全リンクのクロール
- OGP画像の全件存在確認
- frontmatterやカタログの整合性
- SEOメタ情報の全件検査
- ピクセル単位のビジュアルリグレッション

これらは既存スクリプト、手動確認、外部サービス固有の運用へ残す。

## 4. 初版テストスイート

### A. `e2e/smoke.spec.ts`

代表ページの描画を確認する。

| 対象 | 代表パス |
|---|---|
| トップ | `/` |
| 1級カテゴリ | `/category/civil-construction-1` |
| 2級カテゴリ | `/category/civil-construction-2` |
| 総監カテゴリ | `/category/pe-comprehensive-management` |
| 総監代表記事 | `/docs/pe-comprehensive-management-keyword-2026` |
| 404 | `/__e2e_not_found__` |

各200ページで確認するもの。

- `main` が1つ以上存在する
- ページ固有の見出しまたは主要語が見える
- `body` が空でない
- `pageerror` が発生しない
- console errorを収集し、既知の許容対象以外は失敗させる

404はステータスと、利用者が戻れるリンクまたは案内を確認する。開発サーバーと静的出力でステータス挙動が違う場合は、本文の404表示を必須、HTTPステータスは環境別に判定する。

### B. `e2e/navigation.spec.ts`

ユーザーの主要回遊を確認する。

```text
トップ
  → 1級土木カテゴリ
  → 代表記事

トップ
  → 2級土木カテゴリ
  → 代表記事

トップ
  → 技術士総監カテゴリ
  → 代表記事
```

テキストが変わりやすい場合は、完全一致のコピーではなく、リンクの `href`、見出しrole、カテゴリslugを使用する。CSSクラスやDOM階層へ強く依存しない。

### C. `e2e/cta.spec.ts`

収益導線を確認する。

- 代表記事を開く
- visibleなnote CTAを特定する
- `href` が空でないことを確認する
- `https://note.com/dobokunote/` 配下であることを確認する
- 商品別に期待するnote記事またはマガジンIDを確認する
- UTMが仕様上必須の配置では `utm_source`、`utm_medium`、`utm_campaign` を確認する
- 外部遷移自体は行わない

CTA期待値をspecへ大量に直書きしない。既存の`src/lib/note-magazines.ts`や配置ロジックから安全に参照できる場合は再利用する。ブラウザ側specから内部モジュールを読み込むことで結合が複雑になる場合は、初版は代表3件だけの明示的fixtureにする。

### D. `e2e/mobile.spec.ts`

モバイル代表幅1種類で確認する。

- viewportはPlaywrightの標準的なiPhone相当を1つだけ採用
- トップ、カテゴリ、記事の3種類を確認
- `document.documentElement.scrollWidth <= clientWidth + 1` を原則とする
- 意図的な横スクロールコンテナはページ全体のoverflow違反に含めない
- モバイルメニューがある場合は開閉できる
- 表はページ全体を押し広げず、専用コンテナ内でスクロールできる

## 5. locator設計

優先順位は次の通り。

1. `getByRole()`
2. `getByLabel()`
3. `getByText()`の部分一致
4. `locator('a[href="..."]')`
5. 最終手段として`data-testid`

見た目のクラス名、`nth()`、深いCSSセレクタは避ける。テストのためだけの`data-testid`追加は、既存のrole／label／hrefでは一意に取れない場合だけ許可する。

## 6. Playwright設定

初版の推奨設定。

- `testDir: './e2e'`
- `baseURL: 'http://127.0.0.1:3020'`
- ローカルは既存サーバーを再利用
- CIは`npm run dev`を`webServer`で起動
- browserはChromiumのみ
- projectはdesktop Chromiumとmobile Chromiumの2つ
- retryはCIのみ1回
- workerはCIで2以下、ローカルはPlaywright既定
- screenshotは失敗時のみ
- traceは最初のretry時に保存
- videoは初版では無効
- HTML reporterをCI artifactへ保存

初版ではWebKit／Firefoxを追加しない。主要導線が安定し、ブラウザ固有不具合が観測された時点で追加する。

### 開発サーバーと静的出力

初版は高速なPRゲートとして`next dev`へE2Eを実行する。`npm run build`は別ゲートで必ず通す。

本番の静的export固有の障害まで検出したい場合はPhase 2で、`out/`をローカルHTTPサーバーから配信する`test:e2e:export`を追加する。初版で独自静的サーバーまで作らない。

## 7. package.json追加案

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:report": "playwright show-report"
  }
}
```

`test`は既存Nodeテストの意味を変えない。E2Eを`npm test`へ混ぜない。

## 8. CI設計

初版は既存の巨大な監査workflowへ混ぜず、`.github/workflows/e2e.yml`として独立させる。

推奨トリガー。

- `pull_request`で`src/**`、`package.json`、`playwright.config.ts`、`e2e/**`変更時
- `workflow_dispatch`
- 必要ならmainへのpush

実行順。

1. checkout
2. Node 20セットアップ
3. `npm ci --legacy-peer-deps --ignore-scripts`
4. `npx playwright install --with-deps chromium`
5. `npm run type-check`
6. `npm run test:e2e`
7. 失敗時に`playwright-report/`と`test-results/`をartifact保存

CI時間を抑えるため、E2E workflow内で全量の`npm run build`や既存監査を重複実行しない。ビルドは既存CIまたは別ジョブの責務とする。

## 9. flake防止

- `waitForTimeout()`を使用しない
- Playwrightのauto-waitを使う
- 外部note.comへ実遷移しない
- 日付、ランダム表示、アクセス解析通信へ依存しない
- 画像読み込み完了をページ成功条件にしない
- analytics、広告、外部フォント等の失敗は本体エラーと分離する
- console errorの許容一覧は文字列を無制限に広げず、理由と期限を書く
- retryで通ったテストもflakeとして追跡する

## 10. 完了条件

- [x] `playwright.config.ts`が追加されている
- [x] `e2e/`にsmoke、navigation、cta、mobileのテストがある
- [x] Chromium desktop／mobileがローカルで通る（28成功、4対象外スキップ）
- [x] `npm test`が従来どおり通る（204成功、3スキップ）
- [x] `npm run type-check`が通る
- [x] `npm run lint`が通る
- [x] `npm run build`が通る
- [x] CI workflowが追加され、失敗artifactを取得できる
- [x] noteへのログイン・購入・公開を行わない
- [x] 不要な`data-testid`や製品コード変更がない
- [x] `git diff --check`が通る
- [x] 実装状態を本SSOTへ反映し、完了済みTODOと一時指示書を削除する

## 11. 導入後の拡張条件

次の条件が発生した場合だけ拡張する。

- 実障害がFirefox／Safari固有だった：該当browserを追加
- 静的exportのみで障害が出た：`test:e2e:export`を追加
- UI変更でレイアウト崩れが反復した：限定的なvisual snapshotを追加
- 検索回帰が発生した：検索入力→結果→記事の1経路を追加
- 計測停止が発生した：同意状態を含むGAイベント発火テストを別suiteで検討

テスト数をKPIにしない。過去に実際に壊れた、または壊れると収益・利用者影響が大きい経路を優先する。
