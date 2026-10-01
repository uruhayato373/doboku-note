---
name: reference_note_live_audit_gotchas_2026_09
description: "note live 修復・一括反映・監査の罠。note-live-audit 偽陽性3型・CDN確定待ち延長(NOTE_IMG_SETTLE_*)・--force-retry・--keep-boundary の境界崩れ(--boundary-h2)・一括sync(1記事1プロセス・PDF無し・ログイン切れ)"
metadata:
  type: reference
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

---

## 画像CDN確定タイムアウト（会社PCプロキシ）

note-update-body / note-publish が本文画像をアップロードすると、`blob:` プレビューが CDN URL に
差し替わるのを待つ（`scripts/lib/note-images.mjs` の `settleUploads`）。既定は **min 90 秒 / 20 秒per枚**。

**会社 PC（プロキシ経由）ではこれを超える。** 2026-08-04 の実測で、26 本バッチの 1 回目は
14 本中 6 本が `[4.4] ABORT: 画像が CDN 確定せず` で中断した（3 本連続でバッチ自体も自動停止）。
待ちを 4 倍にした 2 回目は 18 本中 13 本成功し、1 回目に失敗した記事も通った。

- 延長: `NOTE_IMG_SETTLE_MIN_MS=240000 NOTE_IMG_SETTLE_PER_IMG_MS=60000`
- **これは「待てば通る」失敗**。判定（blob: でない img が target 個）は緩めていない。
- **中断しても保存しない**ので live は壊れない。ただし有料記事では、note のエディタが
  「保存しない」で抜けても全文置換＋添付削除の状態を保持するため、
  再実行前に人が記事を開いて添付の有無を確認すること（[[feedback_platform_only_artifacts_destroyed_by_bulk_ops]]）。
- 回線の速い PC なら既定のままで通る可能性がある。**まず 1 本 dry-run して確かめてから**バッチを流す。

関連: [[feedback_note_article_three_set_dod]] / [[feedback_metrics_cicd_supplied]]

---

## --keep-boundary で有料境界が冒頭へ動く

`note-update-body --keep-boundary` は「既存の有料境界を動かさない」つもりの指定だが、
**本文のブロック数が変わる更新では境界が記事冒頭へ移動する**。2026-07-31、コンクリート
診断士の有料記事に CTA 段落を足して更新したところ、有料2本の無料プレビューが数百字まで
縮んで公開された（購入判断の材料が読者に届かない状態）。

**スクリプトは「[OK] ライブ反映完了」と正常終了する**。`--keep-boundary` の検証は
「境界line が存在するか」だけで、**位置を見ていなかった**ため。公開ページを人が開くまで
誰も気づけなかった。

- **CTA・段落を足す更新では `--boundary-h2 "<境界H2>"` を使う**（`--keep-boundary` は
  本文が1文字も増減しない更新に限る）
- 2026-07-31 以降、`assertLiveBody({paid:true})` が無料プレビュー長を検査し、
  `MIN_FREE_PREVIEW_CHARS`（600字）未満なら `note-publish` / `note-update-body` が FAIL する
- 全件の実査は `node scripts/check-note-structure.mjs` の `FREE_PREVIEW_COLLAPSE`（CRITICAL）。
  従来の `FULL_LOCK` は `bodyLen<40` と厳しすぎて、この崩れ方を CRITICAL に上げられなかった

関連: [[reference_note_update_body_gotchas]] [[reference_note_publish_price_field]]

---

## 一括反映の罠（2026-09-30）

2026-09-30 にココナラ導線の重複解消で57記事を note-update-body --sync で流したときの罠。

- worktree には配布 PDF（git 管理外）が無く、PDF 添付記事は `--reattach-pdf` 相当で本文を触らず中断する。メインの checkout から `rsync --include='*.pdf'` で持ち込むと通る（正規ルートは note-sync.sh が Drive から取り寄せる）。
- `--list` で1プロセスに多数流すと、途中の1本の失敗（公開設定不到達など）以降「editor not loaded」「画像アップロード滞留」が連鎖して3連続失敗で ABORT。1記事1プロセスのループで流すと安定。
- 途中で note のログインが切れた（account gate ABORT）。note はキーチェーン資格情報が無いので auth:refresh では戻らず、`npm run auth:login -- --service note` を運営者が実行。
- 空きメモリガード（1200MB）で起動見送り → `DOBOKU_PW_MIN_FREE_MB=800`。
- 会員特典マガジンの無料記事は trial-guard で止まる。live の試し読みラインが末尾なら frontmatter `memberTrial: bottom` で現状維持のまま反映できる。
- 失敗記事は台帳で blocked になり次回 `--sync` で skip される → `--force-retry`。
- 公開 API 本文でリンク重複を数えるとき、リンクカード1枚に同じ URL が data-src/href/表示で3回出る。`data-src` の数で数える。

関連: [[reference_note_update_body_gotchas]] [[reference_note_publish_price_field]]
