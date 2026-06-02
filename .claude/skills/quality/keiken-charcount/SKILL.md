---
name: keiken-charcount
description: >
  1級・2級土木 第2次検定 問題1（施工経験記述）の note マガジン模範答案について、各設問の答案本文を
  解答欄しきい値で機械チェックする。scripts/keiken-charcount.mjs が **(N)** マーカー型（完成答案集・過去問）と
  ### 記述例 型（予想問題集）と ### 〔設問〕(N) 見出し型（条件提示型）を両対応で抽出し、
  .claude/config/keiken-answer-sheet-limits.json のしきい値で OVER を surface する。決定論的処理（CLAUDE.md 原則5）。
  Use when user asks to [経験記述の字数確認, 施工経験記述の文字数チェック, 解答欄に収まるか, 答案の字数オーバー検出, /keiken-charcount].
user-invocable: true
---

## 用途

施工経験記述 note マガジン（完成答案集 / 過去問模範答案集 / 予想問題集）のフル模範答案が、本番の**解答欄に収まる字数**かを機械チェックする。字数カウントは決定論的処理なのでスクリプトで実行し、超過の**判定**は Evaluator (`civil-keiken-essay-qa`)、**圧縮修正**は Generator (`civil-keiken-essay-writer`) が担う（Generator/Evaluator 分離）。

## 実行

```bash
# 全マガジン一括（docs/note/{1級,2級}土木/magazines 配下の「経験記述」を含む article.md）
node scripts/keiken-charcount.mjs

# 個別ファイル・ディレクトリ指定
node scripts/keiken-charcount.mjs docs/note/1級土木/magazines/1級土木-施工経験記述-過去問模範答案集/R04/article.md

# Evaluator 連携用 JSON
node scripts/keiken-charcount.mjs --json

# ゲート用途（OVER が1件でもあれば exit 1）
node scripts/keiken-charcount.mjs --strict
```

## しきい値の真実源

`.claude/config/keiken-answer-sheet-limits.json`。設問区分（`current2_q1/q2`・`legacy3_q1/q2/q3`・`yosou`）ごとの `maxChars`。

> **重要（暫定値）**: 現在の `maxChars` は**暫定値**。公式解答用紙の行数×1行字数が未確定のため、模範答案の実測分布から仮置きしている（config 内 `_meta.provisional: true`）。公式行数が判明したら `行数 × 字/行` で `maxChars` を差し替え、`provisional` を `false` にすること。それまで OVER 判定は「公式根拠未確定の参考値」として扱う。

## 抽出ルール（スクリプト仕様）

- 答案マーカー: `**(N) …**`（太字）/ `### …(N)…`（条件提示型の見出し）/ `### 記述例`（予想問題）。
- マーカー直後から「次のマーカー or 次の見出し(`#`)」までを1答案ブロックとして収集。
- 番号付き・箇条書きリストの**記号は除去し中身は算入**（解答欄には書かれる本文のため）。`>` 編集注記・`---` は除外。
- 文字数は markdown 装飾(`*` `` ` ``)・タグ(`<sup>` 等)・空白を除いた実文字数。プレースホルダ `〇` は受験時に同桁の数値へ置換されるため算入。
- 形式判定: 設問(3)マーカーが存在すれば `legacy3`（旧3項目, 〜R05）、なければ `current2`（現行2テーマ, R06〜）。

## 完了条件

- 出力の各 article で OVER 件数を確認。OVER があれば該当設問を `civil-keiken-essay-writer` で圧縮し、再実行で OVER 0 を確認してからコミット。
- 公式行数が手に入ったら config を差し替え、`provisional: false` 化。
