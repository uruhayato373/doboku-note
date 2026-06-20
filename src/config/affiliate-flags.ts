/**
 * 書籍アフィリエイト（もしもアフィリエイト「かんたんリンク」）の一括表示フラグ。
 *
 * false の間は `BookCard`（ASIN カード）も `BookSection`（見出し + キャプションの
 * ラッパー）も何も描画しない＝記事末・トップ末の「参考書籍」枠を完全に非表示にする。
 * moshimo bundle.js もロードしない。`affiliate-books.json` の payload と各 `<BookCard />`
 * 配置（page.tsx / MDX 直書き）はそのまま残すため、true に戻すだけで全カードが復活する。
 *
 * 現状 false の理由: Amazon アソシエイト/もしも審査が未通過で成果リンクを生成できないため
 * （審査未通過なのに空の「参考書籍」枠だけ出ていた不具合を解消。docs/todo/backlog.md
 * 「書籍アフィリエイト（BookCard）の休止対応」）。審査通過後に true へ戻して再設計する。
 */
export const AFFILIATE_LINKS_ENABLED = false;
