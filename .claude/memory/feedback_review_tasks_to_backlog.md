---
name: feedback_review_tasks_to_backlog
description: "週次レビューの申し送りはbacklogへDN-####起票まで。backlog操作の罠(挿入位置・二重採番・削除時のdoc参照)・月間は絞らず翌月へroll-over"
metadata:
  type: feedback
---

## 週次レビューの申し送りは backlog 起票までが完了
週次レビューを書いただけでは終わっていない。「来週への申し送り」は `.claude/todo/backlog.md` に `DN-####` で起票し、レビュー本文にも ID を併記するまでが完了。今週分は `.claude/todo/weekly.md` へ。
- **Why:** 2026-08-25 の実査で、R8択一ページへの note 導線配線が W33・W34・W35 と3週連続 Must に挙がりながら backlog に1枚も無く、レビュー内だけで流れていた。CLAUDE.md §8 は「タスクは backlog.md がマスタ」。
- **How to apply:** レビュー確定後、各項目に対応するカードが backlog にあるか grep（既存は追記・無ければ新規）。`[種類:定期]`（月次の A8 取得・四半期の競合スキャン・ココナラ実体の採り直し・校正学習の蒸留）は backlog に置かず weekly.md か `check-*-due` の担当（決定規則1）。`[検証:]` に surfacer を書かない（報告するだけのコマンドだとカードが永久に完了判定できない＝`check-backlog-verify` の「常時緑」）。起票後に `check-backlog-schema` と `check-backlog-health` を回す（S2/S3/S4/S9 が0か）。関連: [[project_nsm]]

## backlog 操作の罠
- **挿入位置**: 凡例表に `| ## 🔴 高 |` `| ## 🟣 判断待ち |` のように見出しと同じ文字列が入っている。`s.index('## 🟣 判断待ち')` で位置を取ると凡例表の中にカードが入り表が壊れる（2026-09-27 に2回）。`'\n## 🟣 判断待ち — ユーザーの意思決定が必要'` のように改行始まりの完全な見出しで取り、書いた後 `sed -n 16,21p` で凡例を確認（check-backlog-schema は表の破損を止めない）。
- **二重採番**: `node scripts/backlog-edit.mjs --next-id` は作業ツリーの backlog.md（develop）だけを見る。2026-09-27、PR #672（未マージ）内で DN-0414 を起票した直後に develop で別カードへ同じ DN-0414 を振った（DN-0415 へ振り直し）。起票は develop へ直接 push が基本。やむなく PR に入れたら番号を控え、次の起票前に `git grep -h -o 'DN-0[0-9]*' $(git branch -r --list 'origin/feature/*')` で未マージ側の最大番号も確認。
- **カード削除前に docs 参照**: 完了削除の前に `grep -rn "DN-XXXX" docs` で参照を探し、同じ commit で「完了（日付・PR番号）」へ置換。2026-09-30、DN-0405・DN-0365 削除直後に docs/editorial/07 と docs/strategy/13 の参照が dangling-id になり develop の CI（project-task-refs・unit-tests）が赤化（`backlog-edit.mjs --delete` は参照を見ない）。削除前に `node scripts/check-project-task-refs.mjs` で error 0 を確認。`--delete` は `--commit` を付けないと書き戻さない（dry-run が既定）。

## 月間のカード数は絞らない・翌月へ roll-over
2026-09-26、[時期:] を全カードに配線した結果10月が43枚になり、私が「月8〜12件に絞る」案と過積載警告（S16）を出したところ「絞る必要はない。残ったら翌月に回す」と答えた。S16 と 8〜12件の目安は撤去し、`npm run roll-backlog-when -- --write`（[時期:] の終わりを今月へ延ばす・開始は残す）を月次レビュー手順8に入れた。月間は「今月やりうるカードの一覧」で容量計画ではなく、週間は重要度と期日で選ぶ。月間・週間の枚数に上限や過積載警告を足さない。時期を過ぎたカードは削除（完了）か翌月へ回すだけ。関連: [[project_nsm]]
