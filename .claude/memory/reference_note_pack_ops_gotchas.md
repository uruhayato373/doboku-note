---
name: note-pack-ops-gotchas
description: note パック/暗記ノート量産で踏んだ罠（2026-09-16〜17）— 予約中記事はマガジン収録不可・inject-magazine-url は1階層下のみ・publish-x パーサは末尾ブロック混入・generate-note-covers --help で全件再生成・membership labels と packs.labels の二重計上・asset-hydrate は空き 20GiB 要
metadata: 
  node_type: memory
  type: reference
  originSessionId: 3c41bba2-16e2-4af0-af42-3ad2bde82382
  modified: 2026-09-17T00:13:05.066Z
---

2026-09-16〜17 に 19 SKU（直前パック・まるごとパック・暗記ノート）を 2 日で公開したときの機械側の罠。真実源は各スクリプトのヘッダ。

- **`note-magazine-add-articles` は予約投稿（`noteStatus: reserved`）の記事を収録できない**（exit 7）。会員ドリップを `note-publish --schedule` で先に積むと、特典マガジン収録は各公開日の後に手動（DN-0246 の型）。
- **`.claude/scripts/note/inject-magazine-url.cjs <dir>` は `<dir>/<slug>/article.md` しか歩かない**。単発の `<dir>/article.md`（パック案内記事）は対象外 → `{{MAGAZINE_URL}}` を直接置換する。
- **`publish-x` のパーサは `## Tweet NN` から次の `## Tweet` までを本文とみなす**。tweets.md 末尾に「未使用（予備）」等の節を置くと最終ツイートに混入し 280 字超で失敗（104 で実証・予備は `spare.md` へ分離）。
- **`generate-note-covers.mjs --help` は無い＝引数なし扱いで全 draft を再生成する**。cover.png は gitignore なので git は汚れないが数分かかる。フィルタは dir 名の部分一致。
- **`note-magazine-membership.json` の `labels` と `packs[id].labels` に同じラベルを書くと二重計上**（期待 +1）。パック案内記事のラベルは `packs` 側だけに書く（1級まるごとと同じ）。
- **`note-publish` は cover.png が無いと `asset-hydrate`（空き 20GiB 必須）を呼んで止まる**。空きが少ないときは先に `generate-note-covers.mjs <dir>` でローカル生成すれば hydrate を通らない。
- **`check-magazine-cta:ci` は inline 面を「本文 8,000 字以上の guide/textbook」でしか数えない**。秒殺の対処は該当 MDX に `<MagazineCard id=…>` を 1 行置くか、placement の `top` に載せる。まるごとパックが top を取ると旗艦単品が 0 面になるので、別ページの top を確保する（2級 by-theme／written-questions で実証）。
- **暗記ノートの問数はカバー `hi`・H1・SKU title・掲載文の 4 箇所に散る**。writer は目標値（150）を書き、実数（159/157/156/139）とずれる → 公開前に `grep -c "^Q\. "` で合わせる（RCCM は公開後に is正・`note-update-body --commit` ＋ `note-update-cover --commit`）。
- **`refresh-indexes` は `src/config/*.json` の `generated_at` と `frequent-topics/article.mdx` の dateModified を毎回動かす**。内容差分が無ければ `git checkout` で戻して commit に混ぜない。
- Claude desktop の `~/Library/Application Support/Claude/vm_bundles/`（12GB・2026-09-16 生成）が空き容量を食う。運営者のアプリデータなので勝手に消さない。
