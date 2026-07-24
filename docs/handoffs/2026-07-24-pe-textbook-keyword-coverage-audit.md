---
title: 総監標準テキスト→キーワード集2026 反映状況 完全監査（Phase 1）引き継ぎ
date: 2026-07-24
---

# 総監標準テキスト → キーワード集2026 反映状況 完全監査（Phase 1）

## 背景

総監標準テキスト5管理（`docs/textbook/技術士（総監）/テキスト/総監標準テキスト/`）の全概念が、公開ハブ `/docs/pe-comprehensive-management-keyword-2026` と個別キーワードページに過不足なく反映されているかを完全監査。予備監査（`docs/reviews/2026-07-24-pe-textbook-keyword-coverage-audit.md`）が「H3/H4 概念398・意味確認待ち217」を機械照合で出しており、これを **完全対応表（A〜G）** へ確定させるのが目的。実行計画は `.claude/plans/pe-textbook-keyword-coverage-remediation-2026-07-24.md`。**Phase 1 は分析・計画のみ**（記事本文・設定・公開・deploy は変更しない）。

## 作成した成果物

- `scripts/audit-pe-textbook-keyword-coverage.mjs` — 再監査スクリプト（read-only・決定的）。H2(構造)/H3・H4(概念)抽出、正規化・別名・包含候補、公開ページpool、ハブのリンク/補助語、リンク実在・phantom・重複・cross-area を出力。`npm run audit-pe-textbook-keyword-coverage`（package.json に追加）。
- `.claude/state/pe-textbook-keyword-coverage-candidates.json` — 機械層の候補データ（statusHint は末尾「?」＝暫定）。
- `.claude/state/pe-textbook-keyword-coverage.json` — **完全対応表**（全398概念に A〜G・matchedSlug・confidence・reason・recommendation・priority・needsPrimarySourceReview・conflict・parentReview）。
- `docs/reviews/pe-textbook-keyword-coverage-report.md` — 人間向けレポート（集計・D/E/F/G・B対応表・conflict・重複・phantom・ハブ漏れ・P0/P1・最初のバッチ）。
- （一回限り・`.tmp/`gitignore）`build-pe-cov-slices.mjs`（分野別Evaluator入力）、`merge-pe-cov.mjs`（5結果統合）、`patch-pe-cov.mjs`（親再検証オーバーライド）、`pe-cov-eval-*.json`/`pe-cov-result-*.json`。

## 抽出件数

- 概念候補 **398**（H3=143 / H4=255）＝経済性81・人的資源89・情報42・安全97・社会環境89。構造見出し(H2) 25 は別管理・398に含めない。
- ハブ: 個別リンク655・補助語125・page pool 726。**予備監査の398と管理別内訳に完全一致**。

## A〜G 件数（最終）

| | A | B | C | D | E | F | G | 計 |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| 全体 | 131 | 19 | 148 | 32 | 2 | 64 | 2 | 398 |
| 経済性 | 24 | 8 | 29 | 8 | 0 | 12 | 0 | 81 |
| 人的資源 | 34 | 2 | 31 | 3 | 0 | 19 | 0 | 89 |
| 情報 | 9 | 1 | 25 | 3 | 0 | 4 | 0 | 42 |
| 安全 | 38 | 2 | 31 | 8 | 1 | 17 | 0 | 97 |
| 社会環境 | 26 | 6 | 32 | 10 | 1 | 12 | 2 | 89 |

**予備の「意味確認待ち217」は大半が別名/内包/構造/法令細目で、真の未反映(E)は2件に収束**。A+B+C=298（説明先確定）。

## 実行コマンド

```bash
git branch --show-current   # feature/gsc-ga4-automation（既存の未コミットは他セッション作業→不可侵）
npm run audit-pe-textbook-keyword-coverage           # 機械層 candidates.json
node .tmp/build-pe-cov-slices.mjs                    # 分野別スライス
# 5管理分野 Evaluator（general-purpose, model:sonnet, audit-only）を並列起動
node .tmp/merge-pe-cov.mjs                            # 5結果→coverage.json
node .tmp/patch-pe-cov.mjs                            # 親再検証オーバーライド（現物Read根拠）
```

## 検証結果

- 決定性: `audit-*` を2回実行して出力バイト一致（inputsHash 同一）。
- 完全性: 全398に A〜G（未判定0）。不正status 0。A/B/C/D の matchedSlug は全て published 実在（検証0エラー）。E に「なぜ補強で足りないか」reason あり。G に needsPrimarySourceReview あり。
- リンク: phantom hub link 0（P0該当なし）。JSON構文OK・`git diff --check` OK。
- 親再検証: 社会環境の E 過大産出（21件）を現物ページ照合で20件訂正（`polluter-pays-principle`/`environmental-impact-assessment`/`iso-14000`/`climate-change-international` 等の見落とし）。安全の E も1件（製造業者等→D）。23件に `parentReview:true`。

## P0・P1 候補

- **P0**: なし（公開ハブの死リンク・誤slug誘導・非公開誘導ゼロ）。
- **P1**: 費用便益分析009（D・CBA独立節/独立ページ、CEAと別概念）、アカウンタビリティ195（D・到達性）、ハブ掲載漏れ4件（環境基本法/労務費率/テレワーク/人間関係管理）、registry phantom `bcp-crisis-management`（設定ドリフト）、省エネ技術338・除染361（C だが分量多く補強価値）。

## conflict

4件・いずれも判定一致（矛盾なし）: 警戒レベル（安全291/社会環境356＝両A）、ウォーターフォール053・アジャイル056（経済性⇔情報のwaterfall/agile＝C）。`conflictResolutions` に記録。

## 未解決事項（Phase 2 以降で判断）

- **記事本文の実装は未着手**（Phase 1 は分析のみ）。実装はユーザーの明示指示待ち。
- 重複 slug 登録9件の正規セクション寄せは要判断（意図的な分野横断重複が大半）。
- `keyword-relations.json` は他セッションの未コミット変更中。registry phantom の整理は所有権解消後。
- G 2件（エネルギー基本計画・環境基本計画）は**テキストが古くページが新しい**。実装時はページを旧版へ下げない（最新一次情報でページ側を維持）。
- Evaluator が付けた低confidence 61件は Phase 2 実装時に現物再確認（多くは D の内包充足度）。

## 次フェーズの開始方法

1. `.claude/state/pe-textbook-keyword-coverage.json` の `status:"D"`/`"E"` を優先度順に読む。
2. レポート §12 の推奨バッチ（社会環境補強→安全法令細目→経済性）を1管理分野ずつ 5〜15件で実装。
3. 各バッチ: 既存ページ補強 or 新規（E のみ）→ 独立 Evaluator 監査 → ハブ/pe-chapters/keyword-relations 同期 → `npm run refresh-indexes` → lint/リンク/ビルド → 対応表更新 → handoff。標準テキストは転載・出典掲出しない。
4. 再監査は `npm run audit-pe-textbook-keyword-coverage` で candidates を再生成し差分確認。
