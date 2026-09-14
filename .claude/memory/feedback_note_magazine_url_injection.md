---
name: feedback_note_magazine_url_injection
description: "noteマガジンURLの本文プレースホルダー{{MAGAZINE_URL}}反映は手作業置換せず専用スクリプトinject-magazine-url.cjsを使う"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: bc74f5cc-13b7-4673-a77f-3e9e899572a2
---

note マガジンURLを各記事本文のプレースホルダー `{{MAGAZINE_URL}}` に反映する作業は、**手作業（sed/perl/Edit）で置換しない**。専用スクリプトを使う：

```
node .claude/scripts/note/inject-magazine-url.cjs <persona> <マガジンURL>
# 例) ... 自治体技術基準担当 https://note.com/dobokunote/m/mf9f281e2cb32
```
persona はディレクトリ名の `総監模範論文-` を除いた部分（`総監模範論文-` 付きでも可）。配下の全 RXX/article.md を一括処理。

**Why:** このスクリプトは (1) CRLF/LF を元ファイルから保持（MSYS `sed -i` は CRLF を LF に壊す → 一度壊すと git が「LF will be replaced by CRLF」警告を出す）、(2) `{{MAGAZINE_URL}}` 以外の旧バリアント（「※note 公開後に…予定」等）も吸収、(3) 冪等（注入済みはスキップ）。手作業はこれらを全部自前で再実装することになり事故る（2026-06-11 Opus が既存スクリプトを探さず perl で手置換し、その前段で MSYS sed が CRLF を一度破壊した）。frontmatter の `noteUrl:`/`noteId:` は別物（個別記事URL、各記事 note 公開後に記入）でこのスクリプトの非対象。

**How to apply:** note 公開系の作業（マガジンURL反映）に着手する前に `docs/reference/note-essay-review-checklist.md` Step10 と `.claude/skills/social/publish-note` を Read する（CLAUDE.md「書く前に読む」）。本文で `{{...}}` プレースホルダーを見たら手で埋めず、まず対応スクリプト（`.claude/scripts/note/`）の有無を探す。docs/note の `.md` 一括置換が本当に必要な場面でも `sed -i` でなく CRLF 保持手段（perl binmode / Node で元 EOL 保持）を使う。真実源は note-essay-review-checklist Step10・publish-note Phase0。関連: [[feedback_note_link_card]]（プレースホルダーは単独行＝note リンクカード化の前提）。
