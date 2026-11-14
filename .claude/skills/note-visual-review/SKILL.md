---
name: note-visual-review
category: quality
description: >
  note の公開ページの代表（資格×記事の種類ごとに約 30 本）を 5 つの画面幅で撮り、数値では決められない見た目の崩れ・有料エリア直前の見え方をエージェントの目視で判定し、直すものを起票する。毎週は回さず、必要なときだけ回す。
  Use when user asks to [note の見た目を確認, note 公開ページの目視, カバーや本文の見え方を点検, /note-visual-review].
user-invocable: true
domain: product
---

# /note-visual-review

note の公開ページを**未ログインの読者の画面**で撮り、`note-page-visual-auditor`（sonnet・audit-only）に判定させ、「直す」は親が画像で確かめてから起票する。
撮影は最大 25 分かかるため、土曜の収集（weekly-collect）では回さず、公開 API の層（`--api-only`）だけにしている（DN-1196・2026-11-14）。この画面の確認は必要なときだけ回す。

## いつ回すか

- note の本文やカバーをまとめて直した後
- 新しいマガジンを出した後
- 土曜の収集の `note-public-view` 段（公開 API の層）が指摘を出した記事
- 運営者の指示

毎週は回さない。

## 手順

1. **回してよいか**: `~/Library/Logs/doboku-note/weekly-review.lock/pid` のプロセスが生きている間（土曜 9:30 からの収集の最中）は回さない。この Mac はメモリ 8GB なので、重い検査（build・音声・動画の生成）と同時に回さない
2. **撮る**（ログイン不要・専用の Chromium・Bash の `run_in_background` で回す）:
   ```
   node scripts/check-note-public-view.mjs --review [パスの一部] \
     --out "$HOME/Library/Caches/doboku-note/note-public-view/report.json" \
     --shot-dir "$HOME/Library/Caches/doboku-note/note-public-view"
   ```
   置き場は `scripts/lib/note-public-view.mjs` の `NOTE_PUBLIC_VIEW_LOCAL_DIR`。パスの一部を渡すと対象の記事・グループだけを撮る（一部だけ直したときはこちら）
3. **取り込む**: `node scripts/fetch-note-public-view-shots.mjs --json`。撮影が `.tmp/note-public-view-review/<撮影日>/` へ写り、`review/index.json` の件数が出る。
   **exit 2（撮影なし・8 日より古い・欠け）は「未確認」と書く**。画像 0 枚を「異常なし」と呼ばない。`coverage` の撮影成立数/予定数を確認し、`breakpointDrift` は CSS が全部読めた場合だけ見直しの根拠にする（`unreadable` があれば判定保留）
4. **判定させる**: `note-page-visual-auditor` を起動する。**1 体**に `review/index.json` と画像の場所を渡す（ページが多いときも体数を増やさず、1 体に束で渡す。同時に動かすのは 3 体まで）。渡すのは作業票（`review/index.json`）のパスと画像の置き場だけ
5. **親が確かめて起票する**: エージェントの「直す」は、指摘だけでは起票しない。親が該当の画像を開いて確かめてから `npm run todo:add` で起票する。
   原因が原稿なら原稿を直して再公開、共通の型なら検査側（`scripts/lib/note-public-view.mjs`）で機械化できないかも書く。「様子見」は起票せず報告に残す
6. **報告**: 検査したページ数と画面幅の数、pass / fail の数、起票したカード番号を書く。**検査 0 件を合格と呼ばない**。取り込みが exit 2 のときは「未確認」と書く

## 見る観点（エージェントに渡す）

特定の画面幅でだけ崩れる（重なり・はみ出し・切れ・空の枠・カードや図の欠け）／記号がそのまま出ている（`**`・バッククォート・`\*`）／カバー・サムネイルの文字が切れる／本文の図が題材と合わない／画面の価格表示と `index.json` の原稿価格の食い違い／有料エリアの直前までで何が手に入るか分からない（購入判断に要る情報が無い）。
数値で決まるもの（添付 PDF の本数・価格・全文会員限定・本文の画像の欠け）は公開 API の層が済ませている。ここでは見ない。

## 罠

- 新しく足したエージェントは、そのセッションの中では呼べない（次のセッションから）。同じセッションで回すときは、汎用のエージェントに `.claude/agents/note-page-visual-auditor.md` を読ませて従わせる
- 判定の根拠は画像に写っているものだけ。作業票の数値（価格など）と画面が食い違うときは、画面と作業票の両方を報告に書く
- note の導線の配線（もくじ・CTA）は `/audit-note-funnel`、サイトの画面は `/site-visual-review`。ここで見るのは note の公開ページの**画面での見え方**
