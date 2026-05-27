---
name: ig-carousel-restyle
description: 新意匠/tokens 更新後に Instagram 過去問パック PNG を統一再生成するスキル。--pack/--year/--all で範囲指定。内部で bulk-generate-exam-packs.mjs を呼び出し、生成後にトークン整合性を簡易検証する。
allowed-tools: Bash, Read
---

# IG Carousel Restyle スキル

`docs/design-system/instagram-carousel-tokens.json` を変更した後に、既存 `_exam-packs/**` の PNG を新意匠で **統一再生成**するためのラッパー。

## いつ使うか

- tokens.json の色・フォントサイズ・余白を変更したとき
- `quiz-slides.mjs` の構造を変更したとき
- AIDesigner プロト等から新意匠を取り入れたとき
- Manrope / NotoSansJP の weight を増減したとき

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
   node -e "JSON.parse(require('fs').readFileSync('docs/design-system/instagram-carousel-tokens.json'))" && echo OK
   ```
2. 範囲を決定:
   - `--pack r07-pack-01` → `scripts/bulk-generate-exam-packs.mjs --only r07-pack-01`
   - `--year r07` → `scripts/bulk-generate-exam-packs.mjs --year r07`
   - `--all` → ユーザーに「全 130 パック × 10 枚 = 1,300 枚を再生成します。続行しますか？」と確認後 `scripts/bulk-generate-exam-packs.mjs --all`
3. 実行後、各パックの `carousel/img/00-cover.png` を 1 枚ずつ Read で表示し、tokens 準拠を確認:
   - 表紙が白背景（`#FFFFFF`）+ 巨大「経済性管理」相当のタイトル + cover-big-q "Q"
   - footer の「doboku-note」が brand 色（`#1858B5`）
4. 不整合があれば指摘事項を返す（修正はしない）。
5. ユーザーが OK したら `git status` で差分を提示。commit は別途。

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

- `git add -A` 禁止（CLAUDE.md §3）。差分提示時は明示的に `_exam-packs/**/carousel/img/*.png` のみを示す。
- `--all` 実行は数分以上かかる。バックグラウンド実行を検討（run_in_background）。
- Manrope / NotoSansJP の woff は `node_modules/@fontsource/` 配下から読まれるので、`npm install --legacy-peer-deps` 済みであることを前提とする。
