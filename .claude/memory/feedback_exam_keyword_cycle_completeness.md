---
name: exam-keyword-cycle-completeness
description: /exam-keyword-cycle は過去問 1 問の全 RelatedKeywords を処理する。primary-only は NG（verify スクリプトで検知）
type: feedback
originSessionId: 8126b62e-d130-4adf-93d2-b1b074d9016f
---
/exam-keyword-cycle で「full cycle」を実施するときは、`src/config/exam-question-keywords.json` の `[{exam-full-slug}][{question}].slugs` 配列に含まれる **全キーワード** に対して cem-qa 評価 + リライト（または過去問リンク + 相互リンク追加）を実施する。primary 1 つに絞って「完了」とするのは NG。

**Why:** 2026-04-23、R04 Ⅰ-1-11〜1-40 で primary キーワードのみを校正し、100+ 件の二次キーワードが未処理のまま commit された。ユーザー指摘で判明。本来の「full cycle」は RelatedKeywords 全件が処理対象。同日中に verify-cycle-completeness.mjs と skill を改修して構造的に防止した。

**How to apply:**
- Phase 1 で `jq -r '.["{exam-full-slug}"]["{question}"].slugs' src/config/exam-question-keywords.json` を実行し対象 slug 配列を取得
- Phase 2 で全件の cem-qa を単一メッセージで並列起動
- 全 slug に過去問インラインリンク（`/docs/{exam-full-slug}#{anchor}`）を追加
- cem-qa < 2.0 の軸は必ずリライト、≥ 2.0 なら相互リンクだけでも可（「何もしない」keyword は作らない）
- **commit 前に `node .claude/skills/content/exam-keyword-cycle/scripts/verify-cycle-completeness.mjs --exam {slug} --question {anchor}` を実行し complete: true を確認**（missing_slugs が空配列）
- progress.json の keywords 配列は catalog の slugs と集合として完全一致
