---
name: feedback_shell_fail_fast
description: "複数段階のマージやJSON修復は失敗時に次のGit操作へ進めない"
metadata:
  type: feedback
---

2026-10-10、Drive台帳の3-way統合で件数assertが失敗した後も、同じシェルの後続git addが実行され、未解消JSONをstageした。pre-commitが拒否し、不正なコミットは作られなかった。統合を修正してから再実行した。

依存する処理は別ツール呼出しに分けてexit codeを確認する。functions.exec内で順にawaitするだけでは失敗後も次の呼出しへ進むため、結果のexit_codeが0かを明示的に検査し、失敗時は後続のGit操作を呼ばない。シェル内で続ける必要がある場合は `set -e` を付け、JSONのparse・既存件数維持・競合マーカー0を通してからGit操作へ進む。`head` は巨大な1行JSONを短くしないため、台帳差分はparse後のキー・件数・変更行で確認する。
