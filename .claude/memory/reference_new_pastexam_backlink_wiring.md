---
name: new-pastexam-backlink-wiring
description: 新年度の過去問記事をbacklink/ピラーに載せるにはexam-keyword-map.json追記+YEAR_ORDER追加。MDXのRelatedKeywordsは表示専用
metadata: 
  node_type: memory
  type: reference
  originSessionId: ca267b81-fe3c-4ecd-9b0e-5292f64ee4f6
---

pe-comprehensive-management の新年度過去問（例 `r08-primary`）を追加したとき、記事中の `<RelatedKeywords>` は**表示専用**でありキーワード逆引き/ピラー集計のソースではない（`build-exam-backlinks.mjs:9` 明記）。逆引き・ピラーに載せるには2つのSoTを手当てする（2026-07-19 確認）:

1. **`.claude/state/exam-keyword-map.json`** に設問→キーワードslug対応を追記。構造 = `{ "pe-comprehensive-management": { "r08-primary": { "1-1": ["slug",...], ... "1-40": [...] } } }`。アンカーは `1-N`（`## Ⅰ-1-N` の generateHeadingId examMode）。slug は接頭辞なし短形。記事の RelatedKeywords から抽出して流用可。
2. **`.claude/scripts/build-pillar-exam-questions.mjs` の `YEAR_ORDER`** 配列に新年度（"r08"）を先頭付近へ追加。これが無いとピラー集計に出ない。ピラーは `-primary` のみ対象（`-secondary` は集計外）。

その後 `npm run refresh-indexes`（または `build-backlinks` + `build-pillar-exam-questions`）で `past-exam-backlinks.json` / `exam-question-keywords.json` / `pillar-exam-questions.json` を再生成。検証は `grep -c 'r08-primary' src/config/past-exam-backlinks.json`。

タグは `src/config/tags.json`（`{name,slug}` オブジェクト配列）に新年度タグ（例 `{name:"令和8年度",slug:"r08"}`）を追加しないと lint-frontmatter が LOW `tags-unknown` を出す。関連: [[r8-exam-restoration-2026-07]]
