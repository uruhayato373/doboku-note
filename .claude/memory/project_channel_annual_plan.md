---
name: project-channel-annual-plan
description: 2026-11-06 YouTube の年間の枠を X・Instagram へ広げ、台帳を channel-annual-plan.json に一本化した。保留の解除は別判断
metadata:
  type: project
---

2026-11-06、運営者の依頼で `config/youtube-longform-plan.json` を `config/channel-annual-plan.json` へ改名し、X・Instagram の年間の枠と型を `channels` に入れた。1 本ずつの管理は X が月次計画（`content/sns/x/campaigns`）、Instagram がコンテンツ台帳（`planSlot`）のまま。

**Why:** 試験の暦が需要を決めるのは全チャネル共通で、別々に計画すると同じ山場で送り先の商品がずれ、負荷も合算できないため。X の本文まで年間で決めないのは、時事性と凍結リスク（near-dup）のため。

**How to apply:** X・Instagram の投稿を企画するときは先に枠を確かめる。2026-12-01 以降は枠の無い投稿を `x-schedule-guard` と Instagram の予約の関門が止める。枠を作っただけで保留は解けていない（`channels.*.operation` と DN-1007）。[[feedback-sns-hold-check-before-proposing]] [[project_x_account_reboot_2026_06]] [[project-sns-v7-pivot]]

2026-11-06: 枠に `stance`（立ち位置）と `materials`（材料・提案）を追加した。競合の結論の正本は `config/competitor-positions.json`。
