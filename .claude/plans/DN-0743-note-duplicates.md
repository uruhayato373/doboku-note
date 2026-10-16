---
taskId: DN-0743
type: implementation-plan
createdAt: 2026-10-16
deleteOnComplete: true
---

# note重複記事の整理

1. 公開API・原稿・公開台帳で対象5本とdobokunoteアカウントを照合する。
2. 土木もくじを残す版（n1edc95f39203・naa0821a3d631）へ更新し、PR #1076の削除済み案内を対象記事へ反映する。
3. 重複版（nc30a5646f239・ncad207369238）を下書きへ戻す。
4. 公開APIで重複2本の非公開・残す2本の公開・もくじリンクを実査し、台帳を完了する。

本文更新は既存CLI、非公開化はnoteIdを照合したUIで行う。下書きへ戻せない場合は削除で代替せず、理由を記録する。
