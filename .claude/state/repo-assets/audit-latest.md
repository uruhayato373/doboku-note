# リポジトリ資産監査（DN-0111 Phase 0）

実行: 2026-09-04T08:10:36.482Z / branch `develop` / HEAD `1a9c1368d5`

> [!warning]
> 3 つの容量は別の指標。**HEAD から消しても Git 履歴（pack）は減らない**。

## 1. 容量の 3 指標

| 指標 | 値 | 意味 |
| --- | --- | --- |
| ワークツリー | 5.27 GiB | 作業ディレクトリの実容量（追跡外含む・.git 除く） |
| HEAD 追跡 | 0.47 GiB / 10876 files | clone 直後に checkout される量。Phase 6 の削減目標対象 |
| Git 履歴 (pack) | 1.05 GiB | 過去 blob 込み。通常 commit では減らない（Phase 7 の別承認） |

garbage: 0 bytes / in-pack objects: 133,178

## 2. 分類サマリ

| 分類 | 容量 | 件数 |
| --- | ---: | ---: |
| **KEEP_GIT** | 391.1 MiB | 10336 |
| **REVIEW** | 89.6 MiB | 533 |
| **R2_PRIVATE** | 0.3 MiB | 7 |

### KEEP_GIT — 391.1 MiB / 10336 files

- **`text-ssot`** — 168.8 MiB / 8272 files
  - 理由: 原稿・設定・コードの SSOT
- **`note-image`** — 79.4 MiB / 334 files
  - 理由: 記事本文の図版（cover*.png はすでに note-cover-png ルールで先に一致するので、ここに来るのは figure-*.png 等の本文埋め込み画像のみ）。note アップロード時に本文中へ自動アップロードされる原本（lib/note-images.mjs）。R2 台帳の対象外で Git 側が唯一の実体
  - 参照コード: `note 本文中の画像参照（scripts/lib/note-images.mjs）`
- **`kindle-artifact`** — 57.3 MiB / 158 files
  - 理由: KDP 入稿成果物。scripts/kindle-dist/ 配下は R2 バックアップ済み（kindle-dist group・2026-08-29 決着）。kindle-published/・kindle-covers/ は cover-designs（P6 で repo-archive group へ退避済み）を除き未バックアップだが、いずれも git が正典で CI（check-kindle-format.mjs 等）が git 実体に依存するため untrack はしない
  - 再生成入力: content/kindle/books/**（要検証）
  - 生成器: `kindle-build`
  - 参照コード: `scripts/kdp-publish.mjs`
- **`site-image`** — 48.2 MiB / 926 files
  - 理由: 公開記事の図版・OGP。R2 へは CI が同期するが Git 側が原本。ただし巨大 blob は個別に REVIEW へ落とす
  - 参照コード: `MDX 本文 / og:image`
- **`public-static`** — 19.8 MiB / 50 files
  - 理由: サイトが直接配信する静的アセットの原本。R2 ではなく Next.js のビルド入力（git-binary-policy.json allowlist で既に判定済み）
  - 参照コード: `Next.js static assets`
- **`ogp-background`** — 9.2 MiB / 10 files
  - 理由: 資格別ブランド写真プール。note カバーとサイト OGP の再生成入力そのもので、これを外すと生成が不能になる（git-binary-policy.json allowlist で既に判定済み）
  - 参照コード: `scripts/generate-note-covers.mjs` / `scripts/generate-magazine-covers.mjs` / `scripts/coconala-thumb.mjs` / `.claude/skills/conversion/ogp-create`
- **`obsidian-env`** — 5.9 MiB / 64 files
  - 理由: Obsidian のプラグイン・アイコン素材。制作物ではなくエディタ環境で、全 PC 共有が要る（git-binary-policy.json allowlist で既に判定済み。DN-0154 で退避可否を別途検証中）
  - 参照コード: `Obsidian エディタ`
- **`site-figure-svg`** — 2.3 MiB / 521 files
  - 理由: 記事図版の編集可能ベクター。原本かつ通常は小さい（Base64 raster 混入は別途 FAIL 対象）
  - 参照コード: `MDX 本文`
- **`font`** — 0.3 MiB / 1 files
  - 理由: レンダリング必須のフォント実体（allowlist）
  - 参照コード: `satori / OGP 生成`

### REVIEW — 89.6 MiB / 533 files

- **`(unmatched)`** — 28.8 MiB / 519 files
  - 理由: どのルールにも当たらない。置き場の方針が未定義
- **`obsidian-env`** — 21.9 MiB / 4 files
  - 理由: Obsidian のプラグイン・アイコン素材。制作物ではなくエディタ環境で、全 PC 共有が要る（git-binary-policy.json allowlist で既に判定済み。DN-0154 で退避可否を別途検証中）
  - 参照コード: `Obsidian エディタ`
- **`kindle-artifact`** — 21 MiB / 6 files
  - 理由: KDP 入稿成果物。scripts/kindle-dist/ 配下は R2 バックアップ済み（kindle-dist group・2026-08-29 決着）。kindle-published/・kindle-covers/ は cover-designs（P6 で repo-archive group へ退避済み）を除き未バックアップだが、いずれも git が正典で CI（check-kindle-format.mjs 等）が git 実体に依存するため untrack はしない
  - 再生成入力: content/kindle/books/**（要検証）
  - 生成器: `kindle-build`
  - 参照コード: `scripts/kdp-publish.mjs`
- **`text-ssot`** — 10.9 MiB / 2 files
  - 理由: 原稿・設定・コードの SSOT
- **`font`** — 5.1 MiB / 1 files
  - 理由: レンダリング必須のフォント実体（allowlist）
  - 参照コード: `satori / OGP 生成`
- **`public-static`** — 2.1 MiB / 1 files
  - 理由: サイトが直接配信する静的アセットの原本。R2 ではなく Next.js のビルド入力（git-binary-policy.json allowlist で既に判定済み）
  - 参照コード: `Next.js static assets`

### R2_PRIVATE — 0.3 MiB / 7 files

- **`ig-rendered-png`** — 0.3 MiB / 7 files
  - 理由: slide-data.json から決定論的に焼けるレンダー成果物。asset-storage.json の ig-rendered-image group（byVisibility・visibilityFrom: igPackStatus）で既に大半が R2 へ退避済み（1,990 件・2026-08-29 時点）。投稿済みパックの status.json は R2_PUBLIC、未投稿・判定不能パックは private へ倒す（誤って公開バケットへ置かない）
  - 再生成入力: slide-data.json / script.json + caption.txt
  - 生成器: `.claude/scripts/sns/ 系レンダラ`
  - 参照コード: `publish-ig-bs（投稿時に読む）`

## 3. 拡張子別 TOP

| 拡張子 | 容量 | 件数 |
| --- | ---: | ---: |
| `.png` | 172.2 MiB | 931 |
| `.json` | 84.5 MiB | 1890 |
| `.md` | 67 MiB | 2722 |
| `.jpg` | 41.2 MiB | 72 |
| `.epub` | 28.8 MiB | 46 |
| `.mdx` | 19.3 MiB | 1214 |
| `.webp` | 18.4 MiB | 519 |
| `.zip` | 12.6 MiB | 4 |
| `.js` | 8.1 MiB | 17 |
| `.css` | 7.3 MiB | 26 |
| `.mjs` | 6.1 MiB | 720 |
| `.ttf` | 5.4 MiB | 2 |

## 4. ディレクトリ別 TOP

| ディレクトリ | 容量 | 件数 |
| --- | ---: | ---: |
| `content/note/1級・2級土木` | 69.2 MiB | 903 |
| `.claude/state/metrics` | 45.8 MiB | 655 |
| `content/site/civil-construction-1` | 32.6 MiB | 913 |
| `content/site/standards-library` | 29.9 MiB | 276 |
| `content/note/技術士総監` | 22.4 MiB | 764 |
| `content/site/standards-articles` | 15.5 MiB | 353 |
| `scripts/kindle-covers/backgrounds` | 12.9 MiB | 7 |
| `public/images/civil-exam-prep` | 12.6 MiB | 9 |
| `content/site/pe-comprehensive-management` | 12.5 MiB | 1047 |
| `content/sns/x` | 11.7 MiB | 246 |
| `content/sns/_assets` | 11.1 MiB | 22 |
| `content/site/pe-construction` | 10.8 MiB | 185 |
| `.claude/config/ogp` | 9.2 MiB | 10 |
| `.claude/state/assets` | 7.7 MiB | 1 |
| `.obsidian/plugins/obisidian-note-linker` | 7.2 MiB | 3 |

## 5. Base64 raster 入り SVG（真のベクターではない）

0 件 / 0 MiB


## 6. 整合チェック

- **同一 blob 重複**: 127 sha / checkout 余剰 83.6 MiB（pack 実体は 13.9 MiB）
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
| 7.7 MiB | REVIEW | `.claude/state/assets/manifest.json` |
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
| 1.9 MiB | KEEP_GIT | `public/logo.png` |
| 1.9 MiB | KEEP_GIT | `scripts/kindle-covers/backgrounds/a-01.png` |
| 1.8 MiB | KEEP_GIT | `src/config/exam-questions.json` |
| 1.8 MiB | KEEP_GIT | `scripts/kindle-covers/backgrounds/a-00.png` |
| 1.8 MiB | KEEP_GIT | `scripts/kindle-covers/backgrounds/a-05.png` |
| 1.8 MiB | KEEP_GIT | `scripts/kindle-dist/b-heisei.epub` |
| 1.8 MiB | KEEP_GIT | `scripts/kindle-covers/backgrounds/a-02.png` |
| 1.7 MiB | KEEP_GIT | `scripts/kindle-covers/backgrounds/a-06.png` |
| 1.5 MiB | KEEP_GIT | `public/images/civil-exam-prep/concrete-exam-viaduct-rebar-bg-right.png` |
| 1.5 MiB | KEEP_GIT | `public/images/civil-exam-prep/civil-exam-teacher-mascot.png` |
