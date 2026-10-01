---
name: factcheck-guide-facts-required
description: ガイド記事に加筆した試験統計・制度の事実はLLM(Opus含む)が外す。公開前にWebSearchで一次情報照合が必須
metadata: 
  node_type: memory
  type: feedback
  originSessionId: b8972bc6-05e5-41a6-8185-402cd9789004
---

ガイド記事（`group: guide`）に**加筆した検証可能な事実**（合格率・合格基準・受験資格・試験構成・制度改正・試験日程・年収/手当・法令）は、**LLM が高頻度で誤る**。Opus でも外す（2026-06-21、Opus版 guide-textbooks 自身に「応用能力＝令和6（正：令和3）」「第1次合格＝5年有効（正：無期限）」の誤りがあった）。32本検査で **43件の suspicious** を検出・是正。

**Why:** 試験制度は年度改正が多く（令和3＝技士補/応用能力・無期限化、令和6＝受験資格/経験記述見直し）、LLM は年度の帰属を混同し、合格者数（1次=技士補 vs 2次=技士）や試験回数（1次=年2回/2次=年1回）も取り違える。これらは受験者が依拠する核心情報で実害。

**How to apply:** 加筆・リライトしたガイドは**公開前に `guide-fact-checker` エージェント（Evaluator・WebSearch・model:sonnet）で一次情報照合**する（国交省 `tochi_fudousan_kensetsugyo` 配下・全国建設研修センター JCTC・日本技術士会・文科省・JCI・e-Gov・厚労省）。検出 suspicious は `guide-rewriter`（Generator）が正値で是正。特に pe/総監は運営者の専門外領域でハルシネーション最大。fact-check を省いて「lint清浄・3000字達成」だけで公開しない。ガイド品質サイクル（guide-qa→guide-rewriter→guide-fact-checker）は agents-registry の「ガイド品質サイクル」行が真実源。関連: [[guide-min-3000-chars]] [[opus-sonnet-split]] [[workflow-orchestration-gotchas]]
