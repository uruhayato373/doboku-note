# Playwright 認証プロファイル運用（doboku-note）

SNS・販売・計測サービスの Playwright ログインを、worktree や OS に依存せず再利用するための運用 SSOT。
保存先の計算は `scripts/lib/playwright-auth-profile.mjs`、サービス一覧は
`.claude/config/playwright-auth-profiles.json`、人が使う入口は `/playwright-auth` と `auth:*` CLI が担う。

## 保存先

すべてのサービスは `DOBOKU_AUTH_ROOT` があればその絶対パス、なければ次の OS 標準ローカル領域を使う。
リポジトリ、worktree、クラウド同期フォルダ、home 直下は保存先にしない。

| OS | 既定 auth root |
|---|---|
| Windows | `%USERPROFILE%\.local\state\doboku-note\playwright-auth`（2026-09-14 まで `%LOCALAPPDATA%\doboku-note\playwright-auth`） |
| macOS | `~/Library/Application Support/doboku-note/playwright-auth` |
| Linux | `${XDG_STATE_HOME:-~/.local/state}/doboku-note/playwright-auth` |

auth root の下は `profiles/`、`states/`、`locks/`、`metadata/` に分ける。Cookie や storageState は
PC ごとに独立保持し、Windows と Mac の間でコピー・Git・OneDrive・iCloud・Dropbox 同期をしない。

> [!warning]
> Windows の既定を AppData の外へ移した理由（2026-09-14）: `%LOCALAPPDATA%` は MSIX アプリ
> （ChatGPT/Codex）の中から書くと `%LOCALAPPDATA%\Packages\OpenAI.Codex_<hash>\LocalCache\Local\` へ
> 仮想化（リダイレクト）され、Claude Code や通常のターミナルからは見えない。実測で Codex が X に
> ログインしたプロファイルはサンドボックス側にだけあり、`.local` の旧コピーと二重になっていた。
> `~/.local/state` は仮想化の対象外なので Codex と Claude Code が同じ 1 本を使う。旧置き場は
> `auth:doctor` が「legacy %LOCALAPPDATA%」「Codex (MSIX) sandbox」として警告し、`auth:migrate` の移行元になる。

## サービスと例外

| service | profile | sessionMode | アカウント assert | 土曜の収集（`weekly-collect` の段） |
|---|---|---|---|---|
| `note` | `playwright-note-profile` | profile | note の `dobokunote` 表示 | auth・note-traffic・note-sales・note-live・note-sync |
| `coconala` | `playwright-coconala-profile` | profile | `config/coconala-account.json` | auth・coconala |
| `kdp` | `playwright-kdp-profile` | profile | KDP 本棚の実体 | auth・kdp |
| `x` | `playwright-x-profile` | profile | `config/x-account.json` | なし（SNS 保留。読み書きとも運営者の依頼時だけ） |
| `instagram` | `playwright-ig-bs-profile` | profile | `config/ig-account.json` | なし（同上） |
| `google` | `playwright-google-profile` | profile | GSC/GA4 の対象プロパティ | gsc |
| `a8` | `playwright-a8-profile` | profile-plus-state | メディア ID `a25050375786` | auth・a8 |
| `moshimo` | `playwright-moshimo-profile` | profile-plus-state | `config/affiliate-asp.json` | なし（doboku-note に広告が無い・DN-0643） |
| `afb` | `playwright-afb-profile` | same-process | ASP site guard | なし（同上） |

A8 は揮発性 Cookie のため `states/playwright-a8-state.json` の再注入を併用する。afb は保存 state を
別プロセスで再利用できない場合があるため、ログインから操作まで同一プロセスで完結させる。
A8 のヘッダーに表示される代表サイト名はサイト切替ではない。口座をメディア ID で assert し、
doboku-note への帰属はレポート単位で分ける。

> [!warning]
> Gmail は Playwright の対象外。Google の自動化検知を回避せず、メール参照は Gmail コネクタを使う。
> 接続先に含まれない宛先の検索 0 件を「メールなし」と判定しない。

## 標準操作

最初にパスとローカル状態を確認する。

```bash
npm run auth:paths -- --service note
npm run auth:doctor -- --service note
```

旧 `.local/playwright-*-profile`・Windows の旧 `%LOCALAPPDATA%` root・Codex(MSIX) サンドボックスに
プロファイルがある場合は、サービス単位で dry-run してからコピーする。候補が複数あれば **Cookie DB が最新の
ものを運び**、他は `skippedSources` に出す。コピーは **キャッシュ（`PROFILE_CACHE_SUBDIRS`＝Cache / Code Cache /
GPUCache / Service Worker …）を除外**する（Windows 実測: X 1.4GB → 56MB）。
移行先が既に存在する、lock がある、Chrome が使用中のときは中断する。旧 source は自動削除しない。

```bash
npm run auth:migrate -- --service note
npm run auth:migrate -- --service note --commit
```

ログインが必要な場合は headed Chrome を開き、password・2FA・CAPTCHA は人が入力する。ログイン後は
別プロセスの read-only status で、実ページと account/site/property assert が一致したときだけ
`authenticated` とする。profile ディレクトリの存在だけでは認証済みと判定しない。

対話用の `auth:login` は、本人確認画面を検出してもブラウザを閉じず、待機期限まで人の操作を待つ。
本人確認中に自動で入力・クリック・別ページへの移動は行わない。確認が完了しなければ
`blocked` のまま終了し、認証成功として扱わない。read-only の `auth:status` は従来どおり
`blocked` を即時に返す。

```bash
npm run auth:login -- --service note
npm run auth:status -- --service note
```

複数サービスを同時に同じ profile で開かない。投稿・公開・申請・購入・価格変更は各サービスの
operator/skill が持つ dry-run→`--commit` ゲートに従い、認証 CLI からは行わない。

## 実機検証

新しい PC を運用へ入れるときは、同じ commit 候補で独立検証する。両 PC 間で profile を
共有せず、それぞれ `paths`→`doctor`→note login→別プロセス status→Chrome 再起動後 status を行う。
本体 checkout と worktree のどちらからも同じ OS 標準 root へ解決することを確認する。

### Mac（2026-09-05）

- root: `~/Library/Application Support/doboku-note/playwright-auth`
- note の旧 `.local/playwright-note-profile` を service 単位でコピー。旧 source は保持
- `auth:doctor`: root 読み書き可、lock なし
- 別プロセス `auth:status`: `authenticated`、account assert 一致
- その profile で note L1/L2 4記事を更新し、全件で `account gate OK (dobokunote)` と公開 API 検証を確認

### Windows（2026-09-07）

- root: `%LOCALAPPDATA%\doboku-note\playwright-auth`
- 旧 `.local/playwright-*-profile` の 10 サービスを service 単位で dry-run→`--commit` でコピー（約 2.0GB・旧 source は保持）
- `auth:doctor`: root 読み書き可、lock なし、10 サービスすべてで profile 存在
- note: 別プロセス `auth:status` が 3 回とも `authenticated`（account assert 一致）。Chrome 再起動後も同じ
- worktree 非依存: リポジトリ外（`C:\tmp\...`）の cwd と worktree から実行しても同じ OS 標準 root へ解決し、
  その profile で `check-note-attachments --live` が著者ログイン状態のまま有料エリアを実査できた
- 状態の内訳（2026-09-07 実測・再ログインは行っていない）:

  | 分類 | service |
  |---|---|
  | `authenticated` | note / coconala |
  | `expired`（次に使うとき人が再ログインする） | kdp / x / instagram / google / a8 / moshimo |
  | `unsupported`（設計どおり） | afb |

> [!note]
> この表は当初 google / x を `unknown` と記録していたが、原因は**判定側**にあり、実体は
> ログアウト済みだった。同日に 2 つ直している。
>
> - `status` が goto 後に 1 回 1.5 秒待って 1 回だけ判定していた。note は 4 回目（約 6 秒）で
>   account marker が出るため、`--all` では `unknown`・`--service` では `authenticated` と結果が
>   割れていた → `unknown` のときだけ待ち直す poll にした（`authenticated` / `expired` /
>   `blocked` は決着済みなので即返す）
> - ログアウト判定が URL の redirect だけを見ていた。google は `/search-console/about` へ退避、
>   x は `x.com/` でパスワード欄を出すため、どちらも redirect パターンに当たらなかった →
>   パスワード欄・ログアウト表示・GSC の about も見る
>
> **`unknown` は「まだ判定できていない」であって「ログアウト」ではない。** account marker が
> 出ているページにパスワード変更欄があっても `expired` にしない（note の `/settings/account` が
> まさにその形で、判定順を誤ると認証済みを未ログインと呼ぶ）。

Windows と Mac の双方で note の別プロセス再利用・worktree 非依存を確認済み。

## 省メモリ起動と起動ガード（2026-09-14）

全 `launchPersistentContext` は `scripts/lib/playwright-launch.mjs` の `leanContextOptions({...})` で options を包む
（認証 CLI の login/status だけは人が操作する短命プロセスなのでガード無しの `mergeLeanOptions`）。

- **キャッシュを持たない**: `--disk-cache-size=1` `--media-cache-size=1` `--disable-gpu-shader-disk-cache` と
  `serviceWorkers: 'block'`。ログインに要るのは Cookie・Local Storage の数十 MB で、Service Worker の
  CacheStorage（X で 767MB）や Code Cache は SNS/管理画面の操作に要らない。サイトが SW を要求したら
  `DOBOKU_PW_ALLOW_SW=1`
- **空きメモリガード**: 利用可能メモリ < 2GiB なら起動を見送る（`LaunchGuardError` / `LOW_MEMORY`）。
  16GB 機で Claude Desktop・ChatGPT・Chrome と並走させて OS ごと固まった再発防止。閾値は
  `DOBOKU_PW_MIN_FREE_MB`、macOS は `vm_stat` の free+inactive+speculative で測る
- **同時 1 本ガード**: auth root 配下のプロファイルを使う Chrome が既に居れば見送る
  （`BROWSER_ALREADY_RUNNING`）。service lock はサービス単位なので、x と instagram の並走はこれで止める。
  意図して並走するなら `DOBOKU_PW_ALLOW_PARALLEL=1`、両方外すなら `DOBOKU_PW_SKIP_GUARD=1`
- 測れなかった（プロセス一覧・メモリが取れない）ときは止めない。残ったキャッシュは disk-hygiene の
  `playwright-cache` が日次で回収する（[disk-hygiene.md](disk-hygiene.md) §4・§8）

## セキュリティ

- `profiles/` と `states/` はログイン Cookie を含む。コミット、共有、ログ添付、クラウド同期をしない
- registry と metadata に password、Cookie、token、secret、2FA、recovery code を書かない
- ログやスクリーンショットへメールアドレス・氏名・token 付き URL を残さない
- 旧 profile の削除は自動化しない。新 root の再利用を一定期間確認してから人が処遇を決める
  （2026-09-14 Windows: 10 サービスを `~/.local/state` へ移行済み。`.local` と Codex サンドボックスの旧コピーは
  キャッシュだけ削って保持。`auth:status` で新 root の再利用を確認したら人が消す）


## 役割分担（人・Mac・CI）（2026-10-24 DN-0817）

ログインが要る処理は、運営者の Mac で週 1 回（土曜の週次レビュー前後）だけ回す。CI・Windows・他のセッションはログインしない。

| 担い手 | 受け持つこと |
|---|---|
| 人（運営者） | 初回ログイン・パスワードと 2 段階認証・CAPTCHA（`npm run auth:login -- --service <id>`）、OS の資格情報ストアへの ID/PW の登録、期限切れの再ログイン、古いロックを外す判断、GitHub Secrets `DOBOKU_AUTH_*` の削除 |
| Mac（launchd `com.doboku-note.weekly-review`・土 09:30） | `scripts/weekly-collect.mjs`。前段（`--phase pre`）でログイン確認・A8・KDP・note のアクセスと売上・ココナラ・GSC を集め（各段は取った記録の検算つき）、note の公開状態を公開 API で照合し（note-audit）、Claude の週次レビューを挟み、後段（`--phase post`）で note のライブ照合・note 同期・同期の照合を回す。結果は `.claude/state/weekly-collect/runs.json`、日々の死活は `npm run check-weekly-collect:alive`、段ごとの合否は `npm run check-weekly-collect`、赤は Issue（channel `weekly-collect`） |
| CI | ログインしない。resolver は CI では profile も state も返さない（`AUTH_CI_NO_LOGIN`）。公開 API・サイト・R2 だけを見る |
| 他のセッション | ログインして取りに行かない。収集の記録と最終取得日を読み、古ければ「未取得」と書く（下記） |

運営者が 1 段だけ取り直すときは、収集用 worktree（`.claude/worktrees/weekly-collect`）の端末で `node scripts/weekly-collect.mjs --only <段>`
（段 ID: `auth` `a8` `kdp` `note-traffic` `note-sales` `coconala` `gsc` `note-live` `note-sync` `note-sync-check`）。
全体の自動化は台帳 `config/automations.json`（管理画面 `/ops/mac`・`/ops/ci`・`npm run check-automations`）が正本で、概観は [04_自動化マップ.md](../../../docs/operations/04_自動化マップ.md)。

**エージェントのセッション（`CLAUDECODE=1`）の線引き**

- 読み取り専用の収集 script（`playwright-auth-profiles.json` の `services.<id>.collectors`）は、resolver がセッションでは profile を返さない（`AUTH_AGENT_COLLECT_REFUSED`）。土曜の収集が付ける `DOBOKU_WEEKLY_COLLECT=1` のときだけ通る
- 書き込み script（同 `writers`＝note の公開・ココナラの出品編集・KDP 提出・X 投稿など）は、運営者が頼んだときに限りセッションから既存の profile で動かしてよい。各 operator/skill の dry-run→`--commit` ゲートに従う
- `credential-store` はセッションでは資格情報ストアを読まない。`auth-session-refresh` は `agent_skipped`、note の売上ページの再確認は ABORT、ASP は未ログインのまま止まる（2026-10-01: エージェントが note の再確認とココナラの自動ログインを走らせた再発防止）
- 書き込みの途中でログインが切れていたら、運営者が `npm run auth:login -- --service <id>` で入り直す。セッションから資格情報で入らない

## 資格情報の正本（2026-10-01）

ログインが必要な全サービス（note・ココナラ・KDP・X・Instagram・Google・A8・もしも・afb）の ID/PW は、各 PC の OS 資格情報ストア（Mac キーチェーン / Windows 資格情報マネージャー）に `doboku-note-auth-<service>` で登録する。方針の正本は `.claude/config/playwright-auth-profiles.json` の `services.<id>.credential`（`autoLogin`＝切れたら自動で入り直すか・`policyNote`＝理由）と `credentialPolicy`（登録コマンド・定期実行）。X・Instagram・Google・afb は `autoLogin: false`（凍結・2 段階認証・セレクタ未確認）で、資格情報は人がログインするときのために保管する。afb は state を別プロセスへ持ち出せないので、`asp-browser.mjs` の `openAsp` が同じプロセスで資格情報を使って 1 回だけログインする（`AUTO_LOGIN.afb.inProcessOnly`）。ログイン ID の正本も各 PC の資格情報ストア（このリポジトリは公開なので ID を書かない）。状態は管理画面の 管理 ＞ ログインと資格情報（`/ops/auth`）で見る（開いた PC の登録だけが見える。ID だけを読んで表示し、パスワードは取り出さない＝`credential-store.mjs` の `storedAccounts`）。

> [!note]
> 2026-10-24（DN-0817）まで、全サービスの ID/PW を GitHub Secrets（`DOBOKU_AUTH_*`）にも保管し、CI が age 暗号化した storageState を private R2 から復元して収集・投稿していた。ココナラは 403、KDP・X・Instagram は端末変更やボット確認で失効し、毎週どこかが壊れたため廃止した。Secrets と private R2 の `auth-state/` は運営者が削除する。

## ログイン維持（`auth-session-refresh`・土曜の auth 段）

`scripts/auth-session-refresh.mjs` が、A8・もしも・KDP・note・ココナラのログインを取り直す。毎日の launchd・Windows のタスクは 2026-10-24 に廃止し、土曜の `weekly-collect` の auth 段（`--service a8,kdp,note,coconala`）だけが呼ぶ。
ID/PW の読み口は `scripts/lib/credential-store.mjs` だけ（Mac キーチェーン／Windows 資格情報マネージャー）。

| 段 | 内容 |
|---|---|
| 共用 state の取り込み | A8・もしもは stats47 と同じ口座。stats47 が保存する `~/.local/share/asp-sessions/<service>-state.json` が auth root の state より新しければ写す。同じ口座へ両方からログインしないため、ここで通ればログインしない |
| 確認 | `auth:status` と同じ判定（口座 assert 付き） |
| 資格情報でログイン | 切れていれば 1 回だけ。項目は `doboku-note-auth-<service>`、A8・もしもは無ければ `stats47-measurement-<service>`。KDP・note・ココナラは doboku-note 専用の項目だけ（別口座の資格情報で入らない） |

2FA・CAPTCHA・ID/PW 不通・口座不一致では突破せず、auth root の `metadata/<service>.autologin-failed` を残して通知する。印には送信後の場所とログイン画面に出た文言（メールアドレスは伏せる）を書き、画面の写しを `metadata/<service>.autologin-failed.png` に残す。不可視の reCAPTCHA（`size=invisible`・v3 の印）はログイン画面に常にあるので「人の確認」に数えない（2026-10-01: ココナラの送信がログイン画面へ戻されただけで human_required と判定し、拒否の理由を隠した）。
人が `npm run auth:login -- --service <service>` で通し、印を消すまで自動では再試行しない。KDP は Amazon の再認証で止まりやすく、切れたら次の土曜を待たず人が入り直す。
ログインの記録は `.claude/state/weekly-collect/runs.json` の auth 段と、Mac `~/Library/Logs/doboku-note/weekly-review.log`に残る。

KDP・note・ココナラは資格情報を登録したときだけ対象になる（未登録は `skipped`）。登録はオーナーが各 PC で 1 回（値は対話入力）:

```bash
# Mac
security add-generic-password -s doboku-note-auth-note -a <ログインID> -w
# Windows（cmd / PowerShell）
cmdkey /generic:doboku-note-auth-note /user:<ログインID> /pass
```

note は購入者一覧・売上管理を開くと端末ごとにパスワード再確認が出る。`note-sales-fetch`・`record-net-receipts` はこれを、資格情報ストアの `doboku-note-auth-note` で `scripts/lib/note-reauth.mjs` が 1 回だけ通す（2026-10-01）。未登録・失敗印 `metadata/note.reauth-failed` あり・通らないときは ABORT して人が通す。

## セッションが収集の記録を読む（2026-10-24）

A8・KDP・note のアクセスと売上・ココナラ・GSC の「いま」の値は、セッションでは取りに行かない。

1. 各領域の記録（`data/` 配下の dataset・宣言は `scripts/lib/datasets.mjs`）と、その最終取得日を読む
2. 最終取得日が古い、または空なら、数値を埋めずに「未取得」と書く
3. 取り直しが要るときは「次の土曜の収集を待つ」か、運営者が端末で `node scripts/weekly-collect.mjs --only <段>` を実行する、と案内する

収集の成否は `npm run check-weekly-collect`（段ごとの最新の結果が合格か・運営者の `--only` の取り直しを含む・期限内か）で見る。

## 検証

```bash
npm run check-playwright-auth-wiring:strict
npm run auth:doctor -- --json
node --test tests/playwright-auth-profile.test.mjs tests/playwright-auth-lock.test.mjs tests/playwright-auth-cli.test.mjs
npm run check-affiliate-wiring
npm run check-google-ui-ssot
```

関連: `.claude/skills/dev/playwright-auth/SKILL.md`
