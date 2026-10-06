---
title: 図 provenance システム（出所・品質・次アクションの恒久記録）
---

# 図 provenance システム

記事図クロップ（`content/site/**/img/*.{png,webp}`）1 枚ごとに「**出所（どのソース由来か）・品質・次にすべきアクション**」を機械記録し、**毎回手で辿り直さない**ための土台。図品質を継続的に改善する運用の SSOT。

> [!note] なぜ作ったか
> 図を直すたびに「これはどのPDF/スキャンの何ページ？」「シャープな元はある？」を手で辿っていた（同じ調査の繰り返し）。それを 1 度記録して恒久化する。

## 層構成

| 層 | ファイル | 役割 | 生成 |
|---|---|---|---|
| ① ソース台帳（SSOT・手動） | `config/figure-sources.json` | 資格別に元素材の所在・種別・品質・**再スキャン要否**＋ machine-blind 欠陥の per-figure 上書き（`manual_needs`） | 手動更新（ソース状況が変わったとき・ループの対象外にしたい恒久例外。目視で見つけた見切れは④判定台帳へ） |
| ② 品質監査（機械・OCR） | `.claude/state/figure-text-audit.json` | 各図の**写り込み**(leak=答え漏らし/writein=設問・選択肢/maybe=句点あり要目視/clean)＋**画質**(sharp/soft/blurry・ラプラシアン分散) | `npm run audit-figure-text`（OCR＋magick・数分） |
| ②' クロップ検査（機械・画素ジオメトリ） | `.claude/state/quality/figure-crop-report.json` | ②の OCR が見ない**画素**の不良: 隣接図の切れ端の写り込み(STRAY_SLIVER)・縁接触分類(EDGE_*)。②で `clean` でも縁の写り込みを捕捉（例 r07-a-fig-04） | `npm run check-figure-crop`。CI は STRAY_SLIVER の新規のみ gate（baseline ratchet）。詳細 → [image-policy.md](image-policy.md)「図クロップの機械検査」 |
| ③ provenance マニフェスト（機械・join） | `.claude/state/figure-provenance.json` | ①②＋命名(年度)＋公開/掲載＋④ を join し、各図の **needs（次アクション）** を算出 | `npm run build-figure-provenance` |
| ④ 判定台帳（目視・ハッシュつき） | `.claude/state/quality/figure-review-ledger.json` | `/figure-quality-loop` が目で判定した結果（ok / needs-source / source-unavailable）を**今の画像の sha256** と一緒に記録。sha が一致する記録だけが効く＝画像を差し替えると自動で再判定に戻る。切り出し直した図は出典（PDF・ページ・dpi）も残す | `npm run figure-review-queue -- record <verdicts.json>`（手で編集しない） |

**一括更新**: `npm run audit-figures`（② → ③ を順に再生成）。図を直したら実行すると provenance JSON と `--list <needs>` の出力が最新化する。②'（クロップ検査）は独立ゲートで `check-figure-crop` を別途実行（②の OCR とは検出面が直交＝内容 vs 画素）。

## needs（次アクション）の意味

`build-figure-provenance.mjs` が下記ルールで算出:

| needs | 意味 | 直し方 |
|---|---|---|
| `recrop-urgent` | 答え漏らし（正答明示・公開中は読者に見える） | 既存画像を答えテキスト除いて再クロップ（最優先） |
| `recrop` | 問題文/選択肢の写り込み（QA構造で高精度検出） | 既存画像を再クロップ（画質は足りている）＝`/figure-recrop` |
| `recrop-review` | 句点はあるが QA 構造なし（図の凡例/ラベルの可能性）→要目視 | 目視して写り込みなら再クロップ、凡例なら放置 |
| `rescan` | 画質不足（ボケ/低解像度）かつ**再スキャン可**（元書籍あり） | ソース台帳の `source_dir` を高解像度再スキャン → 再クロップ |
| `rescan-need-source` | 画質不足だが元素材が未収録/要入手 | 元資料を入手してから再スキャン |
| `rescan-or-svg` | 画質不足・再スキャン不可 | データグラフは再スキャン、模式図は SVG 化 |
| `reextract` | 図本体が縁で切れている（判定台帳の needs-source）。今の画像の切り直しでは直らない | 元 PDF のページから切り出し直す＝`/figure-quality-loop` の切り出し直し段 |
| `ok` | 鮮明＋写り込みなし | 対応不要 |

### 手動上書き（machine-blind な欠陥）

OCR/シャープネスでは検出できない欠陥がある。最重要は **「元図が上下で見切れて図要素/答えが欠落」**——鮮明で写り込みも無い（`quality:sharp` / `textStatus:clean`）ため機械は `needs:ok` と誤判定する（例: `r04-b-fig-02` はクリティカルパス上の作業 B・D が上端で切れているのに `ok` 判定だった）。これを恒久記録するのが `figure-sources.json` の **`manual_needs`** 配列:

```json
"manual_needs": [
  { "figure": "civil-construction-1/primary-r04-b/img/r04-b-fig-02",
    "needs": "rescan-need-source", "reason": "上端見切れで作業B・D欠落…", "verified": "2026-07-09" }
]
```

`build-figure-provenance.mjs` が `baseRel` 末尾一致で `needs` を上書きし、`manualReason` を provenance に出力する（`.claude/state/figure-provenance.json` の各図で確認）。**見切れは再クロップで直せない**（元画素が無い）。2026-10-06 以降は `/figure-quality-loop` が判定台帳で needs-source と記録し、`reextract`（元 PDF から切り出し直し）に回す。原典が無いと確かめた図は source-unavailable（→ `rescan-need-source`）。`manual_needs` に書くのはループの対象外にしたい恒久例外だけ（ここに `rescan-need-source` を書くとループは原典なし扱いにして切り出し直しへ回さない）。

> [!warning] 過去問図の SVG 化は要注意
> 過去問の図は「どの線/領域が答えか」を問う＝図の幾何が答えそのもの。ボケた元から SVG に描き直すと**誤答を誘発**する。データグラフは SVG 化せず**再スキャン**が正しい。SVG 化は構造が本文から確定できる模式図に限る（image-policy の技術図SVG可の範囲）。

## 現状の分布（2026-07-10）

> **数値はスナップショット（点在させない）。ライブの残数は必ず `npm run audit-figures` の出力（公開×掲載の needs 内訳）＝台帳 JSON を見る。** 下記は 2026-07-10 大量処理後の census。

616 図: `ok:539 / recrop:28 / recrop-review:26 / rescan:16 / rescan-need-source:7`。うち**公開×掲載（ライブ）= rescan-need-source:7 / recrop:1**（**ライブの rescan は 0＝完結**）。rescan-need-source 7 = bingham-shear-r04（要R4原典）・civil h27-a/h29-b（要別原典）・pe-construction 論文図4（要白書外部）。2026-07-10 に cce 年度別過去問 H26-28 の図12点＋H30/H29差替2点を ok で追加。
- **recrop-review 26 は全て concrete-diagnostician（`published:false` 著作権凍結ドラフト）**＝図クロップ著作権方針の決定待ちで保留。**非ドラフト全資格の recrop-review は 0**（2026-07-09 に手作業＋並列workflow 4本で写り込み除去クロップ→親目視QA。civil-1 94→0、他資格 48図処理。**2026-07-10 に cce ライブ図2点の recrop-review 偽陽性/断片を解消し 28→26**＝`pump-longdistance-h27`（下端に隣図の目盛断片が残存→下端トリム再クロップ）・`xbar-control-chart-h28`（X̄管理図＝データそのもので答え漏らし無し・OCR が軸ラベル『UCL』を『UCL5。』と誤読した偽陽性→manual_needs で ok 確定）。詳細 → `.claude/todo/backlog.md`「過去問図の品質」）。
- **`rescan-need-source` は 45→6 に削減（2026-07-10）**。「要ソース再取得＝クロップ不能」は誤りで、元 PDF（過去問/テキスト/問題集）は大半が実在し**フル再抽出可能**と判明。並行workflow 5本＋親の新旧比較目視QAで **39図を元PDFから再抽出・復元**（各 manual_needs に `source_pdf`/`page`/`dpi` を記録＝繰り返し可能）。**残 6** は真にローカル不可＝h29-b-fig-02（旧4図完全でタイトルのみ切れ・問題集版は2図劣化のため旧維持）/h27-a-fig-01（問題集にH27非収録）＝要別原典、pe-construction 4（スキャン書籍の白書グラフ再録・要白書外部）。詳細 → `.claude/todo/backlog.md`。
- **`rescan` は 33→16 に削減（2026-07-10）**: コンクリート主任技士のライブ17図を、ユーザーの高品質再スキャン（`content/sources/textbook/コンクリート主任技師2024/スキャンした書類 14-18.pdf`）から14図差替（sharpness 全図 sharp 化）＋3図は書籍抜粋非収録で rescan-need-source へ。残16は**全て concrete-diagnostician（`published:false` 凍結ドラフト）**。civil/pe はゼロ（鮮明）。

## 運用

**品質ループ（2026-10-06〜・正の運用）**: `/loop /figure-quality-loop` で「判定待ち → 目視判定・修正 → 判定台帳に記録」を判定待ちが 0 になるまで回す。判定待ちは `npm run figure-review-queue` が毎回その場で作る（公開記事の図を画素検査＝EDGE_CUT/STRAY_* ＋ OCR の needs − 判定台帳で今の画像に効く記録 − manual_needs）。始めた時点の census: 公開記事の図 626 枚・兆候あり 264・**判定待ち 220**（優先1: 1・優先2〔EDGE_CUT〕: 176・優先3: 43）・manual_needs で確認済み 40・原典なし 4。最初に目視した EDGE_CUT 上位 4 枚のうち 3 枚は図・ラベルが縁で切れていたのに needs:ok だった（EDGE_CUT は機械だけでは正当な縁接触と区別できない＝目視判定が要る理由）。手順と判定の対応表は `.claude/skills/quality/figure-quality-loop/SKILL.md`。

単発の対象選び: `node scripts/build-figure-provenance.mjs --list <needs>`（公開×掲載のパスを1行1件）。`source_dir` は `.claude/state/figure-provenance.json` の各図に入っている。管理画面（`npm run admin` → 記事図版）は**目視確認専用**で、資格・種別で絞って白地のサムネを見るだけにしている（needs・進捗・バッジは出さない。2026-09-30）。

- **recrop-urgent / recrop** → 該当記事を開き、既存画像を再クロップ（`magick -crop ... -trim` → OCR で写り込みゼロ確認 → MDX の width/height 更新 → 1 ページ 1 commit）。
- **rescan** → `source_dir` を高解像度再スキャン（会社PCプロキシ制約があれば自宅）。再スキャン後にクロップ→埋め込み→`npm run audit-figures` で検証。

## 拡張余地（未実装）

- **クロップパイプラインが provenance を書き込む**: `/figure-quality-loop` の切り出し直しは出典（PDF・ページ・dpi）を判定台帳に残すようになった（2026-10-06）。`civil-figure-rework` の inject / `pdf-to-mdx` の crop は未対応で、切った時点で出典を残せば以後の再クロップが決定的になる。
- 真実源: 台帳＝`figure-sources.json`、品質＝`figure-text-audit.json`（audit-figure-text.mjs 生成）、目視判定＝`figure-review-ledger.json`、実装＝`scripts/build-figure-provenance.mjs`・`scripts/figure-review-queue.mjs`。
