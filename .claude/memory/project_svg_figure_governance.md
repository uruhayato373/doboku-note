---
name: project_svg_figure_governance
description: 図版SVGガバナンスの全体像(真実源/機械監査/意味層auditor/校正rewriter/目視ギャラリー)と note-figure-auditor 退役(2026-06-18)。SVG監査・校正・目視確認を触る前に読む地図
metadata: 
  node_type: memory
  type: project
  originSessionId: 2a3f0d88-92e2-42b0-b37c-ec10f01b4efb
---

doboku-note の図版SVGガバナンス層（2026-06-18 整備, commit be0283b8d・develop・未push）。SVGの監査/校正/目視確認/共有化を触る前にこの地図を見る。

**5層スタック**:
1. **数値ルール真実源** = `docs/design-system/svg-tokens.json`（site: viewBox≤400・font最小11/本文13・色 colorsAllowList・矢印marker定義）＋ `create-svg/SKILL.md`。色は CSS変数不可で hex リテラル直書き（`<img>`配信のため）。
2. **機械監査** = `check-mdx` の svg rules `audit.mjs`/`detect.mjs`（P1-P8: クリップ/必須属性/viewBox超過/font過小/色ドリフト/濃色bg、P9 はみ出し, P10 marker方向, **P11-concept-title(MEDIUM)=最上部中央 font≥14 y≤26 の概念名タイトル検知**）。pre-commit で site SVG の HIGH をブロック。state= `.claude/state/svg-audit.json`。**鉄則: 図に「概念名タイトルを入れない」(figure-canvas-policy §2.4)**＝SNS書出し render-figure-sns が概念名をヘッダーに出すため二重化／記事は見出しが担う。説明サブタイトル(サマリー)は font≤11 で先頭に置けば可。2026-06-24 に自作8図がこれに違反→除去＋P11新設(commit 169e03709)。既存ドリフト約32図は P11 で surface・別バックログ。check-figure-canvas はキャンバスサイズのみ検査でタイトルは拾わない。
3. **意味層 Evaluator** = `svg-figure-auditor`（audit-only・sonnet・**site/note横断**）。パスで真実源切替: site(`.local/r2/posts/**/img/*.svg`)=svg-tokens/image-policy/principles、note(`docs/note/**/img/figure-*`)=note-svg-policy。機械P1-P8の上の「概念伝達・alt整合・可読性・本文結線」を4軸採点。site SVGはPNG書出し無く構造判定＋「要目視」明記。
4. **校正 Generator** = `svg-figure-rewriter`（指摘をSVGソースに外科適用・データ/文言不変。site=audit.mjsでHIGH=0自己確認、note=figure-*.svg修正後にrenderでPNG再生成）。
5. **目視** = `npm run svg-gallery`（`scripts/svg-gallery.mjs`・1枚HTML・`--open`）。**上部タブで site/note 切替＋各タブ内で資格別(カテゴリ)フィルタ**、site タブは svg-audit.json 重大度バッジ＋severityフィルタ併設（note は PNG 表示でバッジ無し）。note は常時収集しタブ常設＝`--all` は後方互換 no-op（2026-06-18 タブ化）。雛形は `ogp-gallery.mjs`(HTML)＋`build-gallery-comment.mjs`(これは別物=GitHubコメント用Markdown・残置)。

**孤立figureガード（2026-06-29 新設）**: `scripts/check-orphan-figures.mjs`（`npm run check-orphan-figures`）。`img/figure-*.svg` が同記事直下の `*.mdx/*.md` 本文から basename も stem(別拡張子許容) も未参照＝サイト非表示なら exit 1。pre-commit(`--staged`)＋CI `r2-audit.yml`(全量)＋package.json に配線。過去問クロップdir免除・quiz-figuresブロック内 `<ArticleImage>` も参照として有効。`install-pre-commit.mjs` を worktree 対応化（`git rev-parse --git-path hooks` で共有フックへ書込）。契機=総監で figure 182枚の27%(49枚)が未結線→全件結線(commit f3d1a37bb/27281b648/0ab0711d0)＋ガード新設(73de76747)。SSOT=figure-canvas-policy §3。check-figure-canvas(キャンバスサイズ)とは直交。

**退役**: 旧 `note-figure-auditor` を svg-figure-auditor が吸収し退役。`note-prepublish-review` Phase2 の図版監査を svg-figure-auditor へ配線替え済。Generator/Evaluator分離原則で auditor↔rewriter は別エージェント。図クロップPNG専門 `civil-exam-figure-auditor` とは守備範囲が別。agents 50→51。

**共有化の未了（別タスク・今回は範囲外でズレをsurfaceするまで）**: 矢印markerが共通化されてない（`PdcaCycle.tsx` が `#6B7280` 直書き・共通marker defs無し）／記事SVGは色がhex直値で `var(--color-*)`・`currentColor` 未使用（svg-tokens allowlistは hex の許可リストであり token共有ではない）。UIコンポーネント内インラインSVGは design-review スキル管轄で別系統。

関連: [[feedback_prevention_over_patching]]（機械ゲート＋意味層の二段）・[[project_ogp_design_ssot]]（ogp-galleryパターン元）・[[feedback_svg_arrow_marker]]（marker定義）。
