---
name: project-cem-essay-agent-pair
description: 総監記述式note模範論文の専任エージェントペア cem-essay-writer / cem-essay-qa（2026-06-18新設）
metadata: 
  node_type: memory
  type: project
  originSessionId: 0dadcaf7-1f12-49a2-9570-234355b3bebc
---

総監（技術士総合技術監理部門）記述式 note 模範論文に**専任の Generator＋Evaluator ペア**を新設（2026-06-18）。資格ごとに writer を揃える方針の一環（建設部門=pe-secondary-exam-writer、1級2級土木=civil-keiken-essay-writer、総監=cem-essay-writer）。

**Why:** 総監 note 模範論文だけ専任 writer が無く親駆動だった。資格別エージェント体制の対称化のためユーザーが新設を指示。

**How to apply:**
- `cem-essay-writer`（Generator/sonnet）= 4タイプ対応（persona模範論文〔総監模範論文-{persona}・R03-R07＋R08予想2記事〕/R8予想問題集/設問3国家施策バンク/5管理クロストレードオフ）。返却前ゲート＝`essay-shisaku-charcount --strict`／`check-essay-heading-structure --strict`／`note-lint`。
- `cem-essay-qa`（Evaluator/sonnet）= 5軸（字数〔各施策600字〕→散文性→監理可能性→専門度→白書根拠）。
- **評価軸・工程・公開ゲートの真実源 = docs/reference/note-essay-review-checklist.md（Step 0-6f）= このペアのランブック**。論述ルールは `/pe-essay-draft`（サイト版）から再利用。構成決定は 総監マガジン構成_決定2026.md。
- **サイトの r0X-essay-{attr} を書く `/pe-essay-draft` とは別物**（あちらは無料サイトページ）。混同しない。
- 配線（note-magazines.ts/note掲載文.txt/PDF spec）・公開後URL反映・commit は親。
- 導入・無料部分・販売導線は [[reference_note_selling_structures]]（売れる9型）を参照。
- 台帳=agents-registry.md（エージェント数48→50）。
