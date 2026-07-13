# 品質改善スプリント: Turbopack / KaTeX / UI-005（実装ログ）

> [!done]
> **2026-07-14 完了**。指示書 `docs/project/04_運営/10_品質改善スプリント_Turbopack_KaTeX_UI.md` の 1/2/3 を全てやりきった。`npm run build` の Turbopack broad pattern warning と KaTeX strict warning を **どちらも 0 件化**し、UI-005 カードプリミティブ統一を本文/導線カード 11 点へ拡大した。

## 完了条件（全て達成）

| 条件 | 結果 |
|---|---|
| build log の Turbopack broad pattern warning | **0 件** |
| build log の KaTeX strict warning | **0 件** |
| `transition-all` in src/app・src/components | **0 件** |
| lint-ui --all / type-check / eslint / validate-mdx | すべて pass |
| `npm run build` | 完走（1091/1091 static pages・sitemap 1088 URL） |
| `node scripts/audit-katex-warnings.mjs --strict` | exit 0 |
| `npm test` | 141 tests / 138 pass / 0 fail |

## 1. Turbopack broad pattern warning（commit `fix(build)`）

- 原因: `src/lib/docs.ts` の `getDocMeta`/`getDoc` が `path.join(localContentDirectory, relativePath)` を fs へ渡し、Turbopack が `.local/r2/posts/**`（18,676 ファイル）を broad file pattern と解析。
- 対処: ローカル読み込みを **`src/lib/local-post-reader.ts`** に分離。
  - `fs`/`path` を `createRequire` で取得（node builtin と静的認識させない）。
  - 動的 `relativePath` の結合を `path.resolve/join` ではなく**文字列連結**に変更（`path.resolve(<known dir>, <dynamic>)` が warning の真因だった。createRequire だけでは消えず、path.* 呼び出しの除去が決め手）。
  - パストラバーサル検証（絶対パス・`\0`・`..`/`.` セグメント・`.mdx` 拡張子）は文字列操作で維持。
- R2 fallback・`slugToKeyMap`・`preprocessMDX` は不変。

## 2. KaTeX strict warning（commit `chore(katex)` + `fix(content)` ×2）

- **監査基盤**: `scripts/audit-katex-warnings.mjs` + 純ロジック `.claude/scripts/lib/katex-audit.mjs`（build と同じ remark-math パイプラインで数式ノードを抽出。`--json`/`--strict`/`--fix-safe`）。ユニットテスト 16 ケース。`npm run audit-katex(:ci)`、quality-audit の CHECKS に `katex-warnings`（ci:true）登録。
- **修正内訳（251→0）**:
  - `--fix-safe`（数式スパン内のみ）: 全角演算子 ＝＜＞＋／（218）・U+2212 `−`（5）・素 `%`（2）を半角/`\%` へ。7 ファイル。
  - 手修正: CJK in math を `\text{}` で包む（せん断抵抗力/滑動力・全・一定・イロハ・ア〜エ）。`\frac`＋`\text{}` は `\dfrac` 化（rule 11-1）。
  - GNI 通貨 `$100`/`$75,000` の prose `$` を `\$` エスケープ（remark-math の誤数式化を回避）。
- **remark 抽出の死角だった 2 件（万/円）**: `npv-net-present-value` が display math の区切りに**単独 `$`**（`$$` でなく）を使用しており、build の `preprocessMDX` が中身の `{}` をエスケープ（`\text{万円}`→`\text\{万円\}`）して `\text{}` を破壊、万/円が math mode に露出していた。`$$` へ修正。
  - 死角対策として `detectSingleDollarBlocks`（行が正確に `$` のブロック区切りを検出）を audit に追加。`audit-katex:ci` が同クラスの回帰を捕捉する。
- `docs/reference/content-authoring.md` の数式節に記法ルール（全角記号 NG・`%`→`\%`・CJK は `\text{}`・通貨 `$` は `\$`）と audit の使い方を追記。

## 3. UI-005 カードプリミティブ統一（commit `refactor(ui)`・11 ファイル）

生の `border/bg-[var(--paper)]/rounded-card-content/shadow-card-content` の羅列を **`.card-surface-content`** に集約し、クリック可能カードに **`.focus-ring`** を付与。

- surface 統一 + focus-ring: LinkCardClient / CareerAffiliate / NoteLink / MagazineInlineCard / RelatedArticleCard / MagazineTopBanner / PersonaSelector(Link 分岐) / HubCtaBanner(外枠) / SidebarAdBanner / PdcaCycle
- focus-ring のみ（accent-fill 背景を保持）: LinksHubTile
- **不変**: brand hover・note/資格ブランドバッジ・per-exam テーマ色・on-image 演出。
- **対象外（skip）**: **AuthorProfile**＝`shadow-soft`/影なし＋accent トップバーが意図的な editorial 意匠。`card-surface-content` に寄せると影の性格が変わるため触らない。
- 検証: lint-ui --all（101 files OK）・type-check・eslint 通過、`transition-all` 0 維持。preview で NPV 記事（display math 描画）と /links（card-surface-content computed style が従来の生ユーティリティと一致・focus-ring 61 要素・console error 0）を目視確認。

## 残課題・申し送り

- **content-quality ラチェットが赤**: 並行の BuildJob アフィリセッションが commit した 3 記事（`civil-construction-2/guide-buildjob-review`・`civil-construction-1/guide-career-consultation-before-quit`・`civil-construction-2/guide-career-agent-comparison`）に **15-1（です/ます単調）新規違反**。本スプリント着手前から develop で赤で、KaTeX 作業とは無関係。15-1 は copy リライトが必要でアフィリ担当セッションの範囲。baseline 更新で隠さず放置（次サイクルで copy 調整）。
- **SpecSheetList の JSX prop 内 `$...$`**: `SpecSheetList.tsx` が独自に `katex.renderToString`（strict 未指定）でランタイム描画。build log には出ないが将来の警告源になりうる。今回の audit（remark 抽出）対象外。必要なら SpecSheetList 側に strict callback を足す or items 内数式を監査する拡張を検討。
- **`/doc-sync` はフル実行せず**、変更面のドキュメント（content-authoring.md の数式節・04_自動化マップ.md の checks 件数 15→16）をピンポイント更新した。理由: 並行 Codex UI セッションが `design-system.md`・`speclist-gallery.md` 等を未コミットで保持しており、フル doc-sync が同ファイルに触れて衝突するリスクを避けたため。
- 本セッションのコミットは全て pathspec 指定で、Codex/アフィリの未コミット 32 ファイルは巻き込んでいない（UI コミットで一度 glob で 14 ファイルを巻き込んだが `git reset --soft`＋`restore --staged` で即是正済み・working tree 不変）。

## コミット

```
fix(build): Turbopack broad pattern warning を解消
chore(katex): KaTeX strict 警告の監査スクリプトを追加
fix(content): KaTeX strict 警告を解消（数式記法の是正）
chore(katex): audit-katex を quality:audit:ci に昇格 + 記法ルールを追記
fix(content): npv 記事の単独 $ ブロックを $$ 化 + 監査に検出を追加
refactor(ui): カードプリミティブ統一を本文/導線カードへ拡大（UI-005）
```
