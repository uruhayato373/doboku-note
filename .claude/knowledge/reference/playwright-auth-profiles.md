# Playwright 認証プロファイル運用（doboku-note）

SNS / 各種プラットフォーム自動化（X / Instagram / note / ココナラ）の Playwright ログインを
「毎回入れ直さない」ための、永続プロファイルの仕組み・置き場所・再ログイン手順・注意点をまとめる。

## 方式：サービスごとの永続プロファイル

各スクリプトは `chromium.launchPersistentContext(PROFILE_DIR, …)` を使い、
Cookie・localStorage をディレクトリごと保持する。**一度ログインすれば以降は再ログイン不要**。
プロファイルはサービス単位で分離し、アカウント取り違え事故を防ぐ。

| プロファイル (`.local/` 配下) | サービス | アカウント (SSOT) | 使用スクリプト | 状態 |
|---|---|---|---|---|
| `playwright-x-profile` | X (Twitter) | `@doboku373` — `.claude/config/x-account.json` | `.claude/skills/social/x-repost/{x-repost-exec,x-repost-discover}.ts`, `.claude/skills/social/publish-x/publish-x.ts` | ✅ 稼働中 |
| `playwright-ig-bs-profile` | Instagram（FB Business Suite 経由） | `@dobokunotecom` — `.claude/config/ig-account.json` | `.claude/skills/social/publish-ig-bs/publish-ig-bs.ts` | ✅ 稼働中 |
| `playwright-note-profile` | note.com | note アカウント | note 投稿系スクリプト | ✅ 稼働中 |
| `playwright-coconala-profile` | ココナラ | `dobokunote` / users/6197366 — `.claude/config/coconala-account.json` | `coconala-publish` / `coconala-edit` 系 | ✅ 稼働中 |
| `playwright-a8-profile` ＋ **`playwright-a8-state.json`** | A8.net（メディア管理画面） | メディアID `a25050375786` — `.claude/config/a8-report-automation.json` の `a8.mediaId` | `.claude/skills/ads/scout-asp/scripts/a8-browser.ts`（提携）/ `scripts/fetch-a8-ui-csv.mjs`（成果レポート） | ✅ 稼働中 |

> [!warning] A8 だけは永続プロファイルに認証が残らない
> A8 の認証は**揮発性セッション Cookie** で、永続プロファイルには保存されない。よって `storageState`
> （Cookie 入り JSON）を `.local/playwright-a8-state.json` に捕獲し、起動時に `addCookies` で再注入する。
> これが認証再利用の実体。**`scripts/fetch-a8-ui-csv.mjs` は人間のログイン成功直後に自身で保存する**
> （`saveA8Session`）ので、成果レポート経路では別途 login スクリプトを走らせる必要はない。
> なお `scout-asp/scripts/login.mjs` は `PROFILE_ROOT` が Mac 絶対パス固定で **Windows では別の場所を掘る**
> ため、Windows では使えない（fetch 側の自動保存を使う）。
>
> **アカウント assert は「サイト」ではなく「口座（メディアID）」**。A8 の管理画面にサイト切替は無く、
> ヘッダーの「サイト名」は口座の代表サイト（統計で見る都道府県＝stats47）が常に出るだけ
> （2026-07-27 実機確定）。doboku-note の分離はレポート単位で行う → `a8-affiliate-pipeline.md`。

- `PROFILE_DIR` は各スクリプトで `path.join(PROJECT_ROOT, ".local/playwright-*-profile")` として定義。
- アカウントの真実源（SSOT）は上表の各 config JSON。Playwright 側は「マイページ本文にこの名前が含まれるか」で
  誤アカウント操作を防ぐ assert を持つ（例：ココナラ `sellerName: dobokunote`）。

> [!warning] Gmail は Playwright の対象外（MCP を使う）
> `mail.google.com` は永続プロファイルで開いても **Google の自動化検知で「ブロックされました。」** が返り、
> 1通も読めない（2026-08-17・`playwright-note-profile` で実測。ログイン済みでも同じ）。
> **メールを読む経路は Gmail MCP コネクタ**（`search_threads` / `get_thread`）だけで、
> プロファイルを増やして解決する問題ではない。上表に Gmail の行が無いのはそのため。
>
> ただし **MCP の接続先は `uruhayato373@gmail.com` の1アカウントのみ**。他アドレス宛
> （ココナラ出品アカウントの `dobokunotecom@gmail.com` 等）は検索してもヒットしない。
> したがって **0 件は「メールが無い」ではなく「その宛先が見えていない」**——CLAUDE.md 原則9
> 「検査ゼロを PASS と呼ばない」のメール版。**宛先を確かめずに「通知は来ていません」と報告しない。**
> プラットフォームの重要通知（出品取り下げ・審査結果）は、メールではなく**サービス側の実体**
> （ココナラのメッセージ、Brain のマイページ）で確認するのが主経路。

## 「毎回ログインが必要」になる原因と対策

`.local/playwright-*-profile/` は `.gitignore` 対象（`.gitignore:62–73`）なので、
**`git worktree add` で作った作業ツリーにはプロファイルがコピーされない**。
SNS スクリプトの `PROJECT_ROOT = path.resolve(__dirname, "…")` は実行元 worktree のルートを指すため、
**worktree から実行すると毎回まっさらなプロファイル＝再ログイン**になる。

> **注意**: このリポジトリは CLAUDE.md §10 のとおり **複数セッションが worktree で並行するのが常態**。
> `.local/*profile` は gitignore なので、この worktree 分裂が「毎回ログイン」の主因。

対策：

- **A（恒久対応・適用済み 2026-07-19）**: worktree 相対だった `publish-x.ts` / `x-repost-exec.ts` /
  `x-repost-discover.ts` / `publish-ig-bs.ts` のプロファイル参照を **本体固定の絶対パス**に変更した。実装は各スクリプトで：
  ```ts
  const PROFILE_ROOT = "/Users/minamidaisuke/doboku-note";   // 本体チェックアウト固定
  const PROFILE_DIR = path.join(PROFILE_ROOT, ".local/playwright-x-profile");
  ```
  `PROJECT_ROOT`（debug/drafts/state 用）は worktree 相対のまま。**プロファイルのみ本体を共有**する。
  本体から実行した場合は従来と同一パスに解決されるため挙動不変。worktree から実行しても同一ログインを共有する。
- **B（運用の補助）**: それでも投稿・自動操作系は本体リポジトリ `~/doboku-note` から実行するのが無難。
- **C（恒久対応・適用済み 2026-07-30・Google 系のみ）**: `PROFILE_ROOT` の**ユーザー名ハードコードを撤去**した。
  `scripts/lib/google-console-browser.mjs` は `DOBOKU_PROFILE_ROOT`（env）→ `~/doboku-note` → 旧 Mac 絶対パス → cwd の順で解決する。
  `~/doboku-note` は Mac も Windows も本体チェックアウトを指すため、**両機で同じプロファイルへ解決**する。
  修正前は Windows で Mac パスが存在せず `process.cwd()` に落ち、worktree から実行するとプロファイルが
  worktree 内に作られて worktree ごと消えていた（GSC UI 取得が実質 Mac 専用になっていた原因）。
  同ファイルの `profileInitialized()` は「ディレクトリが作られたか」だけを返す＝**ログイン済みの証明ではない**
  （未ログインの run でも Cookies DB は作られる）。ログイン有無は実際にページを開いて判定する。
  他サービス（X / IG / note / ココナラ / A8 等）は未適用＝Mac 絶対パスのまま。

## 再ログイン手順（プロファイルが空／期限切れのとき）

X は既存の `.tmp/x-login.ts`（`.local/playwright-x-profile/` にセッション保存。`x-repost-discover.ts` の
前提コメント参照）を本体リポジトリで実行する。それ以外のサービスは、以下の使い捨てスクリプトで
対象プロファイルを headed ブラウザで開き、手動ログイン後に保存する。

```js
// login.mjs — 一度だけ手動ログインしてプロファイルに保存する
import { chromium } from "playwright";
const dir = process.argv[2];                       // 例: .local/playwright-x-profile
const url = process.argv[3] ?? "https://x.com/login";
const ctx = await chromium.launchPersistentContext(dir, { headless: false });
const page = ctx.pages()[0] ?? await ctx.newPage();
await page.goto(url);
console.log("ログインが完了したら、このターミナルで Enter を押す");
process.stdin.once("data", async () => { await ctx.close(); process.exit(0); });
```

```bash
# 本体リポジトリ ~/doboku-note で実行すること（worktree 不可）
node login.mjs .local/playwright-x-profile        https://x.com/login
node login.mjs .local/playwright-ig-bs-profile    https://business.facebook.com/
node login.mjs .local/playwright-note-profile     https://note.com/login
node login.mjs .local/playwright-coconala-profile https://coconala.com/login
```

## 関連ドキュメント

- X: `.claude/config/x-account.json`（アカウント・プロフィール SSOT）, `content/sns/x/`
- Instagram: `.claude/config/ig-account.json`（アカウント・プロフィール SSOT）, `content/sns/instagram/`
- ココナラ: `.claude/config/coconala-account.json`, `.claude/knowledge/reference/coconala-operations.md`, `src/lib/coconala-services.ts`
- X: `content/sns/x/`
- `.playwright-mcp/`（Playwright MCP のログ／ページダンプ。認証情報ではない）

## セキュリティ

- `.local/` 配下のプロファイルには**ログイン Cookie が入る**。`.gitignore` 済みだが、**絶対にコミット・共有しない**。
- 漏洩＝アカウント乗っ取り相当。バックアップを取る場合も暗号化必須。
- `credentials/`（例：`gsc-service-account.json`）は `700`/`600` 権限。こちらも共有厳禁。
