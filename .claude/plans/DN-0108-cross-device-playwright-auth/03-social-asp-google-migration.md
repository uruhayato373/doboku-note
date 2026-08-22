---
taskId: DN-0108
phase: 03
title: X・Instagram・Google・ASPの共通resolver移行
---

# Phase 03: X・Instagram・Google・ASPの共通resolver移行

## 目的

Mac絶対パスとGoogleだけの独自resolverを廃止し、SNS・Google・ASPも同じ`DOBOKU_AUTH_ROOT`契約へ統一する。サービス固有の認証制約は共通化で消さず、adapter/registryに明記する。

## 対象

### X

- `.claude/skills/social/publish-x/publish-x.ts`
- `.claude/skills/social/x-repost/x-repost-exec.ts`
- `.claude/skills/social/x-repost/x-repost-discover.ts`
- `scripts/x-schedule-guard.mjs`
- `scripts/x-sync-status.mjs`
- `scripts/x-thread-replies.mjs`
- `scripts/x-*.mjs`のうち投稿アカウントprofileを使うもの

競合調査専用の非ログインbrowserと投稿アカウントprofileを混同しない。

### Instagram / Meta Business Suite

- `.claude/skills/social/publish-ig-bs/publish-ig-bs.ts`
- `scripts/verify-ig-status.mjs`
- `.claude/config/ig-account.json`の`playwrightProfile`を物理path SSOTとして扱わないよう整理

アカウントconfigにはlogical service IDを持たせてもよいが、既存consumerとの互換性をテストする。投稿アカウントと競合調査browserを共有しない。

### Google Console

- `scripts/lib/google-console-browser.mjs`
- `.claude/config/google-console-automation.json`
- `scripts/google-console-login.mjs`
- GSC/GA4 UI collector consumer

`DOBOKU_PROFILE_ROOT`はrepository rootという旧意味なので、`DOBOKU_AUTH_ROOT`へ単純renameしない。旧変数が設定されている場合はdoctorでdeprecatedを報告し、runtimeは移行期間だけ明示fallbackを持つ。Phase 05完了後の削除時期を文書化する。

### A8

- `.claude/skills/ads/scout-asp/scripts/login.mjs`
- `.claude/skills/ads/scout-asp/scripts/a8-browser.ts`
- `scripts/lib/a8-report-browser.mjs`
- `scripts/fetch-a8-ui-csv.mjs`
- `.claude/config/a8-report-automation.json`
- `.claude/config/affiliate-asp.json`

profileと`states/a8.json`の両方をresolverから取得する。既存`saveA8Session` / `restoreA8Session`を維持し、state JSON内容をログへ出さない。media ID assertは変更しない。

### もしも / afb

- `scripts/lib/asp-browser.mjs`
- `.claude/config/affiliate-asp.json`
- 関連scan/apply/status consumer

afbの`sessionPersistsAcrossProcesses === false`をregistryの`sessionMode: same-process`へ対応させる。共通CLIが別プロセスlogin済みと誤判定しないよう、statusは`unknown`または「同一プロセス確認が必要」と明示する。

## TypeScriptからresolverを使う方法

新しいresolverを`.mjs`と`.ts`へ複製しない。`tsx`で`.mjs`をimportできることを最小テストで確認する。型が必要なら`.d.ts`またはJSDocを追加し、ロジックの二重SSOTを作らない。

skill配下からroot resolverをimportする相対pathが過度に脆い場合は、package exportsまたは薄いre-exportを検討する。ただしresolver本体は1つに保つ。

## 固有制約の回帰確認

- X: account handle assert、凍結/投稿間隔guardを維持。
- Instagram: `@dobokunotecom` assertとBusiness Suite経路を維持。
- Google: 対象property assert、download、proxy、ignoreHTTPSErrorsの既存方針を維持。
- A8: メディアID assert、siteScope分離、profile-plus-stateを維持。
- もしも/afb: doboku-noteとstats47のサイト帰属guardを維持。
- afb: 同一プロセス制約を維持。
- Gmail: registryへ追加しない。Playwright対象外を維持。

## 検証

```text
node --test tests/playwright-auth-profile.test.mjs
npm run check-playwright-auth-wiring:strict
npm run check-affiliate-wiring
npm run check-google-ui-ssot
npm run lint
npm run type-check
npm run check-doc-refs
git diff --check
```

外部取得、投稿、提携申請、ログイン、profile移動は実行しない。各consumerのdry-run/import smoke testだけを行う。

## 受入条件

- `/Users/minamidaisuke/doboku-note`認証参照0。
- runtimeの`.local/playwright-*-profile`直書き0。
- `check-playwright-auth-wiring:strict` PASS。
- Google独自resolverのロジック重複0。
- A8 profile-plus-stateとafb same-processがテストで区別される。
- account/site/property assertの削除0。
- TypeScriptとMJSのresolverロジック二重実装0。

## Claude Code実行プロンプト

```text
DN-0108 Phase 03だけを実装してください。Phase 01・02の変更を前提に、
X、Instagram、Google、A8、もしも、afbを共通resolverへ移してください。

Mac絶対パスとruntimeのrepo相対profile直書きを0にしてください。
A8のprofile-plus-state、afbのsame-process、全ASPのサイト帰属assert、
X/IG/Googleのaccount/property guardは必ず維持してください。

TypeScript用にresolverロジックを複製しないでください。
外部ログイン、投稿、申請、取得、profile移動は行わず、strict配線ゲートとoffline検証を完了してください。
変更一覧、例外別の検証、残存直書き0の証拠を報告して停止してください。
```
