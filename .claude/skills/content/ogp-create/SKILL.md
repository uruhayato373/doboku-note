---
name: ogp-create
description: >
  カテゴリ別テンプレートで OGP 画像を生成する。ルールベースで自動選定、frontmatter で個別上書き可。
  Use when user asks to [OGP作成, OGP生成, サムネ作成, /ogp-create].
---

## 用途

MDX ページの OGP 画像（1200×630 PNG）を、カテゴリ・タグに応じたテンプレートで自動生成する。
5 種類のテンプレートが定義されており、`src/config/ogp-rules.json` のルールで自動選定される。
新規記事公開時・タイトル変更時・テンプレ差し替え時に使う。

## 引数

| 引数 | 必須 | 説明 | 例 |
|---|---|---|---|
| slug | — | フル slug（`{category}-{localSlug}`）。省略時は `--all` が必要 | `pe-comprehensive-management-mbo` |
| `--all` | — | 全ページを対象にする | |
| `--force` | — | 既存の `ogp.png` があっても上書き | |
| `--dry-run` | — | マッピング結果のみ表示、ファイル生成しない | |
| `--template <id>` | — | ルールを無視してテンプレを強制指定 | `--template navy-white` |

## テンプレート一覧

| ID | 用途 | 背景画像 |
|---|---|---|
| `navy-white` | 汎用・既定（迷ったらこれ） | 不要 |
| `dark-wood` | 信頼性系（guide/textbook） | `scripts/fonts/ogp-backgrounds/dark-wood.png`（任意） |
| `red-line` | 体系・構造系（過去問解説等） | 不要 |
| `blackboard` | 教育・解説系 | `scripts/fonts/ogp-backgrounds/blackboard.png`（任意） |
| `dark-grid` | 分析・データ系（過去問・統計） | 不要 |

背景画像が未配置の場合はダーク単色にフォールバックするため、5 テンプレ全て即使用可能。

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

## frontmatter でのオーバーライド

ルールで決まるテンプレを特定ページで上書きしたい場合は、MDX の frontmatter に以下を追加:

```yaml
---
title: "..."
category: "pe-comprehensive-management"
ogp:
  template: dark-wood   # ルールより優先
---
```

手動で作成した OGP を保護したい場合は:

```yaml
ogp:
  skip: true   # このページは生成スキップ
```

## ルールの変更

`src/config/ogp-rules.json` を編集する。ルールは上から評価し、最初に match したものが採用される。

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
2. `src/config/ogp-templates.json` にテンプレ定義を追加（ID・説明・背景画像の要否）
3. `.claude/reference/ogp-prompts.md` に出典プロンプトと用途を記録
4. 必要なら `src/config/ogp-rules.json` にルールを追加
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
| タイトルが切れる | タイトル短縮、または `scripts/lib/ogp-templates.mjs` の `titleFontSize` 閾値を調整 |
| 背景画像が反映されない | `scripts/fonts/ogp-backgrounds/{id}.png` が存在するか確認、`--force` で強制上書き |
| ルールが効かない | `--dry-run` で実際の解決結果を確認。ルールは上から評価・最初に match したものが採用 |

## 参照

- リファレンス: `.claude/reference/ogp-prompts.md`（採用プロンプト出典）
- テンプレ定義: `src/config/ogp-templates.json`
- ルール: `src/config/ogp-rules.json`
- レンダラ: `scripts/lib/ogp-templates.mjs`
- エントリポイント: `scripts/ogp-create.mjs`
