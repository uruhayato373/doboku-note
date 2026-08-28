---
title: robots.txt と AI クローラー許可判断 — ADR ドラフト
---

# robots.txt と AI クローラー許可判断 — ADR ドラフト

DN-0049④「robots / OAI-SearchBot の ADR」（v2 監査 §8.3「今回は実装しない判断事項」の1項目）への回答。**適用（robots.txt 方針の変更）はユーザー承認事項**。本ファイルは判断材料の提示のみで、まだ決定していない。

## 現状（2026-08-28 実測）

`curl --ssl-no-revoke https://doboku-note.com/robots.txt` で確認したところ、**このリポジトリに robots.txt の実体は無い**（`public/robots.txt` 不在・`src/app/robots.ts` 等の動的生成も不在）。配信されている robots.txt は **Cloudflare Managed Content**（`# BEGIN Cloudflare Managed content` マーカーつき）で、Cloudflare ダッシュボード側の設定がそのまま出力されている。

現在の内容:

- `User-agent: *` へ Content-Signal ヘッダ（`search=yes,ai-train=no,use=reference`）— Cloudflare が主導する新しい許諾表明フォーマット（EU DSM 指令 Article 4 の権利留保を明記）
- 個別 bot は **すべて `Disallow: /`**（全面ブロック）: `OAI-SearchBot`（ChatGPT Search）・`ClaudeBot`・`Claude-Web`・`anthropic-ai`・`PerplexityBot`・`Perplexity-User`・`Google-Extended`（Gemini/Bard 学習）・`Applebot-Extended`・`FacebookBot`・`Meta-ExternalAgent`・`Meta-ExternalFetcher`・`Bytespider`（TikTok）・`Amazonbot`・`cohere-ai`・`omgili`・SEO ツール系（`DataForSeoBot`/`SemrushBot`/`AhrefsBot`/`MJ12bot`）
- `Sitemap: https://doboku-note.com/sitemap.xml`

**v2 監査 §8.3 が想定した論点（「robots.txt で OAI-SearchBot 等を個別許可するか」）は、現状すでに Cloudflare 側の設定で「全面ブロック」に倒れている。** 論点は「新規に許可を書き足すか」ではなく「既存の全面ブロックを一部解除するか」に変わっている。

## 論点

ChatGPT Search・Perplexity 等の AI 検索エンジンからの参照・引用（citation）による間接的な流入・ブランド露出を取りに行くか。取りに行くなら `OAI-SearchBot` / `Perplexity-User` の 2 bot（**検索目的の bot**）を allow へ変える必要がある。学習目的の bot（`anthropic-ai` / `Google-Extended` / `cohere-ai` 等）とは別軸の判断。

## 選択肢

### 案A: 現状維持（全面ブロック）

- 理由: note 有料コンテンツ（施工経験記述・総監記述式模範解答等）の無断学習・無断引用を防ぐ。収益モデルが note 個別記事の直接購入である以上、AI 検索の要約に answer が出てしまうと購入動機を削ぐリスクがある
- コスト: ChatGPT Search 等からの新規流入チャネルを得られない

### 案B: 検索系 bot のみ選択的に許可

- `OAI-SearchBot`・`Perplexity-User` の `Disallow: /` を外す（学習系 `Google-Extended`/`anthropic-ai`/`cohere-ai` 等は現状維持でブロックのまま）
- 理由: 「検索して引用元として表示される」ことと「学習データとして無断使用される」ことは別リスク。前者は他の検索エンジン（Google/Bing）で既に許可している経路と同種
- コスト: 無料記事（キーワードページ・過去問解説等）の要点が AI 検索の回答内で完結し、クリックされずに終わる可能性（zero-click）。有料記事は noindex/paywall 側で別途保護されているため直接の影響は小さいと推定されるが未検証

### 推奨: 案B（検索系 bot のみ選択的に許可）

無料記事はもともと集客目的（note・ココナラへの送客導線）であり、AI 検索経由の参照増加は他の検索エンジンと同様に扱ってよい。有料記事の実体保護は robots ではなく noindex・paywall・note 側の非公開設定が担っており、robots の許可可否とは独立している。ただし zero-click の実害は計測できていないため、**pilot 適用ではなく判断材料の提示に留める**。

## 適用方法（承認後）

robots.txt はこのリポジトリのコードでは生成していないため、**Cloudflare ダッシュボード（Security → Bots または対応する robots.txt 管理画面）側での設定変更が必要**。この環境（会社PC・Cloudflare API トークンは observability/graphql の read 系のみ）からは変更できない。

## 未決事項（v2監査 §8.3 の残り4項目・スコープ外）

- Cloudflare Managed Content-Signal の方針（`ai-train=no` 等の値自体を変えるか）
- category hub への CollectionPage / ItemList 追加
- index 未登録ページの統合・noindex 基準
- GSC 実験の対象 URL と成功指標

## 改訂履歴

- 2026-08-28: 初版起票（DN-0049④）。現状実測（Cloudflare Managed robots.txt・全 AI bot ブロック）を反映し、v2監査 §8.3 時点の想定（未設定→個別許可を検討）から状況が変わっていたことを記録
