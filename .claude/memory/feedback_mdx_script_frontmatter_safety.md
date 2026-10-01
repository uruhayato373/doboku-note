---
name: feedback_mdx_script_frontmatter_safety
description: "MDXを正規表現/スクリプトで書き換えるときはfrontmatterを分離。Pythonのopen()テキストモードは単独\\rを\\nに化かすのでnewline=''かbytesで編集"
metadata:
  type: feedback
---

## frontmatter を分離してから処理する（YAML indent 破壊防止）
MDX 本文を正規表現で書き換える Node スクリプトは、必ず frontmatter（`---` で囲まれた YAML）を分離してから処理する。連続空白圧縮・行末空白 trim・改行コード正規化（`/\n+/g`）等は frontmatter に絶対に当てない。
- **Why:** 2026-05-19、`result.replace(/  +/g, ' ')` が frontmatter の YAML indent（`    a:` の4空白）を1空白に圧縮し、pre-commit が HIGH 6件 reject（`bad indentation of a mapping entry at line 23, column 2`）。9ファイルを `git restore` で復旧する手戻り。
- **How to apply:** `.tmp/` の MDX 一括処理スクリプトは次のテンプレを使う。書込みは `transformMdxFile`／`writeMdxFile` 経由（[[feedback_multi_session_concurrent_git]] と併せて）。

```js
const fmMatch = result.match(/^(---\n[\s\S]*?\n---\n)/);
if (!fmMatch) throw new Error(`${filePath}: frontmatter が見つからない`);
const fm = fmMatch[1];
let body = result.substring(fm.length);
// body にのみ regex を適用（fm は無修正）
body = body.replace(...);
return fm + body;
```

## Python のテキストモードは単独 `\r` を `\n` に化かす
2026-09-26、CLAUDE.md の1行を python3 の `open(p).read()` → `write()` で書き換えたら、既存の行中の単独 `\r` が改行に変わり 150→151 行になって `check-claude-md-size` が落ちた（HEAD の bytes から1行だけ置換して復元）。テキストモードは universal newlines で `\r` を `\n` に変換するため、関係ない行の差分・行数超過・CRLF 混在を生む。
- repo のファイルを Python で編集するときは `open(p, encoding='utf-8', newline='')` か bytes（`rb`/`wb`）で読み書きする。
- 編集後は `git diff --stat` で想定外の行数が無いか、CR 数（`tr -cd '\r' | wc -c`）が HEAD と同じかを見る。MDX は従来どおり `writeMdxFile`。関連: [[feedback_verify_your_excuses]]
