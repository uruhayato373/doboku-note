---
name: magazine-to-pdf
description: >
  note マガジン（docs/note/magazines/**）の article.md を「問題文＋解答」中心の A4 PDF に変換し、
  任意でデスクトップへ納品する。複数解答（A/B案）や予想問題の構造差を spec(JSON) の include/exclude
  DSL で吸収する。note 掲載専用 CTA・採点者視点・出題予想根拠は除外。
  Use when user asks to [マガジンをPDF, 記事を紙で読みたい, note記事をPDF, 模範論文PDF, 解答をPDF, /magazine-to-pdf].
user-invocable: true
---

## 用途

note マガジンの `article.md` を、紙に印刷して読むための A4 PDF へ変換する。本文（試験問題・予想問題本文・模範論文）を残し、note 掲載専用パーツ（対象読者欄・マガジン誘導・フォロー誘導）と補助解説（採点者視点・出題予想根拠・解答骨子）を除外する。受験者が解答を紙で通読・印刷したいときに使う。

変換は決定論的に `scripts/magazine-to-pdf.mjs` が行い、マガジンごとの抽出ルールは `scripts/pdf-specs/{name}.json` に切り出して管理する（スクリプトを増やさずパラメータ化）。

## 引数

| フラグ | 必須 | 説明 |
|---|---|---|
| `--spec <path>` | ✓ | 変換ルール JSON。`scripts/pdf-specs/{name}.json` |
| `--desktop` | | 生成 PDF をデスクトップにもコピー（spec の `deliverTo: "desktop"` と同等） |
| `--in-place` | | 生成 PDF を**各記事の `srcDir/{記事dir}/` 配下にも配置**（spec の `deliverTo: "in-place"` と同等）。note 有料記事への購入特典PDF添付用。各記事dirに `{out}.pdf` が置かれる |

出力先は spec の `outDir`（既定 `C:\tmp\{マガジン名}-pdf`）。中間 HTML は `<outDir>/_work/`。`--in-place` 指定時は各記事ディレクトリにもコピーされる（模範論文ペルソナの購入特典PDF運用）。

## 実行手順

### ケース 1: 既存マガジンの再生成（spec 済み）

`scripts/pdf-specs/` に spec がある場合は直接スクリプトを実行する。

```bash
node scripts/magazine-to-pdf.mjs --spec scripts/pdf-specs/総監模範論文-自治体道路担当.json
node scripts/magazine-to-pdf.mjs --spec scripts/pdf-specs/総監記述式-R8予想問題集.json
```

### ケース 2: 新規マガジン（spec が無い / 構造不明）

`magazine-pdf-builder` サブエージェント（Generator）に **spec 作成と変換実行** を委譲する。エージェントが対象の全 `article.md` 見出しを読んで `include`/`exclude` を設計し、`scripts/pdf-specs/{name}.json` を作成してスクリプトを実行・検証する。

委譲時に必ず伝える social 則:
- 「問題文＋解答」を残し CTA・採点者視点・出題予想根拠を除外
- **複数解答（A/B案）は両方を必ず収録**（取りこぼし厳禁）

## spec スキーマ（要約）

完全仕様は `scripts/magazine-to-pdf.mjs` 先頭コメント。`include[]`（残すレンジを順に連結）＋ `exclude[]`（連結後に除去）。`from`/`to` は本文（frontmatter 除去後）への正規表現。`to` 省略で EOF まで。

```json
{
  "srcDir": "docs/note/magazines/総監模範論文-自治体道路担当",
  "deliverTo": "desktop",
  "articles": [
    { "src": "R07/article.md", "out": "模範論文-自治体道路-R07",
      "include": [{ "from": "^## 試験問題", "to": "^## 採点者視点" }] }
  ]
}
```

- **A/B 案を一括収録**: `試験問題 → 採点者視点` の 1 レンジで挟むと A 案・B 案がまとめて入る
- **複数の予想問題 ＋ 出題予想根拠を落とす**: `include` を予想問題ごとに分け、`exclude` で `出題予想根拠 → フル模範論文` を除去

## 例

```bash
# 自治体道路担当マガジン(R03-R07 + R08予想)を再生成しデスクトップへ
node scripts/magazine-to-pdf.mjs --spec scripts/pdf-specs/総監模範論文-自治体道路担当.json
```

## トラブルシューティング

- **Chrome が見つからない**: スクリプトは `C:\Program Files\Google\Chrome\Application\chrome.exe` を使用。パスが違う場合は `CHROME` 定数を修正
- **日本語が豆腐(□)になる**: 本文=明朝 / 見出し=ゴシックの Windows 標準フォント前提。フォント未導入環境では CSS の font-family を調整
- **複数解答が片方しか入らない**: `include` のレンジが A 案までで切れている。`to` を `^## 採点者視点` 等まで広げ、生成元 HTML で `A 案` / `B 案` が両方 > 0 か確認
- **CTA が残る**: `include` の開始見出しを本文セクション（`## 試験問題` 等）にする。冒頭の対象読者欄・マガジン誘導はレンジ外なら自動的に落ちる
- **検証**: `<outDir>/_work/*.html` を grep し、除外対象（採点者視点・`まとめた`・`こんな人のための`）= 0、`U+FFFD` = 0 を確認

## 参照

- 汎用スクリプト: `scripts/magazine-to-pdf.mjs`（spec DSL 完全仕様）
- spec: `scripts/pdf-specs/*.json`
- サブエージェント: `magazine-pdf-builder`（新規マガジンの spec 作成 → [agents-registry.md](../../../../.claude/knowledge/reference/agents-registry.md)）
- 図版・画像は対象外（このスキルはテキスト本文の PDF 化のみ）
