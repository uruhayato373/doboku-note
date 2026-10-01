---
name: reference-note-pdf-product-publish
description: Kindle択一原稿のnote従チャネル(単発PDF販売記事)を公開する手順と2つの落とし穴(attach境界regex・3点セット)
metadata: 
  node_type: memory
  type: reference
  originSessionId: 1f1d8fae-1f1e-4a6f-bfeb-92a33e313f65
---

Kindle択一(E/B/D)と同一原稿の A4 PDF を有料エリアに添付して単発note記事として売る「従チャネル」の公開手順。真実源は 08_Kindle出版戦略.md（Select非加入で併売）・`src/lib/note-magazines.ts` の `*-takuitsu-*-pdf` エントリ。

手順（1記事ずつ・ローカルの `.local/playwright-note-profile` 必須）:
1. `node scripts/note-publish.mjs --article <dir>/article.md --commit` … frontmatter `paidBoundary` を自動使用、境界検証後に公開、noteUrl/noteId/noteStatus を frontmatter へ自動writeback
2. `node scripts/note-attach-file.mjs --note <noteKey> --file <dir>/*.pdf --boundary-regex "<paidBoundary値>" --commit`
3. `note-magazines.ts` の該当キーを `published: true` + noteUrl に更新 → pathspec commit（git -c core.quotepath=false）

落とし穴1: **note-attach-file の既定境界regexは「試験問題|予想問題」ハードコード**（note-publish は frontmatter paidBoundary を読むが attach は読まない）。PDF販売記事の境界は「PDF のダウンロードと使い方」なので、attach には必ず `--boundary-regex "PDF のダウンロードと使い方"` を渡す。渡さないと boundary NG で**安全に再公開中断**（無料漏れは起きないが PDF が live に反映されない）。再実行時は既存PDFカード検出で冪等（二重添付なし）。

落とし穴2: **公開状態(noteStatus:published)にすると 3点セットゲート(check-note-3set)が発火**し、pre-commit の note-lint が `img/cover.png` と `#`付きhashtags≥40(標準~90) を要求してコミットをブロックする。build-takuitsu-pdf 直後は cover 未生成・hashtags は`#`なしプレーン8行なので必ず引っかかる。対策: `node scripts/generate-note-covers.mjs "<slug断片>"`（cover.png+svg生成、frontmatter cover: ブロック必須）＋ hashtags.txt を `#`付き~70個へ書き換え。生成物 cover.svg も追跡慣例(git ls-files で453件)。

2026-07-12 に4商品(2級土木630問¥1480/技術士一次560問¥1480/総監令和280問¥980/総監平成400問¥980)を公開・commit 593380d87。live実査 HTTP200+有料維持で確認済。関連: [[project_kindle_publishing_launch]]

未完の軽微点: 公開時 cover=false で live note のアイキャッチはブランドcover未設定(note-publishは冪等でnoteUrl有ればskip=再設定不可)。eyecatch差替はnote UI手動 or 別途要検討。
