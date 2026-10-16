---
taskId: DN-0752
type: implementation-plan
createdAt: 2026-10-16
deleteOnComplete: true
---

# 共通仕様書の本体とOGP台帳の整合・本番反映

1. PR #1092へ最新developを取り込み、北海道版の章本体と既存OGP台帳を整合させる。共有checkoutの別作業は保護する。
2. orphan-ogp・章OGPテスト・公的基準のデータ検査とドキュメント同期監査を通す。
3. PRのbuild・audit・E2E成功後にdevelopへ合流し、developのaudit成功を確認する。
4. mainへ反映し、デプロイ成功・本番SSR exit 0・北海道版43章とOGP・節ページの公開を確認する。
5. DN-0752の完了記録を残し、プランと作業用worktreeを片づける。
