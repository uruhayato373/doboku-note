---
name: pe-first-stage-audit
description: >
  技術士第一次試験（pe-first-stage）全21ページの原典視覚突合・正答照合・構造検査を実施し
  `.claude/state/pe-first-stage-audit/` に監査記録を書き出す品質監査スキル。
  Use when user asks to [pe-first-stage監査, 技術士第一次試験QA, /audit-pe-first-stage].
---

## 概要

技術士第一次試験（R01〜R07 × 適性科目・基礎科目・専門科目（建設部門））の全21ページを
3軸で監査する品質ゲートスキル。

## 引数

```
/audit-pe-first-stage [--year R01|R02|…|R07|all] [--sub aptitude|basic|construction|all]
```

| 引数 | 既定 | 説明 |
|---|---|---|
| `--year` | `all` | 対象年度（単年指定で絞り込み） |
| `--sub` | `all` | 対象科目（aptitude/basic/construction） |

## ソースファイル

| ファイル | 用途 |
|---|---|
| `docs/textbook/技術士第一次試験/{R##}/{R##}-正答.pdf` | 正答番号表（テキスト抽出可） |
| `docs/textbook/技術士第一次試験/{R##}/{R##}-適性.pdf` | 適性科目問題（画像ベース） |
| `docs/textbook/技術士第一次試験/{R##}/{R##}-基礎.pdf` | 基礎科目問題（画像ベース） |
| `docs/textbook/技術士第一次試験/{R##}/{R##}-建設.pdf` | 専門科目(建設)問題（画像ベース） |
| `.local/r2/posts/pe-first-stage/{year}-{sub}/article.mdx` | 監査対象 MDX |

## 3軸監査仕様

### 軸1: 正答照合（Answer Check）

1. `{R##}-正答.pdf` から PyMuPDF でテキスト抽出
2. 科目別に正答マップを構築:
   - 基礎: `Ⅰ－{群}-{n}` → 正答番号
   - 適性: `Ⅱ－{n}` → 正答番号
   - 専門（建設部門）: 「９．建設部門」セクション → `Ⅲ－{n}` → 正答番号
3. MDX 内の `**正答：{X}**` をすべて抽出
4. 1問ずつ照合し、不一致を `mismatches` リストに記録

**正答PDFの特記事項（※付き問題）:**
- 全員正解（`※`）の問題は mismatch 判定対象外として記録

### 軸2: 原典視覚突合（Visual Check）

1. `{R##}-{科目}.pdf` を PyMuPDF で 200dpi PNG 化 → `.tmp/pe-audit/{year}/{sub}/` に一時保存
2. 各ページ PNG を Read で読み込み、対応する MDX 設問と突合:
   - 問題番号（Ⅱ-1, Ⅰ-1-1, Ⅲ-1 等）の一致
   - 問題文の先頭30〜50文字の一致（OCR誤字・捏造検出）
   - 選択肢数（適性・基礎=5択 / 専門=5択）の一致
   - 問いの極性（「最も適切」/「最も不適切」/「誤っているもの」等）の一致
3. 不一致・疑義を `visual_issues` に記録

### 軸3: 構造検査（Structure Check）

MDX 本文を静的解析:

- `<ExamPoint` タグ数 ＝ 設問数（適性15・基礎30・専門35）か確認
- `<details>` タグ数 ＝ 設問数か確認
- frontmatter 必須フィールド（title/category/group/published/source_pdf）の存在
- 設問見出し（`## Ⅱ-`、`## Ⅰ-`、`## Ⅲ-`）の連番欠落確認

## 記録フォーマット

```
.claude/state/pe-first-stage-audit/
  summary.json          # 全体サマリ（最終実行結果）
  {year}-{sub}.json     # ページ単位の詳細記録（例: r07-aptitude.json）
```

### summary.json スキーマ

```json
{
  "schema_version": "1.0",
  "last_run": "ISO8601",
  "scope": { "years": ["R01",...], "subs": ["aptitude",...] },
  "totals": {
    "pages": 21,
    "answer_ok": 0, "answer_fail": 0,
    "visual_ok": 0, "visual_issues": 0,
    "structure_ok": 0, "structure_fail": 0
  },
  "pages": {
    "r07-aptitude": { "status": "pass|fail|partial", "audited_at": "ISO8601" }
  }
}
```

### {year}-{sub}.json スキーマ

```json
{
  "slug": "pe-first-stage-r07-aptitude",
  "year": "R07", "sub": "aptitude",
  "audited_at": "ISO8601",
  "answer_check": {
    "status": "pass|fail",
    "verified_count": 15,
    "mismatches": [
      { "question": "Ⅱ-5", "mdx_answer": 3, "official_answer": 1, "note": "" }
    ]
  },
  "visual_check": {
    "status": "pass|fail|partial",
    "checked_count": 15,
    "issues": [
      { "question": "Ⅱ-3", "type": "text_mismatch|missing_question|polarity_error", "detail": "" }
    ]
  },
  "structure_check": {
    "status": "pass|fail",
    "exam_point_count": 15,
    "expected_count": 15,
    "details_count": 15,
    "frontmatter_ok": true,
    "missing_questions": [],
    "notes": ""
  }
}
```

## 実装手順（Workflow で実行）

```
Phase A: 正答抽出     — 7年度分 正答.pdf を並列テキスト抽出
Phase B: 監査実行     — 21ページを pipeline (正答照合→視覚突合→構造検査)
Phase C: 記録書き出し — JSON 記録 + docs/handoffs/ に Markdown レポート
```

## 使い方

```bash
/audit-pe-first-stage                          # 全21ページ
/audit-pe-first-stage --year R07               # R07 3科目のみ
/audit-pe-first-stage --year R07 --sub aptitude  # 1ページのみ
```

## 連携

- PDF 画像化: PyMuPDF（`python -X utf8 -c "import fitz..."` via Bash）
- 一時画像: `.tmp/pe-audit/{year}/{sub}/pNNN.png`（コミット不要）
- 記録コミット: `git add .claude/state/pe-first-stage-audit/ && git commit`

## 参照

- `docs/reference/exam-content-policy.md` — pe-first-stage の整備方針
- `.claude/skills/conversion/exam-questions-import/templates/pe-first-stage.md` — インポート仕様
- `docs/textbook/技術士第一次試験/` — ソース PDF
