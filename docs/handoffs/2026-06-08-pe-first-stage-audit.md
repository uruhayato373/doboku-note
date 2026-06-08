# pe-first-stage 監査レポート 2026-06-08

## 概要

技術士第一次試験（R01〜R07 × 適性科目・基礎科目・専門科目（建設部門））の
全21ページを正答照合・構造検査の2軸で監査し、10問の正答誤りを修正した。

## 監査スコープ

- 対象: `.local/r2/posts/pe-first-stage/` 全21ページ
- 軸1 正答照合: `docs/textbook/技術士第一次試験/{R##}/{R##}-正答.pdf` と対照
- 軸2 構造検査: ExamPoint/details タグ数・frontmatter・設問連番
- 軸3 原典視覚突合: 未実施（今後の課題）

## 結果サマリ

| 軸 | 結果 |
|---|---|
| 正答照合 | 13ページ pass / 8ページ修正（10問誤りを発見・修正済） |
| 構造検査 | 21ページ pass（全通過） |
| 原典視覚突合 | 未実施 |

## 発見・修正した正答誤り一覧

| ページ | 設問 | 修正前 | 修正後（正） |
|---|---|---|---|
| r02-construction | Ⅲ-13 | 1 | 2 |
| r04-basic | Ⅰ-2-5 | 3 | 5 |
| r04-construction | Ⅲ-13 | 1 | 5 |
| r05-aptitude | Ⅱ-10 | 2 | 3 |
| r05-basic | Ⅰ-2-2 | 5 | 4 |
| r05-basic | Ⅰ-2-5 | 4 | 1 |
| r05-basic | Ⅰ-5-1 | 1 | 3 |
| r05-construction | Ⅲ-31 | 2 | 4 |
| r07-aptitude | Ⅱ-10 | 2 | 3 |
| r07-construction | Ⅲ-17 | 5 | 3 |

正答は `{R##}-正答.pdf` をPyMuPDF（テキスト抽出）で読み出した値が正解源。

## 作成・更新ファイル

### 監査スキル
- `.claude/skills/quality/pe-first-stage-audit/SKILL.md` — 新規（3軸監査仕様）

### 監査記録
- `.claude/state/pe-first-stage-audit/summary.json` — 全体サマリ
- `.claude/state/pe-first-stage-audit/extracted-answers.json` — 正答PDF抽出結果
- `.claude/state/pe-first-stage-audit/{year}-{sub}.json` × 21 — ページ別詳細

### 修正した MDX（8ファイル）
- `r02-construction/article.mdx`
- `r04-basic/article.mdx`
- `r04-construction/article.mdx`
- `r05-aptitude/article.mdx`
- `r05-basic/article.mdx`
- `r05-construction/article.mdx`
- `r07-aptitude/article.mdx`
- `r07-construction/article.mdx`

## 残課題

1. **原典視覚突合（軸3）**: 問題PDF（画像ベース）をページ単位で PNG 化し、
   MDX 設問文と突合する。特に修正した8ページは優先度高。
   コマンド例: `/audit-pe-first-stage --year R07 --sub aptitude`（視覚チェックのみ）

2. **スキル登録**: `docs/reference/skills-guide.md` と `docs/reference/skills-registry.md`
   への `/audit-pe-first-stage` 追加（本コミットで同時実施予定）

## 方法論メモ

- 正答PDF（正答.pdf）はテキスト抽出可能。PyMuPDFで確実に読める
- 問題PDF（適性/基礎/建設）は画像ベース。200dpi PNG化が必要
- 建設部門の正答は「９．建設部門」セクションを探索（年度により位置が異なる）
- 全角ハイフン `Ⅰ－１－１` は半角 `Ⅰ-1-1` に正規化してMDXと照合
- MDXはCRLF形式 → 検索前にLF正規化が必要
