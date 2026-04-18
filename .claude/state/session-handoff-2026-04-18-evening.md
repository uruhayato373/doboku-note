---
date: 2026-04-18
type: session-handoff
supersedes: session-handoff-2026-04-18.md
next_session_priority: P2
related_plan: docs/project/22_content-resurrection-plan.md
---

# 次セッション クイックスタート（2026-04-18 夜ハンドオフ）

**目的**: Phase 1 + Phase 2 完結後のスナップショット。次セッションは 2026-04-29 以降の measure または Phase 3/4 から開始する。

## まず Read すべき 3 ファイル

1. **本ファイル** — Phase 1-2 完結状態 + 次の分岐点
2. **`.claude/state/experiments.json`** — EXP-001 / EXP-002 の next_check_date を確認
3. **`docs/project/22_content-resurrection-plan.md`** — Phase 3/4 のロードマップ

## Phase 1-2 で完了した作業（2026-04-18）

| 項目 | 成果 |
|---|---|
| Phase 1 Group 1 S評価 2件復活 | `civil-construction-1-reference-hyogo-port-materials` / `-river-abandonment` |
| Phase 1 Group 1 A評価 3件復活 | `-inverted-siphon` / `-floodgate` / `-tunnel-02` |
| 双方向リンク整備 | textbook-port-regulations / -river-act / -road-act ⇄ 復活 5 ページ |
| EXP-002 登録 + 運用 | running, baseline 5 URL (combined 162 impr / 4 clicks), target 15 clicks |
| 計測基盤 | metrics-analyzer / weekly-improve / gsc-ga4 data 取得 |
| Phase 2 コンポーネント | `<ReferenceLinks>` `<ExamContext>` 実装 + 8 ページ移行 |
| UI/SVG トークン統合 | brand/ink/positive/warn/danger/surface に一元化 |
| tag allowlist 拡張 | reference / kinki-design-manual 系 13 タグ追加 |
| GSC 手動 indexing | 運営者が 8 URL 全件完了（Phase 1 復活 5 + EXP-001 pending 3） |

**コミット数**: PR #9 / #10 / #11 / #12 がそれぞれ squash merge 済み。develop と main は同期。

## 次セッションの分岐点

### パスA: 2026-04-29 以降の measure（EXP-001 満期）

```
1. /weekly-improve で GSC/GA4 最新データ取得
2. EXP-001 の current_site_impressions_28d を 66 → ? に更新
3. measure 後、EXP-001 を closed に遷移（result + learnings 記録）
4. 同時に EXP-002 の impr / clicks 途中経過を確認
```

### パスB: 2026-05-02 以降の measure（EXP-002 満期）

```
1. /weekly-improve で 5 URL の combined_clicks 前後比較
2. target 4 → 15 の達成度を採点
3. 効果があれば Phase 4（Group 2 バルク復活）にゴーサイン
4. 効果がなければ Phase 5（効果の薄いスポークを published: false）検討
```

### パスC: measure を待たずに Phase 4 パイロット着手（並行）

```
1. design-manual 02 系 残 10 ページを一括復活（02-01 〜 02-13 のうち 02-10・02-07 以外）
2. ReferenceLinks / ExamContext コンポーネントで機械的にリンク生成
3. textbook-river-act の関連資料に構造物群として追加
4. EXP-003 として登録
```

**推奨**: まず 2026-04-29 に EXP-001 measure → 結果次第で 2026-05-02 EXP-002 measure → 成否に応じて Phase 4。Phase 3（Pattern 6 / NSM 再定義）は Phase 4 実施中に並行検討。

## 主要インフラの現状

### 新規コンポーネント（Phase 4 のバルク復活で再利用する）

```mdx
<!-- reference ページ冒頭に配置 -->
<ExamContext textbookSlug="civil-construction-1-textbook-river-act">
1級土木施工管理技士の河川分野では...
</ExamContext>

<!-- textbook ページ末尾に配置 -->
<ReferenceLinks
  description="河川法の実務・試験対策としては..."
  groups={[
    { heading: "河川構造物", slugs: ["civil-construction-1-reference-floodgate", "..."] },
    { heading: "行政手続き", slugs: ["..."] }
  ]}
/>
```

両コンポーネントは `getDocMeta` で自動的にリンク先の title/description を解決する。ad-hoc マークダウンを書く必要なし。

### frontmatter 規約（スポークページ）

```yaml
category: "civil-construction-1"           # ハブと同じ試験軸
tags: ["reference", "kinki-design-manual", "<topic>"]
exam_relevance:
  - "civil-construction-1-primary-<field>"
  - "civil-construction-1-secondary-construction-mgmt"
published: true
publishedAt: '2026-04-18'
source:
  title: "..."
  author: "..."
```

## やらないこと（明確に）

- **GSC indexing の再リクエスト**: 2026-04-18 に運営者が 8 URL 全件完了済み。再リクエストは Google のスロットリングを悪化させる
- **EXP-001 / EXP-002 の早期 close**: next_check_date まで waiting が正しい
- **Phase 3 の Pattern 6 追加**: Phase 4 実施後に判断。今 surface する改善候補は limited

## 成功条件（次セッション）

- [ ] EXP-001 measure 完了 → status: closed or continued
- [ ] 途中経過の learnings を experiments.json に記録
- [ ] Phase 4 着手可否を判断

## 参考: 主要パス

- **EXP 状態**: `.claude/state/experiments.json`
- **戦略**: `docs/project/22_content-resurrection-plan.md`
- **前ハンドオフ**: `.claude/state/session-handoff-2026-04-18.md`（朝、Phase 1 未着手時点）
- **新コンポーネント**: `src/components/ui/ReferenceLinks/` `src/components/ui/ExamContext/`
- **計測エージェント**: `.claude/agents/metrics-analyzer.md`
- **計測スキル**: `.claude/skills/management/weekly-improve/SKILL.md`

## 再開時の推奨プロンプト

```
次セッション開始時:
「/handoff」または
「.claude/state/session-handoff-2026-04-18-evening.md を読んで
 EXP-001 measure から始めて」（2026-04-29 以降）

「.claude/state/session-handoff-2026-04-18-evening.md を読んで
 Phase 4 パイロット（design-manual 02系残り10ページ）を進めて」（早期着手）
```
