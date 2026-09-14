---
name: feedback_handoff_extract_before_delete
description: handoffの棚卸しは必ず/doc-declutter経由・前送りタスクを抽出してから削除・_archiveは廃止済み
metadata: 
  node_type: memory
  type: feedback
  originSessionId: e4c530e2-c100-419e-b130-968141ac3bbd
---

handoff（`docs/handoffs/*.md`）の棚卸しで、未完了タスクを backlog へ抽出せずに退避し、タスクごと消失させた事故（2026-07-14・BuildJob note展開の消失をユーザーが指摘して発覚）。

**何を間違えたか**:
1. 完了マーク（`> [!done]`）＋PR merged の裏取りだけで「完了」と判定し、同じ handoff 内に同居する `🔴🟡`・「残タスク」「次アクション」「別PC」等の**前送り節を抽出しなかった**。handoff は「完了報告」と「前送りタスク」が同居する文書＝完了の裏取りは前送りの不在を意味しない。
2. 廃止済みの `docs/handoffs/_archive/` を復活させた。正規ライフサイクルは「抽出 → `git rm` 削除（記録は git 履歴）・archive は 2026-07-11 廃止」（information-architecture.md「handoff のライフサイクル」）。
3. 規定手順スキルを「無い」と誤断定。`/doc-declutter` は `.claude/skills/dev/doc-declutter/SKILL.md` に**実在**したのに、フラットな `ls .claude/skills/` で探して見つからず、`doc-curator` の外部実体検証（「抽出が先・削除が後」「抽出なしの DELETE は禁止」）を丸ごとスキップした。

**Why**: スキルはカテゴリ別サブディレクトリ構造（`.claude/skills/<category>/<name>/SKILL.md`）。フラット ls では見つからない。

**How to apply**:
- handoff を触る棚卸しは必ず `/doc-declutter` 経由（`doc-curator` が KEEP/TRIM/DELETE/CONSOLIDATE を外部実体検証で判定）。手動でやるなら「前送りマーカー全スキャン → backlog 抽出 → 削除」の順を厳守。
- スキル/エージェント探索は Glob `.claude/skills/**/<name>/SKILL.md`（フラット ls 禁止）。
- `_archive/` は作らない。抽出済みなら `git rm`（削除後も handoff への出典引用は正当・`check-doc-refs` は `docs/handoffs/**` を対象外）。
- 機械ゲート `scripts/check-handoff-extraction.mjs`（pre-commit）が素通りを止める＝handoff 直下削除で前送りマーカーあり＆backlog 未同梱／`_archive` 追加を reject。回避は `SKIP_HANDOFF_EXTRACT=1`。判定の質は依然 `/doc-declutter` が担う（機械は素通り防止のみ）。

関連: [[feedback_prevention_over_patching]]（再発は点修正でなく機械検知で仕組み化）
