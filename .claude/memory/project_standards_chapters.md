---
name: project_standards_chapters
description: "公的基準(共通仕様書)を章記事化(共通9文書387章＋地方版3文書75章＋工事必携の要綱4文書80章・canonical=近畿のみ索引・要綱の版違いはeditionCanonicalで1本だけ索引・表は原本照合で組み直し)＋1ページ1画像+1テキストへ展開(5,949p・section+版面ページで一意)。E2Eはビルド成果物で回す"
metadata:
  type: project
---

2026-08-30 完了・本番反映済み。`/standards/{agency}/{document}/chapters/{編-章}`。

**2 層構成**。レイヤー1＝`content/site/standards-library/`（PDF 50 ページ単位の逐語文字起こし・
原典照合用で**不変**）。レイヤー2＝`content/site/standards-articles/`（そこから生成した章記事）。
逐語ページは削除せず「原典PDFページで確認する」導線として残し、章を公開した文書では
`noindex, follow` へ下げてサイト内検索の対象からも外す。

**章は柱（running header）で切る。part では切らない。** 本文 582 ページ全ての第 1 非空行が
`第N編 XX編 第M章 YY` なので、章の帰属をページ単位で確定できる（推定不要）。分冊境界を
またぐ章が 9 本あるため、全 part をページ順に結合してから解析する。
**条番号 `A-B-C-D` は 編-章-節-条**なので、柱と直前の節番号に対する整合（1,804/1,804）が
そのまま解析の検証になる。

**対象は当初 72 文書中 9 文書（2026-10-19 に地方版 3・工事必携の要綱 4 を足して 16 文書。下の節）。** 柱を持つのは共通仕様書 9 文書と北海道の道路河川工事仕様書で、うち沖縄は中国と原本
SHA-256 が完全一致する重複なので生成しない（2026-10-16 に北海道を追加: 全角数字の柱・`1 － 1` のページ番号・
字間を空けた題名に対応、柱の誤植は設定 runningHeaderCorrections で補正、地域差分からは外す）。
残り 62 文書（工事必携・地方版）は構造がまったく違う。除外理由は設定に書くだけでなく、
**柱の出現率や SHA 一致で実データ検証する検査**を持たせてある（ワイルドカードの抜け道を塞ぐ）。

**同一内容を 9 機関が公開しているので索引は 1 機関だけ**（既定は近畿・
`config/standards-structure.json` の `canonical.commonAgencyId`）。他機関の章は
`noindex, follow` で読める状態を保つ。sitemap に載るのは近畿の 43 章と 3-2 の節ページ（本文 200KB 以上の章は節ページに分ける）。

**表は可逆に復元できるものだけ GFM**（近畿 164 件中 5 件）。基準類一覧は箇条書き、残りは原本のページ画像と照合して
組み直した `content/sources/standards/tables/{key}.json`（承認済み 217 件・文字の過不足ゼロを機械検査）で出す（2026-10-16）。
理由コードは台帳に記録する。可逆性検査
（セル連結が元行と一致）と空セル禁止が無いと、列を静かに取り違える。

コマンド: `build-standard-articles` / `build-standards-ogp` / `check-standard-articles`（19 検査。17〜19 は読める形＝文の途中の改行・表のはぐれ断片・壊れた表）。描画は `e2e/standards-render.spec.ts`（PR は中身が異なる 168 ページ、夜間・手動は `STANDARDS_RENDER_SCOPE=all` で比較の外の文書も 618 ページ）、目視は `standards-table-gallery`（`--all`）。版面のまま残った表の数は `readabilityBaselines.verbatimTables` のラチェット（DN-0850）。
OGP は章ごとに `chapters/{id}/ogp.png` へ生成し asset-storage の `site-ogp-png` グループに
自動一致させる（R2 供給・URL 導出が記事と同じ仕組みに乗る）。**ogp-supply.yml の paths は
MDX だけでなく manifest と生成器も見る**——入れ忘れると章を足しても供給が発火せず、
og:image が R2 に無い URL を指したまま本番へ出る。

**E2E はビルド成果物に対して回す（2026-08-30 に移行）。** `npm run serve`（新設・out/ を
3025 で配信し `_redirects` の 301 も適用）が既定ターゲット。`E2E_DEV=1` で従来の dev。
dev だと初回コンパイルで落ちるテストが実行ごとに入れ替わり、旧 `/category/` `/docs/` は
Cloudflare の `_redirects` でしか存在せず dev では必ず 404 になる（**この 2 つで smoke と
navigation は長期間ずっと赤だった。CI も同じ dev で走っていたので誰も気づいていない**）。
27 passed/23 failed/4分超 → 58 passed/0 failed/13 秒。**baseURL は localhost**——
この開発機では 127.0.0.1 宛の一部 `_next/static/chunks/*.js` が 403 になり、
ハイドレーションが壊れてコンソールエラー検査が落ちる。

**この作業で足した決定的ゲート**（2026-08-30）:
- `check-e2e-targets` — E2E が叩く URL を `out/` と `_redirects` に突合。転送元を叩くと
  dev では必ず 404 で「検査が成立しないまま赤」になる。**要 `npm run build` なので
  quality:audit ではなく ci.yml / e2e.yml の build 後**に置く（quality audit は build より前に走る）
- `check-seo-build` の landmark 検査 — `<main>` はページに 1 つ。ビルド済み全 1,893 ルートを見る
- `check-command-guidance` を CLAUDE.md / AGENTS.md へ拡張 — 記載はあるが package.json に
  無いコマンドを止める
- `tests/standards-ogp-guards.test.mjs`（9 件）— 孤児判定が章 344 枚を消さない / 退避台帳の
  キー形状と**台帳分岐の実走** / ogp-supply の paths

**e2e.yml は 2026-08-22 からずっと壊れていた**（`doc-meta-index.json` を生成するステップが
無く type-check で落ち、E2E 本体に一度も到達していなかった）。ci.yml と ogp-supply.yml には
配線済みでこのワークフローだけ漏れていた。修正して CI で全ステップ緑を確認済み。

関連: [[reference_quality_audit_system]] / [[project_asset_audience_routing]] / [[reference_quality_audit_system]]

## 統合: 共通仕様書のページ画像化（旧 standards_page_images・2026-09-05）
- 公的基準（国交省 土木工事共通仕様書）10文書＝9ユニーク・5,949ページを原本 PDF から1ページ=1画像+1テキストへ展開（章記事が `part-NN.md`（50ページ束）までしかページ情報を持たず「原本の何ページか」を機械で言えなかったため）。置き場 `content/sources/standards/{agencyId}/{documentId}/`（ID は standards-library の catalog.json と同体系）。`pages/p0001.jpg`（pdftoppm 270dpi・JPEG q85）と `text/p0001.txt`（pdftotext -layout を \f で分割）。**実体 3.4GB は Drive vault の原本 PDF と同名フォルダ（隣）**、Git には `manifest.json`（per-page sha256）と README のみ（[[project_asset_audience_routing]]）。`npm run build-standards-page-images`（`--manifest-only`）／`check-standards-page-images`（quality:audit 同梱）。
- 罠: ①**原本の同定はファイル名でなく sha256** ②PDF の通しページと版面ページは一致せず、目次が 1-1..1-77 のあと本文が再び 1-1 から始まる→各ページに `section`（front=目次/body=本文）を持たせ**section+版面ページで一意**（北海道版は目次が無番号で全ページ body）③対象 PDF は全て born-digital（text/ は OCR でなく PDF 自身のテキスト層）。OCR が要るのはスキャン教材（`content/sources/textbook/`）側の別パイプライン。
- 沖縄版は中国地方整備局版と原本 sha256 一致のため `sameAs: "chugoku/common"` の alias（画像重複生成なし）。companion 62文書（4,500p）は未着手（`--role all` で同じ仕組みが回る）。

## 地方版の章記事化（2026-10-19）
- 共通仕様書の章立てを持つ地方版 3 文書を章記事にした: 中部 特記仕様書 43 章・東北 共通特記仕様書 13 章・北海道開発局独自 19 章。版面の違いは `config/standards-structure.json` の documents.* の**方言**で吸収（`dialectOf`: 柱/条番号の接頭辞「特仕」、印刷ページ番号 plain/dashed、条番号 3 段=章-節-条、節の字下げ、文で始まる項は段落、差分文書は項の連番を見ない）。既存 9 文書の出力は 1 バイトも変わらない。
- **柱を持たない文書は `chapterSource: headings`**＝本文中の編・章の見出しで切る。見出しは中央寄せ（字下げ 20〜28 桁）なので字下げで判定しない。章はページ途中で替わり、境目のページは前後の章が共有する（検査 2 は連続する章の境目だけ許す）。前文は最初の章の冒頭へ。
- 中国地整版（chugoku/local）は 5 列の訂正・追加表で、版面は列がずれて行を組み直せない。**ページ画像から 1 ページ 1 JSON に組み直し**（content/sources/standards/amendments/chugoku-local・61p・204 行・版面と文字の多重集合一致・Writer 3 体→別の QA 3 体で全承認）、中国版の章記事の条の後に差し込む（3 段の番号は節の冒頭・条に当たらない追加の行は章末。目印 amendments:start/end で囲み、表と読みやすさの検査・地域差分・公開データの条の本文から除く）。検査 `check-standards-amendments`。多重集合の照合は順序を見ないので**順序・欄の振り分けは QA が画像で見るのが要**（QA が欄の取り違え 4 件を直した）。原本の「訂正・追加」欄の空欄・`1-追加`・3 段の番号・範囲は形で持てるようにした（Writer が回避策で別の欄に逃がしていた）。
- 章を足したときの OGP: 生成 → `asset-inbox-push --path content/site/standards-articles/ --commit` → CI 取り込み後に develop を取り込み `build-standards-ogp --write-srchash`。**build-standard-articles は chapters/ を作り直すので手元の ogp.png も消える**。札は documents.*.ogpLabel（既定以外のときだけ srcHash に入れ、既存章を作り直さない）。
- **工事必携の要綱は `chapterSource: outline`**（2026-10-19・九州の安全施工技術指針・公衆災害防止対策要綱・完成図等作成要領、沖縄の公衆災害防止対策要綱の解説）。見出しの形が文書ごとに違い本文中の参照（`第１章３節に準ずること。`）と取り違えるので、章の始まりを設定 outline の「ページ＋その行」で持つ（編・編兼章・中扉 front・条の見出しを止める plainArticles）。方言は runningHeaderPattern・printPagePattern・printPageRequired:false・articleStyle:"dai"（`第１ 目的`）・fullWidthClauses。表を持たない文書は noTables に理由を宣言（検査 7・14）。要綱の条は編の中で連番であることを検査 4 が見る（折り返しの `第\n86 号）` を条に取り違えた実例）。
- **地方版の大冊子 8 文書も outline で章に**（2026-10-19・東北 参考資料 66 章・近畿 必携 115 章・九州 施工管理の手引き 30・北陸 必携 8・四国 マニュアル 14・北海道 付録 16・関東 マニュアル 16・国交省 施工管理基準 30＝計 24 文書 837 章）。版面の実測は Workflow（文書ごとに Writer→QA・sonnet・材料は親がスクリプトで作った各ページの先頭末尾行と見出し候補）、親が解析で rejects・review・未割当 0 を確認。冊子の項目は編に `item`（総目次の番号）を持たせ、editionCanonical の item と結んで項目の章だけ noindex。手引き・様式集は条を読まない（`articleStyle: none`・本文が共通仕様書の条番号 `1-1-1-3` を引く）、項の連番も見ない。様式集の章は見出しが無いのが原本どおり（検査 5 は outline の文書で見出しなしを許す）。**東北の参考資料の公衆災害防止対策要綱は平成5年の旧版**。
- **同じ要綱を複数機関・版で収録 → `editionCanonical`**（`src/lib/standards-editions.mjs`・12 群）。原本が別 PDF なので SHA では拾えない。版（年月）を原本の表紙・告示で確かめ、新しい 1 本だけ索引・他は noindex, follow と「同じ要綱を掲載しています」の案内。同じ版ならその要綱だけの文書を優先。近畿の必携は item（総目次の番号）で指す。
- 地方版 61 文書のページ画像（4,480p）も Drive に生成済み（mlit/sekou-kanri-kijun は原本 PDF 未配置）。全文ライブラリの文字化けは 2026-10-19 に 4 文書 154p を直した（下）。

## 全文ライブラリの文字化け（DN-0767・2026-10-19 完了）
- PDF のフォントの文字対応（ToUnicode）が壊れたページは、どの抽出器でも制御文字（U+0000〜001F）や無関係な文字の範囲（ู ᵝ Ũ 㻝）になる。U+FFFD は出ないので replacementCharacters 0 をすり抜けていた。**判定は「紙面に出る文字の範囲」の外の割合**（scripts/lib/standards-mojibake.mjs）。Latin-1 の割合で数えると目次の点線 U+00B7 と数式の上線・添字を誤判定する（初回の 51p 見積もりは誤り。実数は関東マニュアル 109・東北参考資料 34・沖縄必携10 10・四国 1）
- 起こし直しは **macOS Vision の OCR（scripts/lib/vision-ocr.swift）を下書きに Writer が画像で 1 行ずつ直し、別の QA が照合**。OCR との 2-gram 一致の低いページは理由を注記。QA が直したのは全角/半角（様式の「年月日:」の半角コロン・半角読点「､」）、旧字形（攪）、図の中の繰り返しラベルの数、看板の小さな URL。正本は content/sources/standards/{機関}/{文書}/visual-review.json、`npm run standards-library-mojibake -- apply` が分冊と catalog のハッシュを書く。検査 `check-standards-library`（ci）
- 国交省の施工管理基準の 6 分冊は catalog のハッシュが実体と違っていた（作成時の値のまま）。apply で実体に合わせた

