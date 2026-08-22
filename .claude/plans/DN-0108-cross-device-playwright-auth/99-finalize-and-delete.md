---
taskId: DN-0108
phase: 99
title: 最終検証・恒久SSOT抽出・一時計画削除
---

# Phase 99: 最終検証・恒久SSOT抽出・一時計画削除

## 目的

DN-0108固有の作業メモを残さず、再利用する規則だけを恒久SSOTとコードへ抽出する。完了を自己申告で決めず、Windows/Mac実測と機械ゲートで判定する。

## 完了前チェック

- Phase 01〜04のoffline gateが全PASS。
- Windows / Mac双方でOS標準rootを確認。
- Windows / Mac双方でnoteのlogin→close→別プロセスstatusを確認。
- 本体checkoutとworktreeから同じauth rootへ解決。
- Macユーザー名絶対パス0。
- runtimeのrepo相対profile直書き0。
- `check-playwright-auth-wiring:strict` PASS。
- profile存在だけをauthenticatedとするコード0。
- account/site/property assertの弱化0。
- A8 / afb / Gmail例外が文書とコードで一致。
- secret、profile、state、Cookie、password、2FAがGit差分0。
- 旧profileの自動削除0。
- 公開・投稿・申請・購入・deploy実行0。

## 恒久的に残すもの

- `.claude/config/playwright-auth-profiles.json`
- resolver / lock / auth CLI / wiring gate / tests
- `package.json`のauthコマンド
- 更新済み`.claude/knowledge/reference/playwright-auth-profiles.md`
- 必要なAGENTS/skill/agentの参照

## 削除するもの

- `.claude/todo/backlog.md`のDN-0108カード全体
- `.claude/plans/DN-0108-cross-device-playwright-auth/`全体
- 移行完了済みのdeprecated fallbackと、不要になった一時migration code
- secret-freeでないdebug artifactがあれば即時削除し、漏洩可能性を報告

計画削除前に恒久SSOTだけで次の作業者がlogin/status/migrate判断を再現できるかを確認する。

## 最終コマンド

```text
npm run check-playwright-auth-wiring:strict
npm run auth:doctor -- --json
node --test tests/playwright-auth-profile.test.mjs tests/playwright-auth-lock.test.mjs tests/playwright-auth-cli.test.mjs
npm run check-affiliate-wiring
npm run check-google-ui-ssot
npm run check-doc-refs
npm run check-information-architecture
npm run check-backlog-schema
npm run check-project-task-refs
npm run lint
npm run type-check
git diff --check
git status --short
```

## Claude Code実行プロンプト

```text
DN-0108 Phase 99を実行してください。
Windows/Mac双方の実測証拠と全機械ゲートを確認し、未検証が1つでもあれば計画を削除せず停止してください。

再利用規則をplaywright-auth-profiles.mdとコードへ抽出し、deprecated fallbackと一時migration codeを整理してください。
その後に限り、backlogのDN-0108カードとplan bundleを削除してください。

最終差分にprofile、Cookie、state、password、token、2FA、個人情報が無いことを確認し、
残した恒久SSOT、削除した一時物、全検証結果を報告してください。
push、deploy、外部公開は行わないでください。
```
