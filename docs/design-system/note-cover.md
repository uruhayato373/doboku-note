# note カバー画像デザイン仕様（G2「全幅バナー帯」）

note 記事・有料マガジンのカバー画像（1280×670）の真実源仕様。値の SSoT は [`note-cover-tokens.json`](note-cover-tokens.json)。本書はレイアウト意図と運用ルールを説明する。

> 出典: claude.ai/design プロトタイプ「G2 案」（handoff `covers-g2-all.jsx`）を satori 本番レンダラへ移植。

## 設計のねらい

1. **試験が一目でわかる** — note には 技術士総監 / 1級土木 / 2級土木 / 共通 の記事が混在する。フィード・リンクカードで**ベース色**だけで試験区分が判別できることを最優先する。
2. **キーワードが刺さる** — タイトルを「リード文 → 強調キーワード → 全幅バナー帯 → アイコンチップ3つ」に分解し、サムネでも要点が読める構造にする。
3. **ブランド一貫性** — warm な紙面背景＋薄いグリッド＋同心円装飾で doboku-note の図版トーンに揃える。

## 二軸カラーモデル：試験=色 / 系列=濃淡

色は2軸で決まる。

### 軸1: 試験区分 = ベース色（hue）

`docs/note/{dir}/` のトップ階層から試験を解決する。

| 試験 | dir | hue | base |
|---|---|---|---|
| 技術士（総合技術監理部門） | `技術士総監` | navy | `#16365C` |
| 1級土木施工管理技士 | `1級土木` | azure | `#1E73C8` |
| 2級土木施工管理技士 | `2級土木` | green | `#2A7050` |
| 1級・2級土木施工管理技士 | `1級・2級土木` | azure | `#1E73C8` |
| 土木・建設 共通 | `共通` | bronze | `#9A6B1E` |

1級（azure）と2級（green）は「土木施工管理技士」の兄弟資格だが、青系 / 緑系で明確に判別できるよう離した。1級・2級横断の `1級・2級土木` dir（メンバーシップの共通リードマグネット等）は 1級の azure を流用する。総監は最難関の anchor として既存ブランドの濃紺を継承。共通は暖色で「横断・中立」を示す。

### 軸2: 系列 = 濃淡（tone）

同一試験内で、バナー帯 / HiBox に使うトーンを `deep | base | soft` から選ぶ。解決優先順は：

1. frontmatter `cover.tone` の明示値
2. `notePricing: paid` → `deep`（有料=本命=最も濃い）
3. `notePricing: free` → `base`
4. それ以外 → `base`

有料マガジンは最も濃いトーンで「本命商品」感を出し、無料記事は標準トーンにする。

## レイアウト（1280×670）

```
┌────────────────────────────────────────────────┐
│ [ロゴ] doboku-note            無料記事 ／ メタ →  │  上端: ロゴ(左) / メタ(右)
│                                                  │
│              リード文（37px・中央）               │  upper.top=122
│        ┌──────┐                                  │
│        │ 強調 │  hiSuffix（58px）                 │  HiBox(試験色) + 接尾語
│        └──────┘                                  │
│                                                  │
│ ████████  全幅バナー帯（試験色・最重要）  ████████ │  banner.top=392 全幅
│                                                  │
│   (◯チップ1)   (◯チップ2)   (◯チップ3)          │  bottom=36 中央寄せ3個
└────────────────────────────────────────────────┘
```

幾何の数値は [`note-cover-tokens.json`](note-cover-tokens.json) の `layout` を参照。

### セーフエリア（中央 630×630）

note のリンクカード・サムネ・SNS は中央 **630×630** を正方形クロップする。

- **クロップで残す（必ず中央に）**: リード文 / 強調キーワード(HiBox) / バナー帯テキスト
- **クロップで切れて良い**: ロゴ（左上）/ メタ（右上）/ 両端のチップ

バナー帯は全幅 bleed だが**テキストは中央寄せ**なので正方形でも残る。チップは3個中央寄せのため、横長タイトル時は両端チップが切れることがある。最重要メッセージは必ず**バナー帯**に置くこと。

### 自動フォントサイズ

- **バナー帯**: 文字数で 110 / 94 / 80 / 70px に段階調整（`layout.banner.fontSizeSteps`）。7〜11字推奨。
- **HiBox**: 既定 112px。長い強調語は縮小。

## frontmatter `cover:` ブロック

G2 で描くにはタイトル分解データが要る。`cover:` があれば G2、無ければ従来の `coverTitle`（mono-tag）にフォールバックする。

```yaml
cover:
  leadIn: "1級土木施工管理技士"
  hi: "安全"
  hiSuffix: "管理の経験記述"
  banner: "完成答案と添削"
  meta: "有料マガジン ／ ¥1,980"
  tone: deep            # 任意。省略時は notePricing から自動
  chips:
    - { icon: doc,    text: "完成答案" }
    - { icon: edit,   text: "添削例つき" }
    - { icon: check,  text: "減点ポイント" }
```

- `hi` は色ボックスに入る短語（1〜4字目安）。`banner` が最重要（正方形でも残る）。
- `chips` は**必ず3個**。`icon` は `icons.catalog`（pen/clock/doc/edit/calendar/chart/check/target/book/layers/bulb/flag/yen/map）から選ぶ。
- 価格・ID は本文・frontmatter に直書きしない方針（[note-magazines.ts が SoT]）だが、`cover.meta` は画像内表記なので例外的に短い文言を許容する。

## 生成・検証

```bash
# G2 cover ブロックがある記事だけ G2、無ければ mono-tag
node scripts/generate-note-covers.mjs                       # 全件
node scripts/generate-note-covers.mjs 1級土木                # slug 前方一致
node scripts/generate-note-covers.mjs 安全管理 --debug-safety # 中央630赤枠を重畳
```

`--debug-safety` で中央 630×630 の赤枠を重ねて、最重要テキストがクロップ内に収まるか目視する。

## 関連

- 値 SSoT: [`note-cover-tokens.json`](note-cover-tokens.json)
- レンダラ: `.claude/skills/conversion/ogp-create/scripts/lib/ogp-templates.mjs`（`renderNoteCoverG2`）
- ジェネレータ: `scripts/generate-note-covers.mjs`
- Skill: `.claude/skills/conversion/ogp-create/SKILL.md`
- OGP（サイト 1200×630）は別系統の `mono-tag` テンプレ（試験色分けなし、サイト内 OGP 専用）
