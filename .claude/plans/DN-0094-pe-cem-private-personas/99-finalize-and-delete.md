---
taskId: DN-0094
phase: finalize-delete
deleteAfterCompletion: true
---

# DN-0094 完了確認と計画bundle削除

> [!warning] 削除条件
> 1商品でも未制作、QA未合格、未公開、未配線、ライブ未検証なら本bundleを削除しない。「原稿ができた」だけでは完了ではない。

## 1. ロスターと商品

- [ ] レジストリが50件で、自治体10・コンサル21・施工会社19になっている。
- [ ] 既存14商品のURL、価格、販売履歴を壊していない。
- [ ] 新規36商品が全件公開され、価格・記事数・カバー・公開状態をライブで検証している。
- [ ] 各商品に固有のdossier、2業務類型、権限境界、一次資料がある。
- [ ] 既存14＋新規36のproductIdが重複せず、売上正規化で解決できる。

## 2. 品質

- [ ] 全記事が現行の総監文字数・構造・note lintに合格している。
- [ ] 全記事が`cem-essay-qa`相当の独立Evaluatorに合格している。
- [ ] 越権施策、架空の著者経験、未確認の制度・数値が0件である。
- [ ] 兄弟商品が名詞置換になっていないことをsemanticに確認している。
- [ ] 専門QA負荷の高いBatch Dも一次資料による検証が完了している。

## 3. 公開と導線

- [ ] 全50商品がnote公開一覧とローカルSSOTで一致する。
- [ ] 50商品を平面一覧にせず、組織系統→分野→担当業務の選択UIから到達できる。
- [ ] 未公開表示、誤リンク、他ペルソナの誤表示が0件である。
- [ ] パック方針を実売と既購入者影響を踏まえて決定している。
- [ ] サイト、note無料案内、Admin、カタログの表示が同じロスターを参照する。

## 4. 計測と恒久情報

- [ ] 4週・8週レビューのTODO IDがある。
- [ ] productId別・組織系統別の売上を取得できる。
- [ ] 本決定で上書きした旧「14固定」の記述を、移行後の総監`noteコンテンツ計画.md`で現行化している。
- [ ] 恒久的なレジストリ規約、真正性ガード、公開・QAルールを移行後のknowledgeへ抽出している。
- [ ] 一時的な作業経緯や長い実行ログを恒久戦略へコピーしていない。

## 5. 最終検証

実装時点の正しいコマンドへ読み替え、少なくとも次を実走する。

```bash
npm run verify-note-magazines -- --vs-txt --contents --json
npm run check-magazine-cta:ci
npm run check-note-funnel
npm run check-note-republish
npm run check-doc-refs
npm run type-check
npm run build
node scripts/check-backlog-schema.mjs
node scripts/check-backlog-health.mjs --json
git diff --check
git status --short
```

全50件の専用整合検査も成功していること。検査コマンドが未実装なら計画を削除しない。

## 6. 削除マニフェスト

すべてのチェックが完了した場合だけ、ファイル編集ツールで次の5ファイルを1件ずつ削除する。ワイルドカード、再帰削除、`rm -rf`は禁止する。

```text
.claude/plans/DN-0094-pe-cem-private-personas/00-master.md
.claude/plans/DN-0094-pe-cem-private-personas/01-inventory-and-registry.md
.claude/plans/DN-0094-pe-cem-private-personas/02-production-and-qa.md
.claude/plans/DN-0094-pe-cem-private-personas/03-publication-wiring-and-measurement.md
.claude/plans/DN-0094-pe-cem-private-personas/99-finalize-and-delete.md
```

## 7. 削除後確認

```bash
find .claude/plans/DN-0094-pe-cem-private-personas -type f -print 2>/dev/null
rg -n "DN-0094-pe-cem-private-personas" . \
  --glob '!node_modules/**' --glob '!.git/**' \
  --glob '!out/**' --glob '!.next/**'
npm run check-doc-refs
git diff --check
git status --short
```

最初のコマンドは0件であること。参照検索は、完了済みのDN-0094カード削除後に0件であること。検査失敗時は計画書を完了記録として復活させず、恒久SSOTまたは実装を修正する。

## 8. 最終報告

1. 完成した全50ペルソナの系統別件数。
2. 新規36商品のタイトル、URL、価格、記事数。
3. QAとライブ実体の検証結果。
4. 選択UI、パック、売上計測の実装結果。
5. 4週・8週レビューのTODO ID。
6. 本bundle5ファイルを削除済みであること。
