---
name: gate-zero-coverage-false-pass
description: 否定側（不足・未ログイン・0件）を1回の観測で確定すると偽の緑/赤を生む。決着した分類だけ即返し未決着は待ち直す
metadata:
  type: feedback
---

否定側の判定（「添付が無い」「未ログイン」「対象 0 件」）を **1 回の観測で確定**する実装・確認作業が、2026-09-07 の棚卸しで 5 回続けて嘘を生んだ: 添付実査の `live=0`／20 分の走査を 1.5 秒で止めた account gate／`auth:status` の単発判定（note は 4 回目≈6 秒で marker が出る）／URL redirect しか見ないログアウト判定／未証明のまま「入れた」と書いた保存前ゲート。

**Why:** 肯定側は 1 回見えれば決着するが、否定側は「まだ出ていない」と「本当に無い」が同じ観測になる。CLAUDE.md §9「検査ゼロを PASS と呼ばない」の裏面。

**How to apply:** 判定は「決着した分類は即返し、未決着のときだけ待ち直す」形にする（timeout は待ち直しの上限であって判定ではない）。否定側を返すときは観測回数・待った時間を出力に含める。新しく入れたゲート（例: note 価格変更の保存前添付ゲート・`.claude/state/note-attachment-loss.json` の pending）は **次に実際の書き込みを回すまで「実挙動は未証明」と明記**し、初回実行時に `[attach] 保存前の添付 N/N を確認` が出ることを見る。関連: [[reference-ci-quality-gate-fixes]]、[[feedback-verify-your-excuses]]。
