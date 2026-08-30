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
npm run build-standards-ogp         # 章ごとの OGP 画像（未生成のみ。--force で再生成）
npm run check-standard-articles     # 15 検査（本文の取りこぼし・条番号整合・SHA-256 一致・catalog 全 72 文書の被覆・表の可逆性 ほか）
```

真実源・設計の説明は `scripts/lib/standards-structure.mjs` の冒頭コメント。
