# 2026-06-27 デッドコード候補レビュー

> [!done]
> **全候補 対応完了（2026-06-27）**: 大型候補（`inlineMobileOnly` / component-loader 二重管理 / `SidebarSearch` / 旧サイドバー系 `SidebarNav`・`GeneratedIndexPage`・`sidebar.ts` / `ReferenceCardLink` / `ErrorBoundary`）は Phase 0f（PR #284）で除去。残る確実な未使用 local 2件（`CategoryIcons.tsx` の `React` import、`mdx-callout-parser.ts` の `match` 引数）は `bbbc39ab8` で処理。`tsc --noUnusedLocals --noUnusedParameters` クリーン化を確認済み。本ファイルは対応記録として保持する。

目的: デザイン改善 Phase 0 の前に、削除・整理対象になり得るデッドコード候補を独立ファイルとして保存する。

位置づけ:

- 実装ロードマップ本体: `docs/design-system/proposals/2026-06-27-design-implementation-roadmap.md`
- 本ファイル: デッドコード候補の詳細メモ

---

## 結論

デッドコード候補は残っている。

`npm run lint` は pass しているが、unused export や「返しているが読まれていないフィールド」は検出できない。追加で `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` を実行したところ、確実な未使用 local が 2 件見つかった。

---

## 検証コマンド

```bash
npm run lint
npx tsc --noEmit --noUnusedLocals --noUnusedParameters
```

結果:

- `npm run lint`: pass
- `npx tsc --noEmit --noUnusedLocals --noUnusedParameters`: fail

検出された確実な未使用:

- `src/components/icons/CategoryIcons.tsx(1,1)`: `React` import が未使用。
- `src/lib/mdx-callout-parser.ts(130,6)`: `match` 引数が未使用。

---

## 確実に整理してよい候補

### `src/components/icons/CategoryIcons.tsx`

内容:

- `React` import が未使用。

対応:

- import を削除する。

確認:

```bash
npx tsc --noEmit --noUnusedLocals --noUnusedParameters
npm run lint
```

### `src/lib/mdx-callout-parser.ts`

内容:

- `replace` callback の `match` 引数が未使用。

対応:

- 未使用引数を `_match` にする、または callback 引数から外せる形なら外す。

確認:

```bash
npx tsc --noEmit --noUnusedLocals --noUnusedParameters
npm run lint
```

---

## 高確度のデッドコード候補

### `ResolvedPlacement.inlineMobileOnly`

ファイル:

- `src/lib/magazine-placement.ts`

根拠:

- `ResolvedPlacement` の返り値として多数セットされている。
- repo 内検索では `.inlineMobileOnly` を読む呼び出し側が見当たらない。
- 2026-06-26 の CTA 統合後の名残である可能性が高い。

対応案:

- `ResolvedPlacement` から `inlineMobileOnly` を削除する。
- `EMPTY` と各 return object から `inlineMobileOnly` を削除する。
- `resolvePlacement()` の既存テストまたは追加テストで inline/sidebar の挙動を確認する。

### MDX component registry の二重管理

ファイル:

- `src/lib/component-loader/common.ts`
- `src/lib/component-loader/specific.ts`
- `src/lib/component-loader/index.ts`

根拠:

- `commonComponents` と `commonLoaders` が別々に管理されている。
- `AuthorCallout` は `commonComponents` にあるが `commonLoaders` にはない。
- `specificComponents` は空。
- `getAllAvailableComponentNames()` の repo 内参照が見当たらない。

対応案:

- `commonLoaders` を単一の真実源にする。
- `getAllAvailableComponentNames()` が不要なら削除する。
- 必要なら `Object.keys(commonLoaders)` から返す。
- `common.ts` / `specific.ts` が不要なら削除する。

### `src/components/search/SidebarSearch.tsx`

根拠:

- repo 内参照が見当たらない。
- 現在の `/search` は単カラム集中型方針であり、右サイドバー検索 UI を使う予定が薄い。

対応案:

- 削除候補。
- 将来使う明確な理由がある場合はロードマップではなく設計メモへ移す。

### 旧サイドバー/生成インデックス系

ファイル:

- `src/components/layout/SidebarNav.tsx`
- `src/components/layout/GeneratedIndexPage.tsx`
- `src/lib/sidebar.ts`

根拠:

- 3ファイル間では相互参照している。
- ただし外部から `SidebarNav` / `GeneratedIndexPage` / `getSidebar` を使う参照が見当たらない。
- 現在の docs/category 設計では別系統の ArticleSidebar / CategorySidebar へ寄せる方針。

対応案:

- まとめて削除候補。
- 削除前に古い生成ページ導線が残っていないか確認する。

### `src/components/home/ReferenceCardLink.tsx`

根拠:

- `src/components/home/index.ts` で barrel export されている。
- 実使用が見当たらない。

対応案:

- component と barrel export を削除する。

### `src/components/providers/ErrorBoundary.tsx`

候補:

- `BlogErrorBoundary`
- `withErrorBoundary`
- `ImageWithFallback`

根拠:

- repo 内で外部使用が見当たらない。
- ファイル内では `withErrorBoundary` が `BlogErrorBoundary` を使っているが、呼び出し側がない。

対応案:

- 削除候補。
- Next.js の error boundary は `error.tsx` ルート単位で整備する方が現行設計に合う可能性がある。

---

## 削除前に確認すること

1. MDX 内の動的コンポーネント名として使われていないか。
2. scripts / docs 生成処理から import されていないか。
3. `.claude` 配下など、通常 `src` 検索外の運用スクリプトが参照していないか。
4. 削除後に `npm run type-check` / `npm run lint` / `npm test` が通るか。

---

## Phase 0 での推奨順

1. 確実な未使用 local 2件を削除する。
2. `inlineMobileOnly` を削除する。
3. MDX component registry を単一ソース化する。
4. `SidebarSearch` / `ReferenceCardLink` を削除する。
5. 旧サイドバー/生成インデックス系を削除する。
6. `ErrorBoundary` 系を削除するか、Next.js の `error.tsx` 方針に置き換える。

---

## 検証方針

削除 PR では最低限:

```bash
npm run type-check
npm run lint
npm test
```

未使用 local の確認:

```bash
npx tsc --noEmit --noUnusedLocals --noUnusedParameters
```

ただし `noUnusedLocals` は unused export を検出しない。unused export まで機械検出したい場合は、別途 `knip` などの導入を検討する。
