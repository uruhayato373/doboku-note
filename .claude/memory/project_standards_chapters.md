---
name: project_standards_chapters
description: "公的基準(共通仕様書)を章記事化(8文書344章・canonical=近畿のみ索引)＋1ページ1画像+1テキストへ展開(5,949p・section+版面ページで一意)。E2Eはビルド成果物で回す"
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

**対象は 72 文書中 8 文書だけ。** 柱を持つのは共通仕様書 9 文書で、うち沖縄は中国と原本
SHA-256 が完全一致する重複なので生成しない。残り 63 文書（工事必携・地方版・北海道の
道路河川工事仕様書）は構造がまったく違う。除外理由は設定に書くだけでなく、
**柱の出現率や SHA 一致で実データ検証する検査**を持たせてある（ワイルドカードの抜け道を塞ぐ）。

**同一内容を 9 機関が公開しているので索引は 1 機関だけ**（既定は近畿・
`.claude/config/standards-structure.json` の `canonical.commonAgencyId`）。他機関の章は
`noindex, follow` で読める状態を保つ。sitemap に載るのは近畿の 43 章のみ。

**表は可逆に復元できるものだけ GFM**（166 件中 6 件）。落ちたものは版面を保った
コードブロック＋原本ページリンクで残し、理由コードを台帳に記録する。可逆性検査
（セル連結が元行と一致）と空セル禁止が無いと、列を静かに取り違える。

コマンド: `build-standard-articles` / `build-standards-ogp` / `check-standard-articles`（15 検査）。
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
