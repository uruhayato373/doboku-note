# クイックリファレンス

> doboku-note のコンポーネント・レイアウト・スタイルのリファレンス。

---

## 見出し階層（Modular Scale 1.2 基準）

```
h1 : font-size: 1.44rem, border-bottom: 3px solid #1a56db（ページタイトル）
h2 : font-size: 1.2rem, border-left: 3px solid #1a56db + bg: #f0f4fb（章）
h3 : font-size: 1.1rem, border-left: 3px solid #1a56db（節）
h4 : font-size: 1rem, CSS三角アイコン #1a56db（項）
h5 : font-size: 0.9rem, 太字のみ（細項目）
共通: font-weight: 700, line-height: 1.4, margin-top: 1.5em, margin-bottom: 0.75em
```

## テキスト

```
本文           : font-size: 14px, color: #434343, line-height: 1.8, letter-spacing: 0.08em
リンク         : color: #0066cc, hover: #004080, text-decoration: underline on hover
リスト項目     : margin: 0.2em 1.2em
```

## コンポーネント

```
blockquote     : padding: 1em 1.2em, border: 1px dotted #666, 背景透明
表タイトル     : className="table-title" → text-align: center, margin-top: 40px
表ラッパー     : className="table-wrapper" → flex center, margin-bottom: 50px
出典           : className="source" → skewX(-10deg), text-align: right, 『』で囲む
中央画像       : className="center-image" → display: block, margin: 50px auto 30px
数式スクロール : className="scroll-equation" → overflow-x: auto, margin: 40px 0
インデント     : className="indent" → margin-left: 30px
```

## 判例枠（法律コンテンツ）

```
重要判例       : className="box_important-precedent" → border: 1px solid #333, ラベル付き
最重要判例     : className="box_most-important-precedent" → 斜線パターン上下ボーダー
```

## 図の埋め込み

```mdx
<img src="./img/figure.png" width="600" className="center-image" />
<p className="text-center">図 X-X タイトル</p>
```

**画像の width ガイド**:
- 全幅の図・表: `width="700"`
- 標準の図: `width="600"`
- 小さい図・概念図: `width="400"`
- 横向き（ランドスケープ）: `width="700"` または `width="800"`

## 数式

```mdx
<!-- ブロック数式 -->
<div className="scroll-equation">

$$
F \leq \frac{\mu(W - P_u)}{P} \tag{1}
$$

</div>

<!-- インライン数式 -->
ここで、$\eta^*$ は静水面上の波圧作用高さである。
```

## 表

```mdx
<p className="table-title">表-1.1 タイトル</p>

<div className="table-wrapper">

| 列1 | 列2 | 列3 |
|-----|-----|-----|
| データ | データ | データ |

</div>
```

## レスポンシブ

```
ブレイクポイント: 1080px（数式のフォントサイズ・タグ位置変更）
数式（モバイル）: font-size: 0.8em, タグは右寄せブロック表示
```
