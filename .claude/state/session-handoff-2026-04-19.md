---
date: 2026-04-19
type: session-handoff
supersedes: session-handoff-2026-04-18-evening.md
related_plan: docs/project/22_content-resurrection-plan.md
status: pivot_recorded
---

# 次セッション クイックスタート（2026-04-19）

2026-04-18 に Phase 1-2 完結（復活 5 件 + 双方向リンク + コンポーネント実装）したが、2026-04-19 に運営者判断で軌道修正。

## まず Read すべき 3 ファイル

1. **本ファイル** — Pivot 以後のスナップショット
2. **`docs/project/22_content-resurrection-plan.md` 冒頭の「Pivot サマリー」** — 軌道修正の全体像
3. **`.claude/state/experiments.json`** — EXP-002 は `paused`、resume_criteria を確認

## 現在の状態

### reference-materials カテゴリ（独立カテゴリとして新設済み）

- `/category/reference-materials` は空（5 記事すべて `published: false`）
- カテゴリ定義は `src/config/categories.json` に残置、variant は `reference`、icon は `BookOpen`
- URL 体系: `/docs/reference-materials-*`（旧 `/docs/civil-construction-1-reference-*` から 301 redirect）
- 5 記事の MDX 本体（本文）は保持、精度向上のベースに使う

### 5 記事（非公開、精度向上リワーク対象）

- `reference-materials-hyogo-port-materials`（兵庫県 共通仕様書 港湾材料）
- `reference-materials-river-abandonment`（廃川処理事務）
- `reference-materials-inverted-siphon`（伏越工）
- `reference-materials-floodgate`（水門）
- `reference-materials-tunnel-02`（トンネル 坑口・換気）

### civil-construction-1 側（試験対策ハブ）

- 3 textbook の `<ReferenceLinks>` は削除済み → ハブはクリーン
- カテゴリページ `/category/civil-construction-1` に外部リンクなし

### コンポーネント（残置、再利用可能）

- `src/components/ui/ReferenceLinks/` — ハブ末尾のスポーク誘導カード
- `src/components/ui/ExamContext/` — スポーク冒頭の試験対策バナー
- MDX から削除済みだがコンポーネント定義は残存、再カップリング時に再投入可能

### 実験（EXP-002）

- status: **paused**
- paused_at: 2026-04-19
- paused_reason: 運営者判断で 5 URL を一時非公開 + カテゴリ/内部リンクを完全分離
- resume_criteria: 5 記事の精度向上 → re-publish → 必要ならカテゴリ間リンク復活 → 新 baseline で再計測
- pending_user_actions: 空
- next_check_date: null

## 次セッションで選べるアクション

### パスA: 5 記事の精度向上リワーク（主戦場）

```
1. 各記事の現状を /review-mobile / /create-svg で評価
2. 試験対策文脈への最適化
   - frontmatter の description を「試験対策目線」に書き直し
   - 本文に「試験で問われるポイント」サマリーを追加
   - 関連過去問への References を追加（カテゴリ内のみ）
3. content-qa or civil-construction-qa でルーブリック評価
4. ≥ 2.0 に到達したら published: true に戻す
5. 戻すタイミングで /weekly-improve で新 baseline を取る
```

### パスB: 放置（判断保留）

- 5 記事は非公開のまま自然減衰
- 301 redirect は残すため、Google は徐々にクロールを減らす
- 2026-05-02 の EXP-001 measure に合わせて判断見直し

### パスC: 完全廃止

- 5 記事の MDX を .local/r2/posts/ から削除
- 301 redirect も削除
- docs/project/22_*.md を「廃止済み」に更新
- Google からも自然に消える

**推奨**: パス A（精度向上）。Phase 1 の学びをそのまま活かす。ただし主戦場の civil-construction-1 / pe-comprehensive-management のコンテンツ充実が優先（メモリ `project_quality_cycle_phase_g7.md` 参照）。

## やらないこと（明確に）

- **現状の published: false を迂闊に true に戻さない**: 精度向上ステップを省略すると、前回と同じ状態に戻るだけ
- **301 redirect の削除**: 再公開時の URL 継続性を保つため残置
- **カテゴリ reference-materials の削除**: 軌道修正の記録として残す（空でも構わない）
- **EXP-002 の即 close**: resume か close かは 5 記事の再公開可否を見てから判断

## 主要パス

- **戦略記録**: `docs/project/22_content-resurrection-plan.md` 冒頭の「Pivot サマリー」
- **実験**: `.claude/state/experiments.json` の EXP-002
- **コンポーネント**: `src/components/ui/ReferenceLinks/`, `src/components/ui/ExamContext/`
- **旧ハンドオフ**: `.claude/state/session-handoff-2026-04-18.md` / `session-handoff-2026-04-18-evening.md`
- **301 redirect**: `public/_redirects` の「reference-materials カテゴリ分離」セクション

## 再開時の推奨プロンプト

```
次セッション開始時:
「.claude/state/session-handoff-2026-04-19.md を読んで、
 パス A（5 記事の精度向上リワーク）から始めて」
```
