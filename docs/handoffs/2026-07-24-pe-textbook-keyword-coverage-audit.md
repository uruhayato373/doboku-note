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

## Phase 2 実装（2026-07-24 同日・ユーザー指示「記事本文の修正・新規作成・公開」）

ユーザー決定: 全バックログ一括／CBA=独立ページ新規／チェックリスト=既存手法ページへ統合。

- **新規2ページ**（published:true・OGP生成済・pe-chapters登録済・cem-qa 両方 **2.90/3.00 合格**）: `landscape-act`（景観法・6.2・E-362）／`cost-benefit-analysis`（費用便益分析・2.1・D-009。CEA と SeeAlso/RelatedKeywords 相互リンク・NPV/割引率にも逆リンク）。
- **補強17箇所/15ページ**: EIA自治体条例H2・esd促進法・eco-labelグリーン購入法・env-comm条文・info-disclosure環境アカ／安衛法（特定機械等+受動喫煙68条の2+特別改善計画78条）・PL法製造業者等3類型・risk-assessmentチェックリスト法（E-297統合）／work-planning手順計画目的・linear-programming最適化位置づけ／servant-leadership 3手法・高年法8条・job-type複線型・descriptive-statistics平滑化指数化。
- **現物確認で既に十分（編集不要）14件**: 002/003/015/040/219/252/259/260/343/347/348/378/379/195 → verified-covered として D→C。**Plan探索の重要発見＝Evaluator 低confidence の D は半分近くが既カバーだった**。
- **G 2件解決**: energy=第7次エネ基明記・environmental-basic-plan=第六次を主題化（ページが現行版・旧版へ戻さない）→ C/A。
- **ハブ配線**: 原文既存語のリンク化のみ4件（テレワーク/人間関係管理/ナレッジマネジメント→knowledge-sharing/環境基本法）。links 655→658。労務費率・景観法・CBAは**原文に語なし＝追記せず**（pe-chapters登録でナビ到達）。coverage JSON `hubWiring` に記録。
- **法令照合**: 景観法416AC0000000110・環境教育等促進法415AC1000000130・グリーン購入法**412AC1000000100（議員立法=AC1。閣法と推測すると誤る）**・PL法406AC0000000085 を WebSearch/WebFetch で検証してからリンク。
- **インデックス**: refresh-indexes は使わず安全サブセット（build-backlinks/build-indexes/build-pillar-exam-questions/build-popular-pages）。`build-keyword-relations` は**他セッションが keyword-relations.json 未コミット編集中のためスキップ**（下記残課題）。
- **最終分布**: A=134 / B=19 / C=181 / **D=0 / E=0** / F=64 / **G=0**（検証0エラー・phase2 36項目に action/commit 記録）。
- **実装 commit**: `5e6de564b9`（社会環境）→`a7f3073009`（安全）→`c0013fcc14`（経済性）→`318a6b4c80`（人的・情報）→ バッチ5（配線・本 handoff 更新）。

## 未解決事項（Phase 3 以降）

- **keyword-relations 同期の保留**: 新規2 slug の関連語自動生成（`npm run build-keyword-relations`）は、他セッションの keyword-relations.json 未コミット変更が解消してから実行（backlog 登録済み）。ページ内の手動 RelatedKeywords は完備なので利用者影響は軽微。
- **deploy は別指示**: commit/PR まで。サイト実公開は `/deploy`（develop→main）でユーザー判断。R2 の OGP 同期は main push 時に CI が実施。
- 重複 slug 登録9件の正規セクション寄せは引き続き要判断（意図的な分野横断重複が大半）。
- registry phantom `bcp-crisis-management` の整理も keyword-relations 所有権解消後。

## 再監査の回し方

`npm run audit-pe-textbook-keyword-coverage` で candidates を再生成し差分確認（Phase 2 後の再実行で新規2ページが A? 検出・phantom 0 を確認済み）。
