---
name: pe-first-stage-audit
description: >
  技術士第一次試験（pe-first-stage）全21ページの原典視覚突合・正答照合・構造検査を実施し
  `.Codex/state/pe-first-stage-audit/` に監査記録を書き出す品質監査スキル。
  Use when user asks to [pe-first-stage監査, 技術士第一次試験QA, /audit-pe-first-stage].
---

## 概要

技術士第一次試験（R01〜R07 × 適性科目・基礎科目・専門科目（建設部門））の全21ページを
3軸で監査する品質ゲートスキル。監査後は発見した誤記を修正し、再監査するサイクルを繰り返す。

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

1. `{R##}-{科目}.pdf` を PyMuPDF で **150dpi** PNG 化 → `.tmp/pe-audit/{year}/{sub}/` に一時保存
   - **year ディレクトリ名は小文字**: `r01`, `r02`, … `r07`（R01 等の大文字は不可）
   - `.tmp/` は `.local/r2/` と同じ作業ルートからの相対パス（`$CLAUDE_PROJECT_DIR/.tmp/pe-audit/` 相当）
2. 各ページ PNG を **Read ツール（絶対パス）** で読み込み: `$CLAUDE_PROJECT_DIR/.tmp/pe-audit/{year}/{sub}/pNNN.png`
   - **`C:\tmp\pe-audit\...` のような絶対 Windows パス直書きは誤り**（過去の再監査ワークフローで複数エージェントがこの誤りを起こした）
   - 相対パス `.tmp/pe-audit/...` はスクリプト内での生成用。Read ツールには常に絶対パス（`$CLAUDE_PROJECT_DIR` 展開後）を渡す
   - **実在確認**: `ls "$CLAUDE_PROJECT_DIR/.tmp/pe-audit/{year}/{sub}/" | head -5` で PNG 存在を確認してから突合開始（Mac/Windows 両対応・絶対 Windows パス直書きは L56 のとおり誤り）
   - 対応する MDX 設問と突合:
   - 問題番号（Ⅱ-1, Ⅰ-1-1, Ⅲ-1 等）の一致
   - 問題文の先頭30〜50文字の一致（OCR誤字・捏造検出）
   - 選択肢数（適性・基礎=5択 / 専門=5択）の一致
   - 問いの極性（「最も適切」/「最も不適切」/「誤っているもの」等）の一致
   - `<ArticleImage>` の有無（PDF に図があれば MDX にも必要）
3. 不一致・疑義を `visual_issues` に記録

### 軸3: 構造検査（Structure Check）

MDX 本文を静的解析:

- `<ExamPoint` タグ数 ＝ 設問数（適性15・基礎30・専門35）か確認
- `<details>` タグ数 ＝ 設問数か確認
- frontmatter 必須フィールド（title/category/group/published/source_pdf）の存在
- 設問見出し（`## Ⅱ-`、`## Ⅰ-`、`## Ⅲ-`）の連番欠落確認

## 監査後の修正フロー

監査で発見した問題は以下のサイクルで修正する:

```
Phase 1: 監査実行    — /audit-pe-first-stage で全ページを走査
Phase 2: 分類        — answer_fail（正答誤り）と visual_fail（テキスト誤記）を分離
Phase 3: 修正実行    — 以下のルールで Workflow 並列修正
Phase 4: コミット    — ファイルごとに個別コミット + refresh-indexes
Phase 5: 再監査      — 修正箇所のみ /audit-pe-first-stage --year X で確認
```

### 修正時の重要ルール

1. **writeMdxFile 必須**: MDX の書き込みは必ず `import { writeMdxFile } from './.Codex/scripts/lib/mdx-io.mjs'` 経由。Python `write_text()` は CRLF を混入するので禁止
2. **LF 正規化**: `readFileSync` 後に `content.replace(/\r\n/g, '\n')` を適用
3. **課題上限**: 並列 fix エージェントに渡す課題は **1エージェントあたり最大5件**。超えると一部がスキップされる
4. **PNG 参照**: fix エージェントは `.tmp/pe-audit/{year}/{sub}/pNNN.png` を Read ツールで参照してから修正すること（先入観で修正しない）
5. **git commit**: `git add` は修正したファイルのみ明示指定（`git add -A` 禁止）

## 記録フォーマット

```
.Codex/state/pe-first-stage-audit/
  summary.json          # 全体サマリ（最終実行結果）
  {year}-{sub}.json     # ページ単位の詳細記録（例: r07-aptitude.json）
```

### summary.json スキーマ (v2.0)

```json
{
  "schema_version": "2.0",
  "last_run": "ISO8601",
  "scope": { "years": ["R01",...], "subs": ["aptitude",...] },
  "totals": {
    "pages": 21,
    "answer_pass": 0, "answer_fail": 0,
    "visual_ok": 0, "visual_issues": 0, "visual_not_run": 0,
    "visual_pass": 0, "visual_partial": 0, "visual_fail": 0,
    "structure_pass": 0, "structure_fail": 0
  },
  "answer_fail_detail": [
    { "slug": "r07-aptitude", "question": "Ⅱ-10", "mdx": "2", "official": "3", "note": "" }
  ],
  "fix_log": {
    "answer_fixes_applied": [
      { "slug": "r07-aptitude", "question": "Ⅱ-10", "old": "2", "new": "3", "commit": "abc1234" }
    ],
    "visual_fixes_applied": [
      { "slug": "r07-aptitude", "count": 5, "commit": "abc5678" }
    ],
    "note": "修正サマリのフリーテキスト"
  },
  "pages": {
    "r07-aptitude": {
      "status": "pass|fail|partial",
      "answer_check": "pass|fail",
      "visual_check": "pass|fail|partial|not_run",
      "structure_check": "pass|fail",
      "audited_at": "ISO8601",
      "notes": ""
    }
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
      { "question": "Ⅱ-5", "mdx_answer": "3", "official_answer": "1", "note": "" }
    ]
  },
  "visual_check": {
    "status": "pass|fail|partial|not_run",
    "checked_count": 15,
    "issues": [
      { "question": "Ⅱ-3", "type": "text_mismatch|missing_question|polarity_error|missing_figure", "detail": "" }
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

## 既知の注意事項

- **r06-basic の PNG**: 過去セッションで `.tmp/pe-audit/r06/basic/` へのレンダリングが行われなかった場合は、監査前に PyMuPDF で再生成すること
- **○×組合せ表**: 適性科目の組合せ表（ア/イ/ウ/エ × 選択肢1〜5）はテキスト抽出が困難。必ず PNG 視覚確認を行う
- **極性（最も適切/不適切）**: 問題文の極性ミスは解説ラベル（✅/❌）の整合性チェックも必須

## 連携

- PDF 画像化: PyMuPDF（`python -X utf8 -c "import fitz..."` via Bash）、150dpi
- 一時画像: `.tmp/pe-audit/{year}/{sub}/pNNN.png`（コミット不要）
- 記録コミット: `git add .Codex/state/pe-first-stage-audit/ && git commit`
- インデックス: MDX 修正後は必ず `npm run refresh-indexes` を実行してからコミット

## 参照

- `.Codex/knowledge/reference/exam-content-policy.md` — pe-first-stage の整備方針
- `.Codex/skills/conversion/exam-questions-import/templates/pe-first-stage.md` — インポート仕様
- `docs/textbook/技術士第一次試験/` — ソース PDF
