---
taskId: DN-0108
phase: 04
title: auth CLI・専用スキル・排他ロック・legacy profile安全移行
---

# Phase 04: auth CLI・専用スキル・排他ロック・legacy profile安全移行

## 目的

運営者がWindows/Macの各PCで、保存先確認、診断、初回ログイン、ログイン状態確認、旧profile移行を同じコマンドで安全に行えるようにする。

## 新規・更新対象

- `scripts/playwright-auth.mjs`
- `scripts/lib/playwright-auth-lock.mjs`（resolverと分けた方が単純なら新規）
- `scripts/lib/playwright-auth-adapters.mjs`（サービス固有statusが必要なら新規）
- `tests/playwright-auth-cli.test.mjs`
- `tests/playwright-auth-lock.test.mjs`
- `.agents/skills/dev/playwright-auth/SKILL.md`
- `.claude/knowledge/reference/skills-registry.md`
- `package.json`

## package scripts

```json
"auth:paths": "node scripts/playwright-auth.mjs paths",
"auth:doctor": "node scripts/playwright-auth.mjs doctor",
"auth:login": "node scripts/playwright-auth.mjs login",
"auth:status": "node scripts/playwright-auth.mjs status",
"auth:migrate": "node scripts/playwright-auth.mjs migrate"
```

## CLI契約

### `paths`

- ネットワークアクセスなし。
- service、auth root、profile/state/lock pathを表示。
- `--json`対応。
- Cookie DBやstate内容を読まない。
- pathがrepo/worktree内なら赤でFAIL。

### `doctor`

- ネットワークアクセスなし。
- rootの絶対性、作成/読書権限、disk空き、legacy profile、lock、registry、profile重複を診断。
- profile directory存在だけではログイン済みと言わない。
- `DOBOKU_PROFILE_ROOT`を検出したらdeprecatedとして新設定例を出す。
- lockが残っていても自動削除しない。hostname/PID/startedAtをsecret無しで表示し、人へ判断を渡す。
- `--service`と`--json`対応。

### `login`

- `--service`必須。`all`を認めない。
- headed system Chromeを開き、login URLへ移動する。
- password、2FA、CAPTCHAは人が入力する。
- login成功判定はadapterのaccount assertを使う。Enterを押しただけで成功にしない。
- 成功時にcontextを正常closeし、必要なサービスだけstorageStateを保存する。
- timeout/CAPTCHA/アカウント不一致は1バイトも外部状態変更せずFAIL。
- loginは認証準備であり、投稿・公開・購入・申請を行わない。

### `status`

- read-only URLだけを開く。
- `authenticated / expired / blocked / unknown / unsupported`を区別する。
- account assertが確認できたときだけauthenticated。
- login formへredirectされたらexpired。
- CAPTCHA/bot/proxy/selector不明はblockedまたはunknownで、PASSにしない。
- afbの別プロセス再利用不能はunsupported/unknownとして説明する。
- `--all`は順次実行。並列に多数のChromeを開かない。
- 外部サイトへ書き込み、download、uploadをしない。

### `migrate`

- 同一PC内の旧`<repo>/.local/playwright-*-profile`から新OS rootへの移行だけ。
- 既定はdry-run。`--commit`必須で実移動。
- sourceとtargetの絶対path、対象service、推定size、lock状態、target空を確認。
- browser/profile使用中なら停止。プロセスをkillしない。
- targetが存在・非空なら停止。merge/copy上書きをしない。
- state JSONもservice契約に従って移動する。
- 移行後にstatusがauthenticatedになるまでsourceを削除しない。安全のため最初はmoveではなく、同一PC内のcopy→検証→人の明示cleanupでもよい。
- 自動cleanupコマンドは本タスクで作らない。
- profileを別PC、クラウド、Gitへ転送しない。

## 排他ロック

- service単位で`locks/<service>.lock`をatomic createする。
- metadataはservice、hostname、PID、startedAt、commandだけ。引数にURL queryやtokenがあれば保存しない。
- context close時と例外時にfinallyで解放する。
- lock存在時は使用者を表示して停止。自動kill・自動lock削除なし。
- stale候補はdoctorが警告するだけ。人がプロセス不存在を確認してから明示操作する。
- lock libraryの取得/解放/競合/例外解放をtemporary rootでテストする。

## adapter設計

既存account assertをadapterへ全面移植して二重SSOTを作らない。既存libにread-only assert関数があれば再利用する。共通CLIから安全に再利用できない場合は、status用の最小adapterを作り、account SSOTは既存configから読む。

## 専用スキル

`.agents/skills/dev/playwright-auth/SKILL.md`を新設する。

frontmatterの必須方針:

```yaml
---
name: playwright-auth
description: Windows・MacのPlaywright認証profileを診断・初回ログイン・状態確認・安全移行する
disable-model-invocation: true
---
```

- user-invocableだが、自動呼出しは禁止する。
- `paths / doctor / login <service> / status [service|--all] / migrate <service>`をCLIへ委譲する。
- resolver、adapter、account assert、lock、migrationをSKILL.mdやskill同梱scriptへ複製しない。
- login/migrate前に対象service、PC、auth root、dry-run/commitを表示する。
- CAPTCHA・2FA・password入力はユーザーへ引き継ぐ。
- `.claude/knowledge/reference/skills-registry.md`へ登録し、件数・カテゴリ表を現行規約どおり同期する。
- 専用agentは作らない。認証判定は決定的script、サービス操作は既存operator/collectorが担当する。

## 機械チェックの3層

1. CI/ローカル静的: `check-playwright-auth-wiring:strict`。絶対パス、repo相対profile、resolver漏れ、secret key候補を検査。
2. PCローカルoffline: `auth:paths` / `auth:doctor`。root、権限、lock、legacy、競合を検査。
3. PCローカルonline read-only: `auth:status`。実ページとaccount assertで状態分類。CIでは実行しない。

静的ゲートだけを`quality:audit`または同等CIへ配線する。doctor/status/login/migrateをCIへ配線しない。

## 検証

```text
node --test tests/playwright-auth-profile.test.mjs tests/playwright-auth-lock.test.mjs tests/playwright-auth-cli.test.mjs
npm run auth:paths -- --json
npm run auth:doctor -- --json
npm run check-playwright-auth-wiring:strict
npm run lint
npm run type-check
git diff --check
```

テストはfake adapter・local test server・temporary rootを使う。実サービスへ接続しない。`auth:login`、実`auth:status`、`auth:migrate --commit`はユーザー承認まで実行しない。

## 受入条件

- 全CLIが`--help`と`--json`を持つ。
- doctor/pathsは完全offline。
- login/statusはaccount assertなしで成功しない。
- migrateはdry-run既定で、target上書き・自動削除・PC間転送をしない。
- 2重起動テストがPASSし、自動killしない。
- CLI出力・fixture・git diffにsecret 0。
- 専用skillがCLIを呼ぶだけの薄いオーケストレーターで、`disable-model-invocation: true`かつregistry登録済み。
- 専用agent新設0。

## Claude Code実行プロンプト

```text
DN-0108 Phase 04だけを実装してください。
paths、doctor、login、status、migrate CLI、service lock、専用playwright-authスキルを実装してください。

offlineテストではfake adapter、local server、temporary auth rootだけを使い、実profileや外部サイトへ触れないでください。
migrateはdry-run既定、--commitでもtarget上書き・source削除・PC間転送を禁止してください。
login成功はEnter入力やprofile存在ではなく既存account assertで判定してください。
スキルはdisable-model-invocation: trueとし、認証ロジックを複製せずCLIへ委譲してください。
専用agentは作らないでください。

指定テストを実行し、CLI例、exit code、secret非出力の証拠を報告して停止してください。
実login、実status、実migrate、publish、push、deployは行わないでください。
```
