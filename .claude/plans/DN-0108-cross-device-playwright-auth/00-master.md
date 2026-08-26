---
taskId: DN-0108
type: implementation-plan
createdAt: 2026-08-21
deleteOnComplete: true
---

# DN-0108 Windows・Mac共通のPlaywright認証永続化基盤

## 到達点

doboku-noteのPlaywright自動操作を、WindowsとMacのどちらから実行しても「そのPCで一度ログインすれば、セッション期限まで再ログイン不要」にする。

完成時は次の状態にする。

1. スクリプト・アカウント定義・ログイン判定規則だけをGitで共有する。
2. Cookie・localStorage・storageState・ChromeプロファイルはPCごとに分離し、PC間同期しない。
3. 認証データはリポジトリやworktreeの外にあるOS標準ローカル領域へ保存する。
4. 全サービスが共通の`DOBOKU_AUTH_ROOT`とprofile resolverを使い、Macのユーザー名・本体checkout・cwdへ依存しない。
5. note / Brain / ココナラ / KDP / X / Instagram / Google / A8 / もしも / afbの既存動作とアカウントassertを維持する。
6. `auth:paths`・`auth:doctor`・`auth:login`・`auth:status`で、保存先・破損・期限切れ・ログイン状態を安全に確認できる。
7. 同じサービスのプロファイルを複数プロセスで同時利用せず、明確なロックエラーで停止する。
8. WindowsとMacの実機で各1回ログインし、同じスクリプトがそれぞれのローカルセッションを再利用できる。
9. 専用`playwright-auth`スキルがCLIを安全に束ね、専用agentを増やさず機械判定を単一SSOTに保つ。

## 起票時の実査

- `.claude/knowledge/reference/playwright-auth-profiles.md` はサービス別永続プロファイルを正としている。
- note / Brain / ココナラ / KDPは主に`<repo>/.local/playwright-*-profile`を使う。
- X / Instagram / A8の一部skillは`/Users/minamidaisuke/doboku-note`を直接参照しており、Windowsで同じ保存先規則にならない。
- Googleだけは`DOBOKU_PROFILE_ROOT`から本体checkoutを解決する例外実装を持つ。
- worktree内の`.local`はGit管理外なので、worktreeを変えると空プロファイルが作られ、再ログインの原因になる。
- A8はprofileだけで認証が残らず、`playwright-a8-state.json`のCookie再注入を併用する。
- afbは保存したstorageStateを別プロセスで復元できないことがあり、ログインから操作まで同一プロセスで完結させる制約がある。
- `.gitignore`は`.local/playwright-*-profile`とstate JSONを除外済みだが、新しいOS標準保存先はそもそもリポジトリ外になる。

## 確定アーキテクチャ

### Gitで共有するもの

| 種別 | 配置 |
|---|---|
| profile resolver・ロック・診断 | `scripts/lib/playwright-auth-profile.mjs` |
| サービスregistry | `.claude/config/playwright-auth-profiles.json` |
| 認証CLI | `scripts/playwright-auth.mjs` |
| 配線検査 | `scripts/check-playwright-auth-wiring.mjs` |
| 単体テスト | `tests/playwright-auth-profile.test.mjs` |
| ユーザー向けオーケストレーター | `.agents/skills/dev/playwright-auth/SKILL.md` |
| 運用SSOT | `.claude/knowledge/reference/playwright-auth-profiles.md` |

registryにはpassword、Cookie、token、メール本文、2FA recovery codeを書かない。保持してよいのはservice ID、ディレクトリ論理名、login/check URL、既存account configへの参照、storageState例外、実行環境制約だけ。

### PCごとに保持するもの

環境変数`DOBOKU_AUTH_ROOT`を各PCで設定する。

| OS | 推奨値 |
|---|---|
| Windows | `%LOCALAPPDATA%\doboku-note\playwright-auth` |
| macOS | `~/Library/Application Support/doboku-note/playwright-auth` |
| Linuxローカル | `${XDG_STATE_HOME:-~/.local/state}/doboku-note/playwright-auth` |

配下は次の構造に統一する。

```text
DOBOKU_AUTH_ROOT/
  profiles/<service>/       # Chromium userDataDir
  states/<service>.json     # 必要なサービスだけ。Cookieを含む
  locks/<service>.lock      # 同時起動防止
  metadata/<service>.json   # secretを含まない最終確認結果
```

### resolverの優先順位

1. 明示された`DOBOKU_AUTH_ROOT`。絶対パスでなければFAIL。
2. OS標準ローカル領域。環境変数がなくてもWindows/Macで安定して同じ場所へ解決する。
3. CIでは永続認証を暗黙作成せず、`AUTH_PROFILE_UNAVAILABLE_IN_CI`でFAIL。テストだけが明示した一時rootを使える。

旧`DOBOKU_PROFILE_ROOT`は「リポジトリroot」の意味だったため新変数と意味が異なる。自動変換しない。doctorが検出して移行案内を出し、移行完了後に廃止する。

## セキュリティ・運用原則

1. WindowsとMacのprofileをOneDrive、iCloud、Dropbox、Git、R2、GitHub Artifactで同期しない。
2. profile/stateの漏洩はアカウント乗っ取り相当。標準出力、debug dump、テストfixtureへCookieを出さない。
3. password・2FA・recovery codeはOSまたは承認済みpassword managerで人が管理する。Playwrightへ渡さない。
4. CAPTCHA・2FA・初回loginはheaded browserで人が実行する。
5. `auth:status`はread-only。profileディレクトリの存在だけで`authenticated`と判定しない。
6. 公開・価格変更・申請・購入・削除は既存のdry-run / `--commit` / account assertを維持する。
7. 同一profileの並行起動を禁止する。ロックを理由にプロセスを自動killしない。
8. GitHub Actionsはbrowser profileを使わない。API / MCP / GitHub Secretsの既存経路を使う。
9. 会社PCのproxy設定はmachine-localの環境設定とし、registryやログへ資格情報を出さない。
10. 古いprofileは新profileのログイン検証が終わるまで削除しない。自動削除は実装しない。

## 対象範囲

### 含む

- 共通auth root resolver、service registry、排他ロック
- 専用`playwright-auth`スキルとskills registry登録（認証ロジックは持たない）
- 既存Playwrightスクリプトのprofile/stateパス移行
- 既存account assertとfail-closedの維持
- headed login、read-only status、offline doctor、paths表示CLI
- 同一PC内のlegacy profile移行dry-runと明示commit
- Windows / Mac / CI相当のパス単体テスト
- Windows実機とMac実機のチェックリスト
- package scripts、運用SSOT、AGENTS/skill内の該当参照同期

### 含まない

- password自動入力・password managerの実装
- Cookie/profileのPC間コピー・クラウドバックアップ
- CAPTCHA・2FA回避
- GmailのPlaywright操作
- selector刷新、公開フロー変更、価格/status変更
- PlaywrightからMCPへの全面移行
- 専用認証agentの新設
- GitHub Actionsでの対話ログイン
- note / Brain / ココナラ / SNSへの実公開
- main merge、push、deploy

## フェーズ

| Phase | 実装契約 | 主な出口 |
|---|---|---|
| 01 | [registry・resolver・配線ゲート](./01-auth-root-registry-and-resolver.md) | OS非依存の保存先解決と純粋テスト |
| 02 | [中核サービス移行](./02-core-service-migration.md) | note / Brain / ココナラ / KDPの直書き0 |
| 03 | [SNS・ASP・Google移行](./03-social-asp-google-migration.md) | Mac絶対パス0、全対象が共通resolver利用 |
| 04 | [CLI・ロック・スキル・安全移行](./04-auth-cli-lock-and-safe-migration.md) | login/status/doctor/paths/migrate、専用skill、並行起動防止 |
| 05 | [Windows・Mac実機検証](./05-cross-device-validation-and-docs.md) | 両PCで再利用確認、SSOT同期 |
| 99 | [完了・一時計画削除](./99-finalize-and-delete.md) | 恒久SSOTだけ残しカードとplanを削除 |

## 実行順

1. Phase 01だけを実装し、純粋関数テストと配線ゲートを通して停止する。
2. Phase 02で中核4サービスを移行する。外部サイトへ変更を加えず、statusはread-onlyに限定する。
3. Phase 03でX / Instagram / Google / ASPを移行し、A8・afb固有例外を維持する。
4. Phase 04でCLI、ロック、legacy移行を実装する。profile移動はdry-run既定にする。
5. Windowsでユーザーが明示承認したサービスだけlogin/status確認する。
6. 同じcommit候補をMacへ同期し、Mac固有rootでlogin/status確認する。
7. Phase 05の両PC証拠が揃うまで「完了」としない。
8. Phase 99で再利用可能な規則をSSOTへ抽出し、一時計画とカードを削除する。

## 全体受入条件

- source scanで`/Users/minamidaisuke/doboku-note`の認証profile参照が0件。
- runtime codeの`<repo>/.local/playwright-*-profile`直書きが0件。legacy移行・テスト・文書の説明だけは許可。
- 全対象サービスがregistryのservice IDからprofile/stateを解決する。
- Windows、macOS、Linux、CI相当のpath resolverテストがPASSする。
- 相対`DOBOKU_AUTH_ROOT`、root直下、repo内、worktree内への危険な指定をfail-closedで拒否する。
- `auth:doctor`はネットワーク不要で、path、権限、legacy、lock、profile競合を診断できる。
- `auth:status`は実ページを確認し、`authenticated / expired / blocked / unknown`を区別する。
- profileが存在するだけの状態をauthenticatedと報告しない。
- 同一サービスの2重起動は明確なロックエラーで止まり、自動killしない。
- `.agents/skills/dev/playwright-auth/SKILL.md`は`disable-model-invocation: true`で、CLI以外の認証ロジックを複製しない。
- 専用認証agentは作らず、既存service operator/collectorの責務を維持する。
- WindowsとMacで少なくともnoteの「login→close→別プロセスstatus」がPASSする。
- Brain・ココナラ・X・Instagram・Google・A8は各PCの利用可能範囲でstatusを確認し、未検証をPASS扱いしない。
- A8のstorageState再注入、afbの同一プロセス制約、Gmail非対応が維持される。
- `npm run check-playwright-auth-wiring`、`npm run auth:doctor`、単体テスト、lint、type-check、doc refsがPASSする。
- profile/state/cookie/token/passwordがGit差分・ログ・fixtureへ入っていない。

## Claude Code開始プロンプト

```text
DN-0108をPhase 01から実装してください。

最初に次を全文読んでください。
- AGENTS.md
- .claude/todo/backlog.md のDN-0108
- .claude/plans/DN-0108-cross-device-playwright-auth/00-master.md
- .claude/plans/DN-0108-cross-device-playwright-auth/01-auth-root-registry-and-resolver.md
- .claude/knowledge/reference/playwright-auth-profiles.md
- .claude/knowledge/reference/information-architecture.md
- .gitignore のPlaywright認証除外

開始時にbranch、origin/mainとorigin/developとの差、git statusを確認してください。
共有worktreeの既存変更をreset、checkout、stash、上書きしないでください。
古いbaseや対象ファイル競合があれば、勝手に同期せず停止して報告してください。

このターンではPhase 01だけを実装してください。外部サイトを開かず、実profileを読み書きせず、
service registry、OS非依存auth root resolver、pure test、配線ゲートだけを作ってください。
password、Cookie、token、2FA情報をconfig・ログ・fixtureへ入れないでください。

Phase 01の指定テスト、lint、type-check、doc/IA検査まで行い、
変更ファイル、検証結果、残る直書き件数、次Phaseの対象を報告して停止してください。
commit候補の提示までは可能ですが、push、deploy、外部ログイン、profile移動は実行しないでください。
```
