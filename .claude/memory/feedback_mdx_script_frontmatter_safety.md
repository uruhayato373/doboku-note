---
name: feedback-mdx-script-frontmatter-safety
description: MDX を正規表現で書き換える Node スクリプトは frontmatter を分離してから処理する（YAML indent 破壊防止）
metadata: 
  node_type: memory
  type: feedback
  originSessionId: fa4b5385-9e6e-46b1-9793-1ebcab09d992
---

MDX 本文を正規表現で書き換える Node スクリプトは、必ず frontmatter（`---` で囲まれた YAML）を分離してから処理する。

**Why:** 2026-05-19 セッションで `result.replace(/  +/g, ' ')` の連続空白圧縮が frontmatter の YAML indent（`    a:` の 4 空白）を `' '` 1 空白に圧縮し、pre-commit hook が HIGH 6 件 reject（`bad indentation of a mapping entry at line 23, column 2`）。9 ファイルを `git restore` で復旧する手戻りが発生した。

**How to apply:** `.tmp/` の MDX 一括処理スクリプトでは以下のテンプレを使う。

```js
const fmMatch = result.match(/^(---\n[\s\S]*?\n---\n)/);
if (!fmMatch) throw new Error(`${filePath}: frontmatter が見つからない`);
const fm = fmMatch[1];
let body = result.substring(fm.length);
// body にのみ regex を適用（fm は無修正）
body = body.replace(...);
return fm + body;
```

特に危険な操作: 連続空白圧縮 / 行末空白 trim / 改行コード正規化（`/\n+/g`）等は frontmatter に絶対に当てない。書込みは [[feedback-parallel-agent-git]] と合わせて `transformMdxFile` 経由で行う。
