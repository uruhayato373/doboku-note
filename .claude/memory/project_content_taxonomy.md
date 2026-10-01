---
name: content-taxonomy
description: コンテンツ分類（領域×資格×記事型×テーマ×タグ）の SSOT を 2026-09-11 に文書化・機械化。タグは日本語正規・英語 slug は別名・構造タグは group と矛盾させない。exams: 廃止
metadata:
  type: project
---

2026-09-11、分類語彙を `.claude/knowledge/reference/content-taxonomy.md`（規則）と `src/config/{content-taxonomy,categories,tags,topics}.json`（値）に集約した。
検査 `npm run check-content-taxonomy`（pre-commit --staged は未登録タグ・別名綴り・構造タグ不整合が赤、quality:audit の :ci は baseline ラチェット）。
領域は `categories.json` の `area` で宣言（content-routes のハードコード除去・1,211 ルート不変）。タグは build-doc-meta-index が canonical へ正規化し runtime は canonical だけを見る。
codemod `scripts/migrate-tag-aliases.mjs` で 255 本の別名綴りを正規化、group と矛盾する構造タグ 59 本を除去して債務 0。`安全管理` は safety-management-cem（資格横断ハブ）に一本化、safety-laws は関係法令。

**Why:** 4 層の分類が doc 無しで実装に散り、タグが系統ごとに分裂して横断（/topics/）が効かなかった。
**How to apply:** 新記事は日本語タグ＋`topics:` 任意宣言、`exams:` は書かない。語彙を変えるときは content-taxonomy.md → JSON → `npm test`（doc-classifier/content-routes との一致を固定）。
残: topic 三方向の 0 件（総監 5 管理の practice/standards、tunnels・maintenance の practice）は WARN のまま。civil-practice の `part-XX` リンク 4 本の章記事化は未着手。
