---
name: own-command-byproducts
description: 見覚えのない差分は「他人の変更」と言う前に自分が走らせたコマンドの副産物か確かめる（npm run build は refresh-indexes で src/config を書き換える）
metadata:
  node_type: memory
  type: feedback
  originSessionId: c810297c-e3bd-4390-99c3-3cb4efdff09a
  modified: 2026-09-26T02:50:55.231Z
---

2026-09-26、`npm run build`（ピクセル検証のため）が refresh-indexes を走らせて src/config の 5 ファイルと frequent-topics 記事を書き換えたのに、「ビルドか別の作業による変更・私の変更ではない」と報告した。実際は自分の build の副産物だった。

**Why:** 原因を確かめずに他人のせいにすると、ユーザーが存在しない並行作業を疑い、正しい片付け（戻す／コミットする）が遅れる。

**How to apply:** 未コミット差分を報告する前に、そのセッションで実行したコマンド（build・refresh-indexes・generate 系）が書く先を確認し、`git diff` の中身（generated_at だけか、実データか）を見て帰属と要否を決める。生成物のずれは `npm run check-generated-indexes` が検出する。関連: [[accumulation-find-the-producer]]、[[verify-your-excuses]]。

同日、使い方を見るつもりで `node scripts/normalize-a8-csv.mjs --help` を実行し、未知の引数を無視して古い手元 run を取り込み、A8 の SSOT 2 ファイルを書き換えた（git checkout で復元・引数検証を追加）。**書き込み系スクリプトの使い方は実行せずファイル冒頭の docstring / parseArgs を Read して確認する。**
