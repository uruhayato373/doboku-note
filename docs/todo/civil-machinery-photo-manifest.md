# 機械系 textbook ページ 写真差し替えマニフェスト（PDF写真→AI処理）

> [!info] 位置づけ
> 土木一般編・機械系8ページの現行写真を、テキストPDF由来の写真ベース画像へ差し替えるための対応表（2026-07-03 作成）。差し替え元PNGは `docs/textbook/１級土木施工管理技士/テキスト（土木一般編）/img/`（02=建設機械 / 05=測量、抽出済み320枚）。判定は現行 alt/出典コメント × PDF側 md の `（図: 写真X.X ...）` キャプション突合。画像パイプライン（AI処理→差し替え）は Codex/スクリプト向き。真実源ポリシー→[civil1-textbook-expansion.md](civil1-textbook-expansion.md)「図・写真の扱い」。

> [!warning] 方針＝AI着色（カラー化）／実行順序＝着色を先に（本番に生スキャンを出さない）
> **2026-07-04 ユーザー決定：処理は「PDFの白黒写真をAIで着色」**（従来案の「強い変形＝実質再生成」は不採用）。8ページは `published: true` で本番公開中。**差し替えは「PDF白黒PNG→AI着色→webp化→差し替え→commit」を一体**で行い、生のスキャン写真を先行公開しない。
> **著作権の留意（了承済み）**：現行写真の大半は Wikimedia CC/PD（合法）。着色は市販テキスト写真の**派生物**にあたりうるため、法的には後退の可能性がある（※法的細部は要確認）。この点を了承の上で着色を選択している。生成が要るのは**PDFに実機写真の無い4枚のみ**（txt2img）。

## 総括

- 差し替え対象の写真＝**24枚**（自前SVG 5点は据え置き）
- PDF写真で賄える＝**20枚**（完全一致13／要トリミング・文言調整7）
- AI新規生成が要る＝**4枚**（PDFに実機写真なし）

## 差し替え対応表（ページ別）

### textbook-crane（クレーン・高所作業車）
| 現行写真 | 被写体 | 充てるPNG | PDFキャプション | 確度 | 備考 |
|---|---|---|---|---|---|
| crawler-crane.webp | クローラクレーン | 02-27.png | 写真2.18 クローラクレーン | 高 | 一致 |
| all-terrain-crane.webp | オールテレーン | 02-28.png | 写真2.19 オールテレーンクレーン | 高 | 一致 |
| rough-terrain-crane.webp | ラフテレーン | 02-29.png | 写真2.20 ホイールクレーン | 中 | alt文言調整要 |
| loader-crane.webp | 積載型トラック | 02-30.png | 写真2.21 積載型トラッククレーン | 高 | 一致 |
| tower-crane.webp | タワー/クライミング | 02-31.png | 写真2.22 クライミングクレーン | 中 | |
| cable-crane.webp | ケーブルクレーン | 02-33.png | 写真2.23 ケーブルクレーン（4枚組） | 中 | 単体クロップ要 |
| boom-lift.webp | 高所作業車 | 02-34.png | 写真2.24 高所作業車 | 高 | 一致 |

### textbook-grader-compaction（モータグレーダ・締固め機械）
| 現行写真 | 被写体 | 充てるPNG | PDFキャプション | 確度 |
|---|---|---|---|---|
| motor-grader.webp | モータグレーダ | 02-35.png | 写真2.25 モータグレーダ | 高 |
| macadam-roller.webp | マカダムローラ | 02-39.png | 写真2.26 マカダムローラ | 高 |
| tandem-roller.webp | タンデムローラ | 02-40.png | 写真2.27 タンデムローラ | 高 |
| tire-roller.webp | タイヤローラ | 02-41.png | 写真2.28 タイヤローラ | 高 |
| tamping-roller.webp | タンピングローラ | 02-42.png | 写真2.29 タンピングローラ | 高 |
| figure-compaction-classification.svg | 分類図 | — | — | 据え置き(SVG) |

### textbook-loader（積込機械）
| 現行写真 | 被写体 | 充てるPNG | PDFキャプション | 確度 |
|---|---|---|---|---|
| wheel-loader.webp | ホイール式ローダ | 02-22.png | 写真2.14 ホイール式ローダ | 高 |

（新規追加候補: 02-21 クローラ式ローダ写真＝要判断）

### textbook-transport-machinery（運搬機械）
| 現行写真 | 被写体 | 充てるPNG | PDFキャプション | 確度 | 備考 |
|---|---|---|---|---|---|
| dump-truck.webp | ダンプトラック | 02-24.png | 写真2.15 ダンプトラック(普通/重ダンプ2枚組) | 中 | 片方トリミング |
| rough-terrain-carrier.webp | 不整地運搬車 | 02-25.png | 写真2.16 不整地運搬車 | 高 | |
| belt-conveyor.webp | ベルトコンベヤ | 02-26.png | 写真2.17 ベルトコンベヤ(2枚組) | 中 | トリミング |

### textbook-tractor-bulldozer（トラクタ・ブルドーザ）
| 現行写真 | 被写体 | 充てるPNG | PDFキャプション | 確度 | 備考 |
|---|---|---|---|---|---|
| bulldozer.webp | ブルドーザ(中型) | 02-07.png | 写真2.2 ブルドーザ(中型) | 高 | |
| figure-travel-device.svg | 走行装置図 | — | — | 据え置き(SVG) | |

（新規追加候補: 02-03 ROPS写真＝要判断）

### textbook-distance-angle（測距と測角）
| 現行写真 | 被写体 | 充てるPNG | PDFキャプション | 確度 | 備考 |
|---|---|---|---|---|---|
| theodolite.webp | セオドライト | 05-03.png | 写真5.1 セオドライト外観(名称ラベル付) | 中〜高 | ラベル不要なら機体トリミング |
| total-station.webp | トータルステーション | 05-09.png | 写真5.2 トータルステーション | 高 | |
| edm-rangefinder.webp | 反射プリズム | — | — | — | **AI生成**(PDF写真なし) |
| gnss-receiver.webp | GNSS受信機 | — | — | — | **AI生成**(PDF写真なし) |
| figure-distance-types.svg / figure-angle-types.svg / figure-error-cancellation.svg | — | — | — | 据え置き(SVG) | |

### textbook-leveling（水準測量・地形測量）
| 現行写真 | 被写体 | 充てるPNG | PDFキャプション | 確度 |
|---|---|---|---|---|
| automatic-level.webp | 自動レベル | 05-15.png | 写真5.4 自動レベル | 高 |

（新規追加候補: 05-17 地上レーザ / 05-19 車載 / 05-21 UAVレーザ＝要判断）

### textbook-scraper（スクレーパ）
| 現行写真 | 被写体 | 充てるPNG | 確度 | 備考 |
|---|---|---|---|---|
| motor-scraper.webp | モータスクレーパ | — | — | **AI生成**(PDFは図2.7操作手順図のみ・実機写真なし) |
| scraper-dozer.webp | スクレープドーザ | — | — | **AI生成**(同上) |

## AI新規生成が要る4枚
`textbook-scraper`: motor-scraper / scraper-dozer ／ `textbook-distance-angle`: edm-rangefinder / gnss-receiver

## 後工程の注意
- 複数被写体PNG（02-24・02-26・02-33）はAI処理前に単体クロップ。
- 02-29 は「ホイールクレーン」表記＝alt調整要。05-03 はラベル付き＝不要なら機体トリミング。
- 差し替え時、**着色出力を同名（例 `crawler-crane.png`）で該当 `img/` に置けば `src` 変更は不要**（`npm run generate-webp` が同名 webp を上書き）。R2 は main push で CI 同期。

---

## AI着色プロンプト・生成プロンプト（別PC Gemini 用・2026-07-04）

> [!info] 実行フロー（別PC・Gemini 画像編集）
> 1. 参照PNG＝`docs/textbook/１級土木施工管理技士/テキスト（土木一般編）/img/<番号>.png`（白黒）。複数被写体（02-24/02-26/02-33）と 05-03 は**先に単体クロップ**。
> 2. Gemini の画像編集に入力 → 下記プロンプトで着色 → 出力を該当ページの `img/<元webpと同名>.png` で保存。
> 3. `npm run generate-webp` → 同名 webp を上書き（`src` 変更不要）→ 変更ファイルだけ `git add` → commit → main で R2 同期。

### 着色プロンプト（20枚共通テンプレ・`[機種]` を下表で差し替え）
```
Colorize this black-and-white photograph of a [機種] used in civil engineering.
Apply realistic, natural colors typical of modern construction/survey equipment.
Preserve the exact composition, shape, proportions, and every detail of the original.
Photorealistic; do not add, remove, move, or alter any object. Keep the background natural.
```

| ファイル | `[機種]`（英語で差し替え） |
|---|---|
| crawler-crane | crawler crane (lattice boom) |
| all-terrain-crane | all-terrain mobile crane |
| rough-terrain-crane | wheel crane（PDF=ホイールクレーン） |
| loader-crane | truck-mounted knuckle-boom loader crane |
| tower-crane | climbing tower crane |
| cable-crane | aerial cableway (cable) crane |
| boom-lift | telescopic-boom aerial work platform |
| motor-grader | motor grader |
| macadam-roller | three-wheel macadam roller |
| tandem-roller | double-drum tandem roller |
| tire-roller | pneumatic tire roller |
| tamping-roller | tamping (sheepsfoot) roller |
| wheel-loader | wheel loader |
| dump-truck | rigid dump truck |
| rough-terrain-carrier | rubber-crawler off-road carrier |
| belt-conveyor | overland belt conveyor |
| bulldozer | medium bulldozer |
| theodolite | surveying theodolite on a tripod |
| total-station | surveying total station on a tripod |
| automatic-level | surveying automatic level on a tripod |

### 新規生成プロンプト（4枚・txt2img）
- **motor-scraper**：`Photorealistic side view of a self-propelled motor scraper (earthmoving scraper) on a construction earthwork site, realistic colors, natural daylight, single subject, uncluttered background.`
- **scraper-dozer**：`Photorealistic view of a towed scraper/scraper-dozer spreading and leveling soil on an earthwork site, side angle, realistic colors, natural daylight.`
- **edm-rangefinder**：`Photorealistic image of a surveying reflector prism (EDM target prism) mounted on a pole, used as a distance-measuring target in land surveying, outdoor neutral background.`
- **gnss-receiver**：`Photorealistic image of a GNSS surveying receiver — antenna and rover unit mounted on a tripod receiving satellite signals — in an outdoor survey setting, realistic colors.`

> [!note] 品質チェック（差し替え前）
> 着色後は**機種が変わっていないか**（マカダム↔タンデム等）・不要物の追加が無いかを目視。生成4枚は**機種の正確さ**（scraper/prism/GNSS の形状）を最優先で確認する。
