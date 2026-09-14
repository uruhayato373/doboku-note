---
name: project_secondary_q1_cta_policy
description: 二次過去問の問1経験記述は詳細な書き方/解答例を置かず問1直下に記事中CTA(MagazineCard pastexam-essay)。1級2級全10ページ適用済、真実源も更新済
metadata: 
  node_type: memory
  type: project
  originSessionId: 192ebebb-9f88-493e-83ee-527a28d271e3
---

二次過去問（civil-construction-{1,2}/secondary-r0X）の**問1経験記述**は、詳細な「書き方ヒント」「解答例テーブル」を**置かない**。`### ポイント`（5要素・失格回避の一般指針）を残し、その直後に `### 経験記述は「自分の答案」が合否を分ける` 導入段落＋記事中CTA `<MagazineCard id="civil-{1,2}-pastexam-essay" utmContent="secondary-r0X-q1" />` を置く。

**Why**: 経験記述は希少コンテンツ＝note過去問模範答案集が売る価値。サイトで詳細な書き方を配るとカニバる。問2以降の択一・穴埋め・用語の客観解は `### 解答例` 維持（コモディティ＝SEO/AdSense資産、カニバらない）。「希少を売り、コモディティは配る」原則。

**How to apply**: 適用済み＝2級 r03-r07（commit dde166bcd/cd405f8d8）＋1級 r03-r07（37e25c41f）の全10ページ。再生成防止のため真実源も更新済（174d4ec9b）＝`docs/reference/exam-content-policy.md`「1級/2級土木 secondary」§問1経験記述・`.claude/agents/civil-secondary-exam-writer.md` 経験記述特殊ケース・`agents-registry.md`。R08等の新年度を生成・補完するときは書き方ヒントを再生成せずCTA方式にする。メンバーシップ開始後はこの問1直下CTAを伴走導線に差替（設計 [[project_civil2_keiken_essay_line]] / docs/note/2級土木/2級伴走メンバーシップ設計.md §11.3）。2026-06-09時点 develop止まり・未deploy。
