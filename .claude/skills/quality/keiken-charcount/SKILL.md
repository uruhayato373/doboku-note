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

施工経験記述 note マガジン（完成答案集 / 過去問模範答案集 / 予想問題集 / 想定工事バンク）のフル模範答案が、本番の**解答欄に収まる字数**かを機械チェックする。字数カウントは決定論的処理なのでスクリプトで実行し、超過の**判定**は Evaluator (`civil-keiken-essay-qa`)、**圧縮修正**は Generator (`civil-keiken-essay-writer`) が担う（Generator/Evaluator 分離）。

## 実行

```bash
# 全マガジン一括（docs/note/1級・2級土木/{1級,2級}土木/magazines 配下の「経験記述」or「想定工事バンク」を含む article.md）
node scripts/keiken-charcount.mjs

# 個別ファイル・ディレクトリ指定
node scripts/keiken-charcount.mjs docs/note/1級・2級土木/1級土木/magazines/1級土木-施工経験記述-過去問模範答案集/R04/article.md

# Evaluator 連携用 JSON
node scripts/keiken-charcount.mjs --json

# ゲート用途（OVER が1件でもあれば exit 1）
node scripts/keiken-charcount.mjs --strict

# pre-commit ゲート（staged の keiken 記事だけ検査・OVER で exit 1）。install-pre-commit.mjs で自動実行
node scripts/keiken-charcount.mjs --staged --strict
```

> **配線もれ防止**: keiken マガジンが本ツールの探索対象（上記フィルタ）から漏れると字数超過が素通りする。
> `check-magazine-wiring.mjs`（pre-commit）が、答案マーカーを持つマガジンがフィルタでカバーされているか機械検証する。
> 新 keiken マガジンを足したら本ツールのフィルタ＋`check-magazine-wiring` の COVERED を同期する。

## しきい値の真実源

`.claude/config/keiken-answer-sheet-limits.json`。設問区分（`current2_q1/q2`・`legacy3_q1/q2/q3`・`yosou`）ごとの `maxChars`。

> **しきい値の根拠（確定済み・2026-06-02）**: `maxChars` は公式解答用紙の行数×1行字数で**確定済み**（config 内 各 grade `provisional: false`）。試験問題自体に「○字以内」の明示規定やマス目はなく、制約は解答用紙の罫線（行）サイズで決まる。
> - **1級**（罫線 約25字/行）: 現行 R06〜＝各区画 8行×25字＝**200字**（全国建設研修センター公式R07問題＋複数受験者一致）。旧形式〜R05＝設問(1)9行=225字／(2)11行=275字／(3)7行=175字。
> - **2級**（約22字/行）: 問題文に明示規定なし。通説目安「1項目あたり約250字・1行20〜25字・解答欄の8割以上を埋める」で各欄=250字。
>
> OVER 判定は確定根拠に基づく。出典は config の各 grade `basis`/`sources` を参照。なお**短すぎ（解答欄8割未満）も減点**のため、上限内かつ欄を十分埋める字数を目標とする。

## 抽出ルール（スクリプト仕様）

- 答案マーカー: `**(N) …**`（太字）/ `### …(N)…`（条件提示型の見出し）/ `### 記述例`（予想問題）。
- マーカー直後から「次のマーカー or 次の見出し(`#`)」までを1答案ブロックとして収集。
- 番号付き・箇条書きリストの**記号は除去し中身は算入**（解答欄には書かれる本文のため）。`>` 編集注記・`---` は除外。
- 文字数は markdown 装飾(`*` `` ` ``)・タグ(`<sup>` 等)・空白を除いた実文字数。プレースホルダ `〇` は受験時に同桁の数値へ置換されるため算入。
- 形式判定: 設問(3)マーカーが存在すれば `legacy3`（旧3項目, 〜R05）、なければ `current2`（現行2テーマ, R06〜）。

## 完了条件

- 出力の各 article で OVER 件数を確認。OVER があれば該当設問を `civil-keiken-essay-writer` で圧縮し、再実行で OVER 0 を確認してからコミット。
- 公式行数が手に入ったら config を差し替え、`provisional: false` 化。
