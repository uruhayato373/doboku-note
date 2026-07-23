---
title: 計測・検証事故の記録
---

# 計測・検証事故の記録

計測データの欠損・誤報・不整合、および外部検証サービスとのアクセス罠が発生した過去事例を記録する。**再発防止のための教訓を蓄積**し、新規スキル・エージェント設計時に同じ落とし穴を避ける。

個別事例は時系列の逆順（新しい順）で追記する。各事例は「現象 / 根本原因 / 気づきの遅延理由（or 検出経緯）/ 適用した対策 / 教訓」を明記する。

## 2026-06-05: 計測は CI/CD 供給が正 — 「ローカル creds 未設定＝ブロッカー」は誤り（恒久ルール）

### 現象

週次レビュー（W23）生成時に、NSM/GSC を「ローカルで計測できない・creds 未設定＝制約／ブロッカー」とフレーミングしてレビューに記載してしまった。実際は計測は CI/CD で完結しており、コミット済みスナップショットを読むのが正規手順だった。

同セッションで Instagram API 投稿の検証中、`graph.facebook.com` 呼び出しが **会社 PC のプロキシ（Digital Arts i-FILTER / Palo Alto Networks `auris vsys5`）でブロック**されることも判明（`503` + ブロック HTML が返る）。

### 根本原因（2 つ）

1. **環境の制約**: この作業 PC（Windows）は社内 Web フィルタの背後にあり、**外部 API（Google GA4/GSC、Meta `graph.facebook.com` 等）への直接通信が遮断**される。ローカルから `metrics-reader.mjs` / `fetch-ga4-data.mjs` / `fetch-gsc-data.mjs` や Meta API を叩いても通らない（creds の有無以前にネットワークで失敗）。
2. **ドキュメントの framing 欠陥**: weekly-review / weekly-plan / weekly-improve / nsm-experiment の各スキルが「`.env.local` の `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` / `GA4_PROPERTY_ID` が**前提**。未達なら『NSM セクション: スキップ（計測基盤未整備）』」と書き、**スナップショット読みを「オフラインフォールバック」扱い**していた。これがローカル作業者に「計測できない＝基盤未整備」と誤読させた。

### 正しいモデル（恒久ルール）

- **計測は CI/CD が供給する**: `fetch-metrics.yml`（毎週金 06:00 JST）が GA4（channel 28d / date / **organic 7d**）+ GSC（全体 / **date 7d**）を取得して `.claude/state/metrics/{ga4,gsc}/` に commit。`psi-audit.yml` が PSI を日次 commit。
- **コミット済みスナップショットを読むのが既定の正規手順**（フォールバックではない）。ローカル creds は設計上不要で、**未設定をブロッカー扱いしない**。
- **ライブ fetch は creds + 外部到達性が両方ある環境（例: creds 入りの macOS）限定の任意経路**。会社 PC では到達不能なので使わない。
- スナップショットが 2 週分揃わない等で WoW が出せないときだけ「クリーン WoW は次週から」と注記する。「計測基盤未整備」とは書かない。
- **例外＝ブラウザ計測（2026-07-24）**: `/google-search-growth` は Playwright が**ユーザーの実 Google セッション**で GSC UI を開くため、サービスアカウント API がプロキシ遮断される環境でも UI CSV（理由別の例 URL）を取得できる。これは上記ルールの対象（=外部 API 直叩き）とは別枠の**正当なローカル計測**。CI 化は不可（要ログイン）なので月次手動＋`check-gsc-ui-due` で催促。将来セッションは「ローカルで計測するな」と誤解して退役させない。真実源 [gsc-management.md](gsc-management.md)。

### 適用した対策

- 本ファイルに恒久ルールとして記録（真実源）。
- `weekly-review` / `weekly-plan` / `weekly-improve` / `nsm-experiment` の各 SKILL.md の「前提条件 / 条件未達→スキップ」「オフラインフォールバック」記述を、**「コミット済みスナップショットが既定の取得元。ライブ fetch は creds+到達性がある環境のみ任意」** に統一し、本ファイルへポインタを張った。
- Meta API（旧 IG Graph 投稿経路）も同根で会社 PC 不可だった。IG 投稿は 2026-06-17 に Business Suite（`.claude/skills/social/publish-ig-bs/SKILL.md`・ローカル GUI）へ一本化し、Graph API/Actions cron 経路は全廃。

### 教訓

1. **「計測データが要る」≠「ローカルで API を叩く」**。本プロジェクトの計測は CI/CD 供給で、エージェントは `.claude/state/metrics/` のスナップショットを読むのが正。
2. **外部 API を使う作業は、ローカルの到達性を先に疑う**。会社 PC は Google/Meta 等を社内フィルタで遮断する。到達不能を「設定不足/基盤未整備」と誤診しない。
3. **ドキュメントの framing が誤判断を生む**: 既定手順を「fallback」と書くと、それが主経路の環境で「劣化・未整備」と誤読される。主経路は主経路として書く。

### 関連

- `.github/workflows/fetch-metrics.yml` - 週次 GA4/GSC 取得・commit（計測の本体）
- `.github/workflows/psi-audit.yml` - 日次 PSI 取得・commit
- `.claude/state/metrics/{ga4,gsc,psi}/` - 計測スナップショット（エージェントの既定取得元）
- `.claude/skills/social/publish-ig-bs/SKILL.md` - IG 投稿の現行経路（Business Suite・ローカル GUI）。旧 Graph API/Mac/Actions 経路は 2026-06-17 全廃

## 2026-05-16〜29: R2 アップロード Unauthorized の握り潰しによる本番画像 404（約2週間サイレント）

### 現象

- 本番（`storage.doboku-note.com`）で civil-construction-2 の図版（47 webp）等が 404。ローカル `npm run dev` では表示される。
- `r2-sync.yml`（main push で `img/**` 変更時に `upload-images-r2 --images-only` 実行）は毎回 **"success" 表示**。
- だが実ログは `Done in Xs! Uploaded: 0, Skipped: 0, Failed: 2647`（全件 Unauthorized）。少なくとも 2026-05-16 以降の全 run で `Uploaded: 0`。

### 根本原因

- R2 API トークン（GitHub Secret `CLOUDFLARE_R2_ACCESS_KEY_ID` / `SECRET`）が失効/無効で、PutObject が `Unauthorized`。
- `upload-images-to-r2.mjs` が **個別ファイルの失敗を try/catch で握り潰し、`failed` をカウントするだけで exit 0** を返していたため、workflow が緑（success）のまま。
- 失効前にアップ済みの旧画像（pe / civil-1）は R2 に残り 200 → **「一部だけ出ない」**状態で気づきにくかった。

### 気づきの遅延理由（致命度: 中）

- workflow が success 表示＝監視上は健全に見えた（exit 0 の握り潰し）ため、約2週間誰も気づかず。
- ユーザーが「ローカルでは出るが本番で画像が出ない」と気づいて初めて発覚。

### 検証中に踏んだ「外部検証アクセスの罠」（このサンドボックス固有・再利用可）

- **S3 API 直叩き不可**: `@aws-sdk/client-s3` の HeadObject がプロキシ/TLS で全件 `Unknown` エラー（CDN 200 のオブジェクトすら MISSING と誤判定）。バケット実在判定に使えない。
- **`curl -I` の罠**: `HTTP/1.0 200 Connection established` はプロキシの CONNECT トンネル応答であり実 HTTP ステータスではない。実ステータスは **`curl -s -o /dev/null -w "%{http_code}"`** で取る。
- **CDN 404 キャッシュの切り分け**: 通常 URL が 404 でも「オブジェクト不在」か「404 キャッシュ」か不明 → **`?cb=<random>` のキャッシュバスター**でオリジン(R2)を直に叩いて判定（cb 付きも 404 なら真にバケット不在）。
- **`git cat-file -e <ref>:<path>` の罠（Windows bash）**: `origin/main:path` の `:` が `;`・`/` が `\` に変換され false negative になる。存在判定は **`git ls-tree -r <ref> -- <path>`** を使う。

### 適用した対策

- ユーザーが Cloudflare で R2 トークン再発行 + GitHub Secrets 更新 → `gh workflow run r2-sync.yml` で再同期（`Uploaded: 2647, Failed: 0`）。本番 200 確認。
- **再発防止（code）**: `upload-images-to-r2.mjs` を **失敗1件でも `process.exitCode = 1`** に変更 → 次回トークン失効時は CI が赤く落ちる。併せて Windows パス区切り正規化（`toPosix`。未正規化だと R2 キーが `posts/…\…` になり別の 404 を生む）。
- **二重チェック（CI）**: `.github/workflows/r2-audit.yml` 新設。週次 + 手動で `diff-r2 --images-only --json` を **main 基準**で実行し、未同期 / サイズ不一致 / 認証失敗で赤落ち。
- 注: 上記 code/CI 変更は 2026-05-29 時点で feature ブランチ上に**未コミット保留**（並行セッションとの衝突回避）。handoff `2026-05-29-r2-content-fallback-removal.md` 参照。

### 教訓

1. **一括アップロード/同期スクリプトは「個別失敗の握り潰し + exit 0」を避ける**。1 件でも失敗したら非ゼロ終了で CI を赤くする。success 表示は「全件成功」を意味しなければならない。
2. **"workflow success" は "処理成功" ではない**。集計ログ（Uploaded / Failed）まで見ないと握り潰しを見抜けない。監視は exit code に依存させる。
3. **トークン失効は部分的な症状で出る**（新規追加分だけ欠落、既存は残存）。「一部だけ出ない」は権限/同期の部分失敗をまず疑う。CLAUDE.md §12「Cloudflare トークン期限切れを仮説 1 番」と整合。
4. **本番/ストレージ検証はこのサンドボックスで罠が多い**: 実ステータスは `curl %{http_code}`、CDN キャッシュ切り分けは cache-buster、バケット実在は CDN 経由で確認（S3 直叩きはプロキシで不可）、git の `ref:path` 判定は `ls-tree`。
5. **R2 同期の健全性を受動監視（push 時）だけに頼らない**。`diff-r2` の定期監査で「local にあるが R2 に無い」を能動検知する。

### 関連

- `.claude/scripts/upload-images-to-r2.mjs` - 同期スクリプト（exit 1 化 + パス正規化）
- `.github/workflows/r2-sync.yml` - main push 時の R2 同期
- `.github/workflows/r2-audit.yml` - 週次 diff-r2 監査（新設）
- `.claude/skills/dev/diff-r2/scripts/diff-r2.mjs` - 差分監査
- handoff `docs/handoffs/2026-05-29-r2-content-fallback-removal.md`

## 2026-06-12: OGP 画像が r2-sync の path フィルタ外で 404 → note 外部リンクカード生成不能

### 現象

- note 無料記事（技術士建設部門）から doboku-note の `/docs/pe-construction-*` を URL 単独行で貼っても**リンクカードが生成されない**（note 自身の URL はカード化される）。
- ページ HTML・OGP テキストタグ（og:title/description/url）は**全 UA で 200・正常**。Cloudflare ボットブロックは無関係（`facebookexternalhit`/`Twitterbot`/空 UA/`Validator/1.0`/default-curl すべて 200 を実測）。
- 壊れていたのは **`og:image`（`storage.doboku-note.com/.../ogp.png`）だけが 404**。note のカード生成器はサムネイル取得に失敗してカードを作れない。

### 根本原因（2層）

1. **OGP 生成は手動**: `ogp.png` は `npm run ogp -- --all`（`ogp-create`）で生成するが、新規カテゴリで未実行だと 0 枚。pe-construction(114)/civil-2(31)/concrete系/pe-first-stage が 0 枚だった（`published:false` ドラフトは仕様スキップ）。
2. **R2 同期が ogp を拾わない（核心）**: R2 アップロードは `cloudflare-deploy.yml` ではなく専用 `r2-sync.yml`。その push トリガーの path フィルタが旧 `**/img/**` 限定で、`ogp.png` は記事ディレクトリ**直下**（img/ の外）にあるため **push しても自動同期されない**。既存カテゴリの OGP は過去の手動同期で上がっていただけ。

### 監視がすり抜けた理由

- `r2-audit.yml`（`diff-r2 --images-only`）は「**local にあるが R2 に無い**」は検知するが、「**そもそも local 未生成**」は検知できない（diff の母集合に入らない）。OGP 未生成カテゴリは丸ごと素通りした。

### 適用した対策

- 生成: `npm run ogp -- --all` で未生成 213 枚生成 → pathspec commit（`26630a1b3`）。
- 反映: `gh workflow run r2-sync.yml -f images_only=true` で全画像 upload（`Uploaded: 3041, Failed: 0`）→ og:image 6/6 が 200 を実測。
- **再発防止（code）**: `r2-sync.yml` の path フィルタに `**/ogp.png` `**/ogp.webp` を追加（`b33430063`、次回 deploy で main 反映）。
- OGP 解決はファイル隣接ではなく **slug 解決**（`getOgpImageUrl`＝category プレフィックス剥がし）。`pe-construction-guide-required-essay/article.mdx` のような変則レイアウトは og:image が `pe-construction/guide-required-essay/ogp.png` を指す（隣接判定は誤検知する）。

### 教訓

1. **外部リンクカードが出ない＝まず og:image の到達性を疑う**（HTML/OGP テキストが 200 でも画像だけ 404 で全カードが死ぬ）。検証は `curl --ssl-no-revoke --retry 5 -A facebookexternalhit/1.1 .../ogp.png` の `%{http_code}`（プロキシ 407/000 はノイズ、retry 必須）。
2. **能動監視（diff-r2）は「local にある前提」**。「未生成」は別途、**公開記事 → og:image 解決先の到達性**で検知する必要がある（プレビューは [[project_ogp_r2_sync_gap]]）。
3. **path フィルタは成果物の実レイアウトに合わせる**。`ogp.png` は img/ の外＝`**/img/**` では拾えない。

### 関連

- `.github/workflows/r2-sync.yml` - path フィルタに ogp 追加済み
- `.claude/skills/conversion/ogp-create/` - OGP 生成（手動・新規カテゴリで要実行）
- `src/lib/r2-image-loader.ts` - `getOgpImageUrl`（slug→ogp パス解決の真実源）

## 2026-04-26: GA4 direct US bot スパイクと weekly-metrics 母数汚染

### 現象

2026-W17（4/20–4/26）の GA4 weekly metrics で、**direct activeUsers が w/e 04-26 で 102（前週 49 / 4 週平均 41 から +2.5x）に急増**。同時に bing source も 126 users（前週 72）と高水準。

| 週末 | bing | google | (direct) |
|---|---:|---:|---:|
| 04-12 | 6 | 4 | 10 |
| 04-19 | 72 | 11 | 49 |
| **04-26** | **126** | **30** | **102** |

### 根本原因（bot 流入）

過去 14 日の direct を切り分けた結果、**ほぼ bot 由来**:

| 指標 | 値 | 解釈 |
|---|---:|---|
| 国別 United States | 88 / 130 (68%) | 日本語の土木試験対策サイトに US から direct = bot |
| 国別 Japan | 21 | これがおそらく実ユーザー |
| 国別 (not set) | 23 | 国判定不能 = bot 典型 |
| device | desktop 130 / mobile 8 (94%) | 受験者は mobile 主体のはず |
| landing | `/` ホーム直行 76 (59%) | 検索由来なら個別記事に着地 |
| 日次 4/24→25→26 | 12→25→32 | 2 日で 2.6 倍のスパイク |

`mobilesecurity.trendmicro.com` のスキャナー referral が source 上位に出ており、bot トラフィックが現に到達している。先行する 2026-04-25 Cloudflare Bot incident と時期が一致。Bing source も同様の bot 疑いを残す（過去 28 日 bing 338 / google 41 という日本語サイトとして異常な比率）。

### 検出経緯（致命度: 中）

- ユーザーから「ダイレクトが増えている理由は」と問われたことが起点
- 通常の weekly-metrics サイクルでは「direct +108%」を **トラフィック増の好シグナル** として誤読する設計欠陥が露呈
- GA4 source 単独では bot/human を区別できないため、country × device × landing を交差させて初めて bot 確定

### 影響範囲

- weekly metrics の direct/bing/google 比率が歪み、**実ユーザー動向の判断を汚染**
- Bing Webmaster Tools 登録（2026-04-27, Issue #173）の効果計測も、実ユーザー流入かボット流入かで意味が逆転する
- 過去の weekly-metrics スナップショット（2026-W14 以降）にも同種の bot が混入していた可能性。retroactive な再評価が必要

### 適用した対策

- Issue [#172](https://github.com/uruhayato373/doboku-note/issues/172) を起票（weekly-pdca, Umbrella #82 配下）
- Issue [#173](https://github.com/uruhayato373/doboku-note/issues/173) で Bing Webmaster データと GA4 bing source の整合性確認を計画
- `weekly-metrics` 集計を **Japan フィルタ版に切り替える方針** を提示（実装は #172 で追跡）
- **2026-05-17 追加対策**：
  - `snapshot-weekly-metrics.mjs` は既に `ga4_jp`（country=Japan）を併記する仕様（`metrics-reader.mjs` 内 `fetchGa4Weekly({ country: "Japan" })`）
  - `fetch-ga4-data.mjs`（アドホック取得）も既定で `country=Japan` + 参照スパムリスト除外を ON 化。実測値で `(direct)` 1,641 → 101、`bing` 1,293 → 252 と激減（過去 14 日）
  - `--include-all` フラグで bot 込みの生データに切替可能（bot 比率検証時に使用）
  - スパム参照リスト: `(not set)` / `ntp.msn.com` / `statics.teams.cdn.office.net` / `hustler.zenhp.co.jp` / `mobilesecurity.trendmicro.com`（`fetch-ga4-data.mjs` の `SPAM_REFERRAL_SOURCES`）
  - **bot 比率監査**: `npm run audit-ga4-bot-ratio` で source 別の海外比率を算出し、新規スパム候補を自動 surface（`audit-ga4-bot-ratio.mjs`）。週次サイクルで実行推奨

### GA4 プロパティ側で行う追加対策（推奨・未実施）

スクリプト側フィルタは fetch 時に弾くだけ。GA4 UI で見る数値も汚染されたままなので、プロパティ側で恒久対策する：

1. **不要な参照元のリスト**: 管理 → データストリーム → タグ設定の詳細 → 不要な参照のリスト
   - `mobilesecurity.trendmicro.com`、`hustler.zenhp.co.jp` 等を追加（参照ではなく direct 計上に降格、bot 流入の本質的な遮断にはならないが効果あり）
2. **データフィルタ（内部トラフィック）**: 管理 → データ設定 → データフィルタ → 内部トラフィック除外
   - 自分の作業 IP を除外
3. **既存のスパイクデータの遡及修正は不可**: GA4 はフィルタ適用日以降のみ対象。過去分析は本ファイルの incident 記録を参照して人間が割り引く

### 教訓

1. **「source 別 user 数」の単純な前週比だけでは bot/human を区別できない**。country × device × landing を最低限の判定ディメンションとして併用する
2. **日本語ニッチサイトで US が direct トップは即 bot 疑い**。地理的な需要分布と乖離する流入はまず計測ノイズと仮定する
3. **Cloudflare Bot Fight Mode は完全防御ではない**。Validator 系 UA は弾くが、direct 計上される自動化トラフィックは通過する。GA4 母数の Japan フィルタ運用が現実的な救済策
4. **「増えた = 良い」を起点に分析しない**。スパイクは「実ユーザー増」「bot 増」「計測バグ」「重複 utm」のどれかで、最頻値は後ろ 3 つ
5. **新たな計測ツール導入時（Bing Webmaster 等）は、最初に bot/human の比率を確認してから施策効果計測に進む**。計測ツール側の数字が「実ユーザー」基準になっていないと施策評価が成立しない

### 関連

- Issue [#172](https://github.com/uruhayato373/doboku-note/issues/172) - Bot inflation incident（追跡中）
- Issue [#173](https://github.com/uruhayato373/doboku-note/issues/173) - Bing Webmaster 運用追跡
- Umbrella [#82](https://github.com/uruhayato373/doboku-note/issues/82) - Weekly Metrics PDCA
- 2026-04-25 Cloudflare Bot incident（同根の可能性、本ファイル下方）

### 2026-07-01 フォローアップ（フィルタ後も bing 残留・回遊分析で再確認）

`ga4-source`（5/17・japanOnly＋スパム除外済）で **bing 252 users > google 77（3.3x）** が残存。フィルタで 1,293→252 に激減済みだが、**日本語土木試験サイトで bing>google の逆転は本 incident の署名のまま**。ただし残 252 は 5.36 ページ/session・493 秒・engagement 65% と **human 的挙動**で、単純 bot 署名（1ページ・0秒・直帰100%）ではない＝**「疑わしいが未確定」**。教訓#1 のとおり source 単独では判定不能。**次の CI/CD GA4 取得で bing × device × landing × 新規/再訪 を交差**して確定する（会社PC はプロキシで外部 API 不可＝CI/CD 供給待ち）。

**運用ルール（2026-07-01 確定）**: **GSC を Google 人間検索の真実源（下限）として扱う**。GA4-google（77/2週）≒ GSC(~5クリック/日×14) で両者は一致しており、GSC は汚染されない。GA4 の「organic 84%・低アクセスではない」は **bing 水増し込み**として割り引く。

## 2026-04-25: Cloudflare Bot 保護で外部 RSS/Atom Validator が 403

### 現象

Issue [#80](https://github.com/uruhayato373/doboku-note/issues/80)（RSS/Atom フィード生成）の本番デプロイ後、生成物の妥当性確認で外部 Validator がアクセス拒否された。

| 検証手段 | 結果 |
|---|---|
| `curl https://doboku-note.com/feed.xml`（UA: `curl/8.x.x`） | HTTP 200, well-formed RSS 2.0 |
| `curl https://doboku-note.com/atom.xml` | HTTP 200, well-formed Atom 1.0 |
| [W3C Feed Validation Service](https://validator.w3.org/feed/) | HTTP 403 Forbidden |
| [RSS Board Validator](https://www.rssboard.org/rss-validator/) | Cloudflare チャレンジページに到達 |

フィード XML 自体は技術的に正しく、Bot 保護がアクセスを阻害しているだけ。

### 根本原因

Cloudflare Pages の **Bot Fight Mode** が `Validator/*` 系の User-Agent を「不審なボット」と判定して 403 を返す。これは Cloudflare の Verified Bots（Googlebot / Feedly / Inoreader 等）以外を保護対象にする標準動作で、設定変更しない限り解消しない。

### 検出経緯（致命度: 低）

- デプロイ完了直後の検証ステップで即座に検出（curl 200 / Validator 403 の食い違い）
- 計測の「気づきの遅延」事象ではなく、**検証フェーズで前提が崩れた**ケース

### 影響範囲（同種で躓きうるケース）

Cloudflare Bot 保護下では以下も 403 になる可能性がある:

- Schema.org Validator / Google Rich Results Test（独自ボット側）
- OGP / Twitter Card Validator
- AMP Validator
- Ahrefs / SEMrush 等の独自クローラ（Verified Bot 登録のないもの）

逆に通る経路:

- `curl` / `wget` のデフォルト UA、ブラウザ
- Cloudflare Verified Bots 一覧（Googlebot / Bingbot / Feedly / Inoreader 等）
- `gh api`（GitHub の Verified UA）

### 適用した対策

- 本セッション内: Issue [#159](https://github.com/uruhayato373/doboku-note/issues/159) を fork して **WAF カスタムルールで Validator 系 UA をホワイトリスト** する案を起票（実利用者報告まで保留方針）
- フィード生成完了は #80 で close、**「外部 Validator 通過」は完了条件から外し** インフラ調整スコープに分離

### 教訓

1. **外部 Validator から本番 URL に到達できないことは「コンテンツが invalid」を意味しない**。フィード / 構造化データ / sitemap の妥当性は **ローカル検証**（`python xml.etree.ElementTree.parse()` 等）で先に確認する。外部 Validator は補助
2. **公開エンドポイント（feed.xml / sitemap.xml / robots.txt / OGP 画像）は 3 種類の到達性を意識する**: 人間ブラウザ・主要 Verified Bot・各種 Validator。Cloudflare Bot Fight Mode は 3 番目を弾く
3. **PR の完了条件に「外部 Validator 通過」を含めない**。代わりに「ローカル well-formed 検証」+「本番 curl 200 + body 検証」を完了条件にし、Validator はベストエフォート扱い
4. **計測 / 監視スクリプトが本番 URL を叩く設計のときは UA 偽装の必要性を検討**。Cloudflare 側の Verified Bot 一覧と照合して、自前ボットなら UA 偽装 or `User-Agent: Mozilla/5.0 ...` で回避可能

### 関連

- Issue [#80](https://github.com/uruhayato373/doboku-note/issues/80) - RSS/Atom フィード生成（close 済）
- Issue [#159](https://github.com/uruhayato373/doboku-note/issues/159) - Cloudflare Bot 保護調整（バックログ）
- PR [#158](https://github.com/uruhayato373/doboku-note/pull/158) - フィード実装（merged）
- `scripts/generate-rss.mjs` - フィード生成スクリプト

## 2026-W16: BAILOUT_TO_CLIENT_SIDE_RENDERING による 6 日間 GA4 完全欠損

### 現象

2026-04-05 〜 04-10 の 6 日間、GA4 Data API で `dimension=date` を取得すると当該 6 日の行が完全不在。週次集計では **W16（Apr 7-13）の Organic Search activeUsers が 113 → 27 と -76% 激減** として Issue #83 が自動起票された。

### 根本原因

2026-04-11 commit [`c6ef1148`](https://github.com/uruhayato373/doboku-note/commit/c6ef1148) で修正された `useSearchParams()` を含む `AnalyticsProvider` の構造問題。

- `AnalyticsProvider` が children ラッパーとして機能していたため、Next.js の `useSearchParams()` がすべての子ツリーを `BAILOUT_TO_CLIENT_SIDE_RENDERING` させていた
- 全 750+ ページが server render されず、HTML body に実コンテンツが欠落
- Google クローラーは空の HTML を受信 → de-indexing が進行
- 実訪問者ゼロ化 → GA4 データも当該期間ゼロ

Apr 5 の 144 ファイル H1 構造修正（commit [`3f97641b`](https://github.com/uruhayato373/doboku-note/commit/3f97641b)）と時期が重なり、Google 側の再評価で「中身のないページ」と判定された可能性が高い。

### 気づきの遅延理由（3 つの構造的欠陥）

| # | 欠陥 | 帰結 |
|---|---|---|
| 1 | **データ整合性チェックなし** | metrics-analyzer が週集計値の前週比のみ見る設計。日次 6 日欠損と低量を区別できず「-76% drop」として症状扱い |
| 2 | **日次スナップショット非運用** | 週次 snapshot（`2026-W16.json`）のみ。日次 raw（`ga4-date-*.json`）を分析対象にしていなかった |
| 3 | **サイト健全性監視なし** | GA4 fetch のみで、本番サイトの 2xx / SSR レンダリング監視なし。BAILOUT バグは別作業（SEO 改善）で偶然発覚 |

つまり計測サイクルは **「数字が取れた前提」で差分を見る設計**で、**「数字が正しく取れているか」を検証しない**盲点を抱えていた。

### 適用した対策（Issue [#130](https://github.com/uruhayato373/doboku-note/issues/130)）

| # | 対策 | 実装 |
|---|---|---|
| A | **data-integrity-gate** | `check-data-integrity.mjs` で GA4 date 欠損検知（直近 7 日で 2 日 / 14 日で 3 日以上 → auto Issue） |
| B | **daily-snapshot**（未実装） | 週次ではなく日次 anomaly 検知に拡張 |
| C | **uptime-ping** | 1 日 3 回 curl で SSR + 2xx + 主要キーワード body 含有を検証 |
| D | **crawl-stats-monitor**（未実装） | GSC Crawl Stats API を日次 fetch、5xx rate / coverage エラー急増検知 |
| E | **本ドキュメント** | 事故記録 + 教訓整理 |

### 教訓

1. **「数字がゼロ」は「実績ゼロ」ではなく「計測不可」の可能性を常に含む**。欠損と低量を区別できるガードを持つこと
2. **大規模な UI / SSR 構造変更の後は、必ず本番 HTML の body 非空を curl で確認する**。Lighthouse の Performance スコアだけでは捕捉できない
3. **自動生成された Issue のタイトル（「Traffic-Drop -76%」）を鵜呑みにしない**。症状と原因を分離する最初の一手は「期間内の日次データを sort して可視化」
4. **`useSearchParams()` はサーバーレンダリング境界を壊す**。Next.js 13+ では `Suspense` で明示的にラップする（詳細: [Next.js docs](https://nextjs.org/docs/app/api-reference/functions/use-search-params#static-rendering)）
5. **deploy の多発と安定性は反比例する**。W15-W16 期間 230 commits（うち `test`/`てｓｔ` 系 40+）の deploy 混乱は、原因を特定困難にした副次要因だった。「テスト用 commit は別 branch で」を徹底する（今回 develop 直 push 既定化の引き金の一つでもある）

### 関連

- Issue [#83](https://github.com/uruhayato373/doboku-note/issues/83) - Traffic-Drop 事案（close 済）
- Issue [#130](https://github.com/uruhayato373/doboku-note/issues/130) - 対策 Umbrella
- commit [`c6ef1148`](https://github.com/uruhayato373/doboku-note/commit/c6ef1148) - BAILOUT 修正
- `.claude/scripts/check-data-integrity.mjs` - データ整合性検証 lib
- `.github/workflows/uptime-ping.yml` - uptime 監視
