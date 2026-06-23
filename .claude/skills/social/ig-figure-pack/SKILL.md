---
name: ig-figure-pack
description: 技術士総監／土木 キーワードの site figure SVG を IG 4 枚カルーセルパック（表紙/図解/テキスト/CTA）に変換。resvg-js で 400×500 SVG → 1080×1350 PNG（2.7×）し caption.txt を生成。図解スライドは site の figure-N.svg を再利用。PNG はブラウザから Google Drive へ手動アップロード、caption.txt は MCP 経由で Drive に送信。
allowed-tools: Bash, Read, Write, Edit
---

# IG figure パック生成スキル

キーワードページの site 図版（`figure-N.svg`）を活かした **4 枚カルーセルパック** を作る。`ig-post-create --slug` の旧 notebook デザインとは別系統（SVG 手書き + resvg-js）。

| スライド | ファイル | 内容 |
|---|---|---|
| 表紙 | `00-cover.svg` | キーワード名（大）+ 5 管理ラベル（orange）+ 試験種ラベル |
| 図解 | `01-figure.svg` | site の `figure-N.svg` をそのまま再利用 |
| テキスト | `02-text.svg` | 試験頻出ポイント 3 点 + orange 注意 Callout |
| CTA | `03-cta.svg` | doboku-note.com 誘導 + @doboku-note フッター |

## ディレクトリ構成

```
docs/sns/instagram/{keyword}/
  carousel/
    img/
      00-cover.svg
      00-cover.png   ← 生成物 (1080×1350)
      01-figure.svg  ← site figure のコピー
      01-figure.png  ← 生成物
      02-text.svg
      02-text.png    ← 生成物
      03-cta.svg
      03-cta.png     ← 生成物
    caption.txt
```

`{keyword}` は site slug（例: `mcgregor-xy-theory`）と一致させる。

## デザイン仕様

| 項目 | 値 |
|---|---|
| SVG キャンバス | `400×500`（viewBox、4:5 固定） |
| 出力解像度 | `1080×1350`（2.7× スケール、IG feed 4:5 推奨） |
| ブランド navy | `#1a3a5c` |
| ブランド orange | `#a36b2c` |
| フォント | `Inter, "Noto Sans JP", "Hiragino Kaku Gothic ProN", sans-serif` |
| 5 管理カラー参照 | `docs/design-system/instagram-carousel-tokens.json` → `themes.{management}.primary` |

ブランドコンテキスト: **資格試験対策**。表紙には必ず試験種（「技術士 総監 | 人的資源管理」等）を入れる。ライフスタイル系・自己啓発系フックは避ける。

## 進め方

### 1. ディレクトリ作成と SVG 設計

```bash
mkdir -p "docs/sns/instagram/{keyword}/carousel/img"
```

4 枚の SVG を `viewBox="0 0 400 500"` で設計:

**00-cover.svg** — navy 背景
- 上部右: 5 管理ラベル（orange 系小テキスト）
- 中央: キーワード名（白・32-40px・`font-weight="bold"`）
- 下部小: 試験種 + 「択一 頻出テーマ」（薄青・12px）
- 上辺: orange アクセントライン 5px
- フッター帯: 濃 navy `#0f2035`・`@doboku-note`

**01-figure.svg** — site figure をコピー
```bash
copy ".local\r2\posts\{exam}\{slug}\img\figure-1.svg" "docs\sns\instagram\{keyword}\carousel\img\01-figure.svg"
```
`figure-N.svg` が `640×360`（landscape）の場合は `viewBox` を再調整して縦型にリレイアウトが必要。

**02-text.svg** — 白背景
- ヘッダ帯: navy 背景・試験種（orange 10px）+ ページタイトル（白 bold 16px）
- 番号付きポイント 3 点（navy circle + テキスト）
- 注意 Callout: orange 左縁・`fill="#fce8d0"` 背景・強調テキスト
- フッター帯: navy・`doboku-note.com`

**03-cta.svg** — navy 背景
- 「もっと解きたい方へ」（薄青 14px）
- 本アイコン（幾何学、orange stroke）
- コンテンツ説明テキスト（白 bold）
- URL ボタン: `rx="26"` 丸角・orange 塗り・白文字 `doboku-note.com`
- フォロー促進（薄青 13px）
- フッター帯: 濃 navy・`@doboku-note`

### 2. PNG 変換スクリプトを作成・実行

`.tmp/svg-to-png.mjs` を作成（前回パックのを PACK_DIR・FIGURE_SRC だけ書き換えて再利用可能）:

```javascript
import { readFileSync } from 'fs';
import { Resvg } from '@resvg/resvg-js';

const PACK_DIR = 'docs/sns/instagram/{keyword}/carousel/img';
const FIGURE_SRC = '.local/r2/posts/{exam}/{slug}/img/figure-1.svg';
const SCALE = 2.7; // 400×500 → 1080×1350

async function svgToPng(svgPath, pngPath) {
  const svg = readFileSync(svgPath, 'utf8');
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: Math.round(400 * SCALE) },
    font: { loadSystemFonts: true },
  });
  const pngBuffer = resvg.render().asPng();
  const { writeFileSync } = await import('fs');
  writeFileSync(pngPath, pngBuffer);
  console.log(`✓ ${pngPath} (${pngBuffer.length} bytes)`);
}

await svgToPng(`${PACK_DIR}/00-cover.svg`, `${PACK_DIR}/00-cover.png`);
await svgToPng(FIGURE_SRC, `${PACK_DIR}/01-figure.png`);
await svgToPng(`${PACK_DIR}/02-text.svg`, `${PACK_DIR}/02-text.png`);
await svgToPng(`${PACK_DIR}/03-cta.svg`, `${PACK_DIR}/03-cta.png`);
console.log('\n4 枚完了。');
```

```bash
node .tmp/svg-to-png.mjs
```

前提: `@resvg/resvg-js` が `node_modules` に存在すること（`npm install --legacy-peer-deps` 済みなら入っている）。

### 3. caption.txt を作成

```
docs/sns/instagram/{keyword}/carousel/caption.txt
```

構成テンプレ:

```
{キーワード和名}を完全整理

{試験種} {5管理名}の択一で頻出のテーマです。

▶ {ポイント1見出し}
{1-2行の説明}

▶ {ポイント2見出し}
{1-2行の説明}

{引っかけポイントの注意一文（X/Y理論の入れ替えなど）}

詳しい解説と過去問演習は プロフィールのリンクから
→ doboku-note.com

---
#技術士 #総監 #技術士総監 #{管理名} #択一 #試験対策 #{キーワードタグ} ...（15-20 個）
```

X ポリシーのタグ 1-3 個ルールとは別系統。IG は 20 個まで OK。

### 4. 品質確認

Read ツールで 4 枚 PNG を確認（画像として表示される）。チェックポイント:

- [ ] 表紙に試験種ラベル（「技術士 総監 | {管理名}」等）が入っている
- [ ] navy `#1a3a5c` / orange `#a36b2c` が統一されている
- [ ] 図解スライドの viewBox・余白が許容範囲内
- [ ] テキストスライドのポイントが 3 点で簡潔（各 1-2 行）
- [ ] CTA に `doboku-note.com` ボタンと `@doboku-note` フッターが入っている
- [ ] caption.txt のハッシュタグが 15-20 個

### 5. スマホへの転送

**caption.txt**: Google Drive MCP ツールで直接アップロード可能

```
mcp__claude_ai_Google_Drive__create_file(
  title="caption.txt",
  textContent=<caption 内容>,
  contentMimeType="text/plain",
  disableConversionToGoogleType=true,
  parentId=<Google Drive フォルダ ID>
)
```

**PNG 4 枚**: base64 サイズ上限（約 80 KB = 107K chars）のため MCP 経由不可。以下のいずれかで転送:

1. Windows Explorer で `docs/sns/instagram/{keyword}/carousel/img/` を開き → ブラウザで drive.google.com にドラッグ＆ドロップ
2. `copy docs\sns\instagram\{keyword}\carousel\img\*.png C:\tmp\` → C:\tmp\ からブラウザ転送
3. Mac 側に repo があれば Mac で `.tmp/svg-to-png.mjs` を実行して生成

## 担当外

- **slide-data.json 形式（過去問 4 問パック）** → `ig-post-create --exam`
- **A シリーズ択一クイズパック** → `ig-post-create --slug` + render-quiz-pack.mjs
- **Reels 動画化** → `ig-reel-create`
- **IG 予約投稿** → `publish-ig-bs`
- **品質採点** → `ig-carousel-qa`
- **過去問 H21-R7 全網羅パック** → `ig-carousel-restyle`

## 注意

- `git add -A` 禁止（CLAUDE.md §3）。PNG は gitignore 対象外なのでパス指定で add
- site の figure SVG が `640×360`（landscape、`--wide` フラグ想定）の場合は縦型への再レイアウトが必要
- resvg-js はシステムフォント（`loadSystemFonts: true`）を使うため、日本語が文字化けする場合は Node.js プロセスの locale を確認する
- 一時出力先として `.tmp/` を使うケースは `.gitignore` 対象なので C:\tmp\ または `docs/sns/` 配下に最終成果物を置く
