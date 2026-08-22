# Codex 実施ログ：技術士一次noteカバーのライブ是正

> [!done]
> **2026-08-19 完了**：`n466132e6fd74` の誤った資格ラベル入りカバーを、技術士第一次試験用カバーへ差し替えた。有料境界・価格・本文を維持し、公開APIで新カバーを確認済み。

## 背景

技術士第一次試験の有料PDF記事が、生成器の旧フォールバックにより「技術士（総合技術監理部門）」のカバーで1か月以上公開されていた。生成器とローカル画像は是正済みで、noteライブへの反映だけが残っていた。

## 実施内容

- 対象：`content/note/技術士一次/一次択一-過去問PDF/article.md`
- note ID：`n466132e6fd74`
- ローカルの `img/cover.png` が「技術士 第一次試験」と表示されることを目視確認した。
- 現行スクリプトは週次計画に書かれていた `--note` ではなく `--article` が正しいため、対象記事パスを指定した。
- dry-runで既存カバー削除、新画像アップロード、トリミング、新画像の読込まで確認し、保存せず終了した。
- `--commit` でカバーをライブ反映。有料境界を検出して未移動のまま保持し、購入者への更新通知は送らなかった。
- `.claude/state/note-republish-hashes.json` のカバーasset/metaハッシュを更新した。
- 週間計画を完了へ更新し、完了済みのバックログカードを削除した。

## 検証

```powershell
node scripts/note-update-cover.mjs --article "content/note/技術士一次/一次択一-過去問PDF/article.md"
node scripts/note-update-cover.mjs --article "content/note/技術士一次/一次択一-過去問PDF/article.md" --commit
curl.exe --ssl-no-revoke -sS "https://note.com/api/v3/notes/n466132e6fd74"
```

- dry-run：`ok=1 fail=0/1`
- commit：`ok=1 fail=0/1`
- カバー画像ID：`304637335` → `305016942`
- 公開状態：`published`
- 価格：`1480`（変更なし）
- `can_read=false`（有料閲覧制限を維持）
- 公開API本文長：`5297`（本文あり）
- 有料境界：検出成功、未移動

## 後続メモ

- 次に優先する週間タスクは、8/24締切の「会員フロー週次配信 W5 を公開」。
- `note-update-cover.mjs` の正しい指定は `--article <article.md>`。旧 `--note` コマンドは使用しない。
