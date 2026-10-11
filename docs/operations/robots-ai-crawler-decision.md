---
title: robots.txt と AI クローラーの運用方針 — ADR
---

# robots.txt と AI クローラーの運用方針 — ADR

2026-10-11 に運営者の判断で**案B（AI 検索と、利用者の指示で読みに来るエージェントだけを許可し、学習用は拒否のまま）**へ変えた。robots.txt はこのリポジトリの `scripts/lib/robots-txt.mjs` が作り、`scripts/generate-sitemap.mjs` が `out/robots.txt` に書く（`tests/robots-txt.test.mjs` が方針を固定する）。

## 決定

**案B を採用する（2026-10-11・運営者判断）。** 許可: `OAI-SearchBot`・`ChatGPT-User`・`PerplexityBot`・`Perplexity-User`・`Claude-SearchBot`・`Claude-User`。拒否のまま: 学習用（`GPTBot`・`ClaudeBot`・`anthropic-ai`・`Google-Extended`・`Applebot-Extended`・Meta・`Bytespider`・`Amazonbot`・`cohere-ai` ほか）と SEO ツール。`User-agent: *` に `Content-Signal: search=yes, ai-input=yes, ai-train=no` を付ける。

案A の再検討条件のうち 2 つが満たされた。(1) 計測: GA4 の bot-audit で AI 由来の参照元を数えられる（2026-09-26〜10-09 の 14 日で copilot.com 28 人・chatgpt.com 6 人。Copilot は Bing の索引を使うので既に流入がある）。(2) 構造変化: 2026-10 の検索流入は Bing のクリックが Google の約 10 倍で、ChatGPT 検索などが使う Bing 系の経路の比重が大きい。

効果と zero-click の実害は、GA4 の AI 参照元（chatgpt.com・perplexity.ai・claude.ai・copilot.com）の人数と、同じ期間の GSC・Bing のクリック、note への送客で読む。AI 経由が増えず検索クリックだけが落ちる形が 2 か月続いたら、案A へ戻すかを判断する。

Cloudflare のエッジでは、学習用の GPTBot だけが 403 で、AI 検索のエージェントは 200 で通る（2026-10-11 に User-Agent を変えて実測）。Cloudflare 側の設定は変えていない。

## 当初の状況（2026-08-28 実測・2026-10-11 時点では robots.txt はリポジトリ側で生成）

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

### 将来の再検討候補: 案B（検索系 bot のみ選択的に許可）

無料記事はもともと集客目的（note・ココナラへの送客導線）であり、AI 検索経由の参照増加を他の検索エンジンと同様に扱える可能性はある。有料記事の実体保護は robots ではなく noindex・paywall・note 側の非公開設定が担う。ただし zero-click の実害を計測できていないため、現時点では適用しない。

## 適用方法（承認後）

robots.txt は `scripts/lib/robots-txt.mjs` の一覧（AI_SEARCH_AGENTS・AI_TRAINING_AGENTS・SEO_TOOL_AGENTS）を変えて、ビルド・デプロイで反映する。一覧を変えたら `tests/robots-txt.test.mjs` も合わせる。Cloudflare のエッジで AI のロボットを止める設定（Bots の AI 関連）を変える場合は、運営者がダッシュボードで行う。

## 未決事項（v2監査 §8.3 の残り4項目・スコープ外）

- Cloudflare Managed Content-Signal の方針（`ai-train=no` 等の値自体を変えるか）
- category hub への CollectionPage / ItemList 追加
- index 未登録ページの統合・noindex 基準
- GSC 実験の対象 URL と成功指標

## 改訂履歴

- 2026-10-11: 運営者の判断で案B へ変更。AI 検索と利用者の指示で読みに来るエージェントを許可し、学習用・SEO ツールは拒否のまま。robots.txt の生成を scripts/lib/robots-txt.mjs に切り出し、テストで方針を固定
- 2026-09-04: 案A（現状維持）を採用。AI検索由来の効果を測れるまで個別許可を行わない方針を確定
- 2026-08-28: 初版。Cloudflare Managed robots.txt・全 AI bot ブロックの実測を反映

> [!note] Lighthouse との関係（2026-10-11）
> Lighthouse の `robots-txt` 監査は `Content-Signal` を「Unknown directive」と判定して 0 点になり、SEO カテゴリが 0.92 に落ちて CI の `lighthouse.yml` が全 URL で赤になった（実測）。Google など検索エンジンは未知の指令を無視するので実害は無い。`lighthouserc.json` の `settings.skipAudits` で `robots-txt` だけ外し、robots.txt の中身は `tests/robots-txt.test.mjs` が見る。
