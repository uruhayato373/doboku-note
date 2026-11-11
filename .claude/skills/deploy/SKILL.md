---
name: deploy
category: dev
description: >
  develop→mainブランチ経由でCloudflare Pagesにデプロイする。Use when user asks to [デプロイ, 本番反映, /deploy].
domain: ops
---

develop の検査済み commit を main へ昇格し、本番の確認までを `npm run deploy:main` 1 本で行う。手順はスクリプトが持つ（`scripts/deploy-main.mjs`）。手でコマンドをつながない。`main` への直接 push はフックが止める。

## 前提

- 変更がすべてコミットされ、develop に入っていること

## 手順

```bash
npm run deploy:main              # 検査の完了を待って昇格し、本番を確かめる
npm run deploy:main -- --dry-run # 昇格先と差分だけ出す
```

- exit 0 … 本番の確認まで通った
- exit 1 … 検査・push・デプロイ・本番のいずれかが失敗
- exit 2 … 検査不成立（本番に届かない、緑待ちが 30 分超など）

exit 1 / 2 は表示された原因を直して同じコマンドを再実行する。直せないときだけユーザーに報告する。`--force` は使わない。

## 報告

- 昇格した commit と、デプロイ run の URL
- exit 0 でなければ、止まった原因（exit 0 以外を「完了」と書かない）
