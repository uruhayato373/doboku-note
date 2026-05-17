# X(Twitter) 投稿テンプレ規約

このディレクトリの `draft/<NNN>-*/tweets.md` は全て **280 weighted chars 以下** で書く。
超過すると `publish-x` (Playwright) の予約投稿時に X 側で reject される（2026-05-17 発覚: 208/216 ツイート違反）。

## X 文字数ルール（重要）

| 要素 | 重み |
|---|---|
| 日本語・絵文字・全角記号 | **2** /字 |
| 英数字・半角記号・スペース・改行 | 1 /字 |
| URL（実長によらず） | **23** 固定 |
| 上限 | **280** |

→ 純日本語で書くと **実質 140 字 + URL 23 = 163 字相当 ≒ 117 字本文 + 1URL 程度**。

### 計測コマンド

```bash
node scripts/check-x-length.mjs                 # 全ドラフト
node scripts/check-x-length.mjs --draft 011     # 単一ドラフト
node scripts/check-x-length.mjs --over          # 違反のみ
```

違反があると exit 1。**全 tweets.md を変更したら commit 前に必ず実行する**。

## 1ツイートの構成テンプレ（推奨）

```
【総監キーワード解説】<キーワード名> #N

<本文 2〜4 行 ≒ 60〜90 日本語字>

→ <短縮URL with utm>

#技術士総監 #<管理分野>
```

### 字数ガイド（合計 ≤ 280）

| パート | weighted 上限目安 |
|---|---|
| ヘッダ行（【総監キーワード解説】xxx #N） | 35〜45 |
| 本文 | 150〜180（≒ 75〜90 日本語字） |
| `→ ` + URL | 25 |
| ハッシュタグ（2個まで） | 30〜45 |
| 改行（`\n` × 6〜7） | 6〜7 |
| **合計** | **≤ 280** |

## やってはいけないこと

- ❌ ハッシュタグ **3 個以上**（#技術士 #総合技術監理部門 #品質管理 #工程能力指数 → 70+ chars 消費。**2 個まで**に絞る: 例 `#技術士総監 #品質管理`）
- ❌ URL **複数本**（必ず 1 本に絞る。1 本で 23 字消費）
- ❌ CTA を「詳しい解説 →」「全解説 →」と冗長に書く（**`→ ` 1 文字で十分**）
- ❌ `▼ Cp（中心が規格中央にある場合）` のような長い行ヘッダ（**`Cp:`** で十分）
- ❌ 表組み（`| Cp 値 | 判定 |` 形式）— X は表をレンダリングしない上に縦線で字数を浪費

## やるべきこと

- ✅ 本文は **75〜90 日本語字**（重み 150〜180）に圧縮
- ✅ 数式は省略形（`Cp=(USL-LSL)/6σ`）
- ✅ ハッシュタグは **`#技術士総監 #<管理分野>` の 2 個固定**
- ✅ URL は **1 本のみ**、utm 必須
- ✅ 改行は **1 行空け**（連続改行は字数浪費）

## チャネル別 SSOT

- 画像生成: `scripts/gen-x-card.mjs`（[create-x-card](../../../.claude/skills/social/create-x-card/SKILL.md)）
- 投稿: `.claude/skills/social/publish-x/publish-x.ts`（[publish-x](../../../.claude/skills/social/publish-x/SKILL.md)）
- 字数検証: `scripts/check-x-length.mjs`
- マガジン CTA A/B: [magazine-ab-test.md](./magazine-ab-test.md)
