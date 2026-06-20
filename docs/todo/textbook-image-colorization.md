# 1級土木 textbook：web検索写真 → PDF図 差し替え＋カラー化 ワークリスト

> backlog「1級土木 テキスト画像：web検索写真を PDF図クロップ＋Gemini カラー化で差し替え」🟢 の実作業マニフェスト。
> 後で **Gemini または GPT** でカラー化作業をするための対象一覧・元PDF対応・状態を記録する（2026-06-20 作成）。

## 状態の凡例
- `WEB` = 現在 web 検索写真（`.jpg`/`.webp`）が配置されている（著作権リスク・要差し替え）
- `BW`  = PDF からクロップした白黒画像を配置済み（カラー化待ち）
- `COLOR` = カラー化完了

## 決定方針（2026-06-20）：Gemini/GPT で自前オリジナルイラスト生成

PDF（公式テキスト）の機械イラストの多くは **メーカー提供の「写真」**（例：`写真2.25 モータグレーダ（写真提供：コマツ）`、ローラ＝酒井重工業、測量機器＝トプコン/ニコン）で、切り出して使うと web 写真と同じ著作権問題が残る。

**→ 採用：(C) Gemini/GPT でオリジナルのカラーイラストを生成して差し替える**（既存写真のコピーではなく、機械種別を表す新規イラストを生成）。著作権を根本解消。下表の「元PDF」は **生成時の形状リファレンス**（正確さの担保）として参照する。

- **実行は有料 Gemini/GPT 画像生成 → 着手前に必ずユーザー確認**（memory `gemini-cost-confirm`）。当面は web 写真を据え置き（差し替え画像が出来てから入れ替え、ページが画像欠けにならないように）。
- **生成スタイル（要すり合わせ）**: 統一感のあるフラット/アイソメのテック系イラスト、背景透過または淡色、土木受験テキストにふさわしいニュートラルな配色。1枚ずつ機械名で生成。
- パイロット推奨：`textbook-grader-compaction`（5枚）で品質・コスト・スタイルを確定 → 全24枚へ。

## 対象一覧（8ページ・24枚）

ソースPDF: 第2章＝`docs/textbook/１級土木施工管理技士/テキスト（土木一般編）/第２章_建設機械.pdf`、第5章＝同`第５章_測量.pdf`。

### textbook-crane（7枚・状態 WEB）
| 画像 | 現alt（ブランド） | 元PDF候補 |
|---|---|---|
| crawler-crane | クローラクレーン（日立 CX900HD） | 第2章 p42 クローラクレーン(写真) |
| all-terrain-crane | オールテレーン（Liebherr LTM 1500-8.1） | 第2章 p43 ホイールクレーン系(写真) |
| rough-terrain-crane | ラフテレーン（タダノ 35t） | 第2章 p43 付近(写真) |
| loader-crane | 積載型トラッククレーン（HIAB 145Z） | 第2章 クレーン節(要確認) |
| tower-crane | タワークレーン（米ダラス） | 第2章 p44 その他クレーン(要確認) |
| cable-crane | ケーブルクレーン | 第2章 クレーン節(要確認) |
| boom-lift | （高所作業車系） | 第2章 該当なしの可能性 |

### textbook-grader-compaction（5枚・状態 WEB）※ 元PDF写真は全て確認済
| 画像 | 現alt | 元PDF（写真・メーカー提供） |
|---|---|---|
| motor-grader | モータグレーダ（Caterpillar） | 第2章 p47 写真2.25（コマツ） |
| macadam-roller | マカダムローラ | 第2章 p50 写真2.26 |
| tandem-roller | タンデムローラ（HAMM） | 第2章 p51 写真2.27 |
| tire-roller | タイヤローラ（BOMAG） | 第2章 p51 写真2.28 |
| tamping-roller | タンピングローラ（BOMAG） | 第2章 p53 写真2.29付近 |

### textbook-distance-angle（4枚・状態 WEB）
| 画像 | 元PDF候補 |
|---|---|
| theodolite | 第5章 p8 セオドライト(写真5.x・トプコン) |
| total-station | 第5章 p11 トータルステーション(写真5.x) |
| gnss-receiver | 第5章 p13 GNSS(図5.9) |
| edm-rangefinder | 第5章 測距儀(要確認) |

### textbook-transport-machinery（3枚・状態 WEB）
| 画像 | 元PDF候補 |
|---|---|
| dump-truck | 第2章 p36 リヤダンプ付近(写真) |
| rough-terrain-carrier | 第2章 運搬機械節(要確認) |
| belt-conveyor | 第2章 運搬機械節(要確認) |

### textbook-scraper（2枚・状態 WEB）
| 画像 | 元PDF候補 |
|---|---|
| motor-scraper | 第2章 p23 写真2.x モータスクレーパ |
| scraper-dozer | 第2章 スクレーパ節(要確認) |

### textbook-leveling（1枚・状態 WEB）
| 画像 | 元PDF候補 |
|---|---|
| automatic-level | 第5章 p17 自動レベル/テイルティングレベル(写真5.3・トプコン) |

### textbook-loader（1枚・状態 WEB）
| 画像 | 元PDF候補 |
|---|---|
| wheel-loader | 第2章 p33 ホイール式ローダ(写真) |

### textbook-tractor-bulldozer（1枚・状態 WEB）
| 画像 | 元PDF候補 |
|---|---|
| bulldozer | 第2章 p15付近 ブルドーザ(クローラ式・写真/図) |

## 作業手順（採用方針＝オリジナルイラスト生成）
1. （任意）形状リファレンスとして元PDFページを `pdftoppm -r 200 -f P -l P <PDF> out` で画像化し参照
2. **Gemini/GPT で各機械種別のオリジナルカラーイラストを生成**（既存写真のコピー禁止・新規生成）。実装の足がかりは `scripts/generate-ogp-backgrounds.mjs`（Gemini 連携パターン）。**有料につき実行前にユーザー確認**（memory `gemini-cost-confirm`）。プロンプトは「機械名＋統一スタイル＋背景＋角度」を固定し1枚ずつ
3. 生成画像を `img/<machine>.png` に保存 → `npm run generate-webp`（既存skip=sweepなし）。古い web 写真 `.jpg`/`.webp` は新画像が揃ってから削除
4. MDX の `src` を新 webp に、`alt` をブランド名（例：日立 CX900HD）→ 一般名称＋説明（例：クローラクレーンの外観）へ修正
5. `npm run refresh-indexes` → commit（R2 同期は main push 時 CI）
6. 本ファイルの該当行の状態を `WEB`→`COLOR` に更新

## キャプション凡例の補足
表の「元PDF」は **生成時の形状リファレンス**（正確な機械形状の確認用）であり、その写真自体を切り出して使うものではない。
