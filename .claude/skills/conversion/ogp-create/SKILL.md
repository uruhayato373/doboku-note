---
name: ogp-create
description: >
  doboku-note サイト OGP 画像（1200×630 PNG）を生成する。共通テンプレ T06 Mono Tag に統一済み。
  セーフティゾーン対応（中央 630×630 に収める）・4 層の日本語改行戦略。同じテンプレ実装は note カバー（1280×670）でも `scripts/generate-note-covers.mjs` 経由で再利用される。
  Use when user asks to [OGP作成, OGP生成, サムネ作成, /ogp-create].
---

## 用途

MDX ページの OGP 画像（1200×630 PNG）を、共通テンプレ T06 Mono Tag で自動生成する。
新規記事公開時・タイトル変更時・テンプレ差し替え時に使う。

note 公開用ドラフト（`docs/note/`）のカバー画像（1280×670）も同じテンプレロジックを共有するため、両者で見た目が完全一致する。

## 引数

| 引数 | 必須 | 説明 | 例 |
|---|---|---|---|
| slug | — | フル slug（`{category}-{localSlug}`）。省略時は `--all` が必要 | `pe-comprehensive-management-mbo` |
| `--all` | — | 全ページを対象にする | |
| `--force` | — | 既存の `ogp.png` があっても上書き | |
| `--dry-run` | — | マッピング結果のみ表示、ファイル生成しない | |
| `--template <id>` | — | テンプレを強制指定（現状 `mono-tag` のみ） | `--template mono-tag` |
| `--debug-safety` | — | 中央 630×630 のセーフティゾーン赤枠を画像に重ねて出力 | |
| `--debug-wrap` | — | 改行結果とフォントサイズを stdout に一覧（ファイル生成なし） | |

## テンプレート

| ID | 用途 | デザイン |
|---|---|---|
| `mono-tag` | 全ページ共通（T06） | warm off-white 背景 + 薄い濃紺グリッド + シアン/紺アクセントバー + Navy カテゴリチップ + 大タイトル + 下部メタ |

過去 Phase で 5 種テンプレ（navy-white / dark-wood / red-line / blackboard / dark-grid）を併用していたが、2026-04-29 に T06 Mono Tag に統一（理由: SNS シェアでブランド一貫性を担保 + メンテ単純化）。旧テンプレの背景画像 (`assets/fonts/ogp-backgrounds/*.png`) は履歴として残置しているが現在は参照されない。

## セーフティゾーンとは

OGP 画像は `1200×630`（1.91:1）で配信するが、一部プラットフォーム（note モバイル・Slack・Discord 等）は中央を 1:1 にクロップして表示する。そのため **中央 630×630 の正方形**に「欠けてはいけない情報」（タイトル・カテゴリチップ・ワードマーク・メタ）を全て収める必要がある。

本スキルは `safetyWidth: 590px`（`.claude/config/ogp/text.json`）に基づいてタイトルと要素を配置する。装飾要素（アクセントバー・グリッド）はセーフティゾーン外まで伸びてよい（クロップされても問題ない）。

note カバー（1280×670）も同じ「中央 630×630」を厳守。横幅が広い分、左右の装飾余白が増えるだけで主コンテンツ位置は同じ。

**目視検証**:

```bash
node .claude/skills/conversion/ogp-create/scripts/ogp-create.mjs <slug> --debug-safety --force
```

生成 PNG に中央 630×630 の赤枠が重なった状態で出力される。本番では `--debug-safety` を外して再生成する。

## 4 層の日本語改行戦略

タイトルは以下の優先度で改行される:

| Layer | 戦略 | 説明 |
|---|---|---|
| 1 | `frontmatter.ogp.title` の `\n` | 明示改行を最優先で尊重 |
| 2a | 記号直前改行 | `（` `：` `〜` `──` 等の直前で分割、マーカーは次行先頭に残す |
| 2b | 区切り文字分割 | 半角・全角スペースで分割、スペース自体は破棄 |
| 3 | BudouX（初期無効） | `text.json` で `budouX.enabled: true` + `npm i budoux` で有効化 |
| 4 | 文字数フォールバック | `charCountFallback: 18` 字ごとに機械的に折り返し |

`--debug-wrap` で各ページの実際の改行結果を確認できる:

```bash
node .claude/skills/conversion/ogp-create/scripts/ogp-create.mjs pe-comprehensive-management-mbo --debug-wrap
# → lines: ["目標管理制度", "（MBO）"] / fontSize 54 / template mono-tag
```

## フォントサイズの決定ロジック

`pickFontSize` は `text.json` の `fontSizeTable`（`[54, 48, 42, 38, 34, 30]`）を上から試し、**全ての行が `safetyWidth=590` に収まる最大サイズ**を選ぶ。T06 Mono Tag のデザイン上限は 54px。

- 全幅日本語 1 文字 ≈ `fontSize × 1.0` 幅
- 半角英数記号 1 文字 ≈ `fontSize × 0.58` 幅

で実効幅を近似（Noto Sans JP Bold の経験値）。

## 実行手順

### ケース1: 単一ページの OGP 生成

```bash
node .claude/skills/conversion/ogp-create/scripts/ogp-create.mjs pe-comprehensive-management-mbo
```

既存 `ogp.png` があればスキップ。強制上書きは `--force`。

### ケース2: 全ページ生成

```bash
node .claude/skills/conversion/ogp-create/scripts/ogp-create.mjs --all          # 未生成分のみ
node .claude/skills/conversion/ogp-create/scripts/ogp-create.mjs --all --force  # 全て再生成
```

### ケース3: マッピング確認（ファイル生成なし）

```bash
node .claude/skills/conversion/ogp-create/scripts/ogp-create.mjs --all --dry-run
```

### ケース4: タイトル改行のチューニング

```bash
node .claude/skills/conversion/ogp-create/scripts/ogp-create.mjs pe-comprehensive-management-management-tradeoffs --debug-wrap
node .claude/skills/conversion/ogp-create/scripts/ogp-create.mjs --all --debug-wrap | less
```

気に入らないページは `frontmatter.ogp.title` で上書きする（下記参照）。

## frontmatter でのオーバーライド

```yaml
---
title: "総合技術監理における5管理間トレードオフ 頻出パターンと解決フレーム"
category: "pe-comprehensive-management"
ogp:
  title: "5管理間\nトレードオフ分析"  # 自動改行より優先（\n で明示改行）
---
```

手動で作成した OGP を保護したい場合は:

```yaml
ogp:
  skip: true   # このページは生成スキップ
```

## テンプレート追加手順（将来テンプレを増やす場合）

1. `.claude/skills/conversion/ogp-create/scripts/lib/ogp-templates.mjs` の `renderers` に新しい render 関数を追加（`renderTemplate(id, props, { width, height })` のシグネチャに従う）
2. `.claude/config/ogp/templates.json` にテンプレ定義を追加（ID・説明）
3. `docs/reference/ogp-prompts.md` に出典プロンプトと用途を記録
4. `.claude/config/ogp/rules.json` の `default` または `rules[]` で出し分けルールを追加
5. `--template <新ID> --dry-run` で動作確認

## 出力先

`.local/r2/posts/{category}/{localSlug}/ogp.png`

`src/lib/r2-image-loader.ts` の `getOgpImageUrl` が返す URL と 1:1 対応する。
本番配信は `https://storage.doboku-note.com/posts/{category}/{localSlug}/ogp.png`。

## note カバー（兄弟スクリプト）

`scripts/generate-note-covers.mjs` が同じ `renderTemplate('mono-tag', ..., { width: 1280, height: 670 })` を呼び出して `docs/note/{slug}/img/cover.png` を出力する。テンプレロジックは本スキルが真実源。

```bash
node scripts/generate-note-covers.mjs            # 全 note 記事
node scripts/generate-note-covers.mjs 総監       # slug 前方一致で対象を絞る
node scripts/generate-note-covers.mjs 総監 --debug-safety
```

## 事前条件

- `.claude/skills/conversion/ogp-create/assets/fonts/NotoSansJP-Bold.ttf` と `Inter-Bold.ttf` が配置済みであること
- `satori` `sharp` `gray-matter` が依存関係に含まれていること（既存済み）

## トラブルシューティング

| 症状 | 対応 |
|---|---|
| `未知のカテゴリ` エラー | `src/config/categories.json` にカテゴリを追加、または frontmatter の `category` を修正 |
| タイトルがセーフティゾーンからはみ出す | `--debug-safety` で確認。`text.json` の `fontSizeTable` を小さめに調整 |
| 長タイトルで単語が途中で破断 | `frontmatter.ogp.title` で `\n` を使い明示改行、または BudouX を有効化（`text.json` + `npm i budoux`） |
| ルールが効かない | `--dry-run` で実際の解決結果を確認 |

## 参照

- リファレンス: `docs/reference/ogp-prompts.md`（採用プロンプト出典）
- テンプレ定義: `.claude/config/ogp/templates.json`
- ルール: `.claude/config/ogp/rules.json`
- 改行・フォント設定: `.claude/config/ogp/text.json`
- レンダラ: `.claude/skills/conversion/ogp-create/scripts/lib/ogp-templates.mjs`（T06 Mono Tag 実装の真実源）
- 改行・フォント計算: `.claude/skills/conversion/ogp-create/scripts/lib/ogp-text.mjs`
- エントリポイント: `.claude/skills/conversion/ogp-create/scripts/ogp-create.mjs`
- note カバー: `scripts/generate-note-covers.mjs`（同テンプレを 1280×670 で再利用）
