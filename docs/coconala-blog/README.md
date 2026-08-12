# ココナラブログ 記事 SoT

ココナラ（coconala.com）のブログ記事の原稿置き場。1記事 = 1ディレクトリ（`{slug}/article.md`）。

**ルールの真実源はここではない。**
[coconala-blog-policy.md](../../.claude/knowledge/reference/coconala-blog-policy.md)（戦略・構成・採点・ハードゲート）と
[coconala-operations.md §9](../../.claude/knowledge/reference/coconala-operations.md)（プラットフォーム仕様）を見ること。

## 運用

```bash
node scripts/coconala-blog-publish.mjs --post <slug>            # 下書き（既定）
node scripts/coconala-blog-publish.mjs --post <slug> --commit   # 公開
npm run check-coconala-blog                                      # ハードゲート＋ドリフト
npm run scout-coconala-blogs                                     # 競合偵察（四半期）
```

スキル `/coconala-blog`（`coconala-blog-writer` → `coconala-blog-qa` → publish）。

## 書けないもの（機械で止まる）

- **外部リンク**、および `note.com` / `doboku-note` の**テキスト言及**（規約・アカウント制限リスク）
- メール・電話・LINE・外部SNS
- 本文への**金額の直書き**（サービスカードがライブ価格を描画するため不要）
- 販売していない（`listed` でない）出品への送客

## 記法

エディタにリスト・表・コードブロックが無いので、使えるのは3つだけ。

| 書くもの | 表記 |
|---|---|
| 段落 | 素の1行 |
| 見出し | `## 見出し` |
| サービスカード | `service:<serviceId>` を単独行（publish がカタログの `serviceUrl` へ展開） |

箇条書きにしたい場面は「1つ目は〜。2つ目は〜。」と散文で書く。

## 現在の記事

| slug | 連載 | angle | funnel |
|---|---|---|---|
| `ochiru-keiken-kijutsu-3-pattern` | 第1回 | 体験 | S1 診断 |
| `dokugaku-tensaku-genkai` | 第2回 | 理由 | S2 添削セット |
| `yosou-mondai-kaku-renshu` | 第3回 | ハウツー | 1級 予想模試 |
| `hinshitsu-kanri-kakikata` | 第4回 | ハウツー | 1級 教材フルパック |
| `sokan-shutsudai-theme-bunseki` | 単発 | 数字 | 総監 出題テーマ分析 |

連載は「次回予告 → 次記事の内容」が一致していること（QA が横断で見る）。
