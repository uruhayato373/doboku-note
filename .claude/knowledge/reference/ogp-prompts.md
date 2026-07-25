---
title: OGP デザインリファレンス
---

# OGP デザインリファレンス

doboku-note のサイト OGP / note カバー共通テンプレ T06 Mono Tag の **デザイン真実源（SSOT）**。
OGP デザインはここで継続的に検討・改善する。レイアウト・配色・フォント・テーマ色・変更履歴をこのファイルに記録し、実装（`ogp-templates.mjs`）と常に一致させる。コマンド・引数・トラブルシューティングなど運用面は [`ogp-create` SKILL.md](../../skills/conversion/ogp-create/SKILL.md) を参照。

- **OGP サイズ**: 1200×630（doboku-note サイト用）
- **note カバーサイズ**: 1280×670（note 公開用ドラフト用、同テンプレを再利用）
- **テンプレ実装**: `.claude/skills/conversion/ogp-create/scripts/lib/ogp-templates.mjs` の `renderMonoTag` が真実源
- **ベースは CSS のみで完結**（背景画像なしでも成立）。文字・ブランド枠は常に satori が正確に描く
- **配色は 2026-07-02 にライト写真前面を既定化**（資格別ブランド写真＋淡スクリム＋濃色文字。トップ hero / ExamCards / note カバーと世界観を統一）。**資格別 AI 背景（下記「資格別 AI 背景」）を Codex 生成のブランド写真へ差し替え**、`resolveBackgroundImage` で自動合成。旧ダーク配色（深紺グラデ地・2026-06-29〜2026-07-02 既定）は **`--dark` フラグ**で描画可能（互換保持）。※過去に AI 背景が「暗スクリムで濁る」ため見送られた経緯があるが、明るい写真＋淡スクリム＋濃色文字で解消（サンプル比較で確認）

## 採用テンプレ: T06 Mono Tag（mono-tag・サイト OGP）

| 観点 | 仕様 |
|---|---|
| 出典 | Claude Design (claude.ai/design) handoff `Doboku Note OGP Handoff.zip` 内 `T06_MonoTag` |
| 出典時期 | 2026-04-29（全幅リデザインは 2026-06-16、下記「変更履歴」参照） |
| 用途 | 全サイト OGP・`cover:` ブロックの無い note カバー（mono-tag フォールバック） |
| レイアウト | **ライト既定（写真前面 2026-07-02〜／メタ再設計 2026-07-07）**: 最上段の 1 行メタ＝**資格名 kicker（左・30px 塗りチップ・装飾マーカー無し）＋ 種別ピル（右・テキストのみ）**、中央＝**主題（大）＋サブタイトル**、**右下＝ワードマーク（従属 24px）**、**左下＝執筆者資格クレジット（21px・2026-07-20〜）**。装飾ライン無し・上パディング 72px。資格名はタイトルから除去し kicker に集約（重複解消）。**ダーク（`--dark`・旧既定〜2026-07-02）**は ワードマーク無し・資格名 kicker＋主題/サブ・左下ドメイン |
| 執筆者資格クレジット | **左下 absolute（`left:72px/bottom:52px`・flow 外＝縦フィット計算に無干渉）**。文言 SSOT は `ogp-templates.mjs` の `AUTHOR_CREDENTIAL_OGP`（「技術士（総監・建設）×1級土木｜元発注者」・元は `src/config/author.ts` qualifications）。**時事文言（R8的中等）は入れない**（画像の陳腐化防止・的中訴求は per-article の cover.chips/投稿面）。個別抑止は frontmatter `ogp.credential: false`。note カバー G2 側はロゴ直下 15px（`AUTHOR_CREDENTIAL_G2`・`cover.credential: false` で抑止）。2026-07-20 信頼性資産化で導入 |
| 配色 | **ダーク既定（2026-06-29〜）**: 深紺グラデ地 `#161d33→#0a0e1a` / タイトル白 `#f5f7fc` / アクセント＝資格テーマ色を白へ 50% 寄せた `accentLight`（紺/藍でも沈まない）/ シアン `#22d3ee`。旧ライト配色（warm off-white `#fdfcf8` / 濃紺 `#0f1e3f` / 本文 `#0a1428`）は `--light` で出せる |
| 資格別テーマ色 | 資格区分ごとのテーマ色（下記「テーマ色」参照）。**ダーク既定**は地の radial グラデの色味＋kicker＋バッジを `accentLight`（明色化）で着彩して分野識別（**16px 外枠は 2026-06-29 撤去＝完全クリーン**）。**ライト/note カバー**は従来どおり 16px 実線外枠で識別 |
| フォント | Noto Sans JP Bold。**ダーク主題は最大 88px**（`MAIN_FONT_TABLE`・縦フィットで自動縮小）/ kicker 46px / 種別バッジ 26px / サブ＝主題 ×0.46（最小 26px）/ 左下ドメイン 21px。ライトはタイトル最大 76px |
| 主要要素（ダーク） | **資格名 kicker（accentLight）** / **コンテンツ種別バッジ（右上・accentLight 輪郭ピル）** / **主題（白・大）** / **サブタイトル（淡色・小）** / 左下ドメイン `doboku-note.com` |
| 装飾要素 | **無し（完全クリーン）**。地は radial グラデ（左上寄り・資格テーマ色）のみ。※2026-06-29 に順次撤去: ①左上の四角＝**linear-gradient(135deg) の原点コーナーを satori がブロック塗りするアーティファクト**→地を **radial-gradient** 化で解消（grid/border ではない）。②描画されない全面グリッド（no-op）を整理。③浮いたシアンバー（80×4）。④**16px テーマ色外枠も撤去**（角に小四角が出るため＝ユーザー指摘で完全クリーン化。分野色は radial 地＋kicker＋バッジが担保） |

## 2 軸識別: 資格（色）× コンテンツ種別（バッジ）

mono-tag は **資格＝色** と **コンテンツ種別＝右上バッジ** の 2 軸でサムネ一覧での判別性を担保する（note-cover-g2 の「試験区分=色 × 系列=濃淡」と同じ発想、2026-06-28〜）。

- **資格の識別**: ダークは**資格名 kicker＋バッジを `accentLight`**（資格色を白へ 50% 寄せた明色）＋**地の radial グラデの資格テーマ色味**で識別（外枠は撤去）。紺/藍の資格でも深紺地に沈まない。
- **コンテンツ種別バッジ**: 最上段の右端（資格名 kicker の対面）に、**輪郭ピル＋短ラベル**で描く。**ライト既定は 2026-07-07 に装飾アイコンを撤去しテキストのみ**（ラベルで種別は一意・字化け解消・text-forward トレンド準拠）。ダーク（`--dark`）は従来どおり lucide 風アイコン＋ラベル（半透明白地 `rgba(255,255,255,0.08)`）、ライト地は `rgba(255,255,255,0.86)`。
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
  - **サイズ均一化の原則**: `ogp.title` 未指定の主題はタイトル幅にフォントを auto-fit するため、**同一シリーズで年度表記の字数だけが違う**（例 `平成26年度`＝6字 ↔ `令和2年度`＝5字）とカード間で主題フォントが段階的にズレる（短い年度ほど大きく出る）。**「年度だけが可変」のシリーズは主題を固定文字列にし、年度はサブへ逃がして均一化**する。科目／分野が可変のシリーズは区別が目的なのでサイズ差は許容（揃えない）。
  - **建設部門 選択科目（`pe-construction/r0X-{科目}`）= A3**: 主題＝**科目名のみ・改行なし1行**（例 `河川、砂防及び海岸・海洋`／長い科目もフォント自動縮小で1行に収める＝`\n` を入れない）、サブ＝`令和X年度 選択科目 過去問`。科目名が差別化＝検索フックなので主役に置く。
  - **建設部門 必須科目I（`pe-construction/r0X-required`）**: 主題＝`必須科目I`、サブ＝`令和X年度 過去問`（選択科目ではないのでサブに「選択科目」を付けない）。
  - **技術士第一次（`pe-first-stage/r0X-{basic,aptitude,construction}`）= A3 系**: 主題＝科目区分（`基礎科目` / `適性科目` / `専門科目（建設部門）`）、サブ＝`令和X年度 過去問`。
  - **総監（`pe-comprehensive-management/{hXX,r0X}-{primary,secondary}`）= 1段**: 科目軸が無いので主題＝**`shortTitle`（例 `平成21年度 記述式` / `令和7年度 択一式`）の1段**、サブは付けない（`総合技術監理部門 …` は kicker と重複するため）。
  - **コンクリート主任技師 過去問解説（`concrete-chief-engineer/primary-*`）**: 主題＝分野名（`shortTitle`・例 `施工` `コンクリートの耐久性`）、サブ＝`過去問解説`。
  - **1級・2級土木 一次（`civil-construction-{1,2}/primary-*`）**: 年度だけが可変なので**主題を固定**（サイズ均一化の原則）。1級＝`第1次検定 問題A`／`第1次検定 問題B`、2級＝`第1次検定 前期`／`第1次検定 後期`。サブ＝`{年度} 過去問`。
  - **1級・2級土木 二次の年度試験（`secondary-rXX`）**: 一次と表現を揃え、主題＝**`第2次検定`**（固定）、サブ＝`{年度} 過去問`。「検定区分を主題・年度をサブ」で一次/二次を統一する（年度を主題に出さない）。
  - **1級・2級土木 二次の分類（`group`）= 過去問は年度試験のみ**: `group: secondary`（＝過去問バッジ）は **`secondary-rXX`（令和X年度 第2次検定）の本物の試験問題だけ**に付ける。トピック別の基礎解説 `-basics`／出題傾向と過去の問題 `-past-problems`／経験記述 `-experience-writing`・`-examples` は**学習ガイドなので `group: guide`**（OGP バッジ＝ガイド、`tags` も `guide`＋トピック）。「過去問」と銘打つのは年度試験に限る方針（2026-06-29 確定）。
  - **同 二次の topic ガイド（`-basics`/`-past-problems`/`-experience-writing`）のタイトル**: トピック名が主題で**自動導出で可**（`title` に資格名を含めず重複せず・長短が出るのは区別目的で正常＝手動 `ogp.title` 不要、必要時のみ上書き）。ただし下記「ガイドOGPタイトルの統一」のフォント下限は満たすこと。

### ガイドOGPタイトルの統一（フォント均一・`check-ogp-title-fit`）

ガイド（`group: guide`）は題が一本ずつ違い、`ogp.title` 未指定だと**長い説明的タイトルが小さく/多行で出てカード間でばらつく**（OGP 主題は横幅にフォントを auto-fit するため）。

- **規約**: 長い題のガイドは**手動 `ogp.title` で主題を短く（≤2行・大きめフォント）**し、詳細・修飾は `ogp.subtitle` へ逃がす。短い題（例 `土工の重要ポイント`）は自動導出のままで大きく出るので可。
- **機械ゲート**: `npm run check-ogp-title-fit`。実レンダリングと同じ `wrapTitle`＋`pickFontSize` で主題フォントを算出し、**56px 未満（長すぎて小さい）のガイドを赤落ち**で検出。`--staged` は pre-commit（編集したガイドのみ）、無印は published 全件（CI）、`--all` は全件のフォント一覧（バーンダウン）。実装は `scripts/check-ogp-title-fit.mjs`。

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
3. **分野の一目識別**: 資格別テーマ色で分野を判別（ダークは radial 地＋kicker＋バッジの色／ライト・note カバーは 16px 外枠）
4. **装飾は全幅 OK**: ライト/note カバーの外枠・グリッドは外周まで延びる（ダーク既定は装飾なし＝完全クリーン）。意味のある情報は枠内 72px パディング内に置く
5. **左寄せ・縦中央**: 主要要素は左端基準で縦に積み、タイトルブロックを縦方向中央に寄せて読み物感を担保

> [!note] セーフティゾーン（中央 630×630）は mono-tag では 2026-06-16 に撤廃した。中央 1:1 クロップ耐性が必要な **note-cover-g2** は引き続き中央セーフ幅 590px を厳守する（別系統・下記参照）。

## 資格別 AI 背景（任意・mono-tag）

mono-tag は資格ごとに **AI 生成の背景画像**を任意で敷ける（2026-06-18〜）。文字・ブランド枠は従来どおり satori が正確に描き、背景は「装飾の下地」として最背面に入る。背景ファイルが無ければ従来のオフホワイト＋グリッド（**完全後方互換**）。

- **置き場**: `.claude/config/ogp/backgrounds/<exam-key>.png`（資格ごとに 1 枚を全記事で共有）。`ogp-create.mjs` の `resolveBackgroundImage(category)` が category→exam-key で解決し、無ければ null。exam-key は上の「テーマ色」表と同じ。
- **レイヤー順**（最背面→最前面）: 背景画像（`object-fit: cover`）→ 可読性スクリム（`C_SCRIM`、オフホワイト半透明・既定 **0.7**）→ グリッド → メタ（資格名 kicker＋種別ピル）・タイトル・右下ワードマーク → テーマ色 16px 外枠。（旧・左上シアン/右下紺のアクセントバーは 2026-07-07 撤去）
- **可読性の二重担保**: ① 生成時に各背景を平均輝度 ~202 へ正規化（暗い出力だけ白へ線形ブレンド、明るい出力は不変）② 描画時にスクリムを重ねる。背景が強すぎ/弱すぎは `ogp-templates.mjs` の `C_SCRIM` alpha で一括調整。
- **生成**: `npm run ogp-backgrounds`（`scripts/generate-ogp-backgrounds.mjs`）。`GEMINI_API_KEY`（`.env.local`）で AI Studio の画像モデルを呼ぶ。既定 `--mode flash`（`gemini-2.5-flash-image`）、`--mode imagen`（`imagen-4.0-generate-001`）に切替可。プロンプトは「near-white の淡い地＋テーマ色は細線アクセントのみ・文字なし・左中央は静かに」。flash は稀に画像でなくテキストを返すためリトライ＋「画像のみ返す」指示で吸収。
- **コスト上限**: 画像生成は従量課金。AI Studio 取得キーは GCP の Generative Language API に **Quota（1日上限）**を設定して上限管理する（予算アラートは通知のみで自動停止しない）。
- **既存 OGP への反映**: 背景を追加/更新したら `npm run ogp -- --all --force` で焼き込む（**任意**）。焼き込まなければ既存 OGP は据え置き、新規記事は通常生成で自動的に背景が乗る。

## テーマ色（資格別外枠）

外枠の色は資格区分から自動解決する。**値の真実源は [`.claude/knowledge/design-system/note-cover-tokens.json`](../design-system/note-cover-tokens.json) の `exams[].base`**（note カバーと共通。色の二重管理をしない）。

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
| 真実源 | `.claude/knowledge/design-system/note-cover-tokens.json`（値）/ `.claude/knowledge/design-system/note-cover.md`（仕様） |
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
| 2026-06-29 | **左上の四角アーティファクトを解消（地を radial 化）＋グリッド dead code 整理**: ユーザー指摘の「左上の四角」を切り分けた結果、原因は **satori が `linear-gradient(135deg)` の原点コーナーをブロック状に塗る**ことだった（grid/border ではない。md5 検証＝grid 有無で出力バイト不変＝grid は描画されない no-op）。`darkBgGradient` と固定フォールバックを **`radial-gradient(120% 120% at 18% 8%, …)`** へ変更し恒久解消（左上寄りの柔らかな奥行きは維持）。併せて描画されない fine/major グリッドレイヤーを `renderMonoTagDark` から撤去（無影響の整理。`gridDataUrl`・ライト/note-cover は継続）。全件再生成 | 左上アーティファクトの恒久解消。radial で深み維持・四角消失 |
| 2026-06-29 | **ダークの 16px テーマ色外枠を撤去（完全クリーン化）**: radial 化後に残った左上の小さな四角の正体は**外枠の角**（上辺＋左辺の 16px 帯の重なり）だった。コーナー装飾化（薄枠＋シアン三角）も試作したが、ユーザー判断で**外枠ごと撤去＝装飾なしのミニマル**を採用。分野別テーマ色は radial 地の色味＋kicker＋バッジで担保（ライト/note カバーの外枠は継続）。全件再生成 | 角の四角を根絶。深紺 radial＋大主題のミニマルで最もクリーン |
| 2026-07-02 | **ライト写真前面を既定化（ダーク→反転）**: 資格別背景を Codex 生成ブランド写真（トップ hero / ExamCards と同素材）へ差替（civil-1 / civil-2 / pe-comprehensive / pe-construction / concrete-chief。concrete-diagnosis は旧背景維持）。`ogp-create.mjs` の既定を `light: true` へ反転（旧ダークは `--dark`）。`renderMonoTag` の light 分岐に **subtitle(subLines) 描画**を追加、タイトルを `lines`→`mainLines`（分割後）に統一し「区切り込みの溢れ＋サブ重複」を解消。全 1033 枚を再生成 | トップ hero / カード / note カバーと写真の世界観を統一しファネル全体のブランド一貫性を向上。過去に AI 背景が暗スクリムで濁り見送られたが、明るい写真＋淡スクリム＋濃色文字で解消（サンプル比較で確認） |
| 2026-07-07 | **ライト（既定）mono-tag のメタ帯リデザイン（トレンド準拠）**: ①資格名を**主役 kicker 化**（旧チップ 17→**30px 塗りチップ**・左上へ）＋**▶ 装飾マーカー撤去**、②種別バッジを**テキストのみのピル**へ（**装飾アイコン `g2IconImg` 撤去**＝ラベルで種別は一意・「ガイド」アイコンの字化け解消）、③**左上シアン/右下紺の装飾ライン（80×4）を撤去**、④**ワードマークを左上→右下へ従属配置**（28→24px）、⑤メタを 2 行→**1 行に統合**＋上パディング 110→**72px**・gap 28→16px でタイトルを最前面化。`ogp-templates.mjs` の light `renderMonoTag` のみ変更（16px 外枠色・背景写真・グリッド・`--dark` 分岐は不変）。全 1098 枚再生成 | フィード縮小時にメタが小さく読めない一方、非効率な余白＋装飾がスペースを占有していた（ユーザー指摘）。2025–26 の text-forward・minimal maximalism・装飾削減トレンドに沿い、資格名とタイトルだけを強く立てるクリーンな構成へ |
| 2026-07-20 | **執筆者資格クレジットを両テンプレへ追加（信頼性資産化 P2）**: ライト mono-tag は左下 absolute（21px・`AUTHOR_CREDENTIAL_OGP`「技術士（総監・建設）×1級土木｜元発注者」・flow 外＝縦フィット無干渉）、note-cover-g2 はロゴ直下（15px・`AUTHOR_CREDENTIAL_G2`・children/vchildren 両対応）。`G2_ICON_PATHS` に `award` 追加（R8的中チップ等の per-article 用）。個別抑止 `ogp.credential:false`/`cover.credential:false`。時事文言はテンプレに入れない（的中訴求は cover.chips/投稿面）。OGP 1,113 記事分＋カバー717 記事分を全面再生成 | R8的中を機に E-E-A-T を全画像へ常時表示。civil 含む全資格の画像に総監資格が載る＝総監の分析力を土木の信頼へ転移 |

## 旧 5 種テンプレ（撤去済み・履歴）

背景画像 (`assets/fonts/ogp-backgrounds/dark-wood.png` `blackboard.png` 等) は履歴として残置するが、現運用では参照されない。カテゴリ別出し分けが将来再び必要になったら `.claude/config/ogp/rules.json` の `rules[]` を復活させる。

## テンプレ追加の手順（将来）

1. このファイル（出典・用途・変更履歴）に追記
2. `.claude/config/ogp/templates.json`（レジストリ）に ID を追加
3. `.claude/skills/conversion/ogp-create/scripts/lib/ogp-templates.mjs` の `renderers` に `render{XYZ}` を追加（`(props, { width, height }) => element` シグネチャ）
4. 必要なら `.claude/config/ogp/rules.json` にルール追加
5. 背景画像が必要なら `.claude/skills/conversion/ogp-create/assets/fonts/ogp-backgrounds/{id}.png` に配置
6. `npm run ogp-gallery` で一覧目視検証（mono-tag は全幅。中央クロップ耐性が要るテンプレのみ別途セーフ幅を検証）
