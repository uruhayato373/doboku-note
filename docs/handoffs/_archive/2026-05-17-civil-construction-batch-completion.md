---
title: 2026-05-17 1級土木 textbook/guide 30 件 一括品質向上セッション引き継ぎ
date: 2026-05-17
session_focus: civil-construction-1 textbook/guide 43 件のうち 30 件をリライト + content-principles §5 例外規定追記 + 全件再評価で平均 weighted 2.91 達成
related_strategy: docs/reference/content-principles.md
related_memory: project_civil_construction_quality_cycle
---

# 2026-05-17 セッション引き継ぎ

## 何が起きたか（1 行）

civil-construction-review が検出した 1級土木 textbook/guide 43 件のうち 30 件（HIGH 8 + MID PDF-only 10 + Group A 12）を 3 バッチでリライトし、ExamPoint vs Callout の設計判断（content-principles §5 例外規定）を確立、再評価で全 30 件が weighted ≥ 2.5（平均 2.91、前回 2.78 から +0.13）に到達した。

## 本セッションの commit（時系列）

| Commit | 種別 | 内容 |
|---|---|---|
| `e3398683b` | site | HIGH 8 件リライト（PDF残骸削除 + 構造改善） |
| `91cb4574a` | site | MID PDF-only 10 件（PDF番号参照 19 箇所削除） |
| `9824d6236` | docs | content-principles §5 例外規定追記 + civil-construction-review 調整（guide ピラーで Callout 試験のポイント を ExamPoint 代替として許容） |
| `cbfcad030` | site | textbook-leveling 疑似表見出し H4 化（PDF番号削除 6 箇所） |
| `0a79c0083` | site | 軽量補強 9 件並列リライト（段落分割 + 相互参照 + ArticleImage 導入文） |
| `780e65a5f` | site | guide 3 件 表前導入文追加 + セル字数調整（lint MEDIUM 17 件 → 0） |

push: 未実施（このセッションは `develop` ブランチ蓄積のみ。deploy は次回ユーザー判断）。

## 再評価結果（civil-construction-review）

**集計**:
- weighted < 2.0（不合格）: **0 件**
- weighted 2.0-2.49（MID）: **0 件**
- weighted ≥ 2.5（合格圏）: **30 件（全件）**
- うち ≥ 2.8（高品質）: **27 件**
- 平均 weighted: **2.91 / 3.00**（前回 2.78 から +0.13）

**改善幅 Top 3**:
1. textbook-quality-overview: 2.50 → 2.85（+0.35）
2. textbook-work-scheduling / -schedule-charts / -schedule-overview / guide-earthwork-key-points: 各 +0.35
3. guide-concrete-key-points: 2.55 → 2.85（+0.30）

**残課題上位 3 件**（次バッチ候補）:
1. textbook-loader (2.70) — ExamPoint items の体言止め違反（lint HIGH）
2. textbook-construction-business (2.55) — 4 列表のセル超過 + e-Gov リンク欠落
3. textbook-construction-plan-overview (2.70) — 概念図 SVG 未挿入

## 本セッションで確立した設計判断

### content-principles §5「適用範囲と例外」（2026-05-17 追記）

ExamPoint 規定は **CEM/1級土木 secondary** を主対象とし、**1級土木 textbook/guide ピラー型** では `<Callout type="note" title="試験のポイント">` を ExamPoint の代替として許容する。

**理由**:
- 配置位置の役割差: ExamPoint = 末尾総括 / Callout 試験のポイント = 各セクション冒頭予告
- 個数の構造的非互換: guide ピラーは H2 5-8 個型で 1-2 個上限と相反
- 書式の自由度: Callout は散文＋太字で予告フレーズが書ける

guide ピラー型の推奨運用:
- `<Callout type="note" title="試験のポイント">` を **1 セクション 1 個まで**（合計 5-8 個が標準）
- 末尾に総括 ExamPoint を置く必要はない
- ベンチマーク: guide-last-minute-2026 / guide-four-management / guide-law-key-points

civil-construction-review.md も同時調整（Step 7 評価ルールに反映）。

## 残課題: Group B 9 件（次セッション以降）

article.mdx 不在のため新規 PDF→MDX 生成が必要:

| ディレクトリ | img 数 | 章 |
|---|---|---|
| textbook-construction-machinery-01 | 46 | 第2章 |
| textbook-construction-machinery-02 | 50 | 第2章 |
| textbook-construction-plan-text-01 | 20 | 第2章 |
| textbook-construction-plan-text-02 | 12 | 第2章 |
| textbook-quality-management-text | 24 | 第4章 |
| textbook-related-laws-01 | 6 | 第7章 |
| textbook-related-laws-02 | 8 | 第7章 |
| textbook-schedule-management | 48 | 第3章 |
| textbook-surveying | 36 | 第5章 |

**着手前提**: `.claude/pdfs/１級土木施工管理技士/` に対応する PDF 原典が必要。現状は `guide.pdf`（548KB）のみで、章別 PDF は未配置。

**推奨フロー**:
1. PDF を `.claude/pdfs/１級土木施工管理技士/` 配下に配置
2. `/pdf-to-mdx --exam civil-construction-1` パイプライン起動
3. 既存 img/ ファイル名と PDF 章構成の対応マッピング
4. 9 件並列 PDF→MDX 変換
5. civil-construction-qa で網羅率検証
6. civil-construction-review で校正

**なぜ本セッションで生成しなかったか**: machinery-01/02（46+50 図）等は建設機械諸元・型式・規格値を扱うため、PDF 原典なしでは Claude の知識ギャップでハルシネーション可能性高（誤情報の publish リスク）。

## その他の課題（残 LOW 11 件）

LOW バケット 11 件（加重 ≥ 2.5）は軽微仕上げのみで対応可能だが、優先度は低い。再評価で図表 2 点だった 11 件に概念図 SVG を追加すれば平均 weighted は 2.91 → 2.97 圏まで上がる見込み（再評価レポート §3 参照）。

## 次セッションの選択肢

1. **残課題 3 件のリライト**: textbook-loader / -construction-business / -construction-plan-overview を ◎ 化（30 分程度）
2. **Group B 9 件着手**: PDF 入手が前提
3. **LOW 11 件の SVG 追加**: figures 軸を満点化（時間がかかる、優先度低）
4. **deploy**: `develop` → `main` push で本番反映

## 参考リソース

- 真実源: `docs/reference/content-principles.md`（§5 例外規定追記済み）
- 評価エージェント: `.claude/agents/civil-construction-review.md`（Step 7 例外対応済み）
- ベンチマーク: `.local/r2/posts/civil-construction-1/textbook-crane/article.mdx`（weighted 3.00 満点）
- plan ファイル: `/Users/minamidaisuke/.claude/plans/compressed-greeting-pelican.md`
