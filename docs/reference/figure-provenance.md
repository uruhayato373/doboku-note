---
title: 図 provenance システム（出所・品質・次アクションの恒久記録）
---

# 図 provenance システム

記事図クロップ（`.local/r2/posts/**/img/*.{png,webp}`）1 枚ごとに「**出所（どのソース由来か）・品質・次にすべきアクション**」を機械記録し、**毎回手で辿り直さない**ための土台。図品質を継続的に改善する運用の SSOT。

> [!note] なぜ作ったか
> 図を直すたびに「これはどのPDF/スキャンの何ページ？」「シャープな元はある？」を手で辿っていた（同じ調査の繰り返し）。それを 1 度記録して恒久化する。

## 3 層構成

| 層 | ファイル | 役割 | 生成 |
|---|---|---|---|
| ① ソース台帳（SSOT・手動） | `.claude/config/figure-sources.json` | 資格別に元素材の所在・種別・品質・**再スキャン要否**＋ machine-blind 欠陥の per-figure 上書き（`manual_needs`） | 手動更新（ソース状況が変わった・目視で見切れ等を見つけたら） |
| ② 品質監査（機械） | `.claude/state/figure-text-audit.json` | 各図の**写り込み**(leak=答え漏らし/writein=設問・選択肢/maybe=句点あり要目視/clean)＋**画質**(sharp/soft/blurry・ラプラシアン分散) | `npm run audit-figure-text`（OCR＋magick・数分） |
| ③ provenance マニフェスト（機械・join） | `.claude/state/figure-provenance.json` | ①②＋命名(年度)＋公開/掲載 を join し、各図の **needs（次アクション）** を算出 | `npm run build-figure-provenance` |

**一括更新**: `npm run audit-figures`（② → ③ を順に再生成）。図を直したら実行するとギャラリーのバッジ/対応が最新化する。

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
| `ok` | 鮮明＋写り込みなし | 対応不要 |

### 手動上書き（machine-blind な欠陥）

OCR/シャープネスでは検出できない欠陥がある。最重要は **「元図が上下で見切れて図要素/答えが欠落」**——鮮明で写り込みも無い（`quality:sharp` / `textStatus:clean`）ため機械は `needs:ok` と誤判定する（例: `r04-b-fig-02` はクリティカルパス上の作業 B・D が上端で切れているのに `ok` 判定だった）。これを恒久記録するのが `figure-sources.json` の **`manual_needs`** 配列:

```json
"manual_needs": [
  { "figure": "civil-construction-1/primary-r04-b/img/r04-b-fig-02",
    "needs": "rescan-need-source", "reason": "上端見切れで作業B・D欠落…", "verified": "2026-07-09" }
]
```

`build-figure-provenance.mjs` が `baseRel` 末尾一致で `needs` を上書きし、`manualReason` を provenance に出力→ギャラリーの対応バッジ tooltip に理由が出る。**見切れは再クロップで直せない**（元画素が無い）ので needs=`rescan-need-source`（＝完全な元スキャン入手待ち）。目視で欠陥を見つけたらここに1行足す。

> [!warning] 過去問図の SVG 化は要注意
> 過去問の図は「どの線/領域が答えか」を問う＝図の幾何が答えそのもの。ボケた元から SVG に描き直すと**誤答を誘発**する。データグラフは SVG 化せず**再スキャン**が正しい。SVG 化は構造が本文から確定できる模式図に限る（image-policy の技術図SVG可の範囲）。

## 現状の分布（2026-07-09）

> **数値はスナップショット（点在させない）。ライブの残数は必ず管理画面ギャラリー（記事図版タブ）＝台帳 JSON を見る。** 下記は 2026-07-09 大量処理後の census。

586 図: `ok:454 / recrop-review:26 / recrop:28 / rescan:33 / rescan-need-source:45`。うち**公開×掲載（ライブ）= ok:438 / rescan-need-source:45 / rescan:17 / recrop:1**。
- **recrop-review 26 は全て concrete-diagnostician（`published:false` 著作権凍結ドラフト）**＝図クロップ著作権方針の決定待ちで保留。**非ドラフト全資格の recrop-review は 0**（2026-07-09 に手作業＋並列workflow 4本で写り込み除去クロップ→親目視QA。civil-1 94→0、他資格 48図処理。詳細 → `docs/todo/backlog.md`「過去問図の品質」）。
- `rescan-need-source 45` は `manual_needs` 上書き分＝図本体が原典スキャンで画像端に見切れ（クロップ不能・要再スキャン or SVG再作図）。内訳 civil-1 32 / pe-first-stage 6 / pe-construction 4 / civil-2 2 / pe-comprehensive 1。
- `rescan 33` は**全て concrete系**（コンクリート主任技師＝PDF無し・書籍スキャン低品質）。civil/pe はゼロ（鮮明）。

## 運用（管理画面ギャラリー）

`npm run admin` → 記事図版タブ。フィルタ「**対応**」セレクトで needs 別に絞り、カードの needs バッジ＋（再スキャン図は）`source_dir` ツールチップを見ながら:

- **recrop-urgent / recrop** → カードの MDX リンクで記事を開き、既存画像を再クロップ（`magick -crop ... -trim` → OCR で写り込みゼロ確認 → MDX の width/height 更新 → 1 ページ 1 commit）。
- **rescan** → `source_dir` を高解像度再スキャン（会社PCプロキシ制約があれば自宅）。再スキャン後にクロップ→埋め込み→`npm run audit-figures` で検証。

## 拡張余地（未実装）

- **クロップパイプラインが provenance を書き込む**: `civil-figure-rework` の inject / `pdf-to-mdx` の crop が、切った時点で「ソースPDF・ページ・bbox」を provenance に記録すれば、以後の再クロップが決定的になる（今は資格レベルの source_dir のみ）。これが入れば「同じ調査の繰り返し」を完全に無くせる。
- 真実源: 台帳＝`figure-sources.json`、品質＝`figure-text-audit.json`（audit-figure-text.mjs 生成）、実装＝`scripts/build-figure-provenance.mjs`。
