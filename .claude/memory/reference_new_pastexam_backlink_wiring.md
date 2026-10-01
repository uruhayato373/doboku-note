---
name: reference_new_pastexam_backlink_wiring
description: "MDX結線・検査の勘所。新年度過去問のbacklink/ピラー配線(exam-keyword-map.json・YEAR_ORDER)・check-sns-urls はローカル index 参照"
metadata:
  type: reference
---
pe-comprehensive-management の新年度過去問（例 `r08-primary`）を追加したとき、記事中の `<RelatedKeywords>` は**表示専用**でありキーワード逆引き/ピラー集計のソースではない（`build-exam-backlinks.mjs:9` 明記）。逆引き・ピラーに載せるには2つのSoTを手当てする（2026-07-19 確認）:

1. **`.claude/state/exam-keyword-map.json`** に設問→キーワードslug対応を追記。構造 = `{ "pe-comprehensive-management": { "r08-primary": { "1-1": ["slug",...], ... "1-40": [...] } } }`。アンカーは `1-N`（`## Ⅰ-1-N` の generateHeadingId examMode）。slug は接頭辞なし短形。記事の RelatedKeywords から抽出して流用可。
2. **`.claude/scripts/build-pillar-exam-questions.mjs` の `YEAR_ORDER`** 配列に新年度（"r08"）を先頭付近へ追加。これが無いとピラー集計に出ない。ピラーは `-primary` のみ対象（`-secondary` は集計外）。

その後 `npm run refresh-indexes`（または `build-backlinks` + `build-pillar-exam-questions`）で `past-exam-backlinks.json` / `exam-question-keywords.json` / `pillar-exam-questions.json` を再生成。検証は `grep -c 'r08-primary' src/config/past-exam-backlinks.json`。

タグは `src/config/tags.json`（`{name,slug}` オブジェクト配列）に新年度タグ（例 `{name:"令和8年度",slug:"r08"}`）を追加しないと lint-frontmatter が LOW `tags-unknown` を出す。関連: [[project_r8_yosou_full_matrix_2026_07]]

---

## check-sns-urls はローカル doc-meta-index を参照

`scripts/check-sns-urls.mjs`（pre-commit `--staged`）は `/docs/{slug}` リンクを**ローカル `src/config/doc-meta-index.json` の docs キー集合**に対して検証する（L36 `const META = 'src/config/doc-meta-index.json'`）。**本番サイトを fetch しない**。

含意: あるページへ `/docs/` で結線したいとき、そのページが `published: true` かつ `npm run refresh-indexes`（doc-meta-index 再生成）済みなら、**deploy 前（develop 段階）でも結線 commit は pre-commit を通る**。

これは「本番に無いページへ結線すると check-sns-urls で落ちる → deploy 後にしか結線できない」という誤解の訂正。誤解は draft（published:false ＝ index に載らない）時点の観察に由来し、公開＋refresh-indexes 後は失効する。2026-07-04、1級土木 施工管理・法規テキスト11本を公開後、guide-safety-management / guide-environment-management のテキスト参照へ deploy 前に結線 commit できたことで実証（[[project_civil1_textbook_to_guide_expansion]] / handoff 2026-07-03-civil1-textbook-expansion）。

関連: draft兄弟ページへの SeeAlso は依然 NG（index に載らない）。順序は「published:true 化 → refresh-indexes → 結線 commit」。
