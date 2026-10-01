---
name: feedback_metrics_cicd_supplied
description: "計測はCI/CD供給のスナップショットが正。ローカルcreds未設定をブロッカー扱いしない。PSIはfield(CrUX)で判定・labは診断。GAはSSR描画のまま保つ"
metadata:
  type: feedback
---

## 計測は CI/CD 供給が正（2026-06-05）
GA4/GSC/PSI は `data/metrics/{ga4,gsc,psi}/` の**コミット済みスナップショットを読むのが既定経路**（`fetch-metrics.yml` 週次金06:00JST + `psi-audit.yml` 日次が commit。creds 不要）。
- **Why:** 週次レビュー生成時に「ローカルで取れない＝ブロッカー／計測基盤未整備」と誤フレーミングした。真因は (1) 会社PC(Windows)が社内プロキシ(Digital Arts i-FILTER / Palo Alto)で外部API(Google/Meta)を遮断（metrics-reader/fetch-ga4/fetch-gsc・graph.facebook.com が通らない） (2) weekly-review/plan/improve/nsm-experiment スキルが「.env.local creds が前提・未達ならスキップ」「snapshot は fallback」と書いていた。
- **How to apply:** ライブ fetch は creds＋外部到達性のある環境(macOS等)限定の任意経路。会社PCでは使わない。snapshot が2週分揃わない真のデータ欠損時のみ「データ未取得」と注記。creds 未設定を「計測基盤未整備」と書かない。外部API作業全般でローカル到達性を先に疑う（Meta も同根・[[project_sns_v7_pivot]]）。恒久ルールの真実源 `docs/reference/measurement-incidents.md`（是正済スキル=weekly-review/weekly-plan/weekly-improve/nsm-experiment・commit df76a6bc5）。

## PSI/CWV は field で判定・lab は診断
重大度は **field_data(CrUX 実ユーザー p75) の category で判定**し、lab は診断・施策の前後比較。**lab の単発値・単発差分で CRITICAL を立てない**（field が FAST なら最大 Medium、lab 回帰は直近5バッチ中央値）。真実源は `.claude/knowledge/reference/measurement-incidents.md`「2026-07-27: lab と field の判定原則」と `config/psi-config.json` の `judgment`。
- **Why:** 2026-W30 レビューで lab LCP 10,158ms を「CRITICAL REGRESSION」と報告したが 07-21 の単一バッチのスパイクで、field p75 は 810→822ms で一貫 FAST＝実害ゼロ。lab がフラット閾値の主判定で field LCP が判定経路に無い設計欠陥だった（2026-07-27 に field-first へ再設計）。
- **How to apply:** psi-batch JSON は `field_data.LCP.category`（実害）→`lab_data.LCP_ms`（診断）→`lcp_element`（原因）の順に見る。`lcp_element` が `<img loading="lazy">` なら `npm run check-lcp-image-hints`（pre-commit ゲート済み）。**実験の目標指標も field で設定する**（2026-08-03 EXP-005 close）: `mobile lab LCP <2500ms` を target にしたが field p75 は介入前から 822ms=FAST で改善余地ゼロの指標を5週間追い、lab ノイズ（h26-a が2日で 5,476→7,501ms）で判定不能の no-effect close。lab を合否判定に使わない。

## GoogleAnalytics は SSR 描画のまま保つ
`src/components/GoogleAnalytics.tsx` の gtag 読み込みを `useState`/`useEffect` の client-gating にすると gtag が SSR HTML から消え、本番でも GA が停止する（next/script afterInteractive の後付け条件マウントは確実に注入されない）。
- **Why:** 2026-07-03、計測基盤 #6（pages.dev 除外）で「初期値ブロック→mount 後に hostname 判定で解除」にしたら本番 GA が全停止（PR #344）。`curl https://doboku-note.com | grep -oE 'googletagmanager|G-8VXJ1RL1HG'` が空で発覚。PR #350 で SSR 描画に差し戻して復旧。
- **How to apply:** 常に SSR 描画。除外は描画でなく **gtag 呼び出し側**でガード（インライン config 内 `if (!location.hostname.endsWith('.pages.dev')) gtag('config', ...)` と `src/lib/gtag.ts` の `pageview`/`event` に同じ hostname ガード・fail-open）。検証は上記 curl が非空であること。GA UI の DebugView は `?debug_mode=1` だけでは有効化されない（拡張 or リアルタイムで確認）。関連: [[reference_ci_quality_gate_fixes]]

関連: [[feedback_multi_session_concurrent_git]]（この修正中も pathspec 無し commit が並行 agent の5 mdx を2度巻き込んだ）
