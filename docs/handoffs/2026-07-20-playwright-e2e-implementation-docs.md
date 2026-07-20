# Codex/Claude 実施ログ：Playwright E2E実装設計とClaude Code指示

> [!done]
> **2026-07-20 完了**：doboku-note向けPlaywright E2Eの詳細設計と、FableがOpus／Sonnetを省トークンで分業させるClaude Code実装プロンプトを作成し、TODOへ登録した。E2E本体は未実装。

## 背景

サイトの記事表示、資格別回遊、note商品CTA、モバイル表示をブラウザ上で継続検証したい。既に`@playwright/test`は導入されているが、サイト用設定・spec・CIが存在しないため、Claude Codeへ渡せる実装仕様を先に固定した。

## 実施内容

- `docs/project/04_運営/12_Playwright_E2E導入設計.md`を追加
  - 既存検査との責務分離
  - smoke、navigation、CTA、mobileの初版範囲
  - locator、flake防止、Playwright設定、CI、完了条件
  - note.com上のログイン・購入・公開を対象外に設定
- `docs/project/04_運営/claude-code-playwright-e2e-implementation-prompt.md`を追加
  - Fableを司令塔に設定
  - Opusはread-only設計レビュー1回に限定
  - Sonnetは実装1回とread-only QA1回に分離
  - サブエージェント最大3呼出し、入力の圧縮、再修正条件を規定
  - 既存変更保全、テスト、doc-sync、ハンドオフまで指示
- `docs/todo/backlog.md`へE2E導入タスクを追加

## 検証

```bash
test -f docs/project/04_運営/12_Playwright_E2E導入設計.md
test -f docs/project/04_運営/claude-code-playwright-e2e-implementation-prompt.md
rg -n "Playwright E2E|Fable|Opus|Sonnet" docs/project/04_運営 docs/todo/backlog.md
git diff --check -- docs/todo/backlog.md
```

文書作成のみ。Playwrightの起動、ブラウザ導入、E2E、type-check、lint、build、CIは未実施。

## 後続メモ

- Claude Codeへは実装プロンプト全文を渡す。
- 開始時にbranch、originとの差分、dirty worktreeを確認し、既存変更を巻き込まない。
- 初版は`next dev`に対するChromium desktop/mobileのみ。静的export配信、Firefox／WebKit、visual regressionは障害実績が出た場合に追加する。
- 実装後は`/doc-sync`を行い、本handoffとは別に実装結果のhandoffを作る。

