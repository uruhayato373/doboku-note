# 会員フロー W5 公開 — 2026-08-19

> [!done] 公開・会員限定・マガジン収録まで完了
> W5「環境対策 — 騒音・振動の抑制と建設副産物の再資源化」を `n76641bccd62e` として公開した。公開APIで `status=published`、`is_limited=true`、未ログイン本文0字、アイキャッチありを確認。会員特典マガジン `mbe07bd5cecda` は4件から5件へ増え、対象記事の収録も確認した。

## 背景

- 2026-08-05に通年プランの初入会があり、週次配信の停止は解約リスクに直結する。
- W1〜W4は配信済みで、W5の締切は2026-08-24だった。
- W5は買い切り商品ではなく、通年・添削つき両プランで読める会員共通FLOWコンテンツ。

## 変更

- `content/note/1級・2級土木/メンバーシップ/予想問題マガジン/05_環境対策-騒音振動と建設副産物/article.md`
  - `noteStatus: published`
  - `notePublishedAt: "2026-08-19"`
  - `noteId: "n76641bccd62e"`
  - `noteUrl: "https://note.com/dobokunote/n/n76641bccd62e"`
- `.claude/todo/weekly.md` のW5を完了へ更新。
- `.claude/todo/backlog.md` をW1〜W5配信済み、次回W6へ更新。
- メンバーシップREADMEの配信状況をW5まで更新。
- `scripts/note-publish.mjs` のfrontmatter書き戻しをLF正規化経由へ変更し、CRLF記事で `CRCRLF` が入る再発を防止。
- `scripts/check-note-intro-benefit.mjs` で `notePricing: membership` を無料記事扱いせず、未ログイン本文を持たない会員限定記事として検査対象外にした。

## 実行と結果

```text
node scripts/note-lint.mjs <W5 article.md>
→ note-lint: 1記事 OK

npm run check-note-hashtags
→ 748件すべて90タグ以上

node scripts/note-publish.mjs --article <W5 article.md>
→ 下書き n76641bccd62e を作成。会員公開範囲は「メンバー全員に公開」追加済みを確認。

node scripts/note-publish.mjs --article <W5 article.md> --use-draft n76641bccd62e --commit
→ 本文画像2/2、目次、96タグ、会員公開範囲を確認して公開。
→ 公開後検証: is_limited=true、未ログイン本文0字。

node scripts/note-magazine-add-articles.mjs --target mbe07bd5cecda --notes n76641bccd62e --plan-only
→ 現収録4件、今回追加1件。

node scripts/note-magazine-add-articles.mjs --target mbe07bd5cecda --notes n76641bccd62e --commit
→ 追加1/1、収録4→5件、対象収録1/1、exit 0。

GET https://note.com/api/v3/notes/n76641bccd62e
→ title一致、status=published、is_limited=true、price=0、body=0字、eyecatchあり。

node --check scripts/note-publish.mjs
→ exit 0。

npm run check-backlog-schema
→ カード90件、違反0件。

node --test tests/backlog-parity.test.mjs
→ 4 tests passed。

git -c core.whitespace=cr-at-eol diff --check -- <変更対象>
→ exit 0。
```

## 注意点・次回

- 初回下書きでは本文画像の2枚目で `filechooser` が発火しなかった。公開安全弁により本番公開はされず、同じ下書きを再利用した再試行で2/2成功した。
- 再試行時の表紙再アップロード操作はタイムアウトしたが、初回下書きの表紙が保持され、公開APIで `eyecatch` URLを確認済み。
- 公開後のfrontmatter書き戻しでCRLFが二重化する不具合を検出した。W5原稿は修復済みで、書き戻し処理も修正した。
- 次回はW6「安全管理 — 労働災害の防止」を2026-08-31までに同じ手順で公開し、特典マガジンへ追加する。
