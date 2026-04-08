---
name: check-links
description: >
  MDXファイル内の外部リンク切れを検出する。Use when user asks to [リンクチェック, リンク切れ確認, /check-links].
---

全MDXファイル内の外部URL（https://）をHTTP HEADリクエストで検証し、リンク切れ・タイムアウト・エラーを報告する。

## 引数

```
/check-links              # 全ファイルを対象
/check-links --fix        # リンク切れを検出後、修正案を提示・適用
```

## 手順

### Step 1: 外部リンクチェック実行

```bash
node scripts/check-external-links.mjs
```

スクリプトが以下を実行する:
1. `.local/r2/posts/` 配下の全MDXから外部URLを抽出
2. ユニークURL（約120件）に対してHTTP HEADリクエスト（並列10、タイムアウト15秒）
3. 結果を4分類で報告: OK / リンク切れ(404) / タイムアウト / エラー

### Step 2: 結果の確認

スクリプト出力を確認し、以下を判断する:

| 分類 | 対応 |
|---|---|
| ❌ リンク切れ（404/410） | **要修正** — URLを差し替えるか削除 |
| ⚠️ エラー（403等） | **要確認** — ブラウザでアクセスして判断（bot拒否の場合あり） |
| ⏱️ タイムアウト | **要確認** — 政府サイトは遅いだけの場合が多い。ブラウザで確認 |
| ✅ OK | 対応不要 |

### Step 3: 修正（`--fix` 指定時）

リンク切れが見つかった場合:
1. WebSearch で代替URLを検索
2. 該当MDXファイルを Read で開き、該当行を確認
3. Edit でURLを差し替え
4. 差し替え後、Grep で `U+FFFD`（文字化け）がないことを確認

## 内部リンクチェック

内部リンク（`/docs/` パス）のチェックは別スクリプト:

```bash
node scripts/check-links.mjs
```

## 推奨運用

- `/weekly-review` のタイミングで `/check-links` を実行
- 新規記事の参考資料リンクを追加した後に実行
