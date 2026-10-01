---
name: project_qualification_expansion_ssot
description: "資格展開の判断SSOT（2026-09-26）。軸=自分で答案を組み立てる区分。施工管理は土木二次優先・建築は計測・電気/管/造園/建機は見送り。行政書士取得決定（2026-10-01）を含む"
metadata:
  type: project
---

2026-09-26、展開する資格の判断材料を正本に配線した。出題形式 `exam-formats.json`・市場スキャン `market-scan.json`＋`data/market/history/`・`youtube-competitors.json`・売上の資格振り分け `product-lineup.json` salesRules。並べる場所は `npm run qualification-market`／管理画面 戦略＞展開の判断。判断の記録は `docs/strategy/06_多資格展開戦略.md` v2.0。

**Why:** 売上は自分で答案を組み立てる商品（経験記述・論文）に集中し、7月の技術士筆記前に偏る。受験者数だけでは売れる資格を選べない。ユーザーは競合（YouTube/ココナラ/note/X/IG）をSSOT管理したうえで展開を決めたいと求めた。

**How to apply:** 展開の相談は qualification-market を先に読む。決定済み: 施工管理は土木二次の立て直し(DN-0343)が先、建築は候補のまま無料記事で需要計測(DN-0342)、電気・管・造園・建設機械は declined、舗装・測量士・測量士補はユーザー判断で active（取得済み・DN-0352〜0355、プロフィール追記 DN-0356）。技術士の他部門は部門別に広げず、口頭(DN-0344)・業務内容の詳細(DN-0345)の全部門共通版から。上下水道部門はユーザー判断で active（2026-09-26・商品設計 DN-0348→必須I DN-0349・選択 DN-0350・サイト入口 DN-0351、4月末までに商品）。残る候補は DN-0322（2027-01〜03）。資格別の売上は建設部門が最大（総監より大きい）。関連: [[project_nsm]]、[[feedback_ssot_no_hand_copies_self_verify]]。

## 統合: 行政書士の取得決定（旧 gyoseishoshi_decision・2026-10-01）
運営者が「行政書士は取得する」と決定（建設業許可・補助金の副業相談の流れ）。展開計画は backlog DN-0491、副業線引きガイドは DN-0490（`/exam/pe-construction/guide/fukugyou-dokuritsu` 公開済み。2026-12末に GSC/Bing で需要確認）。
- **Why:** 建設業許可・経審・補助金の申請書類作成を報酬を得て行うのは行政書士の独占業務（行政書士法19条、R8.1.1施行で「いかなる名目によるかを問わず」明記）。技術士・1級土木だけでは受託できない。
- **How to apply:** 登録前は書類作成代行をココナラ等に出品・提案しない。docs/strategy/02・03 の行政書士は「将来候補」のままなので DN-0491 で「取得予定」へ更新する。
