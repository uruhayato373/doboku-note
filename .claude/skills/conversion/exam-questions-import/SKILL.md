---
name: exam-questions-import
description: >
  過去問集 PDF を MDX 形式に変換する統合スキル。`--exam` フラグで試験・検定別テンプレートを切替え、
  問題番号・選択肢・解説・正解の構造を自動化する。旧 /exam-questions-import / /exam-questions-2-import を統合。
  Use when user asks to [過去問インポート, 問題集変換, 過去問取込, /exam-questions-import].
---

過去問集 PDF を構造化された MDX に変換する統合スキル。

## 引数

```
/exam-questions-import --exam {civil-primary|civil-secondary|pe-primary} --year <year> [--sub {a|b}] [--pages N-M] [--mode add-answers]
```

| 引数 | 必須 | 説明 |
|---|---|---|
| `--exam` | 必須 | 試験・検定を指定。template 切替に使用 |
| `--year` | 必須 | 年度（例: `r07` / `r02` / `h30`） |
| `--sub` | 条件付 | 問題 A/B の指定（civil-primary のみ） |
| `--pages` | 任意 | PDF ページ範囲（省略時は template で自動推定） |
| `--mode add-answers` | 任意 | 既存 MDX の未解答設問に解答・解説を追加（旧 `/add-exam-answers` 吸収） |

## 利用可能テンプレート

| exam | 対応試験 | 形式 | テンプレート |
|---|---|---|---|
| `civil-primary` | 1級土木施工管理 第1次検定 | 4 択選択式 | `templates/civil-primary.md` |
| `civil-secondary` | 1級土木施工管理 第2次検定 | 記述式 | `templates/civil-secondary.md` |
| `pe-primary` | 技術士総合技術監理 第1次試験 | 5 択選択式 | `templates/pe-primary.md` |

新試験を追加する場合は `templates/{exam-id}.md` を新規作成のみ。

## 共通フロー

### Step 1: ソース PDF 特定

- `--exam` と `--year` からテンプレートの `source` 定義を読み込み、PDF パスを解決
- `--pages` 省略時は template の `page_ranges` 表から自動推定

### Step 2: OCR 品質判定

PDF のテキスト品質を確認:
- **良好**: PyMuPDF テキスト抽出でそのまま変換
- **不良**: `pdftoppm -png -r 150` で画像化 → Read ツールで画像から直接変換

### Step 3: 問題構造の抽出

template で定義された問題フォーマットに従って抽出:
- 問題文
- 選択肢（`(1)` / `(2)` / `(3)` / `(4)` / `(5)`）
- 解説・正答

### Step 4: MDX 生成

テンプレートの MDX 構造に従って生成。共通要素:

- **見出し**: 設問番号は H2（`## 問題 No.N` or `## Ⅰ-N-M`）
- **frontmatter**: `toc_max_heading_level: 2` 必須
- **解答は details**: `<details><summary>解答・解説</summary>...</details>`
- **関連キーワード**: `<RelatedKeywords items={[...]} />`（keyword ページと双方向リンク）
- **試験対策ポイント**: `<ExamPoint>` （過去問側は簡潔に）

### Step 5: add-answers モード（旧 `/add-exam-answers`）

既存 MDX の未解答設問に正答 PDF 準拠の解答・解説を追加:

1. 対象 MDX を Read、`**正解: ?**` や空の `<details>` を検出
2. 正答 PDF の該当問題を確認
3. 解説を既存フォーマットに合わせて追記
4. 正答バッジ `❌` / `✅` を選択肢解説に付与

### Step 6: 品質検証

```bash
/check-mdx {path} --rules syntax
```

ビルドエラーがなければ完了。

## 使い方の例

```bash
# 1級土木 令和7年度 問題A
/exam-questions-import --exam civil-primary --year r07 --sub a

# 1級土木 令和6年度 第2次（記述式）
/exam-questions-import --exam civil-secondary --year r06

# 技術士総監 令和7年度 第1次
/exam-questions-import --exam pe-primary --year r07

# 既存 MDX に解答を追加（旧 /add-exam-answers）
/exam-questions-import --exam civil-primary --year r06 --sub a --mode add-answers
```

## 旧スキルからの移行

| 旧コマンド | 新コマンド |
|---|---|
| `/exam-questions-import r2a` | `/exam-questions-import --exam civil-primary --year r02 --sub a` |
| `/exam-questions-2-import ch2` | `/exam-questions-import --exam civil-secondary --year r06`（章単位 → 年度単位に変更） |
| `/add-exam-answers <mdx>` | `/exam-questions-import --exam {...} --year {...} --mode add-answers` |

## 関連スキル・エージェント

| 連携先 | 役割 |
|---|---|
| `/pdf-to-mdx --exam {general\|cem\|civil-construction-1}` | 教科書・論文の PDF→MDX（過去問以外） |
| `/improve-article --mode verify` | 変換後の QA 照合（civil-primary → content-qa、pe-primary → content-qa） |
| `/check-mdx --rules syntax` | 構文チェック（post_hook） |
| `/exam-backlinks` | 過去問⇔キーワード双方向リンクの整備 |

## 参照

- `.claude/skills/conversion/exam-questions-import/templates/` — 試験別テンプレート
- `.claude/reference/exam-content-policy.md` — 試験別コンテンツ整備方針
- `.claude/content-principles.md` — コンテンツ原則
