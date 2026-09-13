---
paths:
  - "**/img/**"
  - "content/**/*.svg"
  - "content/**/*.png"
  - "content/**/*.webp"
  - ".claude/config/asset-storage.json"
  - ".claude/config/drive-vault.json"
  - ".claude/state/assets/**"
  - ".github/workflows/r2-*.yml"
  - ".github/workflows/ogp-supply.yml"
---

# 画像・図版・アセット置き場の規約

## 置き場は「誰が使うか」で決める（CLAUDE.md §4）

- サイトが配信 → public R2（`storage.doboku-note.com`）／GitHub Actions が読み書き → private R2／人か手元のスクリプトだけ → Google Drive vault。迷ったら `/asset-route`。真実源 [asset-storage-policy.md](../knowledge/reference/asset-storage-policy.md) §1（各 group の行き先表・Drive vault の 4 フォルダ・端末初期設定・R2→Drive 移行の必須順序〔dry-run→commit→`--verify --cloud`→R2 削除→forget〕・退避後に壊れる読み手の直し方）
- なぜ: 2026-09-05、共通仕様書のページ画像 3.4GB を private R2 へ上げかけた
- 機械可読は R2 側 `.claude/config/asset-storage.json`（台帳 `manifest.json`）と Drive 側 `.claude/config/drive-vault.json`（台帳 `drive-manifest.json`）。退避 `npm run asset-offload`（既定 dry-run・`--commit`・`--verify`）、復元 `npm run asset-hydrate`、整合 `npm run check-asset-storage`、Drive 側 `npm run drive-vault-sync` / `npm run check-drive-vault`。Drive クライアント送信中はマウント読みが失敗するので、クラウド件数がローカルと一致してから同期する。詳細は [commands.md](../knowledge/reference/commands.md)
- リポジトリ肥大化の監査 `npm run audit-repo-assets`、生成物・著作権物・巨大 blob の新規追跡は `npm run check-git-binary-policy` が baseline ラチェットで止める。`git rm --cached` 後も実体は残るので、件数は追跡下で数える

## 画像追加

- `npm run generate-webp` → webp 参照で commit → R2 は `main` push 時に CI（`r2-sync.yml`）が自動同期（対象 path = `**/img/**`）。`ogp.png` は git 追跡せず develop push 時に CI（`ogp-supply.yml`）が自動生成して R2 へ供給、`ogp.webp` は未使用のため作らない

## 画像削除

- `r2-sync.yml` は**アップロードのみで削除しない**。リポジトリから消しても R2 には残り、URL 直叩きで取得できる状態が続く（2026-07-31 に診断士の書籍スキャン 79 件で発覚）。確実に撤去するには `.claude/config/r2-delete-list.txt` にキーを明示し、`R2 Delete Objects`（`r2-delete.yml`・workflow_dispatch・既定 dry-run）を `commit=true` で実行する。**自動 prune はしない**（R2 にしかない成果物を巻き込むため）。ローカルからは `npm run delete-r2-objects`

## OGP 画像

- develop へ push すれば CI（`ogp-supply.yml`）が欠落・陳腐化を検知して `ogp.png` を自動生成し R2 へ供給する（通常は手動作業不要）。`npm run ogp`（未生成のみ生成）はローカルプレビュー用。即時反映したい場合のみ生成後に `node scripts/asset-offload.mjs --group site-ogp-png --commit` を実行する。忘れて放置すると `og:image` が R2 で 404 のまま → note/X 等の外部リンクカードが生成されない（2026-06-12 pe-construction 全 114 本・手動運用時代の事故）。CI ゲート `npm run check-ogp-coverage`（`r2-audit.yml`）が published 記事の欠落を赤落ちで検知
- **OGP デザインの真実源は [ogp-prompts.md](../knowledge/reference/ogp-prompts.md)**（mono-tag 全幅＋資格別テーマ色外枠、2026-06-16〜）。一括再生成 `npm run ogp -- --all --force` 後の目視 QA は `npm run ogp-gallery`（全 OGP を 1 枚の HTML で確認）。タイトルの折返し行数は `npm run check-ogp-line-count`
- `generate-note-covers` / `ogp --all` は全ディレクトリを再生成する。自分の分だけ `git add` し、残りは `git restore` する

## 図版・写真のポリシー

- 図/写真を追加・置換するとき（図版種別判定フロー・CC/PD 写真ソース・出典表記・写真 SVG 化禁止） → [image-policy.md](../knowledge/reference/image-policy.md)。図の出所・品質の記録は `npm run audit-figures`
- サイト図版 `figure-*.svg` の固定キャンバス（feed 4:5 `400×500`／landscape 16:9 `640×360` `--wide`・概念名タイトル禁止・記事+SNS 両用） → [figure-canvas-policy.md](../knowledge/reference/figure-canvas-policy.md)。機械可読 `.claude/config/figure-canvas.json`、ガード `npm run check-figure-canvas`、整形 `svg-canvas-fitter`、SNS 書き出し `npm run render-figure-sns`
- SVG の色は `src/styles/globals.css` の `--color-*` が真実源 → [design-system.md](../knowledge/design-system/design-system.md)。過去問の問題図に解答情報を入れない。過去問データのグラフは SVG 化しない
- note 記事用 図解 → [note-svg-policy.md](../knowledge/reference/note-svg-policy.md)。hero/OGP/note カバー/カード/バナーの背景写真（wide/square の 2 マスター→クロップ展開） → [brand-image-system.md](../knowledge/reference/brand-image-system.md)
- SNS バイナリ（reels wav/mp4・Shorts mp4）の退避 → [sns-archive-policy.md](../knowledge/reference/sns-archive-policy.md)
- 公的基準の原本 PDF → 1 ページ 1 画像＋1 テキスト（`npm run build-standards-page-images` / `npm run check-standards-page-images`。原本の同定は sha256、実体は Google Drive vault、Git には manifest.json だけ）
- 孤児 `ogp.png/webp` は `check-orphan-ogp`（`--fix` で削除・r2-audit 週次）
