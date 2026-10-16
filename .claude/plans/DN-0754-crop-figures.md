---
taskId: DN-0754
type: implementation-plan
createdAt: 2026-10-16
deleteOnComplete: true
---

# 本の図との比較による自作図の改善

1. 主任技士4記事の残修正を本文と照合し、SVG監査・描画確認・MDX検査・索引更新後、記事ごとにコミットする。
2. 診断士05の37ページをクロップ監査し、修正後の全軸2以上の図をDriveと書籍manifestへ登録する。
3. C-25・C-26・C-28の自作図を本の図と見比べ、本文に根拠がある修正を反映する。
4. 切り出し待ち0、SVG監査、MDX検査、developのbuild・e2eを確認してmainへ反映する。
5. 本番SSR検査のexit 0と変更図の配信を確認し、DN-0754を完了処理する。必要な一時成果物を保全して引き継ぎ文書と作業用worktreeを片づける。
