---
name: project-civil-construction-quality-cycle
description: 1級土木 textbook/guide 43 件のうち 30 件リライト完了。content-principles §5 例外規定確立、平均 weighted 2.91 達成、Group B 9 件（PDF 不在で新規生成必要）が残課題。
metadata: 
  node_type: memory
  type: project
  originSessionId: 59ab5404-3d75-417f-9c1b-848c9b6a36eb
---

# 1級土木 textbook/guide 品質向上サイクル

## 現状（2026-05-17 セッション完了時）

**処理済み**: 43 件中 30 件（70%）
- HIGH 8 件: e3398683b でリライト完了
- MID PDF-only 10 件: 91cb4574a で PDF番号削除完了
- Group A 12 件: cbfcad030 / 0a79c0083 / 780e65a5f で軽量補強完了

**再評価結果（civil-construction-review）**:
- 全 30 件 weighted ≥ 2.5（合格圏）
- 平均 2.91 / 3.00（前回 2.78 から +0.13）
- 27/30 が ≥ 2.8（高品質）

**残課題**:
- LOW 11 件: 軽微仕上げのみ（優先度低）
- Group B 9 件: article.mdx 不在で PDF→MDX 新規生成必要

**Why**: doboku-note の差別化軸は「ここだけで合格できる」体験。1級土木 textbook/guide は学習導線の核となるため、5 軸ルーブリックで合格圏到達が必須。

**How to apply**: 次セッションでは (1) 残課題 3 件のリライト（textbook-loader / -construction-business / -construction-plan-overview）で全件 ◎ 化、または (2) Group B 9 件着手（PDF 入手が前提）を判断。

## 確立した設計判断: content-principles §5 例外規定

**ExamPoint vs Callout 試験のポイント の使い分け**（2026-05-17 確定）:

ExamPoint 規定は **CEM/1級土木 secondary** を主対象とし、**1級土木 textbook/guide ピラー型** では `<Callout type="note" title="試験のポイント">` を ExamPoint の代替として許容する。

**Why**: 配置位置の役割差（末尾総括 vs 各セクション冒頭予告）、個数の構造的非互換（H2 5-8 個型に上限 1-2 個の ExamPoint は不整合）、書式の自由度（散文＋太字で予告フレーズが書ける）。

**How to apply**:
- civil-construction-review エージェントは Step 7 でこの例外を反映済み（「ExamPoint 不使用」を guide ピラーで単独減点理由にしない）
- guide ピラー型では「1 セクション 1 個まで」（合計 5-8 個が標準）
- ベンチマーク: guide-last-minute-2026 / guide-four-management / guide-law-key-points

関連メモリ: [[project_pillar_architecture]]

## Group B 9 件（article.mdx 不在）

| ディレクトリ | img 数 |
|---|---|
| textbook-construction-machinery-01 | 46 |
| textbook-construction-machinery-02 | 50 |
| textbook-construction-plan-text-01 | 20 |
| textbook-construction-plan-text-02 | 12 |
| textbook-quality-management-text | 24 |
| textbook-related-laws-01 | 6 |
| textbook-related-laws-02 | 8 |
| textbook-schedule-management | 48 |
| textbook-surveying | 36 |

**着手前提**: `.claude/pdfs/１級土木施工管理技士/` に対応する PDF 原典が必要。現状は guide.pdf のみ。

**着手フロー**: PDF 配置 → `/pdf-to-mdx --exam civil-construction-1` → civil-construction-qa（網羅率検証）→ civil-construction-review（校正）

**Why 推測生成しないか**: machinery 系（46+50 図）は建設機械諸元・型式・規格値を扱うため、PDF なしではハルシネーション可能性高。published:false でも誤情報が出る。

## 引き継ぎドキュメント

- `docs/handoffs/2026-05-17-civil-construction-batch-completion.md`: 本セッションの全 6 commit、再評価詳細、Group B フロー
- plan ファイル: `/Users/minamidaisuke/.claude/plans/compressed-greeting-pelican.md`
