# アフィリエイト運用 SSOT（3 ASP 横断）

doboku-note のアフィリエイト運用（提携・配置・計測）の真実源。
A8 / もしも / afb の 3 ASP を横断する。

- **提携カタログ（機械可読）**: `.claude/state/ads/affiliate-catalog.json`
- **ASP 接続設定（機械可読）**: `.claude/config/affiliate-asp.json`
- **mat レジストリ（機械可読）**: `src/config/affiliate-mats.json`
- **A8 の成果取込**: [a8-affiliate-pipeline.md](a8-affiliate-pipeline.md)（scout ＋ report。役割が違うので分離）

最終更新: 2026-07-27

---

## 1. 収益方針: 転職アフィリ一本

2026-06-25 改定。**講座/教材/添削（SAT・独学サポート）と書籍（BookCard）アフィリエイトを完全廃止**した。

理由＝これらは「学習にお金を払う財布」を取りに行くが、その財布は doboku-note の **note 有料商品と同一**で、外部講座へ送客すると自社の高粗利商品をカニバる。note 有料は月 ¥114k の実証済みエンジン、一方で講座/書籍アフィリはクリックほぼゼロだった。

- **学習・受験意図 → note（自社・高粗利）が独占**
- **キャリア意図 → 転職アフィリ（唯一の稼働アフィリ）**。建設・施工管理特化の転職エージェント/サイト。会員登録・無料相談などの低ハードル成果で ¥4,500〜¥50,000/件

> [!important] Red Line
> **講座・教材・添削・書籍のアフィリエイトは提携しない・配置しない。**
> カタログで `redLine: true` の案件は `npm run affiliate:apply` が `--commit` でも申請を拒否する。
> 本文 prose への再提案は `npm run check-affiliate-prose`（denylist=`src/config/affiliate-prose-denylist.json`）が
> pre-commit ＋ `r2-audit.yml` で機械検知する。

---

## 2. サイト帰属（3 ASP 共通・最重要）

**3 ASP すべてで doboku-note と stats47（統計で見る都道府県）が同一口座に同居し、既定では stats47 側が選択されている。**

| ASP | サイト分離 | 既定 | doboku-note | stats47 |
|---|---|---|---|---|
| A8 | **不可**（口座横断） | — | mediaId `a25050375786`（口座単位） | 同一口座 |
| もしも | 可（`shop_site_id`） | — | `672381` | `638943` |
| afb | 可（`partner_site_id`） | **stats47** | SID `984453` | `959426` |

切り替えずに読むと他サイトのデータを自分のものと誤認する。**実際に afb の走査で SID 不一致を警告して続行し、stats47 の一覧を読んで「建設系 0 件」と誤報告した事故が起きた。**

判定は `scripts/lib/asp-site-guard.mjs` に集約し、**不一致は例外で落とす**（`assertSiteOrThrow`）。
戻り値で返すと呼び出し側が「警告して続行」できてしまい、それが事故の直接原因だった。
`--force` 相当の迂回手段は作らない。回帰テストは `tests/asp-site-guard.test.mjs`（事故そのものをケース化）。

### もうひとつのガード: 偽陰性（見えていないものを「解除された」と書かない）

site-guard が守るのは**帰属**、こちらが守るのは**実在**。
セッション切れは「取得は成功したが 0 件」という形で来るため `failed` に入らず、
`approved → none` の一括ドリフトとして**そのまま書き込まれる**。
2026-08-13 の実行ログに `a8/partnered: 0 件（SID a25050375786）` `moshimo/partnered: 0 件（SID 672381）`
が残っており、**`--write` を付けていればカタログの approved が none で塗り潰されていた**
（付けていなかったため無傷）。

「実機が本当に 0 件」と「ログインが切れて見えていない」は**区別できない**。
区別できない以上、破壊的な側（全消し）へ倒さない。判定は `scripts/lib/asp-falsenegative-guard.mjs`
の `detectFalseNegative`（純関数）に集約し、**ある ASP の approved が全滅するドリフト**なら
`--write` を exit 4 で中止する。一部だけ解除されたケース（実際に起こりうる）は通す。
`--write` 無しでも疑いは surface する。回帰テストは `tests/asp-falsenegative-guard.test.mjs`（6 ケース）。

判定の優先順位:
1. **サイト ID の read-back が最強の証拠**。一致すれば通す。ここで禁止文字列を見ない（サイト切替 UI 自体が全サイト名を列挙するため必ず誤検知する）
2. ID が取れない ASP のみ表示名でフォールバック。弱い判定なので、このときだけ禁止文字列（`統計で見る都道府県` / `stats47`）を適用する
3. ID も名前も確定できなければ通さない（「取れなかった」は「OK」ではない）

A8 だけは**管理画面にサイト切替が存在しない**ため、assert 対象は口座（mediaId）で、doboku-note の分離はレポート単位（`siteScope`）で行う → [a8-affiliate-pipeline.md](a8-affiliate-pipeline.md)。

---

## 3. ASP 別のクセ（実機で踏んだもの）

機械可読な設定値は `.claude/config/affiliate-asp.json`。ここは「なぜそうなっているか」。

### もしも

- **検索は `words=`。`keyword=` は無視され全件（790 件）返る**。これに気づかず「建設案件なし」と誤読しかけた
- **申請ページにサイト select がある**（`メディアを選択 / 統計で見る都道府県 / doboku-note`）。選択せずに押すと stats47 側で提携する。URL に `shop_site_id` を付けるだけでは足りず、select を read-back してから押す
- **同一ページに「一括提携申請へ」がある**。候補語を部分一致（"提携申請"）で拾うと**複数案件を一度に申請**する。exact 一致 ＋ 「一括」除外が必須
- 状態判定をページ全文の `提携中` で見るとナビの「提携中プロモーション」リンクに誤ヒットする。本文の単独行で判定する
- 成否確認は詳細ページの表記に頼らない。`apply_status=1`（申請中）/`=2`（提携中）の一覧を `shop_site_id` スコープで引く

### afb

- **サイト切替は Chosen.js ウィジェットの実クリックだけが効く**。URL パラメータも、非表示 select に JS で change を出す方法も効かない
- `locator("#a, .b").first()` は**セレクタ順ではなく DOM 順**で選ぶ。ページには表示件数などの Chosen も居るので **ID 指定を単独で先に試す**
- **1 ページの読み込みに 1〜1.5 分**かかる（回線由来）。既定 30 秒だと切替もページ送りも取りこぼす。`timeoutMs` / `siteSwitchWaitMs` とも 90 秒。**固定 sleep ではなく `waitForFunction` で「SID が期待値になる」ことを直接待つ**
- **headless: true だと `requiredlogin` へ飛ばされる**。常に headed
- **storageState を保存しても別プロセスで復元できない**。ログインから作業完了までを 1 プロセスで完結させる
- ログイン判定を可視テキストの部分一致でやると**読み込み途中のページを通す**。管理画面固有の DOM（`#top_site_select`）の実在で判定する。かつそれは**一覧ページにしか無い**（ホームで判定するとログイン済みでも永久に検知できない）
- 送信は `<button>` ではなく `input[name=search_x]`
- 一覧は `【PID:N】` から始まる 4 行ブロック。行単位の grep では取りこぼす

> [!warning] 「見つからなかった」と「探せなかった」を混同しない
> afb 走査は検索 5 語のうち 2 語が回線タイムアウトで取得できていない。
> これは「afb に建設案件が無い」ではなく「**検索できた範囲には無かった**」。
> カタログの `_openQuestions` に未確認として明記し、`status: "unknown"` と `"none"` を語彙として分けている。

---

## 4. スキーマ

### `.claude/state/ads/affiliate-catalog.json`

**自社が配置する / 配置を検討する案件だけ**を持つ。同一案件が複数 ASP に存在するため、**ASP 間の単価・確定率・EPC を比較できること**がこのファイルの存在理由。

```jsonc
{ "schemaVersion": 1, "updatedAt": "...", "verifiedAt": "YYYY-MM-DD",
  "programs": {
    "buildjob": {
      "label": "...", "vertical": "civil-career",
      "placement": "active" | "none",     // サイトに実配置しているか
      "redLine": true,                     // 任意。申請を機械で拒否する
      "decision": "なぜこの ASP を選んだか（人が読む）",
      "asps": {
        "a8":      { "programId": "s000...", "status": "approved",
                     "rewardYen": 50000, "epcYen": 942, "confirmRatePct": 48.97 },
        "moshimo": { "promotionId": "6353", "status": "approved", "rewardYen": 50000 },
        "afb":     { "pid": "14065", "status": "unknown" } } } } }
```

`status` の語彙（`_statusVocab` が SSOT）:

| 値 | 意味 |
|---|---|
| `approved` | 提携済み（広告リンクを発行できる） |
| `applying` | 申請中（審査待ち） |
| `none` | その ASP では未提携 |
| `unavailable` | その ASP に案件自体が無い |
| `unknown` | **未確認（調べていない）。`none` と区別する** |

`.claude/state/ads/a8-catalog.json`（143 件・A8 scout の状態機械）とは**マージしない**。あちらは「A8 で何を見つけ何を申請したか」、こちらは「自社がどの案件をどの ASP で運用するか」。

---

## 5. 運用フロー

| したいこと | コマンド / スキル | 備考 |
|---|---|---|
| 3 ASP の提携状態を実機と突合 | `/affiliate-status`（`npm run affiliate:status`） | read-only。`--write` でカタログ反映 |
| 提携申請 | `/affiliate-apply`（`npm run affiliate:apply`） | dry-run 既定・`--commit` gate・**規約同意を伴うのでユーザー承認必須** |
| afb の未提携案件を探す | `npm run afb:scan -- --query 建設,現場` | 検索モード既定。crawl モードは 38 ページで実用的でない |
| A8 の案件開拓 | `/scout-asp` | A8 専用。こちらとは別系統 |
| A8 の成果 CSV 取込 | `/a8-report` | [a8-affiliate-pipeline.md](a8-affiliate-pipeline.md) |
| 配線の整合検査 | `npm run check-affiliate-wiring` | pre-commit |

### 安全弁

1. **サイト帰属 assert は例外で止まる**（迂回手段を作らない）
2. **提携申請は規約同意を伴う不可逆操作** → ユーザーの明示許可を都度取る。`--commit` が無ければ押さない
3. **「一括提携申請へ」を絶対に押さない**（exact 一致 ＋ 「一括」除外）
4. **Red Line 案件は `--commit` でも申請しない**（gate の手前で落とす）
5. **ログイン・CAPTCHA・2FA は人間**。認証情報は環境変数にも置かない（`storageState` を gitignore 済みの `.local/` にのみ）
6. **配置の判断は人**。提携できたからといって自動で配置しない（枠は 3 つでカニバリ回避の手キュレーション）

---

## 6. 配置ポリシー

### 配置原則

- doboku-note のメイン導線は「ここだけで合格できる」体験。アフィは**補完ポジション**
- LP 煽り表現（「絶対合格」等）は禁止
- **ファーストビュー（記事冒頭）には置かない** — メイン導線と矛盾する
- 広告主の公称値は **PR バッジ付きカード内（`points`）に限定**し、本文の編集記述には入れない（広告/編集の分離・ステマ規制配慮）

| 配置 | 形式 | 理由 |
|---|---|---|
| 本文中インライン | テキスト | 自然な文脈で挿入でき煽り感が出ない |
| Callout 内（補足・参考） | テキスト | 自然な形で置ける |
| 記事末の CTA | バナー | 視覚的訴求・行動喚起 |
| hub の補完導線 | バナー | 「もっと深く」の出口 |
| ファーストビュー | 使わない | メイン導線と矛盾 |

### バナー実装の必須ルール

1. **計測ピクセル（1×1 img）は必ずセットで貼る** — 外すと成果が計測されない
2. **1 ページ 1 ピクセル**（同一 mat の二重発火を避ける）。複数面に同案件を出す場合、発火源を 1 つに決め他は href のみ
3. `loading="lazy"` を付ける（LCP 保護）
4. `width` / `height` を指定する（CLS 防止）
5. `alt` を埋める
6. **A8 の JavaScript 型バナーは使わない** — Next.js で動かない。「旧版を表示する」でシンプルな `<a><img/></a>` を取得

### 現在の配置（真実源はコード）

配置ロジックの真実源は `src/config/affiliate-creatives.ts`。本ドキュメントは方針のみ持ち、creative の URL・mat・出し分け条件はコードとレジストリを正とする。

| 案件 | 面 | 期間 |
|---|---|---|
| ビルドジョブ | 全 docs サイドバー / 記事末（**キャリア記事を除く**全ビューポート） / 本文 inline。キャンペーン中は civil 全ページ | **〜2026-08-31**（¥50,000 増額キャンペーン） |
| 建設JOBs | 9/1 以降の civil 記事面（docs サイドバー / 記事末カード）**100%** ＋ カテゴリ hub 併置 | 恒久（キャンペーン中の記事面は hub のみ） |
| GKSキャリア | **カテゴリ hub の補完枠のみ**（9/1 以降）。記事面には出ない | 2026-09-01 〜 |
| ハイクラス DX・コンサル | 総監（pe-comprehensive-management）の docs サイドバー ＋ 記事末 ＋ hub | 恒久（総監はシニア層で施工管理系がミスマッチ） |

**2026-08-04 の変更**（9/1 復帰後の arm 設計・前倒し決定）:

キャンペーン終了時の自動復帰先を「GKS ＋ slug ハッシュ 50/50 A/B」から **建設JOBs 100%** に変更した。
機械の切替点は `POST_CAMPAIGN_AB_ENABLED`（`src/config/affiliate-creatives.ts`・既定 `false`）で、
`true` に戻せば従来のハッシュ A/B（arm A = GKS）に復帰する。根拠は §6.5 裁定ログ 2026-08-04。
GKS の creative・カード文言はコード上に温存し、hub の補完枠として露出とピクセル源を保つ。

**2026-07-28 の変更**（GA4 実測にもとづく）:

1. **面ごとに広告の型を分けた**。デスクトップが流入の 82%（8,557 sessions）を占めるのに
   記事末に導線が無く、PC 唯一の枠だったサイドバーは 1 クリック（0.01%）しか取れていなかった。
   同じ位置の note CTA は 393 クリック（4.6%）＝場所は効くのに広告だけ不在だった。整理後:
   - **記事末＝300×250 ディスプレイバナー**（`SidebarAdBanner` + `resolveDocsCareerSidebarAd`）。
     隣の note もくじタイル（300×250）と同寸で 2 タイル横並び。全ビューポート表示
   - **本文中間＝ネイティブカード**（PR＋見出し＋説明＋points＋CTA）。訴求文章のカードは
     読者の文脈が続いている本文中が適所で、記事末には置かない
   - **ピクセルはサイドバー側のみ**が持ち、記事末・本文中間は href のみ＝「1 ページ 1 ピクセル」不変
2. **本文中間の枠を 1 記事 1 個から記事長依存（1〜3 枠）へ**。1 枠だと長文で note と転職カードが
   奪い合っていた。転職カードの対象も career タグ限定から affiliate 対象カテゴリ全体へ拡大
   （全 1,109 記事中 824 記事が記事内導線を持つ。手書き inline 保有 119 記事は自動抑制）
3. **キャンペーン中の BuildJob 固定を高意図 36 slug 限定から civil 全ページへ拡大**。
   その 36 slug は流入上位 100 ページに 1 つも入っておらず（セッション実質 0）、
   実流入の学習系ページが 50/50 A/B のまま低 EPC 側へ半分（1,567 セッション）流れていた。
   A8 公開 EPC は BuildJob 942 円 / 建設JOBs 709 円

> [!note]
> 9/1 以降は **GKS（457 円）< 建設JOBs（709 円）と逆転する**ため、2026-08-04 に
> 復帰先を建設JOBs 100% へ変更済み（上記「2026-08-04 の変更」・§6.5 裁定ログ）。

### キャリア記事の記事末には広告を置かない（2026-08-21）

`tags: [career]` の記事だけ、記事末の 300×250 バナーを**内部次行動**（`CareerNextStepNav`）へ
置き換えた。悩みに対応する柱と、キャリア hub へ戻す 2 枚のリンクを出す。

根拠は 2026-07-16〜08-12 の実測で、**記事末は 975 表示 0 クリック（CTR 0.00%）**。同じ枠に別の
広告を入れ替えて改善する根拠が無い一方、本文中間は 0.41% で最良だった。転職 CTA は本文中間へ集約する。

- **非キャリア記事の記事末バナーは従来どおり**（学習意図の読者には資格取得後の文脈が自然に効く面が残る）
- ピクセルは引き続きサイドバー 1 箇所のみ＝「1 ページ 1 ピクセル」不変
- 判定は `isCareerDoc(meta)`（真実源は frontmatter の `tags: [career]`）

### 悩み（CareerNeed）別に CTA 文言を出し分ける（2026-08-21）

CTA コピーの真実源を `src/config/career-pathways.ts` に集約した。slug → need（8 値）→ CTA 文言。

- **面談が成果点のサービス（ビルドジョブ / GKS）と、会員登録が成果点のサービス（建設JOBs）で
  同じ「相談」コピーを使い回さない**（`affiliateCta.consultation` / `.registration`）
- need が解決できない slug は既定の汎用文言に倒す。**未分類を無理に広告へ寄せない**
- 「今すぐ登録」「必ず年収」等の短絡表現は `FORBIDDEN_CTA_PHRASES` に列挙し、テストで機械的に止める
- MDX 本文の `<CareerAffiliate>` には slug を書かない。docs ページが components map で自動注入する
- hub の入口選択は `career_need_select`（`event_label=need` / `cta_placement=career-hub`）として計測する

### キャリア面の構造（hub → 5 柱 → 補助記事の 3 層・2026-08-21）

キャリア記事 38 本を横並びの量産物として扱わず、入口 1 本・柱 5 本・補助記事の 3 層にした。

| 層 | 記事 | 役割 |
|---|---|---|
| 入口 | `civil-construction-1-guide-career` | 6 つの悩みから読むページを選ばせる。診断が主役でサービス紹介ではない |
| 柱 | quit-or-stay / market-value / career-path / resume / career-agent-comparison | 悩みごとの答え |
| 補助 | 残り 33 本 | 必ず 1 本以上の柱へ接続する |

守る不変条件（`npm run report-career-funnel` が実測を出す）:

- hub → 5 柱、5 柱 → hub が双方向で通る
- career 記事は全件が最低 1 本の柱へ繋がる
- 記事の所属（pillar・5 値）は `.claude/config/career-funnel.json`、読者の悩み（need・8 値）は
  `src/config/career-pathways.ts`。**粒度が違う 2 つの分類**で、ずれはテストが止める

**内部リンクの数え方**: `/docs/{slug}` の literal だけでなく `<RelatedKeywords>` の `slug:` と
TS 設定（`career-pathways.ts`）も数える。MDX だけを走査すると、hub の入口を
コンポーネント化した時点で「hub が柱へ繋がっていない」と誤報告する。

### キャリアの計測は 2 つの窓を混ぜない（2026-08-21）

`npm run report-career-funnel` が流入 → 回遊 → CTA → 成果を 1 枚にする。設計上の約束:

- **GA4 と GSC の窓は一致しない**（GA4 = 直近 28 日 / GSC = 3 日遅れの 28 日）。出所を跨いで
  CTR や EPC を割らない。不一致は異常ではないので WARN 止まり
- A8 管理画面のクリックは stats47 と同一口座に同居するため**分母に使わない**。分母は GA4
- 改善前の基線は `--freeze` で `career-funnel-baseline-<GA4窓終端>.json` に固定名で凍結する。
  `-latest` は定義上動くので前後比較の対象にできない
- GA4 上位ページは上位 N のみ。載っていない記事の users/sessions は「0」ではなく**観測範囲外**

### 読者が自分で棚卸しするツール（2026-08-21）

`/tools/career-check`。競合が持つ求人件数や転職事例を模倣せず、
「資格 × 工種 × 工事規模 × 立場」を読者自身が整理できる一次資産として置く。

- **判定しない**（転職可否・想定年収・採用可能性を出さない）。返すのは論点・次に読むページ・
  面談で聞く質問・工事経歴の書き出し項目
- 入力は全て選択式。氏名・会社名・連絡先・年収・自由記述のフィールドを DOM に置かない。
  保存も送信もしない。GA4 へは列挙値のみ
- **緊急性の悩み（体調・ハラスメント）では転職 CTA を出さず**、公的窓口を先に出す
- affiliate は結果を示した後に 1 枚だけ

### note キャリア L2 は「先に作らない」（2026-08-21 の判断）

キャリア専用の note L2（もくじ）は**意図的に作っていない**。理由は基線の実測にある。

career 記事 38 本の GSC クリックは**全件 0**で、高意図クエリも 28 日で表示 7・クリック 0。
入口に人が来ていない状態で note 側の受け皿を先に作っても、空の漏斗を長くするだけになる。

**着手条件**: EXP-008（`.claude/state/experiments.json`）の 28 日評価で
career の GSC クリックが 0 から動き、hub → 柱の遷移が観測できたとき。
そのとき初めて note 側へ広げる。条件を満たさなければ作らない判断も含めて、実験の close で決める。

前提として DN-0101（note L1/L2 の再編）が先に完了している必要がある。

### 期間限定案件の境界はビルド時に固定される（SSG の制約）

`isCampaignActive()`（`src/config/affiliate-creatives.ts`）は `Date.now()` を**ビルド時に 1 回だけ**
評価する。本サイトは `output: 'export'` の SSG なので、判定結果はそのまま HTML へ焼き込まれる。
`cloudflare-deploy.yml` の trigger は `push: branches:[main]` と `workflow_dispatch` だけで cron が無い。

つまり**期間の切れ目をまたいでも、本番を再ビルドするまで終了済み案件を配信し続ける**。
サイドバー・記事末・本文 inline・小バナーのすべてが対象になる。切替日以降に main への push が
無いときは、コード変更ゼロで再ビルドを 1 回打つ。

```bash
gh workflow run cloudflare-deploy.yml --ref main
```

日付ゲートを持つ creative を入れるたびに再発する制約なので、期間限定案件を追加する際は
終了日の翌日に再ビルドする段取りまで含めて決める。

### A8 の月次成果は UI 取得が実装済み（手入力ではない）

```bash
npm run a8-ui:fetch -- --month 2026-08 --reports site-summary,program-detail
npm run a8-ui:normalize -- --latest
```

`headless:false` で起動するので、ログインと CAPTCHA だけ人間が通せば以降は自動で進む
（`scripts/fetch-a8-ui-csv.mjs`・プロファイルは `.local/playwright-a8-profile`・ローカル専用）。
取り込み後の EPC は `npm run report-buildjob-affiliate` で見る。

**当月分の確定額は翌月以降へずれる**。A8 の承認処理が月をまたぐため `revenueYen: 0` は異常ではなく、
恒久判断には翌月の再取得が要る。取得期限の監視は `npm run check-a8-report-due`。

---

## 6.5 成果ドリブンの見直し基準（判断マトリクス）

> 「クリックは測れているが、成果を見て配置を変える基準が無い」状態を埋める節。
> 数値は `a8-results.json`（確定額）と GA4 `affiliate_cta_click`（クリック）を正とする。
> ここには「何を観測し、何を打ち手に決めたか」を記す。判定は人。機械ゲートは作らない（月次・低頻度）。

### 2 つの EPC を混同しない（最重要）

| 種類 | 出どころ | 使いどころ |
|---|---|---|
| **ASP 公開 EPC**（市場平均） | `affiliate-catalog.json` の `asps.a8.epcYen`。他メディア込みの全体統計 | **案件を選ぶ前**の期待値見積り |
| **自サイト実測 EPC** | 確定額（`a8-results.json`）÷ **GA4 の `affiliate_cta_click`** | **撤去・入替・A/B 勝敗**の判定 |

catalog の EPC 942 円（ビルドジョブ）／709 円（建設JOBs）は前者。**これで勝敗を決めてはいけない**
（自サイトの読者層・面の文脈が反映されていない）。

**案件別の分母に A8 のクリックを使ってはいけない**。`a8-results.json` の `clicks` は
プログラム別レポート（**口座横断**）由来で stats47 のクリックを含みうる。
2026-07 実測では自社 4 案件の合計 75 click に対しサイト別の doboku-note は 56 click（19 の超過）。
サイト分離できるのはサイト別レポートだけで、そこには案件の内訳が無い——
だから**案件別の分母は GA4 のラベル別クリックが唯一の真実源**（`a8-results.json` の `_comment` も同旨。
A8 側の `clicks` は参考値）。A8 から取るのは**成果（発生件数・確定報酬）**。

### 分母規律 — 判定してよい条件

成果が希少（CVR 数%）なので、分母が足りないまま EPC を比べると偶然を実力と誤読する。

- **確定成果が案件あたり 3 件に達するまで EPC 比較をしない**。それ未満は「判定不能」と記録して据え置く
- 目安クリック数 = 3 ÷ 期待 CVR（期待 CVR ＝ ASP 公開 EPC ÷ 報酬単価）
  - ビルドジョブ: CVR ≒ 942/50,000 = 1.9% → 約 160 クリック必要
  - 建設JOBs: CVR ≒ 709/4,500 = 15.8% → 約 19 クリック必要
- **現状（2026-07-27 時点・年初〜7月累計）は全案件が判定不能**:
  ビルドジョブ 56click/確定0（発生1件は cancelled）・GKS 30click/0・建設JOBs 16click/0・DXコンサル 35click/0。
  **合計 137 クリック・確定成果 0 円**＝実測 EPC は全案件ゼロで、比較の土俵にまだ乗っていない

### 判断マトリクス

| 観測 | 解釈 | 打ち手 |
|---|---|---|
| 確定成果 3 件未満 | 判定不能（母数不足） | 据え置き。分母を貯める。**撤去しない** |
| クリック自体が僅少（面あたり月 10 未満） | 案件でなく**面**の問題 | 案件入替でなく配置・文脈の見直し |
| クリックは十分・発生 0 が 2 ヶ月連続 | LP ミスマッチ（読者層と案件のズレ） | 面の文脈を変えるか、別 vertical の案件へ |
| 発生はあるが確定率が ASP 公開値の半分未満 | 質のミスマッチ（登録only等の非承認） | 訴求文面の見直し。改善しなければ入替候補 |
| 実測 EPC が対抗案件の 1/2 未満が 2 ヶ月連続 | 劣後が確定 | 入替候補として裁定ログに起票 |

### A/B 勝者判定（建設JOBs vs ビルドジョブ／GKS）

> [!important] 2026-08-04 に **slug ハッシュ 50/50 A/B は停止**した（9/1 以降は建設JOBs 100%）。
> 以下は A/B を再開（`POST_CAMPAIGN_AB_ENABLED = true`）するときに読む注意書きとして残す。
> 現行の運用は「単一 arm に分母を集中させて実測 EPC を先に得る」であり、勝者判定は
> **時系列比較**（8 月の BuildJob 実測 EPC ↔ 9 月以降の建設JOBs 実測 EPC）に置き換わる。
> 時系列比較は季節性・キャンペーン単価差を含むので、恒久判断には通常単価への割り戻しが要る。

`affiliate-mats.json` は「EPC で勝者を決め、負けたら撤去」と定めるが、**この A/B には設計上の罠が 3 つある**。
判定前に必ず確認する:

1. **8/31 で対戦相手が入れ替わる** — ビルドジョブは増額キャンペーン終了（〜2026-08-31）で
   `isCampaignActive()` が false になる。つまり「2026-09 に判定」すると、
   比較対象のビルドジョブはもう存在しない
2. **増額期のデータで恒久判断をしない** — ビルドジョブ ¥50,000 はキャンペーン価格（通常 ¥13,847）。
   この期間の EPC で勝っても 9/1 以降その条件は無い。恒久判定に使うなら通常単価に割り戻す
3. **露出量が非対称** — ビルドジョブは全 docs サイドバー＋モバイル記事末＋本文インライン 163 枚、
   建設JOBs は記事ページ arm B のみ。EPC はクリックあたりなので露出差に頑健だが、
   **分母の貯まる速度が違う**（建設JOBs の方が判定に時間がかかる）ことを織り込む

**判定指標**: 確定ベース実測 EPC（分子＝`a8-results.json` の確定額、分母＝当該 arm のクリック）。
同率なら発生ベース EPC をタイブレーク。**両案件が分母規律を満たすまで判定を延期する**（期限で無理に決めない）。

**前提**: 実測 EPC の算出には A8 の**単月**成果データが要る。現在 `a8-results.json` は空
（取得期間が累計のため月次に写せない）＝**判定の分母がそもそも供給されていない**。
単月取得（`a8-ui:fetch -- --month`）が入るまで A/B 判定は実行不能。

### 裁定ログ（append-only）

見直しを実施したら `### YYYY-MM-DD（トリガー）` の見出しで下に追記する。
「判定不能で据え置き」も**記録する**（記録が無いと同じ検討を毎月繰り返す）。

### 2026-07-28（基準の新設・初回棚卸し）

- 観測: 年初〜7月累計 137 クリック / 確定成果 0 円（発生 1 件は cancelled）
- 判定: **全案件が分母規律未達＝判定不能**。撤去・入替はいずれも行わない
- 決定: (1) 単月取得が入るまで A/B 判定は延期 (2) 9 月の比較相手は GKS であることを明記
- 未処理: 未配置の提携（constwork＝`placement: none`）の配置可否は別途人判断

### 2026-08-04（9/1 復帰後の arm 設計を前倒し決定・A/B 停止）

- **観測（面別の露出とクリック・GA4 スナップショット 2026-07-30 取得）**:
  **CTR は現時点では算出できない**。`affiliate_cta_impression` は 2026-07-25 に本番反映
  （`445263f55`）されたため、同一スナップショット内で **分母（表示）は約 5 日ぶん・
  分子（クリック）は 28 日ぶん**と窓が揃っていない。GA4 を 7/25 起点で引き直すまで
  「表示 ÷ クリック」を CTR と呼ばない。

  窓を揃えずに言える**確定事実**は上限だけ:

  | 面 | 表示（7/25〜7/29） | クリック（7/02〜7/29） | CTR の上限 |
  |---|--:|--:|--:|
  | サイドバー 300×250 バナー計 | 1,353 | 3 | **≤ 0.22%** |
  | 本文ネイティブカード（`ビルドジョブ`） | 160 | 7 | ≤ 4.4% |

  内訳は DXConsulting-sidebar 764/2、BuildJob-sidebar 325/1、KensetsuJobs-sidebar 264/0。
  **上限どうしの比較で優劣は決まらない**（上限は「これ以下」しか言わない）。
  クリックが 28 日に一様と仮定して 5 日ぶんへ按分すると サイドバー ≈ 0.04% /
  ネイティブカード ≈ 0.8% になるが、これは**仮定に依存する推定**であって観測ではない。
  それでも **サイドバーの CTR が 0.22% を超えないこと自体は確定**で、
  同じ位置の note CTA が 4.6% を取れている（2026-07-28 の観測）ことと合わせると、
  §6.5 判断マトリクスの「クリック自体が僅少 → **案件でなく面の問題**」に該当する。
- **どの面が測れていたか（最重要・見落とすと誤判断する）**: 2026-07-28 の面再編
  （記事末 300×250 ＋ 本文中間ネイティブカード）の commit が **main に入ったのは 2026-07-30**
  （`e4db3940b` を含む最初の main マージ `5c0e9babf` 2026-07-30 13:56 JST）。
  GA4 スナップショットの窓は **〜2026-07-29** なので、**新レイアウトは 1 日も本番に居ない**。
  実際 `BuildJob-endbanner` は表示 0・クリック 0、`article-mid` は表示 1 しかない。
  つまり上表の「本文ネイティブカード 160 表示 / 7 クリック」は、ほぼ全て
  `article-inline`（156）＝**MDX に手書きされた既存の `<CareerAffiliate>`**（約 119 記事）の分。
  **記事末バナーと本文中間カードは現時点で未計測**であり、良し悪しをまだ何も語れない。
- **判定**: 面の形式変更（バナー → ネイティブカード）は**見送り**（ユーザー判断 2026-08-04）。
  新レイアウトが未計測である以上、いま重ねて変えると何が効いたか切り分け不能になる。
  次にやるべきは変更ではなく**計測**＝ 7/30 以降を窓にした GA4 by-label / by-placement の取り直し
  （`npm run fetch-ga4-cta-clicks -- --by-label --days N`・GA4 API は CI/CD 供給）。
- **決定（実装済み）**: キャンペーン終了後の civil 記事面を **建設JOBs 100%** にする
  （`POST_CAMPAIGN_AB_ENABLED = false`）。50/50 A/B は再開しない。理由:
  1. 9/1 に arm A の中身が GKS になり **457 円 < 709 円と逆転**する（露出の半分を低い側へ流す）
  2. 分母規律（確定 3 件）に必要なクリックは 建設JOBs 約 19 に対し **GKS 約 164**。
     現流量（7 ヶ月で全案件合計 137 クリック）では GKS 側の分母は貯まらず、
     50/50 を続けても「判定不能」が延々続くだけで学習が進まない
  3. 単一 arm に分母を集中させれば実測 EPC を最短で得られる
- **据え置き**: 全案件の EPC 比較は引き続き**判定不能**（確定成果 0 件・分母規律未達）。
  撤去・入替は行わない。GKS は hub の補完枠として温存（撤去ではない）。
- **未処理**: A8 単月取得（`a8-ui:fetch -- --month`）が入るまで実測 EPC の分子は供給されない。

### 2026-08-28（DN-0041 P5 期日前裁定・据え置き）

- **観測**: 確定成果は 2026-08-04 時点で 0 件（`a8-results.json` 空・単月取得未実施）。クリックは
  年初〜7月累計 137 click（2026-07-27 時点、上記 2 エントリと同数値）。直近スナップショット
  （`buildjob-report-latest.md`・2026-07-28〜08-24 窓・GA4 プログラム別）では buildjob 7 /
  kensetsu-jobs 1 / dx-consulting 6 = 計 14 click、面別表示合計 12,155。窓が 137 click の集計期間と
  一部重複するため単純合算はしない。
- **判定**: 分母規律（確定成果 3 件）未達＝**判定不能**。9/1 に 50/50 A/B を停止して建設JOBs 単一
  arm へ移行済みのため、以後の判定は arm 間比較ではなく時系列比較（8 月の BuildJob 実測 EPC ↔
  9 月以降の建設JOBs 実測 EPC）になる。
- **据え置き**: EPC 比較は行わない。撤去・入替も行わない。
- **未処理**: A8 単月取得（`a8-ui:fetch -- --month`・ユーザー律速）。再浮上の条件＝確定成果が
  案件あたり 3 件に到達、または単月データ供給で時系列比較が可能になったとき。backlog カード
  （DN-0041 P5）は本記録で閉じ、以降の判定サイクルは本節が持つ。

---

## 7. 計測

### GA4 クリック計測のラベル規約

アフィリエイトリンクは `data-cta="affiliate"` ＋ `data-cta-label="{label}"` を持ち、`AnalyticsProvider` が `affiliate_cta_click` として GA4 へ送る（eventName ベース集計・allowlist は無いので新ラベルは自動で乗る）。

- **サイドバー枠**: `{Program}-sidebar`（例 `BuildJob-sidebar`）
- **記事末 300×250 バナー**: `{Program}-endbanner`（サイドバーと同 creative なので、面を分けて集計するため
  `-sidebar` を `-endbanner` に置換して渡す。`data-cta-placement="article-end"`）
- **本文中間ネイティブカード**: service 名がそのままラベル（例 `ビルドジョブ`）。`data-cta-placement="article-mid"`
- **その他の面**: `{Brand}-{surface}`（例 `BuildJob-midtext`〔現在未使用〕 / `BuildJob-hubcareer`）
- **本文インラインカード**: `CareerAffiliate` は `service` 名がラベルになる

### 真実源の役割分担

| 場所 | 役割 |
|---|---|
| 各 ASP 管理画面 | creative・mat 値・クリック/成果レポートの真実源 |
| `src/config/affiliate-mats.json` | **mat レジストリ（SSOT）**。検証 `npm run check-affiliate-mats` |
| `src/config/affiliate-creatives.ts` | creative 定数と出し分けロジックの真実源 |
| `.claude/state/ads/affiliate-catalog.json` | **どの案件をどの ASP で運用するか**の真実源 |
| `.claude/state/metrics/affiliate/a8-results.json` | **A8 成果**（`/a8-report` が upsert）。doboku 分離は `a8-report-log.json` の `siteSummary` |
| `npm run report-buildjob-affiliate` | BuildJob クリック/EPC 週次レポート |
| 各 MDX | 実際の埋め込み（本文・文面の真実源） |

**MDX 本文への生 mat 直書きは 0**。mat 変更はコンポーネント／config 1 箇所で全配置に反映する。

---

## 8. 整合ゲート（機械）

| コマンド | 検査内容 | 配線 |
|---|---|---|
| `npm run check-affiliate-wiring` | カタログ ↔ `affiliate-mats.json` ↔ `a8-report-automation.json` の programIdMap ↔ 消費側の 4 点突合。`placement=active` なのに mat が無い／`redLine:true` なのに配置されている／mats にあってカタログに無い を検知 | pre-commit |
| `npm run check-affiliate-mats` | 未登録 mat=ERROR / MDX への生 mat 直書き=ERROR / 失効 creative の配置=WARN | pre-commit |
| `npm run check-affiliate-prose` | 廃止アフィリ（講座・添削ブランド等）の本文 prose 再提案 | pre-commit ＋ `r2-audit.yml` |
| `node --test tests/asp-site-guard.test.mjs` | サイト帰属 assert が不一致で throw すること | `npm test` |
| `node --test tests/asp-falsenegative-guard.test.mjs` | approved 全滅ドリフトを偽陰性として検出し `--write` を止めること | `npm test` |

`check-affiliate-wiring` は初回実行で実際に収益の穴を検出した（dx-consulting がサイトに配置済みなのに `programIdMap` から漏れており、成果が突合できていなかった）。

---

## 9. 関連

- [a8-affiliate-pipeline.md](a8-affiliate-pipeline.md) — A8 固有（案件開拓 scout ＋ 成果 CSV 取込）
- [measurement-incidents.md](measurement-incidents.md) — 計測データの罠
- `docs/strategy/04_収益化戦略.md` — 収益化戦略
- `docs/operations/08_転職アフィリ記事ビルド計画.md` — 記事側の設計（note 記事 N1-N12 含む）
- `docs/operations/09_BuildJob収益最大化スプリント.md` — 高意図 slug の選定根拠
