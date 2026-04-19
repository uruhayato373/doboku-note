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
