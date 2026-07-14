# Codex 実施ログ：品質改善スプリント指示書作成

> [!done]
> **2026-07-14 完了**：Turbopack broad pattern warning、KaTeX strict warning、UI残タスクをすべてやりきるための Claude Code 向け詳細指示書を作成した。

## 背景

ユーザーから、実装は Claude Code に任せる前提で、Turbopack broad pattern warning / KaTeX strict warning / UIコード修正の3項目をすべて進めるための詳細ドキュメント作成依頼があった。

## 実施内容

- `src/lib/docs.ts` の警告箇所を確認。
- `src/app/docs/[...slug]/page.tsx` の MDX / KaTeX compile 経路を確認。
- 既存の MDX / KaTeX 関連スクリプトと content-authoring ルールを確認。
- UI監査・直近ハンドオフ・`lint-ui` の状態を確認。
- Claude Code 用の実装指示書を作成。

作成ファイル:

- `docs/project/04_運営/10_品質改善スプリント_Turbopack_KaTeX_UI.md`

## 検証

ドキュメント作成のみ。コード変更・テスト実行はなし。

## 後続メモ

- Claude Code には指示書末尾の「Claude Code 実装プロンプト」をそのまま渡せる。
- 実装後は `npm run build` のログで Turbopack warning と KaTeX strict warning が0件になったことを確認する。
