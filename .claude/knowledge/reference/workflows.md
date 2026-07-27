---
title: 推奨ワークフロー
---

# 推奨ワークフロー

週次運用・変換作業・キーワードページ作成・リスク評価など、日常的な作業の推奨手順集。

**いつ読むか**: 週次の計画・振り返り時、PDF→MDX 変換作業の着手前、キーワードページ作成・改訂時、リスク評価が必要になったとき。

---

## 週次運用

```
金曜:
1. 06:00 JST  fetch-metrics.yml（自動）<- GSC + GA4 取得
2. PM         /weekly-review          <- 実績を振り返る（進捗・コンテンツ品質・PSI 推移）
3. PM         /weekly-plan            <- 来週の計画を立てる（前週の申し送り・backlog から選定）
月曜:
4. 11:17 JST  weekly-review-guard.yml（自動）<- 先週分の *-review.md 欠落を赤落ちで検知
```

詳細は `.claude/skills/management/weekly-review/SKILL.md` と `.claude/skills/management/weekly-plan/SKILL.md` を参照。

**発火の信頼性（サイレント欠落の防止）**: 手順 2-3 は**クラウドルーティン**（正典 = `doboku-note weekly PDCA`・`/schedule` で作成）が金曜 PM に発火して回す。状態はクラウド側にしか無く repo からは見えないため、停止・無効・cron ズレで**発火しなくなっても気づけない**（実際 2026-W27/W28 の 2 週分が silent 欠落）。これを防ぐため `weekly-review-guard.yml`（`npm run check-weekly-review`＝`scripts/check-weekly-review.mjs`）が毎週月曜に「先週分の `docs/reviews/weekly/YYYY-Www-review.md` が生成済みか」を検査し、無ければ赤落ちさせる（生成はしない＝ルーティンの責務、ガードは欠落検知のみ）。赤落ち時は対話セッションで `/routines`（list-first）→ 無ければ `/schedule` 再作成、cron ズレなら `update`。ルーティン監査の真実源は [.claude/skills/management/routines/SKILL.md](../../skills/management/routines/SKILL.md)。

### 継続的改善ループ（計測→検知→対応→再計測）

```
┌─────────────────────────────────────────────────────────────────┐
│ 毎日（自動）                                                     │
│                                                                 │
│  psi-audit.yml (JST 02:00)                                      │
│    │ 代表 20 URL を mobile+desktop で計測                         │
│    ▼                                                            │
│  develop: .claude/state/metrics/psi/ に JSON 蓄積 [skip ci]     │
│    │                                                            │
│    ├─ しきい値違反あり ──► task-queue.json に append             │
│    │                        (dedupe_key で重複防止)              │
│    │                                                            │
│    └─ しきい値違反なし ──► 記録のみ（通知しない）                  │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ 週 1 回（金曜 06:00 JST）                                        │
│                                                                 │
│  fetch-metrics.yml (cron: 0 21 * * 4)                           │
│    │ GSC + GA4 を取得 → .claude/state/metrics/{gsc,ga4}/        │
│    ▼                                                            │
│  link-audit.yml (cron: 0 22 * * 4, 金曜 07:00 JST)              │
│    │ 内部リンク検証                                              │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ 週 1 回（金曜 PM、同日完結）                                     │
│                                                                 │
│  /weekly-review                                                 │
│    │ Agent C2: .claude/state/metrics/psi/ の 7 日分を読み         │
│    │            field(実害)→lab(診断)の順で前週比を出力          │
│    │ Agent E:  /distill-proofread-learnings を呼び出し           │
│    │            校正学習（新ルール・精緻化・嗜好等）を抽出        │
│    ▼                                                            │
│  docs/reviews/weekly/YYYY-Www-review.md                         │
│    │ PSI 推移 + 校正学習候補 + 申し送りを 1 本の md に統合         │
│                                                                 │
│  /weekly-plan                                                   │
│    │ 前週の申し送りを Must/Should に組込                          │
│    ▼                                                            │
│  docs/reviews/weekly/YYYY-Www.md（計画は別ファイル）              │
│    │ 対応タスクを計画として明示                                  │
│                                                                 │
│  ユーザーが校正学習候補を承認 → 適用                              │
│    │ content-principles.md / memory / workflows.md 等を更新      │
│    ▼                                                            │
│  次週以降の校正品質が底上げされる                                  │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ 実装（ユーザー or Claude Code）                                  │
│                                                                 │
│  週次レビューの申し送りを見ながら修正 → PR → main merge → 本番反映 │
│    │                                                            │
│    ▼                                                            │
│  翌日以降の psi-audit で効果を測定（※ scheduled workflow の       │
│  実行ブランチは workflow ごとに違う → measurement-incidents.md）  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ コンテンツ品質ループ（キーワード起点の品質サイクル）              │
│                                                                 │
│  /quality-cycle --profile cem --mode auto-loop [--max N]        │
│    │                                                            │
│    ├─ score:   cem-qa で全件 5 軸評価                            │
│    ├─ rewrite: weighted < 2.0 のページを keyword-rewriter でリライト │
│    ├─ verify:  cem-qa で再評価                                   │
│    └─ 全件 >= 2.0 になるまで最大 3 ラウンド自動反復              │
│                                                                 │
│  過去問⇔キーワード紐づけの確認は /audit-exam-mapping で随時実施  │
└─────────────────────────────────────────────────────────────────┘
```

**原則**（3 層モデル）:
- **Tier 3 機械可読データ** → `.claude/state/metrics/*.json`（develop に CI が直接 commit）
- **Tier 1 状態あり・アクション item** → `docs/todo/`（backlog / annual / monthly / weekly の 4 層）。**GitHub Issue は使わない**（CLAUDE.md §8・真実源 [information-architecture.md](information-architecture.md)）
- **Tier 2 固定的知識・設計** → `docs/project/*.md`, `.claude/knowledge/reference/*.md`
- 週次 PDCA は `docs/reviews/weekly/YYYY-Www-review.md`（レビュー）と `YYYY-Www.md`（計画）の 2 本に保存。最新週のみ保持し、旧週は未完タスクを `docs/todo/backlog.md` へ抽出してから削除（履歴は git）
- 申し送りは次週の計画へ引き継ぎ → 解消したら次の review で「完了」として記録

オンデマンド分析が必要な時は `/psi-audit` スキルで `performance-auditor` エージェントを呼び、`.claude/state/improvements/psi-{YYYY-MM-DD}.md` に詳細レポートを出す。

週次レビューでは **`npm run check-content-quality`**（モバイル可読性ラチェット）も回す。全 published MDX を `content-rules.json` の `fullScan` ルール（表/入れ子リスト/段落長/見出し/文体）で走査し、`.claude/state/quality/latest-report.md` に **GA4 人気度順の違反レポート**を出力する。レポート上位（違反数 × activeUsers）の記事を、記事の `category`/`group` に対応する既存の品質サイクル（`/quality-cycle --profile cem`／`civil-textbook` など。ルーティングの真実源は [exam-content-policy.md](exam-content-policy.md) Part 2）へ流してリライトし、表を非表へ・入れ子をフラットへ・長段落を改段する（変換パターンは [content-authoring.md](content-authoring.md)）。既存違反は baseline で grandfather 済みで、CI（`r2-audit.yml`）は **baseline 超過の新規違反のみ赤落ち**させる（機械＝検知、エージェント＝リライト時の表現判断、と役割を分ける）。リライトで違反が減ったら `npm run update-content-quality-baseline` で baseline を刈り込む。

週次レビューでは **`npm run audit-note-funnel`**（ソース D1-D4）も回し、note 導線のドリフト（公開記事の CTA 欠落・公開マガジンの L2 もくじ未収録・L2 の L1 未リンク）を surface する。**ライブ反映の検証（D5＝配線後に再投稿せず live が死ぬドリフト）は `npm run audit-note-funnel -- --live`（低速・月次/手動）、修復は `note-append-cta`**。意味的レビューは `/audit-note-funnel --semantic`（`note-funnel-auditor`）。真実源は [note-funnel-architecture.md](note-funnel-architecture.md)。

週次レビューでは **`npm run check-note-republish`**（公開記事の本文＋ハッシュタグの再公開ドリフト・creds不要）も回し、要再公開を surface する（本文drift→`note-update-body --commit`／タグdrift→`note-sync-tags --commit`）。**有料境界の構成監査は `node scripts/check-note-structure.mjs`（公開API依存・月次寄り）**で FULL_LOCK/漏洩/画像/価格を検出（真実源 [note-api-verification.md](note-api-verification.md)「有料境界のマガジン別 SSOT」）。ソース側の境界欠落は `npm run check-note-boundary`（pre-commit＋CI）が事前に止める。

転職アフィリの週次監視は **`/weekly-improve` の Phase 3.5**（`affiliate_cta_click` の by-label CTR・BuildJob 期限・EPC 布石）。**2026-09-01（= 8/31 15:00 UTC）に BuildJob ¥50,000 キャンペーンが終了し全 BuildJob 面が GKS へ自動復帰する（SSG・ビルド時刻確定）**。9 月最初の本番ビルド後の週次で、hub / サイドバー / 記事末 / 本文中間の BuildJob 面が消え GKS へ戻ったかを curl で 1 回検証する（未復帰なら creative 定数を手動 revert）。配置・期限の真実源は [affiliate-operations.md](../../../.claude/knowledge/reference/affiliate-operations.md)。

---

## PDF→MDX 変換フロー

```
1. PDF をスキル（/pdf-to-mdx, /pdf-to-mdx --exam civil-construction-1 等）で MDX に変換
2. /check-mdx で構文チェック
3. content-qa エージェントで品質評価（5軸ルーブリック、内部で /improve-article --mode verify を使用）
4. 改善・修正
5. /deploy で Cloudflare Pages に本番反映
```

試験別の整備方針・レビュー視点は [exam-content-policy.md](./exam-content-policy.md) を参照。

### 過去問 MDX の OCR エラー修正フロー

既存の過去問 MDX に OCR エラー（誤字・脱字・文字列破損）が疑われる場合、**原典 PDF と突合してから修正する**。推測で書き換えない。

```
1. 疑わしい箇所を特定（ユーザー指摘・Grep での異常パターン検出）
      ↓
2. 原典 PDF を特定
      docs/textbook/技術士（総監）/過去問/RXX/RXX_試験問題_択一式.pdf
      docs/textbook/技術士（建設部門）/...（部門別）
      ↓
3. PyMuPDF で該当ページをレンダリング（dpi 180 推奨）
      python -c "import fitz; doc=fitz.open(<pdf>); page=doc[<index>];
                 page.get_pixmap(dpi=180).save(<out>.png)"
      ↓
4. Read ツールで PNG を表示し、視覚的に原文と現状 MDX を突合
      疑わしい箇所 1 箇所だけでなく周辺もチェック（同じ設問で他の OCR エラーが潜むことが多い）
      ↓
5. 修正箇所を列挙してユーザーに承認
      ↓
6. Edit で修正 → pre-commit hook 通過確認 → コミット
      コミットメッセージに「PDF 原文と突合して修正」と明示
```

**過去事例**: R06 Ⅰ-1-38 で「第 3 次環境基本計画」の指摘から、原典 PDF 突合により「避守事項→遵守事項」「業務つけ→義務づけ」「選択肢 ④ の後半破損」など同設問内の 4 OCR エラーを同時発見した。

---

## キーワードページ作成・校正フロー

技術士総合技術監理（pe-comprehensive-management）のキーワードページは **Generator/Evaluator 分離原則** を厳守する。

```
1. /keyword-page create or revise              <- Generator: コンテンツ作成・校正
2. node .claude/scripts/lint-mdx-mobile.mjs <file>     <- 機械リンター（カテゴリ1・6・8・9）
                                                  HIGH/MEDIUM ゼロまで修正→再実行ループ
3. cem-qa エージェント呼び出し                 <- Evaluator: 5軸ルーブリック評価
4. 加重スコア ≥ 2.0 → 完了 / < 2.0 → 指摘事項に沿って修正して 2 に戻る
```

**重要**:
- ステップ 3 の `cem-qa` を**省略してはならない**（自己評価バイアス回避のため）
- 品質ルールの真実源は `.claude/knowledge/reference/content-principles.md`。ルール変更時はまずここを更新
- リンターのカテゴリ9（ExamPoint 個数・位置・誤り選択肢パターン・参考資料多様性）は HIGH なのでブロッカー

---

## コンテンツ変更後の静的インデックス再生成

MDX を作成・編集・削除した後、以下の静的 JSON インデックスが影響を受ける可能性がある。

| インデックス | トリガー | npm コマンド |
|---|---|---|
| `past-exam-backlinks.json` | `.claude/state/exam-keyword-map.json` 編集 | `npm run build-backlinks` |
| `exam-question-keywords.json` | 同上 | 同上 |
| `cross-exam-keywords.json` | frontmatter `exams` フィールド変更 | `npm run build-indexes` |
| `tag-dictionary.json` | frontmatter `tags` フィールド変更 | 同上 |

### 本番ビルド（自動）

`npm run build` に `refresh-indexes` が含まれているため、**本番デプロイ時は自動で全インデックスが最新化される**。実行忘れによるデプロイ事故は発生しない。

### 開発中（手動）

`npm run dev` ではインデックス再生成をスキップして高速起動する。コンテンツ変更後に開発環境で最新のインデックスが必要な場合:

```bash
npm run refresh-indexes   # 全 3 インデックスを一括再生成
```

### どのスキル実行後に必要か

以下のスキルでコンテンツを作成・変更した後は、開発中なら `npm run refresh-indexes` を実行すること:

- `/keyword-page` — キーワードページ作成・改訂
- `/exam-backlinks rebuild` — 過去問バックリンク再構築
- `/quality-cycle --mode rewrite` — キーワードページ一括リライト
- `/consolidate-duplicate-keyword` — 重複キーワード統合
- `/pdf-to-mdx`, `/pdf-to-mdx --exam civil-construction-1` — PDF→MDX 変換
- `/promote-to-site` — コンテンツ本番移行

**検索インデックス**（`public/search-index.json`）は `npm run build` 時に常に再生成されるため、手動管理不要。

---

## リスク評価

```
必要に応じて:
1. /critical-review        <- 重大なリスクを批判的に評価
2. /pre-mortem             <- 失敗シナリオをシミュレーション
```

---

## Phase 別ロードマップ

### Phase 1（現在: 試験対策 web サイト作成）

**スコープ**:
- 1級土木施工管理技士・技術士総合技術監理の MDX コンテンツ整備
- PDF→MDX 変換フロー
- Cloudflare Pages 本番運用
- 週次 PDCA（簡略版: weekly-review → weekly-plan のみ）

**Phase 1 で停止中のスキル・エージェント**:
- analytics 系スキル（GSC・GA4 データ取得、SEO 監査）
- strategy 系スキル（競合調査・キーワードギャップ分析）
- content-planner エージェント（Phase 2 待機）。SEO は gsc-index-auditor（coverage・月次 `/gsc-review`）+ metrics-analyzer（performance・週次 `/weekly-improve`）+ technical-seo-auditor（技術・build 後）+ search-intent-auditor（検索意図・最大20URL）に分割稼働中。4面を束ねるオーケストレータは `/seo-growth-review`（機械検出→意味評価→統合・修正なし）。技術ゲートは CI 常設（`check-seo-build:ci`）。旧 catch-all `seo-auditor` は 2026-06-19 退役・復活させない
- ads 系スキル（アフィリエイト・AdSense 最適化）

### Phase 2（2026年秋予定: note 記事展開・iOS アプリ開発）

**スコープ**:
- note.com 高単価記事の展開（v3 戦略）
- iOS アプリ（過去問演習）の開発着手
- YouTube チャンネル運用開始
- analytics・strategy・ads 系スキルを復活
- スキル汎用化（試験別設定の共通化。※旧 `/exam-guide` 構想は 2026-07-04 退役＝ガイドは `guide-rewriter`／`guide-qa` サイクルへ一本化）

### Phase 3（2027年以降: 他分野展開）

**スコープ**:
- 医師・弁護士など他分野資格への展開検討
- テンプレート駆動アプローチで対応
- `competitor-audit`, `discover-trends-civil`, `content-roadmap` スキル復活

---

**注**: 月次企画・四半期レビュー・試験シーズン対策・競合調査は Phase 2 で開始予定。現 Phase 1 では週次 PDCA と PDF→MDX 変換に集中する。
