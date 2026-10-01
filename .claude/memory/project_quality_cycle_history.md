---
name: quality-cycle-history
description: CEM/1級土木 品質向上サイクル（Phase G-4〜G-8）の完結記録。thin content ゼロ化＝AdSense稼働で目的達成済み
metadata: 
  node_type: memory
  type: project
  originSessionId: a3f84142-e47c-4878-8732-077a9e6d8678
---

技術士総監（CEM）キーワードページ + 1級土木 textbook/guide の品質向上サイクル（G+D パターン＝表→箇条書きでモバイル可読性改善／参考資料 §9 準拠化＋歴史・背景セクション追加）は Phase G-4〜G-8 で完結。目的だった「thin content ゼロ化 → AdSense 再申請」は達成済み（`ca-pub-7995274743017484` 稼働中）。

- Phase G-4（2026-04-15）: weighted<2.0 の 46 件リライト、全件合格（累計 128 件）。
- Phase G-5（2026-04-16）: 62 件リライト。
- Phase G-7（2026-04-19）: cem-qa 厳密採点で取り残された 21 件を補強、平均 2.80。
- Phase G-8（2026-05-17）: 136 件対象、Phase 1 rewrite 116/136・Phase 2 verify 30/116（Before 2.20→After 2.65）で中断。残 86 件は未 verify のまま受験期優先で自然終了。

**残る実務知見（現役）**:
- `keyword-rewriter` の失敗モード＝①セクション順逆転（位置づけ→参考資料の間に歴史節を挿入）②ExamPoint に「頻出の引っかけ」等の禁止表現が残る。リライト後は標準順 `とは→サブ節→位置づけ→参考資料` を手動確認する。
- bulk-score ツールと cem-qa エージェントの採点は乖離する（機械採点で緑でもエージェントが不合格にする）。
- 採点データ SoT = `.claude/state/quality-scores.json`。

関連: [[pe-pastexam-answer-compromise]]（ExamPoint 折衷案）[[parallel-agent-commit-sweep]]。
