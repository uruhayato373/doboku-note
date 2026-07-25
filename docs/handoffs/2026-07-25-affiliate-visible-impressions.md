# Codex/Claude 実施ログ：アフィリエイト可視インプレッション計測

> [!done]
> **2026-07-25 完了**：GA4 にアフィリエイトの可視インプレッションと配置を送る実装を追加。型検査・affiliate guard・CTA密度検査は合格。

## 背景

A8 の 1px ピクセルはページ読込ベースで、実際に広告枠が画面内へ入った回数や配置別 CTR を判定できなかった。クリック最大化の前提として、GA4 で可視表示数を取得できるようにした。

## 実施内容

- `AnalyticsProvider` に `IntersectionObserver` を追加。アフィリエイトCTAが50%以上表示された時、要素ごとに1回だけ `affiliate_cta_impression` を送信。
- クリック・インプレッションへ `cta_placement` を付与。
- 記事中間、記事末モバイル、記事内、PCサイドバー、カテゴリサイドバー、カテゴリモバイル、カテゴリ内小バナーを識別。
- `fetch-ga4-cta-clicks.mjs` に `affiliate_cta_impression` と `--by-placement` を追加。
- `.github/workflows/fetch-metrics.yml` に `Fetch GA4 (affiliate impressions/clicks by placement, for placement CTR)` を追加。既存の GitHub Secrets を使って週次ジョブから `ga4-cta-clicks-by-placement-*.json` を取得し、`develop` へ publish する。

## 検証

```bash
npm run type-check
npm run check-affiliate-mats
npm run check-affiliate-prose
npm run check-cta-density
git diff --check
```

すべて合格。CTA密度は1073ページすべて閾値内。

CI 配線追加後は `git diff --check` 合格。workflow 自体の live 実行は未実施。

## 後続メモ

- デプロイ前のため本番GA4イベントは未確認。
- GA4のイベントスコープ・カスタムディメンション `cta_placement` は登録済み。2026-07-25 に Data API から正常認識を確認した。
- 登録前の2026-07-18〜24データは `(not set)`（affiliate click 8件）で、可視 impression は0件。登録前データには遡及しない。
- 登録・デプロイ後に `npm run fetch-ga4-cta-clicks -- --by-placement --days 7` を実行し、配置別に `affiliate_cta_click / affiliate_cta_impression` を比較する。
- 今後は手動ローカル実行でなく、毎週金曜の `fetch-metrics.yml` が `by-placement` スナップショットを自動取得する。
- ローカル `.env.local` には `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` / `GA4_PROPERTY_ID` が未設定。確認時は既存鍵とプロパティIDを一時環境変数で渡した。
- A8成果は `.claude/state/metrics/affiliate/a8-results.json` が空。月末入力後に `npm run report-buildjob-affiliate` でEPCを判断する。
