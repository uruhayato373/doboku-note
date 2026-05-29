---
title: 2026-05-18 mlit-whitepaper-2025 撤去セッション
date: 2026-05-18
session_focus: サイト mlit-whitepaper-2025 を撤去し M2 magazine との完全分業構造を確立、Red Line #7「サイト = 思考フレーム、note = 具体数字 × ペルソナ展開」新設
related_strategy: docs/note/noteコンテンツ計画.md
related_plan: ~/.claude/plans/eventual-swinging-key.md
---

# 2026-05-18 mlit-whitepaper-2025 撤去セッション 引き継ぎ

## 何が起きたか（1 行）

サイト `mlit-whitepaper-2025`（白書 R7 × 16 ペア完全攻略、約 21,600 字）を完全削除し、思考フレーム部分を `management-tradeoffs` に集約、白書 R7 の具体数字 × 16 ペア × 4 ペルソナ深掘りは note M2 マガジン（whitepaper-r7-strategy、¥2,480、完成済）独占に分業。Red Line #7「サイト = 思考フレーム、note = 具体数字 × ペルソナ展開」を新設して構造的に再発防止。

## 撤去の根拠（4 点）

### 1. M2 マガジンと完全重複

M2 magazine `whitepaper-r7-strategy`（33,925 字、完成済）と mlit-whitepaper-2025（21,608 字）は両方とも「白書 R7 × 5 管理トレードオフ」を扱う構造で、無料公開されている限り M2 購入動機が弱い（Red Line #5「重複コンテンツ禁止」違反リスク）。

### 2. management-tradeoffs が既に思考フレームの中心

management-tradeoffs（14,404 字）は既に:
- 解決フレーム 5 選（ALARP / リスクベース判断 / LCA / 段階的実施 / 合意形成）
- 頻出 6 ペアの深掘り
- 10 ペア俯瞰マトリクス
- 論文テンプレート
- 管理内トレードオフ（QCD / CIA / 作業安全×第三者安全）

を持っており、mlit-whitepaper-2025 の思考フレーム部分は重複保持の状態だった。

### 3. essay-mlit-* 撤回と論理整合

前 commit 群（`c066c1b51`〜`30c7e8720`）で essay-mlit-* 7 記事を撤回した論理（「中間記事 / 重複ハブの撤去」原則）が mlit-whitepaper-2025 にも適用可能。「ハブ → 深掘り 7 記事」が「ハブ → 中間ハブ」になり、最終的に「単一ハブ」に簡素化される自然な収束。

### 4. 保守コスト低下

白書 R8 が公開された際に mlit-whitepaper-2025 と M2 magazine の **両方** を更新する必要があった現状から、M2 のみ更新で済む構造に簡素化。

## 撤去後の役割分担

| 層 | 担当 | 役割 |
|---|---|---|
| **思考フレーム（抽象）** | サイト `management-tradeoffs` | ALARP / RBM / LCA / ミティゲーション階層 等の汎用フレーム + 頻出ペア深掘り |
| **具体数字 × ペルソナ展開** | note M2 magazine（¥2,480） | 白書 R7 の具体数字 × 16 ペア × 4 ペルソナアレンジ |
| **テーマ俯瞰** | サイト `r8-essay-keyword-forecast` | R8 候補 6 テーマ |
| **学習計画** | サイト `whitepaper-study-map` | 28 白書 × 5 管理マッピング |

これで「サイト = 抽象、note = 具体」というクリーンな分業構造が確立。Red Line #5 / #6 / #7 の三層で保護される設計。

## 本セッションで実施した作業（3 commit 構成）

### H1: 計画書 + Red Line #7 + handoff（本 commit）
- `docs/note/noteコンテンツ計画.md`: Red Line #7 追加、変更履歴に撤回ノート追記、L233 周辺の「mlit-whitepaper-2025 を M2 前段リファレンス」を「management-tradeoffs を M2 前段リファレンス」に書き換え、M2 / M3 セクションの元データ記述も更新
- `.claude/state/task-queue.json`: T-016 notes に撤回ノート追加
- `docs/handoffs/2026-05-18-mlit-whitepaper-withdrawal.md`: 本ファイル新規作成

### H2: mlit-whitepaper-2025 削除 + management-tradeoffs 補強 + 3 サイト MDX リンク張替え
- `git rm -r .local/r2/posts/pe-comprehensive-management/mlit-whitepaper-2025/`
- management-tradeoffs.mdx に「論文締めの定型 — 残余リスクと監視」セクション追加、「論文テンプレート」セクションに 4 部構造（対立構造 → 評価軸 → 解決フレーム → 残余リスク）テンプレ追記、末尾「次のステップ」に M2 強誘導 CTA 追加
- last-minute-2026 / r8-essay-keyword-forecast / whitepaper-study-map から mlit-whitepaper-2025 リンクを management-tradeoffs に張替え
- `npm run refresh-indexes` で src/config/*.json 自動掃除

### H3: src/lib/magazine-placement.ts から matchMlitHub 削除
- `matchMlitHub()` 関数（前回 essay-mlit-* 撤回時に追加した mlit-whitepaper-2025 単独対応関数）を削除
- placement 解決ロジックで `matchMlitHub` 呼び出しブロックも削除
- `npm run type-check` 通過確認

## 検証チェックリスト

- [ ] H1: 計画書 + handoff commit
- [ ] H2: 削除 + 補強 + 張替え + refresh-indexes commit
- [ ] H3: src/lib commit + type-check pass
- [ ] grep -rn "mlit-whitepaper-2025" → 撤回ノート / 撤回済みコメントのみ残存
- [ ] HTTP 404 確認: /docs/pe-comprehensive-management-mlit-whitepaper-2025
- [ ] HTTP 200 確認: management-tradeoffs / last-minute-2026 / r8-essay-keyword-forecast / whitepaper-study-map
- [ ] management-tradeoffs に「残余リスクと監視」「次のステップ」がレンダリングされている

## 残作業 / 注意事項

- **M2 magazine 公開タイミング**: M2 公開予定は W4（2026-06-08〜14）。サイト撤去から M2 公開まで約 3 週間のギャップ。management-tradeoffs が代替として機能する設計
- **301 リダイレクト相当**: サイト内リンクは management-tradeoffs に張替えるため、Google からの旧 URL 404 ディスカバリーは数日〜数週間で収束
- **GSC 流入監視**: mlit-whitepaper-2025 の旧 URL は 404 になるため、GSC で確認し management-tradeoffs に流入が移動しているか観察推奨

## 学び（Red Line #7 化の動機）

| 観点 | 内容 |
|---|---|
| 構造問題 | サイト無料 vs note 有料の境界が曖昧だと、サイト記事に白書数字を入れすぎて note 購入動機を毀損する、または note マガジンに抽象論を入れすぎてサイトと重複する、の双方向で失敗する |
| 境界の明確化 | 「抽象 = サイト無料」「具体 = note 有料」という抽象度の差で境界を引くと、執筆時に「どちらに書くべきか」が機械的に判別できる |
| 売れるもの | サイト無料: 思考プロセス・汎用フレーム・10 ペア俯瞰 / note 有料: 白書 R7 の具体数字・4 ペルソナアレンジ・採点ポイント |
| 適用パターン | M2（白書）以外の M3（R8 予想）/ M4（解答テンプレ 3D）/ M5-M8（模範論文）にも同ルールを適用可能 |

この境界線を Red Line #7 として明文化したことで、今後の note 商品設計時に同種の境界不明確を構造的に防止できる。
