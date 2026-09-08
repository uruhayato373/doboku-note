# Google Drive 参考文献の書籍単位整理・ページ画像化

## 採用した設計（2026-09-08）

**1参考文献ID＝1ディレクトリ、同一PDFの正本は1箇所**。
当初の「原本と文字起こしを別階層でミラーする」設計は取りやめ、ユーザー指示で同じ資料内へ統合した。
原本不変・派生物再生成・非公開という境界は、トップレベル分離ではなく下記サブディレクトリで表す。

```text
マイドライブ/doboku-note/
├── 原資料PDF/
│   ├── 書籍/{referenceId}__{短い書名}/
│   │   ├── source/001.pdf
│   │   ├── pages/p0001.jpg
│   │   ├── ocr/                  既存章別本文・図版・校正もここ
│   │   ├── crops/                監査済みの新規図クロップ
│   │   └── book-manifest.json
│   ├── 共通仕様書/{整備局}/
│   │   ├── {PDF名}.pdf
│   │   └── {PDF名}/{pages,text,ocr}/
│   ├── 白書/
│   ├── 資格試験/
│   └── 教材/                     未移行の既存資料
├── 制作物/
└── アーカイブ/
```

- 単冊も分冊も `source/001.pdf` から読み順。元名・取込元はmanifestへ保持。
- ページ画像は書籍通しの `p0001.jpg`。PDFページ・印刷ページ・章番号とは分ける。
- 既存文字起こしのファイル名・相対的な図版配置は保ち、上位ディレクトリだけ移動する。
- 原本未入手の `civil-practice-note` はその状態を維持し、`transcriptVaultDir` を明示する。
- 同一PDFを複数の資料から利用するときは別名参照で共有する。別版・追補は重複とみなさない。
- 一時サムネイル・作業コピーは `.tmp/`。逐語OCR・原画像はGitやpublic R2へ置かない。

## 台帳と互換性

- 参考文献・原本位置・画像変換条件: `reference-sources.json`。
- 論理キーから物理的な正本位置: `drive-manifest.json`。
- 分冊順・ページ対応・sha256・OCR/crop状態: 各書籍の `book-manifest.json`。
- 新規OCRキー: `content/sources/books/{bookDir}/ocr/`。
- 旧 `content/sources/textbook/` キーは既存の読み手用に残し、同じ正本へ解決する。
  旧PDFは `adopted` の別名参照。同期でも旧物理パスを復活させず、別内容で正本を上書きしない。
- ページ生成器は登録済み正本を優先する。旧 `legacyVaultPath` / `legacyMyDrivePath` は初回取込用の来歴であり、
  正本登録後の再生成に旧コピーを要求しない。
- 共通仕様書の公開ビルドはrepoのcatalog・本文が入力なので、Drive内のOCR移動に依存しない。

## ページ画像化の実施結果

- 26書籍、正本69 PDF、通しページ画像6,860枚、manifest26件。
- Drive書籍直下の13冊を参考文献台帳へ登録し、総監の旧1 IDを標準テキスト・受験万全対策・論文対策へ分割。
- 1級土木はvault外の `個人管理/資格試験/1級土木施工管理技士/` で発見。
  テキスト2冊・第一次/第二次問題集の計4冊、15 PDF、1,652ページ画像を追加した。
- 1級土木第二次問題集の天地を180度補正。総監論文対策は混在回転を修正し9 PDFページから正立18ページへ展開。
- Kindle由来12冊の本文UI cropと、レビュー等173 PDFページの除外を設定で再現できる。
  表紙はUIが題名を隠すため、題名画素を優先した別crop条件。
- 26冊の先頭・中間・末尾を目視。新規分の全原本・全ページhash、全正本69件のクラウドmd5を照合済み。
- `safety-management-all-7th`: 168ページ画像、視覚OCR6ページ、監査済みcrop1点。
  全ページ画像化は全文OCRの完了を意味しない。
- `pe-construction-keyword-book`: 現存原本は版面p371の文中で終わり、後続分冊をDrive全体で発見できない。
  利用可能範囲はp371までと明示済み。

## 今回の集約・重複撤去

- 文字起こし・図版・校正・収集資料663ファイルを対応する原資料内へ移動。
- 空になった旧文字起こしディレクトリ109個を除去。Finder設定はローカル作業領域へ退避。
- PDF577件を対象に、完全一致の重複78件（1,809,438,608 bytes、約1.69 GiB）を削除済み。
  正本と旧コピーのbytes・sha256を全件照合し、削除前にDriveファイルID・クラウドmd5を再照合して台帳を切り替えた。
- 削除後のPDFは499件、完全一致重複0。空の旧PDFディレクトリ16個も除去し、中身の残るディレクトリは保持。
- 対象・照合・移動証跡はローカル `.tmp/reference-vault-consolidation/`。
  永久保存する参照先変更の要約は `.claude/state/assets/reference-vault-consolidation.json`。
- 全正本の存続、完全一致重複0、移動663ファイルのクラウドhash、旧文字起こし実体0を検査済み。
  全台帳30,473エントリの参照先欠落0、26冊の正本のみでの再生成dry-runもPASS。
  最終実体照合は原本69 PDF、書籍ページ画像364枚、OCR1成果物、crop1点、公的基準ページ画像81枚でPASS。
  クラウドのトップレベルも原資料PDF・制作物・アーカイブの3フォルダのみと確認した。

## 画像・処理状態のルール

- 見開きは埋め込みJPEGを抽出して左右分割。単ページPDFはOCR用幅2200pxが既定。
- 最終クロップは元PDFの2600px相当から生成し、ページ画像の拡大を原典にしない。
- 回転・見開き混在・非本文除外・UI cropは `pageTransforms` / `excludedPdfPageRanges` / `contentCrop` に記録。
- 元PDFのhash・ページ数が想定と異なれば生成しない。
- 画像再生成は書籍単位で安全置換。元ページhashが不変なら既存OCR/cropの状態・来歴を保持する。

## 検査・運用コマンド

```bash
node --test tests/drive-vault.test.mjs tests/reference-book-bundle.test.mjs tests/reference-sources.test.mjs
npm run build-reference-book-pages -- --source-id <id>  # dry-run。正本だけで再実行できること
npm run check-reference-book-pages
npm run check-reference-sources -- --deep
npm run check-drive-vault
npm run drive-vault-sync -- --group source-transcript --verify --cloud
node scripts/consolidate-reference-vault.mjs --verify-moves
node scripts/consolidate-reference-vault.mjs --verify-removals
```

恒久ルールは [asset-storage-policy.md](../knowledge/reference/asset-storage-policy.md) と
[reference-sources-policy.md](../knowledge/reference/reference-sources-policy.md)。
