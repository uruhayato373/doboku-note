---
name: quality-audit-system
description: 機械品質チェック統合基盤 quality:audit と、lint-mdx-mobile へのルール追加時の罠（ID衝突・block-comment・baseline・exam免除）
metadata: 
  node_type: memory
  type: reference
  originSessionId: 17865b08-b9bc-4cac-afc3-9cbcda90e942
---

機械品質チェックの統合基盤（2026-07-14 新設）。[[reference_quality_census]] [[feedback_knip_dead_code_audit]] と同系統。

**統合ランナー**: `npm run quality:audit`（report→`.claude/state/quality/audit-latest.md`）/ `quality:audit:ci`（CI gate・15チェック・fail/timeoutでexit 1）。定義は `scripts/quality-audit.mjs` の宣言的 CHECKS 配列（`{id, npm|cmd, timeout, ci:bool, skip()}`）。ci.yml は `quality:audit:ci → build` に集約済み。report-only に降格した既存債務: internal-links（concrete-chief の RelatedKeywords BROKEN_SLUG）、note-meta-lint（`node:fs/promises` の glob が Node20 未提供でクラッシュ＝要修正）。

**新規チェックの三点セット**: 閾値=`.claude/config/*`（content-rules.json/image-limits.json）、純ロジック=`#lib/*`（mdx-hygiene-rules/image-audit・ユニットテスト付）、`quality-audit.mjs` の CHECKS 登録。画像=`check-image-assets`（baseline=image-baseline.json）、SVG=detect.mjs の P13/P14/P15。

**lint-mdx-mobile.mjs にルール追加する時の罠（重要）**:
1. **rule-ID 名前空間は既存を必ず確認**: `grep "rule: '" lint-mdx-mobile.mjs` で洗い出す。7-1/7-2 は既存の太字スコープルール（装飾絵文字は 7-3 に採番して衝突回避した）。fullScan に足すと既存の未追跡ルールが露出して大量 regression 化する。
2. **block-comment `*/` 事故**: JSDoc `/* */` 内に `{/* */}` や `figure-*/ogp` を書くと `*/` がコメントを閉じて SyntaxError。ヘッダー説明では `*/` を避けて言い換える（例「波括弧スラッシュ形式」「figure- 接頭辞」）。lib は `//` 行コメントなら安全。
3. **content-rules.json 二箇所**: `defaults`（重大度）と `fullScan.rules`（全量ラチェット追跡）の両方に登録。後者に入れないと死にルール。
4. **baseline 更新は同一commit**: 追加後 `npm run update-content-quality-baseline`＋`quality-snapshot` で既存違反を grandfather。ラチェットは新規のみブロック。
5. 純関数は `(lines, findings)` シグネチャで content 相対行を push（本体が offset シフト＋applyContentRules 適用）。0-1/0-2 のみ offset 除外。

**装飾絵文字(7-3)は curated denylist**: `\p{Extended_Pictographic}` は ⭕(242)★(161)↔(15) 等の過去問正誤・強調・関係記号を誤検知（418件）。💡🔑📌⚠️等の実装飾のみ列挙する。

**過去問データ表の rule 免除（overrides）**: 多列データ表（ふるい分け・圧縮試験・配合計算・JIS規格表）は箇条書き化で2次元参照性を失うため、`content-rules.json` の `overrides[category][group]` で 1-3/1-4（＋問題文が長い exam は 15-2/15-3）を `enabled:false`。civil-construction-1 textbook/secondary（2026-07-10）・concrete-chief-engineer primary（2026-07-14）が前例。keyword/guide ページの表・散文は免除せず修正する。

**KaTeX strict 警告の監査（2026-07-14 追加）**: `npm run audit-katex`（レポート）/ `audit-katex:ci`（`--strict`）。build（rehype-katex 既定 strict:'warn'）が出す警告を build と同じ remark-math パイプラインで数式ノード抽出→ファイル/行/数式/コード単位に一覧化。純ロジック=`#lib/katex-audit.mjs`（`safeFixMath`＝数式スパン内のみ全角演算子/U+2212/% 置換・`--fix-safe`）。quality-audit の CHECKS に `katex-warnings`(ci:true) 登録済み。修正規則は content-authoring.md 数式節。**罠: `preprocessMDX`(docs.ts) は `$$` ブロック（行が正確に `$$`）と単行 inline `$...$` しか保護せず、display の区切りに単独 `$`（`$$` でない）を使うと中身の `{}` をエスケープして `\text{万円}`→`\text\{万円\}` を壊し CJK が math mode に露出する。これは remark 抽出の死角なので `detectSingleDollarBlocks`（行が正確に `$` を検出）で別途ガード**。SpecSheetList の JSX prop 内 `$...$` はランタイム katex 描画で build log 非出力＝audit 対象外。
