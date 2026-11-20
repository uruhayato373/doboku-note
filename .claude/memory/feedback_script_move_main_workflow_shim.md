---
name: script-move-main-workflow-shim
description: スクリプトを移動・改名・削除するときは、main の定義で develop を checkout する定期ワークフローと Mac に導入済みの写しが旧パスを呼ぶ。転送を残して 2 段で消す（2026-11-19）
metadata:
  type: feedback
---

スクリプトの移動・改名・削除は、develop へのマージだけでは終わらない。定期実行のワークフローは定義が main・checkout が develop のものが 16 本あり、main へ deploy するまで main の定義が旧パスを develop のツリーで呼ぶ。Mac の `~/Library/Application Support/doboku-note/weekly-review.sh`（`npm run weekly-review:install` が置く写し）も旧パスを持つ。

**Why:** 2026-11-19 に `.claude/scripts/`（153 ファイル）を `scripts/` へ集約したとき、調査の途中で気づいて旧パスに転送 9 本を残した。気づかなければ deploy まで index-coverage・fetch-metrics などが落ちていた。あわせて、置き場が 2 つあった間は検査の対象から漏れていた違反（絶対パス直書き・レビュー配線の漏れ・CodeQL の正規表現）が、移した途端に 6 件出た。worktree では `kindle-epub-leak`（EPUB が無い）と管理画面の tsc（増分キャッシュが無く 2GB で落ちる）が環境のせいで赤くなる。

**2026-11-20 の追記（scripts/ 直下 659 本を 5 PR でフォルダに分けたとき）:** main のワークフローのほかに、Mac の launchd も旧パスを呼ぶ。`scripts/scheduled/gsc-indexing-daily.sh`（毎朝 7:40）は元の checkout の古い版のまま、origin/develop に合わせた worktree で CLI を呼ぶので、版がずれる（`check-main-workflow-paths` は見ない）。逆に `weekly-review.sh` は origin/develop の版を毎回取り、失敗の通知だけ `$REPO`（古い checkout）で回す。どちらも「スクリプトの版」と「実行するツリーの版」が別なので、移すたびに `scripts/scheduled/*.sh` が呼ぶパスを両方の版で確かめる。もう一つ、移したファイルは CodeQL が全行を新規として見るので、もとからあった警告（不完全な除去・シェルの組み立て・正規表現の注入）が PR で赤になる。正規表現の置換による除去は `scripts/lib/strip-markup.mjs` の 1 回走査に置き換える（テストの基準に正規表現を置いても止まる）。

**How to apply:** 移す前に `npm run check-main-workflow-paths` を回し、`scripts/scheduled/*.sh` が呼ぶパスも見る（CI ゲート。main の定義が呼ぶパスが消えると赤）。赤なら旧パスに「新パスを子プロセスで呼ぶだけ」の転送を残し、main へ deploy と `weekly-review:install` の回し直しのあとで消す。許可リスト（information-architecture.json の allowlist）は空を保つテストがあるので、転送を禁止ルートの例外にはできない。置き場を並べて書いた一覧（`['scripts', '…']`）は移動のたびに直す対象になるので、新しく足さない。関連: [[feedback_deploy_discipline]]・[[reference_ci_quality_gate_fixes]]
