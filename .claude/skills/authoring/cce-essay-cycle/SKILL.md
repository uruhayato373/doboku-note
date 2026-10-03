---
name: cce-essay-cycle
description: >
  コンクリート主任技士 小論文の出題履歴 SSOT・サイト/note の傾向記事・令和形式の模範答案（テーマ別・立場別）・PDF/ココナラ展開を一本化する統括スキル。
  新年度の出題追記（history）→ 傾向記事の再生成 → writer/qa で答案作成（draft）→ PDF 化と配線（product）へルーティングする。
  Use when user asks to [主任技士 小論文, コンクリート主任技士 小論文の傾向, 小論文テーマ別答案, 主任技士 小論文 新年度追記, /cce-essay-cycle].
user-invocable: true
domain: product
---

# /cce-essay-cycle — コンクリート主任技士 小論文 統括

出題履歴を 1 か所（SSOT）に置き、サイト・note・商品がそこから派生する流れを保つための入口。各工程の実体は既存のエージェント・スクリプトで、このスキル自体は判定ロジックを持たない。

## 真実源

| 何を | どこ |
|---|---|
| 出題履歴・テーマ分類・答案の型と字数帯 | `config/cce-essay-history.json` |
| 判定（型・字数・出題年一致・履歴ブロック同期） | `scripts/lib/cce-essay.mjs`（CLI `npm run check-cce-essay`） |
| 出題形式・過去問の公開範囲 | `config/exam-formats.json` の `concrete-chief-engineer` |
| 価格・noteUrl・公開状態 | `src/lib/note-magazines.ts`（`cce-*`）・`src/lib/coconala-services.ts` |

年度別テーマを記事へ書くときは、手で写さず**出題履歴ブロック**（マーカー `cce-essay-history:start` ～ `end`）を置いて `node scripts/check-cce-essay.mjs --fix` で生成する。サイト MDX は `{/* cce-essay-history:start since=2012 format=table */}`、note は `<!-- cce-essay-history:start since=2020 format=list -->`（note はパイプ表非対応）。

## モード

```
/cce-essay-cycle --mode {history|draft|product}
```

### history — 新年度の出題を追記する（毎年 12 月、試験後）

1. 出題を 2 出典以上で確認する（JCI は問題文を公開しない。書籍・合格者記事を突合）。主担当が原文を読んでから書く（サブエージェントの要約を正本へそのまま入れない）。
2. SSOT の `years` 先頭に追記（`options[].theme` を `themes` の id へ対応づけ、`items`・`confidence`・`sources` を必ず付ける）。新しいテーマ系統なら `themes` に追加し、商品の要否を判断する。
3. `node scripts/check-cce-essay.mjs --fix` で全ての出題履歴ブロックを再生成 → `node scripts/check-cce-essay.mjs` が exit 0（テーマ別記事の `cceSourceYears` 不一致もここで赤になるので、該当記事の frontmatter を更新）。
4. サイトは `npm run refresh-indexes`、note は再同期（note-sync）。

### draft — 模範答案を作る

1. `cce-essay-writer`（`magazine`・`slug`・`theme`）で 1 記事ずつ生成。同時起動は 3 体まで。立場別記事（1立場×1テーマ）は親が下書きを用意し、writer をテーマ単位で8本ずつ走らせる（立場と置き場の対応は `content/note/コンクリート主任技士/noteコンテンツ計画.md`）。
2. `cce-essay-qa` で採点。平均 ≥ 2.0・全軸 ≥ 1・決定論ゲート全通過で合格。不合格は issues を writer へ渡して再走。
3. 親が技術事実の抜き取り照合（各記事 3 箇所以上）をしてから commit。

### product — PDF・ココナラ・配線

1. `magazine-pdf-builder` で PDF 化（`/magazine-to-pdf`）。
2. `note-magazines.ts` に SoT を追加（`published: false` のまま）、`magazine-placement.ts` の `concrete-chief-engineer-guide-essay` を新商品へ。
3. ココナラは `coconala-services.ts` に `status: 'draft'` で登録（PDF は note 価格×1.1）。出品・note 公開は運営者が文面を確認してから（公開は取り消せない）。
4. 旧商品（序論本論結論型）は販売履歴があるため非公開にしない。案内文を追記して導線だけ切り替える。

## 担当外

- 択一（四肢択一）の予想問題・演習 → 親が直接
- 診断士（`concrete-diagnostician`）の小論文 → 別系統（本 SSOT は主任技士専用）
