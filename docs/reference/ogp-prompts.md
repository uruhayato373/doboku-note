---
title: OGP プロンプトリファレンス
---

# OGP プロンプトリファレンス

doboku-note で採用する OGP / note カバー共通テンプレ T06 Mono Tag のデザイン出典と運用ルール。

- **OGP サイズ**: 1200×630（doboku-note サイト用）
- **note カバーサイズ**: 1280×670（note 公開用ドラフト用、同テンプレを再利用）
- **共通セーフティゾーン**: 中央 630×630。1:1 クロップされる note モバイル / Slack / Discord 等で表示が保証される領域
- **テンプレ実装**: `.claude/skills/conversion/ogp-create/scripts/lib/ogp-templates.mjs` の `renderMonoTag` が真実源
- **CSS のみで完結**（背景画像不要）。Midjourney などの外部ツールは使わない

## 採用テンプレ: T06 Mono Tag

| 観点 | 仕様 |
|---|---|
| 出典 | Claude Design (claude.ai/design) handoff `Doboku Note OGP Handoff.zip` 内 `T06_MonoTag` |
| 出典時期 | 2026-04-29 |
| 用途 | 全 OGP・全 note カバー（カテゴリ別出し分けなし） |
| 配色 | warm off-white 背景 `#fdfcf8` / 濃紺 `#0f1e3f` / 紺アクセント `#1e3a8a` / シアン `#06b6d4` / 副シアン `#22d3ee` / 本文 `#0a1428` |
| フォント | Noto Sans JP Bold（タイトル）+ Inter Bold（ワードマーク・メタ） |
| 主要要素 | doboku-note ワードマーク・タグライン / カテゴリチップ（紺背景＋シアン ▶）/ メインタイトル / 下部メタ「READ ON doboku-note.com」 |
| 装飾要素 | 薄い濃紺グリッド全面（30px fine + 120px major）/ 左上シアンバー（80×4）/ 右下紺バー（80×4）|

## デザインの原則

1. **共通言語**: doboku-note サイト（1200×630）と note カバー（1280×670）が一目で同シリーズと分かる
2. **正方形クロップ耐性**: 中央 630×630 内に主コンテンツを集約（タイトル・チップ・ワードマーク・メタ）
3. **装飾は全幅 OK**: グリッドとアクセントバーは外周まで延びる。クロップで欠けても問題なし
4. **左寄せ構図**: 主要要素は safety zone の左端基準で縦に積む。読み物感を担保

## 派生テンプレ: magazine-banner（note マガジンヘッダー対応）

| 観点 | 仕様 |
|---|---|
| 出典 | T06 Mono Tag からの派生（2026-05-20） |
| 用途 | note 有料マガジンのカバー（`generate-magazine-covers.mjs` 専用）。記事 OGP・記事カバーには使わない |
| 背景 | note のマガジン/クリエイターページのヘッダーは画像中央の **1280×216 帯** がクロップ表示される。mono-tag の中央 630×630 正方形前提では、ヘッダー帯にワードマーク等が収まらず主役が崩れるため分離 |
| レイアウト | 画面を 3 ゾーンに分割。上ゾーン＝ワードマーク＋カテゴリチップ、**中央帯（1280×216）＝マガジン名を縦横中央**、下ゾーン＝シアンアクセント＋ドメイン。全要素を全幅中央寄せ |
| クロップ耐性 | ヘッダー帯＝マガジン名のみ表示／マガジントップ・Twitter＝全体表示／doboku-note サイトの aspect-square カード＝中央寄せのため全要素が残る |
| 実装 | `ogp-templates.mjs` の `renderMagazineBanner`（`HEADER_BAND_HEIGHT = 216`） |

## 派生テンプレ: note-cover-g2（note 記事カバー・試験色分け）

| 観点 | 仕様 |
|---|---|
| 出典 | Claude Design (claude.ai/design) handoff `noteカバー画像-handoff.zip` 内 `covers-g2-all.jsx`（G2 案）を satori へ移植（2026-05-29） |
| 用途 | note 記事/マガジン記事のカバー（`generate-note-covers.mjs`、`cover:` ブロックがある記事）。サイト OGP には mono-tag を使う |
| 二軸カラー | **試験区分=ベース色**（1級土木=青 `#1E73C8` / 2級土木=緑 `#2A7050` / 総監=濃紺 `#16365C` / 共通=ブロンズ `#9A6B1E`）、**系列=濃淡**（notePricing paid→deep / free→base、`cover.tone` で上書き可） |
| レイアウト | 紙面背景（グラデ＋グリッド＋同心円）／左上ロゴ・右上メタ／リード文→強調キーワード(HiBox)→**全幅バナー帯**→アイコンチップ3つ |
| クロップ耐性 | バナー帯テキストは中央 630×630 セーフ幅(590px)に自動フィット。ロゴ・右上メタ・両端チップは正方形クロップで欠けて良い |
| 真実源 | `docs/design-system/note-cover-tokens.json`（値）/ `docs/design-system/note-cover.md`（仕様） |
| 実装 | `ogp-templates.mjs` の `renderNoteCoverG2` |

## 履歴: 旧 5 種テンプレ（撤去済み）

2026-04-23 〜 2026-04-29 まで以下 5 種を併用していた。背景画像 (`assets/fonts/ogp-backgrounds/dark-wood.png` `blackboard.png`) は履歴として残置するが、現運用では参照されない。

| 旧テンプレ ID | 旧用途 | 撤去理由 |
|---|---|---|
| `navy-white` | 汎用・既定 | T06 Mono Tag に統合 |
| `dark-wood` | 信頼性系（guide/textbook） | 同上 |
| `red-line` | 体系・構造系 | 同上 |
| `blackboard` | 教育・解説系 | 同上 |
| `dark-grid` | 分析・データ系 | 同上 |

カテゴリ別出し分けが将来再び必要になったら `.claude/config/ogp/rules.json` の `rules[]` を復活させる。テンプレ追加は `templates.json` + `ogp-templates.mjs` + 本ファイル の 3 点セットを更新する運用は維持。

## テンプレ追加の手順（将来）

1. このファイル（出典プロンプトと用途）に追記
2. `.claude/config/ogp/templates.json`（レジストリ）に ID を追加
3. `.claude/skills/conversion/ogp-create/scripts/lib/ogp-templates.mjs` の `renderers` に `render{XYZ}` を追加（`(props, { width, height }) => element` シグネチャ）
4. 必要なら `.claude/config/ogp/rules.json` にルール追加
5. 背景画像が必要なら `.claude/skills/conversion/ogp-create/assets/fonts/ogp-backgrounds/{id}.png` に配置
6. `--debug-safety` で中央 630×630 内に主要要素が収まることを目視検証
