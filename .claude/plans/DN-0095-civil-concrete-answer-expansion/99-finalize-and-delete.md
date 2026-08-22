---
taskId: DN-0095
phase: finalize-and-delete
status: ready
deleteAfterCompletion: true
---

# 完了判定と計画書削除

## 1. 削除前チェック

次がすべて満たされるまで、このディレクトリを削除しない。

- 1級150工事、2級60工事、主任技士32小論文が原稿・QA・商品カタログ・noteライブ・選択導線で一致している。
- コンクリート技士パイロットを実施し、全論点展開のGO/NO-GOと根拠を恒久文書またはbacklogへ残している。
- 新旧購入者のアクセス、価格、収録数、カバー、PDF、公開URLをライブで読み戻している。
- 4週・8週レビューのbacklog IDが存在する。
- 今後も使う商品ポートフォリオ、命名、真正性、試験形式の判断を`docs/strategy/`、`docs/products/`、必要な`.claude/knowledge/`へ抽出している。
- DN-0095の完了を機械的に検証し、backlogから完了カードを削除している。

## 2. 削除対象マニフェスト

上記の全条件を満たした同一変更で、次の5ファイルだけを削除する。

1. `.claude/plans/DN-0095-civil-concrete-answer-expansion/00-master.md`
2. `.claude/plans/DN-0095-civil-concrete-answer-expansion/01-civil-koji-expansion.md`
3. `.claude/plans/DN-0095-civil-concrete-answer-expansion/02-concrete-chief-essay-personas.md`
4. `.claude/plans/DN-0095-civil-concrete-answer-expansion/03-concrete-engineer-and-measurement.md`
5. `.claude/plans/DN-0095-civil-concrete-answer-expansion/99-finalize-and-delete.md`

`completed/`、`archive/`、別名コピーは作らない。履歴はgitが持つ。

## 3. 削除禁止条件

- 1件でも未公開、QA不合格、収録漏れ、価格不一致、リンク切れがある。
- 4週・8週レビューの起票前である。
- 恒久判断の抽出先が未確定である。
- 作業を中止・延期しただけで、商品展開そのものが未完了である。

この場合はDN-0095をbacklogに残し、本計画束も残す。

