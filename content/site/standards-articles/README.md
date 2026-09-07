# 構造化章記事（レイヤー2）

`content/site/standards-library/`（レイヤー1＝原典照合用の逐語文字起こし・不変）から
`scripts/build-standard-articles.mjs` が生成した派生コンテンツです。**手で編集しません。**

- 章の切り方は PDF の分冊（50 ページ単位）ではなく、原本の柱が示す**編・章**。part 境界を
  またぐ章があるため、全 part を PDF ページ順に結合してから解析しています。
- 表は**可逆に復元できるものだけ** GFM にします（`scripts/lib/standards-table.mjs`）。復元したセルを
  連結して空白を除いた文字列が元行と完全一致しなければ採用せず、原文レイアウトのコードブロック＋
  原本ページリンクで出します。**採用しなかった理由は manifest の `tableOutcomes` に残す**ので、
  「試したが落ちた表」と「そもそも表を見ていない状態」を後から区別できます
  （実測では 166 件中 6 件が GFM。`pdftotext -layout` の版面はセル境界を持たないため大半は復元できません）。
- OGP 画像は章ごとに `chapters/{chapterId}/ogp.png` へ生成します（機関名 + 第N編 + 第M章）。
  このパスは asset-storage の `site-ogp-png` グループに一致するので、R2 供給と公開 URL の導出は
  記事の OGP と同じ仕組みに乗ります。git には追跡されません（`.gitignore` の `content/site/**/ogp.png`）。
- `<SourceRef pages="..." />` は MDX コンポーネントです。ページ側が原典の該当 PDF ページへ解決します。
- 同一内容を 9 機関が公開しているため、検索インデックス対象にするのは 1 機関だけです
  （`.claude/config/standards-structure.json` の `canonical.commonAgencyId`）。他機関の章は
  `noindex, follow` で読める状態を保ちます。原本 SHA-256 が完全一致する重複文書には章を作りません。

再生成と検査:

```bash
npm run build-standard-articles     # 生成（対象は .claude/config/standards-structure.json の build.documents）
npm run build-standards-comparison  # 近畿版を基準に地域別の実差分を comparison.json へ生成
npm run build-standards-data        # HTMLと同じ章構造から公開用 Markdown / JSON-LD / 索引JSONを生成
npm run check-standards-data        # 全章の形式・条数・出典/加工主体分離・公開ヘッダーを検査
npm run build-standards-ogp         # 章ごとの OGP 画像（未生成のみ。--force で再生成）
npm run check-standard-articles     # 15 検査（本文の取りこぼし・条番号整合・SHA-256 一致・catalog 全 72 文書の被覆・表の可逆性 ほか）
```

機械可読データは `public/standards-data/` へ生成され、本番ビルドごとに作り直します。このディレクトリは派生物なので Git では追跡しません。地域差分の `comparison.json` は判定結果をレビューできるよう本ディレクトリで追跡します。

- Markdown: 文書名、版、原本URL、原本・章SHA-256、原本ページをfrontmatterに保持
- JSON-LD: 原資料の発行機関とdoboku-noteの加工主体を分離し、編・章・節・条と条本文を保持
- 公開ヘッダー: `noindex, follow` とCORSを設定し、HTMLを正規の検索対象に保つ

新年度版を追加するときは旧版を上書きする前に版間差分を確定し、原本SHA-256と変更条項を履歴として保存します。地域比較と版間比較は、生成器コメント、`SourceRef`、空白差を除いた本文で判定します。

真実源・設計の説明は `scripts/lib/standards-structure.mjs` の冒頭コメント。
