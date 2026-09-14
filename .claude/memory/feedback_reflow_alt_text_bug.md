---
name: feedback_reflow_alt_text_bug
description: reflow-note-paragraphs.mjs の画像alt text誤分割バグと公開前prepublishフロー省略の再発防止
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 38473498-1d26-4d31-9f6d-86b4a737ed16
---

`reflow-note-paragraphs.mjs` の `isPlainPara` が `![alt](img/...)` 先頭を対象外にしていなかった。
alt text 内に `。` があると文境界で分割 → `![alt\nmore](img/...)` になり画像参照が壊れる。
2026-06-23 修正: `isPlainPara` に `|!\[` を追加。

**Why:** 2026-06-23 集客記事13本公開時にリフロー後 alt text が複数行になり、別スクリプト(fix-alt-text.mjs)で事後修正。

**How to apply:**
- `reflow` を既存記事に適用した後は `git diff` で `![` 行が壊れていないか確認してからコミット
- 修正済み（d2c8c3837）なので再発はしないが、旧バージョンで実行したファイルは `.tmp/fix-alt-text.mjs` で事後修正可

---

公開前に `/note-prepublish-review` を通さずに直接 `note-publish-magazine.mjs` を実行したため、段落長WARNが未検知のまま公開した。

**Why:** 集客記事を速く公開しようとしてスキルをスキップした。スキルの Phase 1 4f にリフローWARNが既にある。

**How to apply:**
- note 記事（試験種不問）を公開する前に必ず `/note-prepublish-review` を通す
- 4f WARN が出たら `npm run note-reflow -- "{dir}"` → `git diff` 確認 → commit → publish の順
- `note-prepublish-review` SKILL.md にこのフローを追記済み（d2c8c3837）
