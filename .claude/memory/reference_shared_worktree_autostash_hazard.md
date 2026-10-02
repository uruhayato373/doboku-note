---
name: reference_shared_worktree_autostash_hazard
description: "git worktree 運用の罠一式。共有.gitのautostash巻き込み・main派生の重複作業・フック鮮度の偽陽性・Bashガード・node_modules/生成物欠落・Turbopack symlink拒否(--webpack)・next dev 1dir1プロセス"
metadata:
  type: reference
---
複数worktreeが共有 `.git`（`.git/worktrees/<name>`）を持つ本プロジェクトでの、2026-07-15 に実際にぶつかった2つの非自明ハザード。[[feedback_session_start_git_sync]] [[feedback_multi_session_concurrent_git]] と同系統（§1/§10 の具体例）。

**1. `git stash` / `git checkout <other>` は別セッションの autostash を巻き込む**
- stash entry は共有 `.git` にグローバル保存される。別セッションの `rebase --autostash` 等が残した `stash@{0}: autostash` が存在する状態で、自分の worktree で（clean tree に対し無害のつもりで）`git stash` → `checkout origin/develop` → `checkout 戻る` → `git stash pop` すると、**その autostash（他人の textbook PNG 群等）が自分の作業ツリーに pop され binary CONFLICT**。
- 復旧: `reset --hard` は使わず（ユーザー拒否・§10）、混入は特定ディレクトリに限局するので `git -c core.quotepath=false checkout HEAD -- "<混入dir>/"` で外科的に戻す。**stash は drop せず温存**（所有セッション用）。pop はコンフリクト時 stash を保持するので list に残る。
- 教訓: worktree での状態確認に `git stash`/`checkout <branch>` を安易に使わない。ブランチ横断の中身確認は `git show <ref>:<path>` / `git diff <ref>` で済ませる（checkout 不要）。

**2. worktree の派生元が `main` だと develop の note ゲートを欠く→重複作業**
- 会社運用は content が `develop` に蓄積・`develop→main` は deploy 時のみ。worktree が `main`（deploy commit）派生だと `origin/develop` に十数コミット遅れ、**develop にある note-lint rule8（notePricing:free の200字段落BLOCK・`SKIP_NOTE_PARA`）/rule9（複数行blockquote BLOCK・`SKIP_NOTE_BQ`）・lib/note-cardify・段落バーンダウンを丸ごと欠く**。旧ゲートしか通らないコミットを量産し、並行セッションが develop で既に済ませた記事と重複・乖離した（一般部門との違い＝develop側が別 utmCampaign で完了済み）。
- 着手前チェック: note コンテンツ作業は `git rev-list --count HEAD..origin/develop` と `git merge-base HEAD origin/develop` で develop 基盤か確認。遅れていれば `git rebase --onto origin/develop <自分の最初のcommit^>` で載せ替え、develop 側が既に触ったファイルは競合時 `git rebase --skip`（develop 版採用）。段落標準は reflow `--target 120`（§14-e）で rule8(200) も自動充足。

---

## 共有 .git/hooks の鮮度チェック偽陽性

pre-commit の先頭にある「フック鮮度チェック」（`HOOK_HASH_INSTALLED` と
`scripts/install-pre-commit.mjs` の `HOOK_CONTENT_BODY` ハッシュを比較）は、
**worktree 間で偽陽性を出す**。`.git/hooks` は全 worktree で共有される一方、
比較対象の install スクリプトは各 worktree の CWD から読まれるため。

**罠**: 別セッションがフックに新ゲートを追加して install 済みだと、こちらの
（古い）ブランチでは「導入済みフックが古い」と出て commit が止まる。実際は
**installed 側の方が新しい**。ここで指示どおり `npm run pre-commit:install` を
実行すると、相手の未コミットの進行中ゲートを共有フックから剥がしてしまう。

**確認方法**: `grep -c "<新ゲート名>" $(git rev-parse --git-common-dir)/hooks/pre-commit`
と、両 worktree の `scripts/install-pre-commit.mjs` を diff する。相手の版が
superset なら installed が新しい＝偽陽性。

**対処**: 鮮度チェックだけを飛ばす env var は無い（個別ゲートの SKIP_* しか無い）。
フック本体を鮮度チェック抜きで手動実行して全ゲート通過を確認してから
`git commit --no-verify` し、**理由を commit message に明記する**。

```
HOOK=$(git rev-parse --git-common-dir)/hooks/pre-commit
tail -n +20 "$HOOK" > /tmp/hook-body.sh && sh /tmp/hook-body.sh
```

相手の worktree にしか無いスクリプトを呼ぶ行は落ちるので、その分は除いて回す。
共有 .git の別の事故は [[reference_shared_worktree_autostash_hazard]]。

**2026-10-02 以降（DN-0506・PR #842）**: `pre-commit:install` は「導入済み＝origin/develop の版で、自分のツリーの版が develop の過去版」のとき上書きを拒否する（`--force` で回避・`npm install` の prepare では止めない）。鮮度ガードも installed が develop と同じなら「ツリーに develop を取り込め」と案内する。ゲートを足している途中（develop に無い版）は従来どおり入る。フックは一時ファイル→rename で置き換わるので、実行中のシェルが壊れない。

**再発（2026-08-26）**: `node scripts/install-pre-commit.mjs` は `--help` 等の
フラグを一切見ず、引数の有無に関わらず即座に上書き実行する（dry-run が無い）。
「中身を確認するだけのつもり」で実行しても即座に共有フックが書き換わる。
確認は必ず先に diff（上記「確認方法」）で行い、install スクリプト自体を試し打ちしない。
このときは develop 側 worktree から re-install して復旧できたが、develop 側の
worktree が存在しない・特定できない状況では復旧手段がない点に注意。

---

## EnterWorktree セッションの Bash 拒否

EnterWorktree（`.claude/worktrees/<name>`）で作業中、Bash ツールは「git 操作が自分の worktree に留まるか検証できない」コマンドを拒否する。実測（2026-09-08）: heredoc（`cat > f <<'EOF'`）、`for` ループ、`sed -n "${n}p"` のような変数展開、`grep "Git ..."`（文字列に git を含む）はすべて拒否。`;` `&&` で繋いだ単純コマンドと `node <file>` は通る。

**How to apply:** 生成・一括処理は scratchpad に `.mjs` を Write してから `node` で実行する。grep のパターンに "git" を含めない。worktree は `EnterWorktree` の既定 base が origin/main なので直後に `git merge --ff-only origin/develop`、`ln -s <本体>/node_modules node_modules`（memory: worktree-dev-turbopack-symlink）。

**rules の条件付き読み込みを機械で証明する方法:** 同一セッションでは `.claude/rules` を後から作っても載らない（起動時に発見）。`claude -p "<content/site と src の file を Read させる指示>" --model haiku --permission-mode bypassPermissions --settings '{"hooks":{"InstructionsLoaded":[{"hooks":[{"type":"command","command":"cat >> <log>"}]}]}}'` を実行すると、log に `file_path` が CLAUDE.md → 該当 rule の順で記録される（v2.1.197 で動作確認）。自己申告でなく hook のログで判定する。

---

## worktree の環境欠落と CRLF テスト（Windows 時代の実測）

worktree で検証を回すときの3つの罠:

1. **node_modules 欠落による大量偽失敗（2026-08-28 実測）**: 新規 worktree には node_modules が無く、tsx 経由のテスト（admin系・renderSlide系など）が約53件まとめて落ちる。純 node:test は通るので「一部だけ大量に赤い」形になる。対処は `cmd /c mklink /J <worktree>\node_modules %USERPROFILE%\doboku-note\node_modules` で本体を共有。**検証後は必ず `rmdir` でリンクだけ外す**（junction を残すと worktree の再帰削除が本体 node_modules の実体を巻き込むリスク。[[reference_shared_worktree_autostash_hazard]] と同系）。

2. **autocrlf の CRLF が `\n` 固定 regex テストを壊す（2026-08-28 実測）**: リポジトリ blob は LF でも Windows 作業ツリーは CRLF になるため、ソースを readFileSync して `\n` アンカーの regex で照合するテストは Windows でだけ落ちる（Linux CI は緑）。同様に `join()` は `\` 区切りを返すので `replace(REPO_ROOT + '/', '')` 型のパス相対化も Windows で無効。テストは EOL 正規化、パス表示は `/` 区切りへの明示正規化で書く（PR #476 で2件修正済み）。

3. **gitignore された生成物も欠落する（2026-09-07 実測）**: `src/config/doc-meta-index.json` は生成物で追跡外のため新規 worktree に存在せず、**pre-commit フック（check-x-campaign-plan 等）と type-check が ENOENT で即死する**。実装と無関係の偽赤なので、本体からコピーして環境を揃える（`cp` で `src/config/` へ置くだけ。gitignore 対象なのでコミットには入らない）。`refresh-indexes` を回す必要はない。

**診断の順番**: ローカルの赤と CI の赤は同じとは限らない。まず CI ログで unit-tests の PASS/FAIL を確認し、Windows 限定か切り分けてから直す。**worktree で落ちたときは、まず「本体では通るか」を確かめる**（1〜3 はすべて worktree 固有の環境欠落で、コードは正しい）。

---

## node_modules symlink で Turbopack が落ちる→--webpack

git worktree（`git worktree add <dir> -b <feat> origin/develop`）は `.git` を共有するが node_modules（gitignore）は持たない。同コミットなら `ln -s ../doboku-note/node_modules node_modules` で共有可。

**罠**: Next.js 16 の Turbopack（既定の `next dev` / `next build`）は symlink な node_modules を `Symlink [project]/node_modules is invalid, it points out of the filesystem root` で**FATAL拒否**する。tsc(type-check)/eslint(lint)/node test は symlink を問題なく解決するので気づきにくい。

**回避**: `npx next dev --webpack -p <port>` / `npx next build --webpack`。webpack は symlink を解決する。本番CIはTurbopackなので、worktree検証はwebpackでも本筋の検証になる（SSR描画・静的生成は同等に通る）。

**dev検証手順**: worktree で webpack dev を別ポート起動→`curl --retry-connrefused --retry N` で各ルート 200/`<main>`1個/breadcrumb 確認。macに `timeout` 無し→background実行＋curlリトライで待つ。Playwright screenshot は MCP cwd=メインrepo に出る（`/Users/minamidaisuke/doboku-note/*.png`）ので確認後に rm。

初出 2026-06-27 [[project_svg_figure_governance]]。

---

## admin-app を worktree で next dev 検証（Windows junction 版）

`tools/admin-app`（Next.js 版管理画面）を **git worktree 内で `next dev` 検証**しようとすると Turbopack が落ちる:

```
FATAL ... Symlink [project]/node_modules is invalid, it points out of the filesystem root
```

原因: `next.config.mjs` の `turbopack.root` が app の 2 階層上（= worktree ルート）に固定される。worktree には実体 node_modules が無いので親リポの `node_modules` へ **junction（`mklink /J`）** を張るが、その junction 先が turbopack.root の外を指すため Turbopack が拒否する。

回避策（検証時のみ・commit しない）:
- worktree の `next.config.mjs` で `repoRoot` を **共通親（3 階層上 = `%USERPROFILE%`）** に一時的に広げる → junction 先がルート内に入り起動する。検証後 `git checkout -- next.config.mjs` で戻す。
- 本番 `npm run admin`（:3021）は**メインリポで実行すれば実体 node_modules・turbopack.root=リポルートで正常**。この問題は worktree 検証固有。

補足: junction を消すときは必ず `cmd /c rmdir <link>`（reparse point だけ削除）。`rm -rf` や `git worktree remove` が junction を辿ると**親リポの node_modules 本体を消す危険**があるため、worktree 削除前に junction を先に外す。

関連: [[feedback_multi_session_concurrent_git]]（複数セッション常態下では admin 作業も worktree 隔離が安全）

---

## Next 16 は同一 dir の dev server を 1 つしか許さない

Next 16 (Turbopack) は **同一プロジェクトディレクトリに対する `next dev` を 1 プロセスしか許さない**。別ポートを与えても Ready 表示の直後に `⨯ Another next dev server is already running.` で落ちる（`.next/dev` の単一プロセスロック・PID と既存 URL を出して終了）。

**帰結**: 並行セッションが `tools/admin-app` の dev server（:3021）を持っているとき、こちらのセッションが自前の admin server を持つことは**できない**。`autoPort: true` を launch.json に足しても解決しない（ポート競合ではないため）。動かない起動経路を launch.json に残すと次に触る人を誤らせるので、追加したら撤回する。

**正しい対処**: `preview_start({url: "http://127.0.0.1:3021/..."})` で**既存サーバーにタブを向ける**（サーバーを起動せずブラウザタブだけ開く）。検証はこれで足りる。

**もう1つの罠**: `npm run admin` は先頭で `node scripts/kill-port.mjs 3021` を実行する。そのまま叩くと**別セッションの admin server を問答無用で殺す**。並行時は絶対に実行しない。

admin が 3021 に縛られる理由は OAuth/webhook/CORS ではなく、`playwright.admin.config.ts` の baseURL と webServer、および手順書が 3021 前提であること。

関連: [[feedback_multi_session_concurrent_git]] / [[reference_shared_worktree_autostash_hazard]]

## worktree で dev 検証するときの preview 起動（2026-10-02 実測・Mac）
`preview_start` は**本体の** `.claude/launch.json` しか読まない（worktree 側に足しても "No server named"）。`npm run dev` は predev で `kill-port 3020` を実行し**別セッションの dev を殺す**ので使わない。本体の launch.json に一時エントリ `{"runtimeExecutable":"bash","runtimeArgs":["-c","cd <worktree> && exec npx next dev --webpack -p 3031"],"port":3031}` を足して起動し、検証後に必ず削除する（diff が空に戻ることを確認）。
