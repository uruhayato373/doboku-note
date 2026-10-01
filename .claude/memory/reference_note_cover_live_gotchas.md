---
name: note-cover-live-gotchas
description: noteカバー一括ライブ反映の罠 — free×membership連携のみ非対応/マガジンはアップロード完了前保存で画像なし/API検証はページ走査上限に注意
metadata: 
  node_type: memory
  type: reference
  originSessionId: a47b3c70-2e6a-4ea5-b6e7-fb4319f0e8b1
  modified: 2026-08-16T22:26:26.166Z
---

note カバーの一括ライブ反映（V4 全量 706記事+36誌、2026-07-25 完走）で確定した挙動:

- **記事**: `note-update-cover.mjs` は paid×メンバーシップ連携を含めほぼ全記事対応。**非対応は free×メンバーシップ連携のみ**（「公開に進む」後の設定ページ構造が特殊で「設定ページ未到達」）。連携有無は API v3 `is_public_membership_connected`。paid かどうかは frontmatter でなく API `price` で判定する（frontmatter が古いケースあり）。失敗時は fail-safe でライブ無傷（更新するを押さない）
- **マガジン**: `note-magazine-cover.mjs` は crop 確定直後に「更新」を押すと**アップロード完了前で画像なし保存**になる（UI は成功に見える偽成功）。プレビュー実体出現 gate＋保存後 API ポーリングで修正済み（commit 参照）
- **API 検証の罠**: `creators/{u}/contents?kind=magazine` はページングされ、マガジン数が増えると固定ページ数の走査では**保存成功でも未発見の false negative**になる。isLastPage まで走査する
- 一括走行は「チャンク＋進捗 state＋1件失敗で停止」設計が有効。一過性エラー（新カバー load タイムアウト・page.goto ERR_ABORTED）は個別リトライで全件成功した
- 長時間ジョブの走らせ方は**ハーネスの `run_in_background` が既定**（現行ハーネスはターン境界を跨いで走り続け、終了時に通知が来る）。2026-07-25 に「background task がターン境界で kill されるので nohup + disown」と記録したが、2026-07-31 に **`nohup ... &`（disown なし）で 216 本の添付バッチが親シェル終了に道連れで 1 本目で停止**する事故が出た。nohup を使うなら必ず `& disown` まで付ける。迷ったら `run_in_background`

関連: [[note-update-body-gotchas]] [[note-publish-price-field]]
