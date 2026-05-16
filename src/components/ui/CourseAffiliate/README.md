# CourseAffiliate

資格講座のアフィリエイトリンクを統一カードで表示するコンポーネント。

## 使い方

```mdx
<CourseAffiliate
  provider="SAT"
  course="技術士試験対策講座"
  description="Web完結型のオンライン講座。記述式の添削にも対応しています。"
  href="https://px.a8.net/svt/ejp?a8mat=4B3RUZ+6Y23MI+5TRO+BWGDT&a8ejpredirect=https%3A%2F%2Fwww.sat-co.info%2Fec%2Fgijutsusi"
  imageSrc="https://www.sat-co.info/ec//images/new_item/gijutsusi/img-products.png"
  trackingPixel="4B3RUZ+6Y23MI+5TRO+BWGDT"
/>
```

## Props

| Prop | 必須 | 説明 |
|---|---|---|
| `provider` | 必須 | 講座提供元（例: "SAT", "アガルート"） |
| `course` | 必須 | 講座名 |
| `description` | 任意 | 補足説明（記述添削対応など） |
| `href` | 必須 | A8.netなどのアフィリエイトリンク URL |
| `imageSrc` | 必須 | 講座イメージ画像 URL（**人物画像NG**、SAT規約） |
| `trackingPixel` | 任意 | A8.netの `a8mat` 値（例: "4B3RUZ+6Y23MI+5TRO+BWGDT"）。内部で `https://www19.a8.net/0.gif?a8mat={value}` を組み立てる |
| `cta` | 任意 | CTAボタンテキスト（デフォルト「詳細を見る」） |

## 自動付与される属性

- `rel="nofollow sponsored noopener"` — SEO的に正しい挙動、ステマ規制対応
- `target="_blank"` — 外部リンクは新タブで開く
- 「PR」バッジ — **消費者庁ステマ規制 2023-10〜 で広告表示は法的義務**

## 配置原則

- doboku-note のメイン導線は「ここだけで合格できる」体験。アフィは**補完ポジション**で配置
- **記事末・hub末のCTA** に使う
- **ファーストビュー（記事冒頭）禁止** — メイン導線と矛盾するため

詳細: `docs/project/04_運営/02_アフィリエイト提携状況.md`
