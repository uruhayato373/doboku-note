# 引き継ぎ: note 配布PDFの差し替え・分冊追加の公開反映（2026-10-03 中断）

## 何をしていたか

配布PDFの全数点検（note 662本・ココナラ 83本）で見つかった印字不具合と、記事改訂の未反映を直したPDFを、note の公開記事へ貼り直している。PDF の実体は作成済みで、Drive vault と `drive-manifest.json` に登録済み（develop `c4288e3eb`）。ビルダーの修正は PR #853（develop にマージ済み）。

| 対象 | 状態 |
|---|---|
| 択一6商品（1級・2級土木・技術士一次・総監令和/平成・診断士98問）: 通し版の差し替え＋問題冊子・解答解説の分冊追加 | **完了**。ライブ添付3本を6件とも確認 |
| 建設部門・総監の模範解答 67 本: 太字記号「**」残り・記事改訂の未反映を直したPDFへ差し替え | **47 本完了・20 本残り**（下の一覧） |
| 予想模試 第1回（1級 C8 解答解説・2級 C9 問題冊子）: 太字記号を直したPDFへ差し替え | **未着手**（1記事に6本添付＝12件アップロード） |

中断した記事（鉄道R06・R08予想・トンネルR03）はライブ実査で添付充足・破損なしを確認済み。鉄道R06 はアップロード後に止めたため、エディタに未保存の状態が残っている可能性があるが、再実行で上書きされる。

## 再開手順

note のファイルアップロードは 1 日 100 件まで（スクリプトの安全上限 90）。2026-10-03 は約 70 件使ったので、**10/4 以降に再開する**。

1. 残り 20 本を下の一覧のとおり `.tmp/mag-resume-list.txt` に書き、10 本ずつ流す（まとめて流すと Mac の空きメモリ不足でブラウザが落ちた）:

```bash
DOBOKU_PW_MIN_FREE_MB=1000 node scripts/note-update-body.mjs --list .tmp/mag-resume-list.txt --reattach-pdf --force-retry --commit
```

`--force-retry` は、10/3 の中断記録（`.claude/state/note-update-aborted.json`）を越えるために付ける。中断した3本はライブ確認済み。

2. 予想模試 2 記事:

```bash
DOBOKU_PW_MIN_FREE_MB=1000 node scripts/note-update-body.mjs --article "content/note/1級・2級土木/1級土木/magazines/1級土木-R8二次-予想模試3回/施工経験記述/article.md" --reattach-pdf --commit
```

2級は同じコマンドで `2級土木/magazines/2級土木-R8二次-予想模試3回/施工経験記述/article.md` を指定する。

3. 全部終えたら、反映先 75 記事の添付をライブで確認する（`npm run check-note-attachments:live`）。確定不足 0 なら、この引き継ぎ書を削除する。

残り 20 本:

```text
content/note/技術士建設部門/magazines/BK-10_鉄道/R06/article-III.md
content/note/技術士建設部門/magazines/BK-10_鉄道/R07/article-III.md
content/note/技術士建設部門/magazines/BK-10_鉄道/R08-yosou/article-III.md
content/note/技術士建設部門/magazines/BK-11_トンネル/R03/article-III.md
content/note/技術士建設部門/magazines/BK-11_トンネル/R07/article-III.md
content/note/技術士建設部門/magazines/BK-11_トンネル/R08-yosou/article-III.md
content/note/技術士建設部門/magazines/BK-I_必須科目I/R03/article.md
content/note/技術士建設部門/magazines/BK-I_必須科目I/R04/article.md
content/note/技術士建設部門/magazines/BK-I_必須科目I/R06/article.md
content/note/技術士建設部門/magazines/BK-I_必須科目I/R07/article.md
content/note/技術士建設部門/magazines/BK-I_必須科目I/R08-yosou-1/article.md
content/note/技術士建設部門/magazines/BK-I_必須科目I/R08-yosou-2/article.md
content/note/技術士建設部門/magazines/BK-I_必須科目I/R08-yosou-3/article.md
content/note/技術士建設部門/magazines/BK-I_必須科目I/R08-yosou-5/article.md
content/note/技術士建設部門/magazines/BK-I_必須科目I/R08-yosou-6/article.md
content/note/技術士総監/magazines/総監模範論文-自治体下水道担当/R04/article.md
content/note/技術士総監/magazines/総監模範論文-自治体下水道担当/R05/article.md
content/note/技術士総監/magazines/総監模範論文-自治体下水道担当/R07/article.md
content/note/技術士総監/magazines/総監模範論文-自治体下水道担当/R08-yosou-2/article.md
content/note/技術士総監/magazines/総監模範論文-自治体都市計画担当/R08-yosou-2/article.md
```

## 注意（今回わかったこと）

- `note-update-body` は dry-run でもエディタ上で全文置換とアップロードを実行し、その日のアップロード枠を使う。下書きも差し替わった状態で残るので、dry-run の後はその記事を必ず本番反映する。
- `--reattach-pdf` が貼り直すのは、今ついている添付だけ。新しいPDFを足すときは `note-attach-file --force` を使う。
- `note-attach-file --force` は、アップロード直後の再公開で有料エリアの表示が間に合わず、境界検証で止まることが多い（無料漏れ防止の停止で、公開側は変わらない）。数分待ってから `--force` なしで同じコマンドを実行すると、アップロードせずに再公開だけ行う。境界の見出しは記事の `paidBoundary` を `--boundary-regex` に渡す（既定は「試験問題|予想問題」）。
- 差し替えを見送ったPDF（作り直すと欠落・導線混入する spec）は DN-0515。
