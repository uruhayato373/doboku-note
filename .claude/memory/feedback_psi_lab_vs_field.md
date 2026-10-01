---
name: psi-lab-vs-field
description: PSIはfield(CrUX)で実害判定・labは診断。単発lab値でCRITICALを立てない
metadata: 
  node_type: memory
  type: feedback
  originSessionId: c04712e4-145b-4714-89c5-09ef28cb6e5e
  modified: 2026-07-26T21:35:57.109Z
---

PSI/CWV の重大度は **field_data(CrUX 実ユーザー p75) の category で判定**し、lab は診断・施策の前後比較に使う。**lab の単発値・単発差分で CRITICAL を立てない**（field が FAST なら最大 Medium、lab 回帰は直近5バッチ中央値で見る）。

**真実源はプロジェクト側**: `.claude/knowledge/reference/measurement-incidents.md`「2026-07-27: lab と field の判定原則」。機械可読は `.claude/config/psi-config.json` の `judgment`。判断前にそちらを読む。

**Why:** 2026-W30 レビューで lab の LCP 10,158ms を「CRITICAL REGRESSION・即対応必須」と報告したが、実際は 07-21 の単一バッチのスパイクで、field p75 は 810→822ms で一貫 FAST＝実害ゼロだった。1週間分の優先順位が歪んだ。原因は設計欠陥で、lab がフラット閾値の主判定に据えられ field LCP が判定経路に無かった（2026-07-27 に field-first へ再設計）。

**How to apply:** psi-batch JSON は `field_data.LCP.category`（実害）/ `lab_data.LCP_ms`（診断）/ `lcp_element`（原因＝何が LCP か）を持つ。必ず field → lab → lcp_element の順に見る。`lcp_element` が `<img loading="lazy">` なら `npm run check-lcp-image-hints`（pre-commit ゲート済み）で機械検出できる。関連: [[project_design_system_phase0]]

**実験の目標指標も field で設定する**（2026-08-03・EXP-005 の close で確定）。EXP-005 は
`mobile lab LCP <2500ms` を target_metric にしたが、field p75 は介入前から 822ms=FAST で
**改善余地の無い指標を 5 週間追いかけ**、最後は lab のノイズ（同一ページが 2 日で 1.6 倍振れる:
h26-a 5,476→7,501ms）で判定不能のまま no-effect close になった。lab を合否判定に使わない。
