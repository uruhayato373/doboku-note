---
name: feedback_content_structure
description: "記事の構成・書式規約: 図は本文に統合しArticleImageにcaptionを付けない・歴史は省く・概要キーバリュー表禁止・太字は30字以下の核心語のみ・ガイドは3000字以上・MDXに価格/内部IDを直書きしない"
metadata:
  type: feedback
---

## 図表・数式・歴史の構成判断（2026-04-17・content-principles 原則8〜10）
損益分岐点ページの校正で出た判断。試験対策サイトとして「得点に直結するか」が取捨選択基準。
- 図表は独立セクション（唐突な「図解」見出し）にせず本文の流れに統合。データ表は計算例として計算過程とセット。
- 分数は ÷ 表記にして SVG 化を優先（KaTeX の `\frac` はモバイルで読みにくくフォントサイズも不統一）。
- 歴史・背景は試験で問われない限り省く。
- サブエージェントも次回から適用（content-principles.md 原則8〜10に追記済み）。

## `<ArticleImage>` に caption を付けない
`<ArticleImage src="..." alt="..." />` のみ。`caption="図: ..."` を書かず図の説明は本文で行う（`.claude/content-principles.md` 141行目の共通ルール。caption に図の内容を書くと本文と重複して冗長。ユーザーが「共通ルール化した」と繰り返し指摘済み）。`/create-svg` や `/illustrate-concept` で既存 skill テンプレに caption が残っていても使わない。既存記事に caption が残っていても古い記事で、真実源は content-principles.md。新規作成時はまず content-principles.md を確認。

## キーバリュー概要表を作らない
「法律の概要」「基本情報」等のキーバリュー表（正式名称・目的・所管・適用範囲など）は冒頭の散文と重複して同じ内容を2回読ませる。労働基準法ページで5項目中2項目が完全重複していた。基本属性は冒頭セクションの散文に統合。表は比較対象がある場合（分類表・制度比較）のみ。`/keyword-page` スキルの SKILL.md にもルール追記済み。

## 太字スコープは核心キーワード（30字以下）のみ
総監キーワードページ（pe-comprehensive-management）の概念定義文「○○とは…である」で、**太字を30字以下のキーコンセプトに限定**し長文全体を太字で囲まない。4E対策・4M要因分析・インフラ老朽化対策の3ページで連続して59字以上の長大な太字を書いた（会話履歴依存のワーキングメモリが不安定で、`lint-mdx-mobile.mjs` にも content-principles.md にも明文化されていなかった）。
- 太字にしてよいもの: 方法論的中核（「**計画的な維持管理・更新**」「**4つの観点（4E）**」）／唯一識別する用語（固有名詞）／キー数値・略語（「**RTO**」「**95% 以上**」）。
- 定義構造は2パターン: (1) 1文目に概要＋太字は核心語のみ（`インフラ老朽化対策とは、… **計画的な維持管理・更新** で機能と安全を確保する取組である。`） (2) 2文に分割し定義と要素列挙を分離（`4E対策とは、労働災害の防止対策を **4つの観点（4E）** から体系的に実施する考え方である。4E は Education（教育）・Engineering（技術）・Enforcement（徹底）・Example（模範）の4要素を指す。`）。
- 自己検査: 「○○とは…である」を書き終えた直後に太字部分の文字数を数え、30字超なら縮める。

## ガイド記事（group: guide）は本文3,000字以上が必須下限（2026-06-21 ユーザー方針）
本文（frontmatter 除外・空白除去後）3,000字未満は thin content で公開品質を満たさない。ガイドは検索流入の入口かつ note 有料へのコンバージョン地点で、各 H2 が散文200〜400字（§17）なら標準構成で自然に3,000字を超える（下回るのは散文が箇条書き・表・Callout に逃げた兆候）。
- 公開前に `npm run check-guide-length`（published 全件・赤落ち）。加筆は水増しでなく具体（数値・体験・選択基準）。過去問(primary/secondary)・キーワード・textbook には適用しない（content-principles §5 §188 の図表中心ページ例外を侵さない）。真実源 content-principles.md §25、ゲート scripts/check-guide-length.mjs。既存31本の加筆バーンダウンは docs/todo/backlog.md。31本完了後に pre-commit/CI へ配線予定（それまで未配線）。関連: [[feedback_factcheck_guide_facts]]

## MDX 本文に note マガジン価格と内部 ID を直書きしない
`.local/r2/posts/` 配下の MDX 本文に note マガジン価格（`¥X,XXX`）と内部 ID（`M3`, `M4` 等）を直書きしない。価格表示は `src/lib/note-magazines.ts` の `price` から `<MagazineInlineCard>` / `<MagazineSidebarCard>` 経由のみ（料金改定時に全本文を grep 書き換えする運用は非現実的・SoT 1箇所更新で全カードに伝播するアーキテクチャを維持）。2026-05-19 に本文56箇所を14ファイルから一括削除（commit `40c76549a`・[[handoff-2026-05-19-r8-hub-spoke-ux-refactor]]）。
- 新規 MDX はマガジンの**タイトル**と**公開予定日**までを本文に書き、価格と ID は書かない。既存 MDX で価格表記を見つけたら削除。検証 `grep -rn '¥' .local/r2/posts/pe-comprehensive-management/` で0件を維持。例外: `docs/note/**/article.md`（note ドラフト原稿）は note 公開時の媒体表記なので価格表記 OK。
- 白書 URL も同パターン: `src/lib/whitepapers.ts` が SoT で `<SourceBadges>` が registry 経由でリンク化。
