---
name: reference-note-paid-magazine-bundle
description: note有料マガジンは既存の有料記事(別有料マガジン収録済)を収録でき、束ね商品(バンドル)を作れる。実機検証済み
metadata: 
  node_type: memory
  type: reference
  originSessionId: 007dd616-fdf1-4d4b-ba54-ea6e058032e8
---

note の 有料（単体）マガジンは、**既に公開済みで個別有料、かつ別の有料マガジンにも収録済みの記事を、新しい有料マガジンに追加できる**（1記事は複数マガジンに所属可）。これで「単品＋セット＋まるごと」の階層バンドルが組める。2026-07-04 実機検証（`civil-1-niji-marugoto-pack` ¥11,800 に 経験記述pack `m8290970a7f05` の101記事＋学科set `mcfe1059b3335` の5記事＋暗記1＋無料索引1＝計108記事を `note-magazine-add-articles --target <新key> --from <元magKey> --commit` で収録。`--from` は元マガジンの全記事を pull・冪等・収録数はAPIで実体検証）。

購入者は「買ったマガジン」の収録記事すべてを（各記事の有料エリア含め）読める＝バンドル割引が成立。note API v3 の note で `price` が複数返る（自記事price＋所属各マガジンprice）ので、記事がどのセットに入っているか実測できる。

**手順の型（バンドル構築）**: (1) `note掲載文.txt`（setPrice=バンドル価格）を作り `note-magazine-create --dir --commit` で空マガジン作成→key取得 (2) `note-magazine-add-articles --target <key> --from <元magKey>,... --notes <個別id> --commit`（101件で~20分・背景実行推奨・冪等再開可） (3) 索引記事は `notePricing: free` で公開しマガジンに収録＝landingUrl (4) `note-magazine-cover --key --dir --commit` (5) SKU(note-magazines.ts)に published:true＋noteUrl(マガジン`/m/`)＋landingUrl(無料索引`/n/`)。照合は `verify-note-magazines`。関連: [[project_civil_niji_gakka_line]] [[project_note_write_automation]]
