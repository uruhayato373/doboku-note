# 週次レビュー 2026-W23

作成日: 2026-06-05
対象期間: 2026-06-01 〜 2026-06-07（6/5 時点・週途中スナップショット）
前週: [2026-W22-review.md](./2026-W22-review.md)

---

## サマリー

- 計画タスク達成率: 計画ファイル（`2026-W23.md`）未作成のため申し送りベースで評価
- 主な成果:
  1. **技術士第一次試験トラックを新設**（pe-first-stage、R元〜R7 全問 full 解説 + 公式 PDF 同梱）
  2. **技術士二次・建設部門 過去問問題文アーカイブ 84 ページ新設**（R元〜R7）＋画像照合で全面校正
  3. **被リンク資産の量産開始** — `/tools` ハブ新設＋無料 Web ツール 3 種（文字数チェッカー / 受験資格チェッカー / 過去問ミニ演習）
  4. **note 有料商品の公開反映ラッシュ** — 2テーマ組合せ大全 全10記事、2級・1級 完成答案集マガジン公開
- 注記: 6/5（金）時点での生成のため、週末分（6/6〜6/7）は未反映。

---

## 計画 vs 実績

| 項目 | 状態 | メモ |
|---|---|---|
| 週次計画ファイル `2026-W23.md` | 未作成 | 計画 vs 実績の機械対照は不可。W22 申し送りベースで評価 |
| 計測基盤（GA4/GSC） | 正常稼働 | CI（`fetch-metrics.yml`, 毎週金 06:00 JST）が取得・commit。今週分は 2026-06-05 取得済み（ローカル creds は設計上不要） |

> 次サイクルで `/weekly-plan` を回し W23/W24 計画ファイルを生成すると、次週の達成率が機械算出できる。

---

## 成果ハイライト

1. **技術士第一次試験トラック立ち上げ**（pe-first-stage）: 足場新設 → R5-R7 → R元-R4 と全問 full 解説で展開、公式過去問・正答 PDF を同梱（source_pdf 参照は gitignore で著作権配慮）。重複選択肢検出で既存ページの誤転記も是正。
2. **技術士二次・建設部門 過去問アーカイブ 84 ページ**: 問題文を新設し、系統的検証パスで画像照合・全面校正（50/84 ページ補正）。
3. **被リンク資産 第1〜3弾**: 施工経験記述 文字数チェッカー / 受験資格チェッカー / 1級土木 過去問ミニ演習（4択クイズ）を `/tools` ハブ配下に新設・相互リンク化。
4. **note 公開反映**: 2テーマ組合せ大全（全10記事＋個別カバー＋個別 note URL）、2級土木 完成答案集・過去問模範答案集マガジン公開、1級/2級 完成答案集に完成答案③を追加。
5. **PWA 過去問演習アプリ設計方針を策定**し、iOS 仕様・関連戦略に先行移管を反映。
6. **収益導線の整理**: もしもアフィリエイトリンクを一括非表示（BookCard キルスイッチ）。
7. **Instagram API 予約投稿のセットアップ着手**（本日）: 失敗の真因＝会社 PC プロキシの Meta API 遮断を特定、Mac 実施の手順書を整備。

---

## 開発活動

- コミット数: **286**（6/1〜6/5、Merge 含む）
- カテゴリ別（prefix 集計）:

| 種別 | 件数 |
|---|---|
| content | 87 |
| feat | 76 |
| fix | 31 |
| chore | 31（大半は metrics 自動コミット） |
| docs | 25 |
| その他（style/refactor/seo/skill/revert/ci） | 〜18 |

- 主な技術変更: pe-first-stage カテゴリ新設、exam-questions-import に構造ガード2種を永続化、/tools ハブ＋無料ツール群、BookCard キルスイッチ。

---

## コンテンツ実績

今週コミットでファイルが変動した投稿ディレクトリ（`.local/r2/posts/` 配下、touch 数ベース）:

| カテゴリ | 変動ファイル数 |
|---|---|
| civil-construction-1（1級土木） | 234 |
| pe-construction（技術士・建設二次） | 134 |
| pe-first-stage（技術士一次・新設） | 96 |
| pe-comprehensive-management（総監） | 67 |
| civil-construction-2（2級土木） | 52 |
| concrete-chief-engineer（コンクリ主任） | 24 |

> touch 数は新規＋更新の合計（純増ページ数ではない）。新設の純増は pe-first-stage と pe-construction 二次アーカイブが中心。

---

## NSM（オーガニック検索流入）

> 計測は CI（`fetch-metrics.yml`, 毎週金 06:00 JST）が GA4/GSC を取得し `.claude/state/metrics/` に commit する設計。本セクションはその CI 出力（今週分 2026-06-05 取得）から算出した正規データ。

### クリーン 7日（推奨指標）
- 期間: 2026-05-28 〜 06-03（`ga4-channel-organic` 最新）
- **Organic Search active users（NSM）: 649** / sessions: 983
- engagementRate: 0.64 / 平均セッション時間: 約 318 秒 / PV/セッション: 2.15
- 注: この「organic 7d」スナップショットは CI に新規追加されたばかりで現状 1 点のみ。**クリーンな前週比は来週（W24, 2点目取得後）から成立**する。

### 28日ローリング比較（参考・クリーンな WoW ではない）
| 指標 | 前回(〜05-27) | 今回(〜06-03) | 増減 |
|---|---|---|---|
| Organic users | 969 | 1,437 | **+48%** |
| Organic sessions | 1,928 | 2,607 | +35% |

> 28日窓は大きく重複するためドリフトを含むが、方向性は明確に増加。コンテンツ量産（一次トラック・被リンク資産・note 公開）が効いている可能性。

### GSC（低信頼）
- 既存スナップショット2件が窓不一致（旧 47日窓 vs 新 8日窓）のため直接比較不可。日次換算では clicks 約 1.7→4.0/日、impressions 約 69→196/日と**方向は増加**だが信頼度は低い。
- CI は既に `gsc-date --days 7` を毎週出力しているので、**来週 2 点目が揃えばクリーンな 7日 WoW が成立**する。

### NSM トレンドの洞察
- 一次試験トラック新設・被リンク資産・note 公開の波が流入増の主因と推定。
- クリーン 7日 organic / GSC 7日 の WoW は CI 蓄積待ち（来週 W24 から成立）。それまでは 28日ローリングで方向性を読む。

---

## 実験の進捗

> `.claude/state/experiments.json`（5 件）より。

### Running / Measuring
| ID | title | 経過 | 状態 | 次アクション |
|---|---|---|---|---|
| EXP-003 | 個別ハイインパクト SEO 修正 5件（seoTitle 検索意図整合） | 約20日（05-16〜） | measuring | **measure 実施推奨**（10日超過） |
| EXP-004 | primary h26-r06 系 21件の seoTitle suffix 重複バグ一括解消 | 約20日（05-16〜） | measuring | **measure 実施推奨**（10日超過） |

### Paused
- EXP-002: Group 1 S+A評価 5件の復活 + 1級土木 textbook 双方向内部リンク（04-18 開始、停止中）→ 再開 or 中止の判定が必要。

### 今週 close / done
- EXP-001: 統合ハウスキーピング（GSC クリーン + インデックス解放）— done
- perf-lcp-mobile-2026-W17: Mobile LCP 改善 Wave 1（GA4 lazyOnload）— completed

### 次サイクルへの仮説
- EXP-003/004 は計測タイミング到来。今週の organic 増（28d +48%）に seoTitle 整合が寄与したか、ページ別 GSC で切り分けて効果判定 → 横展開可否を決める。

---

## PSI パフォーマンス推移

> `.claude/state/metrics/psi/psi-batch-2026-06-04` より（22 URL 測定）。Performance スコアは 0-100。

### Perf < 90 の URL（4 件）
| Perf | URL |
|---|---|
| 77 | /docs/civil-construction-1-primary-r07-a |
| 79 | /docs/pe-comprehensive-management-exam-index |
| 82 | /docs/pe-comprehensive-management-r07-primary |
| 88 | /docs/civil-construction-1-guide-strategy |

- 22 URL 中 18 URL が Perf ≥ 90、トップページ `/`=99、`/search`=100 と良好。
- 低スコアは**過去問・index 系の重いページ**に集中（画像・問題数が多い）。LCP 起点の改善余地。

> 注: 旧 PSI 違反トラッキングは GitHub Issue 依存だが、本プロジェクトは Issue 廃止済み（CLAUDE.md §8）。違反は本レビューと `.claude/state/metrics/psi/` で追跡。

---

## 過去問起点の校正サイクル

- 今週の `/exam-keyword-cycle` 明示実施: データ上の明確なサイクル記録は確認できず（**今週の実施: なしと記録**）。
- ただし pe-construction 二次の 84 ページ全面校正・一次トラックの誤転記是正など、**過去問起点の校正そのものは大規模に進行**。
- 次アクション: 校正対象を `exam-keyword-cycle` のサイクル記録に乗せると、年度別カバレッジが可視化できる。

---

## 校正学習の蒸留

> `/distill-proofread-learnings` は本レビューでは未実行（手動生成のため）。今週の校正規模が大きい（二次 84 ページ・一次全問）ので、別途実行で新ルール候補を抽出する価値が高い。

- 今週の学習候補: 未抽出（要 `/distill-proofread-learnings --since "7d"`）
- 既に永続化された学び: exam-questions-import の構造ガード2種、過去問変換 QA の学び（docs 追記済み）。

---

## GitHub Umbrella Issue 棚卸し

- 本プロジェクトは GitHub Issue を廃止（CLAUDE.md §8、タスクは `task-queue.json` に集約）。
- **追跡中の Umbrella なし**（本セクションは該当なしとしてスキップ）。

---

## 課題・ブロッカー

1. **クリーン週次比較が CI 蓄積待ち**: 計測自体は CI（金 06:00 JST）で正常稼働。ただし clean 7日 organic NSM と GSC 7日 date のスナップショットが導入直後で各 1 点のみ → クリーンな WoW は W24 から。今週は 28日ローリングで方向性を確認。
2. **EXP-003/004 の計測が 10 日超過で滞留**: measure 未実施。効果判定して close へ。
3. **過去問・index 系ページの PSI**: 4 ページが Perf < 90。LCP 改善の次ターゲット。
4. **週次計画ファイル未作成**: 達成率の機械評価ができない。`/weekly-plan` 運用を再開。
5. **Instagram 予約投稿**: 会社 PC では不可能と判明。Mac での Phase 1 疎通が次の関門（手順書整備済み）。

---

## 学び

- **失敗の真因はネットワーク**だった（IG 投稿）: コード/設計ではなく会社 PC プロキシの Meta API 遮断。ローカル実行を当然視せず、外部 API 作業は到達性を先に検証すべき。
- **被リンク資産＋一次トラック新設**のタイミングで organic がローリング +48%。コンテンツ量産が流入に直結している兆候。
- スナップショット運用は「窓の一致」が命。窓不一致だと WoW が成立しない（GSC で露呈）。

---

## 来週への申し送り

- [ ] `/weekly-plan` を実行し W24 計画ファイルを作成（達成率の機械評価を復活）
- [ ] EXP-003 / EXP-004 を measure → 効果判定 → close（横展開可否を決定）
- [ ] EXP-002（paused）の再開 or 中止を判定
- [ ] PSI Perf<90 の 4 ページ（primary-r07-a / pe-comp-exam-index / pe-comp-r07-primary / guide-strategy）の LCP 改善
- [ ] W24 で clean 7日 organic / GSC 7日 の 2 点目を確認しクリーン WoW を初算出（CI 出力済みなので蓄積待ち）
- [ ] `/distill-proofread-learnings --since "7d"` で今週の大規模校正から学習抽出
- [ ] Instagram 予約投稿 Phase 1（Mac で認証〜投稿疎通）→ 成功後に Phase 2 パック対応
