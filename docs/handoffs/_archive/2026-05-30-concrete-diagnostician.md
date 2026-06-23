# コンクリート診断士 vertical 新設（2026-05-30）

第5の資格 vertical「コンクリート診断士」(`concrete-diagnostician`) を新設。ガイド4・テキスト6章（図25）・**択一過去問98問（図59）**を全て下書き（`published:false` / `visible:false`）で整備。本書はその記録と公開前の残課題。

原典: 技報堂出版『コンクリート診断士 受験対策講座 2020』スキャン10分冊（`docs/textbook/コンクリート診断士/`、commit `04062a1c4` で格納済）。

## 完了（コミット済・全て `published:false`）

| 区分 | 内容 | commit |
|---|---|---|
| scaffolding | `concrete-diagnostician` 登録（variant=civil / order=2.6 / **visible:false**）。groups = guide/textbook/primary | `e8717ba67` |
| ガイド4本 | 試験概要 / 学習法 / 記述式対策 / 出題傾向（独自執筆） | `c710e6715` |
| テキスト6章 | 変状の種類と原因 / 劣化機構 / 調査試験 / 予測評価判定 / 対策補修補強 / 維持管理。原典を写さず独自散文＋原典スキャンから図写真25点クロップ→webp | `36471a984` `674b29622` |
| 過去問 択一8本 | 厳選101問の **択一98問**（問題1〜101、欠番48/56/85）を演習8本（`primary-exercise-01〜08`）に整備。図59点クロップ。低確度正答は下書き注記Calloutに明示 | `9b72e9530`（1-53）`0839de1e3`（54-101） |
| タグ allowlist | `concrete-diagnostician` / `study-method` / `exam-trends` を `src/config/tags.json` に追加 | （並行セッション 07902e249 に同梱） |

> [!note] 公開ゲート
> 全記事 `published:false`、カテゴリ `visible:false` のためサイト上に露出しない。公開時は (1) テキストの**図クロップを精密トリミング/SVG化**（現状は周辺本文を含むラフな頁領域クロップ。原典本文画像を含むため著作権上も要差替え）、(2) 数値・規格の最終確認、(3) `npm run refresh-indexes` 実行、が前提。

## 過去問（択一）— 整備完了（draft）と公開前の残課題

方針: ユーザー判断で「技報堂本から転記（下書き限定）」「フルスロットル」「やり切る」。公式は正解肢のみ公開で問題文非公開のため、原典が唯一の出所。

**初回 transcribe→verify は照合パス 5/53 と低品質**（問題の約6割が図依存、逐語誤り頻発、正答が別頁）。そこで正攻法パイプラインを構築し完遂した:

実施（2026-05-30 完遂）:
1. スキャンは頁により回転不統一 → 問題頁は `pdftoppm -r 200 → magick -rotate 90 → 左右分割`（`.tmp/render-rot.sh` / `render-rot10.sh`）。
2. 各 book-page を **transcribe → verify → self-repair（不合格は校閲指摘を feedback に再transcribe）→ 再verify** の自己修復パイプライン（`.tmp/wf-finalize9.mjs` / `wf-finalize10.mjs`）で処理。
3. **正答**は頁内解説＋独立解答で確定し confidence(high/low) を付与（解答一覧表 PDF10 p16-18 は読取不整合のため不採用）。
4. **図依存問題**（約6割）は agent が正規化 bbox を返し、`.tmp/assemble.mjs` が高解像度 split 画像からクロップ→webp 埋込（`<ArticleImage>`）。読取困難な選択肢表も図として収録。
5. 低確度の正答は記事冒頭の **下書き注記 Callout** に問題番号を列挙。

成果（全 `published:false`）:
- **択一 98問**（問題1〜101、欠番 48・56・85）を演習8本 `primary-exercise-01〜08`（section 1-8）に整備。
- **図 59点**クロップ。PDF9=84エージェント/約220万トークン、PDF10=102エージェント/約300万トークン。
- MDX 実コンパイル pass、HIGH lint 0、`<details>` 整形・HTMLコメント→`{/* */}` 正規化済。

残課題（公開前の人手校正）:
- 低確度フラグ問題（約40問）と各記事の `{/* */}` 注記（小文字の逐語不確実・図位置・別頁切れ）の確認。per-page verify 結果は `.tmp/cd-final9.json` / `.tmp/cd-final10.json`。
- 欠番 48・56・85 の補完（頁境界で取りこぼし）。
- 図はラフな領域クロップ。著作権上も公開前にトリミング/差替が前提（原典＝技報堂の問題は JCI 過去問の再録のため、公開には権利確認が必須＝当面 draft 固定）。
- 記述式（II部, PDF7-9）は未着手。

代替案（参考）: 完全公開可能にするなら、択一は**運営者オリジナル作問**（分野別）へ差替える選択肢もある。

## 記述式 → note 有料マガジン（draft）

記述式（問題A・問題B）はサイトではなく **note 有料マガジン**で展開（ユーザー方針 2026-05-31）。`docs/note/コンクリート診断士/magazines/コンクリート診断士-記述式-模範答案集/`（commit `7b2b9a38d`）。

- **8記事**: 解法ガイド1 ＋ 問題A模範答案2（維持管理 / 診断士の役割）＋ 問題B模範答案5（塩害 / 中性化 / ASR / 凍害 / 疲労複合）。各 想定問題（オリジナル代表例）＋フル模範答案（問題A 800-1000字級・問題B 1000-1400字級, 5ステップ型）＋採点者視点＋置換ガイド。
- **著作権**: 実在過去問を逐語再現せず**オリジナル代表問題**で構成（診断士の記述問題は非公開のため）。固有数値は `〇〇` 置換前提。本文に価格・URL 無し。→ **択一と違い公開に支障なし（sellable）**。
- 価格: `_meta.yaml` setPrice ¥1,980 / articlePrice ¥500 / 8本。`note-magazines.ts` に `cd-essay-magazine`（published:false）登録済。
- **公開時の残作業**: (1) note で記事/マガジン公開→ `_meta.yaml` の各 `noteUrl` と `note-magazines.ts` の `noteUrl`/`published:true` を埋める (2) cover 画像 `/images/magazines/cd-essay-cover.webp` 作成 (3) `magazine-placement.ts` に診断士ページ→マガジンの placement 追加（site CTA 発火、診断士 vertical 公開後）。
- 品質採点は未実施（`civil-keiken-essay-qa` は施工経験記述専用で診断士論述に非対応）。公開前に人手レビュー推奨。

## 並行セッション注意

本作業中、同一ブランチ `feat/concrete-chief-engineer` で**別セッションがコンクリート主任技師の図版作業を並行コミット**。その `git add` が診断士スキャンPDF（`04062a1c4`）と初期版テキスト4本（`7c670c675`）を巻き込んだ。修正版は上書きコミット済で最終状態は正。**index 再生成（refresh-indexes）は競合回避のため未実行** — 公開前または並行作業終息後に実行する。
