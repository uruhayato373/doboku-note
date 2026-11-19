---
name: feedback_cli_import_executes
description: scripts/ の CLI を「読み込めるか」の確認で import しない（トップレベルで実行が始まり、ログイン済みブラウザまで起動する）
metadata:
  type: feedback
---

scripts/ の CLI（note-*・coconala-*・kdp-* など）を、書き換え後の確認として `node -e "await import('./scripts/x.mjs')"` で読み込まない。ESM の CLI はトップレベルに処理を書いているので、import した瞬間に実行が始まる。

2026-11-19、note-* 16 本の起動ブロックを共通部品へ置き換えた後、読み込み確認のつもりで 16 本を import した。15 本は必須の引数が無く起動前に止まったが、`note-account-name.mjs` はログイン済みの note プロファイルで Chrome を開き、`settings/account/nickname` まで進んだ（既定が dry-run だったので書き込みは無し。閲覧履歴とプロファイルの更新時刻で確かめた）。`--commit` を既定で持たない書き込み系なら、そのまま note を書き換えていた。

**Why:** 「読み込めるか」を確かめる手段が、副作用のある実行と同じになっている。書き込み系 CLI は既定 dry-run が多いが、全部ではない。

**How to apply:**
- 構文は `node --check <file>`、未定義の参照は `node --test tests/scripts-no-undef.test.mjs`。CLI 本体は import しない
- 挙動を確かめたいときは、そのスクリプトの dry-run の引数を明示して 1 本だけ実行する（ログインを伴う CLI はユーザーに知らせてから）
- 誤って起動したら、プロファイルの閲覧履歴（Default/History をコピーして sqlite3 で visits を読む）で何をしたかを確かめて報告する

関連: [[feedback_verify_your_excuses]]
