---
name: ogp-create
description: >
  doboku-note サイト OGP 画像（1200×630 PNG）を生成する。共通テンプレ T06 Mono Tag に統一済み。
  全幅レイアウト（最大 76px タイトル）＋資格別テーマ色 16px 外枠・4 層の日本語改行戦略。同じテンプレ実装は note カバー（1280×670）でも `scripts/generate-note-covers.mjs` 経由で再利用される。
  Use when user asks to [OGP作成, OGP生成, サムネ作成, /ogp-create].
---

## 用途

MDX ページの OGP 画像（1200×630 PNG）を、共通テンプレ T06 Mono Tag で自動生成する。
新規記事公開時・タイトル変更時・テンプレ差し替え時に使う。

note 公開用ドラフト（`docs/note/`）のカバー画像（1280×670）も同じテンプレロジックを共有するため、両者で見た目が完全一致する。

> **デザインの真実源（SSOT）は [`docs/reference/ogp-prompts.md`](../../../../docs/reference/ogp-prompts.md)**。レイアウト・配色・テーマ色・変更履歴はそちらで管理する。本 SKILL.md は運用（コマンド・引数・改行・トラブルシュート）を担う。OGP デザインを変更したら両方を同一コミットで更新する。

## 引数

| 引数 | 必須 | 説明 | 例 |
|---|---|---|---|
| slug | — | フル slug（`{category}-{localSlug}`）。省略時は `--all` が必要 | `pe-comprehensive-management-mbo` |
| `--all` | — | 全ページを対象にする | |
| `--force` | — | 既存の `ogp.png` があっても上書き | |
| `--dry-run` | — | マッピング結果のみ表示、ファイル生成しない | |
| `--template <id>` | — | テンプレを強制指定（現状 `mono-tag` のみ） | `--template mono-tag` |
| `--debug-wrap` | — | 改行結果とフォントサイズを stdout に一覧（ファイル生成なし） | |

> `--debug-safety` は中央 630×630 の赤枠を重ねる（旧クロップ前提の検証用・現役）。ただし mono-tag は 2026-06-16 に全幅化したため、タイトルが枠を超えて描かれるのが正常。mono-tag の目視検証は OGP ギャラリー（`npm run ogp-gallery`、下記）で行う。赤枠は中央クロップ耐性が要る note-cover-g2 でのみ意味を持つ。

## テンプレート

> [!important] 現在の既定＝ライト写真前面（2026-07-02〜）
> サイト OGP の既定は **ライト写真前面**（資格別ブランド写真＋淡スクリム＋濃色文字・kicker/主題/subtitle/種別バッジ）。`npm run ogp` は既定でこれを出す。**旧ダーク配色は `--dark` フラグ**で描画（2026-06-29〜2026-07-02 の旧既定）。背景写真は Codex 生成のブランド写真プールで、`.claude/config/ogp/backgrounds/<exam-key>.png` に置き `resolveBackgroundImage` が解決する。真実源＝[`docs/reference/brand-image-system.md`](../../../../docs/reference/brand-image-system.md)（プール・色統一）＋[`ogp-prompts.md`](../../../../docs/reference/ogp-prompts.md)「変更履歴」。下表の `mono-tag` 行の「warm off-white／16px 外枠」等は旧ライト仕様の記述で、現行の写真前面既定とは一致しない点に注意（詳細仕様は上記 SSOT を参照）。

| ID | 用途 | デザイン |
|---|---|---|
| `mono-tag` | サイト OGP（1200×630）共通（T06） | warm off-white 背景 + 薄い濃紺グリッド + シアン/紺アクセントバー + Navy カテゴリチップ + **全幅・縦中央寄せ大タイトル（最大76px）** + **資格別テーマ色 16px 外枠**（下部メタ・タグラインは撤去済み）。**任意で資格別 AI 背景**（あり時は最背面に画像＋可読性スクリム `rgba(253,252,248,0.7)`／なし時は上記オフホワイト固定・後方互換、下記「資格別 AI 背景」） |
| `magazine-banner` | note マガジンヘッダー（1280×670） | 中央 1280×216 帯クロップ対応。`generate-magazine-covers.mjs` 専用 |
| `note-cover-g2` | note 記事カバー（1280×670） | 全幅バナー帯。**試験区分=ベース色 / 系列=濃淡** で 1級土木・2級土木・総監・共通 を色で判別。リード文→強調キーワード(HiBox)→全幅バナー帯→チップ3つ |

過去 Phase で 5 種テンプレ（navy-white / dark-wood / red-line / blackboard / dark-grid）を併用していたが、2026-04-29 に T06 Mono Tag に統一（理由: SNS シェアでブランド一貫性を担保 + メンテ単純化）。**旧**テンプレの背景画像 (`assets/fonts/ogp-backgrounds/*.png`) は履歴として残置しているが現在は参照されない。新しい資格別 AI 背景は別系統で `.claude/config/ogp/backgrounds/<exam-key>.png|webp|jpg` に置き、`ogp-create.mjs` の `resolveBackgroundImage` が参照する（任意・未配置なら従来のオフホワイト+グリッドにフォールバック。下記「資格別 AI 背景」）。

**note 記事カバーは `note-cover-g2`（2026-05-29 追加）が標準**。サイト OGP（`mono-tag`）とは別系統で、note のフィード・リンクカードで試験区分が色で一目でわかることを優先する。値の真実源は [`docs/design-system/note-cover-tokens.json`](../../../../docs/design-system/note-cover-tokens.json)、仕様は [`docs/design-system/note-cover.md`](../../../../docs/design-system/note-cover.md)。

## 全幅レイアウト（2026-06-16〜）

mono-tag は **全幅レイアウト**。左右 72px パディング内に、**最上段の 1 行メタ（資格名 kicker＝左・30px 塗りチップ＋種別ピル＝右・テキストのみ）→ タイトル（縦中央寄せ）**を左寄せで積み、**ワードマークは右下へ従属配置**する。タイトルは `safetyWidth: 1010px`（`.claude/config/ogp/text.json`）に収まる最大フォント（上限 76px）で大きく描く。背景写真の上に淡スクリム、外周に資格別テーマ色 16px 外枠。**装飾ライン（旧・左上シアン/右下紺のアクセントバー）と資格名の ▶ マーカー・種別バッジの装飾アイコンは 2026-07-07 に撤去**（text-forward トレンド準拠。詳細は SSOT ogp-prompts.md の変更履歴）。旧レイアウト＝ワードマーク左上→カテゴリチップ→タイトルの縦積み（〜2026-07-07）。

旧「中央 630×630 セーフティゾーン」制約は mono-tag では撤廃した（外部リンクカードでの可読性優先）。中央 1:1 クロップ耐性が必要な **note-cover-g2**（note 記事カバー）は引き続き中央セーフ幅 590px を厳守する別系統。背景・経緯は [`docs/reference/ogp-prompts.md`](../../../../docs/reference/ogp-prompts.md)「変更履歴」を参照。

## 資格別テーマ色（16px 外枠）

外枠 16px を資格区分のテーマ色で描き、サムネ一覧でも分野が色で判別できる。**色の真実源は [`docs/design-system/note-cover-tokens.json`](../../../../docs/design-system/note-cover-tokens.json) の `exams[].base`**（note カバーと共通・二重管理しない）。`ogp-create.mjs` の `CATEGORY_TO_EXAM_KEY` がカテゴリ→exam key を解決し、`resolveAccentColor()` が base 色を返す（未マッピングは既定ネイビー `#0f1e3f`）。色の対応表は ogp-prompts.md「テーマ色」を参照。新カテゴリ追加時は **`CATEGORY_TO_EXAM_KEY` + `note-cover-tokens.json` + ogp-prompts.md** を更新する。

## 資格別 AI 背景（任意・2026-06-18〜）

mono-tag は資格ごとに **AI 生成背景**を最背面に任意で敷ける。文字・ブランド枠は satori が正確に描き、背景は下地。**背景なしは完全後方互換**（従来のオフホワイト+グリッド）。デザイン仕様の真実源は [`ogp-prompts.md`](../../../../docs/reference/ogp-prompts.md)「資格別 AI 背景」。

- **置き場**: `.claude/config/ogp/backgrounds/<exam-key>.png|webp|jpg`（資格ごと1枚を全記事で共有）。`resolveBackgroundImage(category)` が解決し、無ければオフホワイトにフォールバック。
- **生成**: `npm run ogp-backgrounds`（`scripts/generate-ogp-backgrounds.mjs`）。`GEMINI_API_KEY`（`.env.local`）が要る。未設定だとプロンプトのプレビューのみ表示して終了。

```bash
npm run ogp-backgrounds -- --all --dry-run   # 6資格のプロンプト確認（API 呼ばない）
npm run ogp-backgrounds -- --all             # 全資格生成（既定 --mode flash=gemini-2.5-flash-image）
npm run ogp-backgrounds -- --exam civil-1 --force --mode imagen   # 単一・imagen-4.0
npm run ogp -- --all --force                 # 既存 OGP へ焼き込み（任意。新規記事は通常生成で自動反映）
```

- **可読性**: 生成時に平均輝度 ~202 へ正規化（暗い出力だけ白ブレンド）＋描画時にスクリム `C_SCRIM`（既定 0.7）。強すぎ/弱すぎは `ogp-templates.mjs` の `C_SCRIM` alpha で調整。
- **コスト**: 画像生成は従量課金。AI Studio キーは GCP の Generative Language API に Quota（1日上限）を設定して上限管理（予算アラートは通知のみ）。

## QA: OGP ギャラリー

一括再生成後の目視チェックは `npm run ogp-gallery` で行う（`scripts/ogp-gallery.mjs`）。`.local/r2/posts/**/ogp.png` を 1 枚の HTML グリッドに一覧化し、カテゴリ別フィルタで長タイトルのはみ出し・改行崩れ・テーマ色枠・余白をまとめて確認できる。

**ガイド主題フォントの均一ゲート**: `npm run check-ogp-title-fit`（`scripts/check-ogp-title-fit.mjs`）。ガイド（`group: guide`）の OGP 主題を実 wrap+pickFontSize で算出し、56px 未満（長すぎて小さい）を赤落ち検出。`--staged` は pre-commit（編集ガイドのみ・install-pre-commit 済）、`--all` は全件フォント一覧（バーンダウン）。規約は ogp-prompts.md「ガイドOGPタイトルの統一」。

```bash
npm run ogp -- --all --force   # 全 ogp.png を再生成
npm run ogp-gallery -- --open  # .tmp/ogp-gallery.html を生成しブラウザで開く
```

## 4 層の日本語改行戦略

タイトルは以下の優先度で改行される:

| Layer | 戦略 | 説明 |
|---|---|---|
| 1 | `frontmatter.ogp.title` の `\n` | 明示改行を最優先で尊重 |
| 2a | 記号直前改行 | `（` `：` `〜` `──` 等の直前で分割、マーカーは次行先頭に残す |
| 2b | 区切り文字分割 | 半角・全角スペースで分割、スペース自体は破棄 |
| 3 | BudouX（初期無効） | `text.json` で `budouX.enabled: true` + `npm i budoux` で有効化 |
| 4 | 文字数フォールバック | `charCountFallback: 13` 字ごとに機械的に折り返し |

`--debug-wrap` で各ページの実際の改行結果を確認できる:

```bash
node .claude/skills/conversion/ogp-create/scripts/ogp-create.mjs pe-comprehensive-management-mbo --debug-wrap
# → lines: ["目標管理制度", "（MBO）"] / fontSize 54 / template mono-tag
```

## フォントサイズの決定ロジック

`pickFontSize` は `text.json` の `fontSizeTable`（`[76, 68, 60, 54, 48, 42]`）を上から試し、**全ての行が `safetyWidth=1010` に収まる最大サイズ**を選ぶ。全幅レイアウトのデザイン上限は 76px。

- 全幅日本語 1 文字 ≈ `fontSize × 1.0` 幅
- 半角英数記号 1 文字 ≈ `fontSize × 0.58` 幅

で実効幅を近似（Noto Sans JP Bold の経験値）。

## 実行手順

### ケース1: 単一ページの OGP 生成

```bash
node .claude/skills/conversion/ogp-create/scripts/ogp-create.mjs pe-comprehensive-management-mbo
```

既存 `ogp.png` があればスキップ。強制上書きは `--force`。

### ケース2: 全ページ生成

```bash
node .claude/skills/conversion/ogp-create/scripts/ogp-create.mjs --all          # 未生成分のみ
node .claude/skills/conversion/ogp-create/scripts/ogp-create.mjs --all --force  # 全て再生成
```

### ケース3: マッピング確認（ファイル生成なし）

```bash
node .claude/skills/conversion/ogp-create/scripts/ogp-create.mjs --all --dry-run
```

### ケース4: タイトル改行のチューニング

```bash
node .claude/skills/conversion/ogp-create/scripts/ogp-create.mjs pe-comprehensive-management-management-tradeoffs --debug-wrap
node .claude/skills/conversion/ogp-create/scripts/ogp-create.mjs --all --debug-wrap | less
```

気に入らないページは `frontmatter.ogp.title` で上書きする（下記参照）。

## frontmatter でのオーバーライド

```yaml
---
title: "総合技術監理における5管理間トレードオフ 頻出パターンと解決フレーム"
category: "pe-comprehensive-management"
ogp:
  title: "5管理間\nトレードオフ分析"  # 自動改行より優先（\n で明示改行）
---
```

手動で作成した OGP を保護したい場合は:

```yaml
ogp:
  skip: true   # このページは生成スキップ
```

### 過去問ページの per-page 規約（2026-06-29 確定・真実源は ogp-prompts.md）

同じ「過去問」でも資格の構造で主題が変わる（揃えないのが正解＝情報粒度の違いの反映。体裁は kicker/バッジ/色で共通化済み）。**原則**＝下位区分（科目/分野/科目区分）があればそれを主題（1行）＋文脈をサブ（A3）／無ければ年度＋種別を1段。資格名は常に kicker。**サイズ均一化**＝主題は幅に auto-fit するため、年度の字数だけが違う（平成2X=6字↔令和X=5字）シリーズは主題を固定文字列にし年度をサブへ逃がして揃える（科目/分野が可変なら差は許容）。

- **建設部門 選択科目（`pe-construction/r0X-{科目}`）= A3**: `ogp.title` ＝**科目名のみ・改行なし1行**（`\n` を入れない。長い科目もフォント自動縮小で1行に収まる）、`ogp.subtitle` ＝ `令和X年度 選択科目 過去問`。必須は `ogp.title: 必須科目I` ＋ `令和X年度 過去問`。
- **技術士第一次（`pe-first-stage`）**: `ogp.title` ＝ 科目区分（`基礎科目`/`適性科目`/`専門科目（建設部門）`）＋ `令和X年度 過去問`。
- **総監（`pe-comprehensive-management/{hXX,r0X}-{primary,secondary}`）= 1段**: `ogp.title` ＝ `shortTitle`（例 `平成21年度 記述式`）、サブは付けない（`総合技術監理部門 …` は kicker と重複）。
- **コンクリート主任技師（`concrete-chief-engineer/primary-*`）**: `ogp.title` ＝ 分野名（`shortTitle`）＋ `過去問解説`。
- **1級・2級土木 一次（`civil-construction-{1,2}/primary-*`）= 主題固定**（サイズ均一化）: 1級 `ogp.title: 第1次検定 問題A`/`問題B`、2級 `第1次検定 前期`/`後期`、サブ＝`{年度} 過去問`。二次（`secondary-*`）の分類は **過去問グループ＝年度試験 `secondary-rXX` のみ**。topic の `-basics`/`-past-problems`/`-experience-writing`/`-examples` は学習ガイド＝`group: guide`（過去問と銘打つのは年度試験に限る）。**二次の年度試験は一次と表現統一**＝`ogp.title: 第2次検定` ＋ サブ `{年度} 過去問`。topic ガイドの主題はトピック名で自動導出可（手動不要）。
- 全資格の per-page 規約の真実源は [`ogp-prompts.md`](../../../../docs/reference/ogp-prompts.md)「過去問ページの per-page 規約」。

## テンプレート追加手順（将来テンプレを増やす場合）

1. `.claude/skills/conversion/ogp-create/scripts/lib/ogp-templates.mjs` の `renderers` に新しい render 関数を追加（`renderTemplate(id, props, { width, height })` のシグネチャに従う）
2. `.claude/config/ogp/templates.json` にテンプレ定義を追加（ID・説明）
3. `docs/reference/ogp-prompts.md` に出典プロンプトと用途を記録
4. `.claude/config/ogp/rules.json` の `default` または `rules[]` で出し分けルールを追加
5. `--template <新ID> --dry-run` で動作確認

## 出力先

`.local/r2/posts/{category}/{localSlug}/ogp.png`

`src/lib/r2-image-loader.ts` の `getOgpImageUrl` が返す URL と 1:1 対応する。
本番配信は `https://storage.doboku-note.com/posts/{category}/{localSlug}/ogp.png`。

## note カバー（兄弟スクリプト・G2 試験色分け）

`scripts/generate-note-covers.mjs` が `docs/note/{slug}/img/cover.png`（1280×670）を出力する。テンプレロジックは本スキルが真実源。

- **article.md に `cover:` ブロックがあれば `note-cover-g2`**（試験色分け・全幅バナー帯）で描画。
- **無ければ `mono-tag`**（`coverTitle` から）にフォールバック。
- 試験区分は `docs/note/{技術士総監,共通,...}/` のトップ dir、または `1級・2級土木/{1級土木,2級土木}/` の級サブ dir から（パスセグメント一致で）自動解決し、ベース色を決める（1級=青/2級=緑/1級・2級土木 直下=civil-1-2）。系列(濃淡)は `notePricing`（paid→濃 / free→標準）または `cover.tone` で決まる。

```bash
node scripts/generate-note-covers.mjs            # 全 note 記事
node scripts/generate-note-covers.mjs 1級土木    # slug 部分一致で対象を絞る
node scripts/generate-note-covers.mjs 安全管理   # slug 部分一致で 1 記事だけ再生成
npm run note-cover-gallery                        # 全 cover を1枚 HTML で目視（OGP の ogp-gallery と対称・資格×種別で絞込）
npm run check-note-cover-fit                      # banner/hi/leadIn がフル1280幅超で画面外に切れる"真の溢れ"を検出（0件必須・pre-commit でも --staged）
npm run note-update-cover -- --list <file> --commit  # 公開済み記事の stale カバーをライブ差し替え（有料 paywall 保持・本文不触）
```

> banner は工事名列挙・科目名等の **descriptive テキストが正規**で 7〜11 字超を許容（`bannerFontSize` が 48px まで自動縮小しフル幅には収まる／正方形クロップで両端が切れるのは想定内）。`check-note-cover-fit` が止めるのは**フル幅すら超えて画面外で切れる**ケースのみ。真実源 [`note-cover.md`](../../../../docs/design-system/note-cover.md)。

### `cover:` ブロック（G2 を出すための frontmatter）

```yaml
cover:
  leadIn: "1級土木施工管理技士 二次"   # 上部リード文（37px）
  hi: "安全"                          # 強調キーワード（色ボックス HiBox）
  hiSuffix: "管理"                    # HiBox 直後の語（58px）
  banner: "完成答案と添削例"           # 全幅バナー帯。最重要・正方形クロップでも残す（自動で590px幅にフィット）
  meta: "有料マガジン"                 # 右上メタ（任意）
  tone: deep                          # 任意。省略時は notePricing から自動
  chips:                              # 必ず3個。icon は tokens の catalog から
    - { icon: doc,   text: "完成答案" }
    - { icon: edit,  text: "添削例つき" }
    - { icon: check, text: "減点ポイント" }
```

仕様詳細・試験パレット・アイコン一覧は [`docs/design-system/note-cover.md`](../../../../docs/design-system/note-cover.md) と [`note-cover-tokens.json`](../../../../docs/design-system/note-cover-tokens.json) を参照。

## 事前条件

- `.claude/skills/conversion/ogp-create/assets/fonts/NotoSansJP-Bold.ttf` と `Inter-Bold.ttf` が配置済みであること
- `satori` `sharp` `gray-matter` が依存関係に含まれていること（既存済み）

## トラブルシューティング

| 症状 | 対応 |
|---|---|
| `未知のカテゴリ` エラー | `src/config/categories.json` にカテゴリを追加、または frontmatter の `category` を修正 |
| タイトルが大きすぎ/はみ出す・改行が崩れる | `--debug-wrap` で改行とフォントを確認し、`frontmatter.ogp.title` で短い OGP 専用見出しを与える。全体は `npm run ogp-gallery` で目視 |
| 長タイトルで単語が途中で破断 | `frontmatter.ogp.title` で `\n` を使い明示改行、または BudouX を有効化（`text.json` + `npm i budoux`） |
| ルールが効かない | `--dry-run` で実際の解決結果を確認 |

## 参照

- 意匠の素案試作（前段）: `/ogp-design-explore`（aidesigner / Canva の MCP で OGP デザイン案を試作 → 採用方向を本スキルの satori テンプレに実装して量産）
- デザイン SSOT: `docs/reference/ogp-prompts.md`（レイアウト・配色・テーマ色・変更履歴の真実源）
- OGP ギャラリー（一括目視 QA）: `scripts/ogp-gallery.mjs`（`npm run ogp-gallery`）
- テンプレ定義: `.claude/config/ogp/templates.json`
- ルール: `.claude/config/ogp/rules.json`
- 改行・フォント設定: `.claude/config/ogp/text.json`
- レンダラ: `.claude/skills/conversion/ogp-create/scripts/lib/ogp-templates.mjs`（mono-tag / magazine-banner / note-cover-g2 実装の真実源）
- 改行・フォント計算: `.claude/skills/conversion/ogp-create/scripts/lib/ogp-text.mjs`
- エントリポイント: `.claude/skills/conversion/ogp-create/scripts/ogp-create.mjs`
- note カバー: `scripts/generate-note-covers.mjs`（cover: ありは note-cover-g2、無しは mono-tag）
- note カバー G2 仕様・トークン: `docs/design-system/note-cover.md` / `docs/design-system/note-cover-tokens.json`（値の真実源）
