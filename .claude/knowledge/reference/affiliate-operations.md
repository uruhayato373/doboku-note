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
| ビルドジョブ | 全 docs サイドバー / モバイル記事末 / 本文 inline（163 枚） | **〜2026-08-31**（¥50,000 増額キャンペーン） |
| GKSキャリア | 同上の**自動復帰先** | 2026-09-01 〜（`isCampaignActive()` が false になり自動切替） |
| 建設JOBs | 記事ページ A/B（slug ハッシュ 50/50）＋ カテゴリ hub 併置 | 恒久 |
| ハイクラス DX・コンサル | 総監（pe-comprehensive-management）の docs サイドバー ＋ hub | 恒久（総監はシニア層で施工管理系がミスマッチ） |

---

## 7. 計測

### GA4 クリック計測のラベル規約

アフィリエイトリンクは `data-cta="affiliate"` ＋ `data-cta-label="{label}"` を持ち、`AnalyticsProvider` が `affiliate_cta_click` として GA4 へ送る（eventName ベース集計・allowlist は無いので新ラベルは自動で乗る）。

- **サイドバー枠**: `{Program}-sidebar`（例 `BuildJob-sidebar`）
- **その他の面**: `{Brand}-{surface}`（例 `BuildJob-midtext` / `BuildJob-hubcareer`）
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

`check-affiliate-wiring` は初回実行で実際に収益の穴を検出した（dx-consulting がサイトに配置済みなのに `programIdMap` から漏れており、成果が突合できていなかった）。

---

## 9. 関連

- [a8-affiliate-pipeline.md](a8-affiliate-pipeline.md) — A8 固有（案件開拓 scout ＋ 成果 CSV 取込）
- [measurement-incidents.md](measurement-incidents.md) — 計測データの罠
- `docs/project/01_戦略/04_収益化戦略.md` — 収益化戦略
- `docs/project/04_運営/08_転職アフィリ記事ビルド計画.md` — 記事側の設計（note 記事 N1-N12 含む）
- `docs/project/04_運営/09_BuildJob収益最大化スプリント.md` — 高意図 slug の選定根拠
