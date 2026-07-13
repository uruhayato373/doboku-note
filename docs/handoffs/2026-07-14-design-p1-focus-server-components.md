# Codex 実施ログ：デザインP1改善（focus / Server Component）

> [!done]
> **2026-07-14 完了**：静的MDX部品の不要な Client Component 境界を外し、共通 `focus-ring` と UI lint ガードを追加した。`npm run build` まで通過。

## 背景

ユーザーから doboku-note のデザイン改善を Codex 側で進めたい依頼があった。既存の静的監査 `docs/reviews/2026-07-11-static-ui-codebase-audit.md` の P1 項目から、安全に効果が大きい範囲を実装した。

## 実施内容

- `Callout` と `SpecSheetList` から不要な `"use client"` を削除。
- `Callout` の `useMemo` を同期解決へ置換し、Server Component として描画できるようにした。
- `src/styles/globals.css` に共通 `.focus-ring` を追加。
- Header / ThemeToggle / Search / Tools の主要リンク・ボタン・入力欄・textarea に `.focus-ring` を適用。
- `scripts/lint-ui.mjs` に `focus:outline-none` の代替 focus 表示欠如を検出するルールを追加。
- `docs/design-system/design-system.md` に `.focus-ring` と lint 対象を追記。

## 検証

```bash
node scripts/lint-ui.mjs --all
npm run type-check
npm run lint
npm run build
```

- `lint-ui --all`: pass
- `type-check`: pass
- `lint`: pass
- `build`: pass

補足:

- build 中に既存の Turbopack broad pattern warning と KaTeX strict warn が出たが、今回変更由来ではなく既存コンテンツ/実装由来。
- `npm run build` により refresh-indexes 系が走るため、作業開始時点から dirty だった `src/config/*` 生成物は引き続き dirty のまま。今回のUI変更では触っていない。

## 後続メモ

- 次のデザイン改善候補は `docs/reviews/2026-07-11-static-ui-codebase-audit.md` の UI-001（ドキュメント/実装ズレ）と UI-005（カードプリミティブ統一）。
- Header drawer の focus trap / inert / 初期フォーカス復帰は未対応。アクセシビリティ改善の次スプリント候補。
