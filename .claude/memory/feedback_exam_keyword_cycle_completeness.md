---
name: feedback_exam_keyword_cycle_completeness
description: "/exam-keyword-cycleは過去問1問の全RelatedKeywordsを処理(primary-onlyはNG)。「最低限」は品質作業を削らず運用オーバーヘッドだけ削る意味"
metadata:
  type: feedback
---

## 全 RelatedKeywords を処理する（2026-04-23）
`/exam-keyword-cycle` の full cycle は、`src/config/exam-question-keywords.json` の `[{exam-full-slug}][{question}].slugs` 配列の**全キーワード**に cem-qa 評価＋リライト（または過去問リンク＋相互リンク追加）を実施する。primary 1つに絞って「完了」はNG。
- **Why:** 2026-04-23、R04 Ⅰ-1-11〜1-40 で primary のみ校正し100+件の二次キーワードが未処理のまま commit された（ユーザー指摘）。同日 verify-cycle-completeness.mjs と skill を改修して構造的に防止。
- **How to apply:** Phase 1 で `jq -r '.["{exam-full-slug}"]["{question}"].slugs' src/config/exam-question-keywords.json` で対象 slug 配列を取得。Phase 2 で全件の cem-qa を単一メッセージで並列起動。全 slug に過去問インラインリンク（`/docs/{exam-full-slug}#{anchor}`）を追加。cem-qa < 2.0 の軸は必ずリライト、≥ 2.0 なら相互リンクだけでも可（「何もしない」keyword は作らない）。**commit 前に `node .claude/skills/content/exam-keyword-cycle/scripts/verify-cycle-completeness.mjs --exam {slug} --question {anchor}` を実行し complete: true（missing_slugs 空）を確認**。progress.json の keywords 配列は catalog の slugs と集合として完全一致。

## 「最低限の品質向上」の意味（2026-04-22）
スキルでの「最低限の品質向上」は**品質作業を削らず、運用オーバーヘッドだけを削る**意味。2026-04-22 に R04 Ⅰ-1-11〜1-40 と R03 全40問を「2-3行追記だけ」の浅い処理でバッチ実行したのは誤解釈で、cem-qa 評価・視覚検証・相互リンク網羅・本文リライトを怠りやり直しになった。
- **実施する（削らない）**: cem-qa 5軸評価 / Playwright 視覚検証 / 相互リンク網羅（RelatedKeywords の複数）/ 既存本文のリライト。
- **省く（運用オーバーヘッド）**: PR 作成 / サイクルログ md / Umbrella sync / キーワード別コミット。1サイクル=1コミット・直接 push（ブランチ・PR なし）。「最低限」を品質チェックのスキップの合図と取らない。
