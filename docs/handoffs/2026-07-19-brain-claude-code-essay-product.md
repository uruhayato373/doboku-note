# Codex/Claude 実施ログ：Brain向けClaude Code答案設計商品

> [!done]
> **2026-07-19 完了**：Claude Codeで1級・2級土木の施工経験記述を設計・検証するBrain商品の企画、配布仕様、販売ページ原稿、公開チェック、制作ロードマップを文書化した。商品本体とBrain公開は未実施。

## 背景

既存doboku-noteプロジェクトのGenerator／Evaluator分離、問題文参照、字数検査、PDF・原典ディレクトリ構成を、一般購入者が使えるClaude Codeスキル商品へ再設計するため。

## 実施内容

`docs/project/05_プロダクト/brain-claude-code-essay-skill/` に以下を追加した。

- `00-product-spec.md`：商品コンセプト、顧客、価値、価格仮説、内部資産の切り出し方
- `01-package-spec.md`：配布ディレクトリ、SKILL.md責務、入力・出力スキーマ、検査、ガードレール
- `02-brain-sales-page-draft.md`：Brain販売ページ原稿、タイトル、訴求、必要環境、免責、販売条件
- `03-publication-checklist.md`：著作権、表示、アカウント、審査、前方テスト、公開禁止条件
- `04-build-plan.md`：商品制作からβ販売までの段階計画と必要なユーザー判断
- `docs/todo/backlog.md`：β商品化タスク、関連文書、未決定事項、公開禁止条件を登録

skill-creatorの原則に従い、実スキル本体は作成先が未決定のため生成していない。既存有料答案、内部PDF、認証情報、私的資料は販売物へ含めない方針。

## 検証

ドキュメント作成のみ。

```bash
git diff --check
git status --short
```

実スキルの `quick_validate.py`、字数検査、Windows／macOS動作確認、Brain審査は未実施。

## 後続メモ

- 初版は1級・2級土木施工経験記述版に限定する案を推奨。
- 実スキルは別の非公開リポジトリで作成する案を推奨。
- 著者は元発注者・1級土木施工管理技士であり、添削者・試験採点者・Anthropic認定者を名乗らない。
- Brain公開前に最新規約、手数料、要求される販売者情報を再確認する。
