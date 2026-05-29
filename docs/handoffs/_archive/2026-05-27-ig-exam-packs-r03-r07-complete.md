# 2026-05-27 Instagram 過去問パック R3-R7 5 年分完成 + デザイン全面刷新

> 1 セッションで決まった大量の仕様変更と R3-R7 全 42 パック完成。試験まで 5-6 週で
> 投稿準備が整った状態を引き継ぐ。

## セッション開始時の状態

- AIDesigner プロト HTML（Downloads）が手元にあった
- IG カルーセル過去問パックは R7 9 パックのみ存在、デザインも旧基準
- design-system に IG カルーセル用トークン未整備
- 5 管理別カラーテーマ（MGMT_THEME）で実装、誤誘導の温床

## セッション終了時の状態

### 完成した素材（5 年分・42 パック・約 1,250 ファイル）

```
docs/sns/instagram/_exam-packs/
├ r03/（9 パック + _summary/）
├ r04/（8 パック + _summary/）
├ r05/（7 パック + _summary/）
├ r06/（9 パック + _summary/）
└ r07/（9 パック + _summary/）
```

各パックの内訳：
- `slide-data.json` — データソース
- `carousel/caption.txt` + `carousel/img/00..09.png` — フィード投稿用（1080×1350）
- `reels/caption.txt` + `reels/img/00..09.png` + `reels/script.txt` — Reels/ストーリー用（1080×1920）+ TTS 台本
- `stories/img/01..04.png` + `stories/caption.txt` + `stories/note.md` — ストーリー連投用 4 枚厳選

各年度の `_summary/` には目次カルーセル（4 枚 × 2 サイズ）。

### デザイン仕様（真実源 = `docs/design-system/instagram-carousel-tokens.json`）

| 項目 | 仕様 |
|---|---|
| キャンバス | 1080×1350（carousel）/ 1080×1920（reels） |
| 配色 | 単一 brand（#1858B5）+ semantic（green 正答 / coral 誤答 / navy CTA）。**5管理別配色は廃止** |
| フォント | Manrope（数字英字、500/700/800）+ NotoSansJP（日本語、500/600/700/800/900） |
| cover-title | 「令和7年度 ／ 択一式 過去問 #N」統一文言（管理混在問題を回避） |
| 圧縮モード | 4 段階自動判定（normal/dense/compact/ultra）総文字数で発動 |
| CTA stat | 「640問 / PRACTICE」「5管理 / SCOPE」 |
| 装飾円 | 右上=ページ番号バッジ化 / 左下=brand ロゴ全体を中央に |

## スキル・エージェント追加/更新

### 新規スキル
- **`.claude/skills/social/ig-carousel-restyle/`** — トークン更新後の一括再生成（前セッション）
- **`.claude/skills/social/ig-reel-create/`** — カルーセル PNG → VOICEVOX TTS → ffmpeg で Reels mp4 生成（`--script-only` で台本のみ生成可）

### 新規スクリプト
- `scripts/lint-exam-pack-structure.mjs` — E1/E2/W1 を機械検出（pre-check として bulk-generate に統合）
- `.claude/scripts/instagram/build-stories.mjs` — reels/img から 4 枚厳選 → stories/img/ にコピー + note.md 生成

### 一時スクリプト（`.tmp/` 配下、commit 対象外）
- `extract-aidesigner-bundle.mjs` — AIDesigner HTML を JSX/woff2 に展開
- `fill-from-primary.mjs` — r0X-primary MDX から optionExplanations + pointText を自動移植（年度引数）
- `migrate-markdown-tables.mjs` — bodyLines 内 markdown 表を table フィールドに自動変換
- `build-summary-slide-data.mjs` — 各年度の `_summary/slide-data.json` 自動生成
- `render-summary.mjs` — summary PNG レンダリング

### 更新したエージェント
- `ig-carousel-writer` — lists/table 必須ルール、lint 実行義務化、色禁止ガード
- `ig-carousel-qa` — 第 6 軸「デザイン統一性」追加、lint 自動実行統合

### 真実源 JSON
- `docs/design-system/instagram-carousel-tokens.json` — 全デザイン値の真実源（colors / typography / geometry / slides）

## 残作業

### 高優先（次セッション or 試験まで）

1. **VOICEVOX + ffmpeg 環境準備**（ユーザー手動）
   - `winget install Gyan.FFmpeg`
   - VOICEVOX デスクトップアプリ または Docker（`docker run --rm -p 50021:50021 voicevox/voicevox_engine:cpu-latest`）
   - 準備後: `node .claude/skills/social/ig-reel-create/scripts/ig-reel-create.mjs --exam r07-pack-01` で動画化開始

2. **IG 投稿運用（手動）**
   - 試験までの 5-6 週で R7 全 9 パックを週 2-3 ペース投稿
   - 並行して R6/R5/R4/R3 も順次（5 年分は 1 年以上の投稿ストック）
   - 各投稿手順は `docs/sns/instagram/_exam-packs/<year>/pack-NN/stories/note.md` 参照

### 中優先（試験後 or 余裕があれば）

3. **doboku-note サイト側の年度別 LP**
   - 中継ページ `doboku-note.com/exam/r07` 等を新規追加
   - 「ストーリー → LP → 9 個の IG 投稿 + サイト解説」の 3 階層誘導
   - 既存 `/links` ハブを参考に実装可
   - SEO + AdSense + IG 滞在時間の三重狙い

4. **R5/R4 のパック数調整**（必要なら）
   - 現状 R5 = 7 パック、R4 = 8 パック（問題分布の都合で揃わない）
   - 5 年すべて 9 パックに揃えたいなら、agent が新規問題を pack-08/09 に補完するパターンを採用（R3 でやった方式）

### 低優先（長期）

5. **R3 pack-08/09 の問題正当性レビュー**
   - R3 agent が「未収録問題」を新規 pack 化した（agent 報告参照）
   - 内容の妥当性を別途確認したほうがよい

6. **VOICEVOX + ffmpeg が整ったら Reels mp4 生成**
   - R7 全 9 パック × 動画 1 本ずつ = 9 mp4
   - 同じ要領で R6/R5/R4/R3 を後日

## 次セッションのスタート方法

```bash
# 1. ブランチ確認
git branch --show-current  # develop

# 2. 直近 commit を確認
git log --oneline -20

# 3. 現状の lint チェック
node scripts/lint-exam-pack-structure.mjs
# → 全 42 パックで ERROR 0、WARN 2（R7 表組合せ問題のみ、許容）

# 4. ファイル数チェック
find docs/sns/instagram/_exam-packs -name "*.png" | wc -l  # 約 1,000 PNG
```

主要な commit（このセッション）:
- `8788d8466` cover-title 2 行目末尾に #N を移動（80px で識別性最大化）
- `aef7a7d97` cover-meta と caption を「過去問 #N」位置に変更
- `e1804c472` cover-title 2 行構成 細部チューニング
- `6e2c3cdbf` R7 全 9 パックの reels サイズ PNG 90 枚を生成
- `6e388d80c` R3-R6 全パックを 4 並列 agent で一括生成
- `0faa97add` 42 パック × 4 枚 = 168 PNG をストーリー専用ディレクトリに整備
- `a8d10e953` 年度目次カルーセル新設、5 年度分の「年度入口」整備

## 重要な意思決定の記録

1. **5管理別配色を廃止** → 単一 brand に統一（HTML プロト準拠）
2. **管理混在問題の解決** → cover-title を「令和7年度／択一式 過去問 #N」共通文言に統一
3. **4 段階圧縮モード** → 総文字数で normal/dense/compact/ultra を自動判定
4. **R3-R5 のパック数不揃い** → 問題分布の都合で R5=7, R4=8（無理に揃えない）
5. **5 年分一括 vs R6 だけ先行** → ユーザー判断で「4 並列 agent で一気に」を採用、約 10 分で 4 年度完成
6. **ストーリー戦略** → cover/Q1/A1/cta の 4 枚厳選、ハイライト集約方針
7. **目次カルーセル新設** → 「1 ストーリー → 目次 → 個別」の 3 階層誘導
8. **note 商品想定の修正** → 過去問は doboku-note サイトで無料公開、note は記述式マガジンのみ
9. **連投リスク vs 試験直前需要** → アルゴリズム評価より試験直前需要を優先（連投覚悟）

## このセッションで「保留」した事項

- ffmpeg + VOICEVOX 環境準備（ユーザー手動、後日）
- 中継 LP（doboku-note サイト側、試験後）
- IG への自動投稿パイプライン（API 利用、長期）
- IG ガイド機能の活用（過去問アーカイブ集約、IG Business アカウント機能）

## 関連ドキュメント

- `docs/design-system/instagram-carousel.md` — デザイン仕様書
- `docs/design-system/instagram-carousel-tokens.json` — トークン真実源
- `docs/reference/ig-carousel-skill.md` — 運用方針
- `docs/reference/ig-carousel-policy.md` — slide-data スキーマ
- `docs/sns/instagram/profile.md` — IG プロフィール SoT
- `.claude/skills/social/ig-post-create/SKILL.md` — カルーセル PNG 生成
- `.claude/skills/social/ig-carousel-restyle/SKILL.md` — 一括再生成
- `.claude/skills/social/ig-reel-create/SKILL.md` — Reels 動画生成
- `.claude/agents/ig-carousel-writer.md` — slide-data 執筆
- `.claude/agents/ig-carousel-qa.md` — 6 軸品質評価
