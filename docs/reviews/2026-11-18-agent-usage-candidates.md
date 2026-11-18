---
title: 起動 0 回のエージェントの判断表（DN-0798）
updated: 2026-11-18
---

# 起動 0 回のエージェントの判断表（DN-0798）

> [!note] 使い方
> 「判断」の欄に運営者が「残す／統合／退役」と理由を書く。退役は agents-registry.md の退役表と同じ commit で行う（DN-0798 のやること 3）。提案の欄は親の見立てで、判断ではない。

## 数え方

- 期間: 2026-10-21〜2026-11-18（4 週間）。記録は `~/.claude/usage-log/`（Claude の hook）。サブエージェントの起動 695 回（`general-purpose` 189 回・`Explore` 29 回を含む）
- 対象: DN-1242 の再編（PR #1653〜#1657）の後の 75 体。名前が変わったものは旧名の回数を足した（例: `essay-qa` は旧 4 体の合計）
- 呼び出し元: `.claude/skills`・`scripts`・`.github` でエージェント名を参照しているもの
- 注意: Workflow の機械の段から起動したエージェントが hook に記録されるかは未確認。季節もの（試験の前後・受注があったときだけ）は 4 週間では 0 回になりうる

## 判断が要るもの（0 回・21 体）

| エージェント | 領域 | 役割・対象 | 呼び出し元 | 提案 | 判断 |
|---|---|---|---|---|---|
| `civil-exampoint-restorer` | サイト | 制作・過去問 | なし | 退役（一度きりの修復用・計画どおり） | |
| `svg-canvas-fitter` | サイト | 直す・SVG 図版 | なし | 退役か `svg-figure-rewriter` へ統合（スキルから呼ばれていない） | |
| `svg-figure-rewriter` | サイト | 直す・SVG 図版 | なし | 残すなら `/create-svg` か `/check-mdx` の svg から呼ぶ形にする。呼ばないなら退役 | |
| `note-cover-writer` | 商品 | 制作・note のカバー | スクリプトのみ | V5 カバーの展開が終わっていれば退役 | |
| `note-membership-operator` | 商品 | 運用・note の会員 | `/note-membership` | メンバーシップ撤退（DN-0477）の完了で退役 | |
| `coconala-blog-writer` | 商品 | 制作・ココナラブログ | `/coconala-blog` | ブログを続けるかで決める（続けるなら残す） | |
| `coconala-blog-qa` | 商品 | 採点・ココナラブログ | `/coconala-blog` | writer と同じ判断 | |
| `seo-fix-planner` | サイト | 企画・SEO | `/google-search-growth` | 残す（月次の検索の見直しで呼ぶ）。4 週間後も 0 回なら親の判断へ寄せる | |
| `exam-keyword-mapping-auditor` | サイト | 採点・過去問の紐づけ | `/audit-exam-mapping` | 残す（総監の過去問の追加時だけ） | |
| `keyword-rewriter` | サイト | 直す・キーワード記事 | `/improve-article`・`/quality-cycle`・`/weekly-improve` | 残す | |
| `content-qa` | 教材 | 照合・過去問 | `/pdf-to-mdx`・`/exam-questions-import` ほか 3 本 | 残す（過去問の取り込み時だけ） | |
| `civil-secondary-exam-writer` | サイト | 制作・過去問 | `/exam-questions-import`・`/civil-keiken-magazine` | 残す（二次の取り込み時だけ） | |
| `standards-table-writer` | サイト | 制作・基準書の表 | `/standards-table-rebuild` | 残す | |
| `svg-figure-auditor` | サイト | 採点・SVG 図版 | `/check-mdx`・`/note-prepublish-review` | 残す | |
| `figure-crop-worker` | サイト | 制作・切り抜きの図 | `/figure-recrop` ほか 3 本 | 残す | |
| `civil-keiken-tensaku-drafter` | 商品 | 制作・添削の返信 | `/keiken-tensaku`・`/coconala-order` | 残す（受注時だけ） | |
| `civil-keiken-tensaku-qa` | 商品 | 採点・添削の返信 | `/keiken-tensaku`・`/coconala-order` | 残す（受注時だけ） | |
| `magazine-pdf-builder` | 商品 | 制作・マガジンの PDF | `/magazine-to-pdf` ほか 2 本 | 残す | |
| `note-link-injector` | 商品 | 制作・note の下書き | `/note-prepublish-review`・`/note-hashtags` | 残す | |
| `note-page-visual-auditor` | 商品 | 採点・note の公開ページ | `/note-visual-review`・`/weekly-review` | 残す（必要時だけの撮影） | |
| `cli-runner` | 管理 | 実行・コマンド | Workflow から | 残す（Workflow の起動が記録に出るかを先に確かめる） | |

## 判断の対象外

- **今日新設した 3 体**: `note-traffic-analyst`・`coconala-traffic-analyst`・`product-portfolio-planner`。再編の 4 週間後に起動回数を比べる
- **SNS を保留しているチャネル**（DN-0798 の禁止事項）: `ig-carousel-writer`・`ig-carousel-qa`・`x-repost-curator`・`yt-shorts-title-writer`。ただし `yt-shorts-title-writer` はどのスキルからも呼ばれていないので、SNS 再開のときに呼び出し元を決める

## 1〜2 回だったもの（参考）

`affiliate-operator`・`note-funnel-auditor`・`search-intent-auditor`・`civil-textbook-rewriter`・`video-content-qa`・`x-post-writer`（各 1 回）、`doc-curator`・`kdp-operator`・`note-fact-checker`・`gsc-index-auditor`（各 2 回）。再編で分けた・改名したもの（`coconala-*`・`keyword-qa`・`textbook-qa`・`article-proofreader`）は旧名の回数。
