---
name: feedback_metrics_cicd_supplied
description: 計測はCI/CD供給が正。ローカルcreds未設定をブロッカー扱いしない。会社PCはプロキシで外部API遮断
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 42f51b76-f564-4742-a4b6-2f1a47e7f209
---

doboku-note の計測（GA4/GSC/PSI）は **CI/CD 供給が正**。エージェントは `.claude/state/metrics/{ga4,gsc,psi}/` の**コミット済みスナップショットを読むのが既定経路**。

**Why:** 週次レビュー生成時に計測を「ローカルで取れない＝ブロッカー／計測基盤未整備」と誤フレーミングした（2026-06-05）。真因は2つ:
1. 会社PC(Windows)が社内プロキシ(Digital Arts i-FILTER / Palo Alto)で**外部API(Google/Meta)を遮断** → ローカルから metrics-reader/fetch-ga4/fetch-gsc や graph.facebook.com は通らない。
2. weekly-review/plan/improve/nsm-experiment スキルが「.env.local creds が前提・未達ならスキップ」「snapshot は fallback」と書いていた。

**How to apply:**
- 計測データが要るとき、まず `.claude/state/metrics/` のスナップショットを読む（`fetch-metrics.yml` 週次金06:00JST + `psi-audit.yml` 日次が commit）。creds 不要。
- ライブ fetch は creds＋外部到達性がある環境(macOS等)限定の任意経路。会社PCでは使わない。
- snapshot も2週分揃わない真のデータ欠損時のみ「データ未取得」と注記。creds 未設定を「計測基盤未整備」と書かない。
- 外部API作業全般、ローカル到達性を先に疑う(Metaも同根→[[project_ig_api_posting_setup]])。
- 恒久ルール真実源: `docs/reference/measurement-incidents.md`(2026-06-05)。是正済スキル=weekly-review/weekly-plan/weekly-improve/nsm-experiment(commit df76a6bc5)。
- 関連: [[feedback_shared_index_commit_safety]]（この修正中もpathspec無しcommitが並行agentの5 mdxを2度巻き込んだ。pathspec commit徹底）。
