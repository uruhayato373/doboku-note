# Codex/Claude 実施ログ：1級・2級土木 note内容・導線監査

> [!done]
> **2026-07-19 完了**：1級・2級土木のnote記事241件を対象に、内容、CTA、重複、カバー、監査運用をread-onlyで確認し、管理方式の提案をレビュー文書へ保存した。記事・公開noteは未変更。

## 背景

1級・2級土木のnote記事について、内容と購入・回遊動線を確認し、修正を効率化できる部分と、frontmatter／カタログへ移すべき情報の境界を整理した。

## 実施内容

- `docs/reviews/2026-07-19-civil-note-content-funnel-audit.md` を作成。
- 241記事の構成、通常記事とmagazines配下の比率、代表記事の重複、CTA配置を確認。
- 管理方式を次の3層に整理。
  - frontmatter：記事役割・商品キー・CTA profile・著者属性キー
  - catalog/config：商品実体・URL・CTA規則・許可／禁止する著者訴求
  - Markdown：記事固有の長文・具体例・試験差
- 著者は元発注者であり、添削者・試験採点者ではないことを最優先制約として記録。

## 検証

```bash
npm run audit-note-funnel -- --exam civil
npm run audit-note-funnel -- --exam civil --live
npm run check-note-cover-fit -- --all
npm run note-meta-lint -- --help
npm run check-note-charlimits -- --help
git diff --check
```

- ソースCTA：ドリフト0。
- ライブCTA：civilでは2級一次択一PDFの末尾もくじCTAが未反映。
- カバー：1級21件、2級15件が上段文字溢れ。
- `note-meta-lint`：Node 20で `node:fs/promises.glob` が使えず起動失敗。
- 記事本文、frontmatter、公開noteは変更していない。

## 後続メモ

- 最初の実装対象は1級・2級の「落ちる答案」2記事とし、全241記事を一括移行しない。
- 本文全体はカタログ化しない。反復ブロックのみマーカー範囲を同期する。
- ライブCTA修復、本文更新、カバー更新はいずれも外部状態を変える別作業。

