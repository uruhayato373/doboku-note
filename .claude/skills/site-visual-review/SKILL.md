---
name: site-visual-review
category: ui
description: >
  サイトの代表ページを全部の画面幅で撮り、レイアウト・読みやすさ・商品導線（note・アフィリエイト・ココナラ）を機械の検査とエージェントの目視で判定し、不合格を直して撮り直すサイクル。
  Use when user asks to [画面幅ごとに確認, スクショで UI を点検, レスポンシブ確認, 導線の見え方を確認, /site-visual-review].
user-invocable: true
domain: site
---

# /site-visual-review

サイトの代表ページを**全部の画面幅で撮り**、**機械の検査**と**エージェントの目視**で pass / fail を記録し、不合格を**直して撮り直す**。
1 つの画面幅だけを見た確認は、ほかの幅の崩れを通す（2026-11-11 にトップページで、1280px を超える幅だけ 2 区画が左右 40px 広いのを人が見つけた）。

撮影・対象の選定・機械の検査・判定の検証・記録・起票は `scripts/site-visual-review.mjs` が決める。
エージェント `site-page-visual-auditor`（sonnet・audit-only）は撮影を見て判定を書くだけ。直すのは親（またはページの UI を組む `page-design-builder`）。

- 対象と画面幅: `config/site-visual-review.json`（ページの種類ごとの代表 URL・必ず出す導線 `expect`・画面幅）
- 台帳: `.claude/state/quality/site-visual-review.json`（判定はページの骨組みのハッシュに結ぶ。部品やレイアウトを変えると判定待ちに戻る）

## いつ回すか

- **週次の点検**（`review-checks --cadence weekly`）が `site-visual-review:status` で fail を出したとき（未判定があるのに回していない・未起票の不合格・28 日以上回していない）
- `src/components/**`・`src/app/**`・`src/styles/**` のレイアウトや導線の部品を変えたあと（`--keys` で影響するページを指定）
- 新しい種類のページ・導線の置き場を足したとき（先に設定へ代表 URL を足す）

## 手順

1. **配信を用意する**。既定は `npm run serve` の http://localhost:3025（`npm run build` が要る。out/ が `src/` の最後のコミットより古いと prepare が exit 2）。
   直しながら回すときは開発サーバー `--base http://localhost:3020`（画像は代わりの表示になる。導線と骨組みの確認には足りる）
2. **撮る**: `npm run site-visual-review -- prepare`（既定は判定の無い・古いページから 4 ページ。`--keys home,guide`・`--all`・`--limit N`）。
   Playwright のブラウザを入れていない端末は `--channel chrome`。会社 PC で起動ガードに止められたら `DOBOKU_PW_SKIP_GUARD=1`。
   骨組みが前の判定と同じページは作業票に載らない（判定が生きている）。**機械で決まる崩れ**（`edge` コンテナ幅の不統一・`overflow`・`image`・`cta-missing`・`cta-clip`）はここで出る
3. **判定させる**: 作業票のページを 2 ページずつに分け、`site-page-visual-auditor` に渡す（同時に 3 体まで）。渡すのは
   `packet`（作業票のパス）・`keys`（その組のページ）・`out`（`<作業票のフォルダ>/verdicts/batch-NN.json`）だけ
4. **記録する**: `npm run site-visual-review -- record --run <作業票のフォルダ>`。
   判定の欠け・矛盾（見ていない撮影・major があるのに pass・機械で決まる崩れがあるのに pass・ハッシュ違い）は exit 1 で、台帳を書かない。該当の組だけ差し戻す
5. **直す**: 不合格の指摘を原因の部品ごとにまとめる。**同じ崩れが複数のページに出るなら、ページではなく共通の部品を直す**（コンテナ・カード・導線の部品。
   ページごとに同じクラスを書き足さない）。色・角丸・影はトークン、レイアウトは `PageShell` などの既存の部品（[design-system.md](../../knowledge/design-system/design-system.md)）。
   このセッションで直さない不合格は `record --ticket` でページごとに起票する
6. **撮り直す**: `npm run site-visual-review -- prepare --keys <直したページ>` → 判定 → record。**完了は、そのページが pass と台帳に記録されたとき**
7. **コミット**: 直したコードと台帳 `.claude/state/quality/site-visual-review.json` をコミットする
8. **確かめる**: `npm run site-visual-review -- status` が exit 0

## 報告

撮ったページ数 × 画面幅の数・合格・不合格、機械で決まった崩れの種類、直した部品、起票した DN-ID、撮っていないページ（未判定の残り）を書く。

## 罠

- **新しく足したエージェントは、そのセッションの中では呼べない**（次のセッションから）。同じセッションで回すときは、汎用のエージェントに定義ファイル `.claude/agents/site-page-visual-auditor.md` を読ませて従わせる
- 訪問者ごとに案を振る実験（転職枠・note の本文）は**最初の案だけ**を撮る（撮るたびに骨組みが変わらないように固定している）。ほかの案の見え方は `npm run affiliate:shots`
- 明るい配色だけを撮る。暗い配色は `/design-review --visual`
- 高さが上限を超えるページは縦の区切りを間引く（作業票の `notes`）。間引いた区切りに入った商品導線だけは、まわりごと別に撮る
- 撮影の横幅はスクロールバーの無い幅。スクロールバーのあるブラウザでは中身が約 15px 狭くなり、区切りの幅ちょうどでは折り返しが変わることがある
- 機械の `edge` の基準は**ヘッダーの中身の端**（サイトの外枠）。本文の区画は外枠より狭くてよいが、外へ出ると不合格になる（多数派を基準にすると、記事ページで本文の中の区画が多数派になり、ヘッダーとフッターが誤って赤くなった）
- 過去問のページは画面外の段落を描画から外している（`content-visibility: auto`）。全体を撮ると空白になるので、prepare は撮影の間だけ外している。撮影に大きな空白があったら、不具合と決める前に実際の画面で確かめる
- 長い数式（`.katex-display`）・表（`.table-scroll`）は横に送って読む箱。右端で切れて見えるだけでは不合格にしない
- 機械の `edge` が意図どおり（区画をわざと全幅にしている）のときは、設定の `ignore: ["edge"]` をそのページに付け、理由を `$comment` に書く。黙って pass にはできない
- 広告の配置ルール（面 × 案件 × 期間）の正否は `npm run affiliate:shots`、note の導線の配線は `/audit-note-funnel` が見る。ここで見るのは**画面での見え方**
