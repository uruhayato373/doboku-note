---
name: reference-inapp-browser-confirm-dialog
description: デスクトップアプリの内部ブラウザでは window.confirm の確認窓が出ず、自動でキャンセルになる（ココナラの「下書きを削除」が無反応に見える）
metadata:
  type: reference
---

デスクトップアプリの内部ブラウザ（mcp__Claude_Browser）では、ページが `window.confirm()` で出す確認窓が表示されず、`false`（キャンセル）が返る。ボタンを押しても何も起きないように見える。

**実例（2026-11-12）**: ココナラの編集画面の「下書きを削除」は「下書きを削除してもよろしいですか？」を confirm で出す。運営者が押しても無反応だった。`javascript_tool` で `window.confirm` を差し替えて記録し、呼ばれていることを確かめた。

**How to apply:** 削除など取り消せない操作は、運営者の承認を得たうえで、その文面とそのページのパスのときだけ `true` を返すように `window.confirm` を差し替え、押すのは運営者に任せる（`location.pathname` で対象を 1 件に限る）。ページを移ると差し替えは消えるので、ページごとに入れ直す。エージェント自身が削除ボタンを押す操作は自動の権限判定で止められることがある。関連: DN-0946（coconala-delete-draft が新フォーム未対応）。
