---
name: verify-pdf-mdx
description: >
  MDX ファイルの category/group を判定し、適切な検証エージェント
  (civil-construction-qa / cem-qa / content-qa) へディスパッチするルーター。
  視覚検証・テキスト網羅率・5軸ルーブリック評価を試験別の視点で実行する。
  Use when user asks to [PDF検証, MDX整合性, 図の確認, /verify-pdf-mdx, 抽出品質チェック, 図の精度確認].
user-invocable: true
---

**実行環境**: macOS only (Homebrew `poppler` 前提)。`pdftotext` / `pdfinfo` / `pdftoppm` が PATH にあることを必須とする。未導入なら `brew install poppler` を案内する。

MDX ファイルの **category と group を判定** し、適切な Evaluator エージェントへ振り分ける薄いルーター。試験別にレビュー視点が異なるため、単一の検証ロジックではなく **複数エージェントへの自動振り分け** を行う。

## なぜルーター方式か

総監（pe-comprehensive-management）と1級土木（civil-construction-1）では「正しい状態」の定義が根本的に違う:

- **総監キーワードページ**: 図ゼロが正解、テキスト要約が中心、コンポーネント原則が厳しい
- **1級土木 textbook**: 図多数が正解、教科書 PDF との網羅率 95% 以上必須、視覚比較が必要
- **1級土木 guide**: 編集記事、出題傾向の正確性と過去問バックリンクが評価軸
- **過去問**: テキスト忠実度中心、5軸の静的評価

これらを1つのエージェントで賄うと False Positive が多発する。本スキルはユーザに「どのエージェントを呼ぶか」を意識させず、frontmatter から自動判定する。

詳細は `.claude/reference/exam-content-policy.md` の「Part 2: レビューフェーズ — コンテンツ別レビュー視点」参照。

## 引数

```
/verify-pdf-mdx <mdx-path> [--deep] [--render] [--mode <auto|textbook|guide|past-exam>]
```

- `<mdx-path>`: 検証対象 MDX ファイルパス（必須、複数指定可）
- `--deep`: 視覚比較を全件実行（デフォルトは3件サンプル）
- `--render`: PDF ページを `/tmp/verify-pdf-mdx/<slug>/page-N.png` へ展開（視覚比較の精度向上）
- `--mode`: モードを強制指定（デバッグ用、通常は `auto` で frontmatter から判定）

なお `.claude/skills/content/verify-pdf-mdx/scripts/verify-pdf-mdx.mjs` は slug/title から PDF 原本を自動発見するため、通常は `--pdf` 指定不要。

## ディスパッチルール

入力 MDX の frontmatter `category` と `group` から、呼び出すエージェントを決定する:

| category | group | 呼び出し先 | モード |
|---|---|---|---|
| `civil-construction-1` | `textbook` | **`civil-construction-qa`** | textbook |
| `civil-construction-1` | `guide` | **`civil-construction-qa`** | guide |
| `civil-construction-1` | `primary` / `secondary` / `past-exam` | **`content-qa`** | — |
| `pe-comprehensive-management` | `keyword` | **`cem-qa`** | — |
| `pe-comprehensive-management` | `past-exam` / `guide` | **`content-qa`** | — |
| その他 | — | 「対応するエージェントがありません」と案内 | — |

## 実行手順

### Step 1: 前提確認

1. 入力ファイルの存在を確認
2. `dev server` の起動を確認: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3020`
3. 起動していなければ「`npm run dev` を別ターミナルで実行してください」と案内
4. `pdftotext -v` と `pdfinfo -v` が成功するか確認（macOS では必須）。失敗時は `brew install poppler` を案内して処理を中止

### Step 2: frontmatter 読み込みとディスパッチ

各 MDX ファイルについて:

1. `node .claude/skills/content/verify-pdf-mdx/scripts/verify-pdf-mdx.mjs <mdx-path>` を実行（`--pdf` 省略で PDF 自動発見、textbook/guide の場合）
2. JSON 出力から `mdx.category` と `mdx.group` を取得
3. 上のディスパッチ表に従い、呼び出し先エージェントを決定
4. `--mode` が指定されていれば、それでオーバーライド
5. `pdf.ocr_suspected === true` の場合は「OCR 品質が低い」旨をエージェントへの引き継ぎプロンプトに明記する

### Step 3: エージェント呼び出し

該当エージェントを Task ツールで呼び出す。以下の情報をプロンプトに含める:

- 検証対象 MDX のパス
- frontmatter から取得した category/group/slug/title
- 推定 PDF パス（civil-construction-qa の場合のみ）
- `--deep` フラグの有無

### Step 4: 結果集約

エージェントの返却結果（QA レポート）をそのまま整形してユーザに提示。複数 MDX を一括処理した場合はファイル別にセクション化する。

### Step 5: 次のアクション提案

不合格・HIGH 違反があれば、次に何をすべきかを提案:

- テキスト網羅率不足 → 「MDX に missing topics を追記してください」
- 図の欠落 → 「`/civil-construction-1-pdf-to-mdx` で再抽出を提案」
- SVG 復元候補 → 「Phase 2 の `/reconstruct-figure`（未実装）で SVG 化を検討」
- 視覚不一致 → 「該当画像を手動で確認してください」

## 使い方の例

```bash
# 1. 単一 MDX を検証（auto モード）
/verify-pdf-mdx .local/r2/posts/civil-construction-1/textbook/construction-mgmt-overview/article.mdx

# 2. guide ページ
/verify-pdf-mdx .local/r2/posts/civil-construction-1/guide/concrete-key-points.mdx

# 3. 視覚比較を全件実行
/verify-pdf-mdx .local/r2/posts/civil-construction-1/textbook/construction-machinery-01/article.mdx --deep

# 4. モード強制指定（デバッグ用）
/verify-pdf-mdx <path> --mode textbook

# 5. 複数ファイルを一括検証
/verify-pdf-mdx file1.mdx file2.mdx file3.mdx
```

## アンチパターン

- **総監ページに /verify-pdf-mdx を使う** → ルーターが自動的に `cem-qa` へ振るが、`cem-qa` は別の評価ロジックなので結果のフォーマットが異なる。混乱を避けるなら直接 `cem-qa` を呼ぶ
- **dev server 未起動で実行する** → Playwright レンダリング検証ができず、Step 4 がスキップされる。事前に `npm run dev` を起動すること
- **修正をルーター側で実行しようとしない** → 本スキルは Evaluator 専任。修正は Generator スキル（`/civil-construction-1-pdf-to-mdx`）で行う
- **`--mode` を本番で使う** → デバッグ専用。通常は frontmatter から auto 判定する

## 連携スキル

| 連携元 | 役割 |
|---|---|
| **`/review`** | dev/review/SKILL.md のディスパッチ表で textbook/guide → `/verify-pdf-mdx` を呼ぶよう設定 |
| **`/civil-construction-1-pdf-to-mdx`** | Phase 5 として変換完了後に `/verify-pdf-mdx` を実行する |
| **`/check-mdx --rules syntax`** | 構文チェック（civil-construction-qa の MDX 互換性軸で内部呼び出し）|
| **`/review-mobile`** | モバイル視認性チェック（civil-construction-qa の guide モードで使用）|

## 参照

- `.claude/agents/civil-construction-qa.md` ── 1級土木向け Evaluator
- `.claude/agents/cem-qa.md` ── 総監キーワード Evaluator（既存）
- `.claude/agents/content-qa.md` ── PDF→MDX 静的5軸 Evaluator（既存）
- `.claude/skills/content/verify-pdf-mdx/scripts/verify-pdf-mdx.mjs` ── 決定論的前処理スクリプト
- `.claude/reference/exam-content-policy.md` ── 試験別コンテンツ整備方針＋コンテンツ別レビュー視点
