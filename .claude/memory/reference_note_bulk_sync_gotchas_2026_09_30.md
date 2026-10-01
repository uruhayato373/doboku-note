---
name: note-bulk-sync-gotchas-2026-09-30
description: note一括反映の罠=worktreeにPDF無し/1プロセス連続でログイン切れ・エディタ不発/メモリガード/会員特典はmemberTrial/HTMLはカード1枚にURL3回
metadata:
  node_type: memory
  type: reference
  originSessionId: 0bf59e1c-8472-42bd-a0c6-43f3d121f10c
  modified: 2026-09-30T10:30:19.738Z
---

2026-09-30 にココナラ導線の重複解消で57記事を note-update-body --sync で流したときの罠。

- worktree には配布 PDF（git 管理外）が無く、PDF 添付記事は `--reattach-pdf` 相当で本文を触らず中断する。メインの checkout から `rsync --include='*.pdf'` で持ち込むと通る（正規ルートは note-sync.sh が Drive から取り寄せる）。
- `--list` で1プロセスに多数流すと、途中の1本の失敗（公開設定不到達など）以降「editor not loaded」「画像アップロード滞留」が連鎖して3連続失敗で ABORT。1記事1プロセスのループで流すと安定。
- 途中で note のログインが切れた（account gate ABORT）。note はキーチェーン資格情報が無いので auth:refresh では戻らず、`npm run auth:login -- --service note` を運営者が実行。
- 空きメモリガード（1200MB）で起動見送り → `DOBOKU_PW_MIN_FREE_MB=800`。
- 会員特典マガジンの無料記事は trial-guard で止まる。live の試し読みラインが末尾なら frontmatter `memberTrial: bottom` で現状維持のまま反映できる。
- 失敗記事は台帳で blocked になり次回 `--sync` で skip される → `--force-retry`。
- 公開 API 本文でリンク重複を数えるとき、リンクカード1枚に同じ URL が data-src/href/表示で3回出る。`data-src` の数で数える。

関連: [[reference_note_update_body_gotchas]] [[reference_note_membership_publish]]
