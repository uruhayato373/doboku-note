---
name: reference_partial_clone_repack_hazard
description: git の重い/壊れる操作の罠。push を失敗しうる手順に ; で繋ぐ・zsh の単語分割、blob:none partial clone の rev-list/log -M/repack -a、gc --prune=now 中の commit 破損、日付をgit履歴から導出しない（frontmatter真実源）
metadata:
  node_type: memory
  type: reference
  originSessionId: dbedeb81-cdb5-44da-b970-0513ad32e184
  modified: 2026-10-06T11:35:29.325Z
---

`doboku-note` のローカル `.git` は **`blob:none` の partial clone**（`remote.origin.promisor=true` / `partialclonefilter=blob:none`）。普通の clone と挙動が違い、肥大化を直しに行くと逆に壊す罠が 3 つある。

**罠1: `git rev-list --objects --all` を素で回すと履歴を再ダウンロードする。**
欠損 blob を promisor remote から遅延取得しに行くため、`.git` が膨らむ。2026-08-21 の DN-0111 Phase 0 実査で実際に promisor pack を 266 個増やして確認した。履歴走査は必ず **`--missing=allow-any`** を付ける（欠損を欠損のまま数える）。素で回すと 5 分でも終わらないのは「遅い」のではなく「DL している」。

**罠2: `git repack -a -d` は到達可能な commit を落とすことがある。**
2026-08-21 に pack 12.01GiB → 6.52GiB（1002 pack → 3）へ縮んだ一方、**到達可能だった commit 21 個が読めなくなった**。repack 前の `cat-file --batch-all-objects` 出力に 21 個すべてが載っていたことで「元から欠損」ではなく repack が落としたと確定。git 2.44 の man は「promisor packfile は別 pack へ repack される」と書くが、promisor pack 内の到達可能 commit が取りこぼされる。`git log` の親辿りが `fatal: Failed to traverse parents` で止まる形で表面化する。

**罠3: `git log --name-status -M` は履歴の blob を丸ごと落としてくる。**
`-M` の既定は類似度 50% の**非厳密**リネーム検出で、blob の中身を読んで比較する。partial clone では
これが全 blob の遅延取得になる。2026-08-21 実測——新規 partial clone で `npm run build` を回したら、
`.claude/scripts/lib/git-dates.mjs` のこの 1 コマンドだけで `.git` が **969 MB → 7.0 GB**、
13 分間 CPU 1% のまま downloading を続けた（partial clone にした意味が最初の build で消える）。

**`-M100%`（厳密一致のみ）に変えれば blob の OID 比較で済む。** `GIT_NO_LAZY_FETCH=1` を付けて
完走すれば「blob を読んでいない」ことの決定的な証明になる（`-M` は同条件で失敗するか .git が膨らむ）。
精度差は実測して判断すること: doboku-note では content/site の MDX 1,117 件のうち
**dateModified は全件一致**、created が 22 件だけ 12 日ずれた。

**遅い ≠ 重い。partial clone で CPU 1% のまま進まないコマンドは、たいてい DL している。**

**それでも repack する場合の手順**（12GiB の約半分はパック間の重複格納なので、効果自体は大きい）:

1. 未 push commit を `git bundle create <外部dir>/x.bundle origin/develop..develop` で退避（origin に無いものは repair 経路が無い）
2. `git cat-file --batch-all-objects --batch-check` を **repack 前に**保存（後で「元から欠損」と切り分ける唯一の証拠になる）
3. `git repack -a -d`
4. **必ず** `git fsck --connectivity-only --no-dangling` → `error: Could not read <sha>` を全部拾う
5. 欠損 sha は `git cat-file -t <sha>` で 1 つずつ叩くと promisor 経路で取り戻せる（`git fetch origin <sha>` は `did not send all necessary objects` で失敗する）
6. `git reflog expire --stale-fix --all` と `git read-tree HEAD` で reflog と index cache-tree の壊れ参照を掃除
7. 合格条件は `git rev-list --all --count`（`--missing` 無し）が fatal 無しで通ること・`fsck` errors 0・古い commit の blob が読めること

`git gc` の自動実行（`-a` 無しの incremental repack）ではこの事故は起きていない。**危ないのは `-a`**。

関連: [[reference_shared_worktree_autostash_hazard]] / [[project_asset_audience_routing]]

---

## git gc --prune=now 中の commit で tree 欠損

このリポジトリで `git gc --prune=now` を**バックグラウンド実行したまま commit すると、その commit の tree オブジェクトが欠損して破損する**（2026-07-27 実際に発生）。`--expire now` は mtime の猶予期間を無効化するため、gc が到達可能性を走査した**後**に作られたオブジェクトが「到達不能」と誤判定されて即削除される、Git 公式が警告する競合そのもの。

**症状**: commit 自体は成功するが `fatal: unable to read tree <sha>` が出る。`git fsck` で `missing tree` / `broken link from tree` / `invalid sha1 pointer in cache-tree of .git/index`。`git ls-tree -r <commit>` が失敗する一方、親コミットと blob は無傷。

**復旧**（今回これで完全復旧・fsck クリーン）:
1. 走行中の `git gc` / `git prune` プロセスを kill（それ以上の削除を止める）
2. 編集済みファイルをスクラッチパッドへ退避（作業ツリーは無傷なので実体はここに残っている）
3. `git reset --mixed <親コミット>` — 作業ツリーは触らずブランチと index だけ戻す
4. 同じ内容で commit し直す → **欠損 tree が同一ハッシュで書き直され破損が解消する**
5. `git fsck` で clean を確認してから push

**予防**: gc は前景で完走させ、その間そのリポジトリで一切の git 操作をしない。10 GiB 級で数分〜十数分かかるので「待つのが面倒でバックグラウンド化」が事故の入口。並行セッションが常態のリポジトリでは、そもそも gc 実行前に他セッションの不在を確認する（[[feedback_multi_session_concurrent_git]]）。

**関連**: Bash ツール（Git Bash）で PowerShell の here-string `@'...'@` を使うと `@` がコミットメッセージに混入する。複数行メッセージは Write でファイル化して `git commit -F` を使う。

---

## 記事日付の真実源は frontmatter（git log 由来にしない）

サイトの日付（sitemap `lastmod` / JSON-LD `datePublished` / RSS）は
**frontmatter の `created` / `dateModified` が真実源**（2026-08-22 に反転）。
書き込むのは pre-commit の `backfill-mdx-dates.mjs --staged`、
検査は `npm run check-mdx-dates`（quality:audit:ci）。
**ビルドは git 履歴に触れない**（`loadGitDates` は欠落時だけの遅延ロード）。

**なぜ git 由来ではいけないか。** 以前はビルド時に `git log` から引いていた。
理由は妥当で「誰も frontmatter を更新しない」（反転前の実測: 1,117 件中 1,040 件が
中央値 49 日ズレ、30 日超が 867 件）。だが副作用が大きすぎた:

- **公開 SEO 信号がリポジトリ基盤に依存する。** リネーム・移行・履歴書換え・squash の
  たびに 1,117 ページの日付が黙って動く。2026-08-18 の情報アーキテクチャ移行で
  全 1,084 記事の dateModified が created まで巻き戻った
- **ビルドが全履歴を要求する。** shallow clone 不可。partial clone では
  `git log --name-status -M` が履歴の blob を丸ごと落とし `.git` が 969 MB → 7.0 GB
- 回避のため `-M100%` へ落として 22 記事の created が 12 日ずれた
- 履歴の切り詰めができない

**一般化**: 公開される出力を、リポジトリ基盤（履歴・mtime・ブランチ構造）から
導出しない。「コンテンツが古びる」なら **commit 時に書き込む仕組み**を作る。
毎回インフラから作り直すのは、正しさと引き換えに脆さを買う取引になる。

**検証の型（これは他でも使える）**: リファクタ前後で出力が変わらないことを、
**未コミット状態**で証明できる。frontmatter を書き換えても commit しなければ
`git log` は旧値を返すので、同一ツリーで「旧ロジック（git）」と「新ロジック（frontmatter）」を
走らせて diff できる。実際 sitemap.xml / feed.xml / atom.xml は 1 行の差も無く一致した。
旧実装は `git show HEAD:path/to/script.mjs > path/to/.old-script.mjs` で
**同じディレクトリに置く**（相対 import を解決させるため）。

**落とし穴**: gray-matter は YAML の裸の日付を `Date` にパースする。
`toISOString()` をそのまま使うと `2026-05-16` が `2026-05-16T00:00:00.000Z` になり、
書式が全ページで変わる。日付キーは `.slice(0, 10)` で `YYYY-MM-DD` に揃えること。

関連: [[reference_quality_audit_system]] / [[reference_partial_clone_repack_hazard]] / [[project_asset_audience_routing]]

## push を失敗しうる手順に `;` で繋がない（2026-10-06）
feature ブランチを最新 develop へ載せ直すとき、`git reset --keep origin/develop && git cherry-pick $C ...; git push --force-with-lease ...` と書いて 2 回事故った。
1. **zsh は未クォート変数を単語分割しない**: `C=$(git rev-list ... | tr '\n' ' ')` を `git cherry-pick $C` に渡すと SHA 4 本が 1 引数になり `fatal: bad revision`。bash の感覚で書かない（SHA は直書きするか `${=C}`）。
2. **`;` の後の push は前の失敗を無視して走る**: cherry-pick が失敗したまま、ブランチが develop と同じ状態で force push した → GitHub は head＝base になった PR を**自動で閉じる**（`gh pr reopen` で戻る）。1 回目も `git rebase`（作業ツリーの他人の変更で拒否）の失敗後に `&&` の手前で `| tail -1` を挟んだため、tail の成功で push まで進んだ。
- **How to apply:** 載せ直し → 検証 → push は別の呼び出しに分け、push の前に「元の範囲と同じパッチか」（`diff <(git diff <元の base> <元の head>) <(git diff origin/develop HEAD)`）を見てから押す。`| tail` で失敗を飲み込む位置に `&&` を置かない。作業ツリーに他人の変更があると `git rebase` は拒否するので `git reset --keep` + `git cherry-pick <sha...>` を使う（stash は共有なので使わない）。
3. **commit の失敗も同じ（2026-10-06 3 回目）**: `git commit ... ; echo rc=$?; ... c=$(git rev-parse HEAD); git reset --keep origin/develop && git cherry-pick $c` と書き、lint-ja で commit が止まったのに載せ直しへ進んだ。`c` は既に push 済みの 1 つ前のコミットになり、空の cherry-pick が途中で止まった（ステージした変更はアンステージされ作業ツリーには残った）。後始末は作業ツリーに触れない `git cherry-pick --quit`（`--abort`/`--skip` は reset を伴う）。**載せ直しは commit の成功（rc=0 と新しい sha）を確かめた次の呼び出しで、sha を直書きして行う**。


## 共有の .git/shallow が突然できて「unrelated histories」になる（2026-10-09）

- **現象**: PR ブランチへ develop を merge しようとして `fatal: refusing to merge unrelated histories`。`git rev-list --count HEAD` が 1 で、`git rev-parse --is-shallow-repository` が true。共通の `.git/shallow` に PR の先頭コミット 1 行が書かれていた（06:06 作成。作った操作は未特定。自分の Bash 履歴に `--depth` は無く、並行の workflow の担当か、アプリの PR 監視の可能性）。
- **見分け方**: `git cat-file -p <そのコミット>` の parent が手元にあれば、履歴は失われていない（記録だけが誤り）。
- **直し方**: `git fetch --unshallow origin <ブランチ>` で `.git/shallow` が消える。ファイルを手で消さない。
- **How to apply:** merge・rebase が「無関係な履歴」で止まったら、まず `--is-shallow-repository` と `.git/shallow` を見る。履歴を作り直す・force push で直そうとしない。
