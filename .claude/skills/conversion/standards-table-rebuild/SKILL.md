---
name: standards-table-rebuild
description: >
  公的基準（共通仕様書）の章記事で版面のまま残った表を、原本のページ画像と照合して表に組み直す。台帳→ページ画像→作業票→standards-table-writer で組み直し→standards-table-qa で照合・承認→生成・検査の順で回す。原本の改訂・新しい文書の追加・表の断片の修正（DN-0755）のときに使う。
  Use when user asks to [表を組み直す, 版面の表を表にする, 共通仕様書の表, 原本照合で表を直す, /standards-table-rebuild].
user-invocable: true
domain: site
---

## 用途

章記事（`content/site/standards-articles/`）は原本 PDF のテキスト層（`pdftotext -layout`）から生成する。版面はセル境界を持たないので、
機械で表にできない表は版面のまま（コードブロック）になる。これを原本の紙面と照合して組み直し、
`content/sources/standards/tables/{key}.json` に置く。生成器は**承認済みで文字の過不足ゼロ**のものだけを使う
（形と規則の正典は `content/sources/standards/tables/README.md`）。

## 置き場（再現性）

| もの | 置き場 | 作り方 |
|---|---|---|
| 組み直した表（正本） | `content/sources/standards/tables/{key}.json`（git） | Writer → QA |
| 原本 PDF・270dpi のページ画像 | Google Drive vault `原資料PDF/共通仕様書/{整備局}/{原本PDF名}/pages/`（provenance は `content/sources/standards/{機関}/{文書}/manifest.json`） | `npm run build-standards-page-images`（Mac・poppler） |
| 台帳・作業票・確認用の表・vault が無い PC で作った画像 | `.tmp/standards-tables/`（作り直せる） | `npm run standards-tables -- …` |
| 手順 | `.claude/agents/standards-table-writer.md` / `standards-table-qa.md` とこのスキル | — |

原本の同定は catalog の `sourceSha256`。vault が見えない PC（Windows で Google ドライブ未同期など）は、発行機関の掲載ページ
（catalog の `landing`）から原本 PDF を取り直し、`render` で必要なページだけ画像にする（SHA-256 が違えば拒否される）。

## 手順

1. **台帳**: 版面のまま残った表を key ごとに出す。

   ```bash
   npm run standards-tables -- inventory
   ```

   0 件なら終わり。原本の改訂で版面が変わると key が変わり、古い組み直しは使われなくなる（検査 14 の件数で分かる）。

2. **ページ画像**: vault が見えればそのまま使う。見えない PC は原本 PDF から作る（機関ごと）。

   ```bash
   npm run standards-tables -- render --agency kinki --pdf <原本PDF>
   ```

3. **作業票**: 束（1 体が画像と見比べて組める量・最大 14 表 / 220 行）に分ける。画像の無い表があれば exit 2。

   ```bash
   npm run standards-tables -- sheets --name r1
   ```

   大きな文書は `--document <機関/文書>` と `--chapter <章 ID の接頭辞>`（`9-` で第9編の全章）で絞って工種ごとに回す（例: 国交省の施工管理基準 378 表は品質管理基準 9- の 211 表・27 束から）。

4. **組み直し**: 束ごとに `standards-table-writer` を起動する（同時 3 体まで・束が重ならないように）。Writer は
   `npm run standards-tables -- validate --batch <束>` を全件 ✓ にして返す。
5. **照合・承認**: 照合用の作業票を作り、束ごとに `standards-table-qa` を起動する。

   ```bash
   npm run standards-tables -- sheets --qa --name r1
   ```

   差し戻し（rejected）は理由を添えて Writer に戻し、直したら再び QA。指摘が具体的で機械的な直し（見出しを headerless にする等）は
   親が直して `npm run standards-tables -- review <key> --status approved --note "…"` で記録してよい。
6. **生成・検査**（全部通ってから commit）:

   ```bash
   npm run build-standard-articles
   npm run check-standard-articles
   npm run build-standards-comparison
   npm run build-standards-data
   ```

   `check-standard-articles` の 14（組み直しの照合）・17〜19（文の途中の改行・表から外れた断片・壊れた表）が通ること。
   描画は CI の `e2e/standards-render.spec.ts`。人の目でまとめて見るなら `npm run standards-table-gallery`（serve か dev が要る）。

## 注意

- 構造の判定（表の領域・段落の区切り）を `scripts/lib/standards-structure.mjs` で直すと版面が変わり、該当の表の key が変わる。直したら 1 から回し直す（古い組み直しは使われないだけで消えない。`inventory` で版面が残った表を確かめる）。
- 地域版だけの表は、その機関の画像が vault に無ければ近畿版の同じ表の画像で構造を見る（作業票に書かれる）。文字はその機関の版面が正。

## 訂正・追加表（中国地方整備局版）

中国地方整備局版（chugoku/local）は文書全体が 5 列の訂正・追加表で、章記事の中の表ではないので上の台帳には出ない。
1 ページ 1 JSON（`content/sources/standards/amendments/chugoku-local/pNNNN.json`・形は `scripts/lib/standards-amendments.mjs`）に組み直す。

```bash
npm run standards-amendments -- sheets --document chugoku/local --pages 2-62 --size 7   # 作業票（画像は Drive vault）
npm run standards-amendments -- validate --pages 2-8                                    # 形と、版面と JSON の文字の多重集合の一致
npm run standards-amendments -- review --pages 2-8 --status approved --by qa --note "…"  # 照合の記録（文字が合わないと承認できない）
npm run check-standards-amendments                                                       # 全ページ承認済み・差し込み漏れなし
```

Writer・QA は汎用エージェントに作業票と手順（版面の文字だけを使う・順序と欄の振り分けは画像で決める）を渡して回した（2026-10-19）。
照合は文字の多重集合しか見ないので、**段落の順・欄の振り分け・行の切れ目は QA が画像で 1 ページずつ確かめる**。
【…関係】の全ページが承認済みになると `build-standard-articles` が中国版の章記事の条の後に差し込む（目印 `amendments:start/end` で囲み、
表と読みやすさの検査からは除く）。1 ページでも承認されていなければ章の冒頭の案内だけになる。
