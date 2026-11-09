---
name: standards-visual-review
description: >
  基準書（/standards）の章ページを撮影し、原本のページ画像と見比べる目視判定をエージェントに回して、台帳に記録し不合格を起票する。週次の点検で「判定待ち」が出たとき・章記事の生成器や表を直したあとに使う。
  Use when user asks to [基準書の画面を確認, 共通仕様書の目視, スクショで確認, /standards-visual-review].
user-invocable: true
domain: site
---

# /standards-visual-review

基準書の章ページを**読者の画面のまま撮り**、**原本のページ画像と見比べて**、崩れ・欠けを章ごとに pass / fail で記録する。
機械の検査（`check-standard-articles`）が全部 PASS でも、表の記法の文字が画面に出ていた（DN-0916）ことへの対策。

撮影・対象の選定・判定の検証・記録・起票は `scripts/standards-visual-review.mjs` が決める。
エージェント `standards-page-visual-auditor`（sonnet・audit-only）は撮影を見て判定を書くだけ。

## いつ回すか

- **週次の点検**（`review-checks --cadence weekly`）が `standards-visual-review:status` で fail を出したとき（判定待ちがあるのに 14 日回していない・未起票の不合格がある）
- 生成器 `scripts/build-standard-articles.mjs`・表の台帳・`src/app/standards/**` を直したあと（中身のハッシュが変わった章が自動で先に選ばれる）
- 不合格のカードを直したあとの確認（`--keys` で指定）

## 手順

1. **配信を用意する**（既定は `npm run serve` の http://localhost:3025）。out/ が章記事・描画の最後の変更より古いと prepare が検査不成立（exit 2）で止まるので、`npm run build` してから `npm run serve`。
   ビルドを省きたいときは `--base https://doboku-note.com`（本番＝main。develop の変更は写らないので、直した章の確認には使わない）
2. **撮る**: `npm run standards-visual-review -- prepare`（既定 12 章。`--limit N`・`--only kinki/hikkei`・`--keys a/b/c,…`）。
   順番は (1) 不合格のあと中身が変わった章 (2) 合格のあと中身が変わった章 (3) 未判定の章（索引される章・表と図の多い章が先）。
   Drive vault の原本ページ画像を読むので、Drive がマウントされていないと exit 2
3. **判定させる**: 作業票の章を 4 章ずつに分け、`standards-page-visual-auditor` に渡す（同時に 3 体まで）。渡すのは
   `packet`（作業票のパス）・`keys`（その組の章）・`out`（`<作業票のフォルダ>/verdicts/batch-NN.json`）だけ
4. **記録する**: `npm run standards-visual-review -- record --run <作業票のフォルダ> --ticket`。
   判定の欠け・矛盾（見ていない撮影がある・major があるのに pass・機械の崩れがあるのに pass・ハッシュ違い）は exit 1 で、台帳を書かない。
   該当の組だけエージェントに差し戻して書き直させ、record し直す。`--ticket` は不合格を**文書ごとに 1 枚**の DN カードへ起票する（同じ中身で起票済みの章は引き継ぐ）
5. **コミット**: 台帳 `.claude/state/quality/standards-visual-review.json` だけをコミットする（カードは todo:add が develop へ直接積む）
6. **確かめる**: `npm run standards-visual-review -- status` が exit 0（未起票の不合格 0・直近 14 日に実行あり）

## 報告

判定した章の数・合格・不合格、起票した DN-ID、status の被覆（判定済み / 全章）を書く。
不合格の中身はカードに書いてあるので、報告では原因の種類（記法の文字・図の抜け・表のずれ など）の内訳だけでよい。

## 罠

- **新しく足したエージェントは、そのセッションの中では呼べない**（次のセッションから）。同じセッションで回すときは、汎用のエージェントに定義ファイル `.claude/agents/standards-page-visual-auditor.md` を読ませて従わせる
- 機械の崩れ（`deterministicIssues`）がある章は判定を待たず fail が確定する。それでもエージェントには見せる（同じ章のほかの崩れを拾うため）
- 撮影は表・図ごとに最大 10 枚（`--max-shots`）、本文の区切りは 4 枚（`--max-tiles`）まで等間隔に間引く。間引いた章は合格でも全部を見たわけではない（作業票の `notes` に残る）
- 同じ中身の他機関の章（近畿の共通仕様書と同じもの）は対象にしない（`standards-render-targets` の all と同じ範囲・546 章）
