---
name: project_civil1_ig_pack_campaign
description: 1級土木 IGカルーセル全12年度228パック完成（slide-data+PNG2280+caption）。残=reels/stories/_summary/品質採点
metadata: 
  node_type: memory
  type: project
  originSessionId: d1769fb2-37dd-4e1d-a6ea-3ebfa5e8b1ec
---

1級土木施工管理技士 第一次検定 過去問の IG カルーセルパックを全12年度（h26-r07）228パック完成（2026-06-02）。格納先は [[project_ig_exam_packs_exam_axis]] の規約で `_exam-packs/1級土木/{年度}/pack-NN/`。

**完成内容（carousel のみ）:**
- slide-data.json 228本（cover + 4×(problem+answer) + cta = 10枚構成）
- carousel PNG 2280枚（1080×1350）
- carousel/caption.txt 228本（第一次検定タイトル + 1級土木用ハッシュタグ15個）

**生成器:**
- `.claude/scripts/sns/generate-civil-1-pack.mjs`（入力 src/config/civil-1-exam-questions.json の packEligible のみ）。入口で HTML数値文字参照(&#x2460;→①)デコード + Markdown `**` 除去のサニタイズ実装済み（組合せ問題の選択肢文字化け対策）。
- `.claude/scripts/instagram/generate-caption.cjs`（_meta.exam で試験別ハッシュタグ/fmtLabel 切替。総監=default 維持で後方互換）。
- PNG 描画は `ig-post-create.mjs --exam {年}-pack-NN --exam-dir 1級土木 --size carousel`。

**残作業（任意）:** reels（mp4+VOICEVOX TTS）/ stories（4枚+note.md）/ _summary（年度目次）/ ig-carousel-qa での品質採点。いずれも総監パックには存在するが1級土木は未整備。

commit: a1911dd7b（生成+描画）、75273f5f2（caption）。
