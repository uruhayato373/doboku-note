---
name: kindle-dup-prevention
description: Kindle修正版アップは既存タイトルへ差し替え(新規作成禁止・ASIN不変)。提出後ASIN即catalog記録
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 21ecde11-c38e-4453-adeb-e7a2dccec3c3
---

KDP出版は完全手作業（専用publishエージェント無し）。**修正版のアップロードは必ず「既存タイトルを開いて原稿ファイルだけ差し替え→再出版」でやる。新規作成は禁止**（ASINを変えない）。

**Why**: e-01（2級土木択一）で、旧著者「架」版を7/12提出（ASIN B0H8KH1N6G）→ 正版に直すとき既存差し替えでなく新規作成でやり直し → 別ASIN B0H8ZZMM7R（7/15）が発番され、Amazon上に同じ本が2つできた（片方は下書きに戻して放置）。重複コンテンツ規約リスク＋レビュー/売上分散。

**How to apply**:
- 修正版は KDP 本棚の既存タイトル → 原稿差し替え → 再出版（ASIN維持）
- **提出したら下書き段階でも即 catalog.json に asin と status を記録**（ASINは下書き作成時点で発番済）。次セッションが「もう存在する」と気づけ、二重作成を防ぐ
- 新規バッチ公開の前に必ず KDP 本棚 or catalog で「既に提出済みでないか」を確認（2026-07-15、d-01/d-02/A-00 が catalog では ready/in_review のまま実際は LIVE だった＝突合しないと重複を作る）
- 不要な重複下書きは KDP で削除（売上ゼロ＝完全削除可）
- catalog SSOT の突合は KDP 本棚スクショを読んで asin/status を照合するのが確実

関連 [[kindle-publishing-launch]]・[[note-paid-unpublish-blocked]]（有料公開済みは下書き戻し不可だが Kindle 下書きは削除可）
