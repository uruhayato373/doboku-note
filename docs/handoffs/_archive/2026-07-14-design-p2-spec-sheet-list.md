# Codex 実施ログ：SpecSheetList Editorial token 移行

> [!done]
> **2026-07-14 完了**：`SpecSheetList` を旧図版トークンから Editorial token へ移行し、再発防止の UI lint ルールを追加した。`npm run build` まで通過。

## 背景

ユーザーから doboku-note のデザイン改善を Codex 側で継続する依頼があった。前回の P1 改善で `Callout` / `SpecSheetList` の Server Component 化と focus 表示統一を済ませたため、続きとして `docs/reviews/2026-07-11-static-ui-codebase-audit.md` の UI-004 を実装した。

## 実施内容

- `src/components/ui/SpecSheetList/SpecSheetList.module.css`
  - `--color-ink-*` / `--color-border` / `--color-brand*` 参照を撤去。
  - `--ink` / `--ink-body` / `--rule-soft` / `--accent` / `--paper` / `--accent-fill` へ移行。
  - `border-radius: 2px` を `var(--radius-card-content)` へ移行。
  - 未導入の `JetBrains Mono` 指定をやめ、system mono stack に統一。
  - glyph の `16px` 生値を `1rem` へ置換。
- `src/components/ui/SpecSheetList/SpecSheetList.tsx`
  - コメントと prop 説明を現行 Editorial token に更新。
- `src/components/ui/SpecSheetList/README.md`
  - 旧トークン説明、未実装の件数カウント、古い列幅 `38px 1fr` を修正。
- `docs/ui/speclist-gallery.md`
  - 共通デザイン仕様を現行実装に合わせて更新。
- `scripts/lint-ui.mjs`
  - `--all` 対象を `.tsx` + `.css` に拡張。
  - `SpecSheetList` で旧図版トークン、`border-radius: 2px`、`JetBrains Mono` が再導入された場合に検出する `legacy-spec-sheet-token` ルールを追加。

## 検証

```bash
node scripts/lint-ui.mjs --all
npm run type-check
npm run lint
npm run build
```

- `lint-ui --all`: pass（101 UI files）
- `type-check`: pass
- `lint`: pass
- `build`: pass

補足:

- `npm run build` 中に既存の Turbopack broad pattern warning と KaTeX strict warn が出たが、今回変更由来ではなく既存コンテンツ/実装由来。
- 一部の重い `/docs/pe-first-stage-*` ページは 60 秒タイムアウトで自動リトライされたが、最終的に静的生成は完了した。
- build により `refresh-indexes` が走るため、既存の `src/config/*` 生成物は dirty のまま。

## 後続メモ

- 次の候補は UI-005（カードプリミティブ統一）または UI-006（`transition-all` 排除）。
- `docs/ui/speclist-gallery.md` のスクリーンショット画像そのものは再生成していない。見た目差分を厳密に確認するなら、ギャラリースクショ更新を別作業にする。
