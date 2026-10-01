---
name: note-paywall-boundary-hazard
description: note-update-body --keep-boundary は本文ブロックが増えると有料境界が冒頭へ動き無料プレビューが消える。CTA追加時は --boundary-h2 必須
metadata: 
  node_type: memory
  type: reference
  originSessionId: 60cf5fe1-8ec7-437d-ace6-139916d7453d
  modified: 2026-07-31T12:27:15.400Z
---

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

関連: [[note-update-body-gotchas]] [[note-publish-price-field]]
