---
name: check-related-keyword-inline
description: >
  キーワードページ末尾の「関連キーワード: [A]、[B]」列挙パターンを検出し、インラインリンクへの移行を支援する。
  lint-mdx-mobile.mjs のルール 8-1 と keyword-page SKILL.md の作成規約を統合した入口。
  Use when user asks to [関連キーワード 末尾列挙, 8-1 違反, /check-related-keyword-inline, インライン化移行].
user-invocable: true
---

**実行環境**: macOS only。

## なぜこのスキルがあるのか

キーワードページ末尾で `関連キーワード: [A]、[B]、[C]` と列挙するパターンは以下 2 つの問題を持つ:

1. **重複**: 本文で既に言及したキーワードを末尾で再度列挙し、読者は同じ語を 2 回読む
2. **文脈喪失**: 末尾リストではリンク先が「なぜ関連なのか」が伝わらない

方針として「インラインで文脈付きリンクに埋め込む」に統一済み（`keyword-page` SKILL.md の作成規約で明記）。機械検出は `lint-mdx-mobile.mjs` のルール 8-1 が担う。本スキルはその両者を統合した入口と、**移行作業の方法論**（どうやって安全にインライン化するか）を保持する。

## 検査項目

| 重大度 | コード | 内容 |
|---|---|---|
| **MEDIUM** | `8-1` | 末尾に「関連キーワード: [A]、[B]」の列挙行がある |

## 引数

```
/check-related-keyword-inline <file or dir>   # 検査のみ
/check-related-keyword-inline --status        # 全体の残違反数を集計
```

## 移行アプローチ（重要な方法論）

3 つのアプローチがあり、**アプローチ A は絶対に使わない**（データ消失の危険）。

### アプローチ A: 完全自動置換スクリプト（禁止）

```bash
# 例（絶対に実行しないこと）
find .local/r2/posts/pe-comprehensive-management -name article.mdx -exec \
  sed -i '/^関連キーワード[:：]/d' {} \;
```

**問題点**:
- 本文中で言及がないキーワードは単に消えるだけで、リンクが完全に失われる
- 読者がそのページから関連キーワードへたどる経路を喪失
- **絶対に使わない**。本 skill が記憶する「やってはいけないこと」。

### アプローチ B: 半自動化（推奨）

各ファイルのキーワードを 3 分類し、バッチ単位で対処する:

**type-1**: 本文中に既にキーワード名が出現
→ **インライン化で対応**。本文該当箇所を `[キーワード名](/docs/pe-comprehensive-management-{slug})` に置換し、末尾の列挙行は削除。

**type-2**: 本文中にないが関連性が強い
→ **1 文追加してインライン化**。関連を説明する文を本文に追加し、その中にインラインリンクを埋める。

**type-3**: 関連性が弱い
→ **削除してよい**。末尾列挙行から単に削除。無理に本文に組み込まない。

**バッチサイズ**: 1 バッチ 10-30 ファイル。`/keyword-page revise` モードまたは手動編集。

### アプローチ C: 校正タイミングでの漸進的修正（補助）

キーワードページを校正する機会があるたびに、そのページ単位で対応する。
- 長所: リスクが最小、文脈を理解した上で修正できる
- 短所: 全件完了まで長期間かかる

## 実行手順

### Step 1: 全体の残違反数を測定

```bash
node scripts/lint-mdx-mobile.mjs .local/r2/posts/pe-comprehensive-management/ 2>&1 | grep "8-1" | wc -l
```

2026-04-13 時点では 293 件（手動 2 件処理済み、残 291 件）。現時点の数は再測定する。

### Step 2: 違反ファイルのリスト化

```bash
node scripts/lint-mdx-mobile.mjs .local/r2/posts/pe-comprehensive-management/ 2>&1 | \
  grep -B1 "8-1" | grep "=== .*\.mdx" | \
  sed 's/=== //;s/ ===//' > /tmp/related-keyword-files.txt
```

### Step 3: type 分類（手動 or 半自動）

各ファイルについて本文内にキーワード名が出現するかを確認し type-1/2/3 に分類。機械的に一発判定できないため、**`/keyword-page revise` モードで開きながら判断する** のが現実的。

### Step 4: バッチ編集

1 バッチ 10-30 ファイルで:
- type-1: 本文中の該当箇所をリンクに置換、末尾削除
- type-2: 1 文追加してリンク埋込
- type-3: 末尾から単純削除

### Step 5: 検証

```bash
# 違反数が減っていることを確認
node scripts/lint-mdx-mobile.mjs .local/r2/posts/pe-comprehensive-management/ 2>&1 | grep "8-1" | wc -l

# ビルドが通ることを確認
npm run build
```

### Step 6: 追跡

進捗は `lint-mdx-mobile.mjs` の 8-1 違反数で常時測定可能。バッチ履歴は git log で追える。**本 skill はトラッカーではない**。

## 禁止事項

- **アプローチ A（sed 一括削除）の実行**: 本 skill の存在理由の 1 つ。将来の自分や他者がこれを試みたら止めること
- **type 分類をスキップしての一括削除**: type-1 のキーワードを削除すると本文中のリンク更新機会を失う
- **バックアップなしでの一斉編集**: `git commit` 前の状態を必ず保持すること

## 担当外

- **過去問バックリンク**: 別系統。`PastExamBacklinks` コンポーネントと `exam-backlinks.json` で自動化済み
- **セクション内キーワード一覧**: 別系統。`SectionKeywords` コンポーネントで自動化済み
- **キーワードページの品質評価**: `cem-qa` エージェントの担当

## 連携スキル・コンポーネント

| 連携先 | 役割 |
|---|---|
| **`scripts/lint-mdx-mobile.mjs`** ルール 8-1 | 機械検出ロジック本体 |
| **`.claude/skills/content/keyword-page/SKILL.md`** | 作成規約（末尾リスト禁止を明記） |
| **`.claude/skills/content/review-mobile/SKILL.md`** | モバイル視認性の一環として 8-1 も検出 |
| **`/keyword-page revise`** モード | バッチ編集時の実作業スキル |

## 参照

- `scripts/lint-mdx-mobile.mjs` L??? ── ルール 8-1 実装
- `.claude/skills/content/keyword-page/SKILL.md` ── 作成規約の真実源

## 履歴

- 2026-04-13: 初期 293 件検出、手動 2 件対応（`descriptive-statistics`, `estimation-testing`）
- 2026-04-14: 本 skill を新設し、旧 `docs/project/09_related-keyword-inline-migration.md` の方法論を移植
