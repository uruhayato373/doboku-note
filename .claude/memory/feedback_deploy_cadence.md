---
name: feedback_deploy_cadence
description: デザイン等の反復中は毎回本番デプロイしない。develop/ローカルで反復し、develop→main 昇格はユーザーが明示したときだけ
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 066259e4-61b8-43e4-8499-0f27403d9f18
---

デザイン・UI を大幅に反復修正する局面では、**変更のたびに本番（develop→main）へデプロイしない**。develop へのコミット、または ローカル `npm run dev`（:3020）で反復・プレビューし、**本番デプロイはユーザーが明示的に「デプロイして」と言ったとき、または設計が確定したときだけ**行う。

**Why:** 2026-06-16、総監 r0X-secondary のペルソナ導線修正で、ユーザーの選択肢ラベルに「…してからデプロイ」が入っていたため即 develop→main 昇格した。直後にユーザーが「デザインを大幅修正していきたいので毎回デプロイするのはやめたい」と表明。本番は外向き・不可逆であり、未確定の反復を都度出すのは不適。このリポジトリは main push のみが本番デプロイで、develop/ブランチに公開プレビューURLは無い＝反復確認はローカル dev が基本。

**How to apply:** 設計・UI 反復タスクでは、完了報告で「develop 反映済み・**本番は未デプロイ**」と明示し、デプロイ可否はユーザーに委ねる。選択肢を提示するときも「デプロイ」を既定に含めない。真実源は [[feedback_deploy_discipline]]（develop→main はユーザー判断・/deploy 経由）。
