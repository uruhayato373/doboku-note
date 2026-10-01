---
name: project_mlit_theme_articles
description: "国土交通白書R7 × テーマ別トレードオフ × 過去問適用 8記事プロジェクト。合格体験ポジション(v3戦略)の中核資産として2026-07総監2次筆記に向け6週間で展開。"
metadata:
  type: project
---

# 白書テーマ記事群プロジェクト

合格体験ポジション ([[project_v3_strategy]]) の中核資産として、運営者本人が
NotebookLM で得た「白書数字 → 5管理間トレードオフ → 解決フレーム → 過去問適用」
の思考プロセスをサイトに展開。

## 構成

- **白書ハブ 1本**: `mlit-whitepaper-2025` — 5管理マッピング完備、即戦力レベル
- **テーマ記事 7本**: `essay-mlit-{aging-infrastructure, construction-2024, river-basin-management, green-transformation, i-construction-2, infrastructure-group-mgmt, foreign-workers}`
- **上位ハブ**: 既存 `management-tradeoffs` の末尾に「テーマ別深掘り」H2 追加で 7 テーマへ動線

全 8 記事は `category: pe-comprehensive-management` / `group: guide`。
`.claude/scripts/build-pillar-exam-questions.mjs` の `EXCLUDE_SLUGS` に登録済み
（既存ピラー過去問計算を保護）。

## 状態 (2026-05-17 最新)

- ✅ W1 完了 (2026-05-16): 8 記事 stub + SVG 図版 8 枚 + 上位ハブ章追加 + EXCLUDE_SLUGS 更新
- ✅ 全 8 記事 `published: true` 切替済み（章立て・白書数字・解決フレーム・SVG 図版公開）
- ✅ W6 前倒し (2026-05-16): note マガジン CTA infra 接続 (`magazine-placement.ts`)、
  過去問 5 secondary に Callout 注入、フレーム系 8 キーワードに「関連テーマ記事」追加
- ✅ W6 仕上げ (2026-05-17): 5管理ピラー 5本に SeeAlso 計13リンク、primary 過去問 7本に
  AI semantic で 135 件の Callout 自動注入（各エントリ「(要確認: AI推定)」note 付与）、
  lint warning 解消（tags.json に 18 タグ追加、management-tradeoffs MEDIUM 3件修正）
- ⏳ W2-W5: 受験者本人が「論文4ステップ適用例」「過去問適用パスポート」「5管理対立構造本文」を順次充実
- ⏳ deploy: 構造完成済み、`/deploy` 実行待ち（ユーザー判断）
- 🚫 2026-07: 試験本番、サイト作業凍結

## 動線網（2026-05-17 時点で完成）

```
[白書ハブ mlit-whitepaper-2025]
        ↕
[7 テーマ記事 essay-mlit-*]  ←→ [5 管理ピラー (SeeAlso 13リンク)]
        ↕                              ↑
[過去問 12本: primary 7 (135 Callout) + secondary 5]  
        ↕
[キーワード 8件 (関連テーマ記事セクション)]
        ↕
[note 有料 5 マガジン (frontmatter駆動 自動配置)]
```

## 自動化資産

- **`.claude/config/theme-to-questions.json`**: テーマ→過去問マッピング真実源（149 件、AI 推定含む。受験者本人が「(要確認: AI推定)」note を見直して精度向上）
- **`.claude/scripts/inject-theme-backlinks.mjs`**: 過去問 MDX に Callout 自動挿入（primary は設問単位、secondary は記事冒頭一括、dry-run 対応、MARKER は `{/* theme-backlinks:auto */}` で MDX-JSX 構文準拠）
- **`src/lib/magazine-placement.ts`**: note 有料マガジン CTA の slug ベース配置。白書ハブは全5マガジン強CTA、各テーマは精読ガイド + 該当ペルソナ自動表示
- 既存 `lib/mdx-io.mjs` の `writeMdxFile` 経由で CRLF 保持

## 守るべき制約

- R8 予想は Web では「再出題可能性」程度に留め、具体予想は note 有料（A-1+/A-2）に隔離
  → 信頼崩壊回避（[[project_v3_strategy]]）
- AI による思考プロセス代筆禁止（受験者本人の合格体験が資産価値の本質）
- `inject-theme-backlinks --apply` は全テーマ記事の本文完成後（W6）に実行
  → リンク先がスカスカだと SEO 評価を下げるリスク
- note と重複技術解説禁止（Red Line #5）: Web はフレーム解説、note は完成答案

## なぜ重要か

**Why**: 競合（資格学校・他ブログ）は「正解」を売るが、運営者本人が今まさに本番受験生として
「白書を読み、NotebookLM と対話し、トレードオフを構造化し、過去問に当てる」プロセスを
公開できるのは doboku-note だけ。E-E-A-T の "E"（Experience）の真打ち。

**How to apply**: テーマ記事の本文を充実させる時は、AI 代筆ではなく受験者本人の
思考プロセスを反映する。MDX 編集前に [[feedback_no_pe_construction_application]] [[feedback_hub_strengthening_approach]]
も併せて参照。

## 関連プロジェクト

- [[project_gsc_pivot_2026_04]] — PE 5 ピラー hub-spoke 完備、本プロジェクトの構造設計の参考元
- [[project_essay_pattern_analysis]] — essay-analysis（R07-R04）の思考パターン6型を
  各テーマ記事の「論文4ステップ適用例」で活用
- [[project_note_a1_rewrite]] — note A-1 「テーマ駆動5管理横串」リライト済み、
  本プロジェクトの note 有料導線先（P-04 / A-1+ / A-2）
- [[feedback_essay_char_limit]] — 「○○管理軸」固定ではなくテーマ × 5管理 ×
  専門部門の 3D 構造で設計、本プロジェクトの設計方針の真実源
