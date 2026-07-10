# Codex 実施ログ：デザインシステム整理

> [!done]
> **2026-07-10 完了**：UIトークン、カード、ナビゲーション、Hero、スタイル文書を整理した。型チェック・lint・全97テスト（3件skip）は通過。

## 背景

デザイン実装の冗長性とカスタマイズ阻害要因のレビュー結果を受け、見た目と既存コンテンツの互換性を維持しながら共通化した。

## 実施内容

- UI基本色をEditorial tokensへ統一し、Tailwindの`brand` / `ink`も同じ変数へ接続した。
- `--color-*` はSNS・SVG・既存コンテンツとの共有パレットとして維持し、新規UIからの直接参照を除去した。
- `card-surface-content` / `card-surface-section`とHero専用トークンを追加した。
- `NavLinkCard`を追加し、`SeeAlso`と`SpokeNavCard`の重複構造を統合した。
- `CategoryNavCard`のGuide/Pillar/汎用リンクリストを共通描画へ統合した。
- UIの`rounded-sm`を用途別card radius tokenへ移行した。
- 未使用の`box-designs.css`と、存在しないCSSをimportしていた`index.css`を削除し、スタイルREADMEを現行構成へ更新した。
- 存在しないESLintルールを参照していた抑制コメントを削除した。

## 検証

```bash
npm run type-check
npm run lint
npm test
git diff --check
```

すべて成功。テストは94件成功、0件失敗、3件skip（VOICEVOX等の環境依存）。

## 後続メモ

- UIでは`--accent`、`--paper`、`--ink-*`、`--rule-*`を使う。`--color-brand-*` / `--color-ink-*`は図版・SNS互換用。
- 新しい本文内ナビカードは`NavLinkCard`を拡張し、同等のクラス列を再実装しない。
- ビジュアル回帰テストは未整備のため、画像差し替え時はHeroの専用トークンを調整する。
