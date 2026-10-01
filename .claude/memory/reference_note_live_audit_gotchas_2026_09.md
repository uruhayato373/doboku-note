---
name: note-live-audit-gotchas-2026-09
description: note-live-audit が赤になる偽陽性 3 型（reserved 記事の live=0・無料側に再掲された文を有料 probe に採る・未マージ branch の配信状態）と live 修復の実務（CDN 確定待ち・中断記録の --force-retry・8GB Mac）
metadata: 
  node_type: memory
  type: reference
  originSessionId: 4493fa3c-b0d0-4f24-9b81-ba293298dc72
  modified: 2026-09-18T15:08:23.496Z
---

2026-09-18 に note-live-audit（08-31 以来 2 週連続赤）を緑に戻したときの罠。

**偽陽性 3 型**
- `noteStatus: reserved`（予約投稿）は noteUrl/noteId が書き戻されるが go-live 前で API が本文もタグも返さない → live-headings は「画像欠落 live=0」、live-tags は「0 タグ」になる。checker は reserved を対象外にして件数を出す（修正済み・[[reference_quality_audit_system]]）。go-live 後は `verify-note-status --fix` が published に戻す
- check-note-structure の有料 probe は境界直後 30 字。無料側（テーマの読み解き等）に同じ文が再掲されていると、境界が正しくても PAYWALL_LEAK。probe は SoT の無料部分に無い行から選ぶ（修正済み・`tests/note-structure-probe.test.mjs`）
- 未マージ branch で配信・予約した記事は develop の frontmatter が draft のままで membership-drip / magazine-membership が偽赤。note API で実体を確認してから frontmatter だけ develop に取り込む（内容が同一なら後の merge と衝突しない）

**live 修復の実務**
- `note-update-body --commit` は画像の CDN 確定を待つ。Mac では 270s 上限で ABORT（未保存・安全）しがち → `NOTE_IMG_SETTLE_MIN_MS=420000 NOTE_IMG_SETTLE_PER_IMG_MS=180000`。8GB Mac は `DOBOKU_PW_MIN_FREE_MB=1024`
- 過去に更新フローが中断した記事は `.claude/state/note-update-aborted.json` に記録され SKIP される。添付を約束しない記事なら `--force-retry` で復旧（工事119 は 08-25 の中断で 3 週間 FULL_LOCK だった）
- `note-sync-tags --list --commit` は本文・境界に触らずタグ差分だけ追加（99 上限・目標 90）
- `check-note-attachments:live --only <noteId>` は PDF を約束する記事しか対象にしない（対象 0 は「壊れていない」ではなく「射程外」）
