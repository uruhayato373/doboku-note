---
name: note-5-2026-05-17
description: 試験前ピーク (6-7 月) に向けた note 有料マガジン 5 シリーズの企画＋本文ドラフト一括完成
metadata: 
  node_type: memory
  type: project
  originSessionId: 69ca72e4-67ba-4530-a605-5691cc8a57c3
---

2026-05-17 セッション後半で実施した note 記述式マガジンの企画＋ドラフト一括作成。Plan ファイル: `/Users/minamidaisuke/.claude/plans/clever-purring-bachman.md`

## 完成した 5 シリーズ

### Series 1: データ駆動受験戦略 (¥1,480)
- 場所: `docs/note/magazines/data-driven-strategy/article.md`
- 11,862 字 / 5 章 / 内部リンク 8
- 独自データ essay-data-2026 + primary-statistics-2026 を再構成
- 試し読み: 第 1 章 + 第 2 章 Top 4 まで無料

### Series 2: 4 ペルソナ模範論文 (¥1,480-1,980 × 4)
- 場所: `docs/note/magazines/総監模範論文-{ペルソナ}/` (既存)
- 公開ガイド: `docs/note/magazines/SERIES2-PUBLICATION-PLAN.md`
- 18 記事（ゼネコン 5 + 河川コンサル 5 + 環境調査 5 + 道路発注者 3）
- ユーザー手動投稿フロー 4-6h

### Series 3: 国土交通白書 R7 完全対応集 (¥2,480)
- 場所: `docs/note/magazines/whitepaper-r7-strategy/article.md`
- 33,630 字 / 8 章 / ワークシート 86 問 / 内部リンク 8
- R08 再出題確率根拠 + 過去問適用パスポート
- 4 並列サブエージェント (sonnet) で執筆 + 私が第 1 章追加 + マージ

### Series 4: 解答テンプレ集 3D マトリクス (¥2,980)
- 場所: `docs/note/magazines/essay-template-3d/article.md`
- 51,316 字 / 6 章 + 付録 / 内部リンク 7
- 20 テーマ × 5 管理 × 4 ペルソナ + トレードオフ 16 ペア + 三層構造手順
- 4 並列サブエージェント + 私が付録 CTA 追加

### Series 5: R8 予想問題集 (¥2,480)
- 場所: `docs/note/magazines/r8-essay-forecast/article.md`
- 14,661 字 / 5 章 + 終章 / 内部リンク 6
- R8 予想 3 大テーマ（資源循環×サプライチェーン 8.5/10・気候変動適応×グリーンインフラ 8.0/10・少子高齢化深化 7.5/10）
- 三層構造テンプレ + 5 大トレードオフ型 (経×人 / 情×人 / 情×経 / 効率化×安全 / 経×社)
- 4 ペルソナ別アレンジ + 試験当日 30 分骨子組立フロー + 2 ヶ月前逆算スケジュール
- ユーザー貼付素材（R5 SWOT 例・R8 3 シナリオ・三層構造抽象化）を再構成

## QA ラウンド結果

- Red Line（模範解答禁止）: 全シリーズで宣言文以外検出ゼロ
- HTML: ゼロ（note 非対応制約準拠）
- 絵文字: note 許容範囲（✅/❌/⚠️/🆓/💰/📌）のみ
- 内部リンク: 全シリーズで 7-8 箇所
- 文字数: 全シリーズで目標達成（特に Series 4 は当初目標 25-30k → 51k と大幅充実）

## ファクトチェック＋図版追加ラウンド (2026-05-17 後半)

全 23 記事に note-fact-checker (sonnet × 8 並列) を適用 + 5 マガジンに合計 12 図版（SVG+PNG）を追加。

### 検出と修正
- **道路発注者 R07**: マガジン告知が「5年¥1,980」だったのを実態「3年¥1,200」に修正
- **道路発注者 R05/R06**: 立場を「道路維持課 課長補佐」に統一、末尾「R06（DX 化）」→「R06（CN 化）」
- **環境調査 R04**: 外部サイト名「ガチンコ技術士学園」削除（Red Line）
- **SERIES2-PUBLICATION-PLAN.md**: 役職整合（河川コンサル GL→部長、環境調査 課長→部長）
- **data-driven**: 「Top 20 合計 217 回 / 約 47%」に再計算、「637 KW」表記統一
- **whitepaper-r7**: ワークシート「80 問」→「70 問」、見出し「10 年検証」→「9 年検証」、表記揺れ修正
- **r8-essay-forecast**: 外国人材数 18.1 万人表記統一
- **essay-template-3d**: 付録タイムテーブル合計 190→210 分に再設計、ゼネコン「4 割超」→「3 割超」

### 追加した図版（4 マガジン × 3 枚 = 12 図版）
- `scripts/render-figure-{data-driven|whitepaper-r7|r8-forecast|template-3d}.mjs` 新設
- 1200px キャンバス、フォント ≥22px、sharp で SVG→PNG 一括変換
- 既存 `render-figure-safety-management.mjs` をテンプレに踏襲

### commits
- 0c283629b: ペルソナ記事＋PLAN ファクト修正
- 679a57376: data-driven 図版＋修正
- d569ac0a7: whitepaper-r7 図版＋修正
- 31484331d: r8-essay-forecast 図版＋修正
- 1847d7d38: essay-template-3d 図版＋修正

## 試験期 (6-7 月) 月収予想

| Series | 想定 | 月収 |
|---|---:|---:|
| Series 1 (¥1,480) | 30-50 件 | ¥45-74k |
| Series 2 (¥1,480-1,980 × 4) | 各 10-20 件 | ¥80-160k |
| Series 3 (¥2,480) | 15-30 件 | ¥37-74k |
| Series 4 (¥2,980) | 10-20 件 | ¥30-60k |
| Series 5 (¥2,480) | 20-40 件 | ¥50-99k |
| **合計** | — | **¥242-467k/月** |

## ユーザー手動作業（次セッション以降）

1. note.com で 8 マガジン作成 (新規 4 + 既存 4 ペルソナ)
2. 各 article.md を note.com にコピペ投稿 + 価格設定 + 公開
3. noteUrl 8 つを連絡
4. 私が `src/lib/note-magazines.ts` 反映 + `/deploy`
5. CTA 配置検証（35+ 配置先で MagazineInlineCard 発火確認）

## 制作工数（本セッション）

- Series 1: 私が直接執筆、約 1 時間
- Series 3: 4 並列サブエージェント、約 30 分
- Series 4: 4 並列サブエージェント、約 15 分
- Series 5: 私が直接執筆（ユーザー貼付素材ベース）、約 30 分
- 全 QA + CTA 追加 + commit: 約 30 分
- 合計: **3-4 時間で 5 シリーズ 110k 字達成**

**Why**: ユーザー指示「note で記述式マガジンを販売したい、企画はできる？」→ 「ドラフトも作って、品質向上も」
**How to apply**: 試験前ピーク (6-7 月) 商機に間に合わせる 6 週間プラン。Series 1 を W2 (5/25-) で先行公開、Series 2 段階公開、Series 3/4 で 6 月後半パッケージ充実
