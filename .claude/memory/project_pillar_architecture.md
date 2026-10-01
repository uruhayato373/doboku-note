---
name: pillar-architecture
description: ピラーページの内部リンク双方向化 + 過去問掲載の完成状態（2026-04-26、#72 P10 拡充）
type: project
originSessionId: 5f01bd32-0d58-45bc-934d-082f9c911db3
---
PE 5 ピラー（経済性管理 / 人的資源管理 / 情報管理 / 安全管理 / 社会環境管理）と Civil 5 ピラー（土工 / コンクリート / 法規 / 品質管理 / 工程管理）が完成。**PE 側は内部リンクが完全に双方向化 + 過去問演習導線も整備済み**。

**Why:** Issue #72 P10 ピラーページ作成 (2026-04-26) で 10 ピラー作成後、**spoke → pillar 被リンクが極端に少ない（一部 0 件）と判明**。SEO topical authority 確立のため Phase 1（hub → pillar）+ Phase 2（spoke → pillar 一括 648 ページ）+ Phase 4（過去問掲載）の 3 段階で底上げした。Civil は spoke 過去問のキーワード紐付けが未完成のため過去問掲載は保留。

**How to apply:**
- ピラーの被リンク数を訊かれたら: PE 5 ピラー各 100+ 件（hub 5 + spoke 100+）、Civil 5 ピラー各 5〜6 件
- 「ピラーに過去問載ってる？」→ PE のみ載ってる、Civil は未対応
- 過去問追加・編集後は **`npm run refresh-indexes`** で `pillar-exam-questions.json` 再生成（自動）
- 新規 PE keyword 追加時は **`node .claude/scripts/add-pillar-backlinks.mjs`** で対応ピラーへのバックリンクを追加（冪等）
- Civil ピラーで過去問を載せたい場合: civil 過去問の `<RelatedKeywords>` 紐付け作業が前提（現状 `exam-question-keywords.json` に 0 件）

**主要数値スナップショット（2026-04-26）**:
- PE 5 ピラー被リンク: economic 134 / human-resource 148 / information 147 / safety 128 / social-environment 111
- PE 5 ピラー該当過去問（17 年累計）: economic 201 / human-resource 174 / information 181 / safety 166 / social-environment 146（合計 868 エントリ、重複込み）
- 過去問データ: H21〜R07（17 年）× 40 問 = 680 設問、すべてキーワード紐付け済み

**主要ファイル**:
- `.claude/scripts/add-pillar-backlinks.mjs`: spoke → pillar 一括追加（PE 全 keyword 用）
- `.claude/scripts/build-pillar-exam-questions.mjs`: 過去問 → ピラー集計
- `src/config/pillar-exam-questions.json`: 集計結果（build 副産物、refresh-indexes 経由で更新）
- `src/components/ui/RelatedExamQuestions/RelatedExamQuestions.tsx`: 年度別アコーディオン UI
- 5 ピラー article.mdx: 「## 出題傾向」直後に `<RelatedExamQuestions pillar="..." />` を MDX で挿入
- keyword-2026 article.mdx の `## 2 経済性管理` 〜 `## 6 社会環境管理` 構造が **slug → 管理分野マップの真実源**

**Civil 過去問のキーワード紐付け（残作業）**:
- `exam-question-keywords.json` に civil 過去問エントリは現状 0 件
- 紐付け完了後、`build-pillar-exam-questions.mjs` を civil 対応に拡張すれば同等の機能を提供可能
- 別 Issue 化推奨（PE と civil で過去問構造・年度形式が異なるため要設計）
