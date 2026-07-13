# UIコードベース静的監査レポート

> [!warning]
> **2026-07-11 監査完了**：`src/app`・`src/components`・`src/styles`とUI関連文書を静的監査した。コード修正は行っていない。本書はClaude Codeによる実装修正の作業指示書として使う。

## 1. 結論

型・ESLint・既存UI lintは通過しており、直ちにビルドを壊す問題は確認されなかった。一方、デザインシステムの運用としては次の3点を最優先で直す必要がある。

1. UI仕様書・READMEと現行実装が不一致で、誤った実装を誘発する。
2. `Callout`と`SpecSheetList`が静的表示だけであるにもかかわらずClient Componentになっており、全記事で不要なクライアント境界を作る。
3. キーボードフォーカスの共通規約がなく、主要ナビゲーションとツールUIでフォーカス表示が不統一または消失する。

前回の部分的リファクタリングで、UI内の`rounded-sm`と旧`--color-brand/ink`直接参照は概ね整理された。しかし、カードプリミティブの適用、ドキュメント更新、アクセシビリティ、不要コード整理はコードベース全体では未完了である。

## 2. 監査範囲と方法

### 対象

- `src/app/**/*.tsx`
- `src/components/**/*.tsx`
- `src/styles/**/*`
- `tailwind.config.js`
- `src/lib/component-loader/`
- `docs/design-system/design-system.md`
- `docs/ui/`
- `src/components/**/README.md`
- `package.json`・`knip.json`

### 規模

| 項目 | 数 |
|---|---:|
| TSX | 99ファイル |
| UI TSX | 54ファイル |
| Client Component | 21ファイル |
| TSX総行数 | 約11,364行 |
| `globals.css` | 約800行 |

### 実行した検査

```bash
npm run type-check
npm run lint
npm run knip
node scripts/lint-ui.mjs --all
```

結果：`type-check`、ESLint、`lint-ui --all`は成功。`knip`は未使用ファイル・依存・export、未登録依存、未解決importを報告した。Knipは動的ロードや運用スクリプトを誤検出しうるため、削除前に個別確認が必要。

### 非対象

- ブラウザ表示、スクリーンショット比較
- 実機・レスポンシブ目視
- Lighthouse、axe等の実行時監査
- production build
- 外部URL・R2画像の実在確認

## 3. 優先度別所見

優先度は次の定義とする。

- `P1`：全記事・主要導線・SSOTに影響。最初の修正単位に含める。
- `P2`：保守性または特定画面のアクセシビリティに明確な悪影響。
- `P3`：整理・将来事故防止。単独では緊急性が低い。

---

### UI-001 `P1` UI仕様書が現行実装と一致していない

#### 根拠

- `docs/ui/related-articles.md:3,18`は存在しない`src/lib/related-articles.ts`を真実源としている。実装は`src/lib/related-score.ts`の`rankRelated()`。
- 同文書は3段階フォールバック・最大4件と記載するが、実装は共通トピックタグ数で順位付けし最大6件、2件未満で非表示。
- 同文書のカード仕様は`gray/blue/rounded-lg/transition-all`だが、実装はEditorial tokens、OGP画像、`card-interactive`、3列対応。
- `docs/ui/speclist-gallery.md`は`grid-template-columns: 38px 1fr`と件数表示を記載するが、実装は`20px 1fr`で件数を描画しない。
- `src/components/ui/Callout/README.md:39-41`は本文`text-sm`、tone別Tailwind背景、`rounded-md`と記載するが、実装は`text-[1em]`、`--ct-*`、`rounded-card-inline`。
- `docs/ui/callout-gallery.md:218`は旧typeが`note`へフォールバックすると一括記載するが、実装は`warning/caution → warn`、`point → tip`、`error → danger`。
- `src/components/ui/SeeAlso/README.md:24`は`dark:bg-gray-*`を記載するが、共通`NavLinkCard`とEditorial tokensへ移行済み。
- `src/components/README.md`の「現在の構造」は実際に存在しない`blog/`・`mdx/`や旧配置を示す。
- `docs/design-system/design-system.md`はフォントをInter/Noto Sans JP、テーマをnext-themesと記載するが、実装はsystem fontと独自`ThemeProvider`。

#### 影響

Claude Codeや開発者が文書を信頼して、廃止済み色、存在しないファイル、旧アルゴリズムを再導入する。SSOTを名乗る文書が複数あるため、カスタマイズ時の判断が不安定になる。

#### 推奨修正

1. `docs/design-system/design-system.md`を最上位の概念SSOT、`globals.css`を値SSOTと再確認する。
2. `docs/ui/*.md`は実装から確認できる仕様だけを記載し、履歴・旧移行説明はarchiveまたは短い注記へ移す。
3. `src/components/README.md`を現行ディレクトリ一覧、配置判断、barrel import方針へ全面更新する。
4. コンポーネントREADMEは実クラス名の羅列を減らし、利用契約・props・用途を中心にする。

#### 完了条件

- 文書内の全パスが存在する。
- RelatedArticlesの件数・非表示条件・順位付けが実装と一致する。
- Callout legacy alias表が`LEGACY_ALIASES`と一致する。
- SpecSheetListの列幅・props・件数表示説明が実装と一致する。
- system font・独自ThemeProviderの記載が統一される。

---

### UI-002 `P1` 静的MDXコンポーネントが不要にClient Component化されている

#### 根拠

- `src/components/ui/Callout/Callout.tsx:1`に`"use client"`がある。
- 同コンポーネントの唯一のhookは`useMemo`だが、type解決は小さな同期計算でメモ化の利益がない。
- `src/components/ui/SpecSheetList/SpecSheetList.tsx:1`にも`"use client"`があるが、state・effect・イベント処理を使わない。
- 両方とも`src/lib/component-loader/index.ts`からMDX記事ごとに動的ロードされる汎用部品で、記事本文に広く現れる。

#### 影響

静的記事部品がReactクライアント境界となり、JS送信・hydration対象を増やす。Calloutの種類追加やレンダリング戦略変更もClient Component制約を受ける。

#### 推奨修正

- `Callout`から`use client`と`useMemo`を除去し、純粋な`resolveCalloutKind(type)`関数にする。
- `SpecSheetList`から`use client`を除去する。
- KaTeXのサーバー利用がNext buildで成立することを確認する。
- component-loader経由のMDXレンダリングを型チェック・build・代表記事で確認する。

#### 完了条件

- 両コンポーネントに`use client`がない。
- `npm run build`が成功する。
- Callout 12種、legacy alias、SpecSheetListの数式・bold・codeが従来どおり出力される。

---

### UI-003 `P1` キーボードフォーカスの共通スタイルがない

#### 根拠

- button/input/textarea/selectを含むファイルは10あるが、`focus-visible:`使用ファイルは0。
- `Header.tsx:163-238,264-314`の主要リンク・メニューボタンはhoverのみを明示し、focus-visible表現がない。
- `JukenShikakuClient.tsx:154,183`と`KeikenCharcountClient.tsx:198`は`focus:outline-none`でoutlineを消し、border色しか変えない。
- `ThemeToggle.tsx:99`はfocus ringを持つが`focus:`であり、マウスクリック時にも表示される。全体規約として統一されていない。
- デザインSSOTは禁止事項として「outline:noneでfocus欠如」を挙げているが、再利用可能なfocus primitiveは存在しない。

#### 影響

キーボード利用者が現在位置を認識しにくい。特にツールの入力欄は背景やdark modeによって境界色変化が不十分になる可能性がある。

#### 推奨修正

- `globals.css`に`.focus-ring`、または`src/lib/ui-classes.ts`に共通クラスを定義する。
- 基準例：`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]`。
- Header、ThemeToggle、検索、ページネーション、全ツールのbutton/input/textareaへ適用する。
- `focus:outline-none`単独を`lint-ui`で検出する規則を追加する。

#### 完了条件

- 全インタラクティブ要素がブラウザ既定outlineを維持するか、共通focus-visibleを持つ。
- `rg 'focus:outline-none' src`で、同一class内にring/outline代替がない箇所が0。
- `lint-ui --all`にfocus欠如検査が追加される。

---

### UI-004 `P2` SpecSheetListだけ旧図版トークン体系と生値に残っている

#### 根拠

- `SpecSheetList.module.css:13-118`が`--color-ink-*`、`--color-border`、`--color-brand`をUIに直接使用する。
- `src/styles/README.md`では新規UIはEditorial tokensを使い、`--color-*`は図版・SNS・既存互換用としている。
- `border-radius: 2px`、`font-family: 'JetBrains Mono'`、16px glyph等が生値で、現行system font/カードradius方針に追従しない。
- rootは共通`card-surface-*`を使わず独自borderを持つ。

#### 影響

Editorial paletteやradiusを変更してもSpecSheetListだけ追従しない。ライト・ダークの見た目が他の本文コンポーネントと乖離する。

#### 推奨修正

- ink/body/border/brandを`--ink`、`--ink-body`、`--rule-soft`、`--accent`へ移行。
- radiusを`var(--radius-card-content)`または意図に応じてinlineへ移行。
- monoはTailwindと同じsystem mono stackをCSS変数化するか、`ui-monospace`から始める。
- `subtitle`、`accent`を残すならgalleryとREADMEへ反映する。

#### 完了条件

- SpecSheetList CSS内の`--color-ink-*`、`--color-border`、`--color-brand*`が0。
- `border-radius: 2px`と未導入JetBrains Mono参照が0。
- docs/ui画像更新の要否を判断し、見た目が変わる場合はgalleryを再生成する。

---

### UI-005 `P2` カードプリミティブの導入が部分的で、外観クラスの複製が残る

#### 根拠

`globals.css`には`.card-surface-content`と`.card-surface-section`があるが、以下を含む多数の実装が依然として同じborder/background/radius/shadow列を直接記述する。

- `RelatedArticleCard.tsx:20`
- `LinkCardClient.tsx:30`
- `NoteLink.tsx:78`
- `MagazineInlineCard.tsx:42`
- `CareerAffiliate.tsx:105`
- `LinksHubTile.tsx:20`
- `MagazineTopBanner.tsx:35`
- `SearchResults.tsx:78`
- `links/page.tsx:185,246,527,555`
- 各ツールClientのsection/content card

また、`MetaCard`と`SectionCard`は同種の大カードshellを別コンポーネントとして持つ。

#### 影響

影、border、背景、hoverを変更する際に一括追従しない。`card-interactive`と個別`transition-all`が混在し、操作感も揃わない。

#### 推奨修正

- カードを「静的surface」「インタラクティブリンク」「大section」の3系統に限定する。
- 既存の`.card-surface-*`をクラス列のSSOTとして全面適用する。
- React抽象化は構造が同じ場合だけ使い、CSS primitive適用を優先する。
- `MetaCard`と`SectionCard`は責務・padding・semantic elementの差を整理し、統合可否を決める。

#### 完了条件

- `rounded-card-* border ... bg-[var(--paper)] shadow-*`の反復が例外リスト以外から消える。
- クリックカードは原則`card-interactive`を使用する。
- 例外はデザインシステム文書に理由を記載する。

---

### UI-006 `P2` `transition-all`と独自モーションが共通規約から逸脱している

#### 根拠

`transition-all`がlinks、search、about、CategoryViews、LatestArticles、ExamCards、BackToTopButton、ツールprogress等に残る。デザインSSOTは`.card-interactive`、`--dur-*`、`--ease-soft`の使用とscale禁止を定める一方、`ExamCards.tsx:60`は画像を`scale-[1.04]`する。

#### 影響

意図しないプロパティまでアニメーション対象になり、将来のCSS変更で挙動が増える。コンポーネントごとのduration/easingが分散する。

#### 推奨修正

- `transition-all`を`transition-colors`、`transition-[border-color,box-shadow]`等へ限定する。
- progress width等、必要な箇所は対象を明示する。
- ExamCardsのscaleを許可するならSSOTの例外として記載し、禁止するならshadow/translateへ統一する。
- `lint-ui`へ`transition-all`検出を追加する。

#### 完了条件

- UIコードの`transition-all`が0、または根拠付き例外のみ。
- motion duration/easingがトークンまたは共通utilityに接続される。

---

### UI-007 `P2` Headerのメニュー/dialog実装にフォーカス管理がない

#### 根拠

- `Header.tsx:255-261`は常にDOMに存在するdrawerへ`role="dialog" aria-modal="true"`を付ける。
- 閉じた状態でもdialog semanticsが残る。
- 開いた際の初期フォーカス移動、Tab trapping、Escape終了、閉じた後のトリガー復帰が確認できない。
- backdropは`div onClick/onTouchEnd`で、意味的なbuttonではない。

#### 影響

スクリーンリーダーとキーボード操作で、閉じたdialogや背面ナビへフォーカスが移動する可能性がある。

#### 推奨修正

- open時のみdialogをmountするか、closed時に`inert`・`aria-hidden`を適切に設定する。
- Escape、初期focus、focus restoreを実装する。
- backdropの二重click/touch処理を整理する。
- 既製dialogライブラリを入れない場合は専用hookとテストを追加する。

#### 完了条件

- closed時にdialogがアクセシビリティツリーとTab順へ出ない。
- open→Tab巡回→Escape→トリガー復帰が成立する。

---

### UI-008 `P2` `Callout`の型契約が広すぎ、未知typeを静かに隠す

#### 根拠

- `CalloutProps.type`は`CalloutKind | string`で、実質任意文字列を許可する。
- 未知値は例外や警告なしで`note`へフォールバックする。
- legacy aliasは実装・README・galleryで説明が異なる。

#### 影響

MDX typoがビルド成功してnoteとして表示され、執筆ミスを検出できない。種類追加時の型安全性も低い。

#### 推奨修正

- 公開型を`CalloutKind | LegacyCalloutKind`へ限定する。
- MDX解析段階またはcontent lintで未知typeをエラーにする。
- ランタイムfallbackは古いキャッシュ互換として残す場合も、developmentで警告する。

#### 完了条件

- legacy一覧が1か所で型とruntime mapを生成する。
- typoをfixtureで検出するテストがある。

---

### UI-009 `P2` KnipがデッドUI・依存・未解決importを報告している

#### 根拠

Knipの主なUI関連報告：

- 未使用候補：`CategoryIcons.tsx`、`LinksHubTile.tsx`、多数の`index.ts`、`src/components/ui/index.ts`。
- 未使用依存候補：`next-themes`、`date-fns`、`@fontsource/manrope`、`@fontsource/noto-sans-jp`。
- 未解決import：`/pagefind/pagefind.js`、運用スクリプトのquality-stateパス。
- 未登録依存：`unified`、`hast`、複数スクリプトの`glob`/`playwright`。

個別確認では、`LinksHubTile`はコード参照がなく履歴文書だけに残る。`next-themes`はコメント・文書・packageだけで、実装は独自ThemeProvider。`date-fns`は未使用判定された`src/lib/utils.ts`からのみ参照される。fontsourceはサイトUIではなくSNS設計文書で必要とされる可能性がある。

#### 影響

依存とファイルの責任範囲が不明瞭になり、削除判断・bundle判断・アップデート負担が増える。未解決importは該当スクリプト実行時に破損する可能性がある。

#### 推奨修正

- UIコード、MDX動的ロード、運用スクリプトのentryをKnip設定へ明示する。
- 真のデッドコードと誤検出を分類した後に削除する。
- barrel file方針を「使う」か「直接import」に統一する。現状はbarrelの多くが未使用。
- `next-themes`と独自ThemeProviderのどちらを採用するかSSOTに合わせる。現状維持なら依存を削除する。

#### 完了条件

- Knip出力を「許容済み誤検出」と「解消対象」に分類した文書または設定がある。
- UI関連の真の未使用ファイル・依存が0。
- 未解決importが0。

---

### UI-010 `P3` 巨大ファイルにデザイン・データ・表示分岐が集中している

#### 根拠

- `app/links/page.tsx` 575行
- `category/CategorySections.tsx` 510行
- `app/docs/[...slug]/page.tsx` 475行
- `layout/Header.tsx` 320行
- `app/about/page.tsx` 309行
- `ui/CategoryNavCard.tsx` 301行
- `category/CategoryViews.tsx` 295行
- ツールClient 267〜286行

#### 影響

デザイン変更とデータ条件変更が同じファイルに混在し、レビュー範囲が広がる。似たクラス列やラベル構造が局所的に再発しやすい。

#### 推奨修正

- linksはデータ定義、カード部品、セクションを分離する。
- CategorySectionsは試験形式別table componentへ分割する。
- docs pageはデータロード、MDX pipeline、layout compositionを分離する。
- ツール3画面は`ToolPanel`、`SegmentedControl`、`NumericField`、`ResultPanel`の共通化を検討する。

分割は行数だけを目的にせず、変更理由が異なる単位で行う。

---

### UI-011 `P3` 同一のレイアウト値がプリミティブ外にも残る

#### 根拠

`max-w-[1280px] + px-4 sm:px-6 lg:px-10`がHeader、Footer、home各section、Heroに反復する。`max-w-[760px]`もツールClient3画面に反復する。docs/categoryの2カラムはPageShell articleの外側で個別構築される。

#### 影響

外枠paddingやrailを変更すると複数ファイルの更新が必要。PageShell/SectionBlockが存在する一方で、用途別に利用方法が揃っていない。

#### 推奨修正

- `site-rail`、`tool-rail`等のCSS primitiveか既存SectionBlockのvariantで統一する。
- Header/Footer/Home専用sectionがSectionBlockを使えるか検証する。
- article variantは2カラムshell自体をPageShellへ寄せるか、現行が意図的例外なら文書化する。

---

### UI-012 `P3` コンポーネント内コメント・READMEが過去の依存を残す

#### 根拠

- `ThemeToggle.tsx:21-24`はnext-themesとuseState/useEffect依存を記載するが、実際は独自`useTheme`と`useSyncExternalStore`。
- design-systemはnext-themesとInter/Noto Sans JPを前提としているが、Tailwindはsystem fontへ統一済み。
- `LinksHubTile`はdesign-systemとbacklogでは現役扱いだがコード参照がない。

#### 影響

コードを読んだ時に実依存を誤認し、不要パッケージや廃止コンポーネントを保持する。

#### 推奨修正

- JSDocは自動で分かるfeatures一覧を削り、非自明なhydration理由だけを書く。
- handoff履歴と現行仕様を分離する。
- component status（active/deprecated/dormant）をdesign-system表へ追加する。

## 4. 良好だった点

- `PageShell`、`PageHeader`、`SectionBlock`がほぼ全ページへ導入され、ページchromeの重複は抑制されている。
- Editorial、図版、Callout、試験色のトークンドメインが`globals.css`上で明示されている。
- `prefers-reduced-motion`の全体対応がある。
- `MetaCard`、`NavLinkCard`、`card-interactive`等、共通化の基盤は既に存在する。
- 外部リンクの多くは`noopener noreferrer`またはaffiliate用relを持つ。
- ThemeToggle、検索入力、ツール入力はlabel/aria属性を一定程度備える。
- `npm run type-check`、ESLint、`lint-ui --all`は成功した。

## 5. Claude Code向け推奨実装順序

### Phase 1：SSOTと安全網

1. UI-001 文書を現行実装へ同期。
2. UI-003 focus-visible primitiveとlint規則を追加。
3. UI-006 `transition-all`規則をlintへ追加。
4. 修正前後で`type-check`、lint、`lint-ui --all`を通す。

### Phase 2：サーバー境界と型安全

1. UI-002 Callout/SpecSheetListをServer Component化。
2. UI-008 Callout typeを閉じたunionへ変更し、content lintを追加。
3. `npm run build`と代表MDX fixtureで検証。

### Phase 3：デザイン追従性

1. UI-004 SpecSheetListをEditorial tokensへ移行。
2. UI-005 card primitiveを全適用。
3. UI-006 motionを限定transitionへ統一。
4. UI-011 rail/padding primitiveを整理。

### Phase 4：アクセシビリティ

1. UI-007 Header drawerのdialog/focus管理を修正。
2. Header、検索、ページネーション、ツールをキーボードで検証。
3. 可能ならaxe/Playwrightテストを追加。

### Phase 5：デッドコードと分割

1. UI-009 Knipをentry設定込みで再評価し、削除対象を確定。
2. UI-010を変更頻度の高いファイルから分割。
3. README・design-systemのactive component一覧を更新。

## 6. 実装時の禁止事項

- Knip出力だけを根拠にファイルや依存を一括削除しない。MDX動的ロード、SNSスクリプト、運用スクリプトを確認する。
- UIを巨大な万能`Card`コンポーネントへ統合しない。外観はCSS primitive、構造が同じものだけReact componentで共通化する。
- `--color-*`を全面削除しない。SVG/SNS/意味色の共有パレットとして意図的に残っている。
- Calloutのlegacy aliasを、MDX全件確認なしに削除しない。
- 文書だけ先に理想状態へ変更しない。実装と同じPRで同期する。

## 7. 最終受入チェックリスト

- [ ] `npm run type-check`
- [ ] `npm run lint`
- [ ] `node scripts/lint-ui.mjs --all`
- [ ] `npm test`
- [ ] `npm run knip`のUI関連結果を分類・解消
- [ ] `npm run build`
- [ ] docs/uiのパス・props・アルゴリズムが実装と一致
- [ ] Callout/SpecSheetListが不要なClient Componentではない
- [ ] 全button/link/input/textareaに可視focusがある
- [ ] Header drawerでEscape・focus trap・focus restoreが動く
- [ ] `transition-all`が根拠付き例外以外にない
- [ ] card surfaceの反復クラスが例外以外にない
- [ ] UI内で図版専用`--color-ink/brand/border`を使っていない
- [ ] 見た目を変えたコンポーネントのgallery画像を更新

## 8. 主要参照ファイル

- `docs/design-system/design-system.md`
- `src/styles/globals.css`
- `src/styles/README.md`
- `scripts/lint-ui.mjs`
- `src/lib/component-loader/index.ts`
- `src/components/layout/Header.tsx`
- `src/components/ui/Callout/Callout.tsx`
- `src/components/ui/SpecSheetList/`
- `src/components/ui/RelatedArticles/`
- `src/components/ui/MetaCard/MetaCard.tsx`
- `src/components/ui/NavLinkCard/NavLinkCard.tsx`
