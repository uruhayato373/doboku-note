# 機械品質チェック統合基盤 監査レポート

> [!note]
> **2026-07-14 実施**。コード・記事・画像/SVG の機械チェックを整備・実行し、統合 orchestrator `quality:audit` を新設した。本レポートは「何を検査できるようになったか / 何を検出したか / 何を直したか / 残課題」の記録。

## 1. 結論

- **統合ランナー `npm run quality:audit`（report）/ `quality:audit:ci`（CI gate）を新設**。既存 30+ の check-* を宣言的に横断実行し、pass/fail/skip と所要時間を JSON/MD にレポートする。
- **CI gate（quality:audit:ci）は 15 チェック全 green**。ci.yml を type-check/test/validate-mdx/home-exam-coverage の 4 ステップから `quality:audit:ci → build` に集約し、eslint・ラチェット・svg・image・frontmatter・台帳整合も CI で enforce されるようになった。
- **全量ラチェットの新規違反 43 件を解消**（fix 33 件＋過去問データ表の rule 免除）。ラチェットは GREEN。
- 新規機械チェック **9 種**を追加し npm script 化。既存超過は baseline で grandfather し、以後の新規のみブロックする。

## 2. 実行したコマンド（pass/fail/skip）

`npm run quality:audit` の結果（2026-07-14）:

| チェック | 区分 | 結果 | 備考 |
|---|---|---|---|
| type-check / unit-tests(125) / eslint / validate-mdx | ci | PASS | |
| content-quality-ratchet | ci | PASS | 新規違反 0 |
| frontmatter / svg-audit / image-assets | ci | PASS | |
| orphan-figures / orphan-ogp / guide-length | ci | PASS | |
| home-exam-coverage / category-curriculum / note-funnel / doc-refs | ci | PASS | |
| doc-lifecycle / policy-anchors / ogp-coverage / ogp-design / quality-census / env-inventory / cta-density | report | PASS | |
| internal-links | report | **FAIL** | 既存債務（下記 6） |
| note-meta-lint | report | **FAIL** | 既存バグ（下記 6） |
| knip | report | **FAIL** | デッドコード候補（情報・要 grep 裏取り） |
| seo-meta | report | SKIP | dev server(:3020) 不在時は自動 skip |
| build | — | PASS | sitemap 1086 URL・RSS 生成 |

外部 API・公開系（fetch-gsc/ga4/psi・note-*・r2・deploy）は依頼範囲外のため orchestrator の定義に載せていない（副作用ゼロ）。

## 3. 新規に追加した機械チェック

| # | チェック | npm | 内容 |
|---|---|---|---|
| 1 | 統合 orchestrator | `quality:audit` / `:ci` | 全 check を横断実行・JSON/MD レポート・CI gate |
| 2 | 画像アセット | `check-image-assets` / `:ci` | サイズ上限・危険ファイル名・未参照・webp 欠落 |
| 3 | SVG P13 | audit-svg | `<foreignObject>`（SVG→PNG 非互換）HIGH |
| 4 | SVG P14 | audit-svg | `@font-face`/外部 href（ビルド未解決）HIGH |
| 5 | SVG P15 | audit-svg | viewBox 欠落 MEDIUM |
| 6 | MDX 0-3 | content-quality | U+FFFD 文字化け HIGH |
| 7 | MDX 0-4 | content-quality | MDX コメント内 TODO/FIXME/TBD（本文「仮置き」は誤検知しない）MEDIUM |
| 8 | MDX 2-4 | content-quality | 見出しアンカー ID 重複 MEDIUM |
| 9 | MDX 7-3 | content-quality | 装飾絵文字（❌✅⭕★↔ 等の過去問/強調記号は除外）MEDIUM |
| 10 | MDX 10-6 | content-quality | alt 空・一般語 MEDIUM |
| 11 | frontmatter G4 | (lint-frontmatter) | title/seoTitle 長（<title> 70 字換算）MEDIUM |
| 12 | env インベントリ | `env-inventory` | process.env 参照の棚卸し（値は読まない・32 変数） |
| 13 | no-console | `lint` | src/ の console.log 禁止（warn/error 許容） |

真実源: 閾値 = `.claude/config/{content-rules.json, image-limits.json}`、baseline = `.claude/state/quality/{lint-baseline.json, image-baseline.json}`。純ロジックは `#lib/{mdx-hygiene-rules,image-audit}.mjs` にありユニットテスト付き（新規 28 ケース）。

## 4. 検出件数サマリ

- **ラチェット新規違反 43 件**（作業前）→ 0 件（GREEN）。baseline 総違反 4465 → 3771（concrete 免除で純減、新ルール分を加算）。
- **画像サイズ超過 135 件**（PNG 102 / JPG 15 / WebP 17 / SVG 1）→ baseline で grandfather。危険名 0・新規超過 0。
- **新 MDX ルール**: 0-3=0 / 0-4=3 / 2-4≈239 / 7-3=0 / 10-6=0 → grandfather。7-3・0-3・10-6・G4 は現状 0 件の前方ガード。
- SVG P13/P14/P15 は既存 287 枚で 0 件（前方ガード）。

## 5. 自動修正した内容（43 件の内訳）

**内容修正（33 件相当）:**
- 単行 `$$…$$` → display math 3 行化：concrete-chief 5 記事・19 箇所（11-2）
- pe 総監 keyword 17 記事：長段落 31・長文 9 を改段/句点分割（15-2/15-3、専門用語・数値・法令名は不変）
- civil secondary-concrete-basics：入れ子リスト 14 群をフラット化（3-1、内容 697=697 一致で裏取り）
- natural-parks-act：2 軸比較表をバレット化＋長段落分割（1-4/15-3）

**rule 免除（過去問データ表は箇条書き化不可＝civil 先例に倣う）:**
- `content-rules.json` overrides に `concrete-chief-engineer.primary` を追加し 1-3/1-4（ふるい分け・圧縮試験・配合計算の問題データ表）と 15-2/15-3（問題文・計算過程は 1 文が長い）を免除。

## 6. 未修正の残課題（要対応）

| 項目 | 内容 | 推奨対応 |
|---|---|---|
| guide-career 2 記事（15-1×2, 1-4×1） | 並行の BuildJob アフィリ commit が注入。15-1 は copy 文言変更が必要で本作業の mechanical-only 範囲外 | アフィリ担当セッション/次サイクルで copy 調整 |
| internal-links BROKEN_SLUG | concrete-chief 等の RelatedKeywords が存在しない slug を参照（既存債務） | 該当 slug のページ作成 or RelatedKeywords 修正。定期監査は link-audit.yml |
| note-meta-lint クラッシュ | `node:fs/promises` の `glob` が Node20 で未提供 | scripts/note-meta-lint.mjs の glob を readdir 再帰 or glob パッケージへ差し替え |
| knip デッドコード候補 | barrel index.ts 等の未使用候補（誤検知含む） | grep 裏取りの上で de-export/削除（memory: knip-dead-code-audit） |
| 画像 grandfather 135 件 | 既存の大きい PNG/JPG/WebP | 段階的に generate-webp/圧縮でバーンダウン（新規はガード済み） |
| 2-4 grandfather ≈239 件 | 経験記述例集の反復見出しが主（意図的並列構造） | 大半は許容。新規の偶発重複のみガード対象 |

## 7. 手動確認が必要な項目

- **seo-meta**: `npm run dev`（:3020）起動中に `npm run check-seo-meta`。orchestrator は dev server 不在時に自動 skip。
- **census 薄層**: `quality-census` の薄層セクションはリライト判断が人手。
- **画像未参照候補**（report-only）: note magazine cover 等は article.mdx 外参照のため誤検知しうる。目視で判断。

## 8. 推奨運用

- **pre-commit**: 現状維持（staged ゲート ~24 本）。全量走査の quality:audit は pre-commit に載せない。
- **CI**: `quality:audit:ci`（本 PR で ci.yml 組込み済み）。新チェックが PR/push で enforce される。
- **月次棚卸し**: `npm run quality:audit`（report）で全体を俯瞰し、grandfather のバーンダウン（画像圧縮・薄層リライト・2-4 偶発重複）を計画。
- **新チェック追加時**: `.claude/config/*` に閾値、`#lib/*` に純ロジック＋テスト、`quality-audit.mjs` の CHECKS に登録、の3点セット。
