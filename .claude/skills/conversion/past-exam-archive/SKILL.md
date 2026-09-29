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
| 年度在庫（資格×年度×ファイル・公式掲載状態・sourceUrl・取得日・出題形式の分析 themes） | `.claude/config/past-exam-inventory.json`（資格 id は `exam-formats.json` と同じ） |
| 原本 PDF（手元・Git 管理外） | `content/sources/past-exams/{資格}/{年度}/` |
| 原本 PDF（正本） | Drive `原資料PDF/過去問/{資格}/{年度}/`（drive-vault group `past-exam-source-pdf`） |
| Drive 台帳 | `.claude/state/assets/drive-manifest.json` |

対象は**試験実施機関が公開する公式の問題・正答・解答例だけ**。第三者の模範解答・解説・模擬試験は教材側
（`content/sources/textbook/{資格}/過去問解説/`・group `textbook-source-pdf`）に置き、在庫台帳には載せない。

## 手順

1. **催促を読む**: `npm run check-past-exam-inventory`。WARN の「公式掲載中なのに未取得」「次の更新で消える見込み」「新年度の掲載見込み」「Drive 未退避」が対象。
2. **年度の行を足す**（新年度・新資格のとき）: 在庫台帳の `official.page` を WebFetch で開き、実際にページにある PDF の直リンクだけを
   `years[]` に `{ year, official: "listed", files: [{ kind, section, file: "R08/R08_…pdf", sourceUrl, acquiredAt: null }] }` で足す。
   URL を連番などで推測しない。会社PCで WebFetch が通らないときは general-purpose サブエージェント（sonnet）に同じ条件で調べさせる。
   新資格は `dir: content/sources/past-exams/{資格名}` と `official`（`page`・`windowYears`・`publishLagDays`・`policy`）も足す。
3. **公式から取得**: `npm run past-exam-fetch -- [--exam <id>] [--year <西暦>]` で予定を確かめ、`--commit` で取得して `acquiredAt` を書く。
4. **置き先を決める**: `node scripts/drive-browser-transfer.mjs plan --group past-exam-source-pdf > .tmp/past-exam-plan.json`。
5. **Drive のフォルダを用意する（Drive MCP）**: plan の各 `vaultPath` について、`原資料PDF/過去問`（`search_files` で `title = '過去問'` かつ親が `原資料PDF`）配下の
   `{資格}/{年度}` を `search_files` で探し、無ければ `create_file`（`application/vnd.google-apps.folder`）で作る。得たフォルダ ID を plan の `folderId` に書く。
6. **アップロード**: `node scripts/drive-browser-transfer.mjs upload --plan .tmp/past-exam-plan.json`（Playwright の Google プロファイル。
   別プロファイルの Chrome が動いていて止まったら `DOBOKU_PW_ALLOW_PARALLEL=1`）。ここでの「SENT」は送信しただけで、実在の確認ではない。
7. **一覧を取る（Drive MCP）**: `search_files` で `mimeType = 'application/pdf' and createdTime > '<アップロード開始時刻>'`（`pageSize` 100・次ページも）を取り、
   `files` 配列をそのまま `.tmp/past-exam-listing.json` に保存する。件数が plan と合わなければ、足りないフォルダだけの plan で 6 をやり直す。
8. **読み戻して照合**: `node scripts/drive-browser-transfer.mjs verify --plan .tmp/past-exam-plan.json --listing .tmp/past-exam-listing.json --out .tmp/past-exam-receipts`。
   全件一致したフォルダだけ receipt ができる。
9. **台帳に登録**: 各 receipt を `node scripts/drive-connector-register.mjs --receipt <file>` で dry-run し、全件通ったら同じ引数に `--commit`。
10. **合格条件**: `npm run check-past-exam-inventory` で FAIL 0・対象の「Drive 未退避」0、`npm run check-drive-vault` が整合。
    在庫台帳と Drive 台帳を同じ commit にする（`git add` はこの 2 ファイルだけ）。

## やってはいけないこと

- 誤った場所に置いたファイルを放置しない。Drive MCP の `update_file`（`parentId`）で正しいフォルダへ移す。
- Playwright のエラーを丸ごと出力しない（call log にログイン Cookie が出る）。スクリプトは 1 行目だけを出す。
- Drive の同名ファイルを上書きしない（upload は「アップロード オプション」が出たら中止する）。
- 公式 PDF を Git に入れない（public リポジトリ。`.gitignore` が `content/sources/past-exams/**/*.pdf` を外している）。
