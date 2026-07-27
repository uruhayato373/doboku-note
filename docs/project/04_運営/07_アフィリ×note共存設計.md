# アフィリエイト × note 有料マガジン 共存設計

策定: 2026-06-10。実装: 2026-06-11（WP1〜WP6 すべて完了）。
アフィリ（SAT・独学サポート・GKS・ビルドジョブ）と note 有料マガジン（¥1,980〜¥7,980）を
各サーフェスでどう併置するかの設計書。実装は Sonnet サブエージェント（下記 WP1〜WP6）。

> [!warning] 2026-06-25 改定で前提が変わった
> **講座/教材/添削（SAT・独学サポート）と書籍（BookCard）アフィリは完全廃止**（note 有料商品とのカニバリ回避）。本書の「書籍 → 講座/SAT CTA」を含む併置設計のうち、講座・書籍に関する記述は**歴史記録**。現行は「学習意図＝note 独占／キャリア意図＝転職アフィリ（GKS・ビルドジョブ・DXコンサル）のみ」。note CTA を他より前に置く note 優先原則は転職アフィリに対して引き続き有効。真実源は `.claude/knowledge/reference/affiliate-operations.md`。

> [!note] 実装ステータス（2026-06-11）
> WP1〜WP6 すべて実施済み。GA4 自然実験（S1: PE サイドバー差し替え）は 2026-06-11 を起点に
> 4 週間測定中。2026-07-09 前後の weekly-review で差の差を評価する（§4 参照）。
> 残タスク: なし（WP1-4 の「SAT サイドバー記述更新」は 2026-06-25 の SAT 完全廃止で消滅）。

関連: `.claude/knowledge/reference/affiliate-operations.md`（アフィリ運用 SSOT）/ `src/config/affiliate-mats.json`（mat レジストリ）/ `src/lib/magazine-placement.ts`（note 配置 SoT）/
`docs/note/技術士総監/noteコンテンツ計画.md`

---

## 0. 設計原則（全サーフェス共通）

1. **自社商品が先、アフィリが後。** note マガジンは粗利率・LTV ともアフィリより高い。同一ページ内の
   DOM 順は「本文 → note CTA → 書籍 → 講座/転職アフィリ」を標準とする。
2. **商品ミスマッチのアフィリは置かない。** SAT に総監講座は存在しない。総監受験者に SAT を見せても
   成約期待値はほぼゼロで、サイドバー一等地の機会費用と誤認リスク（後述）だけが残る。
3. **アフィリは「ジョブ」が違うときだけ note と共存できる。**
   - note = 模範答案・型を手に入れて**自分で書く**（¥2k〜8k）
   - 独学サポート = 自分の答案を**添削・代行してもらう**（中価格）
   - SAT = **一次から体系的に教わる**（¥50k〜）
   - GKS = 受験文脈の外（キャリア）
   ジョブが違えば競合ではなく階段（ladder）。文言でジョブを明示すれば共存は note の障壁にならない。
4. **「講座がない」事実は編集コンテンツ化する。** 総監講座の空白は買わない理由ではなく、
   「総監特化の教材が市場に少ない → doboku-note + note がその空白を埋める」というポジショニング根拠。
5. **景表法・ステマ規制ガード。** 「最も安く深い」等の最上級表現は使わない。価格事実
   （「フル講座の 1/10 以下」）と収録事実（「模範論文◯本収録」）のみで訴求する。
   「総監講座が存在しない」と断定しない（新技術開発センター等の専門系は存在）→「極端に少ない/限られる」。

---

## 1. 発見事項（実装前に認識すべき問題）

> [!warning] 誤認リスク（修正必須・収益設計より優先）
> 以下 3 箇所の SAT `CourseAffiliate` カードが、総監ページの文脈で「記述式答案・業務経歴票の
> 添削にも対応」と表記している。SAT 技術士講座に総監部門の取り扱いがない場合、総監受験者への
> 誤認誘導になる（ステマ規制以前に単純な不当表示リスク）。
> - `essay-exam-strategy/article.mdx:365`（記述式戦略ハブ＝note 完全パック 8 連 CTA の主戦場）
> - `exam-application-guide/article.mdx:344`（業務経歴票ガイド）
> - `course-selection-guide/article.mdx` 末尾（draft・未公開。カード見出しが「技術士 総合技術監理部門 講座」と
>   実在しない商品名になっている）

その他の現状認識:

- PE docs サイドバー（keyword / guide / pastExam）は `note マガジン → GKS → SAT` の順。ただし
  guide / pastExam の大半は placement が EMPTY のため **note CTA なしで GKS + SAT だけが出ている**。
- civil docs の記事末は `書籍 → SchoolCourseCTA(SAT/独学) → … → note inline マガジン` の DOM 順で、
  **note が一番下（AuthorCard 直前）**。原則 1 に反する。
- `course-selection-guide`（独学か講座か）は published:false の draft が既に存在し、内容の骨格
  （択一は独学・穴は記述/経歴票/口頭・部分活用）は良質。リライト＋事実修正で公開できる。

---

## 2. サーフェス別 推奨配置（変更 / 維持 / 削除 / 新規）

### PE（総監）

| # | サーフェス | 現状 | 判定 | 内容 |
|---|---|---|---|---|
| S1 | docs サイドバー SAT（keyword/guide/pastExam・`SAT_SIDEBAR_AD`） | SAT 300×250 | ✅ **変更** | SAT を撤去し、sidebarMagazines が空のとき `/links` note バナーに差し替え（keyword の既存フォールバックを guide/pastExam に拡張） |
| S2 | カテゴリ hub の SAT カード（旧 `resolveCategoryAffiliate`→現 `resolveCategoryCareerAd`） | SchoolAffiliate(SAT) | ✅ **削除** | hub には既に完全パック + 精読ガイドの note CTA がある。**※2026-06-16（PR #256）に hub を 2 カラム化し転職サイドバーを新設＝SAT 削除後の無アフィリ状態を解消（pe=ハイクラス DX/コンサル転職）。下記 WP2 追記参照** |
| S3 | essay-exam-strategy 本文の SAT カード | CourseAffiliate(SAT) | ✅ **変更** | カード削除 → management-tradeoffs への内部リンク段落に差し替え（S5 公開後は course-selection-guide リンクへ更新予定） |
| S4 | exam-application-guide 本文の SAT カード | CourseAffiliate(SAT) | ✅ **変更** | 文言修正で暫定維持（「総監部門の添削対応可否は資料請求で確認を」を明記、断定表現を除去）。アガルート承認後に総監対応講座へ差し替え |
| S5 | course-selection-guide（独学か講座か） | draft 未公開 | ✅ **新規（公開）** | 「総監対応講座の現状」セクションを追加し published:true（2026-06-11）。note CTA を placement.ts に配線。末尾の SAT カード（実在しない総監講座名）は削除。アガルート承認後のアフィリ受け皿 |
| S6 | docs サイドバー GKS（全 docs 常設） | GKS 300×250 | **維持**（〜2026-08-31 はビルドジョブに期間切替） | 別 mat・note CTA より下位置。PE での CTR を 4 週間測定し、極端に低ければ PE のみ抑制を再検討。**2026-06-16: サイドバー転職枠を `resolveCareerSidebarAd()` で期間出し分け（〜8/31 ビルドジョブ ¥50,000 増額キャンペーン、9/1 以降 GKS 自動復帰）。creative の mat・出し分けの真実源は `src/config/affiliate-mats.json` と `src/config/affiliate-creatives.ts`、方針は `.claude/knowledge/reference/affiliate-operations.md`** |

### Civil（1級・2級）

| # | サーフェス | 現状 | 判定 | 内容 |
|---|---|---|---|---|
| S8 | docs 記事末の DOM 順（全カテゴリ共通） | 書籍→講座→note | ✅ **変更** | note inline マガジンを RelatedTextbooks 直後（書籍・講座 CTA より前）へ移動（原則 1）。実際の順: 本文 → RelatedTextbooks → **note マガジン** → 書籍 → 講座/SAT CTA → CategoryNavCard → FAQ → AuthorCard |
| S9 | civil-1 secondary の独学サポート inline（MDX 7 ページ） | 添削訴求 | ✅ **維持＋文言変更** | 「note で型と模範答案 → 自分の工事で書く → 仕上げに添削」の ladder 文言へ。note の前工程ではなく**次工程**として位置づけ |
| S10 | experience-writing-guide（1級・2級） | 個別 CTA のみ | ✅ **新規** | 「経験記述 対策手段の選び方」3 択マップを 1 セクション追加（①模範答案で独学=note ②添削・代行=独学サポート ③体系講座=SAT）。比較表ではなく見出し＋段落（4 列表禁止） |
| S11 | SchoolCourseCTA / CivilSatProductCTA 文言 | 汎用文言 | ✅ **変更** | ジョブ明示へ改稿（SAT=「一次からの学び直し・体系学習」、独学=「書いた答案の添削・代行」）。note と訴求が被らない文言に固定 |
| S12 | civil サイドバー（note マガジン → GKS） | - | **維持** | 順序は既に正しい |

### トップ・横断

| # | サーフェス | 現状 | 判定 | 内容 |
|---|---|---|---|---|
| S7 | トップの HOME_AFFILIATE（SAT 汎用） | SchoolAffiliate | **維持** | creative は資格非依存の汎用文言で、順序も `/links note ハブ → SAT → 書籍` と note 優先済み。変更コスト対効果が低い |
| S13 | data-cta-label 規約 | brand のみ | ✅ **変更** | `{brand}-{surface}` に統一（§4）。GKS→`GKS-sidebar`、SAT-end→`SAT-end` 適用済み |

---

## 3. PE 訪問者向け 訴求コピー案（「SAT に総監講座がない」の活用）

**成立性の判定**: 「総監対応講座は限られる → doboku-note × note が空白を埋める」フレームは**成立する**。
ただし 2 条件付き — (1) 各社の総監対応状況は要事実確認（変動する。公開前に運営者が各社サイトで確認）、
(2) 「最も安く深い」ではなく**価格事実と限定**で言う（「添削・模範論文に限れば」「フル講座の 1/10 以下」）。

講座選択肢マップは**ユーザー価値になる**。「総監 通信講座」系クエリの検索需要を拾い、
「探しても少ない」という訪問者の実体験を編集コンテンツとして言語化することで信頼を獲得し、
note マガジンが「総監特化の数少ない教材」として正当に位置づく。離脱して外部検索される前に
サイト内で答えを出す効果もある。

### コピー案（course-selection-guide 追加セクション用）

リード:
> 総監（総合技術監理部門）に対応した通信講座は、技術士の他部門に比べて極端に少ないのが実情です。
> 大手の技術士講座の多くは 20 部門の二次試験が対象で、総監は対象外か、対応していても
> 総監専用の添削・模範論文までは踏み込んでいません。「探し方が悪い」のではなく、市場がそうなっています。

マップ結論（note 送客）:
> 総監で本当に足りないのは、講義動画ではなく「総監の視点で書かれた答案の実物」です。
> doboku-note は択一の知識体系と記述式の型を無料で公開し、フル模範論文・R8 予想問題・設問 3 の
> 国家施策バンクを note マガジン（¥1,980〜）で提供しています。フル講座に数万円をかける前に、
> まず自分の穴が「知識」なのか「答案の実物」なのかを特定してください。

essay-exam-strategy の SAT カード差し替え段落（S3）:
> 総監の記述式添削に対応した講座・サービスは市場にほとんどありません。講座の現状と独学の
> 組み立ては[独学か講座か（選び方）](/docs/pe-comprehensive-management-course-selection-guide)に
> まとめています。本サイトでは、合格者の書いたフル模範論文と R8 予想問題集を note で提供しています。

exam-application-guide の SAT カード文言修正（S4）:
> description を「技術士試験向けの教材と添削サポートが付く Web 完結型講座。**総監部門の添削対応
> 可否は資料請求時に確認してください。**」へ。現行の「業務経歴票の添削にも対応」という断定を除去。

### Civil CTA 文言の差別化（S10/S11 用）

- note: 「経験記述**この 1 点だけ**を ¥1,980〜で補強。模範答案の型を見て、自分の工事で書き上げる」
- 独学サポート: 「**書いた答案を仕上げたい**人向け。プロの添削・多忙なら作文代行という手段」
- SAT: 「**一次からやり直したい・体系的に教わりたい**人向け。e ラーニング＋質問対応のフル講座」

---

## 4. 測定設計（GA4）

新イベントは不要。既存の `note_cta_click` / `affiliate_cta_click`（AnalyticsProvider のデリゲート計測、
GA4 が page_path を自動付与）＋ラベル規約の統一で足りる。配置は slug 決定論なので
分母（impression）は page_view で代替できる（impression イベント追加は不要）。

### ラベル規約（S13）

`data-cta-label = {brand}-{surface}` に統一:

| 発火元 | 現ラベル | 新ラベル |
|---|---|---|
| SidebarAdBanner（GKS） | `GKS` | `GKS-sidebar` |
| SidebarAdBanner（SAT・S1 で撤去まで） | `SAT` | `SAT-sidebar` |
| CivilSatProductCTA | `SAT` | `SAT-end` |
| SchoolCourseCTA → SchoolAffiliate | （provider 名） | `SAT-end` / `dokugaku-end` |
| CareerAffiliate（本文 inline） | （要監査） | `GKS-inline` |
| DokugakuBanner / SatTextLink | （要監査） | `dokugaku-mid` / `SAT-mid` |

note 側は utm_content がスロット位置を既に符号化しているため変更不要。

### 「アフィリが note 購入の障壁か」の検定方法

相関では因果が取れないため、**S1（PE サイドバー SAT→note 差し替え）を自然実験として使う**:

- 処置群: PE guide / pastExam の placement-EMPTY ページ群（SAT が消え /links バナーが入る）
- 統制群: 元から `sidebarHasPaidMagazine=true` で SAT が出ていなかった PE ハブページ群
- 指標: `note_ctr = note_cta_click / page_view`（週次、weekly-metrics に追加）
- 比較: 差し替え前 4 週 vs 後 4 週の差の差（受験期トレンドは統制群が吸収）
- 損失側: 撤去した SAT-sidebar の affiliate_cta_click × A8 EPC。総監ミスマッチのため期待値 ≈ 0 で、
  note_ctr が横ばいでも純損はない設計

判定: 4 週後の weekly-review で note_ctr 差の差がプラスなら原則 1（note 先行）を civil 記事末順序
（S8）にも確証として適用継続。マイナスなら S8 の順序を再検討。

---

## 5. 実装仕様（Sonnet ワークパッケージ）

> [!important] 共通制約
> - 1 ページ 1 計測ピクセル原則を維持（SAT 撤去はピクセルも同時撤去。GKS は触らない）
> - MDX 書き込みは `lib/mdx-io.mjs` の `writeMdxFile` 経由（CRLF 保持）
> - 変更ファイルのみ `git add` 明示指定、1 WP = 1 commit
> - 完了条件: `npm run build` 通過 + 該当ページを `curl` で `<main>` 確認 + MDX 変更時は `npm run refresh-indexes`

### ✅ WP1: PE サイドバー SAT → note 差し替え（S1）+ ラベル規約（S13）

対象: `src/app/docs/[...slug]/page.tsx`

1. `SAT_SIDEBAR_AD` 定数とその描画ブロック（`category === 'pe-comprehensive-management' && (keyword|guide|pastExam) && !sidebarHasPaidMagazine` の `SidebarAdBanner`）を削除。
2. 既存の keyword 限定 `/links` フォールバックバナー（現 `LinksHubTile`・旧 `MagazineSidebarCard href="/links"`、2026-07 に画像レスタイル化）の条件を
   `docGroup === 'keyword'` から `(docGroup === 'keyword' || docGroup === 'guide' || docGroup === 'pastExam')` に拡張。
   `sidebarMagazines.length === 0` 条件は維持。trackLabel は `links-hub` のまま。
3. ラベル変更: GKS `SidebarAdBanner trackLabel="GKS"` → `"GKS-sidebar"`、`CivilSatProductCTA` の
   `data-cta-label="SAT"` → `"SAT-end"`。`SchoolAffiliate` / `CareerAffiliate` / `DokugakuBanner` /
   `SatTextLink` の data-cta-label 出力を監査し §4 の表に合わせる（コンポーネント側に surface prop が
   なければ呼び出し側で渡せるよう最小追加）。
4. `.claude/knowledge/reference/affiliate-operations.md` の SAT サイドバー記述を更新（「PE 専用」→「2026-06 撤去。総監講座
   非提供のため note /links バナーへ差し替え」）。

### ✅ WP2: PE カテゴリ hub SAT 削除（S2）

対象: `src/config/affiliate-creatives.ts`

1. `resolveCategoryAffiliate` の `pe-comprehensive-management` 分岐を `return null` に変更
   （コメントで理由: SAT は総監講座非提供。course-selection-guide 公開後に内部リンクカード化を検討）。
2. `HOME_AFFILIATE`（トップ）は変更しない。

> [!note] 2026-06-16 更新（PR #256）— この WP2 は後続で上書き
> 「SAT カード削除」自体は有効だが、その後の**無アフィリ状態は解消**した。`resolveCategoryAffiliate` は撤去し `resolveCategoryCareerAd`（資格別 creative セグメント）に一本化。pe-comprehensive は `return null` ではなく**ハイクラス DX/コンサル転職**（`PE_CONSULTING_CAREER_AD`, mat `4B5OO5+NTCZ6+4SXU+NUES1`）を返す＝カテゴリ hub の収益導線ゼロを解消（総監＝シニア技術者層に適合。GKS の 20代未経験/施工管理ミスマッチを回避）。詳細: `.claude/knowledge/reference/affiliate-operations.md`「6. 配置ポリシー」。

### ✅ WP3: PE MDX 3 ページの SAT 表記是正（S3/S4/S5 前半）

対象: `.local/r2/posts/pe-comprehensive-management/{essay-exam-strategy,exam-application-guide}/article.mdx`

1. essay-exam-strategy: `## 記述式対策の選択肢` セクションの `CourseAffiliate`（SAT）を削除し、
   §3 の差し替え段落（course-selection-guide への内部リンク）に置換。course-selection-guide 公開前に
   実施する場合はリンク先を `/docs/pe-comprehensive-management-management-tradeoffs` で暫定。
2. exam-application-guide: `CourseAffiliate` の description を §3 の修正文言に変更（カード自体は維持、
   ピクセルもそのまま）。
3. 文字化けチェック（U+FFFD）+ `npm run refresh-indexes`。

### ✅ WP4: course-selection-guide リライト＋公開（S5）

対象: `.local/r2/posts/pe-comprehensive-management/course-selection-guide/article.mdx`、
`src/lib/magazine-placement.ts`

1. **運営者の事前確認（ブロッカー）**: SAT・アガルート・スタディング・新技術開発センターの総監対応
   状況を各社サイトで確認し、確認日を記事内に明記する。確認なしで公開しない。
2. 新セクション「総監対応講座の現状」を `## 状況別の講座の選び方` の前に追加（§3 リードコピー使用、
   順位付けなし・社名列挙はテキストで）。
3. 末尾 `CourseAffiliate`（「技術士 総合技術監理部門 講座」）を削除（実在しない商品名のため）。
   アガルート承認後にこの位置へ総監対応講座カードを設置する旨を MDX コメントで残す。
4. `## 講座を使わない場合の独学プラン` の末尾に §3 マップ結論コピー＋note 導線の文脈を追記。
5. `published: true` へ変更。
6. placement.ts に配線追加: slug `pe-comprehensive-management-course-selection-guide` →
   `inline: [essay-complete-pack(inline-1), tankan-reading-guide(inline-2)]`、
   `sidebar: [tankan-reading-guide(sidebar-1)]`、`inlineMobileOnly: false`。
7. `npm run refresh-indexes` → commit。

### ✅ WP5: civil 記事末 DOM 順序の入れ替え（S8）

対象: `src/app/docs/[...slug]/page.tsx`

1. `inlineMagazines` 描画ブロックを、最初の `BookSection` / `SchoolCourseCTA` / `CivilSatProductCTA`
   系条件ブロックより**前**（過去問ナビ・TextbookNav・PastExamBacklinks の直後）へ移動。
   目標順: 本文 → 試験ナビ → **note inline マガジン** → FAQ → 書籍 → 講座 CTA → AuthorCard。
   （FAQ の現位置を動かすかは差分最小を優先して Sonnet 判断。必須は「note が書籍・講座より前」のみ）
2. `inlineMobileOnly` の挙動（`zenn-desktop:hidden`）は変更しない。
3. PE ハブ（essay-exam-strategy 等）でも同じ順序になることを確認（note 8 連 CTA が書籍より前に来る
   = 望ましい方向なので問題なし）。
4. 検証: civil-1 guide 1 ページ + secondary 1 ページ + PE hub 1 ページを `npm run dev` + curl で
   DOM 順確認。

### ✅ WP6: civil CTA 文言の ladder 化（S9/S10/S11）

対象: `src/app/docs/[...slug]/page.tsx`（定数文言）、
`.local/r2/posts/civil-construction-{1,2}/` の secondary 経験記述 MDX

1. `SCHOOL_DOKUGAKU.description` → 「模範答案で型をつかんだあと、自分の工事で書いた答案を仕上げたい
   ときに。経験記述の添削・作文代行（1級土木に特化）。」
2. `SCHOOL_SAT.description` → 「一次からの学び直しや、体系的なフル講座で対策したいときに。
   e ラーニングで現場系国家資格を効率よく対策。」
3. `CivilSatProductCTA` の見出し下文言も同趣旨に（「体系的に学習を進めたい場合に」は維持可）。
4. civil-1 secondary 9 ページの MDX 内 独学サポート inline 文言を ladder 文言（§3）へ統一
   （一括スクリプトは `.tmp/` 配下、`writeMdxFile` 経由・冪等）。
5. `secondary-experience-writing-guide`（1級・2級）に「経験記述 対策手段の選び方」セクションを追加:
   3 つの `###` 見出し（①模範答案で独学＝note ②添削・代行＝独学サポート（1級のみ） ③通信講座で
   体系対策＝SAT）＋各 2〜3 文。アフィリリンクは既存配置を参照するのみで**新規ピクセルを足さない**
   （テキストリンクは href のみ）。
6. `npm run refresh-indexes` → 文字化けチェック → commit。

### 実施順序と依存

```
✅ WP2 → WP1 → WP3   （PE 系、2026-06-11 実施済み）
✅ WP4                （2026-06-11 実施済み）
✅ WP5 → WP6          （civil 系、2026-06-11 実施済み）
```

WP1 実施日: **2026-06-11**。4 週後（2026-07-09 前後）の weekly-review で §4 の差の差を評価する。

---

## 6. 将来フック

- **アガルート承認時**: course-selection-guide（WP4-3 のコメント位置）＋ exam-application-guide の
  SAT カード置換が受け皿。総監対応の有無を確認してから配置。
- **スタディング（もしも）申請**: もしも登録済のため即申請可。承認時は同じく course-selection-guide へ。
- **pe-construction（建設部門）公開時**: SAT 技術士講座の正しい設置先はこちら（建設部門二次は SAT の
  実対象）。撤去した `SAT_SIDEBAR_AD` の creative は台帳に残っているため再利用可。
- **civil-2 への独学サポート相当**: 独学サポートは 1級専用。2級の添削ニーズは現状 SAT のみ →
  2級対応の添削サービス開拓が空白。
