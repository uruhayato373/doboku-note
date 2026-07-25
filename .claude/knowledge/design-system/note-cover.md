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
│ 執筆: 技術士（総監・建設）・1級土木 元発注者      │  ロゴ直下: 資格クレジット(15px)
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
- **クロップで切れて良い**: ロゴ（左上）/ **資格クレジット（ロゴ直下・2026-07-20〜）**/ メタ（右上）/ 両端のチップ

資格クレジットは全カバー一律の E-E-A-T 常時表示（文言 SSOT = `ogp-templates.mjs` の `AUTHOR_CREDENTIAL_G2`。`cover.credential: false` で個別抑止・時事文言は入れない）。フル表示時の信頼シグナル役なのでセーフエリア外で許容。

バナー帯は全幅 bleed だが**テキストは中央寄せ**なので正方形でも残る。チップは3個中央寄せのため、横長タイトル時は両端チップが切れることがある。最重要メッセージは必ず**バナー帯**に置くこと。

ただし banner は「工事名の列挙」「選択科目II-1 専門知識｜模範解答」など**意味的に縮められない descriptive テキストが正規**で、実態では多くが 7〜11 字を超える。長い banner はフル 1280 幅では綺麗に収まるが、**正方形 630 クロップでは両端が切れる**——要点（gist）が中央に来るよう語順を組めば許容する前提。短く要点だけにできる無料記事系は 7〜11 字に収めると四角サムネでも全文残る。

### 自動フォントサイズ

- **バナー帯**: `renderNoteCoverG2` の `bannerFontSize` が中央 630 クロップ安全幅（590px）に収まるよう **48〜110px へ連続的に自動縮小**する（`layout.banner.fontSizeSteps` は読み物用の目安で、実装は連続式）。7〜11 字なら大きく出て四角クロップでも全文残る。超過しても 48px floor でフル 1280 幅には収まる（前項の descriptive 許容）。**フル幅すら超えて画面外で切れる "真の溢れ" は `check-note-cover-fit` が機械検出**する。
- **HiBox**: 既定 112px。長い強調語は 92 / 76px に縮小。`hi` ＋ `hiSuffix`（58px）が左右 padding 60px を除く 1160px を超えると上段が画面外で切れる（同チェックが検出）。

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
- `chips` は**必ず3個**。`icon` は `icons.catalog`（pen/clock/doc/edit/calendar/chart/check/target/book/layers/bulb/flag/yen/map/award）から選ぶ。`award`（メダル）は実績・的中チップ用（2026-07-20 追加）。
- 価格・ID は本文・frontmatter に直書きしない方針（[note-magazines.ts が SoT]）だが、`cover.meta` は画像内表記なので例外的に短い文言を許容する。

## 生成・検証

```bash
# G2 cover ブロックがある記事だけ G2、無ければ mono-tag
node scripts/generate-note-covers.mjs                       # 全件
node scripts/generate-note-covers.mjs 1級土木                # slug 前方一致
node scripts/generate-note-covers.mjs 安全管理 --debug-safety # 中央630赤枠を重畳
```

`--debug-safety` で中央 630×630 の赤枠を重ねて、最重要テキストがクロップ内に収まるか目視する。

```bash
# 全 cover を1枚 HTML で一覧目視（OGP の ogp-gallery と対称・資格×種別で絞込）
npm run note-cover-gallery        # → .tmp/note-cover-gallery.html（--open で既定ブラウザ起動）

# banner/hi/hiSuffix/leadIn がフル1280幅を超えて画面外で切れる "真の溢れ" を機械検出
npm run check-note-cover-fit      # CI/手動（0件必須）。pre-commit は --staged を自動実行
```

`check-note-cover-fit` は `renderNoteCoverG2` のレイアウト式（`bannerFontSize`/`hiFontSize`・上段 1160px・banner 1280px）をミラーする回帰ゲート。「7〜11字推奨」超過は**検出しない**（descriptive banner は正規）。検出するのは画面外クリップのみ。

## ライブ反映（公開後の stale カバー解消）

`cover.png` を再デザインしても、**公開済み note 記事のカバーは自動では更新されない**（ソース→ライブ非同期）。stale 判定は `cover.png` の git 最終コミット日 > frontmatter `notePublishedAt`。差し替えはブラウザ自動化で行う。

```bash
# DRY（差し替え load 確認まで・保存しない）
npm run note-update-cover -- --article docs/note/.../article.md
# ライブ反映（公開に進む→更新する）。複数は --list で
npm run note-update-cover -- --list .tmp/list.txt --commit
```

- 本文を一切触らず eyecatch だけ差し替えるため、**有料記事の paywall 境界は自然保持**される（`note-update-body` の境界「再設定」は不要。本ツールは境界 line の present を読み取り検証するのみで line を動かさない）。
- fail-safe：新カバー load 未確認／有料境界 line 未確認なら「更新する」を押さない（coverless 化・paywall 開放を防ぐ）。
- 永続プロファイルは 1 Chrome のみ＝**並列不可・逐次**。大量は 20-28 件チャンク×background 逐次で。
- 反映後は note API v3 で `eyecatch` 新 ID・`can_read=false`・`price` 不変 を**実体検証**する（proxy 不可）。詳細 → [note-api-verification.md](../reference/note-api-verification.md)

## Crop-safe V4（`cover.variant: crop-safe-v4`・**既定**・2026-07-24〜）

表示面ごとのトリミング（正方形 630×630／一覧 1280×454／狭ヘッダー 1280×216／リンクカード／関連記事）で**重要文字を切らない**variant（現行の既定）。G2 の「長文 banner は正方形で両端切れ許容」を V4 は採用せず、`headline / hi+hiSuffix / benefit`（マガジンは `magazineName / qualifier / proof / benefit`）を三重安全領域（square/list/core-safe）の中央 590px に一行で収める（入らなければ生成エラー・chips 不使用・AI 背景素材 `visualAsset` は任意でフォールバックあり）。

- **仕様 SSOT**: [`note-cover-crop-safe-v4.md`](note-cover-crop-safe-v4.md) ／ 値: [`note-cover-tokens.json`](note-cover-tokens.json) `layout.cropSafeV4`
- **状態**: **全量移行済み・V4 が既定**（2026-07-24〜25: パイロット 6/6 合格 → 全 715 記事＋46 マガジンを V4 化・G2 残 0 → note.com ライブ反映 702/706＋36/36 誌完了）。本ファイルの G2 記述はレガシー仕様の記録（新規に G2 を書かない）
- 検証: `npm run check-note-cover-fit`（V4 は 590px フィットをエラー検査）／ 6 表示面プレビュー `node scripts/note-cover-gallery.mjs --crops`

## 関連

- 値 SSoT: [`note-cover-tokens.json`](note-cover-tokens.json)
- レンダラ: `.claude/skills/conversion/ogp-create/scripts/lib/ogp-templates.mjs`（`renderNoteCoverG2` / `renderNoteCoverCropSafeV4`）
- ジェネレータ: `scripts/generate-note-covers.mjs`
- Skill: `.claude/skills/conversion/ogp-create/SKILL.md`
- OGP（サイト 1200×630）は別系統の `mono-tag` テンプレ（試験色分けなし、サイト内 OGP 専用）
