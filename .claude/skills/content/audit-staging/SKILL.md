---
name: audit-staging
description: >
  Obsidian ステージング内のコンテンツの公開準備度・フォーカス試験適合性・品質をチェックし、doboku-note への promote 可否を判定する。
  Use when user asks to [ステージング監査, 公開前チェック, Obsidian チェック, /audit-staging].
---

Obsidian（~/obsidian）内のコンテンツの公開準備度をチェックし、doboku-note への promote 可否を判定する。

## 引数

```
/audit-staging [path-or-folder]
```

- `path-or-folder`: Obsidian vault 内のファイルパスまたはフォルダパス
- 省略時: `~/obsidian/exam/1doboku/` 全体を対象にする
- Obsidian パスは `/Users/minamidaisuke/obsidian/` に解決する

## 処理手順

### Step 1: 対象ノートの収集

1. 指定パスがフォルダなら配下の全 `.md` ファイルを収集
2. 各ノートの frontmatter を読み取り、status を一覧化

### Step 2: ステータス分布レポート

```
## ステージング状況

| status | ファイル数 |
|---|---|
| draft | N |
| review | N |
| ready | N |
| published | N |
| (frontmatterなし) | N |
```

### Step 3: `review` / `ready` ノートの品質チェック

`status: review` および `status: ready` のノートに対して、以下の5軸で評価する（content-qa の5軸ルーブリックに準拠）:

| 軸 | 重み | チェック内容 |
|---|---|---|
| 構造正確性 | 30% | 見出し階層が正しいか、論理構成が破綻していないか |
| テキスト忠実度 | 25% | 出典（source）が明記されているか、内容が正確か |
| 表・図・数式 | 20% | テーブルが壊れていないか、KaTeX数式が正しいか |
| MDX互換性 | 15% | Obsidian固有記法（`[[]]`, `![[]]`, callout）が残っていないか ← promote時に変換するため警告レベル |
| メタデータ品質 | 10% | title, tags, exam-topic, source が全て埋まっているか |

各軸を 1（不可）〜 3（良好）で評価。合計 10点以上で `ready` への昇格を推奨。

### Step 4: 個別ノートの診断

問題が見つかったノートについて、具体的な指摘を行う:

```
### {ファイル名} — status: review → 推奨: ready（12/15点）

| 軸 | スコア | 指摘 |
|---|---|---|
| 構造正確性 | 3/3 | OK |
| テキスト忠実度 | 2/3 | L15: 数値の出典が不明。sourceフィールドに記載を |
| 表・図・数式 | 3/3 | OK |
| MDX互換性 | 2/3 | L8, L42: Obsidianリンク [[]] が残存（promote時に自動変換） |
| メタデータ品質 | 2/3 | exam-topic が未設定 |
```

### Step 5: promote 候補の一覧

`ready` ステータスのノートを公開推奨順にリストアップする:

```
## promote 候補（公開推奨順）

| # | ファイル | exam-topic | スコア | 推奨 |
|---|---|---|---|---|
| 1 | concrete-basics.md | コンクリート | 14/15 | `/promote-to-site exam/1doboku/concrete-basics.md` |
| 2 | earthwork-overview.md | 土工 | 12/15 | `/promote-to-site exam/1doboku/earthwork-overview.md` |
```

## 出力フォーマット

```markdown
# ステージング監査レポート

対象: {パス}
監査日: {日付}
対象ファイル数: {N}

## ステータス分布
{表}

## 品質チェック結果
{各ノートの診断}

## promote 候補
{推奨リスト}

## 次のアクション
- [ ] {具体的なアクション}
```
