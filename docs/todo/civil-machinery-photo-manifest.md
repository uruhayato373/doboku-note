# 機械系 textbook ページ 写真差し替えマニフェスト（PDF写真→AI処理）

> [!info] 位置づけ
> 土木一般編・機械系8ページの現行写真を、テキストPDF由来の写真ベース画像へ差し替えるための対応表（2026-07-03 作成）。差し替え元PNGは `docs/textbook/１級土木施工管理技士/テキスト（土木一般編）/img/`（02=建設機械 / 05=測量、抽出済み320枚）。判定は現行 alt/出典コメント × PDF側 md の `（図: 写真X.X ...）` キャプション突合。画像パイプライン（AI処理→差し替え）は Codex/スクリプト向き。真実源ポリシー→[civil1-textbook-expansion.md](civil1-textbook-expansion.md)「図・写真の扱い」。

> [!warning] 実行順序＝AI処理を先に（本番に生画像を出さない）
> 8ページは `published: true` で本番公開中。**差し替えは「PDF写真PNGをAI処理（強い変形＝実質再生成）→差し替え→commit」を一体**で行い、生のスキャン写真を先行公開しない。現行写真の大半は Wikimedia CC/PD（合法）なので、AI処理が弱いと**著作権的にむしろ後退**する点に注意（強い変形必須）。

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
- 差し替え時 `<ArticleImage>` の `src` を更新、webp 再生成（`npm run generate-webp`）、R2 は main push で CI 同期。
