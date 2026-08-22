---
taskId: DN-0103
phase: 99
title: 最終検証・恒久SSOT抽出・計画削除
status: blocked-by-phase-04
---

# Phase 99: 最終検証・恒久SSOT抽出・計画削除

## 開始条件

- Phase 01〜04がすべて完了している。
- 各Phaseの受入条件、スクリーンショット、検証結果が確認できる。
- `content/brain`だけが販売本文・画像・distのSSOTである。
- Brain外部公開、R2 URL、価格、statusに意図しない変更がない。
- 未解決事項が「後でやる」だけの状態でplan内に残っていない。残件は新しいbacklog cardへ切り出す。

## 恒久SSOTへ抽出

次を最新実装へ同期する。

- `tools/admin-app/README.md`
  - コンテンツ中心nav
  - channel registry
  - 方針・設計の多軸分類
  - Brain read-only画面
- `.claude/knowledge/reference/information-architecture.md`
  - `content/brain`
  - UI分類と物理配置の分離
  - Brainの4領域分担
- `.claude/knowledge/reference/brain-operations.md`
  - 新パス
  - catalog/listings/assets/distの分担
  - adminはread-only
- `scripts/lib/repository-paths.mjs`
  - Brain rootの唯一宣言
- 必要なskills/agents registry

計画の手順を恒久文書へ丸ごと複製しない。再利用する規則と最終構成だけを抽出する。

## 最終検証

```bash
npm run check-information-architecture
npm run check-doc-refs
npm run check-brain-wiring
node --test tests/admin-document-store.test.mjs tests/backlog-parity.test.mjs tests/information-architecture.test.mjs tests/repository-paths.test.mjs
npx tsc --noEmit -p tools/admin-app/tsconfig.json
npm run type-check
npm run test:e2e:admin
npm run lint-ui
git diff --check
```

Windows固有で全量検査が成立しない項目はDN-0104と混同しない。DN-0103起因の失敗か、既存Windows偽赤かを分けて報告する。検査対象0件をPASSにしない。

## 参照監査

```bash
rg -n "発信|\.claude/config/brain-listings\.json|\.claude/config/brain/(assets|dist)" \
  AGENTS.md .claude .agents .codex scripts src tools tests .github docs content
rg -n "DN-0103|DN-0103-admin-content-ia" .
```

旧語`発信`は戦略本文の一般語として残ってよいが、admin group名・READMEの旧仕様記述は0にする。旧Brainパスは移行履歴・検査fixtureの明示例以外0にする。

## 削除条件

1. 新構成が恒久SSOTに記録されている。
2. 残件があれば別IDでbacklogへ移っている。
3. DN-0103を参照するmonthly/weeklyが存在する場合は同時に除去する。
4. `.claude/todo/backlog.md`からDN-0103カードをセクションごと削除する。
5. `.claude/plans/DN-0103-admin-content-ia/`を削除する。
6. `rg`で参照切れ0を確認する。

git履歴が実装経緯を持つため、完了handoffやarchiveを新設しない。

## Phase 99専用Claude Codeプロンプト

```text
DN-0103 Phase 99を実行してください。

00-master.md、Phase 01〜04、backlogのDN-0103、information-architecture.md、
brain-operations.md、tools/admin-app/README.mdを全文読んでください。

Phase 01〜04の受入条件が1つでも未完了なら削除せず、不足だけを報告してください。
完了している場合は、再利用する最終構成と規則だけを恒久SSOTへ抽出し、全検証を実行してください。

残件は別backlog IDへ切り出し、DN-0103カード、monthly/weekly参照、plan bundleを削除してください。
archiveや完了handoffは作らないでください。push・deploy・外部サービス変更は実行しないでください。
```

