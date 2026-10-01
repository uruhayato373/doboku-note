---
name: article-dates-frontmatter-truth
description: 記事日付の真実源は frontmatter。git log から引くとリポジトリ操作で公開 SEO 信号が動く
metadata:
  type: reference
---

サイトの日付（sitemap `lastmod` / JSON-LD `datePublished` / RSS）は
**frontmatter の `created` / `dateModified` が真実源**（2026-08-22 に反転）。
書き込むのは pre-commit の `backfill-mdx-dates.mjs --staged`、
検査は `npm run check-mdx-dates`（quality:audit:ci）。
**ビルドは git 履歴に触れない**（`loadGitDates` は欠落時だけの遅延ロード）。

**なぜ git 由来ではいけないか。** 以前はビルド時に `git log` から引いていた。
理由は妥当で「誰も frontmatter を更新しない」（反転前の実測: 1,117 件中 1,040 件が
中央値 49 日ズレ、30 日超が 867 件）。だが副作用が大きすぎた:

- **公開 SEO 信号がリポジトリ基盤に依存する。** リネーム・移行・履歴書換え・squash の
  たびに 1,117 ページの日付が黙って動く。2026-08-18 の情報アーキテクチャ移行で
  全 1,084 記事の dateModified が created まで巻き戻った
- **ビルドが全履歴を要求する。** shallow clone 不可。partial clone では
  `git log --name-status -M` が履歴の blob を丸ごと落とし `.git` が 969 MB → 7.0 GB
- 回避のため `-M100%` へ落として 22 記事の created が 12 日ずれた
- 履歴の切り詰めができない

**一般化**: 公開される出力を、リポジトリ基盤（履歴・mtime・ブランチ構造）から
導出しない。「コンテンツが古びる」なら **commit 時に書き込む仕組み**を作る。
毎回インフラから作り直すのは、正しさと引き換えに脆さを買う取引になる。

**検証の型（これは他でも使える）**: リファクタ前後で出力が変わらないことを、
**未コミット状態**で証明できる。frontmatter を書き換えても commit しなければ
`git log` は旧値を返すので、同一ツリーで「旧ロジック（git）」と「新ロジック（frontmatter）」を
走らせて diff できる。実際 sitemap.xml / feed.xml / atom.xml は 1 行の差も無く一致した。
旧実装は `git show HEAD:path/to/script.mjs > path/to/.old-script.mjs` で
**同じディレクトリに置く**（相対 import を解決させるため）。

**落とし穴**: gray-matter は YAML の裸の日付を `Date` にパースする。
`toISOString()` をそのまま使うと `2026-05-16` が `2026-05-16T00:00:00.000Z` になり、
書式が全ページで変わる。日付キーは `.slice(0, 10)` で `YYYY-MM-DD` に揃えること。

関連: [[untrack-ondisk-vs-tracked]] / [[partial-clone-repack-hazard]] / [[dn0111-repo-slimming]]
