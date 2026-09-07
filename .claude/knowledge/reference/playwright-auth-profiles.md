# Playwright 認証プロファイル運用（doboku-note）

SNS・販売・計測サービスの Playwright ログインを、worktree や OS に依存せず再利用するための運用 SSOT。
保存先の計算は `scripts/lib/playwright-auth-profile.mjs`、サービス一覧は
`.claude/config/playwright-auth-profiles.json`、人が使う入口は `/playwright-auth` と `auth:*` CLI が担う。

## 保存先

すべてのサービスは `DOBOKU_AUTH_ROOT` があればその絶対パス、なければ次の OS 標準ローカル領域を使う。
リポジトリ、worktree、クラウド同期フォルダ、home 直下は保存先にしない。

| OS | 既定 auth root |
|---|---|
| Windows | `%LOCALAPPDATA%\doboku-note\playwright-auth` |
| macOS | `~/Library/Application Support/doboku-note/playwright-auth` |
| Linux | `${XDG_STATE_HOME:-~/.local/state}/doboku-note/playwright-auth` |

auth root の下は `profiles/`、`states/`、`locks/`、`metadata/` に分ける。Cookie や storageState は
PC ごとに独立保持し、Windows と Mac の間でコピー・Git・OneDrive・iCloud・Dropbox 同期をしない。

## サービスと例外

| service | profile | sessionMode | アカウント assert |
|---|---|---|---|
| `note` | `playwright-note-profile` | profile | note の `dobokunote` 表示 |
| `brain` | `playwright-brain-profile` | profile | `.claude/config/brain-account.json` |
| `coconala` | `playwright-coconala-profile` | profile | `.claude/config/coconala-account.json` |
| `kdp` | `playwright-kdp-profile` | profile | KDP 本棚の実体 |
| `x` | `playwright-x-profile` | profile | `.claude/config/x-account.json` |
| `instagram` | `playwright-ig-bs-profile` | profile | `.claude/config/ig-account.json` |
| `google` | `playwright-google-profile` | profile | GSC/GA4 の対象プロパティ |
| `a8` | `playwright-a8-profile` | profile-plus-state | メディア ID `a25050375786` |
| `moshimo` | `playwright-moshimo-profile` | profile-plus-state | `.claude/config/affiliate-asp.json` |
| `afb` | `playwright-afb-profile` | same-process | ASP site guard |

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

旧 `.local/playwright-*-profile` がある場合は、サービス単位で dry-run してからコピーする。
移行先が既に存在する、lock がある、Chrome が使用中のときは中断する。旧 source は自動削除しない。

```bash
npm run auth:migrate -- --service note
npm run auth:migrate -- --service note --commit
```

ログインが必要な場合は headed Chrome を開き、password・2FA・CAPTCHA は人が入力する。ログイン後は
別プロセスの read-only status で、実ページと account/site/property assert が一致したときだけ
`authenticated` とする。profile ディレクトリの存在だけでは認証済みと判定しない。

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
  | `expired`（login 画面へ redirect） | kdp / instagram / a8 / moshimo |
  | `unknown`（assert 不達） | brain / google / x |
  | `unsupported`（設計どおり） | afb |

> [!note]
> `unknown` は「login 画面へ飛ばされてはいないが account assert を確認できない」であり、
> `expired` と同じではない。両者を混ぜて「未ログイン N 件」と数えない。
> また同日の実測では `status --all` が note を `unknown` と返した一方、`--service note` は 3 回とも
> `authenticated` だった（`--all` は 1 プロセスで連続起動する）。**判定は `--service` 単位で行う。**

Windows と Mac の双方で note の別プロセス再利用・worktree 非依存を確認済み。

## セキュリティ

- `profiles/` と `states/` はログイン Cookie を含む。コミット、共有、ログ添付、クラウド同期をしない
- registry と metadata に password、Cookie、token、secret、2FA、recovery code を書かない
- ログやスクリーンショットへメールアドレス・氏名・token 付き URL を残さない
- 旧 profile の削除は自動化しない。新 root の再利用を一定期間確認してから人が処遇を決める
- CI は実 profile を使わない。テストが明示した一時 root 以外は resolver が拒否する

## 検証

```bash
npm run check-playwright-auth-wiring:strict
npm run auth:doctor -- --json
node --test tests/playwright-auth-profile.test.mjs tests/playwright-auth-lock.test.mjs tests/playwright-auth-cli.test.mjs
npm run check-affiliate-wiring
npm run check-google-ui-ssot
```

関連: `.claude/skills/dev/playwright-auth/SKILL.md`
