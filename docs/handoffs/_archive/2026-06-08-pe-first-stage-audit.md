# pe-first-stage 監査レポート（2026-06-08）

## 実施概要

- 対象: R01〜R07 × 適性科目・基礎科目・専門科目（建設部門）全21ページ
- 実施日: 2026-06-08
- 監査軸: 正答照合 / 原典視覚突合 / 構造検査

## サマリ

| 軸 | 合格 | 問題あり |
|---|---|---|
| 正答照合 | 14 | 7（8問不一致） |
| 視覚突合 | 6 pass / 7 partial | 6 fail（複数 issues） |
| 構造検査 | 21 | 0 |

## 問題一覧

### 正答不一致（要修正）

| ページ | 設問 | MDX正答 | 公式正答 | 備考 |
|---|---|---|---|---|
| r02-construction | Ⅲ-13 | 1 | 2 | 高度利用地区と高度地区の混同 |
| r04-basic | Ⅰ-2-5 | 3 | 5 | ホーナー法フローチャート正答誤記 |
| r05-aptitude | Ⅱ-10 | 2 | 3 | 選択肢番号と適切数のカウントずれ |
| r05-basic | Ⅰ-2-2 | 5 | 4 | ユークリッド互除法ウ=R→ウ=B |
| r05-basic | Ⅰ-5-1 | 1 | 3 | 里地里山「利用拡大」が事実と逆 |
| r05-construction | Ⅲ-31 | 2 | 4 | 要出典確認（PDF突合ではMDX=2が妥当） |
| r07-aptitude | Ⅱ-10 | 2 | 3 | 解説本文と正答番号の不一致 |
| r07-construction | Ⅲ-17 | 5 | 3 | ベルヌーイ導出はρg(z_C-z_B)=選択肢3 |

### 視覚突合 Issues（要修正優先度 高）

**誤字・転記ミス（選択肢テキスト）**

| ページ | 設問 | 種別 | 概要 |
|---|---|---|---|
| r01-aptitude | Ⅱ-10 | character_error | 「存有」「有有」→「専有」（OCRアーティファクト）、「ことを以外」→「とき以外」 |
| r02-aptitude | Ⅱ-12 | 問題文誤字 | 「出荷等を遵守」→「法令等を遵守」（解説内も同誤字） |
| r03-aptitude | Ⅱ-4 | transcription_error | 「にならていない」→「になっていない」 |
| r06-construction | Ⅲ-30 | transcription_error | choice2「上下方向の軌間変位」→「水準変位」（解説は正しい） |

**選択肢の内容不一致**

| ページ | 設問 | 種別 | 概要 |
|---|---|---|---|
| r01-construction | Ⅲ-33 | choice_text_mismatch | 「できる」→「できない」（意味が逆転、正答は同じだが受験者が混乱） |
| r05-aptitude | Ⅱ-11 | choice_text_mismatch | choice2・3 のウ/エ列が PDF と入れ替わり |
| r07-aptitude | Ⅱ-9 | choice_text_mismatch | choice3 のア/イが逆（農耕/狩猟） |

**問題文の誤り・欠落**

| ページ | 設問 | 種別 | 概要 |
|---|---|---|---|
| r03-basic | Ⅰ-1-1 | polarity | 「最も適切」→「最も不適切」（解答・解説はPDF版と整合） |
| r04-aptitude | Ⅱ-11 | missing_content | 選択肢（ク）が欠落（8項目中7項目のみ） |
| r04-basic | Ⅰ-2-5 | missing_figure | フローチャート図なし（問題の前提となる図） |
| r06-basic | Ⅰ-5-4 | problem_text_error | 括弧構造誤記・主語誤記・「廃熱」→「廃棄」誤字 |
| r06-basic | Ⅰ-5-5 | answer_polarity_contradiction | 正答3が解説内で「最も不適切 ❌」と評価されており矛盾 |

**図の欠落（missing_figure）**

| ページ | 設問 | 概要 |
|---|---|---|
| r01-basic | Ⅰ-1-4 | 圧縮座屈の概念図 |
| r01-basic | Ⅰ-3-5 | 荷重を受けている棒の図 |
| r01-basic | Ⅰ-3-6 | 剛体振り子の図 |
| r03-basic | Ⅰ-3-4 | 両端固定された棒の図 |
| r03-basic | Ⅰ-3-5 | ばね-質点系の図 |
| r03-basic | Ⅰ-3-6 | 四分円の板の図（座標軸付き） |
| r05-basic | Ⅰ-3-5 | 回転軸系の図（計算補助） |
| r06-construction | Ⅲ-5 | 長柱の座屈境界条件図 |
| r06-construction | Ⅲ-17 | 平板（垂直壁）と水深hの図 |

**解説の不整合**

| ページ | 設問 | 概要 |
|---|---|---|
| r03-aptitude | Ⅱ-6 | 解説内で正答番号と説明が不一致（要PDF確認） |
| r07-aptitude | Ⅱ-10 | 解説本文の✅/❌が正答番号と逆 |
| r05-construction | Ⅲ-31 | PDF突合ではMDX正答=2が妥当だが公式正答記録=4（要確認） |

### 構造検査 Issues

なし。全21ページ pass。

## 対応優先度

### 1. 緊急（正答不一致）
r02-construction / r04-basic / r05-aptitude / r05-basic / r05-construction(要確認) / r07-aptitude / r07-construction の正答番号を修正する。

### 2. 高（問題文・選択肢の内容変質）
選択肢の意味が逆転または欠落している問題を修正する。
- r01-construction Ⅲ-33（「できない」→「できる」逆転）
- r04-aptitude Ⅱ-11（選択肢クの欠落）
- r05-aptitude Ⅱ-11（ウ/エ入れ替わり）
- r07-aptitude Ⅱ-9（ア/イ逆）
- r06-basic Ⅰ-5-4（主語・括弧・誤字）
- r06-basic Ⅰ-5-5（極性矛盾 要確認）
- r03-basic Ⅰ-1-1（極性「不」脱落）

### 3. 中（誤字・解説不整合）
OCRアーティファクト由来の誤字、解説の✅/❌不整合を修正する。
- r01-aptitude Ⅱ-10、r02-aptitude Ⅱ-12、r03-aptitude Ⅱ-4、r06-construction Ⅲ-30
- r03-aptitude Ⅱ-6、r07-aptitude Ⅱ-10 解説本文

### 4. 低（図の追加）
「下図に示すように」参照がある設問に図を追加する（基礎科目の材力・機械系設問が中心）。
計9箇所。画像ファイル生成→R2アップロードのパイプラインが必要。

## 作成・更新ファイル

### 監査記録（今回更新）
- `.claude/state/pe-first-stage-audit/summary.json`
- `.claude/state/pe-first-stage-audit/{year}-{sub}.json` × 21

## 方法論メモ

- 前回（schema v1.0）は正答照合・構造検査のみ。今回（schema v2.0）で視覚突合を追加
- `r04-construction` は前回audit で Ⅲ-13 正答ミス（official=5）が記録されていたが、今回PDF突合で MDX=1 が正しいと確認。前回記録の誤りを訂正
- `r05-construction` Ⅲ-31 は PDF突合（MDX=2）と公式正答記録（4）が乖離。公式解答一覧PDFの再確認が必要
- 基礎科目の材力・機械設問は図付きが多く、図なし状態でも解説が計算で代替できる場合あり
