---
name: civil-figure-rework
description: >
  1級土木施工管理技士 primary（過去問1次）ページの図クロップを再生成し、
  サブエージェント (extractor → auditor) のループで最高品質まで仕上げる
  オーケストレータスキル。1ページ単位で commit。
  Use when user asks to [過去問図再抽出, 1級土木 図クロップ改善, テキスト写り込み修正, /civil-figure-rework].
user-invocable: true
---

# /civil-figure-rework

1級土木施工管理技士の過去問1次（`primary-r{年}-{a|b}`）ページに掲載されている図 PNG を、原本 PDF から **テキスト写り込みなし・本文重複なし** の品質で再生成する **オーケストレータスキル**。

Generator (`civil-exam-figure-extractor`) と Evaluator (`civil-exam-figure-auditor`) を 1 ページごとに最大 3 反復ループし、合格したら commit。

> [!warning] 適用限界（2026-07-08 確認）
> 本スキルは**問題PDF（問題A/B）に図が存在する**ことが前提。しかし確認した年度（H30/R01/R02/R07）の問題PDFは **"DHP-A.smd" テキスト起こし版で埋め込み画像0・図なし**（`pdfimages -list` / `pdftoppm` で確認）、**H26/H27 は問題PDF自体なし**。これらのページでは extractor が**空 spec を返す**（図は問題PDFでなく解答・解説資料側にしか存在しない）。既存クロップの「答え漏らし写り込み」是正は本スキルでなく**既存画像の手動タイト切り直し**で行う。詳細 → `docs/handoffs/_archive/2026-07-08-civil1-figure-answer-leak.md`。

## 引数

```
/civil-figure-rework <exam-slug>     # 単一ページ実行（例: r06-a）
/civil-figure-rework --all           # r01-a 〜 r07-b を順次実行
/civil-figure-rework --range r05-b:r07-b   # 範囲指定
```

| 引数 | 説明 |
|---|---|
| `exam-slug` | `r{年}-{ab}` 形式（例: `r06-a`, `r07-b`） |
| `--all` | 全14ページを順次実行（r03-a, r04-a は原本図なしで skip） |
| `--range start:end` | 範囲指定（例: `r05-b:r07-b`） |
| `--max-iter N` | 反復上限（デフォルト 3） |
| `--no-commit` | commit せずローカルに残す（デバッグ用） |
| `--skip-backup` | 既存図の backup を作らない（再実行用） |

## 前提条件

- `pdftoppm`, `pdftotext`, `magick`（ImageMagick）が PATH にあること
- `docs/textbook/１級土木施工管理技士/R{年}-1ji-{AB}.pdf` が存在
- `.local/r2/posts/civil-construction-1/primary-r{年}-{ab}/article.mdx` が存在
- ブランチが `main` または `develop`（feature ブランチ不要、CLAUDE.md §2 準拠）

## 処理フロー（1ページ分）

### Step 0: 前提確認
- ブランチ確認（`git branch --show-current`）
- ツール存在確認（`magick`, `pdftoppm`, `pdftotext`）
- 対象 MDX と PDF の存在確認

### Step 1: PDF 事前準備

```bash
# 例: exam=r06-a → 原本 過去問/R06/R06_第一次検定_問題A.pdf（.tmp 作業dir名は任意ラベル）
#     原本は年度別 過去問/R{06|07|...}/、命名は R{NN}_第一次検定_問題{A|B}.pdf
mkdir -p .tmp/pdf-pages/R6-1ji-A
pdftoppm -r 200 -png "docs/textbook/１級土木施工管理技士/過去問/R06/R06_第一次検定_問題A.pdf" .tmp/pdf-pages/R6-1ji-A/page

mkdir -p .tmp/pdf-text
pdftotext -layout "docs/textbook/１級土木施工管理技士/過去問/R06/R06_第一次検定_問題A.pdf" .tmp/pdf-text/R6-1ji-A.txt
```

### Step 2: 既存図を backup へ退避

```bash
mkdir -p .tmp/backup/r06-a/img
# 既存 PNG/WEBP があれば backup へ move
mv .local/r2/posts/civil-construction-1/primary-r06-a/img/*.png .tmp/backup/r06-a/img/ 2>/dev/null || true
mv .local/r2/posts/civil-construction-1/primary-r06-a/img/*.webp .tmp/backup/r06-a/img/ 2>/dev/null || true
```

> `--skip-backup` 指定時はスキップ。

### Step 3: 反復ループ（最大 N 回、デフォルト 3）

各反復で以下を実行:

#### 3a. Generator agent 起動

`civil-exam-figure-extractor` サブエージェントを起動。プロンプトに以下を含める:

- 対象 MDX のフルパス
- PDF テキスト `.tmp/pdf-text/R{年}-1ji-{AB}.txt`
- PDF ページ画像ディレクトリ `.tmp/pdf-pages/R{年}-1ji-{AB}/`（全ページ画像のパスをリスト化）
- backup ディレクトリ `.tmp/backup/{exam}/img/`（参考用）
- 前回 feedback JSON `.tmp/{exam}-auditor-feedback.json`（2回目以降）

サブエージェントは figure-spec JSON のみを返却する。

返却された JSON を `.tmp/{exam}-figure-spec.json` に保存。

#### 3b. Crop 実行

```bash
node .claude/skills/quality/civil-figure-rework/scripts/run-crop.mjs \
  --spec .tmp/r06-a-figure-spec.json \
  --out-dir .local/r2/posts/civil-construction-1/primary-r06-a/img
```

このスクリプトは ImageMagick で実 crop を行い、結果 JSON を出力。

#### 3c. MDX へ `<img>` 挿入/差し替え

```bash
node .claude/skills/quality/civil-figure-rework/scripts/inject-img-mdx.mjs \
  --mdx .local/r2/posts/civil-construction-1/primary-r06-a/article.mdx \
  --spec .tmp/r06-a-figure-spec.json
```

このスクリプトは `writeMdxFile`（CRLF 保持）経由で MDX を更新。各図を `## 問題 No.X` 直後（説明段落の後）に配置。

#### 3d. Evaluator agent 起動

`civil-exam-figure-auditor` サブエージェントを起動。プロンプトに以下を含める:

- 対象 MDX のフルパス
- 生成済み PNG ディレクトリのフルパスリスト
- PDF テキスト・ページ画像パス（リファレンス用）

サブエージェントは 4軸スコア + feedback JSON を返却。

返却された feedback JSON を `.tmp/{exam}-auditor-feedback.json` に保存。

#### 3e. 合否判定

- **合格** (`iteration_pass: true`): ループ抜けて Step 4 へ
- **不合格かつ反復 < max-iter**: Step 3a へ戻る（feedback を Generator に渡して再ループ）
- **不合格かつ反復 = max-iter**: failures.log に記録して Step 4 へ進む（強制完了）

### Step 4: 完了処理

```bash
# webp 生成
npm run generate-webp

# 整合性監査
node .claude/scripts/audit-exam-figures.mjs

# バックリンク再生成（CLAUDE.md §4 必須）
npm run refresh-indexes
```

### Step 5: Commit（1ページ単位）

```bash
# 該当ページのファイルを明示指定（CLAUDE.md §10、git add -A 禁止）
git add .local/r2/posts/civil-construction-1/primary-r06-a/article.mdx
git add .local/r2/posts/civil-construction-1/primary-r06-a/img/

# auditor の最終加重スコアをコミットメッセージに含める
git commit -m "$(cat <<'EOF'
content(civil-r06-a): figure クロップ品質改善（auditor weighted 2.85）

- 上下のテキスト写り込みを除去、本文との重複を解消
- alt は答え漏らし回避ルール準拠（image-policy.md L165-177）
- /civil-figure-rework スキルでループ実行（3反復 / max 3）

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Step 6: 一時ファイル整理

```bash
# PDF ページ画像・テキスト・spec・feedback は .tmp/ に残す（次ページ実行で再利用可能）
# backup は最後の commit 後も保持（rollback 用）
```

## 全ページ実行（--all）

以下の順序で逐次実行（並行禁止 — git add 衝突を避けるため）:

```
1. r05-a (図1枚 - 最小ケース)
2. r05-b (図2枚)
3. r03-b (図2枚)
4. r04-b (図2枚)
5. r06-b (図2枚)
6. r07-b (図2枚)
7. r06-a (図5枚)
8. r07-a (図6枚)
9. r01-b (図要4枚 - 未紐付含む)
10. r02-b (図要3枚 - 未紐付含む)
11. r01-a (図要10枚 - 未紐付)
12. r02-a (図要13枚 - 未紐付)
```

skip: `r03-a`, `r04-a`（PDF原本に図参照なし）

各ページ完了後に短い進捗報告を出す。全完走後に最終サマリ:
- 成功: N ページ
- 強制完了（max-iter 到達）: M ページ
- スキップ: 2 ページ
- 合計反復回数 / 平均加重スコア

## トラブルシューティング

| 症状 | 対処 |
|---|---|
| `magick: not found` | `brew install imagemagick` |
| `pdftoppm: not found` | `brew install poppler` |
| Extractor が空 spec を返す | PDF テキストに図参照キーワードがあるか手動確認。なければ skip リスト追加 |
| Auditor が永久に不合格 | max-iter 後に failures.log 記録。手動 Preview.app 調整に切り替え |
| MDX 編集後 CRLF 混在 | inject-img-mdx.mjs が writeMdxFile 経由しているか確認 |
| 図が複数ページに跨る | Extractor agent に複数ページ画像渡すよう spec 修正 |

## 出力

- **更新 MDX**: `.local/r2/posts/civil-construction-1/primary-{exam}/article.mdx`
- **新規/更新 PNG**: `.local/r2/posts/civil-construction-1/primary-{exam}/img/*.png`
- **生成 WEBP**: `.local/r2/posts/civil-construction-1/primary-{exam}/img/*.webp`（CI が R2 自動同期）
- **commit**: 1 ページ 1 commit
- **failures.log**: `.tmp/civil-figure-rework-failures.log`（強制完了したページのリスト）

## 連携パターン

```
[人間] /civil-figure-rework --all
    ↓
[メインスレッド: Opus]
    ├─ /civil-figure-rework が 1 ページずつ実行
    │  ├─ [Generator: civil-exam-figure-extractor] bbox spec
    │  ├─ Bash: ImageMagick crop
    │  ├─ Bash: inject-img-mdx.mjs (writeMdxFile)
    │  ├─ [Evaluator: civil-exam-figure-auditor] 4軸スコア
    │  └─ 合格: commit / 不合格: 再ループ
    └─ 全完了: 最終サマリ
```

## 担当外（明確化）

- **二次過去問（secondary-*）**: 対象外
- **textbook / guide ページ**: `civil-construction-qa` の担当
- **手動 Preview.app 調整**: failures.log のページのみ、ユーザーが手動対応
- **R2 アップロード**: CI（GitHub Actions）が `main` push 時に自動同期

## 参照ドキュメント

- `.claude/agents/civil-exam-figure-extractor.md` — Generator agent
- `.claude/agents/civil-exam-figure-auditor.md` — Evaluator agent
- `.claude/scripts/audit-exam-figures.mjs` — 既存整合監査スクリプト
- `.claude/scripts/lib/mdx-io.mjs` — writeMdxFile（CRLF 保持必須）
- `docs/reference/image-policy.md` L165-177 — 過去問図 caption/alt 厳格ルール
- `docs/reference/agents-registry.md` L71-96 — Generator/Evaluator 分業原則
- CLAUDE.md §3, §4, §8, §10 — MDX 書き込み・refresh-indexes・レジストリ更新・並行エージェント commit ルール
