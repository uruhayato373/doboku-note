# リポジトリ資産監査（DN-0111 Phase 0）

実行: 2026-08-29T01:30:50.748Z / branch `develop` / HEAD `7fed444fc7`

> [!warning]
> 3 つの容量は別の指標。**HEAD から消しても Git 履歴（pack）は減らない**。

## 1. 容量の 3 指標

| 指標 | 値 | 意味 |
| --- | --- | --- |
| ワークツリー | 11.61 GiB | 作業ディレクトリの実容量（追跡外含む・.git 除く） |
| HEAD 追跡 | 0.41 GiB / 9641 files | clone 直後に checkout される量。Phase 6 の削減目標対象 |
| Git 履歴 (pack) | 1.03 GiB | 過去 blob 込み。通常 commit では減らない（Phase 7 の別承認） |

garbage: 0 bytes / in-pack objects: 108,963

## 2. 分類サマリ

| 分類 | 容量 | 件数 |
| --- | ---: | ---: |
| **KEEP_GIT** | 219.6 MiB | 8715 |
| **REVIEW** | 195.4 MiB | 919 |
| **REGENERATE** | 0.3 MiB | 7 |

### KEEP_GIT — 219.6 MiB / 8715 files

- **`text-ssot`** — 111.5 MiB / 7109 files
  - 理由: 原稿・設定・コードの SSOT
- **`kindle-artifact`** — 57.3 MiB / 158 files
  - 理由: KDP 入稿成果物。scripts/kindle-dist/ 配下は R2 バックアップ済み（kindle-dist group・2026-08-29 決着）。kindle-published/・kindle-covers/ は cover-designs（P6 で repo-archive group へ退避済み）を除き未バックアップだが、いずれも git が正典で CI（check-kindle-format.mjs 等）が git 実体に依存するため untrack はしない
  - 再生成入力: content/kindle/books/**（要検証）
  - 生成器: `kindle-build`
  - 参照コード: `scripts/kdp-publish.mjs`
- **`site-image`** — 48.2 MiB / 926 files
  - 理由: 公開記事の図版・OGP。R2 へは CI が同期するが Git 側が原本。ただし巨大 blob は個別に REVIEW へ落とす
  - 参照コード: `MDX 本文 / og:image`
- **`site-figure-svg`** — 2.3 MiB / 521 files
  - 理由: 記事図版の編集可能ベクター。原本かつ通常は小さい（Base64 raster 混入は別途 FAIL 対象）
  - 参照コード: `MDX 本文`
- **`font`** — 0.3 MiB / 1 files
  - 理由: レンダリング必須のフォント実体（allowlist）
  - 参照コード: `satori / OGP 生成`

### REVIEW — 195.4 MiB / 919 files

- **`(unmatched)`** — 147.4 MiB / 907 files
  - 理由: どのルールにも当たらない。置き場の方針が未定義
- **`text-ssot`** — 21.9 MiB / 5 files
  - 理由: 原稿・設定・コードの SSOT
- **`kindle-artifact`** — 21 MiB / 6 files
  - 理由: KDP 入稿成果物。scripts/kindle-dist/ 配下は R2 バックアップ済み（kindle-dist group・2026-08-29 決着）。kindle-published/・kindle-covers/ は cover-designs（P6 で repo-archive group へ退避済み）を除き未バックアップだが、いずれも git が正典で CI（check-kindle-format.mjs 等）が git 実体に依存するため untrack はしない
  - 再生成入力: content/kindle/books/**（要検証）
  - 生成器: `kindle-build`
  - 参照コード: `scripts/kdp-publish.mjs`
- **`font`** — 5.1 MiB / 1 files
  - 理由: レンダリング必須のフォント実体（allowlist）
  - 参照コード: `satori / OGP 生成`

### REGENERATE — 0.3 MiB / 7 files

- **`ig-rendered-png`** — 0.3 MiB / 7 files
  - 理由: slide-data.json から決定論的に焼けるレンダー成果物。投稿済みパックは R2 archive、未投稿は再生成で足りる
  - 再生成入力: slide-data.json / script.json + caption.txt
  - 生成器: `.claude/scripts/sns/ 系レンダラ`
  - 参照コード: `publish-ig-bs（投稿時に読む）`

## 3. 拡張子別 TOP

| 拡張子 | 容量 | 件数 |
| --- | ---: | ---: |
| `.png` | 170.7 MiB | 930 |
| `.json` | 64.2 MiB | 1564 |
| `.jpg` | 41.2 MiB | 72 |
| `.epub` | 28.8 MiB | 46 |
| `.md` | 24.5 MiB | 1928 |
| `.mdx` | 18.5 MiB | 1168 |
| `.webp` | 18.4 MiB | 518 |
| `.zip` | 12.6 MiB | 4 |
| `.js` | 8.1 MiB | 17 |
| `.css` | 7.3 MiB | 26 |
| `.mjs` | 5.8 MiB | 691 |
| `.ttf` | 5.4 MiB | 2 |

## 4. ディレクトリ別 TOP

| ディレクトリ | 容量 | 件数 |
| --- | ---: | ---: |
| `content/note/1級・2級土木` | 69.1 MiB | 899 |
| `content/site/civil-construction-1` | 32.2 MiB | 899 |
| `.claude/state/metrics` | 31.5 MiB | 618 |
| `content/note/技術士総監` | 22.3 MiB | 758 |
| `scripts/kindle-covers/backgrounds` | 12.9 MiB | 7 |
| `public/images/civil-exam-prep` | 12.6 MiB | 9 |
| `content/site/pe-comprehensive-management` | 12.5 MiB | 1047 |
| `content/sns/x` | 11.7 MiB | 246 |
| `content/sns/_assets` | 11.1 MiB | 22 |
| `content/site/pe-construction` | 10.8 MiB | 185 |
| `.claude/config/ogp` | 7.7 MiB | 9 |
| `.claude/state/assets` | 7.3 MiB | 1 |
| `.obsidian/plugins/obisidian-note-linker` | 7.2 MiB | 3 |
| `scripts/kindle-dist/e-02.epub` | 6.7 MiB | 1 |
| `.obsidian/icons/font-awesome-regular.zip` | 6.2 MiB | 1 |

## 5. Base64 raster 入り SVG（真のベクターではない）

0 件 / 0 MiB


## 6. 整合チェック

- **同一 blob 重複**: 59 sha / checkout 余剰 71.5 MiB（pack 実体は 9.1 MiB）
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
| 7.3 MiB | REVIEW | `.claude/state/assets/manifest.json` |
| 7.2 MiB | REVIEW | `.obsidian/plugins/obisidian-note-linker/main.js` |
| 6.7 MiB | REVIEW | `scripts/kindle-dist/e-02.epub` |
| 6.2 MiB | REVIEW | `.obsidian/icons/font-awesome-regular.zip` |
| 6.2 MiB | REVIEW | `.obsidian/icons/font-awesome-solid.zip` |
| 5.1 MiB | REVIEW | `.claude/skills/conversion/ogp-create/assets/fonts/NotoSansJP-Bold.ttf` |
| 4.4 MiB | REVIEW | `scripts/kindle-dist/d-00.epub` |
| 3.1 MiB | REVIEW | `src/config/civil-1-exam-questions.json` |
| 3 MiB | REVIEW | `scripts/kindle-dist/e-01.epub` |
| 2.6 MiB | REVIEW | `scripts/kindle-dist/g-01.epub` |
| 2.3 MiB | REVIEW | `scripts/kindle-dist/d-01.epub` |
| 2.2 MiB | REVIEW | `.obsidian/themes/Catppuccin/theme.css` |
| 2.1 MiB | REVIEW | `public/quiz/civil-1.json` |
| 2 MiB | REVIEW | `scripts/kindle-covers/backgrounds/a-04.png` |
| 2 MiB | KEEP_GIT | `scripts/kindle-covers/backgrounds/a-03.png` |
| 1.9 MiB | REVIEW | `public/logo.png` |
| 1.9 MiB | KEEP_GIT | `scripts/kindle-covers/backgrounds/a-01.png` |
| 1.8 MiB | KEEP_GIT | `src/config/exam-questions.json` |
| 1.8 MiB | KEEP_GIT | `scripts/kindle-covers/backgrounds/a-00.png` |
| 1.8 MiB | KEEP_GIT | `scripts/kindle-covers/backgrounds/a-05.png` |
| 1.8 MiB | KEEP_GIT | `scripts/kindle-dist/b-heisei.epub` |
| 1.8 MiB | KEEP_GIT | `scripts/kindle-covers/backgrounds/a-02.png` |
| 1.7 MiB | KEEP_GIT | `scripts/kindle-covers/backgrounds/a-06.png` |
| 1.5 MiB | REVIEW | `public/images/civil-exam-prep/concrete-exam-viaduct-rebar-bg-right.png` |
| 1.5 MiB | REVIEW | `public/images/civil-exam-prep/civil-exam-teacher-mascot.png` |
