---
name: past-exam-archive
description: >
  公式過去問の原本 PDF を年度在庫台帳に沿って取得し、Google Drive vault（原資料PDF/過去問/）へ退避・全バイト照合・台帳登録する。
  新年度の掲載確認と新資格の在庫追加も扱う。PDF→MDX 変換は /exam-questions-import、第三者の解答解説・市販教材は対象外。
  Use when user asks to [過去問の取得, 過去問PDFの保存, 新年度の過去問, 過去問をDriveへ, /past-exam-archive].
domain: material
---

公式の過去問は直近数年度しか掲載されないことが多く、取り逃した年度は二度と手に入らない。
このスキルは「公式から取る → Drive に置く → Drive から読み戻して照合 → 台帳に載せる」を毎回同じ手順で回す。

## 置き場と正本

| もの | 置き場 |
|---|---|
| 年度在庫（資格×年度×ファイル・公式掲載状態・sourceUrl・取得日・出題形式の分析 themes） | `data/pastexams/inventory.json`（資格 id は `exam-formats.json` と同じ） |
| 原本 PDF（手元・Git 管理外） | `content/sources/past-exams/{資格}/{年度}/` |
| 原本 PDF（正本） | Drive `原資料PDF/過去問/{資格}/{年度}/`（drive-vault group `past-exam-source-pdf`） |
| Drive 台帳 | `.claude/state/assets/drive-manifest.json` |
| 問題台帳（1 問ごとの原典ファイル・ページ・公式正答・転記の照合。キーは演習データの問題 ID） | `data/pastexams/questions/{資格}.json`（台帳 id `pastexams.question-ledger`・検査 `check-past-exam-ledger`） |

対象は**試験実施機関が公開する公式の問題・正答・解答例だけ**。掲載が終わった公式の問題は、Wayback の保存版か、実施機関の許諾を明記した再配布・年度別の過去問掲載から取ってよい（`sourceUrl` は公式の URL か null、`note` に取得元と「表紙で年度・試験を確かめた」ことを書く）。正答が HTML のページだけのときは PDF に印刷して原本にする。第三者の模範解答・解説・模擬試験は教材側
（`content/sources/textbook/{資格}/過去問解説/`・group `textbook-source-pdf`）に置き、在庫台帳には載せない。

## 手順

1. **催促を読む**: `npm run check-past-exam-inventory`。WARN の「公式掲載中なのに未取得」「次の更新で消える見込み」「新年度の掲載見込み」「Drive 未退避」が対象。
2. **年度の行を足す**（新年度・新資格のとき）: 在庫台帳の `official.page` を WebFetch で開き、実際にページにある PDF の直リンクだけを
   `years[]` に `{ year, official: "listed", files: [{ kind, section, file: "R08/R08_…pdf", sourceUrl, acquiredAt: null }] }` で足す。
   URL を連番などで推測しない。会社PCで WebFetch が通らないときは general-purpose サブエージェント（sonnet）に同じ条件で調べさせる。
   新資格は `dir: content/sources/past-exams/{資格名}` と `official`（`page`・`windowYears`・`publishLagDays`・`policy`）も足す。
3. **公式から取得**: `npm run past-exam-fetch -- [--exam <id>] [--year <西暦>]` で予定を確かめ、`--commit` で取得して `acquiredAt` を書く。
   会社PCのプロキシは時々 407 を返す。取得済みは飛ばすので、失敗が消えるまで同じコマンドを繰り返す。
4. **置き先を決める**: `node scripts/drive-browser-transfer.mjs plan --group past-exam-source-pdf > .tmp/past-exam-plan.json`。
5. **Drive のフォルダを用意する（Drive MCP）**: plan の各 `vaultPath` について、`原資料PDF/過去問`（`search_files` で `title = '過去問'` かつ親が `原資料PDF`）配下の
   `{資格}/{年度}` を `search_files` で探し、無ければ `create_file`（`application/vnd.google-apps.folder`）で作る。得たフォルダ ID を plan の `folderId` に書く。
6. **アップロード**: `node scripts/drive-browser-transfer.mjs upload --plan .tmp/past-exam-plan.json`（Playwright の Google プロファイル。
   別プロファイルの Chrome が動いていて止まったら `DOBOKU_PW_ALLOW_PARALLEL=1`）。ここでの「SENT」は送信しただけで、実在の確認ではない。
7. **一覧を取る（Drive MCP）**: `search_files` で `mimeType = 'application/pdf' and createdTime > '<アップロード開始時刻>'`（`pageSize` 100・次ページも）を取り、
   `files` 配列をそのまま `.tmp/past-exam-listing.json` に保存する。件数が plan と合わなければ、足りないフォルダだけの plan で 6 をやり直す。
   `parentId` がマイドライブ直下など予定と違うファイルは `update_file`（`parentId`）で正しいフォルダへ移し、listing の `parentId` も直す（verify は親フォルダが違うものを通さない）。
8. **読み戻して照合**: `node scripts/drive-browser-transfer.mjs verify --plan .tmp/past-exam-plan.json --listing .tmp/past-exam-listing.json --out .tmp/past-exam-receipts`。
   全件一致したフォルダだけ receipt ができる。
9. **台帳に登録**: 各 receipt を `node scripts/drive-connector-register.mjs --receipt <file>` で dry-run し、全件通ったら同じ引数に `--commit`。
   マウントの Drive フォルダへ直接置いたファイルは、`node scripts/drive-vault-sync.mjs --group past-exam-source-pdf --from-vault --cloud --commit` で Drive API のハッシュから登録する（アップロードが終わるまで「Drive 未退避」の WARN が残る）。
10. **問題台帳を配線し直す**: 演習データのある資格（1級・2級土木・技術士一次・総監）は `npm run sync-past-exam-ledger -- --write` で、足した問題・正答の原典を問題台帳の行へ結ぶ（照合・正答の記録は消えない）。
11. **合格条件**: `npm run check-past-exam-inventory` で FAIL 0・対象の「Drive 未退避」0、`npm run check-drive-vault` が整合。
    在庫台帳と Drive 台帳（と配線し直した問題台帳）を同じ commit にする（`git add` はこれらのファイルだけ）。

## 大量に送るとき（新しい資格・部門を丸ごと）

数百本を 5〜6 の手順でフォルダごとに送ると、Drive MCP のフォルダ作成が数百回になる。フォルダ構成ごと送る:

1. 置き先（例 `原資料PDF/過去問`）に同名フォルダが無いことを Drive MCP で確かめる（Drive はフォルダのアップロードで同名を統合しない）。
2. `.tmp/units.json` に `[{ "parentId": "<置き先の ID>", "parentName": "過去問", "dir": "content/sources/past-exams/{資格}" }]` を書き、
   `node scripts/drive-browser-transfer.mjs upload-tree --units .tmp/units.json`。既存の資格に年度だけ足すときは `parentId` を資格フォルダにして `dir` を年度フォルダにする。
3. Drive MCP で `mimeType = 'application/vnd.google-apps.folder' and createdTime > '<開始時刻>'` を取り `.tmp/folders.json` に保存し（既存フォルダも辿るなら資格フォルダも含める）、
   `node scripts/drive-browser-transfer.mjs resolve --plan .tmp/past-exam-plan.json --folders .tmp/folders.json --root-id <原資料PDF/過去問 の ID> --root-path 原資料PDF/過去問`。
4. 以降は手順 7〜11 と同じ（listing は PDF の createdTime で取り、ページを全部たどる）。

資格台帳に無い試験（技術士の他部門・都道府県の採用試験など）は、在庫台帳に `registry: false` と `label` を付けて載せる。

## やってはいけないこと

- 誤った場所に置いたファイルを放置しない。Drive MCP の `update_file`（`parentId`）で正しいフォルダへ移す。
- Playwright のエラーを丸ごと出力しない（call log にログイン Cookie が出る）。スクリプトは 1 行目だけを出す。
- Drive の同名ファイルを上書きしない（upload は「アップロード オプション」が出たら中止する）。
- 公式 PDF を Git に入れない（public リポジトリ。`.gitignore` が `content/sources/past-exams/**/*.pdf` を外している）。
