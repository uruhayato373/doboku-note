---
title: 2026-05-18 essay-mlit-* 7 記事 全面撤回セッション
date: 2026-05-18
session_focus: 「テーマ → ペルソナ → 模範解答」の本道学習フローに乗らない中間記事 7 本を全面削除、約 250 参照ポイントを全クリーンアップ
related_strategy: docs/note/noteコンテンツ計画.md
related_plan: ~/.claude/plans/eventual-swinging-key.md
---

# 2026-05-18 essay-mlit-* 撤回セッション 引き継ぎ

## 何が起きたか（1 行）

ユーザーの「テーマ → ペルソナ → 模範解答の本道フローに乗らない中間記事は不要」の指摘から、`essay-mlit-*` 7 記事（aging-infrastructure / construction-2024 / foreign-workers / green-transformation / i-construction-2 / infrastructure-group-mgmt / river-basin-management）を完全削除。サイト内約 250 参照ポイントとコード配線、note マガジン参照、計画書記載を全面クリーンアップ。

## 撤回の根拠（4 点）

### 1. 学習導線の本道フローに乗らない中間記事

理想フロー: **テーマ抽出（r8-forecast）→ ペルソナ確定（pattern-essay-*）→ 模範解答参照（r0X-essay-*）**

essay-mlit-* はテーマ → （中間: テーマ × 5 管理トレードオフ） → ペルソナの中間で止まり、模範解答に到達するには pattern-essay-* / r0X-essay-* を別経路で参照する必要がある。読者の学習動線を分断する中間ノード。

### 2. 機能の完全重複

- **mlit-whitepaper-2025** が「白書 R7 × 16 ペア完全攻略」でテーマ × 5 管理を体系的にカバー（より深い分析、より広いペア網羅）
- **r8-essay-keyword-forecast** が「R8 候補テーマ 6 本」でテーマ予測機能をカバー（前 turn 確認: 5-6 テーマが essay-mlit-* と重複）

→ 7 記事 × 約 3,500 字 = 約 25,000 字 が他 2 記事と機能重複しており、SEO cannibalization リスク

### 3. broken-slug 検出済み

link-audit で river-basin-management / construction-2024 の 2 件が既に broken-slug 検出。記事間整合性が劣化傾向で、保守コストが上昇していた。

### 4. テーマ別深掘り SEO の弱さ

essay-mlit-* は「テーマ × 5 管理 × 過去問適用」の独自フレームだが、検索キーワードとしての需要が薄く（「インフラ老朽化 総監」「2024 年問題 総監」等）、固有検索流入は限定的と推測される。GSC 流入データは未確認だが、構造的に検索意図と一致度が低い。

## 撤回した結果のサイト構造

| タイプ | 残った記事 | 役割 |
|---|---|---|
| テーマ抽出 | `r8-essay-keyword-forecast` | R8 候補 6 テーマの俯瞰 |
| 白書根拠 | `mlit-whitepaper-2025` | 白書 R7 × 16 ペアトレードオフ完全攻略 |
| 5 管理体系 | `management-tradeoffs` | 10 ペア × 解決フレーム 5 選 |
| 学習計画 | `whitepaper-study-map` | 28 白書 × 5 管理マッピング |
| ペルソナ | `pattern-essay-*` 4 本 | 4 ペルソナ × 論点プロファイル |
| 模範解答 | `r0X-essay-*` 16 本 | 年度 × ペルソナ × 具体論文 |

「テーマ → ペルソナ → 模範解答」のフローが essay-mlit-* なしで完結。

## 本セッションで実施した作業（5 commit 構成予定）

### G1: 計画書 + handoff（本 commit）
- `docs/note/noteコンテンツ計画.md`: L228 essay-mlit-* との双方向接続戦略削除、L294 M2 元データを白書原典のみに変更、L319 M3 元データから essay-mlit-* 削除、変更履歴に撤回ノート追記
- `.claude/state/task-queue.json`: T-016 notes に撤回ノート追加
- `docs/handoffs/2026-05-18-essay-mlit-withdrawal.md`: 本ファイル新規作成

### G2: サイト MDX bulk クリーンアップ + 7 記事削除
- bulk スクリプト（.tmp/strip-essay-mlit.mjs 想定）で 110+ MDX ファイルから essay-mlit-* リンクを一括削除
- ハブ 3 本（mlit-whitepaper-2025 / management-tradeoffs / r8-essay-keyword-forecast）は特別処理（「## テーマ別深掘り」セクション全体削除 等）
- git rm -r で 7 ディレクトリ削除
- npm run refresh-indexes で src/config/*.json 自動掃除

### G3: src/lib 配線解除
- src/lib/magazine-placement.ts から matchMlitTheme() 関数と 7 case マッピング削除
- npm run type-check 通過確認

### G4: note マガジン参照削除
- whitepaper-r7-strategy: 各テーマ章末 7 リンク削除
- r8-essay-forecast / essay-template-3d / リード磁石 2 本: 個別参照削除

### G5: 検証
- grep -r で 0 マッチ確認
- 7 slug 全 HTTP 404 確認
- npm run build 通過
- lint clean

## 検証チェックリスト

- [ ] G1: 計画書 + handoff commit
- [ ] G2: bulk クリーンアップ + 7 記事削除 + refresh-indexes commit
- [ ] G3: src/lib commit + type-check pass
- [ ] G4: note マガジン commit
- [ ] G5: 検証完了（grep / 404 / build / lint）

## 残作業 / 注意事項

- **GSC 流入監視**: 削除後の 7 slug は GSC で 404 検出される。3-6 ヶ月の流入観察を推奨
- **r8-essay-keyword-forecast の各テーマブロック**: 「**サイト深掘り**」リンク 6 個が essay-mlit-* に向いていた。これらを mlit-whitepaper-2025 の該当ペアセクションへの SeeAlso に置換するかは別判断（本セッションでは単純削除）
- **mlit-whitepaper-2025 の「## テーマ別深掘り」セクション**: 前 commit `e759c8560` で構造化したが、essay-mlit-* 7 件を全削除するため本セクション自体も削除
- **management-tradeoffs の「## テーマ別深掘り（R8 再出題可能性高）」セクション**: 同様に削除

## 学び

| 観点 | 内容 |
|---|---|
| 中間記事の判別 | 「テーマ → ペルソナ → 模範解答」のような学習導線フローを明確に定義し、フローに乗らない記事は中間ノードとして冗長性を疑う |
| 機能カバー判定 | 「他記事で機能が完全カバーされているか」を SEO・コンテンツ・学習導線の 3 軸で評価 |
| 撤回判断の根拠 | broken-slug 検出 / 重複コンテンツ / SEO cannibalization / 検索意図との一致度低を組み合わせて判断 |
| 撤回作業の標準化 | M1 撤回（commit `769d0dccf`〜`35c6561f2`）と同じパターン（計画書 → サイト削除 → コード配線 → note マガジン → 検証）で再利用可能 |
