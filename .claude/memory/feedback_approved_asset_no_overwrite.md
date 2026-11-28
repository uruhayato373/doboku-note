---
name: feedback_approved_asset_no_overwrite
description: 承認済みの画像（POP など）の置き場に上書きしない。直した案は別名で置き、承認の台帳はエージェントが書き換えない
metadata:
  type: feedback
---

2026-11-28、ココナラの主任技士 小論文 診断の POP 画像から「減点箇所」の 1 行を描き直したとき、承認済みの画像のパス（`content/coconala/assets/pop-20260927/thumb-cce-essay-shindan.png`・git 管理外）に直接上書きし、`data/coconala/thumb-approved.json` の sha256 も書き換えようとした。台帳の書き換えは自動判定で止められ、画像は Drive の原本から戻した。

**Why:** 承認の台帳と承認済みの画像は、運営者が見て承認した記録そのもの。git 管理外の画像は上書きすると戻す手段が Drive にしか無い。
**How to apply:** 直した案は `*.proposed-YYYYMMDD.png` のような別名で置き、運営者に見せて承認を得る。承認後の差し替えと台帳の更新は運営者の指示で行う。関連: [[feedback_multi_session_concurrent_git]]。
