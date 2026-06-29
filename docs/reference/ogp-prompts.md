---
title: OGP デザインリファレンス
---

# OGP デザインリファレンス

doboku-note のサイト OGP / note カバー共通テンプレ T06 Mono Tag の **デザイン真実源（SSOT）**。
OGP デザインはここで継続的に検討・改善する。レイアウト・配色・フォント・テーマ色・変更履歴をこのファイルに記録し、実装（`ogp-templates.mjs`）と常に一致させる。コマンド・引数・トラブルシューティングなど運用面は [`ogp-create` SKILL.md](../../.claude/skills/conversion/ogp-create/SKILL.md) を参照。

- **OGP サイズ**: 1200×630（doboku-note サイト用）
- **note カバーサイズ**: 1280×670（note 公開用ドラフト用、同テンプレを再利用）
- **テンプレ実装**: `.claude/skills/conversion/ogp-create/scripts/lib/ogp-templates.mjs` の `renderMonoTag` が真実源
- **ベースは CSS のみで完結**（背景画像なしでも成立）。文字・ブランド枠は常に satori が正確に描く
- **配色は 2026-06-29 にダークを既定化**（深紺グラデ地＋資格色の明色アクセント）。資格別 AI 生成背景（下記「資格別 AI 背景」、2026-06-18〜）は**ライト地前提のため現ダーク既定では不使用**（暗スクリムで濁るため）。ライト配色は `--light` フラグで描画可能（AI 背景もライト時のみ有効）

## 採用テンプレ: T06 Mono Tag（mono-tag・サイト OGP）

| 観点 | 仕様 |
|---|---|
| 出典 | Claude Design (claude.ai/design) handoff `Doboku Note OGP Handoff.zip` 内 `T06_MonoTag` |
| 出典時期 | 2026-04-29（全幅リデザインは 2026-06-16、下記「変更履歴」参照） |
| 用途 | 全サイト OGP・`cover:` ブロックの無い note カバー（mono-tag フォールバック） |
| レイアウト | **ダーク既定（2026-06-29〜）**: ワードマーク無し。最上段＝**資格名 kicker（大・左）＋ 種別バッジ（右）**、中央＝**主題（大・白）＋サブタイトル（小・淡色）**、左下＝控えめなドメイン。資格名はタイトルから除去し kicker に集約（重複解消）。**ライト（`--light`）**は旧レイアウト＝ワードマーク→カテゴリチップ→タイトル（全幅・縦中央）|
| 配色 | **ダーク既定（2026-06-29〜）**: 深紺グラデ地 `#161d33→#0a0e1a` / タイトル白 `#f5f7fc` / アクセント＝資格テーマ色を白へ 50% 寄せた `accentLight`（紺/藍でも沈まない）/ シアン `#22d3ee`。旧ライト配色（warm off-white `#fdfcf8` / 濃紺 `#0f1e3f` / 本文 `#0a1428`）は `--light` で出せる |
| テーマ色外枠 | 16px の実線外枠を**資格別テーマ色**で描く（下記「テーマ色」参照）。ダークでは `accentLight`（明色化）で描き、暗い資格色でも輪郭が立つ。余白感の解消＋分野の一目識別 |
| フォント | Noto Sans JP Bold。**ダーク主題は最大 88px**（`MAIN_FONT_TABLE`・縦フィットで自動縮小）/ kicker 46px / 種別バッジ 26px / サブ＝主題 ×0.46（最小 26px）/ 左下ドメイン 21px。ライトはタイトル最大 76px |
| 主要要素（ダーク） | **資格名 kicker（accentLight）** / **コンテンツ種別バッジ（右上・accentLight 輪郭ピル）** / **主題（白・大）** / **サブタイトル（淡色・小）** / 左下ドメイン `doboku-note.com` |
| 装飾要素 | グリッド全面（30px fine + 120px major・ダークは白系微光）/ accentLight 16px 外枠（資格テーマ色）。※旧・左上の浮いたシアンバー（80×4・固定シアンで地から浮いていた）は 2026-06-29 に撤去 |

## 2 軸識別: 資格（色）× コンテンツ種別（バッジ）

mono-tag は **資格＝色** と **コンテンツ種別＝右上バッジ** の 2 軸でサムネ一覧での判別性を担保する（note-cover-g2 の「試験区分=色 × 系列=濃淡」と同じ発想、2026-06-28〜）。

- **資格の識別**: ダークは**資格名 kicker＋外枠＋バッジを `accentLight`**（資格色を白へ 50% 寄せた明色）で統一。紺/藍の資格でも深紺地に沈まない。
- **コンテンツ種別バッジ**: 最上段の右端（資格名 kicker の対面）に、**accentLight 輪郭ピル＋ lucide 風アイコン＋短ラベル**で描く（ダークは半透明白地 `rgba(255,255,255,0.08)`、ライトは `rgba(255,255,255,0.86)`）。
- **種別の解決**: frontmatter `group` → `ogp-create.mjs` の `GROUP_TO_TYPE`（`resolveContentType`）。未マッピングの group はバッジ無し＝**完全後方互換**。
- **資格名除去・主題/サブ分割（自動）**: `ogp.title` 未指定時は `ogp-create.mjs` の `deriveTitleParts(title, examLabel, typeLabel)` が、区切り（`｜` `—` `–`）でセグメント分割→各セグメント先頭の資格ラベル語・種別語を除去→先頭=主題・残り=サブに分ける（**最善努力**。事務的な長文タイトル＝過去問等の完璧化は下記の手動指定を推奨）。
- **per-page 手動制御（`ogp.title` / `ogp.subtitle`）**: frontmatter に `ogp.title` を置くと**完全手動モード**になり、`ogp.title`=主題・`ogp.subtitle`=サブとして描く。**`\n` の改行をそのまま尊重**し、自動の資格名除去・記号改行・budoux は行わない（資格名は kicker が出すので主題には入れない）。フォントは横幅に合わせ自動調整。例:
  ```yaml
  ogp:
    title: "河川、砂防及び海岸・海洋"      # 主題（資格名は入れない）。\n で改行位置を明示も可
    subtitle: "令和6年度 選択科目 過去問"  # 省略可
  ```
  1 ページずつ改行を作り込むのはこの方式。プレビューは `npm run ogp -- <fullSlug> --force` 後に当該 `ogp.png` を確認（または `--out-dir .tmp/foo` で非破壊出力）。
- **過去問ページの per-page 規約（2026-06-29 確定）**: 同じ「過去問」でも資格の構造で主題が変わる（**揃えないのが正解**＝情報粒度の違いの正直な反映。共通の体裁は kicker/バッジ/枠/色が担保）。
  - **原則**: 下位区分（科目／分野／科目区分）が**ある**なら、その区分名を主題（1行ヒーロー）にし、年度等の文脈をサブへ＝A3。下位区分が**無い**なら年度＋種別を1段の主題にする。資格名は常に kicker（主題に入れない）。
  - **建設部門 選択科目（`pe-construction/r0X-{科目}`）= A3**: 主題＝**科目名のみ・改行なし1行**（例 `河川、砂防及び海岸・海洋`／長い科目もフォント自動縮小で1行に収める＝`\n` を入れない）、サブ＝`令和X年度 選択科目 過去問`。科目名が差別化＝検索フックなので主役に置く。
  - **建設部門 必須科目I（`pe-construction/r0X-required`）**: 主題＝`必須科目I`、サブ＝`令和X年度 過去問`（選択科目ではないのでサブに「選択科目」を付けない）。
  - **技術士第一次（`pe-first-stage/r0X-{basic,aptitude,construction}`）= A3 系**: 主題＝科目区分（`基礎科目` / `適性科目` / `専門科目（建設部門）`）、サブ＝`令和X年度 過去問`。
  - **総監（`pe-comprehensive-management/{hXX,r0X}-{primary,secondary}`）= 1段**: 科目軸が無いので主題＝**`shortTitle`（例 `平成21年度 記述式` / `令和7年度 択一式`）の1段**、サブは付けない（`総合技術監理部門 …` は kicker と重複するため）。
  - **コンクリート主任技師 過去問解説（`concrete-chief-engineer/primary-*`）**: 主題＝分野名（`shortTitle`・例 `施工` `コンクリートの耐久性`）、サブ＝`過去問解説`。
  - **1級・2級土木（`civil-construction-{1,2}`）**: `title` 自体に資格名を含めない命名のため自動導出で重複せず、手動 `ogp.title` 不要（必要時のみ上書き）。

| `group` | バッジラベル | アイコン |
|---|---|---|
| `guide` | ガイド | `map` |
| `past-exam` / `primary` / `secondary` | 過去問 | `pen` |
| `textbook` | テキスト | `layers` |
| `keyword` | キーワード | `target` |
| `pillar` | まとめ | `flag` |
| 未マッピング | （バッジ無し） | — |

新しい `group` を扱う場合は **この表・`ogp-create.mjs` の `GROUP_TO_TYPE`** を更新する。アイコン名は `ogp-templates.mjs` の `G2_ICON_PATHS` に存在するものを使う（book 等は 19px だと四角に見えて欠字に紛れるため、輪郭が明瞭な map/pen/layers/target/flag を採用）。

## デザインの原則（mono-tag）

1. **共通言語**: doboku-note サイト（1200×630）と note カバー（1280×670）が一目で同シリーズと分かる
2. **全幅・低余白**: タイトルを全幅で大きく描き余白を圧縮する。外部リンクカード（note / X / Slack）の小さなサムネでも読める可読性を最優先（参考: socialplus / commune の大文字・低余白カード）
3. **分野の一目識別**: 16px の外枠を資格別テーマ色にし、サムネ一覧でも分野が色で判別できる
4. **装飾は全幅 OK**: グリッドと 16px 外枠は外周まで延びる。意味のある情報は枠内 72px パディング内に置く
5. **左寄せ・縦中央**: 主要要素は左端基準で縦に積み、タイトルブロックを縦方向中央に寄せて読み物感を担保

> [!note] セーフティゾーン（中央 630×630）は mono-tag では 2026-06-16 に撤廃した。中央 1:1 クロップ耐性が必要な **note-cover-g2** は引き続き中央セーフ幅 590px を厳守する（別系統・下記参照）。

## 資格別 AI 背景（任意・mono-tag）

mono-tag は資格ごとに **AI 生成の背景画像**を任意で敷ける（2026-06-18〜）。文字・ブランド枠は従来どおり satori が正確に描き、背景は「装飾の下地」として最背面に入る。背景ファイルが無ければ従来のオフホワイト＋グリッド（**完全後方互換**）。

- **置き場**: `.claude/config/ogp/backgrounds/<exam-key>.png`（資格ごとに 1 枚を全記事で共有）。`ogp-create.mjs` の `resolveBackgroundImage(category)` が category→exam-key で解決し、無ければ null。exam-key は上の「テーマ色」表と同じ。
- **レイヤー順**（最背面→最前面）: 背景画像（`object-fit: cover`）→ 可読性スクリム（`C_SCRIM`、オフホワイト半透明・既定 **0.7**）→ グリッド/アクセントバー → ワードマーク・チップ・タイトル → テーマ色 16px 外枠。
- **可読性の二重担保**: ① 生成時に各背景を平均輝度 ~202 へ正規化（暗い出力だけ白へ線形ブレンド、明るい出力は不変）② 描画時にスクリムを重ねる。背景が強すぎ/弱すぎは `ogp-templates.mjs` の `C_SCRIM` alpha で一括調整。
- **生成**: `npm run ogp-backgrounds`（`scripts/generate-ogp-backgrounds.mjs`）。`GEMINI_API_KEY`（`.env.local`）で AI Studio の画像モデルを呼ぶ。既定 `--mode flash`（`gemini-2.5-flash-image`）、`--mode imagen`（`imagen-4.0-generate-001`）に切替可。プロンプトは「near-white の淡い地＋テーマ色は細線アクセントのみ・文字なし・左中央は静かに」。flash は稀に画像でなくテキストを返すためリトライ＋「画像のみ返す」指示で吸収。
- **コスト上限**: 画像生成は従量課金。AI Studio 取得キーは GCP の Generative Language API に **Quota（1日上限）**を設定して上限管理する（予算アラートは通知のみで自動停止しない）。
- **既存 OGP への反映**: 背景を追加/更新したら `npm run ogp -- --all --force` で焼き込む（**任意**）。焼き込まなければ既存 OGP は据え置き、新規記事は通常生成で自動的に背景が乗る。

## テーマ色（資格別外枠）

外枠の色は資格区分から自動解決する。**値の真実源は [`docs/design-system/note-cover-tokens.json`](../design-system/note-cover-tokens.json) の `exams[].base`**（note カバーと共通。色の二重管理をしない）。

| カテゴリ（frontmatter `category`） | exam key | テーマ色 |
|---|---|---|
| `pe-comprehensive-management` | `pe-comprehensive` | `#16365C`（濃紺） |
| `pe-first-stage` | `pe-comprehensive` | `#16365C`（濃紺・総監に合わせる） |
| `civil-construction-1` | `civil-1` | `#1E73C8`（青） |
| `civil-construction-2` | `civil-2` | `#2A7050`（緑） |
| `concrete-chief-engineer` | `concrete-chief` | `#0F6E6E`（ティール） |
| `concrete-diagnostician` | `concrete-diagnosis` | `#6E3A8C`（紫） |
| `pe-construction` | `pe-construction` | `#33356B`（藍） |
| 未マッピング | — | フォールバック `#0f1e3f`（既定ネイビー） |

マッピングは `ogp-create.mjs` の `CATEGORY_TO_EXAM_KEY` と `resolveAccentColor()`。新カテゴリを追加したら **この表・`CATEGORY_TO_EXAM_KEY`・`note-cover-tokens.json` の 3 点**を更新する。

## フォントサイズと改行

- `pickFontSize` は `fontSizeTable: [76, 68, 60, 54, 48, 42]`（`.claude/config/ogp/text.json`）を上から試し、**全行が `safetyWidth: 1010px` に収まる最大サイズ**を選ぶ。上限 76px。
- **縦フィット（2026-06-28〜）**: `pickFontSize` は横幅のみ合わせるため、行数が多いと固定の縦スペースを溢れて行が重なっていた。`renderMonoTag` が描画時に **縦スペース（`contentHeight` − ワードマーク行 − チップ）に収まるよう font を `FONT_FLOOR: 34px` まで縮小**し、最小でも収まらない病的な長文だけ **行数をクランプして `…` を付す**（横幅制約は緩めない＝小さくするだけ）。3 行以下は 76px 維持、4 行以上は自動縮小。
- タイトル改行は 4 層戦略（`frontmatter.ogp.title` の `\n` → 記号直前 → スペース分割 → BudouX → `charCountFallback: 13` 字）。詳細は SKILL.md「4 層の日本語改行戦略」。
- 長いタイトル（目安 6 行以上＝`…` でクランプされる）は `frontmatter.ogp.title` に短い OGP 専用見出し（`\n` 改行可）を与えると大きく・切れずに出る。自動生成の長い過去問タイトル（`技術士第二次試験 建設部門 令和X年度 …`）等が該当。

## QA: 全 OGP をギャラリーで確認

一括再生成後の目視チェックは **OGP ギャラリー**で行う（`--debug-safety` は中央 630×630 赤枠を重ねる旧クロップ検証用で、全幅化した mono-tag では枠を超えるのが正常なため目視には使わない）。

```bash
npm run ogp -- --all --force   # 全 ogp.png を再生成
npm run ogp-gallery -- --open  # .tmp/ogp-gallery.html を生成しブラウザで開く（カテゴリ別フィルタ付き）
```

`scripts/ogp-gallery.mjs` が `.local/r2/posts/**/ogp.png` を走査し、1 枚の HTML グリッドに一覧化する。長タイトルのはみ出し・改行崩れ・テーマ色枠・余白をまとめて確認できる。

## 派生テンプレ: magazine-banner（note マガジンヘッダー対応）

| 観点 | 仕様 |
|---|---|
| 出典 | T06 Mono Tag からの派生（2026-05-20） |
| 用途 | note 有料マガジンのカバー（`generate-magazine-covers.mjs` 専用）。記事 OGP・記事カバーには使わない |
| 背景 | note のマガジン/クリエイターページのヘッダーは画像中央の **1280×216 帯** がクロップ表示される。専用レイアウトでヘッダー帯にマガジン名を収める |
| レイアウト | 画面を 3 ゾーンに分割。上ゾーン＝ワードマーク＋カテゴリチップ、**中央帯（1280×216）＝マガジン名を縦横中央**、下ゾーン＝シアンアクセント＋ドメイン。全要素を全幅中央寄せ |
| 実装 | `ogp-templates.mjs` の `renderMagazineBanner`（`HEADER_BAND_HEIGHT = 216`） |

## 派生テンプレ: note-cover-g2（note 記事カバー・試験色分け）

| 観点 | 仕様 |
|---|---|
| 出典 | Claude Design (claude.ai/design) handoff `noteカバー画像-handoff.zip` 内 `covers-g2-all.jsx`（G2 案）を satori へ移植（2026-05-29） |
| 用途 | note 記事/マガジン記事のカバー（`generate-note-covers.mjs`、`cover:` ブロックがある記事）。サイト OGP には mono-tag を使う |
| 二軸カラー | **試験区分=ベース色**（1級土木=青 `#1E73C8` / 2級土木=緑 `#2A7050` / 総監=濃紺 `#16365C` / 共通=ブロンズ `#9A6B1E`）、**系列=濃淡**（notePricing paid→deep / free→base、`cover.tone` で上書き可） |
| レイアウト | 紙面背景（グラデ＋グリッド＋同心円）／左上ロゴ・右上メタ／リード文→強調キーワード(HiBox)→**全幅バナー帯**→アイコンチップ3つ |
| クロップ耐性 | mono-tag と異なり**中央 630×630 セーフ幅(590px)を厳守**（note フィードの 1:1 クロップ対策）。バナー帯テキストは 590px に自動フィット |
| 真実源 | `docs/design-system/note-cover-tokens.json`（値）/ `docs/design-system/note-cover.md`（仕様） |
| 実装 | `ogp-templates.mjs` の `renderNoteCoverG2` |

## 変更履歴

| 日付 | 変更 | 理由 |
|---|---|---|
| 2026-04-29 | 旧 5 種テンプレ（navy-white / dark-wood / red-line / blackboard / dark-grid）を T06 Mono Tag に統一 | SNS シェアのブランド一貫性＋メンテ単純化 |
| 2026-05-20 | magazine-banner 派生を追加 | note マガジンヘッダー帯（1280×216）クロップ対応 |
| 2026-05-29 | note-cover-g2 派生を追加（note 記事カバーを試験色分け） | note フィード・リンクカードで試験区分を色で識別 |
| 2026-06-16 | **mono-tag 全幅リデザイン**: セーフゾーン(630)撤廃→全幅、最大フォント 54→76px、資格別テーマ色 16px 外枠を追加、下部メタ「READ ON doboku-note.com」とワードマークのタグラインを撤去、タイトルを縦中央寄せ。`text.json` を v5 に更新（`safetyWidth` 590→1010、`fontSizeTable` 引き上げ、`charCountFallback` 18→13）。確認用に OGP ギャラリー（`npm run ogp-gallery`）を新設 | 外部リンクカードでの可読性・分野識別性の向上（参考: socialplus / commune の大文字・低余白カード） |
| 2026-06-18 | **mono-tag に資格別 AI 背景（任意）を追加**: `renderMonoTag` に背景画像レイヤー＋可読性スクリム `C_SCRIM`（0.7）を新設、`ogp-create.mjs` に `resolveBackgroundImage`（`.claude/config/ogp/backgrounds/<exam-key>.png`）を配線。生成スクリプト `npm run ogp-backgrounds`（Gemini/Imagen・輝度正規化・リトライ）を新設。背景なしは完全後方互換 | プレーンなオフホワイトより見栄えを上げつつ、文字の正確性・ブランド一貫性を維持（AI は背景のみ・文字は satori） |
| 2026-06-28 | **mono-tag に コンテンツ種別バッジ（第2軸）を追加**: ワードマークを最上段の行（`topRow`・space-between）に再構成し右端へ種別バッジを配置。`renderMonoTag` に `contentType` props、`ogp-create.mjs` に `GROUP_TO_TYPE`/`resolveContentType` を新設（`group`→ラベル+アイコン）。アイコンは既存 `G2_ICON_PATHS` を再利用（satori 描画・文字は不使用）。未マッピング group はバッジ無し＝後方互換 | 資格（色）に加えガイド/過去問/テキスト/キーワードをサムネ一覧で一目識別（種別は AI でなくテンプレ描画で確定的・可読） |
| 2026-06-28 | **mono-tag タイトルの縦フィット修正**: `renderMonoTag` に縦スペース計算＋font 縮小（`FONT_FLOOR: 34px`）＋行数クランプ（`…`）を追加。`pickFontSize` が横幅のみ合わせていたため 4 行以上の長タイトルが縦に溢れて行が重なっていた（約 225 件）。3 行以下は 76px 維持 | 長タイトルの行重なり（既存バグ）を解消。横フィットは不変（縮小のみ） |
| 2026-06-29 | **mono-tag をダーク配色に既定化**: `renderMonoTag` に `dark` パレット分岐（深紺グラデ地・白タイトル・`accentLight`＝資格色を白へ 50% 寄せたアクセントで枠/チップ/バッジ/装飾を描画・AI 背景はダーク時スキップ）。`lightenHex` ヘルパ、`ogp-create.mjs` に `--light`（旧配色）/`--out-dir`（比較出力）を追加し render は `dark: !args.light` 既定。全 1033 枚をダーク再生成。ライト出力は `--light` で完全再現可 | 白だらけのフィードでの標準差別化・プレミアム感（参考: 暗色 OGP の標準カードに対する被視認性）。資格色を明色化して紺/藍でも識別性維持 |
| 2026-06-29 | **per-page タイトル制御（`ogp.title`/`ogp.subtitle`）を追加**: ダークで `ogp.title` 明示時は完全手動モード（主題=`ogp.title`・サブ=`ogp.subtitle`・`\n` 改行を尊重・自動除去/budoux しない）。`deriveTitleParts` は `ogp.title` 未指定時のみ動く。1 ページずつ改行を作り込むための導線（別 PC でのチューニング前提） | 自動の改行/除去では事務的な長文タイトルを完璧化できないため、手動の逃げ道を用意 |
| 2026-06-29 | **サブタイトルの改行を font 相応に修正**: サブを主題と同じ 13 字で折っていたため小フォントのサブが不要に改行されていた。`ogp-create.mjs` でサブ専用 wrap（`charCountFallback` を サブfont と横幅から算出・`breakBefore`/`breakAt` 無効）に変更し、収まる短いサブは 1 行に。55 枚再生成 | 例: `guide-allowance` のサブ「手当の仕組みと、確認すべきポイント」が 2 行→1 行 |
| 2026-06-29 | **ダークを新レイアウトへリデザイン**: ダークを `renderMonoTagDark`（新規）へ委譲＝ワードマーク撤去・**資格名を大きな kicker** に・タイトルから資格名を除去して**主題（大）＋サブタイトル（小）の階層**・左下に控えめなドメイン。`ogp-create.mjs` に `deriveTitleParts`（資格名除去・主題/サブ分割）と主題用 `MAIN_FONT_TABLE`（最大 88px）＋スペース過剰改行を抑える wrap 設定（`breakAt:[]`）を追加。`renderMonoTag` は dark のとき `renderMonoTagDark` へ早期 return、pal をライト専用へ整理。全 1033 枚再生成。ライト（`--light`/note カバー fallback）は不変 | 資格名拡大・タイトル重複解消・改行改善・余白活用（ユーザー指摘）。過去問等の事務的タイトルは best-effort（完璧化は `ogp.title`）|
| 2026-06-29 | **支援要素の拡大＋浮いたアクセント撤去（ユーザー指摘）**: `renderMonoTagDark` の kicker 34→**46px**・種別バッジ 19→**26px**（アイコン含む）・左下ドメイン 18→**21px**/不透明度 0.38→**0.52**。地から浮いていた**左上の固定シアンバー（80×4）を撤去**（資格差別化は kicker 色＋16px テーマ色枠＋バッジが担う）。試作で「資格名の左にテーマ色バー」も検討したが「1級」の `1` と紛らわしく不採用。全件再生成 | 支援要素が一様に小さく、左上シアンバーだけテーマ色から外れ浮いていた。資格名・種別・ブランドの被視認性を底上げ |
| 2026-06-29 | **過去問 per-page 規約を確定＋適用**: 建設部門 選択科目 63 本＝A3（科目名のみ1行・`\n` 除去、サブ `令和X年度 選択科目 過去問`）／総監 過去問 34 本＝`shortTitle` の1段（科目軸が無いためサブ無し・自動導出が資格名を除去できず重複＋語中改行していたのを是正）。SSOT「過去問ページの per-page 規約」参照 | 資格の構造差（科目軸の有無）を主題に正直に反映。揃えるとサブが kicker と重複し品位が落ちるため敢えて非対称 |

## 旧 5 種テンプレ（撤去済み・履歴）

背景画像 (`assets/fonts/ogp-backgrounds/dark-wood.png` `blackboard.png` 等) は履歴として残置するが、現運用では参照されない。カテゴリ別出し分けが将来再び必要になったら `.claude/config/ogp/rules.json` の `rules[]` を復活させる。

## テンプレ追加の手順（将来）

1. このファイル（出典・用途・変更履歴）に追記
2. `.claude/config/ogp/templates.json`（レジストリ）に ID を追加
3. `.claude/skills/conversion/ogp-create/scripts/lib/ogp-templates.mjs` の `renderers` に `render{XYZ}` を追加（`(props, { width, height }) => element` シグネチャ）
4. 必要なら `.claude/config/ogp/rules.json` にルール追加
5. 背景画像が必要なら `.claude/skills/conversion/ogp-create/assets/fonts/ogp-backgrounds/{id}.png` に配置
6. `npm run ogp-gallery` で一覧目視検証（mono-tag は全幅。中央クロップ耐性が要るテンプレのみ別途セーフ幅を検証）
