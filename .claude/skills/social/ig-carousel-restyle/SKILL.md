---
name: ig-carousel-restyle
description: 新意匠/tokens 更新後に Instagram 過去問パック PNG を 3 フォーマット (Carousel/Reels/Stories) へ**既存パックの一括再生成**をするスキル。--pack/--year/--all で範囲指定。内部で bulk-generate-exam-packs.mjs + build-stories.mjs を呼び出し、生成後にトークン整合性を簡易検証する。使い分け＝新規パック生成は ig-post-create、site figure SVG 変換は ig-figure-pack。
allowed-tools: Bash, Read
---

# IG Carousel Restyle スキル（3 フォーマット対応）

`.claude/knowledge/design-system/instagram-carousel-tokens.json` または `quiz-slides.mjs` を変更した後に、既存 `cem/exam-packs/**` の PNG を **3 フォーマット（Carousel + Reels + Stories）すべてで統一再生成**するためのラッパー。

## いつ使うか

- tokens.json の色・フォントサイズ・余白を変更したとき
- tokens.json の `slides.cover.*Text*`（swipeText / swipeTextReels / swipeTextStories）を変更したとき
- `quiz-slides.mjs` の構造を変更したとき
- AIDesigner プロト等から新意匠を取り入れたとき
- Manrope / NotoSansJP の weight を増減したとき

## 重要: 3 フォーマット同時再生成の必須性

cover の swipeText 系トークンや `quiz-slides.mjs` の `buildQuizCover` 内のロジックを変えた場合、**Carousel / Reels / Stories の 3 フォーマットすべてで PNG が変わる可能性**がある。1 フォーマットだけ再生成すると他フォーマットに古い PNG が残り、リリース時に不整合バグになる（v7 Phase B/C で実際に発生したインシデント）。

本スキルは規定で 3 フォーマット連続実行する。Carousel だけ・Reels だけの部分再生成は **オプション** であり既定ではない。

## ig-post-create との違い

| スキル | スコープ | トリガー |
|---|---|---|
| `ig-post-create` | 単一パック or 単独 KW の生成 | 個別追加・修正時 |
| `ig-carousel-restyle` | 既存 N パックの一括再生成 | デザイン真実源を変更したとき |

## 入力

| パラメータ | 説明 | 例 |
|---|---|---|
| `--pack <id>` | 1 パックのみ再生成 | `--pack r07-pack-01` |
| `--year <year>` | 1 年度の全パック再生成 | `--year r07` |
| `--all` | 全年度全パック（H21〜R7、~130 パック）。実行確認あり | `--all` |
| `--dry-run` | 対象パック一覧のみ表示 | `--dry-run` |

`--pack` / `--year` / `--all` は排他。指定なしはエラー。

## 進め方

1. tokens.json の JSON 妥当性を確認:
   ```bash
   node -e "JSON.parse(require('fs').readFileSync('.claude/knowledge/design-system/instagram-carousel-tokens.json'))" && echo OK
   ```
2. 範囲を決定（変数 RANGE）:
   - `--pack r07-pack-01` → RANGE=`--only r07-pack-01`
   - `--year r07` → RANGE=`--year r07`
   - `--all` → ユーザーに「全 42 パック × 3 フォーマット = 約 1,260 枚を再生成します。続行しますか？」と確認後 RANGE=`--all`
3. **3 フォーマット連続実行**（必須順序）:
   ```bash
   # ステップ A: Carousel (1080×1350)
   node scripts/bulk-generate-exam-packs.mjs $RANGE --size carousel --skip-caption --skip-lint
   # ステップ B: Reels (1080×1920)
   node scripts/bulk-generate-exam-packs.mjs $RANGE --size reels --skip-caption --skip-lint
   # ステップ C: Stories (1080×1920、cover のみ独立生成 + 他 3 枚は Reels コピー)
   for d in <対象 pack-dir 群>; do
     node .claude/scripts/instagram/build-stories.mjs "$d"
   done
   ```
   Stories は Reels の slide-NN.mp4 / PNG に依存するため **必ず Reels の後**。
4. 実行後、3 フォーマットの cover を 1 枚ずつ Read で表示し、文言が tokens 準拠かを確認:
   - Carousel `carousel/img/00-cover.png`: chip 文言 = tokens.json `slides.cover.swipeText`
   - Reels `reels/img/00-cover.png`: chip 文言 = tokens.json `slides.cover.swipeTextReels`
   - Stories `stories/img/01-cover.png`: chip 文言 = tokens.json `slides.cover.swipeTextStories`
   - 共通: cover-big-q "Q"・footer brand 色（`#1858B5`）
5. 不整合があれば指摘事項を返す（修正はしない）。
6. ユーザーが OK したら `git status` で差分を提示。commit は別途。

## 出力

```
=== ig-carousel-restyle ===
範囲    : --year r07 (9 パック)
JSON妥当: OK
生成    : 9/9 成功
所要時間: 38.4 秒
PNG総数 : 90 枚 (9 × 10)
検証    : cover/cta スポットチェック OK
差分    : 90 ファイル変更
```

## 担当外

- **slide-data.json の編集** → `ig-carousel-writer`
- **tokens.json の編集** → design-system 担当（人手）
- **品質採点** → `ig-carousel-qa`
- **新規パック作成** → `scripts/generate-exam-pack-dirs.mjs`
- **A シリーズ（運営者作問）の再生成** → `.claude/scripts/sns/render-quiz-pack.mjs`（本スキル対象外）

## 注意

- `git add -A` 禁止（CLAUDE.md §3）。差分提示時は明示的に `{exam}/exam-packs/**/carousel/img/*.png` のみを示す。
- `--all` 実行は数分以上かかる。バックグラウンド実行を検討（run_in_background）。
- Manrope / NotoSansJP の woff は `node_modules/@fontsource/` 配下から読まれるので、`npm install --legacy-peer-deps` 済みであることを前提とする。
