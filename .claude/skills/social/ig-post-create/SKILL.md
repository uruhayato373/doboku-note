---
name: ig-post-create
description: 技術士総監キーワードの Instagram 投稿画像（Study Notebook デザイン）を生成。MDX からデータ抽出 → Satori レンダリング → PNG 3 枚（cover / board / cta）出力。Reels (1080×1920) と Carousel (1080×1350) の両サイズ対応。
allowed-tools: Bash, Read, Write
---

# Instagram キーワード解説投稿 生成スキル

`.local/r2/posts/pe-comprehensive-management/{slug}/article.mdx` を入力に、**Study Notebook（案C）デザイン**の Instagram スライド画像 3 枚を生成する。

## 現在の実装状態

| コンポーネント | 状態 | 場所 |
|---|---|---|
| スライドテンプレート | ✅ 実装済み | `.claude/scripts/lib/sns-common/notebook-slides.mjs` |
| レンダラ統合 | ✅ 実装済み | `.claude/scripts/lib/sns-common/slide-render.mjs` |
| サンプル生成スクリプト | ✅ 実装済み（ハインリッヒの法則） | `.claude/scripts/gen-notebook-sample.mjs` |
| MDX データ抽出 | ✅ 既存 | `.claude/scripts/lib/sns-common/mdx-extract.mjs` |
| 量産スクリプト（slug 指定） | ✅ 実装済み | `.claude/skills/social/ig-post-create/scripts/ig-post-create.mjs` |

## デザイン仕様（Study Notebook 案C）

仕様詳細: `.tmp/youtube-handoff/doboku-note-youtube/project/design-C-study-notebook.md`

| 要素 | 値 |
|---|---|
| 紙地 | `#f7f3ea`（クリーム紙）+ 横罫線 72px ピッチ |
| 左端 | 朱色マージン縦線（`#b22234`, opacity 0.6） |
| 右端 | 5管理タブインデックス（アクティブ管理のみ反転） |
| 付箋 | 管理ごとに色が変わる（安全=黄 `#fde58a` 等）|
| フォント | Noto Sans JP Bold のみ |
| キャンバス | Reels 1080×1920 / Carousel 1080×1350 の両対応 |

## スライド構成（3 枚）

| 型 | 役割 | 主要コンテンツ |
|---|---|---|
| `notebook-cover` | 表紙・Hook | ★今日のキーワード + 大見出し + 副題 + 数値ピラミッド + 付箋 |
| `notebook-board` | 板書・定義 | 見出し + 本文 + 「→ ここが本質」破線ボックス |
| `notebook-cta` | CTA・関連 | RELATED カード（▷ キーワードリスト）+ 概要欄付箋 |

## サンプル画像の生成（動作確認用）

```bash
# ハインリッヒの法則サンプル 6 枚（Reels × 3 + Carousel × 3）
node .claude/scripts/gen-notebook-sample.mjs

# 出力先
# .tmp/notebook-sample/reels/00-cover.png    (1080×1920)
# .tmp/notebook-sample/reels/01-board.png
# .tmp/notebook-sample/reels/02-cta.png
# .tmp/notebook-sample/carousel/00-cover.png (1080×1350)
# .tmp/notebook-sample/carousel/01-board.png
# .tmp/notebook-sample/carousel/02-cta.png
```

## データモデル

```js
// notebook-cover
{
  keyword: 'ハインリッヒの法則',
  keywordLines: ['ハインリッヒの', '法則'],  // 省略時は splitKeyword() が自動分割
  subtitle: '1 : 29 : 300',
  numbers: [                                 // 省略可。数値ピラミッドを表示
    { n: 1,   label: '重大事故（死亡・重傷）',     color: '#b22234' },
    { n: 29,  label: '軽微事故（休業 4 日未満）',  color: '#d4a017' },
    { n: 300, label: 'ヒヤリハット（無傷の異常）', color: '#2e6da4' },
  ],
  stickyText: '1929年\n50万件\n調査',
  management: 'safety',   // 'economic'|'human'|'info'|'safety'|'social'
  date: '2026-05-09',
  caption: '労災 1:29:300\nこれ、何の比率？',
}

// notebook-board
{
  heading: 'ハインリッヒの法則',   // mdx.title を自動挿入
  body: '重大事故 1 件の背後に\n軽微事故 29 件\nヒヤリハット 300 件が潜む経験則',
  noteText: '300 の段階で気付けば\n事故は防げる ＝ KYT の根拠',
  management: 'safety',
  caption: 'ヒヤリハット段階で予防＝KYT',
}

// notebook-cta
{
  related: ['バードの法則', 'KYT', '4M-4E', '不安全行動'],
  management: 'safety',
  caption: '続きは doboku-note で',
}
```

## 量産スクリプト

```bash
node .claude/skills/social/ig-post-create/scripts/ig-post-create.mjs \
  --slug heinrich-law \
  --date 2026-05-09 \
  --size both         # reels | carousel | both
```

出力先:
```
docs/sns/instagram/{date}-{slug}/slide-data.json  ← 手動編集可能な設定ファイル
docs/sns/instagram/{date}-{slug}/{size}/img/
```

**ワークフロー**:

| 実行パターン | コマンド | 動作 |
|---|---|---|
| 初回生成 | `--slug foo --date YYYY-MM-DD` | MDX 抽出 → slide-data.json 生成 → PNG 出力 |
| 再実行（手動編集を保持） | 同上 | slide-data.json 読み込み → PNG 再出力（MDX 解析スキップ） |
| MDX から再抽出 | `--reset` 追加 | slide-data.json を上書き → PNG 再出力 |

**slide-data.json スキーマ**（手動編集対象）:

```json
{
  "cover": {
    "keyword": "キーワード名",
    "subtitle": "1 : 29 : 300",
    "stickyText": "1929年\n50万件\n調査",
    "management": "safety",
    "caption": "キャプション文"
  },
  "board": {
    "heading": "キーワード名",
    "body": "定義文（改行は \\n）",
    "noteText": "本質メモ",
    "management": "safety",
    "caption": "キャプション文"
  },
  "cta": {
    "related": ["関連KW1", "関連KW2", "関連KW3", "関連KW4"],
    "management": "safety",
    "caption": "続きは doboku-note で"
  }
}
```

`management` の値: `economic` / `human` / `info` / `safety` / `social`

## Satori 制約（実装済みの回避策）

| 制約 | 回避策 |
|---|---|
| `display: 'flex'` 全コンテナ必須 | `d()` ヘルパーで自動付与 |
| `justifyContent: 'space-evenly'` 非対応 | `'space-around'` で代替 |
| インライン span の `background` グラデーション | `borderBottom: '8px solid #fff7a8'` でハイライター代替 |
| 絵文字（📌📎）フォント未搭載 | `▶` `▷` テキスト記号で代替 |
| `fontWeight: 800` | 700 にフォールバック（NotoSansJP-Bold は 700 のみ）|

## 関連

- デザイン仕様書: `.tmp/youtube-handoff/doboku-note-youtube/project/design-C-study-notebook.md`
- テンプレート実装: `.claude/scripts/lib/sns-common/notebook-slides.mjs`
- レンダラ: `.claude/scripts/lib/sns-common/slide-render.mjs`
- YT Shorts（同じ `sns-common` 基盤を使用）: `.claude/skills/social/yt-shorts-create/SKILL.md`
- 親タスク: task-queue T-001「SNS 自動投稿基盤（YouTube × Instagram）」
- 量産: task-queue T-005「SNS 型・チャネル拡充（試験後 2026-08〜）」
