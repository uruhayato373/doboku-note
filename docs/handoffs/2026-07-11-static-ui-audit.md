# Codex 実施ログ：UIコードベース静的監査

> [!done]
> **2026-07-11 完了**：UIコードベース全体を静的監査し、Claude Code向けの優先度・根拠・修正方針・完了条件を`docs/reviews/2026-07-11-static-ui-codebase-audit.md`へ記録した。コード修正は未実施。

## 背景

前回の部分的なデザインリファクタリングではなく、`src/app`・`src/components`・`src/styles`とUI仕様書を対象に完全な静的監査を行う依頼。実装修正はClaude Codeで行う方針。

## 実施内容

- TSX 99ファイル、UIコンポーネント54ファイル、スタイル・Tailwind設定・component loaderを走査。
- `docs/design-system`、`docs/ui`、コンポーネントREADMEと実装を照合。
- SSOT不一致、不要なClient Component、focus欠如、旧トークン残存、card/motion重複、Header dialog、Callout型、Knip結果、巨大ファイルを優先度付きで整理。
- Claude Code向け5段階の実装順序と最終受入チェックリストを作成。

## 検証

```bash
npm run type-check
npm run lint
npm run knip
node scripts/lint-ui.mjs --all
```

- type-check：成功
- ESLint：成功
- lint-ui（99 TSX）：成功
- Knip：未使用・未登録依存・未解決import等を検出。動的ロードを含むため監査文書で要分類として記録。

## 後続メモ

- 今回変更したのは監査文書と本handoffのみ。アプリコードは変更していない。
- Claude Codeは監査文書のPhase 1から順に実装する。
- Knip出力だけを根拠に一括削除しない。MDX component loader、SNS、運用スクリプトのentry確認が必要。
- production build、ブラウザ目視、axe、スクリーンショット比較は今回未実施。
