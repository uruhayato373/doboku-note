# 選択科目パック：完了確認と手順書削除

> [!warning] 削除条件
> 道路を含む11商品の実体、カバー、記事収録、価格、SoT、導線、売上記録、検証がすべて揃うまで、本bundleを削除してはならない。1商品でも未公開・未検証なら残す。

## 1. 商品実体

- [ ] 道路を含む11packがnote公開一覧に存在する。
- [ ] 10新商品の価格がすべて¥4,980。
- [ ] 11packすべてにdefaultではないカバーがある。
- [ ] 道路は35記事、残り10商品は各29記事、または差異の理由が恒久記録されている。
- [ ] 各packは必須I＋対応する選択1科目だけを収録する。
- [ ] `note-magazine-add --plan-only`でtoAdd=0、miss=0。

## 2. ローカルSSOT

- [ ] `note-magazines.ts`に11packがある。
- [ ] 全entryが`published:true`、noteUrlあり。
- [ ] 11個のpack dirに`note掲載文.txt`と`_cover.png`がある。
- [ ] pack dir名が`PACK-BK01`〜`PACK-BK11`で科目コードと一致する。
- [ ] sales recorderが全商品IDを認識する。
- [ ] 旧scaffold説明と未公開記述が恒久文書に残っていない。

## 3. 導線

- [ ] 科目別サイトページの主CTAが対応packを指す。
- [ ] 建設部門もくじに11packが掲載され、単科との違いが明確。
- [ ] 道路・河川・都市計画の無料note記事が対応packへ送客する。
- [ ] 11packすべてが`check-magazine-cta:ci`で1面以上。
- [ ] 他科目のpackを誤表示する導線がない。

## 4. 検証

```bash
npm run check-pe-construction-packs
npm run verify-note-magazines -- --vs-txt --contents --json
npm run check-magazine-cta:ci
npm run check-note-funnel
npm run check-note-republish
npm run check-doc-refs
npm run type-check
npm run build
git diff --check
git status --short
```

live更新を行った記事について、`verify-note-status`とlive funnel監査も成功していること。

## 5. 恒久情報の抽出

削除前に、本bundleだけに残っている恒久情報を抽出する。

| 情報 | 抽出先 |
|---|---|
| 11科目の商品体系・価格・値上げ条件 | 建設部門`noteコンテンツ計画.md` |
| 商品ID・URL・公開状態 | `src/lib/note-magazines.ts` |
| pack完全性ルール | `check-pe-construction-packs`とテスト |
| 公開操作の再利用ルール | 既存note運用knowledge。新しい恒久知見がある場合のみ追記 |
| 4週・8週の販売評価 | `.claude/todo/backlog.md` |

作業経緯や実行ログを恒久文書へコピーしない。実行履歴はGitとnote実体が持つ。

## 6. 削除対象

すべての条件を満たした場合だけ、次の5ファイルをファイル編集ツールで1件ずつ削除する。ワイルドカード、再帰削除、`rm -rf`は禁止する。

```text
.claude/plans/DN-0092-pe-construction-subject-packs/00-product-plan.md
.claude/plans/DN-0092-pe-construction-subject-packs/01-local-preparation.md
.claude/plans/DN-0092-pe-construction-subject-packs/02-live-publication.md
.claude/plans/DN-0092-pe-construction-subject-packs/03-wiring-and-measurement.md
.claude/plans/DN-0092-pe-construction-subject-packs/99-finalize-and-delete.md
```

## 7. 削除後確認

```bash
find .claude/plans/DN-0092-pe-construction-subject-packs -type f -print 2>/dev/null
rg -n "pe-construction-subject-packs" . \
  --glob '!node_modules/**' --glob '!.git/**' \
  --glob '!out/**' --glob '!.next/**'
npm run check-doc-refs
npm run check-pe-construction-packs
git diff --check
git status --short
```

最初の2コマンドは該当ゼロであること。削除後に検査が失敗した場合は、手順書を完了記録として復活させず、恒久SSOTまたは実装を修正する。

## 8. 最終報告

1. 公開した10商品のタイトル、URL、価格、記事数。
2. 道路を含む11商品のAPI照合結果。
3. 更新したサイト・note導線。
4. 全検証結果と4週・8週レビューのbacklog ID。
5. 本bundle5ファイルを削除済みであること。
