# 週次レビュー 2026-W22

作成日: 2026-05-29
対象期間: 2026-05-25（月）〜 2026-05-31（日）
前週レビュー: [2026-W21-review.md](./2026-W21-review.md)

---

## サマリー

- NSM（Organic Search users 28d）: 746 → 969（**+29.9%**）
- コミット数: **150件**（feat:44 / content:30 / fix:23 / chore:20 / docs:19 / tooling:1 / refactor:1 / merge:1）
- PSI mobile 違反数: 11 → **17件**（+6、悪化）
- running 実験数: **3件**（EXP-001 / EXP-003 / EXP-004、全件 measure 推奨）

---

## 成果ハイライト

1. **施工経験記述 note マガジン全スタック実装** — 1級土木（完成答案集/過去問模範答案集/予想問題集）と 2級土木（完成答案集/過去問模範答案集/予想問題集）の計6マガジンを実装。PDF spec 生成まで完遂。
2. **施工経験記述エージェント基盤構築** — `civil-keiken-essay-writer`（Generator）+ `civil-keiken-essay-qa`（Evaluator）+ スキル を新設。模範答案の量産体制が確立された。
3. **キャリア/アフィリエイト展開** — `CareerAffiliate` コンポーネントを新設し、GKS キャリア・SAT を 1級/2級土木ガイド5本以上へ配線。
4. **土木ガイドコンテンツ大幅拡充** — 1級・2級土木の分野別ガイド・参考書紹介・転職選び方など計15本以上を追加。
5. **CEM G-8 116件 品質採点・verify 完遂** — 技術士総監 G-8 グループ全件の採点と verify が完了。
6. **PE 404リンク 21件解消** — `related-keywords-404-audit` で検出した RelatedKeywords/本文の壊れリンクを一括修正。
7. **マガジン→紙用PDF変換スキル構築** — `magazine-pdf-builder` スキル + エージェントを新設し、`scripts/magazine-to-pdf.mjs` 実行基盤を整備。
8. **docs/note 試験別再編** — `docs/note/` を技術士総監/1級土木/2級土木/共通の4ディレクトリへ再編。
9. **白書オフライン照合チェッカー + fact-checker スコープD** — NotebookLM 逐次バッチと白書照合の自動化基盤を構築。
10. **IG Reels R7 過去問パック01-09 生成** — `ig-reels-create` スキル改修を含む R7 パック9本を一括生成。

---

## 開発活動

- コミット数: **150件**
- 種別内訳: feat(44) / content(30) / fix(23) / chore(20) / docs(19) / tooling(1) / refactor(1) / merge(1)

## コンテンツ実績

| vertical | 新規 MDX 数 |
|---|---|
| pe-comprehensive-management | 2,943 |
| civil-construction-1 | 342 |
| civil-construction-2 | 28 |
| reference-materials（5種） | 20 |
| **合計** | **3,333** |

> pe-comprehensive-management の大量追加はキーワードページの再生成・バルクリライトを含む。

---

## NSM（オーガニック検索流入）

> オフラインフォールバック: コミット済み GA4/GSC JSON から算出。各ファイルは28日ローリング窓。

### GA4 チャネル別（Organic Search）

| 期間 | Organic users | sessions |
|---|---|---|
| 2026-04-23〜05-20（W21比較） | 746 | 1,477 |
| 2026-04-30〜05-27（W22現況） | 969 | 1,928 |
| **前期比** | **+223（+29.9%）** | **+451（+30.5%）** |

- 28日ローリング窓の比較のため、厳密な週次差分ではなく累積傾向として読む。
- コンテンツ大量追加（キーワードページ + ガイド）と EXP-003/EXP-004 の seoTitle 改善が寄与した可能性。

### GSC クリック/インプレッション

| 期間 | clicks | impressions | CTR |
|---|---|---|---|
| 2026-04-20〜05-18 | 16 | 426 | 3.8% |
| 2026-04-27〜05-25 | 21 | 583 | 3.6% |
| **前期比** | **+5（+31.3%）** | **+157（+36.9%）** | -0.2pt |

- インプレッション・クリックともに増加。CTR はわずかに低下（新規ページが低 CTR で分母を押し上げた可能性）。
- EXP-003 の次チェック日（2026-05-30）が明日に迫る。combined_clicks (baseline:1) の成果計測タイミング。

---

## 実験の進捗

### Running（3件）

| ID | title | 経過日数 | next_check | 次アクション |
|---|---|---|---|---|
| EXP-001 | 統合ハウスキーピング: GSC クリーン + インデックス解放 | 44日 | 2026-04-29（超過） | **measure 推奨**（44日経過、未計測） |
| EXP-003 | 個別ハイインパクト SEO 修正 5件（seoTitle 検索意図整合） | 12日 | 2026-05-30 | 明日計測（`/fetch-gsc-data --dimension page --days 28`） |
| EXP-004 | primary h26-r06 seoTitle suffix 重複バグ一括解消（21件） | 12日 | 2026-05-30 | 明日計測（primary-h26-r06 全21件 clicks 合計確認） |

### Paused（1件）

| ID | title | 経過日数 | 状態 |
|---|---|---|---|
| EXP-002 | Group 1 S+A評価 5件の復活 + 双方向内部リンク | 41日 | 5記事 published:false のまま停止中 |

### 今週 close

- なし

### 次サイクルへの仮説

- EXP-003/EXP-004 の計測結果（2026-05-30）を受け、clicks が目標未達の場合は meta description の改善（Phase 2）を次実験に設定する。
- EXP-001 は 44日超過 — GSC の impressions 推移を `metrics-reader.mjs` で確認し、成否判定後に close する。

---

## PSI パフォーマンス推移

### Core Web Vitals 前週比（mobile）

| 基準日 | 違反数（perf<70） | 平均 LCP |
|---|---|---|
| 2026-05-22（W21末） | 11件 | 5,470ms |
| 2026-05-28（W22末） | 17件 | 6,180ms |
| **差分** | **+6件** | **+710ms（悪化）** |

### 違反 URL（2026-05-28 時点、上位8件）

| URL | perf | LCP |
|---|---|---|
| /docs/pe-comprehensive-management-r05-primary | 44 | 4,213ms |
| /docs/pe-comprehensive-management-r07-primary | 52 | 7,576ms |
| /docs/pe-comprehensive-management-alarp-principle | 57 | 7,215ms |
| /search | 58 | 5,281ms |
| /docs/pe-comprehensive-management-agenda-21 | 62 | 7,364ms |
| /docs/civil-construction-1-secondary-concrete-basics | 65 | 8,363ms |
| /docs/civil-construction-1-textbook-quality-management-text | 65 | 6,980ms |
| /docs/civil-construction-1-textbook-schedule-management | 65 | 5,590ms |

> PSI 閾値（psi-config.json）: performance_score_min=70、LCP_ms_max=2,500ms

### 今週の変動

- **新規増加**: +6件（コンテンツ大量追加週に重量コンポーネントが混入した可能性）
- **解消**: なし（今週は fix よりも追加に集中）
- **継続放置**: /search（複数週連続）

### 洞察

- pe-comprehensive-management-r05-primary の perf=44 は最低値。KaTeX + 過去問構造の重さが LCP を押し上げている。
- civil-construction-1 系ページの LCP 5,590〜8,363ms は Wave 3（blur orb 削除）以降も未解決のまま。Wave 4（H1 グラデーション簡素化 / KaTeX CSS 限定読込）の着手が必要。
- `/search` は検索基盤（MiniSearch）の初期化コストが LCP に影響。遅延ロード化を検討。

---

## 過去問起点の校正サイクル

### 今週のサイクル実施

logs/index.json が存在しないため今週の実施件数を特定できず。

今週の実施: スキップ（ログ不足）

### 年度別カバレッジ（CEM）

| 試験 | カバー問数 | 全問 | 進捗 |
|---|---|---|---|
| pe-comprehensive-management-r07-primary | 40 | 40 | **100%** |
| pe-comprehensive-management-r06-primary | 40 | 40 | **100%** |
| pe-comprehensive-management-r05-primary | 40 | 40 | **100%** |
| pe-comprehensive-management-r04-primary | 40 | 40 | **100%** |
| pe-comprehensive-management-r03-primary | 40 | 40 | **100%** |
| pe-comprehensive-management-r02-primary | 40 | 40 | **100%** |
| pe-comprehensive-management-r01-primary | 40 | 40 | **100%** |
| **合計** | **280** | **280** | **100%** |

- CEM 全7年度 × 40問 = 280問の完全カバーを達成。
- last_cycle: r05-primary Q1-40

### 次週の候補

CEM は全問カバー済みのため、次サイクルの対象は **1級土木 primary** へ移行を推奨。`select-next-question.mjs` の対応試験設定を確認し、civil-construction-1 向けに初回サイクルを起動する。

---

## 校正学習の蒸留

今週の MDX/SVG コミットから `/distill-proofread-learnings` を呼び出す環境が未整備のため、本セクションはスキップ。

今週の学習候補: 実施なし（次週以降に改めて実行）

---

## GitHub Umbrella Issue 棚卸し

`gh` CLI が使用不可のため自動集計をスキップ。

追跡中の Umbrella: スキップ（GitHub CLI 不可）

---

## 課題・ブロッカー

1. **PSI mobile 悪化（+6件）** — コンテンツ大量追加週に違反が急増。Wave 4 着手（KaTeX CSS docs 限定読込 / H1 グラデーション簡素化）を来週のアクションに上げる。
2. **EXP-001 長期放置（44日）** — next_check_date（2026-04-29）を大幅に超過。来週 `metrics-reader.mjs` で計測し close 判定する。
3. **CEM → 1級土木 校正サイクル移行** — CEM 全問カバー済み。1級土木 primary の校正サイクル開始手順を確認し、来週初回実行する。
4. **IG Reels の YT Shorts 連携** — r07 パック01-09 を生成済みだが YT Shorts 向け meta.json・概要欄の整備が未着手。

---

## 学び

- 施工経験記述マガジンをエージェント基盤と同時実装することで、量産体制と品質評価ループが一体で確立できた。note 有料マガジンの他カテゴリへの展開テンプレートとして再利用可能。
- PSI 違反はコンテンツ追加週に増えやすい傾向が確認された（W22: +6件）。重量コンポーネント（KaTeX、MiniSearch）を含む新規ページはリリース前に PSI を個別確認するフローを検討する。
- CEM 校正サイクル完了は一つのフェーズ終了。次リソースを 1級土木 primary に集中する時期。

---

## 来週への申し送り

- EXP-003 / EXP-004 を 2026-05-30 に計測（`/fetch-gsc-data --dimension page --days 28`）
- EXP-001 を計測・close 判定
- PSI Wave 4 着手（KaTeX CSS 限定読込 or H1 グラデーション簡素化）
- 1級土木 primary 向け校正サイクル初回実行（`/exam-keyword-cycle`）
- YT Shorts r07 パック meta.json・概要欄整備
