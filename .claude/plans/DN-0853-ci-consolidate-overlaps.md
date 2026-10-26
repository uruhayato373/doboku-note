---
taskId: DN-0853
type: implementation-plan
createdAt: 2026-10-26
deleteOnComplete: true
---

# CI の重なった 3 組をまとめる（DN-0853）

21 本のワークフローのうち、同じ準備・同じ鍵・同じ対象で動く 3 組を 1 本ずつにまとめ、18 本にする。完了したらこの計画は消す。

## まとめ方

| 組 | 残すファイル | 消すファイル | 分け方 |
|---|---|---|---|
| Cloudflare | `cloudflare-metrics.yml` | `cloudflare-config-audit.yml` | 1 ジョブ。毎日（`23 20 * * *`）は解析、金曜（`47 13 * * 5`）は設定の監査。手動は `target`（analytics・config・both）と `accept_baseline` |
| デプロイ後 | `cloudflare-deploy.yml` | `indexnow-submit.yml` | `deploy` の後に `indexnow` ジョブ（`needs: deploy`・`verify_only` のときは動かさない・依存ゼロのまま） |
| 本番の検査 | `uptime-ping.yml` | `production-sweep.yml` | `ping` ジョブ（1 日 3 回）と `sweep` ジョブ（日曜・デプロイの後・手動の `sweep`） |

- **残すファイル名は既存のまま**にする。名前を変えると実行の履歴が途切れ、`check-workflow-health` が「完了した run が 1 件も無い」と赤にする。
- Issue の channel（`cloudflare-metrics`・`cloudflare-config`・`indexnow`・`uptime`・`production-sweep`）は変えない。開いている Issue が復旧で閉じる配線をそのまま使う。
- 手で再実行する道は残す。IndexNow は失敗したジョブだけ `gh run rerun <run-id> --failed`、手元なら `npm run indexnow:submit`。全 URL の検査は `gh workflow run uptime-ping.yml -f sweep=true`。

## 切り替え

- 定期実行と `workflow_run` は main の YAML で動く。develop に入っただけでは古い 3 本が main で動き続け、新しい形は動かない（どちらも壊れない）。
- main へ出た時点で古い 3 本は main から消えるので、それ以降は動かない。`gh workflow disable` は要らない。
- その後の最初の定期実行・デプロイで、新しい形がそれぞれ 1 回成功することを確かめる。

## 合わせるもの

- 台帳 `config/automations.json`：3 行を消し、残す 3 行の起動条件・cron・題名・目的・読み手（消した行の Issue の channel を引き継ぐ）を直す。まとまりは Cloudflare＝定期の計測と記録、本番の検査＝見張りと点検。
- 監視 `config/workflow-health.json`：`cloudflare-config-audit.yml` の行を消す。
- `scripts/check-cloudflare-metrics-freshness.mjs`・型と台帳のコメント・`tests/workflow-run-filters.test.mjs` のコメント。
- 文書：`commands.md`・`gsc-management.md`・`.claude/memory/reference_ci_quality_gate_fixes.md` ほか、消すファイル名を今の仕組みとして書いている箇所。経緯の記録（measurement-incidents.md の表、古い計画）は当時のまま残す。

## 確かめること

- `npm run check-automations`・`npm run check-datasets`・`npm run check-workflow-hygiene`・`npm test`・`npm run quality:audit:ci`
- actionlint（`check-workflow-hygiene` に含まれる）で 3 本の YAML の if 式を確かめる
- main へ出た後：統合した 3 本の定期実行、デプロイ後の `indexnow` ジョブと全 URL の検査が 1 回ずつ成功する
