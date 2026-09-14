---
name: feedback-cem-5kanri-scope
description: CEM キーワードページで「5管理トレードオフ」H3 は現場・運用判断キーワードに限定し、歴史的国際会議・政策キーワードには無理に当てはめない
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 54bea938-c3f0-46d1-bdd1-ba1eda6b6de4
---

CEM（技術士総合技術監理部門）キーワードページに「5管理トレードオフの観点」H3 セクションを追加するのは、**現場・運用判断系キーワード（工事計画・設備管理・リスク評価等）に限定**する。歴史的国際会議（国連人間環境会議、地球サミット等）・政策概念（SDGs、リオ宣言等）・法令制度キーワードには当てはめない。

**Why:** 5管理（経済性・人的資源・情報・安全・社会環境）の相克は、技術監理者が現場で意思決定する場面のフレームワーク。1972年ストックホルム会議のような歴史的事象に「経済性 vs 社会環境のトレードオフを初めて整理した」と書くのは contrived（こじつけ）で、教材外の哲学的解釈になる。`feedback_no_pe_construction_application` と同じ精神：教材外の応用 H2 を足さない。

**How to apply:**
- cem-qa が `description` の「5管理トレードオフ」boilerplate を根拠に H3 追加を指摘してきても自動採用しない。キーワードの性質を先に判定する
- 該当 H3 を求められた場合、対象キーワードが「技術監理者が現場で経済性・人的資源・情報・安全・社会環境のいずれかを天秤にかける場面」を含むか自問する。含まないなら description 側の boilerplate を削除する方向で修正する
- 歴史的・政策・法令キーワードでは「総合技術監理における位置づけ」H2 直下の散文で系譜・分類上の位置を 1-2 段落示すだけで十分

関連: [[feedback_no_pe_construction_application]] / [[feedback_proofread_exam_callout_check]]
