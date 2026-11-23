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

現状のスペックと設定は `e2e/`・`playwright.config.ts`・`.github/workflows/e2e.yml` が正本で、ここには写さない。本書はコードに書けない境界と条件だけを持つ（節番号は初版のまま）。

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

## 5. locator設計

優先順位は次の通り。

1. `getByRole()`
2. `getByLabel()`
3. `getByText()`の部分一致
4. `locator('a[href="..."]')`
5. 最終手段として`data-testid`

見た目のクラス名、`nth()`、深いCSSセレクタは避ける。テストのためだけの`data-testid`追加は、既存のrole／label／hrefでは一意に取れない場合だけ許可する。

## 8. CI設計

初版は既存の巨大な監査workflowへ混ぜず、`.github/workflows/e2e.yml`として独立させる。

推奨トリガー。

- `pull_request`で`src/**`、`package.json`、`playwright.config.ts`、`e2e/**`変更時。実行は desktop の `smoke`・`navigation`・`cta`・`desktop`・`ad-coverage` だけ（待ち時間を約 5 分に抑える。デザインを変えた PR がその場で気づけるよう、デザインの確認の 2 spec を含める・2026-11-23）
- `workflow_dispatch`
- `schedule`（毎日 JST 23:17・checkout は develop。毎時 0 分の指定は起動が 3.5〜7 時間遅れ、失敗が朝に出ていたので 2026-11-13 に移した）。コンテンツは develop へ直 push され PR 経路を通らないため、MDX コンポーネント誤用による画面崩れを夜間に拾う。全 spec は夜間と手動で回す。確認は 2 組に分ける（2026-11-23 運営者判断「デプロイを止めるのは壊れた類だけ」）。
  - 壊れた類（表示・本文・リンク・操作・基準書の描画）: 失敗は `automation-failure` Issue（channel `e2e-nightly`）で、`deploy:main` は未解決のこの Issue があると止まる
  - デザインの類（タグ `@layout`：広告の枠数・空きの上限・幅のそろい）: 別の段で回し、失敗は channel `e2e-layout-nightly` の Issue に記録するだけ。デプロイは止めない。デザインの数値は検査に写さず、壊れていないこと（枠が出る・はみ出さない）を見る
  - 公的基準の全文書の描画（`STANDARDS_RENDER_SCOPE=all`）は日曜の夜間と手動で all を選んだときだけ（月〜土は比較の内の文書だけ）。timeout は 60 分

手順の正本は `.github/workflows/e2e.yml`（Node のセットアップ・依存の復元・`npm run build`・`npm run check-e2e-targets`・`npm run test:e2e`・失敗時の artifact）。ここには手順を写さない。設計で決めたのは次の 2 点だけ。

- E2E は本番と同じ静的出力（`out/`）に対して回す。叩く URL は `check-e2e-targets` で `out/` に実在させる（開発サーバーの挙動差を E2E に持ち込まない）
- type-check と既存の監査は ci.yml が同じ commit で回すので、E2E の workflow では重ねて回さない

## 9. flake防止

- `waitForTimeout()`を使用しない
- Playwrightのauto-waitを使う
- 外部note.comへ実遷移しない
- 日付、ランダム表示、アクセス解析通信へ依存しない
- 画像読み込み完了をページ成功条件にしない
- analytics、広告、外部フォント等の失敗は本体エラーと分離する
- console errorの許容一覧は文字列を無制限に広げず、理由と期限を書く
- retryで通ったテストもflakeとして追跡する

## 10. 守る条件

導入は完了し、CI（`.github/workflows/e2e.yml`）で稼働している。今後の変更でも次を守る。

- note へのログイン・購入・公開を E2E で行わない
- テストのためだけの `data-testid` や製品コードの変更を足さない

## 11. 導入後の拡張条件

次の条件が発生した場合だけ拡張する。

- 実障害がFirefox／Safari固有だった：該当browserを追加
- 静的exportのみで障害が出た：`test:e2e:export`を追加
- UI変更でレイアウト崩れが反復した：限定的なvisual snapshotを追加（→ §12 で実施済み）
- 検索回帰が発生した：検索入力→結果→記事の1経路を追加
- 計測停止が発生した：同意状態を含むGAイベント発火テストを別suiteで検討

テスト数をKPIにしない。過去に実際に壊れた、または壊れると収益・利用者影響が大きい経路を優先する。
