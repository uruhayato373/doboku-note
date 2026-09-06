# content/sources/textbook/ — 書籍由来ソースの置き場について

この配下は各資格・題材の**教材原典の文字起こし**（自前の Markdown 化）と、そこから派生した
図版・作業ファイルを置く場所だった。だが以下のPDF・ページ画像と同じ理由で、**文字起こし本文も
2026-08-27 に public repo からは追跡解除**した（このリポジトリは public）。

## 置き場の分担

| 種別 | 置き場 |
|---|---|
| 元 PDF・スキャンページ画像 | Google Drive vault `原資料PDF/教材/{書名}/`（台帳 `drive-manifest.json`。[textbook-pdf-archive.md](../../../.claude/knowledge/reference/textbook-pdf-archive.md)） |
| 文字起こし本文（`.md`） | private Google Drive vault `マイドライブ/doboku-note/文字起こし/`（group `source-transcript`） |
| `.html`・図版・作業ファイル | private Google Drive vault `マイドライブ/doboku-note/文字起こし/`（手動管理） |
| 各サブディレクトリの README.md | git 追跡を継続（この案内のため） |

## ローカルで復元する手順

新しい端末で作業する場合:

1. Google Drive デスクトップアプリでこの端末のアカウントにログインし、`マイドライブ/doboku-note/文字起こし/` を展開・同期する
2. `npm run drive-vault-sync -- --group source-transcript --pull` で台帳にある `.md` を対応する `content/sources/textbook/` 配下へ戻す
3. PDF・ページ画像が必要な場合は別途 `npm run drive-vault-sync -- --pull --path 'content/sources/textbook/{書名}/'` で Drive から取得する（マウントが要る・ネット不要）

文字起こしの先頭には `source` / `sourcePdfs` / `pdfPages` / `method` 等の frontmatter を付ける。原本から
記事までの ID 対応と公開条件は [reference-sources-policy.md](../../../.claude/knowledge/reference/reference-sources-policy.md) を参照する。

## なぜ動かしたか

- このリポジトリは public。書籍由来の文字起こし（章立て・図版を含む）を平文でホストし続けると
  著作権上のリスクになる
- 各書籍の README（例: `土木施工実務ノート/README.md`）は元々「非公開の内部ソース」と明記していたが、
  実際には git 追跡＝公開されている矛盾があった
- 2026-08 時点では PDF・ページ画像は private R2 へ退避済みだったが、文字起こしテキストだけは対象外のまま
  git に残っていたため、当時は同じ扱いに揃えた。2026-09-05 に置き場ルールを「誰が使うか」へ改め、
  人しか読まない教材は原本・ページ画像とも Drive へ寄せた（詳細: [textbook-pdf-archive.md](../../../.claude/knowledge/reference/textbook-pdf-archive.md)）

詳細な退避ポリシーの全体像は
[asset-storage-policy.md](../../../.claude/knowledge/reference/asset-storage-policy.md) を参照。
