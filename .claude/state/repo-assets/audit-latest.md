# リポジトリ資産監査（DN-0111 Phase 0）

実行: 2026-08-21T11:13:51.382Z / branch `develop` / HEAD `47e4becf21`

> [!warning]
> 3 つの容量は別の指標。**HEAD から消しても Git 履歴（pack）は減らない**。

## 1. 容量の 3 指標

| 指標 | 値 | 意味 |
| --- | --- | --- |
| ワークツリー | 15.93 GiB | 作業ディレクトリの実容量（追跡外含む・.git 除く） |
| HEAD 追跡 | 2.9 GiB / 15983 files | clone 直後に checkout される量。Phase 6 の削減目標対象 |
| Git 履歴 (pack) | 12.53 GiB | 過去 blob 込み。通常 commit では減らない（Phase 7 の別承認） |

garbage: 172.41 KiB / in-pack objects: 322,730

## 2. 分類サマリ

| 分類 | 容量 | 件数 |
| --- | ---: | ---: |
| **R2_PRIVATE** | 892.8 MiB | 1504 |
| **KEEP_GIT** | 809.4 MiB | 10460 |
| **R2_PUBLIC** | 675.9 MiB | 777 |
| **REVIEW** | 353.5 MiB | 1245 |
| **REGENERATE** | 234.7 MiB | 1997 |

### R2_PRIVATE — 892.8 MiB / 1504 files

- **`textbook-page-image`** — 571.2 MiB / 868 files
  - 理由: 市販テキスト・白書のページ画像（著作権物）。公開 Git リポジトリに置くこと自体が textbook-pdf-archive.md の原則違反。原典 PDF は既に .gitignore 済みで、ページ画像だけが取り残されている
  - 再生成入力: 原典 PDF（private R2 の doboku-note-archive/textbook/）から再抽出
  - 生成器: `scripts/pdf-to-mdx 系`
  - 参照コード: `OCR / 図クロップ worker（書名単位 hydrate 前提）`
- **`note-pdf`** — 273 MiB / 586 files
  - 理由: note 添付・商品 PDF。「公開配布可 / 有料添付 / 原典・非公開」の再分類が要るため既定は private 側へ倒す（Phase 4-D で確定）
  - 再生成入力: magazine-to-pdf の spec + article.md
  - 生成器: `scripts/magazine-to-pdf.mjs`
  - 参照コード: `scripts/note-attach-file.mjs`
- **`note-cover-png`** — 48.7 MiB / 50 files
  - 理由: note へアップロード済みの成果物。frontmatter の cover 仕様が原本で再生成可能だが、ライブ差し替え時の同一性確認に実体が要るため R2 を正とする
  - 再生成入力: article*.md frontmatter の cover ブロック（generate-note-covers）
  - 生成器: `scripts/generate-note-covers.mjs`
  - 参照コード: `scripts/note-publish.mjs` / `scripts/note-update-cover.mjs`

### KEEP_GIT — 809.4 MiB / 10460 files

- **`site-image`** — 701.5 MiB / 3217 files
  - 理由: 公開記事の図版・OGP。R2 へは CI が同期するが Git 側が原本。ただし巨大 blob は個別に REVIEW へ落とす
  - 参照コード: `MDX 本文 / og:image`
- **`text-ssot`** — 105.3 MiB / 6805 files
  - 理由: 原稿・設定・コードの SSOT
- **`site-figure-svg`** — 1.9 MiB / 436 files
  - 理由: 記事図版の編集可能ベクター。原本かつ通常は小さい（Base64 raster 混入は別途 FAIL 対象）
  - 参照コード: `MDX 本文`
- **`font`** — 0.6 MiB / 2 files
  - 理由: レンダリング必須のフォント実体（allowlist）
  - 参照コード: `satori / OGP 生成`

### R2_PUBLIC — 675.9 MiB / 777 files

- **`note-cover-png`** — 675.9 MiB / 777 files
  - 理由: note へアップロード済みの成果物。frontmatter の cover 仕様が原本で再生成可能だが、ライブ差し替え時の同一性確認に実体が要るため R2 を正とする
  - 再生成入力: article*.md frontmatter の cover ブロック（generate-note-covers）
  - 生成器: `scripts/generate-note-covers.mjs`
  - 参照コード: `scripts/note-publish.mjs` / `scripts/note-update-cover.mjs`

### REVIEW — 353.5 MiB / 1245 files

- **`(unmatched)`** — 225.4 MiB / 1067 files
  - 理由: どのルールにも当たらない。置き場の方針が未定義
- **`kindle-artifact`** — 95.8 MiB / 170 files
  - 理由: KDP 入稿成果物。原稿 md からビルドできるはずだが、LIVE 済み書籍と同一性を保つ必要があるか未確認
  - 再生成入力: content/kindle/books/**（要検証）
  - 生成器: `kindle-build`
  - 参照コード: `scripts/kdp-publish.mjs`
- **`text-ssot`** — 22.1 MiB / 6 files
  - 理由: 原稿・設定・コードの SSOT
- **`font`** — 10.1 MiB / 2 files
  - 理由: レンダリング必須のフォント実体（allowlist）
  - 参照コード: `satori / OGP 生成`

### REGENERATE — 234.7 MiB / 1997 files

- **`ig-rendered-png`** — 234.7 MiB / 1997 files
  - 理由: slide-data.json から決定論的に焼けるレンダー成果物。投稿済みパックは R2 archive、未投稿は再生成で足りる
  - 再生成入力: slide-data.json / script.json + caption.txt
  - 生成器: `.claude/scripts/sns/ 系レンダラ`
  - 参照コード: `publish-ig-bs（投稿時に読む）`

## 3. 拡張子別 TOP

| 拡張子 | 容量 | 件数 |
| --- | ---: | ---: |
| `.png` | 2125 MiB | 5507 |
| `.jpg` | 311.9 MiB | 375 |
| `.pdf` | 284.2 MiB | 621 |
| `.webp` | 58.7 MiB | 1690 |
| `.json` | 54.9 MiB | 1321 |
| `.epub` | 31.6 MiB | 46 |
| `.md` | 29.3 MiB | 1987 |
| `.mdx` | 17.8 MiB | 1117 |
| `.zip` | 12.6 MiB | 4 |
| `.ttf` | 10.8 MiB | 4 |
| `.js` | 8.1 MiB | 21 |
| `.css` | 7.3 MiB | 26 |

## 4. ディレクトリ別 TOP

| ディレクトリ | 容量 | 件数 |
| --- | ---: | ---: |
| `content/sources/textbook` | 575.2 MiB | 947 |
| `content/site/pe-comprehensive-management` | 455.7 MiB | 2541 |
| `content/note/1級・2級土木` | 444.5 MiB | 1435 |
| `content/note/技術士総監` | 371.2 MiB | 1151 |
| `content/note/技術士建設部門` | 268.5 MiB | 962 |
| `content/sns/instagram` | 238 MiB | 2962 |
| `content/site/civil-construction-1` | 114.8 MiB | 1159 |
| `content/site/pe-construction` | 75.8 MiB | 445 |
| `content/note/コンクリート主任技士` | 37.1 MiB | 117 |
| `content/site/civil-construction-2` | 33.7 MiB | 261 |
| `.claude/config/coconala` | 28.3 MiB | 60 |
| `.claude/state/metrics` | 22.1 MiB | 555 |
| `content/site/pe-first-stage` | 16.8 MiB | 148 |
| `content/sns/_assets` | 15.9 MiB | 25 |
| `scripts/kindle-published/cover-designs` | 14.8 MiB | 8 |

## 5. Base64 raster 入り SVG（真のベクターではない）

0 件 / 0 MiB


## 6. 整合チェック

- **同一 blob 重複**: 192 sha / checkout 余剰 116.5 MiB（pack 実体は 35.7 MiB）
  - worktreeWaste は「checkout 時に余分に展開される容量」。pack 上は同一 blob が 1 個しか無いので、Git 履歴の削減見込みへ足さない。
- **追跡中なのに ignore 対象**: 8 件
  - `.claude/settings.local.json`
  - `content/sns/instagram/pe-construction/2026-06-10-hissu-kata/reels/img/00-cover.png`
  - `content/sns/instagram/pe-construction/2026-06-10-hissu-kata/reels/img/01-hook.png`
  - `content/sns/instagram/pe-construction/2026-06-10-hissu-kata/reels/img/02-step.png`
  - `content/sns/instagram/pe-construction/2026-06-10-hissu-kata/reels/img/03-step.png`
  - `content/sns/instagram/pe-construction/2026-06-10-hissu-kata/reels/img/04-step.png`
  - `content/sns/instagram/pe-construction/2026-06-10-hissu-kata/reels/img/05-summary.png`
  - `content/sns/instagram/pe-construction/2026-06-10-hissu-kata/reels/img/06-cta.png`
- **HEAD にあるが作業ツリーに実体なし**: 0 件

## 7. 上位 blob

| 容量 | 分類 | パス |
| ---: | --- | --- |
| 11.7 MiB | R2_PRIVATE | `content/note/1級・2級土木/1級土木/一次択一-過去問PDF/1級土木一次択一-過去問PDF.pdf` |
| 9.3 MiB | R2_PRIVATE | `content/note/技術士一次/一次択一-過去問PDF/技術士一次択一-過去問PDF.pdf` |
| 7.2 MiB | REVIEW | `.obsidian/plugins/obisidian-note-linker/main.js` |
| 6.8 MiB | R2_PRIVATE | `content/note/1級・2級土木/2級土木/一次択一-過去問PDF/2級土木一次択一-過去問PDF.pdf` |
| 6.7 MiB | REVIEW | `scripts/kindle-dist/e-02.epub` |
| 6.2 MiB | REVIEW | `.obsidian/icons/font-awesome-regular.zip` |
| 6.2 MiB | REVIEW | `.obsidian/icons/font-awesome-solid.zip` |
| 5.1 MiB | REVIEW | `.agents/skills/conversion/ogp-create/assets/fonts/NotoSansJP-Bold.ttf` |
| 5.1 MiB | REVIEW | `.claude/skills/conversion/ogp-create/assets/fonts/NotoSansJP-Bold.ttf` |
| 5 MiB | R2_PRIVATE | `content/sources/textbook/コンクリート主任技師2024/img/page090_fig1.png` |
| 4.9 MiB | R2_PRIVATE | `content/note/技術士総監/総監択一-過去問PDF-平成/総監択一-過去問PDF-平成.pdf` |
| 4.4 MiB | REVIEW | `scripts/kindle-dist/d-00.epub` |
| 3.8 MiB | R2_PRIVATE | `content/note/技術士総監/総監択一-過去問PDF-令和/総監択一-過去問PDF-令和.pdf` |
| 3.7 MiB | REVIEW | `.claude/state/ocr-audit/2026-04-24.json` |
| 3.7 MiB | REVIEW | `.claude/state/ocr-audit/2026-04-26.json` |
| 3.6 MiB | REVIEW | `scripts/kindle-dist/g-02.epub` |
| 3.1 MiB | REVIEW | `src/config/civil-1-exam-questions.json` |
| 3 MiB | REVIEW | `scripts/kindle-dist/e-01.epub` |
| 2.7 MiB | R2_PRIVATE | `content/sources/textbook/コンクリート主任技師2024/img/page091_fig1.png` |
| 2.7 MiB | R2_PRIVATE | `content/sources/textbook/１級土木施工管理技士/テキスト（土木一般編）/img/02-33.png` |
| 2.6 MiB | REVIEW | `scripts/kindle-dist/g-01.epub` |
| 2.5 MiB | R2_PRIVATE | `content/sources/textbook/コンクリート主任技師2024/img/page080_fig1.png` |
| 2.3 MiB | REVIEW | `scripts/kindle-dist/d-01.epub` |
| 2.2 MiB | R2_PRIVATE | `content/sources/textbook/コンクリート主任技師2022/img/page138_fig1.png` |
| 2.2 MiB | REVIEW | `.obsidian/themes/Catppuccin/theme.css` |

## 8. Git 履歴の path 帰属

到達可能 blob: 41,559 件 / pack 実体 6.69 GiB

> topPaths/topDirs は path 帰属の参考値。同一 blob が複数 path に現れるため単純合計は pack 実体を上回る。削減見込みは uniqueReachableDisk 側で読む。

> [!warning]
> **pack 実容量とユニーク容量の差を「回収可能な余剰」と読まないこと。**
> pack エントリ 322,730 / ユニーク 167,023（1.93 倍）。パック間で重複格納されている。**repack で掃除しても auto-gc が作り直すため戻る（2026-08-21 実証）。回収可能な余剰として計上しないこと。**
> 正しい直し方: HEAD を軽くした後に partial clone を作り直す（DN-0111 Phase 6）。git repack -a -d は到達可能 commit を落とす実績があるので使わない。

| ディレクトリ | pack 容量 | path 数 |
| --- | ---: | ---: |
| `docs/sns/instagram` | 806 MiB | 5529 |
| `docs/textbook/技術士（総監）` | 614.7 MiB | 98 |
| `.local/r2/posts` | 597.6 MiB | 3489 |
| `content/sources/textbook` | 560.7 MiB | 947 |
| `content/site/pe-comprehensive-management` | 446.8 MiB | 2532 |
| `content/note/1級・2級土木` | 359.7 MiB | 1486 |
| `content/note/技術士総監` | 313 MiB | 1358 |
| `_backup/general/design-manual` | 254.6 MiB | 1475 |
| `docs/textbook/技術士（建設部門）` | 248.6 MiB | 100 |
| `docs/textbook/コンクリート診断士` | 237.2 MiB | 10 |
| `content/note/技術士建設部門` | 203 MiB | 1200 |
| `content/sns/instagram` | 199 MiB | 2688 |
| `docs/textbook/１級土木施工管理技士` | 185.6 MiB | 37 |
| `docs/textbook/コンクリート主任技師2022` | 172.9 MiB | 14 |
| `docs/textbook/技術士論文の書き方` | 142.3 MiB | 6 |
