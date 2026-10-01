---
name: reference-check-sns-urls-local-index
description: check-sns-urls は本番fetchでなくローカルdoc-meta-index参照。公開+refresh-indexes済みなら deploy前でも他ページへ /docs/ 結線commitが通る
metadata: 
  node_type: memory
  type: reference
  originSessionId: f500594c-797c-480c-a594-cca7aafd5412
---

`scripts/check-sns-urls.mjs`（pre-commit `--staged`）は `/docs/{slug}` リンクを**ローカル `src/config/doc-meta-index.json` の docs キー集合**に対して検証する（L36 `const META = 'src/config/doc-meta-index.json'`）。**本番サイトを fetch しない**。

含意: あるページへ `/docs/` で結線したいとき、そのページが `published: true` かつ `npm run refresh-indexes`（doc-meta-index 再生成）済みなら、**deploy 前（develop 段階）でも結線 commit は pre-commit を通る**。

これは「本番に無いページへ結線すると check-sns-urls で落ちる → deploy 後にしか結線できない」という誤解の訂正。誤解は draft（published:false ＝ index に載らない）時点の観察に由来し、公開＋refresh-indexes 後は失効する。2026-07-04、1級土木 施工管理・法規テキスト11本を公開後、guide-safety-management / guide-environment-management のテキスト参照へ deploy 前に結線 commit できたことで実証（[[project_civil1_shikou_law_expansion]] / handoff 2026-07-03-civil1-textbook-expansion）。

関連: draft兄弟ページへの SeeAlso は依然 NG（index に載らない）。順序は「published:true 化 → refresh-indexes → 結線 commit」。
