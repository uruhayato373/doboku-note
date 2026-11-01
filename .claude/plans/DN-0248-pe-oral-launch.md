---
taskId: DN-0248
type: implementation-plan
createdAt: 2026-11-01
deleteOnComplete: true
---

# 筆記合格発表日の口頭試験導線

11月4日の予約時刻後に、建設部門・総監の無料記事2本の公開本文と有料教材リンクを確認する。建設部門の L3 冒頭 CTA 22本を `--sync-managed` で切り替え、無料記事を建設部門もくじ・L1・口頭試験対策2本へ配線する。X の告知は行わない。

完了条件は、2本の公開実体、有料教材 URL 一致、`npm run check-note-funnel` と `audit-note-funnel` のドリフト0、`npm run verify-note-magazines` で有料2本の追記確認。サイトのビルド時切替は DN-0902 として、11月4日以降の deploy で本番確認する。
