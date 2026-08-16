# 土木公務員 × 資格 SEO 第1期

> [!note] 完了状況
> GSC・URL検査の保存データを根拠に戦略を文書化し、資格ハブの改稿、土木公務員×1級土木の記事新設、総監・転職・施工経験記述ページからの内部リンク接続まで実施した。本番デプロイとURL検査リクエストは未実施。

## 背景

「公務員 土木」「公務員 土木施工管理技士」「公務員 技術士」など、公務員と土木資格を組み合わせた検索語で表示回数・クリック・順位を伸ばしたいという依頼。

2026-08-01時点のローカル保存データでは、サイトマップ1,109 URLのうち登録済み795 URL、クロール済み未登録292 URL、登録率71.7%。既存の資格地図ページはクロール済み未登録で、URL検査の参照元もカテゴリページ1件だった。一方、総監メリットページは登録済みで、2026-07-01〜07-29に1クリック・2表示・平均3.5位を確認した。

このため、類似記事の量産ではなく「資格ハブ → 個別の発注者固有課題」という構造を先に作る方針とした。戦略の詳細は [13_土木公務員SEO戦略2026-08.md](../project/01_戦略/13_土木公務員SEO戦略2026-08.md) を参照。

## 変更内容

### 戦略・索引

- `docs/project/01_戦略/13_土木公務員SEO戦略2026-08.md` を新設
  - 優先キーワード、検索意図、情報設計、3段階ロードマップ、GSC正規表現、判定基準を記録
  - 第1期は `公務員 × 1級土木施工管理技士 × 発注者経験` を優先
- `docs/project/01_戦略/README.md` に戦略文書を追加

### コンテンツ

- `.local/r2/posts/pe-comprehensive-management/public-engineer-qualification-map/article.mdx`
  - 「自治体技術職員の資格地図」から「土木公務員におすすめの資格」ハブへ再設計
  - 1級土木、技術士、総監、RCCMの役割と取得順を分離
  - 新設記事と総監記事へ本文・SeeAlsoリンクを追加
  - OGPを新タイトルで再生成
- `.local/r2/posts/civil-construction-1/public-servant-merit/article.mdx` を新設
  - 土木公務員に1級土木が必須か、役立つ場面、優先度、発注者経験、令和8年度の受検資格、施工経験記述の棚卸しを解説
  - 実務経験の扱いは全国建設研修センターの令和8年度受検の手引を根拠にした
  - 山口市の2026年社会人採用を「資格証明を確認する募集例」として使用し、全国一律の優遇とは表現していない
  - `ogp.png` と `ogp.webp` を生成
- `.local/r2/posts/pe-comprehensive-management/public-servant-comprehensive-merit/article.mdx`
  - タイトルを「土木公務員に技術士総監は必要？」へ変更
  - 必須資格ではない点と自治体差を明確化し、資格ハブへ接続
  - OGPを再生成
- `.local/r2/posts/civil-construction-1/guide-public-servant/article.mdx`
  - 転職意図は維持したまま、資格ハブと1級土木ページへ接続
- `.local/r2/posts/civil-construction-1/secondary-experience-writing-guide/article.mdx`
  - 発注者側の実務経験を確認する読者向けに新設記事への導線を追加

### 生成索引

- `src/config/doc-meta-index.json` に新URLと改稿メタデータを反映
- `src/config/cross-exam-keywords.json` と `src/config/tag-dictionary.json` の件数・利用ページを更新
- `src/config/keyword-relations.json` を再生成

## 検証

- `npm run build`
  - 成功
  - 1,114静的ページを生成、Pagefind 1,114ページを索引、サイトマップ1,111 URLを生成
  - 新URL `civil-construction-1-public-servant-merit` が静的HTML・canonical・サイトマップに含まれることを確認
- `npx next build`
  - 最終の文章調整後も成功、1,114ページを生成
- `npm run check-guide-length`
  - 公開guide 117件が全て3,000字以上
- `npm run check-links -- --scope site`
  - 1,116ファイル・12,510リンクを検査し、リンク切れなし
- `node .claude/scripts/lint-mdx-mobile.mjs <変更5ファイル> --baseline --ci`
  - HIGH 0、baseline比の新規違反なし
- `npm run check-seo-meta`
  - 静的出力1,101 URLを検査し、HIGH 0
  - MEDIUM 85件は既存の headline mismatch・description長・thin body
- `npm run check-doc-refs`
  - 1,219ファイルのリポジトリ内参照は全て実在
- `npm run check-ogp-title-fit`
  - guide OGPの主題フォントは全て56px以上
- `npm run check-ogp-coverage`
  - 公開1,092記事のOGP欠落なし
- `npm run check-ogp-design`
  - 対象3枚を含む旧ライトデザインの全体警告1,116件あり。今回固有の欠落・文字収まりエラーではなく、リポジトリ全体の既存方針差
- `npm run check-jst-date`
  - 検査対象296ファイルで問題なし
- `git diff --check`
  - 空白エラーなし

## 残作業・次回判断

> [!todo] 公開後に行うこと
> 1. 通常の公開手順でサイトとR2画像を反映する。
> 2. 資格ハブと新設1級土木ページをURL検査し、インデックス状況を記録する。
> 3. 公開後28日と直前28日を比較し、戦略文書の正規表現で表示回数・順位・クリックを確認する。

- 本番デプロイ、R2アップロード、GSCのインデックス登録リクエストは今回実施していない。
- 次の記事候補は「土木公務員に技術士は必要？建設部門を取る意味と注意点」。ただし、第1期のインデックスと表示回数を確認してから新設する。
- `発注者 経験記述`で表示が出た場合のみ、発注者向けチェックリストを独立ページ化する。語順違いだけの類似ページは作らない。
- Google Search Consoleのクエリ行は匿名化クエリを含まないため、クエリ合計だけでなくページ合計も判定に使う。

