---
title: コンテンツ角度ポリシー（6 切り口）
---

# コンテンツ角度ポリシー（6 切り口）

SNS 投稿の **編集角度（content angle）** の真実源。過去問クイズ偏重から脱し、既存の note 記事・サイト記事の資産を「結論／理由／体験／反論／数字／ハウツー」の 6 切り口で多媒体へ展開するための編集フレームワークと、`angle` パラメータ分業の設計を定義する。

`x-post-policy.md`・`ig-carousel-skill.md`・`ig-reels-policy.md`・`ig-stories-policy.md` とパラレルな位置づけで、各 Generator（`x-post-writer` / `ig-carousel-writer` / `ig-reels-writer` / `ig-stories-writer` / `yt-shorts-title-writer`）と Evaluator が共通参照する。

> 設計原則: **資格別にも角度別にもエージェント/スキルを増やさない**。媒体（X / IG / YT）× 機能（Generator/Evaluator）で分業し、試験は `exam` パラメータ、編集角度は `angle` パラメータで横断する（[x-post-policy.md](./x-post-policy.md) と同じ思想）。

## 1. 背景と課題

現状の SNS は **過去問パック（IG Carousel B / Reels / YT Shorts 派生）と一部キーワード定義（type1）に偏重**している。これは実質「知識チェック型」1 角度 × 「すでに勉強している現受験生」1 層しか刺さらない。

一方で、note 記事・サイト記事の資産は **すでに 6 切り口をほぼ網羅して書かれている**のに、SNS へ転用されていない。

> [!warning] 自動要約は薄くなる（既出の教訓）
> 過去に「サイト記事 description からの自動要約を IG カルーセルへ流す」運用（`_section-bundles/` / `notebook-summary`）は、汎用テンプレ要約が情報密度に耐えず廃止された（[ig-carousel-skill.md §9](./ig-carousel-skill.md)）。
> 本ポリシーは「自動要約」ではなく、**角度が立った既存 note 記事（＝すでに手作り）を源にする**ことを前提とする。源が手作りでなければ角度は薄くなる。

## 2. 6 切り口の定義と既存資産マッピング

各角度は `angle` パラメータの enum 値（英 slug）を持つ。過去問クイズは角度に属さない既存ベース型（「問題提起型」）であり、6 切り口はその上に乗る**追加レイヤー**である。

| `angle` | 切り口 | 受験生への価値 | 主な既存資産（角度が立っている） |
|---|---|---|---|
| `conclusion` | 結論 | 「で、何をすればいい?」への即答 | トレードオフ思考 §核 vs 核 / 総監メリット完全マップ / last-minute-2026 の 6 パターン |
| `reason` | 理由 | なぜそうなるかの納得（PREP の R） | management-tradeoffs / キーワードページ / 4 フェーズ学習法 |
| `experience` | 体験 | 合格者・公務員のリアル | 公務員クラスター 8 本 / 将来の E-1〜E-4（合格体験） |
| `counter` | 反論 | 通説を壊す（最も保存・拡散される） | 「キーワード集が点にならない理由」/「番号で当てる戦略は使えない」/「自治体技術職員の択一盲点」 |
| `number` | 数字 | 説得力・権威 | 白書 R7（予防保全 3 割縮減・特定技能 18.1 万人）/ 択一 17 年分析 / 合格率 20.7% |
| `howto` | ハウツー | 即実践・保存・サイト送客 | 公務員の総監学習設計 / 発注者業務を 5 管理に翻訳 / 総監を AI で勉強 / 経験記述の書き方 |

> 角度は記事 1 本に複数含まれることがある（例: 公務員クラスターは `experience` + `howto`）。投稿単位では **主角度を 1 つに絞る**（1 投稿 1 角度。混ぜると訴求がぼやける）。

## 3. ターゲット層 × 角度の優先マトリクス

3 つのターゲット層は受験フェーズが異なり、刺さる角度が違う。過去問クイズは「現受験生」にしか届かないため、TOFU/公務員層の取りこぼしを 6 切り口で埋める。

| 層 | 受験フェーズ | 優先角度 | 狙い |
|---|---|---|---|
| **これから受験する潜在層** | TOFU（受験未定） | `number` / `counter` / `conclusion` | 「気づき」を与えてフォローさせる入口。過去問では届かない層 |
| **現受験生** | MOFU（勉強中） | `howto` / `reason`（＋過去問クイズ） | 既存の過去問配信に学習法・納得を上乗せ |
| **土木系公務員** | TOFU〜BOFU | `experience` / `conclusion`（メリット） | note 公務員クラスター 8 本がこの層向けに書かれている既存在庫。SNS 未展開 |

## 4. チャネル × 角度の相性

角度ごとに最適なフォーマットが異なる。制作コストの観点では、`experience`・`counter` は手作り寄り（X 向き）、`number`・`howto`・`conclusion` は note 記事から構造抽出しやすい（IG/YT 量産向き）。

| `angle` | 第一チャネル | 理由 |
|---|---|---|
| `conclusion` | IG Carousel cover / X 単発 / Reels hook | 言い切りが冒頭フックに強い |
| `reason` | IG Carousel 本文 / Reels | 展開に枚数・尺が要る |
| `experience` | **X 主** / Reels / Stories | 一次情報の断片はフロー型 X に最適 |
| `counter` | **IG Carousel（保存狙い）** / X | 通説否定は保存・シェアされやすい |
| `number` | IG Carousel / Reels / YT | 図解・グラフと相性が良い |
| `howto` | IG Carousel（保存）/ YT Shorts | 手順は保存・検索流入と相性が良い |

## 5. Red Line（角度展開で守るルール）

1. **体験角度は「断片・フック」まで** — 受験記・解答再現の一次情報は note 有料（E-1〜E-4）の囲い込み資産。SNS の `experience` 投稿でフル放出しない（X policy の「思考・体験の断片」と同方針）。フル展開は note 有料へ誘導する。
2. **数字角度は捏造厳禁・出典明記** — `number` 投稿の数値は出典（白書年度・統計名）を必ず添え、`note-fact-checker` 相当の数値突合を通す。曖昧な概数を権威付けに使わない。
3. **verbatim 重複の回避** — note/サイト本文をそのまま転記しない。SNS は検索インデックス上の競合にはなりにくいが、note 有料の中身を割らないこと・角度を変えて要約することを守る（[note コンテンツ計画の Red Line #4](../../../docs/note/技術士総監/noteコンテンツ計画.md)）。
4. **絵文字禁止** — 全媒体共通（CLAUDE.md §2）。強調は媒体のテンプレ意匠で表現する。
5. **送客整合** — 角度に応じた送客先を守る。`howto`/`reason` はサイト（体系解説）、`experience`/`conclusion`（メリット）は note へ。UTM は [02_チャネル動線設計.md §4](../../../docs/project/03_SNS/02_チャネル動線設計.md) 準拠。

## 6. `angle` パラメータ分業の設計

既存の「媒体 × Generator/Evaluator」分業に `angle` を直交パラメータとして足す。資格を `exam` で横断するのと同じ構造であり、**角度別にエージェントを新設しない**。

### 6.1 パラメータ

| パラメータ | 値 | 既存との関係 |
|---|---|---|
| `exam` | `pe-comprehensive` / `pe-construction` / `civil-1` / `civil-2` | 既存（変更なし） |
| `angle` | `conclusion` / `reason` / `experience` / `counter` / `number` / `howto` | **本ポリシーで新設** |
| `source` | 源となる note 記事 dir / サイト slug | 角度が立った既存資産を指す（§2 表） |

過去問クイズ（既存ベース型）は `angle` を取らない。`angle` 指定がある投稿は「資産転用型」、無い投稿は「過去問クイズ型」と区別する。

### 6.2 slide-data.json スキーマ拡張（IG）

既存の `type1`（definition）/ `type3`（quiz）に加え、角度型スライドを `meta.angle` で識別する。スライド構造そのものは cover + 本文 + cta の汎用 7 枚を踏襲し、**角度ごとに cover コピーと本文の論理展開テンプレを切り替える**（過去の汎用要約失敗を避けるため、テンプレは角度別に論理骨子を持たせる）。

| `angle` | cover コピーの型 | 本文の論理骨子 |
|---|---|---|
| `conclusion` | 言い切り見出し | 結論 → 根拠 3 点 → 一言補足 |
| `reason` | 「なぜ〜なのか」 | 問い → 理由 → 具体 → まとめ |
| `experience` | 一人称フック | 状況 → つまずき → 気づき（断片）→ note 誘導 |
| `counter` | 「〜は間違い／逆」 | 通説 → 反証 → 正しい理解 → 行動 |
| `number` | 数字を主役にした見出し | 数字 → 意味 → 受験への含意（出典明記） |
| `howto` | 「〜の手順／コツ」 | 手順 N ステップ → 注意点 → サイト誘導 |

> [!warning] cover CTA のモード分岐
> Reels では cover CTA を Reels モードで分岐させる（カルーセル流用 CTA の禁止。[01_SNS集客戦略.md §6](../../../docs/project/03_SNS/01_SNS集客戦略.md)）。角度型でも同じ分岐を踏襲する。

### 6.3 X 投稿型との対応

[x-post-policy.md §5](./x-post-policy.md) の投稿型は本ポリシーの角度に内包される。対応は次のとおり（X 側は `angle` を投稿型として表現する）。

| x-post-policy の投稿型 | 対応する `angle` |
|---|---|
| キーワード解説 | `reason`（定義の核）/ `number`（数値があるとき） |
| 過去問 1 問 1 答 | （角度外・過去問クイズ型） |
| 引っかけ集 | `counter` |
| 暗記フレーズ集 | `howto` |
| （新）合格者の思考・体験の断片 | `experience` |
| マガジン宣伝 | `conclusion`（メリット）＋ note 送客 |

### 6.4 評価軸への追加

各 Evaluator（`x-post-qa` / `ig-carousel-qa` / `ig-reels-qa` 等）のルーブリックに「**角度の純度**」を含意させる。既存の「論点の的確さ」軸で次を確認する。

- 主角度が 1 つに絞れているか（混在で訴求がぼやけていないか）
- `experience` がフル放出になっていないか（Red Line 1）
- `number` の数値に出典があるか（Red Line 2）

## 7. パイロット計画

全角度を一斉量産せず、効果が出やすく在庫もある 2 角度で試走し、計測してから横展開する。

| # | `angle` | チャネル | 源 | 計測指標 |
|---|---|---|---|---|
| P-1 | `counter` | IG Carousel | note「キーワード集が点にならない理由」 | 保存数 / リーチ |
| P-2 | `experience` | X | note 公務員クラスター（断片化） | プロフィール遷移 / リプライ |

判定: 既存の過去問パックの平均保存数・リーチと比較し、上回れば角度別配信を週次運用へ組み込む。

## 8. やらないこと

- **角度別にエージェント/スキルを新設する**（`exam` 同様、媒体 × G/E 分業に `angle` を足すだけ）
- **サイト/note 本文の verbatim 転記**（§5-3）
- **`experience` のフル受験記を SNS で放出**（§5-1、note 有料の囲い込みを割らない）
- **出典なしの数字を権威付けに使う**（§5-2）
- **1 投稿に複数角度を詰め込む**（主角度 1 つに絞る、§2 末尾）

## 参照

- 戦略: [01_SNS集客戦略.md](../../../docs/project/03_SNS/01_SNS集客戦略.md)（コンテンツ角度フレームワーク節）/ [02_チャネル動線設計.md](../../../docs/project/03_SNS/02_チャネル動線設計.md)（UTM・季節）
- パラレルポリシー: [x-post-policy.md](./x-post-policy.md) / [ig-carousel-skill.md](./ig-carousel-skill.md) / [ig-reels-policy.md](./ig-reels-policy.md) / [ig-stories-policy.md](./ig-stories-policy.md)
- 資産源: [note 技術士総監コンテンツ計画](../../../docs/note/技術士総監/noteコンテンツ計画.md) / [1級土木集客記事クラスター](../../../docs/note/1級・2級土木/1級土木/1級土木-集客記事クラスター.md)
- 数値検証: `note-fact-checker` エージェント（数字角度の突合）
