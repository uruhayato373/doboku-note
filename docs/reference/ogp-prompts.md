---
title: OGP デザインリファレンス
---

# OGP デザインリファレンス

doboku-note のサイト OGP / note カバー共通テンプレ T06 Mono Tag の **デザイン真実源（SSOT）**。
OGP デザインはここで継続的に検討・改善する。レイアウト・配色・フォント・テーマ色・変更履歴をこのファイルに記録し、実装（`ogp-templates.mjs`）と常に一致させる。コマンド・引数・トラブルシューティングなど運用面は [`ogp-create` SKILL.md](../../.claude/skills/conversion/ogp-create/SKILL.md) を参照。

- **OGP サイズ**: 1200×630（doboku-note サイト用）
- **note カバーサイズ**: 1280×670（note 公開用ドラフト用、同テンプレを再利用）
- **テンプレ実装**: `.claude/skills/conversion/ogp-create/scripts/lib/ogp-templates.mjs` の `renderMonoTag` が真実源
- **CSS のみで完結**（背景画像不要）。Midjourney などの外部ツールは使わない

## 採用テンプレ: T06 Mono Tag（mono-tag・サイト OGP）

| 観点 | 仕様 |
|---|---|
| 出典 | Claude Design (claude.ai/design) handoff `Doboku Note OGP Handoff.zip` 内 `T06_MonoTag` |
| 出典時期 | 2026-04-29（全幅リデザインは 2026-06-16、下記「変更履歴」参照） |
| 用途 | 全サイト OGP・`cover:` ブロックの無い note カバー（mono-tag フォールバック） |
| レイアウト | **全幅**（左右 72px パディング）。上下 110px / 80px パディング。ワードマーク→カテゴリチップ→タイトル（縦中央寄せ）を左寄せ縦積み |
| 配色 | warm off-white 背景 `#fdfcf8` / 濃紺 `#0f1e3f` / 紺アクセント `#1e3a8a` / シアン `#06b6d4` / 本文 `#0a1428` |
| テーマ色外枠 | 16px の実線外枠を**資格別テーマ色**で描く（下記「テーマ色」参照）。余白感の解消＋分野の一目識別 |
| フォント | Noto Sans JP Bold（タイトル・最大 76px）+ Inter Bold（ワードマーク） |
| 主要要素 | `doboku-note` ワードマーク（タグラインなし）/ カテゴリチップ（紺背景＋シアン ▶）/ メインタイトル（縦中央寄せ） |
| 装飾要素 | 薄い濃紺グリッド全面（30px fine + 120px major）/ 左上シアンバー（80×4）/ 右下紺バー（80×4）|

## デザインの原則（mono-tag）

1. **共通言語**: doboku-note サイト（1200×630）と note カバー（1280×670）が一目で同シリーズと分かる
2. **全幅・低余白**: タイトルを全幅で大きく描き余白を圧縮する。外部リンクカード（note / X / Slack）の小さなサムネでも読める可読性を最優先（参考: socialplus / commune の大文字・低余白カード）
3. **分野の一目識別**: 16px の外枠を資格別テーマ色にし、サムネ一覧でも分野が色で判別できる
4. **装飾は全幅 OK**: グリッドとアクセントバーは外周まで延びる。意味のある情報は枠内 72px パディング内に置く
5. **左寄せ・縦中央**: 主要要素は左端基準で縦に積み、タイトルブロックを縦方向中央に寄せて読み物感を担保

> [!note] セーフティゾーン（中央 630×630）は mono-tag では 2026-06-16 に撤廃した。中央 1:1 クロップ耐性が必要な **note-cover-g2** は引き続き中央セーフ幅 590px を厳守する（別系統・下記参照）。

## テーマ色（資格別外枠）

外枠の色は資格区分から自動解決する。**値の真実源は [`docs/design-system/note-cover-tokens.json`](../design-system/note-cover-tokens.json) の `exams[].base`**（note カバーと共通。色の二重管理をしない）。

| カテゴリ（frontmatter `category`） | exam key | テーマ色 |
|---|---|---|
| `pe-comprehensive-management` | `pe-comprehensive` | `#16365C`（濃紺） |
| `pe-first-stage` | `pe-comprehensive` | `#16365C`（濃紺・総監に合わせる） |
| `civil-construction-1` | `civil-1` | `#1E73C8`（青） |
| `civil-construction-2` | `civil-2` | `#2A7050`（緑） |
| `concrete-chief-engineer` | `concrete-chief` | `#0F6E6E`（ティール） |
| `concrete-diagnostician` | `concrete-diagnosis` | `#6E3A8C`（紫） |
| `pe-construction` | `pe-construction` | `#33356B`（藍） |
| 未マッピング | — | フォールバック `#0f1e3f`（既定ネイビー） |

マッピングは `ogp-create.mjs` の `CATEGORY_TO_EXAM_KEY` と `resolveAccentColor()`。新カテゴリを追加したら **この表・`CATEGORY_TO_EXAM_KEY`・`note-cover-tokens.json` の 3 点**を更新する。

## フォントサイズと改行

- `pickFontSize` は `fontSizeTable: [76, 68, 60, 54, 48, 42]`（`.claude/config/ogp/text.json`）を上から試し、**全行が `safetyWidth: 1010px` に収まる最大サイズ**を選ぶ。上限 76px。
- タイトル改行は 4 層戦略（`frontmatter.ogp.title` の `\n` → 記号直前 → スペース分割 → BudouX → `charCountFallback: 13` 字）。詳細は SKILL.md「4 層の日本語改行戦略」。
- 長いタイトルで font が小さくなる・改行が崩れる場合は `frontmatter.ogp.title` に短い OGP 専用見出し（`\n` 改行可）を与えると大きく出る。

## QA: 全 OGP をギャラリーで確認

一括再生成後の目視チェックは **OGP ギャラリー**で行う（`--debug-safety` は中央 630×630 赤枠を重ねる旧クロップ検証用で、全幅化した mono-tag では枠を超えるのが正常なため目視には使わない）。

```bash
npm run ogp -- --all --force   # 全 ogp.png を再生成
npm run ogp-gallery -- --open  # .tmp/ogp-gallery.html を生成しブラウザで開く（カテゴリ別フィルタ付き）
```

`scripts/ogp-gallery.mjs` が `.local/r2/posts/**/ogp.png` を走査し、1 枚の HTML グリッドに一覧化する。長タイトルのはみ出し・改行崩れ・テーマ色枠・余白をまとめて確認できる。

## 派生テンプレ: magazine-banner（note マガジンヘッダー対応）

| 観点 | 仕様 |
|---|---|
| 出典 | T06 Mono Tag からの派生（2026-05-20） |
| 用途 | note 有料マガジンのカバー（`generate-magazine-covers.mjs` 専用）。記事 OGP・記事カバーには使わない |
| 背景 | note のマガジン/クリエイターページのヘッダーは画像中央の **1280×216 帯** がクロップ表示される。専用レイアウトでヘッダー帯にマガジン名を収める |
| レイアウト | 画面を 3 ゾーンに分割。上ゾーン＝ワードマーク＋カテゴリチップ、**中央帯（1280×216）＝マガジン名を縦横中央**、下ゾーン＝シアンアクセント＋ドメイン。全要素を全幅中央寄せ |
| 実装 | `ogp-templates.mjs` の `renderMagazineBanner`（`HEADER_BAND_HEIGHT = 216`） |

## 派生テンプレ: note-cover-g2（note 記事カバー・試験色分け）

| 観点 | 仕様 |
|---|---|
| 出典 | Claude Design (claude.ai/design) handoff `noteカバー画像-handoff.zip` 内 `covers-g2-all.jsx`（G2 案）を satori へ移植（2026-05-29） |
| 用途 | note 記事/マガジン記事のカバー（`generate-note-covers.mjs`、`cover:` ブロックがある記事）。サイト OGP には mono-tag を使う |
| 二軸カラー | **試験区分=ベース色**（1級土木=青 `#1E73C8` / 2級土木=緑 `#2A7050` / 総監=濃紺 `#16365C` / 共通=ブロンズ `#9A6B1E`）、**系列=濃淡**（notePricing paid→deep / free→base、`cover.tone` で上書き可） |
| レイアウト | 紙面背景（グラデ＋グリッド＋同心円）／左上ロゴ・右上メタ／リード文→強調キーワード(HiBox)→**全幅バナー帯**→アイコンチップ3つ |
| クロップ耐性 | mono-tag と異なり**中央 630×630 セーフ幅(590px)を厳守**（note フィードの 1:1 クロップ対策）。バナー帯テキストは 590px に自動フィット |
| 真実源 | `docs/design-system/note-cover-tokens.json`（値）/ `docs/design-system/note-cover.md`（仕様） |
| 実装 | `ogp-templates.mjs` の `renderNoteCoverG2` |

## 変更履歴

| 日付 | 変更 | 理由 |
|---|---|---|
| 2026-04-29 | 旧 5 種テンプレ（navy-white / dark-wood / red-line / blackboard / dark-grid）を T06 Mono Tag に統一 | SNS シェアのブランド一貫性＋メンテ単純化 |
| 2026-05-20 | magazine-banner 派生を追加 | note マガジンヘッダー帯（1280×216）クロップ対応 |
| 2026-05-29 | note-cover-g2 派生を追加（note 記事カバーを試験色分け） | note フィード・リンクカードで試験区分を色で識別 |
| 2026-06-16 | **mono-tag 全幅リデザイン**: セーフゾーン(630)撤廃→全幅、最大フォント 54→76px、資格別テーマ色 16px 外枠を追加、下部メタ「READ ON doboku-note.com」とワードマークのタグラインを撤去、タイトルを縦中央寄せ。`text.json` を v5 に更新（`safetyWidth` 590→1010、`fontSizeTable` 引き上げ、`charCountFallback` 18→13）。確認用に OGP ギャラリー（`npm run ogp-gallery`）を新設 | 外部リンクカードでの可読性・分野識別性の向上（参考: socialplus / commune の大文字・低余白カード） |

## 旧 5 種テンプレ（撤去済み・履歴）

背景画像 (`assets/fonts/ogp-backgrounds/dark-wood.png` `blackboard.png` 等) は履歴として残置するが、現運用では参照されない。カテゴリ別出し分けが将来再び必要になったら `.claude/config/ogp/rules.json` の `rules[]` を復活させる。

## テンプレ追加の手順（将来）

1. このファイル（出典・用途・変更履歴）に追記
2. `.claude/config/ogp/templates.json`（レジストリ）に ID を追加
3. `.claude/skills/conversion/ogp-create/scripts/lib/ogp-templates.mjs` の `renderers` に `render{XYZ}` を追加（`(props, { width, height }) => element` シグネチャ）
4. 必要なら `.claude/config/ogp/rules.json` にルール追加
5. 背景画像が必要なら `.claude/skills/conversion/ogp-create/assets/fonts/ogp-backgrounds/{id}.png` に配置
6. `npm run ogp-gallery` で一覧目視検証（mono-tag は全幅。中央クロップ耐性が要るテンプレのみ別途セーフ幅を検証）
