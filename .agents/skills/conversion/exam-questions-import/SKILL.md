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
/exam-questions-import --exam {civil-primary|civil-secondary|civil-primary-2|civil-secondary-2|pe-primary|pe-first-stage} --year <year> [--sub {a|b|zenki|kouki|basic|aptitude|construction}] [--pages N-M] [--mode add-answers]
```

| 引数 | 必須 | 説明 |
|---|---|---|
| `--exam` | 必須 | 試験・検定を指定。template 切替に使用 |
| `--year` | 必須 | 年度（例: `r07` / `r02` / `h30`） |
| `--sub` | 条件付 | 試験別の区分指定。**1級**: 問題 A/B（`a` / `b`） **2級**: 前期/後期（`zenki` / `kouki`） **技術士一次**: 基礎/適性/専門建設（`basic` / `aptitude` / `construction`） |
| `--pages` | 任意 | PDF ページ範囲（省略時は template で自動推定） |
| `--mode add-answers` | 任意 | 既存 MDX の未解答設問に解答・解説を追加（旧 `/add-exam-answers` 吸収） |

## 利用可能テンプレート

| exam | 対応試験 | 形式 | テンプレート |
|---|---|---|---|
| `civil-primary` | 1級土木施工管理 第1次検定 | 4 択選択式 | `templates/civil-primary.md` |
| `civil-secondary` | 1級土木施工管理 第2次検定 | 記述式 | `templates/civil-secondary.md` |
| `civil-primary-2` | 2級土木施工管理 第1次検定（前期/後期） | 4 択選択式 | `templates/civil-primary-2.md` |
| `civil-secondary-2` | 2級土木施工管理 第2次検定 | 記述式 | `templates/civil-secondary-2.md` |
| `pe-primary` | 技術士総合技術監理 第1次試験 | 5 択選択式 | `templates/pe-primary.md` |
| `pe-first-stage` | 技術士 第一次試験（基礎・適性・専門建設） | 5 択選択式 | `templates/pe-first-stage.md` |

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

### Step 5.5: Post-import OCR / figure 検証ガード（Phase 4、Issue #128 起因）

import 完了後、生成された MDX を `verify-pdf-mdx.mjs` で機械的に検証する:

```bash
node .Codex/skills/conversion/pdf-to-mdx/scripts/verify-pdf-mdx.mjs \
  {output-mdx-path} \
  --pdf {source-pdf-path} \
  --expected-figures {N}
```

`{N}` はテンプレート（例: `templates/civil-primary.md`）の `expected_figures` 列を参照。出力 JSON の以下フィールドを確認し、警告レベルで対応:

| フィールド | 値 | 対応 |
|---|---|---|
| `ocr_recommendation.level` | `error` (count ≥ 10) | 視覚突合で全行確認、Tesseract 再 OCR を検討 |
| `ocr_recommendation.level` | `warn` (count ≥ 5) | サンプリング視覚突合で品質確認 |
| `figures_check.status` | `missing` | PDF にある図版が MDX に欠落、`<ArticleImage>` 追加 |
| `figures_check.status` | `extra` | MDX に余分な画像参照、要削除確認 |
| `coverage.rate` | `< 0.8` | 章節見出し網羅率が低い、本文抜け確認 |

すべて ok なら Step 5.7 へ進む。warn / error がある場合はユーザーに表示して判断を仰ぐ。

**過去の具体例**（Issue #128 で発見）: R02 primary で keyword audit が見落とした図版欠損 2 件、R01 primary で「데이터」というハングル文字混入の OCR バグ等。本ガードで早期検出できるようにする。

### Step 5.6: 構造ガード（重複選択肢・正答整合、2026-06-04 追加）

`verify-pdf-mdx.mjs` では拾えない 2 つの転記ミスを機械的に検出する。生成直後と公開前に全ページへ実行する。

```bash
# ① 重複選択肢検出: ○×組合せ・語句組合せで2選択肢が完全一致＝転記ミス確定
node .Codex/skills/conversion/exam-questions-import/scripts/check-option-dup.mjs <article.mdx ...>
# ② 正答整合: **正答：N** と ✅/❌ バッジ位置の不一致・正答欠落・ExamPoint内バッジ混入
node .Codex/skills/conversion/exam-questions-import/scripts/check-answer-consistency.mjs <article.mdx ...>
```

①が 1 行でも出たら原典 PDF で該当選択肢を視覚確認し訂正（実試験に同一選択肢は存在しない）。②の「正答 行なし」は救済等の意図的欠落なら無視可。**この①は視覚突合（Step 5.7）を通過したページでも誤転記を検出する**（2026-06-04 の技術士第一次 R5〜R7 で実証）ため、視覚突合の代替ではなく追加ガードとして必ず回す。あわせて本文の不等号は全角 ＜＞（半角 `<` は MDX の details を破壊）とし、`@mdx-js/mdx` 単体コンパイルで `COMPILE OK` を確認する。

### Step 5.7: 原典視覚突合（必須品質ゲート、2026-05-28 追加）

> **これが最重要の品質ゲート。正解番号の機械突合だけで合格としてはならない。**

**背景（2級土木 過去問15本の大規模ハルシネーション、2026-05-28）**: PDF→MDX 生成時、特に**画像ベース（OCR 不良）PDF で問題文・選択肢をハルシネーション（捏造）**する事故が多発した。全15本を原典突合した結果 **約240箇所の相違**（問題文の取り違え・設問極性の逆転・選択肢文言の意味反転・別問題の混入）を是正。決定的な教訓:

- **正解番号が正答PDFと一致していても、問題文・選択肢が捏造されていることがある**。正解番号機械突合は品質保証にならない
- **`verify-pdf-mdx.mjs` の coverage / OCR チェックや content-qa の構造採点では検出できない**（content-qa 3.0満点でも問題文に4問捏造の実例）
- **OCR品質に関わらず発生**。公式PDF（OCR良好）の R07 でも一次に46問のハルシネーション

**必須手順**:

1. 問題 PDF を PyMuPDF で 250-300dpi 画像化（pdftotext は CID 埋込で日本語抽出不能なことが多い）:
```bash
python -c "import fitz,os; os.makedirs('/tmp/verify',exist_ok=True); d=fitz.open('{pdf}'); [d[i].get_pixmap(dpi=250).save(f'/tmp/verify/p{i+1:03d}.png') for i in range(d.page_count)]; d.close()"
```
2. 各ページ画像を Read で視覚確認し、**全問について以下を MDX と照合**:
   - 問題文の主旨が PDF と一致するか
   - 設問極性（「適当なもの」/「適当でないもの」）が一致するか
   - 選択肢 (1)〜(4) の文言が PDF と一致するか
   - 正解番号が正答PDFと一致し、❌/✅ が設問極性と整合するか
3. 相違があれば PDF 忠実に修正（推測禁止、視覚転記）。相違が広範なら該当問を再構築
4. 二次（記述式）は OCR 影響が小さく相違は少ないが、穴埋め語句・選択語句群は同様に照合

**複数年度をまとめて変換するときに限り**、年度別サブエージェントに「原典突合再検証」を委譲する（PDF 全ページの視覚転記＝年度単位で独立・並列化できる大きな作業のため。AGENTS.md §5 の委任基準を満たす）。各エージェントが PDF 全ページを視覚転記して MDX と1問ずつ照合する。**1 年度分など数回のツールコールで終わる規模では親がインラインで照合する**。詳細は memory `feedback_exam_pdf_cross_reference` 参照。

### Step 6: 品質検証

```bash
/check-mdx {path} --rules syntax
```

ビルドエラーがなく、Step 5.7 の原典視覚突合で全問 PDF 一致を確認できたら完了。

## 使い方の例

```bash
# 1級土木 令和7年度 問題A
/exam-questions-import --exam civil-primary --year r07 --sub a

# 1級土木 令和6年度 第2次（記述式）
/exam-questions-import --exam civil-secondary --year r06

# 2級土木 令和7年度 第1次（前期）
/exam-questions-import --exam civil-primary-2 --year r07 --sub zenki

# 2級土木 令和7年度 第1次（後期）
/exam-questions-import --exam civil-primary-2 --year r07 --sub kouki

# 2級土木 令和7年度 第2次
/exam-questions-import --exam civil-secondary-2 --year r07

# 技術士総監 令和7年度 第1次
/exam-questions-import --exam pe-primary --year r07

# 技術士 第一次試験 令和7年度 基礎科目 / 適性科目 / 専門（建設部門）
/exam-questions-import --exam pe-first-stage --year r07 --sub basic
/exam-questions-import --exam pe-first-stage --year r07 --sub aptitude
/exam-questions-import --exam pe-first-stage --year r07 --sub construction

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

- `.Codex/skills/conversion/exam-questions-import/templates/` — 試験別テンプレート
- `.Codex/knowledge/reference/exam-content-policy.md` — 試験別コンテンツ整備方針
- `.Codex/knowledge/reference/content-principles.md` — コンテンツ原則
