---
name: feedback_content_deprecation_cross_lineage
description: コンテンツ仕様の廃止/変更決定は決定系統だけでなく同種の全article系統に一括適用し、note-lint機械ゲートで再混入を止める（取りこぼし防止）
metadata: 
  node_type: memory
  type: feedback
  originSessionId: bc74f5cc-13b7-4673-a77f-3e9e899572a2
---

あるコンテンツ系統で「この節/書式は廃止」と決めたら、**決定した系統だけに適用して終わりにしない**。同種の全 article 系統（総監模範論文 essay／建設部門二次／1級・2級土木 等）へ横展開し、可能なら **note-lint 等の pre-commit 機械ゲートで再混入を物理的に止める**。

**Why:** 「合格者／元公務員からのコメント」節の廃止（2026-06-10）が、建設部門二次QA（`pe-secondary-exam-qa.md`）の減点ルールにだけ反映され、総監模範論文 essay 側の既存15記事（アセットマネジメント／契約調達／技術基準 × R03-R07）に取りこぼされていた（2026-06-11 にユーザー指摘で発覚・削除）。エージェント採点（QA減点）は系統ごとに別ファイルで、かつ採点が走らない記事はすり抜ける。機械ゲート（note-lint）なら commit 時に全 `docs/note/**/article.md` へ一律適用され取りこぼさない。[[feedback_prevention_over_patching]] の横展開版。

**How to apply:** 仕様廃止/変更を決めたら、(1) `grep -rl` で全 docs/note の混入を洗い（決定系統に限定しない）、(2) 既存混入を一括是正、(3) note-lint（`scripts/note-lint.mjs`）に検知を1つ足して pre-commit でBLOCK（廃止見出しなら `## …からのコメント` のような denylist 正規表現）。QA エージェントの減点ルールは「採点が走れば効く」補助であって機械ゲートの代わりにならない。note-lint 変更は他PRと同じ `const issues = [...]` 行を編集するため、未マージの note-lint 系PRがあればそのブランチに集約する（develop直だと確実にコンフリクト）。
