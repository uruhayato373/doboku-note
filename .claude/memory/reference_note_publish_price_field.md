---
name: reference_note_publish_price_field
description: "note-publish 系の公開手順と罠。price欄必須(無し=無料公開事故)・free→paid変換・会員限定公開(is_limited・試し読みライン・プラン会費変更不可)・単発PDF販売記事・有料マガジンバンドル・パック量産の機械側の罠"
metadata:
  type: reference
---
note-publish.mjs の有料判定は **`const isPaid = notePricing === 'paid' && price > 0`**（scripts/note-publish.mjs:90）。`notePricing: paid` でも **frontmatter に `price:` 欄が無い（or 0）と isPaid=false → 無料で公開される**（2026-07-24、完全攻略パック工事/補充18本＋総監3本＝計21本が price 欄欠落で無料公開＝値崩れ事故）。

**予防**: paid 記事を公開する前に `price:` 欄(>0)を必ず確認。完全攻略パック個別記事は **¥500**（バンドル ¥2,480＝単品比56-65%OFF と整合。price 欄ありの9本が¥500）。パック専用設計で個別 price を未設定にしていた記事が地雷。

**修復ツール（新規 2026-07-24）**: `scripts/note-convert-to-paid.mjs` — 既に無料公開済みの note を有料化する（`--list`/`--article` ＋ `--commit`）。既存 note editor を開く→公開に進む→有料選択＋価格(input#price setter)→有料エリア設定で境界を paidBoundary 直前へ→更新する→API で price>0 検証。note-publish の有料+境界ロジック(steps 9/11)を踏襲。冪等: note-publish は noteUrl あると skip するので既存 note の有料化には使えない＝本ツールが必要。

**同一画像の2枚目アップロード失敗（failed=1）**: 本文に同じ画像を2回（例: 著者権威バナーを冒頭+末尾）貼ると note が2枚目のアップロードに失敗し note-publish が `[12] ★中断: 本文画像が未完（leftover=0 failed=1）→ 公開しない★` で公開拒否（安全停止）。別ファイル名コピーでも同一内容だと失敗する場合あり→**重複バナーは1枚に削除**するのが確実（2026-07-24、工事14/補充-基礎杭工）。[[reference_note_update_body_gotchas]]

**~~note-publish は会員限定(membership)を扱わない~~ → 2026-08-06 に対応済み**: 旧: `notePricing: membership` を出すと isPaid=false で一般公開されていた。現: note-publish が公開範囲を選び、選べなければ公開しない（fail-closed）。仕様と実装は [[reference_note_publish_price_field]]。

---

## 会員限定公開の仕様と自動化

**note の会員限定公開は「記事タイプ(無料/有料)」とは別軸**（2026-08-06 実機確定）。公開設定の `記事の追加 → メンバーシップ` タブで「メンバー全員に公開」か「プラン限定公開（プラン別）」を選ぶ。`notePricing: membership` を isPaid=false のまま素通りさせると**全員に無料公開**される。

**フローの罠**: 公開範囲を選ぶと一次ボタンが「投稿する」→**「試し読みエリアを設定」**に差し替わる。この画面を開かないと投稿できない。note の文言どおり「**ラインを設定しない場合は購入・購読した人だけが読める記事になります**」＝ラインを引かなければ全文が会員限定（会員特典はこれが既定）。

**検証は public API の `is_limited`**（直接シグナル）。`isUnmeasurable`（body空＋タグ空）の間接推定より確か。`scripts/lib/note-live-check.mjs` が `isLimited` として返す。

**実装（2026-08-06）**: `note-publish.mjs` が `notePricing: membership` を解する。押下後のボタンが「追加済/削除」に変わらなければ**公開しない**（fail-closed）。公開後 `[13m]` で `is_limited` を検証し、読めてしまえば exit 5。`--membership-plan "<プラン名>"` でプラン限定も可。`--use-draft` / frontmatter `noteDraftId` で既存下書きを再利用（旧実装は `/new` で作り直し、元の下書きが孤児化していた）。

**特典マガジン**: `note-magazine-create --free` で無料マガジンを作り（無料フォームは価格/アピール/カテゴリ欄が無く説明欄の placeholder も異なる）、`note-membership-plan-edit --benefit-magazine "<タイトル部分一致>"` でプランへ紐付ける。

**プランの会費・人数制限は一度設定すると変更できない**: 静的テキスト描画になり入力欄も編集ボタンも消え、**運営者が UI から直すこともできない**。`--price` は黙って skip するので「変えたつもり」に注意。**新規作成直後のプランにだけ `input[name=price]` があり、そこで入れた値が確定値**＝会費変更は作り直しが唯一の手段。

**作り直しの手順（2026-08-06 実証）**: 事故回避のため**新プランを作って公開してから旧プランを削除**する（逆だと作成失敗時にプランが消えたまま残る）。`note-membership-plan-create`（作成フォームは名前と説明のみ・新 planId は一覧の差分で特定）→ `note-membership-plan-edit --price --limit --benefit-magazine` → `note-membership-plan-status --publish`（manage の行トグル・可逆）→ 旧を `--delete`（**在籍者0名を assert**・削除ダイアログは**プラン名の入力**を求める二段確認・復元不可）。

**「参加特典の表示」は手入力しない**: 特典マガジンを紐付けると一覧が自動生成される。手入力欄は**5件で上限**に達し disabled になるので、マガジン名を手で並べようとすると6件目で詰まる。

関連: [[reference_note_publish_price_field]]（`notePricing: membership` は扱わない、という旧記述はここで失効）

**2026-09-23 事故と対策**: メンバーシップ特典マガジンに入った**無料**記事（コンクリート主任技士 ペルソナ選択ガイド）を note-update-body で全文更新 → 試し読み画面でラインを引かずに進み**全文会員限定**になった（公開後 API 検証は unmeasurable を OK 扱いで素通り）。`--trial-line-bottom` で復旧。PR #588 で、無料記事は `--trial-line-bottom` か `--keep-member-lock` が無いと中断・公開後 is_limited なら FAIL に。9/23 実測で無料設定×会員限定は 8 本（まるごとパック入口 LP 3 本が本文 0 字＝要判断・DN-0275）。

---

## Kindle原稿の単発PDF販売記事の公開手順

Kindle択一(E/B/D)と同一原稿の A4 PDF を有料エリアに添付して単発note記事として売る「従チャネル」の公開手順。真実源は 08_Kindle出版戦略.md（Select非加入で併売）・`src/lib/note-magazines.ts` の `*-takuitsu-*-pdf` エントリ。

手順（1記事ずつ・ローカルの `.local/playwright-note-profile` 必須）:
1. `node scripts/note-publish.mjs --article <dir>/article.md --commit` … frontmatter `paidBoundary` を自動使用、境界検証後に公開、noteUrl/noteId/noteStatus を frontmatter へ自動writeback
2. `node scripts/note-attach-file.mjs --note <noteKey> --file <dir>/*.pdf --boundary-regex "<paidBoundary値>" --commit`
3. `note-magazines.ts` の該当キーを `published: true` + noteUrl に更新 → pathspec commit（git -c core.quotepath=false）

落とし穴1: **note-attach-file の既定境界regexは「試験問題|予想問題」ハードコード**（note-publish は frontmatter paidBoundary を読むが attach は読まない）。PDF販売記事の境界は「PDF のダウンロードと使い方」なので、attach には必ず `--boundary-regex "PDF のダウンロードと使い方"` を渡す。渡さないと boundary NG で**安全に再公開中断**（無料漏れは起きないが PDF が live に反映されない）。再実行時は既存PDFカード検出で冪等（二重添付なし）。

落とし穴2: **公開状態(noteStatus:published)にすると 3点セットゲート(check-note-3set)が発火**し、pre-commit の note-lint が `img/cover.png` と `#`付きhashtags≥40(標準~90) を要求してコミットをブロックする。build-takuitsu-pdf 直後は cover 未生成・hashtags は`#`なしプレーン8行なので必ず引っかかる。対策: `node scripts/generate-note-covers.mjs "<slug断片>"`（cover.png+svg生成、frontmatter cover: ブロック必須）＋ hashtags.txt を `#`付き~70個へ書き換え。生成物 cover.svg も追跡慣例(git ls-files で453件)。

2026-07-12 に4商品(2級土木630問¥1480/技術士一次560問¥1480/総監令和280問¥980/総監平成400問¥980)を公開・commit 593380d87。live実査 HTTP200+有料維持で確認済。関連: [[project_kindle_publishing_launch]]

未完の軽微点: 公開時 cover=false で live note のアイキャッチはブランドcover未設定(note-publishは冪等でnoteUrl有ればskip=再設定不可)。eyecatch差替はnote UI手動 or 別途要検討。

---

## 有料マガジンのバンドル（束ね商品）

note の 有料（単体）マガジンは、**既に公開済みで個別有料、かつ別の有料マガジンにも収録済みの記事を、新しい有料マガジンに追加できる**（1記事は複数マガジンに所属可）。これで「単品＋セット＋まるごと」の階層バンドルが組める。2026-07-04 実機検証（`civil-1-niji-marugoto-pack` ¥11,800 に 経験記述pack `m8290970a7f05` の101記事＋学科set `mcfe1059b3335` の5記事＋暗記1＋無料索引1＝計108記事を `note-magazine-add-articles --target <新key> --from <元magKey> --commit` で収録。`--from` は元マガジンの全記事を pull・冪等・収録数はAPIで実体検証）。

購入者は「買ったマガジン」の収録記事すべてを（各記事の有料エリア含め）読める＝バンドル割引が成立。note API v3 の note で `price` が複数返る（自記事price＋所属各マガジンprice）ので、記事がどのセットに入っているか実測できる。

**手順の型（バンドル構築）**: (1) `note掲載文.txt`（setPrice=バンドル価格）を作り `note-magazine-create --dir --commit` で空マガジン作成→key取得 (2) `note-magazine-add-articles --target <key> --from <元magKey>,... --notes <個別id> --commit`（101件で~20分・背景実行推奨・冪等再開可） (3) 索引記事は `notePricing: free` で公開しマガジンに収録＝landingUrl (4) `note-magazine-cover --key --dir --commit` (5) SKU(note-magazines.ts)に published:true＋noteUrl(マガジン`/m/`)＋landingUrl(無料索引`/n/`)。照合は `verify-note-magazines`。関連: [[project_civil_niji_gakka_line]] [[project_note_write_automation]]

---

## パック/暗記ノート量産の機械側の罠（2026-09-16〜17）

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
