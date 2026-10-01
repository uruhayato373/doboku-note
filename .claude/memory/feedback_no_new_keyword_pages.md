---
name: no-new-keyword-pages
description: 総監キーワードページは新規作成しない。既存 690 ページの補強・統合で対応する方針
type: feedback
originSessionId: d43fc9a4-af05-40af-8bb5-e6ddb19d6c2c
---
総監キーワードページ（`.local/r2/posts/pe-comprehensive-management/{slug}/article.mdx`）の新規作成は行わない。教科書補強時も既存ページへの統合で対応する。

**Why:** 2026-04-18 ユーザが「新規ページは作成しない」と明示。マッピング表で「新規作成候補」として列挙された 33-34 件について、実装には進めない判断。既存 690 ページで試験範囲の大半はカバー済みのため、新規追加より既存の品質向上が優先。

**How to apply:**
- マッピング表に「未作成・slug 案」がある項目も、新規ページは作成しない
- 教科書 §○-(X) の内容が既存ページに含まれない場合は、**最も近い既存ページに統合**（例: `moving-average` → `correlation-analysis` に統合、`v-model` → `waterfall` or `agile` に統合）
- どうしても統合先がない場合は、マッピング表に「統合先検討中」「補強対象外」と明記して放置可
- cem-qa 再採点・教科書補強フェーズでは**既存 204 マッピング**のみを対象にする
