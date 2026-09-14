---
name: feedback-ga-ssr-not-client-gate
description: GoogleAnalytics は SSR 描画のまま保つ。useState/useEffect で条件描画(client-gating)すると gtag が SSR HTML から消え本番 GA が停止する
metadata: 
  node_type: memory
  type: feedback
  originSessionId: d2619dc0-18bc-4105-b5f6-9edc2c8913ce
---

`src/components/GoogleAnalytics.tsx` の gtag 読み込みは **SSR 描画のまま**にする。ホスト判定などで `useState`/`useEffect` の条件描画（client-gating）に変えると、**gtag スクリプトが SSR HTML から消え、本番(doboku-note.com)でも GA がロードされなくなる**（next/script の afterInteractive を後から条件マウントしても確実に注入されない）。

**Why**: 2026-07-03、計測基盤 #6（pages.dev 除外）で GoogleAnalytics を「初期値ブロック→mount 後に hostname を見て解除」の client-gating にしたら本番 GA が全停止した（PR #344）。`curl https://doboku-note.com | grep -oE 'googletagmanager|G-8VXJ1RL1HG'` が空＝SSR HTML に gtag 不在で検出。PR #350 で SSR 描画へ差し戻して復旧。

**How to apply**:
- GA スクリプトは常に SSR 描画（gtag が HTML に載る＝確実ロード・初回 page_view を取りこぼさない）。
- ホスト/条件による除外は「描画を止める」のでなく **gtag の呼び出し側**でガードする: インライン config 内で `if (!location.hostname.endsWith('.pages.dev')) gtag('config', ...)`、かつ `src/lib/gtag.ts` の `pageview`/`event` に同じ hostname ガード（SPA 遷移・クリックも抑止）。fail-open（本番/未知ホストは通す）。
- 検証は curl: `curl https://doboku-note.com | grep -oE 'googletagmanager|G-8VXJ1RL1HG'` が非空なら SSR に GA あり。GA UI の DebugView は `?debug_mode=1` だけでは有効化されない（拡張 or リアルタイムで確認）。

関連: [[reference_scheduled_workflow_default_branch]]・[[feedback_metrics_cicd_supplied]]。
