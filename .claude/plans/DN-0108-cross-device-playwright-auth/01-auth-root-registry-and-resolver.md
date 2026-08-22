---
taskId: DN-0108
phase: 01
title: auth root registry・resolver・配線ゲート
---

# Phase 01: auth root registry・resolver・配線ゲート

## 目的

外部サイトや実profileへ触れず、全サービスが後続Phaseで利用する保存先契約を確定する。OS差、worktree差、ユーザー名差をpure functionで吸収し、危険な保存先は実行前に拒否する。

## 変更対象

### 新規

- `.claude/config/playwright-auth-profiles.json`
- `scripts/lib/playwright-auth-profile.mjs`
- `scripts/check-playwright-auth-wiring.mjs`
- `tests/playwright-auth-profile.test.mjs`
- `tests/fixtures/playwright-auth/`（secretを含まない最小fixtureだけ）

### 更新

- `package.json`
- `.gitignore`（新規除外が本当に必要な場合だけ。OS標準rootをrepo内へ戻さない）

既存サービススクリプトはまだ変更しない。

## registry仕様

最低限、次のservice IDを登録する。

```text
note, brain, coconala, kdp, x, instagram, google,
a8, moshimo, afb
```

各entryは次を持てる。

- `profileDirName`
- `stateFileName`（必要なサービスのみ）
- `loginUrl`
- `checkUrl`
- `accountConfigPath`
- `sessionMode`: `profile` / `profile-plus-state` / `same-process`
- `interactiveLoginRequired`
- `ciAllowed: false`
- `notes`（secretを含まない短い制約）

アカウント名・media IDの真実源をregistryへ複製せず、既存config pathだけを参照する。既存configがないサービスは空文字でごまかさず、後続Phaseでadapterを決めるまで`accountConfigPath: null`とする。

## resolver仕様

`scripts/lib/playwright-auth-profile.mjs`は副作用のない関数と、明示されたときだけdirectoryを作る関数を分離する。

必要なexport例:

- `resolveDefaultAuthRoot({ platform, env, homeDir })`
- `resolveAuthRoot(options)`
- `resolveProfileDir(serviceId, options)`
- `resolveStatePath(serviceId, options)`
- `validateAuthRoot(path, options)`
- `loadAuthRegistry()`
- `ensureAuthDirectories(serviceId, options)`
- `redactAuthDiagnostic(value)`

### 保存先ルール

- Windows: `LOCALAPPDATA`を優先する。無い場合だけ`homeDir/AppData/Local`へ解決する。
- macOS: `homeDir/Library/Application Support/doboku-note/playwright-auth`。
- Linux: `XDG_STATE_HOME`、無ければ`homeDir/.local/state/doboku-note/playwright-auth`。
- `DOBOKU_AUTH_ROOT`は絶対パスだけ許可する。
- repository root、`.git`、worktree root、repository配下の`.local`を新auth rootとして拒否する。
- filesystem root、home rootそのもの、空文字、相対パスを拒否する。
- CIでは、テストが明示したtemporary root以外を作らない。
- directory作成は`ensure*`でのみ行い、pathを照会しただけでは作成しない。

Windowsの大小文字、separator、UNC、macOSのspaceをテストする。実ユーザー名や実profileをfixtureへ書かない。

## 配線ゲート

`check-playwright-auth-wiring`はPhase移行中も使えるよう、次を別集計する。

1. registryのschema・service重複・危険なファイル名
2. `/Users/<name>/doboku-note`型の認証絶対パス
3. `.local/playwright-*-profile`のruntime直書き
4. `launchPersistentContext`を使うが共通resolverをimportしていないファイル
5. profile/stateを標準出力へ出す危険コード候補

Phase 01では既存違反をbaselineとしてJSONへ固定しない。件数とfile:lineをレポートし、`--ratchet`では増加だけFAIL、`--strict`はPhase 03完了後に0を要求する設計にする。

package scripts:

```json
"check-playwright-auth-wiring": "node scripts/check-playwright-auth-wiring.mjs",
"check-playwright-auth-wiring:strict": "node scripts/check-playwright-auth-wiring.mjs --strict"
```

## テスト

最低限のケース:

- Windows + LOCALAPPDATA
- Windows + LOCALAPPDATA欠落fallback
- macOS + spaceを含むApplication Support
- Linux + XDG_STATE_HOMEあり/なし
- `DOBOKU_AUTH_ROOT` override
- 相対override拒否
- repo/worktree/home/filesystem root拒否
- 未知service ID拒否
- state不要serviceのstate path拒否またはnull
- CIの暗黙directory作成拒否
- path照会だけではfilesystemを書き換えない
- secretらしいregistry key（password/token/cookie/secret/recoveryCode）をschema gateが拒否

## 検証コマンド

```text
node --test tests/playwright-auth-profile.test.mjs
npm run check-playwright-auth-wiring
npm run lint
npm run type-check
npm run check-doc-refs
npm run check-information-architecture
git diff --check
```

このPhaseでは`--strict`が既存直書きのため失敗するのが正常。違反総数と後続Phaseへの割当を報告する。

## 停止条件

- registryに既存account SSOTと矛盾する値が必要になった。
- OS標準rootの決定が既存運用を不可逆に移動させる。
- テストが実profile、外部サイト、実Cookieを必要とする。
- 既存変更が対象ファイルと競合する。

## Claude Code実行プロンプト

```text
DN-0108 Phase 01だけを実装してください。
00-masterと本ファイルを契約として扱い、既存サービススクリプトはまだ変更しないでください。

service registry、OS非依存resolver、ratchet対応の配線ゲート、pure unit testを実装してください。
テストでは実HOME、実profile、外部ネットワークを使わずtemporary directoryを使ってください。
registryへpassword、Cookie、token、2FA、実メール本文を入れないでください。

指定検証を実行し、baseline違反をカテゴリ別・Phase別に報告して停止してください。
profile移動、ログイン、公開操作、push、deployは行わないでください。
```
