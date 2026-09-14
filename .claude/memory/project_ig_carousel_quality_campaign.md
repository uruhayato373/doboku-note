---
name: project_ig_carousel_quality_campaign
description: Instagram 総監過去問パック R3-R7 5 年度完成・AIDesigner 新意匠化・summary 階層誘導
metadata: 
  node_type: memory
  type: project
  originSessionId: 94001d6d-7e86-40bf-a107-aa96f9743049
---

doboku-note IG の過去問パック整備プロジェクト。2026-05-27 で R3-R7 全 5 年度の素材完成。
試験 = 2026-07（5-6 週後）に間に合う状態。

## 完成済み（2026-05-27 時点）

- **42 パック × 3 形式 = 約 1,250 ファイル**
  - r03 (9 パック) / r04 (8) / r05 (7) / r06 (9) / r07 (9) ※問題分布の都合で不揃い
  - 各パック: `carousel/` (1080×1350 × 10) + `reels/` (1080×1920 × 10 + script.txt) + `stories/` (4 枚厳選)
  - 各年度: `_summary/` 年度目次カルーセル（cover + pack-list × 2 + cta、carousel + reels の 2 サイズ）

- **デザイン真実源**: `docs/design-system/instagram-carousel-tokens.json`
  - 単一 brand（#1858B5）+ semantic（green 正答 / coral 誤答 / navy CTA）。5管理別配色は廃止
  - フォント: Manrope (latin) + NotoSansJP (jp)
  - cover-title 統一文言「令和X年度 ／ 択一式 過去問 #N」（管理混在問題を回避）
  - 4 段階自動圧縮モード（normal/dense/compact/ultra）

- **スキル基盤**
  - `social/ig-post-create` — PNG 生成（`--exam <pack-id> --size carousel|reels|both`）
  - `social/ig-carousel-restyle` — トークン更新後の一括再生成
  - `social/ig-reel-create` — Reels 動画化（VOICEVOX + ffmpeg、`--script-only` で台本のみも可）
  - `.claude/scripts/instagram/build-stories.mjs` — reels から 4 枚厳選 → stories/img
  - `.tmp/build-summary-slide-data.mjs` + `.tmp/render-summary.mjs` — 年度目次カルーセル生成
  - `scripts/lint-exam-pack-structure.mjs` — E1/E2/W1 構造違反 lint

- **エージェント**
  - `ig-carousel-writer` — slide-data 執筆（並列実行で R3-R6 を 4 同時生成、約 10 分で完成）
  - `ig-carousel-qa` v2.0 — 第 6 軸「デザイン統一性」追加

## 残作業

1. **VOICEVOX + ffmpeg 環境準備**（ユーザー手動、Reels mp4 化に必要）
2. **IG 投稿運用**（試験まで R7 週 2-3 ペース、5 年度は 1 年以上のストック）
3. **doboku-note サイト内 中継 LP**（試験後の課題、`/exam/r07` で IG 投稿 URL + サイト解説 URL の二段構え）
4. **R3 pack-08/09 の妥当性レビュー**（agent が未収録問題を新規パック化したため）

## 3 階層誘導の確定方針

```
ストーリー（年度入口 1 枚: _summary/reels/img/00-cover.png）
   ↓ リンクスタンプ
年度目次カルーセル投稿（_summary/carousel/img/*.png 4 枚）
   ↓ プロフィール経由
個別パック投稿（pack-01〜09）
```

**Why:** IG ストーリーのリンクスタンプは 1 個までで、1 ストーリーから 9 パックに直接リンク不可。
目次カルーセル投稿を中継にすることで IG 内で完結する 3 階層を実現した。

**How to apply:** IG 過去問パック作業再開時は `docs/handoffs/_archive/2026-05-27-ig-exam-packs-r03-r07-complete.md`（2026-05-29 に archive 済）を先に読む。
`docs/reference/ig-carousel-skill.md`（運用 SoT）と `docs/design-system/instagram-carousel-tokens.json`（デザイン SoT）が真実源。
旧方針（5管理別配色・727 本キャンペーン・notebook-figure 型）は完全廃止済み。

## 2026-05-28 戦略 v7 への発展

このプロジェクト（過去問パック整備）の上に、SNS 戦略 v7/v7.1 へ大規模ピボット。
Instagram メイン化・YouTube 派生・新規エージェント 7 つ・ハイライト 6 種・title auto-fit を実装。
詳細は [[project_sns_v7_pivot]] を参照。Reels CTA は 3 フォーマット（Carousel/Reels/Stories）でモード分岐するようになった。

## 関連メモリ

- [[project_sns_v7_pivot]]（v7/v7.1 戦略ピボット、本プロジェクトの発展形）
- [[feedback_title_autofit]]（cover-title の不適切改行 auto-fit 対策）
- [[project_x_30days_campaign]]（同時並行で X カウントダウン稼働中）
