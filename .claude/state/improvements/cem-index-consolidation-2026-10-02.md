# 総監 index consolidation 候補

- 生成: 2026-10-02T10:11:04.758Z
- 対象: 現行sitemap内の総監 crawled-not-indexed **3件**
- 検索需要: 過去約90日に重なるGSC APIスナップショット 16本（重複期間を合算せず最大値で判定）
- URL Inspection: 直近2回
- このレポートは候補提示のみ。CONSOLIDATE / NOINDEX_REVIEW は対象URL承認後にだけ実施する

## 分類件数

| 分類 | 件数 | 次の扱い |
|---|--:|---|
| KEEP | 3 | 価値を保護。継続未登録ならindexability改善 |
| IMPROVE | 0 | 検索意図・導入・内部リンクを個別改善 |
| CONSOLIDATE | 0 | 統合先と本文差分を人が確認後、最大10件ずつ承認 |
| NOINDEX_REVIEW | 0 | 削除/noindexではなく、まず固有価値を人が確認 |
| MONITOR | 0 | 次回URL Inspectionまで据え置き |

## 全候補

| 分類 | 次アクション | ページ | 需要(max) | 過去問 | inbound | 文字数 | 関連候補 | 根拠 |
|---|---|---|---:|--:|--:|--:|---|---|
| KEEP | PRESERVE | https://doboku-note.com/exam/pe-comprehensive-management/keywords/eco-label | 0c/0i/1u | 0 | 0 | 0 | — | 直近約90日のAPIスナップショットに検索需要または利用実績がある |
| KEEP | PRESERVE | https://doboku-note.com/exam/pe-comprehensive-management/keywords/problem-setting-ability | 0c/0i/2u | 0 | 0 | 0 | — | 直近約90日のAPIスナップショットに検索需要または利用実績がある |
| KEEP | PRESERVE | https://doboku-note.com/exam/pe-comprehensive-management/keywords/reemployment-system | 0c/0i/2u | 0 | 0 | 0 | — | 直近約90日のAPIスナップショットに検索需要または利用実績がある |

## 承認ゲート

CONSOLIDATE / NOINDEX_REVIEW の適用時は、source・target・残す固有情報・301・sitemap差分を最大10件単位で提示し、明示承認を得る。未承認ではMDX、`public/_redirects`、published、noindex、GSC登録リクエストを変更しない。
