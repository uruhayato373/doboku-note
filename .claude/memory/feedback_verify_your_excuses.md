---
name: verify-your-excuses
description: 「〜のため検証できない」の理由自体を検証する。エラーコードを原因として引用しない
metadata: 
  node_type: memory
  type: feedback
  originSessionId: c04712e4-145b-4714-89c5-09ef28cb6e5e
  modified: 2026-07-26T21:47:13.655Z
---

**「〜のため検証できない/未了」と書く前に、その理由自体を1手で検証する。** 理由も主張であり、検証義務は結論と同じ。特に**エラーコードを原因として引用しない** — サーバの応答は症状であって、自分の環境がなぜその状態かは説明していない。creds / proxy / ブランチ / 権限を先に疑う。

**Why:** 2026-07-27、EXP-005 の報告で未検証の理由を2つとも間違えた。①「PSI が日次クォータ超過(429)のため live 検証未了」→ 実際はローカルに `PSI_API_KEY` が無いだけ（CI は正常。`.env.local` を grep 1回で判明）。②「CI の次回実行で確認する」→ scheduled workflow は default branch(`main`) で走るので、develop の未 push 変更は deploy まで一度も実行されない（`gh repo view` 1回で判明）。

同じセッションで LCP 診断は厳密に実測していた（自分の修正を実測で否定して撤回までした）。差は「**証明するとき**は検証し、**できない理由を述べるとき**は検証しなかった」。制約・注記・limitation を無意識に検証対象外にしていた。注記の誤りは謙虚に見えて指摘されにくく、commit message に固着する。

**How to apply:** 報告で最も検証が甘くなるのは「できなかったこと」の説明。成果は疑われるが制約は素通りする。「Xだから未検証」と書く手が動いたら、Xを1手で確認してから書く。プロジェクト側 SSOT: `.claude/knowledge/reference/measurement-incidents.md`「2026-07-27:『検証できない理由』の誤り」。関連: [[feedback_no_overstate_external_specs]] [[feedback_psi_lab_vs_field]]
