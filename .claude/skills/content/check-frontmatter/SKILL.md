---
name: check-frontmatter
description: >
  MDX frontmatter の構造と内容を zod + lint ルールで検証する。
  HIGH/MEDIUM/LOW の 3 段階レポートで欠落・不整合・allowlist 外タグを報告する。
  Use when user asks to [frontmatter チェック, /check-frontmatter, メタデータ監査, 公開準備チェック].
user-invocable: true
---

`.claude/scripts/lint-frontmatter.mjs` を呼び出すオーケストレータスキル。MDX の frontmatter を構造面（zod）と内容面（独自ルール）の両方で検証する。

## なぜこのスキルがあるのか

`pre-commit-mdx.mjs` の zod 検証は **構造的な欠陥**（必須フィールド欠落、enum 値不正）しか捕まえない。description 長さ不足・publishedAt 欠落・未来日 publishedAt・allowlist 外タグのような **内容面の品質** は別のレイヤーが必要で、このスキルがそこを担う。

設計上は `/check-frontmatter` は薄いラッパーで、実ロジックは `.claude/scripts/lint-frontmatter.mjs` にある。スキルは CLI の呼び出し方をユーザーに隠蔽するだけ。

## 引数

```
/check-frontmatter <file or dir>
/check-frontmatter --all                # .local/r2/posts 全 746 件
/check-frontmatter --stdin              # staged files (pre-commit 相当)
/check-frontmatter --json <target>      # JSON で出力
```

## 検査項目

| 重大度 | コード | 内容 |
|---|---|---|
| **HIGH** | `zod` | zod スキーマ違反（必須フィールド欠落、enum 値不正など） |
| **HIGH** | `parse` | frontmatter の YAML パース失敗 |
| **MEDIUM** | `desc-short` | description が 50 文字未満 |
| **MEDIUM** | `publishedAt-missing` | `published` が true なのに `publishedAt` が未設定 |
| **MEDIUM** | `publishedAt-range` | `publishedAt` の年が 2020-2030 の範囲外 |
| **MEDIUM** | `publishedAt-future` | `publishedAt` が未来日（8 日以上先） |
| **LOW** | `desc-long` | description が 200 文字を超える |
| **LOW** | `tags-empty` | `tags` が空 |
| **LOW** | `tags-unknown` | `src/config/tags.json` allowlist に無いタグ |
| **LOW** | `sections-missing` | `exams` が複数要素なのに `sections` 未設定 |
| **LOW** | `sections-incomplete` | `sections` に未登録の exam がある |

**HIGH は `pre-commit-mdx.mjs` がブロック**。MEDIUM/LOW は警告表示のみで、コミットは通る。

## 実行手順

### Step 1: 対象解釈

- 引数が単一ファイル or ディレクトリ → `expandTargets` が再帰的に展開
- `--all` → `.local/r2/posts/` 全体
- `--stdin` → `git diff --cached` のステージ済み MDX

### Step 2: スクリプト実行

```bash
node .claude/scripts/lint-frontmatter.mjs <target>
```

成功/失敗は exit code で判定:
- `0`: HIGH ゼロ（成功）
- `1`: HIGH あり（pre-commit 相当の基準でブロック要）
- `2`: 引数エラー

### Step 3: 結果整形

スクリプトは `=== file ===` の形でファイル単位にまとめて出力する。JSON 出力は `--json` を付与。

### Step 4: 修正提案（優先度順）

HIGH → MEDIUM → LOW の順でユーザーに提示し、以下の修正方針を示す:

- **`zod`**: 該当 enum の候補を `.claude/scripts/lib/frontmatter-schema.mjs` から抽出して示す
- **`desc-short`**: 本文から要約材料を拾い、50-160 文字の description 案を提案
- **`publishedAt-missing`**: 近接の作成日 (`date`) や git log から推定日を提案
- **`tags-unknown`**: 類似する allowlist タグを Levenshtein 距離で示す（`src/config/tag-dictionary.json` の `typo_candidates` を参照）

修正の実行はユーザ判断。スキル自体はレポートのみ（Evaluator 専任、Generator 機能なし）。

## 使い方の例

```bash
# 単一ファイル
/check-frontmatter .local/r2/posts/civil-construction-1/guide/concrete-key-points.mdx

# ディレクトリ単位
/check-frontmatter .local/r2/posts/civil-construction-1/

# 全件監査（定期運用）
/check-frontmatter --all

# pre-commit 相当
/check-frontmatter --stdin

# CI 向け JSON
/check-frontmatter --json --all > /tmp/frontmatter-audit.json
```

## 関連スキル・コンポーネント

| 連携先 | 役割 |
|---|---|
| **`/review`** | `dev/review/SKILL.md` のディスパッチ表で MDX 編集検出時に呼び出す |
| **`/check-mdx`** | MDX 構文検証（内容の検証）、`/check-frontmatter` は frontmatter 専任 |
| **`scripts/pre-commit-mdx.mjs`** | HIGH 違反を commit 時にブロック（内部的に同じ検証ロジックを使用） |
| **`.claude/scripts/lib/frontmatter-schema.mjs`** | zod スキーマ実体 |
| **`scripts/build-tag-index.mjs`** | `tag-dictionary.json` を生成し、`tags-unknown` 検出の参考に |
| **`src/config/tags.json`** | タグ allowlist（手動メンテ） |

## 担当外

- **修正の実行**: レポートのみ。Generator 的な rewrite は担わない
- **本文の品質評価**: `cem-qa` / `civil-construction-qa` / `content-qa` の担当
- **MDX 構文検証**: `check-mdx` の担当
- **モバイル視認性**: `review-mobile` の担当

## 参照

- `docs/project/17_data-storage-strategy.md` §5.4 ── pre-commit validation の方針
- `.claude/scripts/lint-frontmatter.mjs` ── 本スキルの実体
- `.claude/scripts/lib/frontmatter-schema.mjs` ── zod スキーマ
- `src/config/tags.json` ── タグ allowlist
- `src/config/tag-dictionary.json` ── 実使用タグ集計（`build-tag-index.mjs` 出力）
