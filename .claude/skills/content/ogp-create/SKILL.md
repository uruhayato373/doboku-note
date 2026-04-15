---
name: ogp-create
description: >
  カテゴリ別テンプレートで OGP 画像を生成する。ルールベースで自動選定、frontmatter で個別上書き可。
  セーフティゾーン対応済み（中央 630×630 に収める）・4 層の日本語改行戦略。
  Use when user asks to [OGP作成, OGP生成, サムネ作成, /ogp-create].
---

## 用途

MDX ページの OGP 画像（1200×630 PNG）を、カテゴリ・タグに応じたテンプレートで自動生成する。
5 種類のテンプレートが定義されており、`.claude/config/ogp/rules.json` のルールで自動選定される。
新規記事公開時・タイトル変更時・テンプレ差し替え時に使う。

## 引数

| 引数 | 必須 | 説明 | 例 |
|---|---|---|---|
| slug | — | フル slug（`{category}-{localSlug}`）。省略時は `--all` が必要 | `pe-comprehensive-management-mbo` |
| `--all` | — | 全ページを対象にする | |
| `--force` | — | 既存の `ogp.png` があっても上書き | |
| `--dry-run` | — | マッピング結果のみ表示、ファイル生成しない | |
| `--template <id>` | — | ルールを無視してテンプレを強制指定 | `--template navy-white` |
| `--debug-safety` | — | 中央 630×630 のセーフティゾーン赤枠を画像に重ねて出力 | |
| `--debug-wrap` | — | 改行結果とフォントサイズを stdout に一覧（ファイル生成なし） | |

## テンプレート一覧

| ID | 用途 | 背景画像 |
|---|---|---|
| `navy-white` | 汎用・既定（迷ったらこれ） | 不要 |
| `dark-wood` | 信頼性系（guide/textbook） | `scripts/fonts/ogp-backgrounds/dark-wood.png`（任意） |
| `red-line` | 体系・構造系（過去問解説等） | 不要 |
| `blackboard` | 教育・解説系 | `scripts/fonts/ogp-backgrounds/blackboard.png`（任意） |
| `dark-grid` | 分析・データ系（過去問・統計） | 不要 |

背景画像が未配置の場合はダーク単色にフォールバックするため、5 テンプレ全て即使用可能。

## セーフティゾーンとは

OGP 画像は `1200×630`（1.91:1）で配信するが、一部プラットフォーム（note モバイル・Slack・Discord 等）は中央を 1:1 にクロップして表示する。そのため **中央 630×630 の正方形**に「欠けてはいけない情報」（タイトル・カテゴリラベル・サイト名）を全て収める必要がある。

本スキルは `safetyWidth: 560px`（`.claude/config/ogp/text.json`）に基づいてタイトルと要素を配置する。装飾要素（赤バー・グリッド・グラデーション）はセーフティゾーン外まで伸びてよい（クロップされても問題ない）。

**目視検証**:

```bash
node scripts/ogp-create.mjs <slug> --debug-safety --force
```

生成 PNG に中央 630×630 の赤枠が重なった状態で出力される。タイトル・サイト名・カテゴリラベルが赤枠の内側に収まっていることを確認する。本番では `--debug-safety` を外して再生成する。

## 4 層の日本語改行戦略

タイトルは以下の優先度で改行される:

| Layer | 戦略 | 説明 |
|---|---|---|
| 1 | `frontmatter.ogp.title` の `\n` | 明示改行を最優先で尊重 |
| 2a | 記号直前改行 | `（` `：` `〜` `──` 等の直前で分割、マーカーは次行先頭に残す |
| 2b | 区切り文字分割 | 半角・全角スペースで分割、スペース自体は破棄 |
| 3 | BudouX（初期無効） | `text.json` で `budouX.enabled: true` + `npm i budoux` で有効化 |
| 4 | 文字数フォールバック | `charCountFallback: 16` 字ごとに機械的に折り返し |

`--debug-wrap` で各ページの実際の改行結果を確認できる:

```bash
node scripts/ogp-create.mjs pe-comprehensive-management-mbo --debug-wrap
# → lines: ["目標管理制度", "（MBO）"] / fontSize 80 / template navy-white
```

**Layer 4 の限界**: 日本語で記号・空白を含まない長タイトルは、`トレードオフ` のような複合語が途中で破断することがある。該当するタイトルは `frontmatter.ogp.title` で明示的に上書きするか（escape hatch）、`text.json` の `budouX.enabled: true` + `npm i budoux` で BudouX を有効化する。

## フォントサイズの決定ロジック

`pickFontSize` は `text.json` の `fontSizeTable`（大きい順）を上から試し、**全ての行が `safetyWidth` に収まる最大サイズ**を選ぶ。

- 全幅日本語 1 文字 ≈ `fontSize × 1.0` 幅
- 半角英数記号 1 文字 ≈ `fontSize × 0.58` 幅

で実効幅を近似している（Noto Sans JP Bold の経験値）。テーブルを調整すれば挙動が変わるので、`.claude/config/ogp/text.json` を書き換えてから `--debug-wrap` で再検証するループを回す。

## 実行手順

### ケース1: 単一ページの OGP 生成

```bash
node scripts/ogp-create.mjs pe-comprehensive-management-mbo
```

既存 `ogp.png` があればスキップ。強制上書きは `--force`。

### ケース2: 全ページ生成

```bash
node scripts/ogp-create.mjs --all          # 未生成分のみ
node scripts/ogp-create.mjs --all --force  # 全て再生成
```

### ケース3: マッピング確認（ファイル生成なし）

```bash
node scripts/ogp-create.mjs --all --dry-run
```

各ページがどのテンプレに割り当てられるかを標準出力に一覧表示する。ルール変更後の動作確認に使う。

### ケース4: 特定テンプレで強制生成

```bash
node scripts/ogp-create.mjs pe-comprehensive-management-mbo --template dark-wood --force
```

### ケース5: タイトル改行のチューニング

```bash
# 1 枚で改行結果を確認
node scripts/ogp-create.mjs pe-comprehensive-management-management-tradeoffs --debug-wrap

# 全ページの改行結果を概観
node scripts/ogp-create.mjs --all --debug-wrap | less
```

気に入らないページは `frontmatter.ogp.title` で上書きする（下記参照）。

## frontmatter でのオーバーライド

ルールで決まるテンプレや自動改行を特定ページで上書きしたい場合:

```yaml
---
title: "総合技術監理における5管理間トレードオフ 頻出パターンと解決フレーム"
category: "pe-comprehensive-management"
ogp:
  template: dark-wood              # ルールより優先
  title: "5管理間\nトレードオフ分析"  # 自動改行より優先（\n で明示改行）
---
```

手動で作成した OGP を保護したい場合は:

```yaml
ogp:
  skip: true   # このページは生成スキップ
```

## ルールの変更

`.claude/config/ogp/rules.json` を編集する。ルールは上から評価し、最初に match したものが採用される。

```jsonc
{
  "default": "navy-white",
  "rules": [
    {
      "match": {
        "category": "civil-construction-1",
        "tags_any": ["past-questions"]
      },
      "template": "dark-grid"
    }
  ]
}
```

`match` で指定可能なキー:

- `category`: 完全一致
- `tags_any`: いずれかが含まれていれば match
- `tags_all`: 全て含まれていれば match

カテゴリ名やタグ体系が変わった場合は、このファイル 1 つを書き換えるだけで追従できる（スキルやスクリプト本体の変更不要）。

## テンプレート追加手順

1. `scripts/lib/ogp-templates.mjs` の `renderers` に新しい render 関数を追加
2. `.claude/config/ogp/templates.json` にテンプレ定義を追加（ID・説明・背景画像の要否）
3. `.claude/reference/ogp-prompts.md` に出典プロンプトと用途を記録
4. 必要なら `.claude/config/ogp/rules.json` にルールを追加
5. `--template <新ID> --dry-run` で動作確認

## 出力先

`.local/r2/posts/{category}/{localSlug}/ogp.png`

`src/lib/r2-image-loader.ts` の `getOgpImageUrl` が返す URL と 1:1 対応する。
本番配信は `https://storage.doboku-note.com/posts/{category}/{localSlug}/ogp.png`。

## 事前条件

- `scripts/fonts/NotoSansJP-Bold.ttf` と `scripts/fonts/Inter-Bold.ttf` が配置済みであること
- `satori` と `sharp` が依存関係に含まれていること（既存済み）

## トラブルシューティング

| 症状 | 対応 |
|---|---|
| `未知のカテゴリ` エラー | `src/config/categories.json` にカテゴリを追加、または frontmatter の `category` を修正 |
| タイトルがセーフティゾーンからはみ出す | `--debug-safety` で確認。`text.json` の `fontSizeTable` を小さめに調整 |
| 長タイトルで単語が途中で破断 | `frontmatter.ogp.title` で `\n` を使い明示改行、または BudouX を有効化（`text.json` + `npm i budoux`） |
| 背景画像が反映されない | `scripts/fonts/ogp-backgrounds/{id}.png` が存在するか確認、`--force` で強制上書き |
| ルールが効かない | `--dry-run` で実際の解決結果を確認。ルールは上から評価・最初に match したものが採用 |

## 参照

- リファレンス: `.claude/reference/ogp-prompts.md`（採用プロンプト出典）
- テンプレ定義: `.claude/config/ogp/templates.json`
- ルール: `.claude/config/ogp/rules.json`
- 改行・フォント設定: `.claude/config/ogp/text.json`
- レンダラ: `scripts/lib/ogp-templates.mjs`
- 改行・フォント計算: `scripts/lib/ogp-text.mjs`
- エントリポイント: `scripts/ogp-create.mjs`
