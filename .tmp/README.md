# .tmp/ — 一時出力置き場

視覚検証・図版確認・アドホックなデバッグ出力など、**コミット対象外の一時ファイル**はここに出すこと。

## 対象例
- Playwright スクショ（`browser_take_screenshot` の出力）
- SVG → PNG のレンダリング確認
- PDF → 画像抽出の中間ファイル
- その他、セッション中だけ必要なファイル

## ルール
- このディレクトリの中身は gitignore 済み（`.gitkeep` と `README.md` のみ追跡）
- リポジトリ直下に `*.png` / `*.jpg` / `*.svg` 等を出さない
- Stop フック（`.claude/hooks/check-stray-files.sh`）がリポジトリ直下の untracked 画像ファイルを検知して警告する
- 不要になったら削除してよい（`rm -rf .tmp/*` で一掃可能）

## 自動 prune（蓄積防止）
- SessionStart フック `scripts/prune-tmp.mjs` が、**mtime が一定日数より古い `.tmp` 生成物を毎セッション開始時に自動削除**する（`.gitkeep`/`README.md` は保護、空サブディレクトリも除去）。
- 既定は **3 日**。延ばす場合は環境変数 `TMP_PRUNE_DAYS`（例: `TMP_PRUNE_DAYS=7`）で調整。
- セッション開始時点では当該セッションのファイルはまだ無いため、古い＝放置確定のものだけを安全に消す設計。数日跨ぐ作業の中間ファイルは都度参照で mtime が更新されていれば残る。
- 経緯: 手動削除任せで 8.1GB 蓄積した（2026-06-11）ため自動化。
