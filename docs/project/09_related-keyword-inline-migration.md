# 関連キーワードのインライン化 一斉移行計画

## 背景

キーワードページの「総合技術監理における位置づけ」セクション末尾で `関連キーワード: [A]、[B]、[C]` と列挙するパターンは、以下2つの問題を持つ。

1. **重複**: 本文で既に言及したキーワードを末尾で再度列挙してしまい、読者は同じ語を2回読むことになる
2. **文脈喪失**: 末尾リストではリンク先が「なぜ関連なのか」が伝わらない

このため、「インラインで文脈付きリンクに埋め込む」方針に統一する。`keyword-page` SKILL.md は既に更新済み、`scripts/lint-mdx-mobile.mjs` に機械検出ルール 8-1 を追加済み。残る作業は既存ファイルの一斉移行。

## 対象範囲

- ディレクトリ: `.local/r2/posts/pe-comprehensive-management/**/article.mdx`
- 違反数: **293ファイル**（2026-04-13 時点、`node scripts/lint-mdx-mobile.mjs` で計測）
- 既に対応済み: `descriptive-statistics`, `estimation-testing`

## 機械検出の実行方法

### 全件の棚卸し

```bash
node scripts/lint-mdx-mobile.mjs .local/r2/posts/pe-comprehensive-management/ > C:/tmp/lint-report.txt 2>&1
grep "8-1" C:/tmp/lint-report.txt | sort -u > C:/tmp/related-keyword-violators.txt
wc -l C:/tmp/related-keyword-violators.txt
```

### 対象ファイルのリスト化

```bash
# 違反ファイルのパスだけ抽出
grep -B1 "8-1" C:/tmp/lint-report.txt | grep "=== .*\.mdx" | \
  sed 's/=== //;s/ ===//' > C:/tmp/related-keyword-files.txt
```

## 3つの移行アプローチ

### アプローチA: 完全自動置換スクリプト（非推奨）

機械的に末尾の `関連キーワード: [A](...)、[B](...)` 行だけを削除するワンライナー。

```bash
# 例（絶対に実行しないこと。本文にリンクがないまま削除される）
find .local/r2/posts/pe-comprehensive-management -name article.mdx -exec \
  sed -i '/^関連キーワード[:：]/d' {} \;
```

**問題**:
- 本文中で言及がないキーワードは単に消えるだけで、リンクが完全に失われる
- 読者がそのページから関連キーワードへたどる経路を失う
- **絶対に使わない**。記録のみ

### アプローチB: 半自動化（推奨・現実的）

**1. 事前調査スクリプト**で各ファイルのキーワードを3分類する:

- **type-1**: 本文中に既にキーワード名が出現 → インライン化で対応可能
- **type-2**: 本文中にないが関連性が強い → 1文追加してインライン化
- **type-3**: 関連性が弱い → 削除してよい

**2. バッチ単位で実行**: 1バッチ10〜30ファイル。`/keyword-page` スキル（revise モード）または人手で編集。

**3. 編集後に lint を再実行**して違反ゼロを確認。

#### 事前調査スクリプトの設計

`scripts/audit-related-keywords.mjs`（未実装、今後作成）:

```
入力: 対象mdxファイルのリスト
処理:
  各ファイルについて
    1. 末尾の `関連キーワード: ...` 行を抽出し、リンク一覧（slug, label）を取得
    2. 本文（位置づけセクション）にそれぞれの label が出現するかを判定
    3. 判定結果を CSV 出力: file, keyword, type(1|2|3), reason
出力: C:/tmp/related-keyword-audit.csv
```

バッチ編集時はこの CSV を読んで、type-1 は単純置換、type-2 は文追加、type-3 は削除、と機械的に判断できる。

### アプローチC: 校正タイミングでの漸進的修正（現状）

キーワードページを校正する機会があるたびに、そのページ単位で対応する。
- 長所: リスクが最小、文脈を理解した上で修正できる
- 短所: 全件完了まで長期間かかる。検索結果では整合性が取れない

## 推奨する実行順序

### Phase 1: 監査スクリプト整備（見積もり: 1〜2時間）

1. `scripts/audit-related-keywords.mjs` を作成
2. 293ファイル全件に対して実行し、`related-keyword-audit.csv` を生成
3. type 別の件数を集計

### Phase 2: パイロット移行（10ファイル・見積もり: 1時間）

1. 最もアクセスが多い10ページを選抜（Google Analytics や GSC 併用）
2. 監査結果を参照しつつ、`/keyword-page` スキルで revise
3. 各ファイルに対して `node scripts/lint-mdx-mobile.mjs` で違反ゼロを確認
4. ブラウザで本文確認

### Phase 3: 一斉バッチ移行（30ファイル/バッチ・見積もり: 合計10バッチ・20時間）

1. バッチ単位（30ファイル程度）で監査結果に基づき編集
2. type-1 は最小編集、type-2 は1文追加、type-3 は削除
3. 各バッチの完了後に `npm run build-backlinks` と lint 全件実行

### Phase 4: 最終確認

1. `node scripts/lint-mdx-mobile.mjs .local/r2/posts/pe-comprehensive-management/ | grep "8-1"` が空であることを確認
2. `npm run build` が通ることを確認
3. このドキュメントの「残件数」を 0 に更新

## リスクと回避策

| リスク | 回避策 |
|---|---|
| キーワードへの動線を一時的に失う | Phase 2 のパイロットでGSCなどの遷移流入を監視 |
| 誤った文脈埋込で意味がズレる | 1ファイルずつ目視確認を入れる。自動スクリプトの完全実行は禁止 |
| 本文が不自然に長くなる | type-3 の判断を積極的に使い、無理に含めない |
| 機械チェックで見逃しが出る | lint-mdx-mobile のルール 8-1 を CI で走らせる（将来） |

## 参照

- `scripts/lint-mdx-mobile.mjs` — 機械検出ルール 8-1
- `.claude/skills/content/keyword-page/SKILL.md` — 作成規約（末尾リスト禁止を明記）
- `.claude/skills/content/review-mobile/SKILL.md` — チェック項目 8-1
- `docs/project/06_table-review-progress.md` — 類似の段階的移行事例（表レビュー）

## 進捗（Batch 完了履歴）

未着手。Phase 1 未実施。

| Batch | 日付 | 対象 | 完了ファイル数 | 残違反数 |
|---|---|---|---|---|
| 手動対応 | 2026-04-13 | descriptive-statistics, estimation-testing | 2 | 293 |
| Phase 1 | — | 監査スクリプト作成 | — | — |
| Phase 2 | — | パイロット10件 | — | — |
| Phase 3 Batch 1 | — | 30件 | — | — |
