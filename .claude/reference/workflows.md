# 推奨ワークフロー

週次運用・変換作業・キーワードページ作成・リスク評価など、日常的な作業の推奨手順集。

**いつ読むか**: 週次の計画・振り返り時、PDF→MDX 変換作業の着手前、キーワードページ作成・改訂時、リスク評価が必要になったとき。

---

## 週次運用

```
日曜〜月曜:
1. /weekly-review          <- 実績を振り返る（進捗・コンテンツ品質）
2. /weekly-plan            <- 来週の計画を立てる（PDF→MDX 変換・デプロイスケジュール）
```

詳細は `.claude/skills/management/weekly-review/SKILL.md` と `.claude/skills/management/weekly-plan/SKILL.md` を参照。

---

## PDF→MDX 変換フロー

```
1. PDF をスキル（/pdf-to-mdx, /civil-construction-1-pdf-to-mdx 等）で MDX に変換
2. /check-mdx で構文チェック
3. content-qa エージェントで品質評価（5軸ルーブリック、内部で /qa-pdf-mdx を使用）
4. 改善・修正
5. /deploy で Cloudflare Pages に本番反映
```

試験別の整備方針・レビュー視点は [exam-content-policy.md](./exam-content-policy.md) を参照。

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
- 品質ルールの真実源は `.claude/content-principles.md`。ルール変更時はまずここを更新
- リンターのカテゴリ9（ExamPoint 個数・位置・誤り選択肢パターン・参考資料多様性）は HIGH なのでブロッカー

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
- content-planner エージェント、seo-auditor エージェント
- ads 系スキル（アフィリエイト・AdSense 最適化）

### Phase 2（2026年秋予定: note 記事展開・iOS アプリ開発）

**スコープ**:
- note.com 高単価記事の展開（v3 戦略）
- iOS アプリ（過去問演習）の開発着手
- YouTube チャンネル運用開始
- analytics・strategy・ads 系スキルを復活
- スキル汎用化（`/exam-guide --exam {id}` 統合）

### Phase 3（2027年以降: 他分野展開）

**スコープ**:
- 医師・弁護士など他分野資格への展開検討
- テンプレート駆動アプローチで対応
- `competitor-audit`, `discover-trends-civil`, `content-roadmap` スキル復活

---

**注**: 月次企画・四半期レビュー・試験シーズン対策・競合調査は Phase 2 で開始予定。現 Phase 1 では週次 PDCA と PDF→MDX 変換に集中する。
