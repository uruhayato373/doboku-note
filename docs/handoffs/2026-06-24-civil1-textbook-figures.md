# ハンドオフ: 1級土木テキスト 文字起こし＋図クロップ品質ループ（2026-06-24）

> [!summary]
> 1級土木の「ここだけで学べる」検証済みソースとして、テキスト両編（施工管理・法規編／土木一般編）を
> 高解像度OCRでMD化＋図クロップ埋め込みまで完了。その後、図クロップが緩い（本文写り込み・切れ）問題を
> **設計から修正**＝新Evaluator `scanned-figure-crop-auditor` による audit/refine ループを新設し、
> 施工管理・法規編にパイロット適用した。残りは下記「次にやること」。

## このセッションでやったこと（commit 順）

| commit | 内容 |
|---|---|
| `5d4f7bb2a` | 施工管理・法規編 327p → 7章MD（OCR） |
| `72d16f940` | 施工管理・法規編 図135点クロップ埋め込み |
| `ac57d5c7a` | 土木一般編 385p → 6章MD＋図320点 |
| `272be10f9` | スキャン変換の知見を `pdf-to-mdx` スキルへ（経路B＝PyMuPDF単ページ。`scripts/scanned/` 一式＋手順書） |
| `3a1d6871f` | **図クロップ品質ループの設計修正**: 新Evaluator `scanned-figure-crop-auditor` ＋ audit/refine ループ＋proofread/trim スクリプト＋台帳更新 |
| `7c9ada133` | 施工管理・法規編 図を audit/refine ループでタイト化（パイロット） |

## 重要な設計判断

- 図クロップは locate（800pxサムネからの単発目測）で終わらせると枠が緩い。**実クロップPNGを見る Evaluator ループ**（`adjust_bbox` 反復）で締めるのが正。これはプロジェクト既存の `civil-exam-figure-extractor`↔`civil-exam-figure-auditor` パターンのスキャン教材版。
- 新規エージェントは Evaluator 1つだけ（Generatorは流用、調整は算術適用）。
- **落とし穴**: 新規作成した `scanned-figure-crop-auditor` は**同一セッションでは agentType 解決不可**（定義はセッション開始時ロード）。当面は `figure_crop_audit.workflow.js` の args に `agentType:"general-purpose"` を渡して代用（プロンプトに4軸ルーブリック内包済み）。**セッション開き直せば既定の `scanned-figure-crop-auditor` が使える**。

## 次にやること（優先順）

### 1. 施工管理・法規編 難所10図の手動差し替え（最後の仕上げ・中断地点）
自動locateが正図に当たらない10図（**図番号の版ずれ・小インライン図**）。READMEに「要手動」明記済み。
対象: `03-11, 03-14, 05-18, 05-19, 05-22, 05-24, 06-01, 06-11, 07-02, 07-07`
- 目視用ページ画像は `C:\tmp\civil1a-fix\inspect\{figId}_p{NN}.png` にレンダ済み（中断時点）。
- 各ページを Read → 正しい図領域を目視特定 → `C:\tmp\civil1a-fix\bbox.json` の該当 figId の `chosenPage/x/y/w/h` を手動修正 → `python scripts/scanned/crop_embed_figures.py C:/tmp/civil1a-fix --crop-only` で再クロップ → commit。
- 例の不一致: `05-18`(MD図5.10 はしご道 ↔ 再locateは図5.11)、`05-22`(MD図5.14 本足場=右上小図) など、MD側の図番号がOCRでずれている疑い。

### 2. 土木一般編（図320点）の図タイト化 — **ユーザー判断で「後回し」**
- 施工管理編パイロットで audit/refine 5ラウンド＋再locate ≒ **約20Mトークン**消費。土木一般編は2.4倍。
- 再開時は**軽量版推奨**: `apply_deltas_recrop.py --damp 0.7`（振動抑制）＋監査2-3ラウンド上限、誤locateのみ再locate。
- runbook: `.claude/skills/conversion/pdf-to-mdx/scripts/scanned/README.md`（locate→crop→**audit/refineループ**→trim→embed）。

### 3. 本文OCR校正パス（proofread）— **ユーザー判断で「見送り」**
- `proofread.workflow.js`（ページ画像と逐語照合）。再OCRコストが要るため保留。必要時に両編 or 施工管理編パイロットで。

### 4. アクセス増の本丸（当初の主題）
- テキスト両編の検証済みソースは揃った。次は**この素材を使った guideページ品質改善・note無料集客記事への展開**。
- 推奨順: **GSCデータ先行**で「どのトピックが品質・網羅で伸び悩んでいるか」特定 → 該当ページ改善。
- note戦略の真実源: `docs/note/1級・2級土木/noteコンテンツ計画.md`（二刀流: 買い切り過去問＋メンバーシップ予想/添削）。

## 作業ディレクトリ / 再開メモ

- `C:\tmp\civil1a-fix\`: 施工管理編の図作業（manifest.json / bbox.json / thumbs / inspect / audit.json）。難所10図の手動作業がここで完結する。**完了後は削除可**。
- 土木一般編の tmp（civil1b-ocr）は削除済み。再開時は `render_pages.py` から。
- スクリプト一式: `.claude/skills/conversion/pdf-to-mdx/scripts/scanned/`（render_pages / ocr_fanout.workflow / proofread.workflow / concat_chapters / prep_figures / figure_bbox.workflow / crop_embed_figures（`--crop-only`）/ prep_audit_jobs / figure_crop_audit.workflow / apply_deltas_recrop（`--damp`）/ trim_placeholders）。
- 図クロップは `docs/textbook/**/img` → **r2-sync 対象外＝公開されない**（内部リファレンス・著作権安全）。

## メモリ更新済み
- [[project_civil1_textbook_transcription]]（両編完了＋図埋め込み）。図 audit/refine ループの新設はスキル側（repo）がSSOTのためメモリ追記なし。
