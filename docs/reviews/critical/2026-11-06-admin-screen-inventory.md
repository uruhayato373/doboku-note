# 管理画面の棚卸し（2026-11-06）

> [!note]
> 全 78 ページと Route handler 3 本を調べた。機械の集計は Claude、ページごとの読み取りは Codex が独立に行い、上位の指摘は実物で確かめた。判定は案で、統合・削除は運営者が決める。

## 結論

同じデータを読む画面の大半は、答える問いが違うので維持でよい。はっきり重なっているのは販売状態の 1 系統だけで、画面数より、欠測を 0 と見せる不具合のほうが重い。

| 区分 | 件数 |
|---|---|
| ページ | 78 |
| メニューに直接ある | 40 |
| 転送だけ | 7 |
| 統合の候補 | 4（`/product/status`・`/content/note-status`・`/content/kindle`・`/content/magazines`） |

## 確かめた不具合

| 重要度 | 場所 | 内容 |
|---|---|---|
| 高 | `tools/admin-app/src/lib/sales.ts:113` | 売上の読み込みに失敗すると 0 件・0 円になり、累計 0 円と表示する |
| 高 | `tools/admin-app/src/app/metrics/gsc/page.tsx:50` | スナップショットが無いと総クリック 0 と表示する |
| 高 | `tools/admin-app/src/app/metrics/ga4/page.tsx:99` | ページ別タブの履歴を選ぶと `tab=page` が消えて、別のタブへ戻る |
| 高 | `tools/admin-app/src/app/content/note-status/page.tsx:46` | 販売状態の中のタブを押すと別の URL へ移り、親のタブから離れる |
| 中 | `tools/admin-app/src/app/strategy/market/page.tsx:25` | 実績 0 円を「—」と表示し、欠測と同じに見える |
| 中 | `tools/admin-app/README.md:110` | メニューを 6 グループと書くが、実際は 8 領域 |

## 運営者が決めること

1. `/product/status` に note と Kindle の画面を埋め込む形をやめ、入口を 1 つにするか
2. `/content/magazines` の収録の表を `/content/note-status` へ寄せるか
3. 動画の 5 画面（`/content/video`・`/sns/youtube/longform`・`/content/items`・`/sns`・`/metrics/video`）は問いが違うので残すか
4. 転送だけの 7 ページを消すか。旧 URL のブックマークが無ければ消せる

## 全ページの表

Codex の読み取り。「メニュー」は 直＝メニューにある、内＝別の画面から入る、無＝どこからも入らない。

| URL | メニュー | この画面が答える問い | 主なデータ・関数 | 似ている画面 | 提案 | 理由 |
|---|---|---|---|---|---|---|
| `/` | 内 | 今月の受取と主要 KPI はどうか。 | `loadKpiView` | `/metrics/kpi`、`/strategy/channels` | 残す | 概要の入口。 |
| `/affiliate` | 直 | アフィリエイトの成果と要確認事項は何か。 | `affiliate` | `/affiliate/programs` | 残す | 成果を見る画面。 |
| `/affiliate/placements` | 直 | 広告はどこに掲載されているか。 | `affiliate` | `/affiliate/layout` | 残す | 掲載先の台帳。 |
| `/affiliate/programs` | 直 | 提携・案件の状態は何か。 | `affiliate` | `/affiliate` | 残す | 提携状態を見る。 |
| `/affiliate/preview` | 直 | 広告案は実ページでどう見えるか。 | `affiliate` | `/affiliate/layout` | 残す | 目視確認用。 |
| `/affiliate/layout` | 直 | 広告配置の案と記録は何か。 | `affiliate-layout` | `/affiliate/preview` | 残す | 配置判断用。 |
| `/affiliate/layout-shot/[ts]/[file]` | 無 | 配置記録の画像を取得できるか。 | `layoutShotsRoot` | `/media/*` | 残す | 画像配信 API。 |
| `/agents` | 直 | どのエージェントがあるか。 | `loadAgents` | `/skills` | 残す | 対象が異なる。 |
| `/api/character-frame/[pose]` | 無 | 指定したポーズの画像を生成できるか。 | `renderCharacterFrame` | `/gallery/characters` | 残す | 画像 API。 |
| `/content` | 直 | 制作物はどのチャネルに何件あるか。 | `summarizeChannels` | `/content/[...path]` | 残す | ファイル閲覧の入口。 |
| `/content/[...path]` | 内 | 指定した制作物・ディレクトリの中身は何か。 | `listDirectory`、`loadDocument` | `/content` | 残す | 詳細閲覧。 |
| `/content/articles` | 直 | サイト記事の公開・品質状態は何か。 | `articlesIndex`、`qualitySummary` | `/quality` | 残す | 記事単位の一覧。 |
| `/content/expansion` | 無 | 旧教材展開 URL の行き先はどこか。 | `redirect` | `/materials` | 転送だけ | `/materials` への互換転送。 |
| `/content/items` | 直 | 作品と公開行はどこまで進んだか。 | `loadItemList` | `/sns`、`/content/video` | 残す | 公開 ID 単位。 |
| `/content/items/[exam]/[work]` | 内 | 作品の素材と公開記録は何か。 | `content-items` | `/content/items` | 残す | 作品の詳細。 |
| `/content/kindle` | 内 | Kindle 本の制作・鮮度・ロイヤリティはどうか。 | `loadKindleView` | `/product/status` | 統合 | 販売状態にページ全体を再表示している。 |
| `/content/kindle/[id]` | 内 | その本のプレビューはどうか。 | `loadKindlePreview` | `/content/kindle` | 残す | 本ごとの目視確認。 |
| `/content/ledger` | 直 | 商品・原稿・公開状態の横断台帳はどうか。 | `loadLedgerView` | `/content/lineup`、`/content/note` | 残す | 横断の実務台帳。 |
| `/content/ledger/coconala/[id]` | 内 | ココナラ商品の原稿・画像・差分は何か。 | `loadLedgerView`、`readListings` | `/product/status` | 残す | 商品詳細。 |
| `/content/lifecycle` | 直 | チャネルごとの制作段階はどう分布するか。 | `allChannelLifecycles` | `/content/items` | 残す | 段階の横断集計。 |
| `/content/lineup` | 内 | 資格・区分・チャネルの販売中商品の空きはどこか。 | `loadLineupView` | `/product/design`、`/content/ledger` | 残す | 品揃えの空きを見る。 |
| `/content/magazines` | 内 | note マガジンの商品一覧と記事数はどうか。 | `magazines`、`membershipState` | `/content/note-status`、`/product/design` | 統合 | 商品一覧と収録突合を別々に再表示。 |
| `/content/note` | 内 | note 記事の原稿・公開・反映状態は何か。 | `noteArticles`、`noteSyncPlan` | `/content/ledger`、`/content/note-sync` | 残す | 記事単位の作業場。 |
| `/content/note-status` | 内 | note 記事公開とマガジン収録は一致するか。 | `membershipState`、`statusSnapshot` | `/product/status` | 統合 | 販売状態にページ全体を再表示。 |
| `/content/note-sync` | 内 | note への反映待ち・停止理由は何か。 | `noteSyncPlan`、`noteSyncRuns` | `/content/note` | 残す | 反映作業に固有の詳細。 |
| `/content/series` | 直 | シリーズ各章の記事・教材・画像は揃ったか。 | `seriesView`、`imageProgress` | `/materials` | 残す | 章を主語にした計画。 |
| `/content/video` | 内 | 動画パックの企画・台本・QA はどうか。 | `videoPackBoard` | `/sns/youtube/longform` | 残す | パック制作を主語にする。 |
| `/docs` | 内 | 恒久文書をどう探すか。 | `DocRootView` | `/knowledge`、`/plans` | 残す | 対象の文書群が異なる。 |
| `/docs/[...path]` | 内 | 文書本文と関連タスクは何か。 | `DocDetailView` | `/docs` | 残す | 文書詳細。 |
| `/domains/[id]` | 直 | その領域の予定・人員・文書は何か。 | `domainOverview` | `/schedule` | 残す | 領域別の入口。 |
| `/gallery/characters` | 直 | キャラクター素材は何があるか。 | `readCharacterCatalog` | `/api/character-frame/*` | 残す | 素材一覧。 |
| `/gallery/figures` | 直 | サイトの記事図版は何があるか。 | `scanFigures` | `/gallery/ogp` | 残す | 素材種別が異なる。 |
| `/gallery/note` | 内 | note 用画像は何があるか。 | `gallery` | `/gallery/sns` | 残す | チャネル別素材。 |
| `/gallery/ogp` | 直 | OGP 画像は何があるか。 | `scanOgp` | `/gallery/figures` | 残す | 用途が異なる。 |
| `/gallery/sns` | 内 | SNS 用画像は何があるか。 | `gallery` | `/gallery/note` | 残す | チャネル別素材。 |
| `/knowledge` | 直 | エージェント向けナレッジをどう探すか。 | `loadKnowledge` | `/docs` | 残す | 文書の性質が異なる。 |
| `/knowledge/[...path]` | 内 | ナレッジ本文は何か。 | `knowledge` | `/knowledge` | 残す | 詳細閲覧。 |
| `/materials` | 直 | 教材ごとの記事・図解・商品展開はどうか。 | `sourceSummary`、`siteWiring` | `/content/series` | 残す | 教材を主語にする。 |
| `/media/[root]/[...path]` | 無 | 許可された素材を取得できるか。 | `servePlan`、`parseMediaPath` | 他の画像 API | 残す | 素材配信 API。 |
| `/metrics` | 無 | 旧分析 URL の行き先はどこか。 | `redirect` | `/` | 転送だけ | トップへの互換転送。 |
| `/metrics/business` | 直 | 旧レビュー URL の行き先はどこか。 | `redirect` | 週次・月次 | 転送だけ | `cadence` を見て転送。 |
| `/metrics/business/procedure` | 無 | 旧手順 URL の行き先はどこか。 | `redirect` | 週次・月次 | 転送だけ | 互換転送。 |
| `/metrics/business/weekly` | 直 | 選んだ週のレビューは実施され、何を決めたか。 | `loadReview`、`ReviewBody` | 月次レビュー | 残す | 共通部品を使い、周期が異なる。 |
| `/metrics/business/monthly` | 直 | 選んだ月のレビューは実施され、何を決めたか。 | `loadReview`、`ReviewBody` | 週次レビュー | 残す | 共通部品を使い、周期が異なる。 |
| `/metrics/ga4` | 直 | GA4 の流入・ページ・参照元はどうか。 | `ga4.*`、`snapshots` | `/metrics/traffic` | 残す | 内訳を見る。 |
| `/metrics/gsc` | 内 | GSC のクエリ・ページ実績はどうか。 | `gsc.query`、`gsc.page` | `/metrics/search-strategy` | 残す | 元の計測値を見る。 |
| `/metrics/index` | 内 | URL 検査の登録率はどう推移したか。 | `indexHistory` | `/` | 残す | 資格別履歴がある。 |
| `/metrics/kpi` | 内 | KPI ツリーの全指標は資格別にどうか。 | `loadKpiView` | `/` | 残す | トップの詳細。 |
| `/metrics/psi` | 直 | ページ別の表示速度・品質スコアはどうか。 | `psi.batch` | `/metrics/traffic` | 残す | ページ別の診断。 |
| `/metrics/search-strategy` | 直 | どの検索クラスター・ページを改善するか。 | `buildSearchOpportunities` | `/metrics/gsc` | 残す | 計測値から作業候補を出す。 |
| `/metrics/traffic` | 内 | 集客の日次推移とデータの鮮度はどうか。 | `MetricsOverview` | `/metrics/ga4` | 残す | 時系列と取得状況。 |
| `/metrics/video` | 直 | 公開動画は送客・視聴につながったか。 | `video-outcomes` | `/sns`、`/content/video` | 残す | 成果を主語にする。 |
| `/ops/auth` | 直 | ログインと資格情報の状態はどうか。 | `auth-credentials` | `/ops/ci` | 残す | 認証の点検。 |
| `/ops/ci` | 直 | GitHub Actions は動いているか。 | `automations` | `/ops/mac` | 残す | 実行環境が異なる。 |
| `/ops/mac` | 直 | Mac の自動実行は動いているか。 | `automations` | `/ops/ci` | 残す | 実行環境が異なる。 |
| `/ops/ssot` | 無 | 旧設定 URL の行き先はどこか。 | `redirect` | `/ops/store` | 転送だけ | 設定ビューへの互換転送。 |
| `/ops/store` | 直 | 設定・データ・作業状態の実体と型は何か。 | `stores` | `/content` | 残す | データセット台帳の閲覧。 |
| `/plan/roadmap` | 直 | 年間の試験・買い場・着手時期はいつか。 | `annual-roadmap` | `/schedule` | 残す | 年単位の計画。 |
| `/plans` | 直 | 実装計画書は何があるか。 | `DocRootView` | `/docs` | 残す | 計画書に限定。 |
| `/plans/[...path]` | 内 | 実装計画の本文は何か。 | `DocDetailView` | `/plans` | 残す | 詳細閲覧。 |
| `/product/design` | 直 | 資格別の商品構成と収録の意図・実態はどうか。 | `loadDesignView` | `/content/magazines`、`/content/lineup` | 残す | 商品設計の判断。 |
| `/product/status` | 直 | チャネル別の販売状態はどうか。 | `NoteStatusPage`、`KindleContentPage`、`readCatalog` | note・Kindle の各画面 | 統合 | 既存ページを丸ごと埋め込む構成。 |
| `/project` | 無 | 旧文書一覧 URL の行き先はどこか。 | `redirect` | `/docs` | 転送だけ | 互換転送。 |
| `/project/[...path]` | 無 | 旧文書詳細 URL の行き先はどこか。 | `redirect` | `/docs/[...path]` | 転送だけ | パスを写す互換転送。 |
| `/quality` | 直 | 品質違反と採点状況の概観はどうか。 | `qualitySummary`、`qualityCensus` | `/content/articles` | 残す | 集約した品質点検。 |
| `/quality/progress` | 内 | 総監キーワードの採点・リライト進捗はどうか。 | `loadQualityProgress` | `/quality` | 残す | 対象を絞った詳細。 |
| `/sales` | 直 | note の登録済み売上は月・商品別にどうか。 | `salesSummary` | `/`、`/strategy/channels` | 残す | 登録売上の明細。 |
| `/schedule` | 直 | 日付別に何が予定されているか。 | `schedule` | `/plan/roadmap` | 残す | 日・月の予定。 |
| `/skills` | 直 | どのスキルがあるか。 | `loadSkills` | `/agents` | 残す | 対象が異なる。 |
| `/sns` | 直 | SNS 素材・投稿・派生物の状態は何か。 | `snsBoard`、`videoSnsJoin` | `/content/video`、`/metrics/video` | 残す | 投稿作業の概観。 |
| `/sns/youtube/longform` | 直 | 通常動画の制作・予約をいつ進めるか。 | `youtube-longform-plan` | `/content/video` | 残す | 制作順と日程。 |
| `/strategy/channels` | 内 | チャネルの採算・KPI・売り方はどうか。 | `loadChannelView` | `/`、`/sales` | 残す | 戦略と採算の判断。 |
| `/strategy/competitors` | 内 | 競合の観測と変化は何か。 | `competitors` | `/strategy/market` | 残す | 競合の詳細。 |
| `/strategy/demand` | 内 | どの悩みから商品候補を作るか。 | `demand` | `/strategy/issues` | 残す | 需要と商品仮説。 |
| `/strategy/issues` | 直 | 事業上の問いはどこまで判定できたか。 | `loadIssueView` | `/strategy/demand` | 残す | 判断全体の地図。 |
| `/strategy/market` | 内 | どの資格に展開する価値があるか。 | `loadMarketView` | `/strategy/qualifications` | 残す | 市場・自社実績を結合。 |
| `/strategy/policy` | 直 | 判断の共通方針は何か。 | `shared-policy` | `/strategy/taxonomy` | 残す | 方針の正本表示。 |
| `/strategy/policy/[...path]` | 内 | 方針の個別文書は何か。 | `shared-policy`、`document-roots` | `/strategy/policy` | 残す | 文書詳細。 |
| `/strategy/qualifications` | 直 | 資格の状態・試験日・受験者数は何か。 | `loadQualificationsView` | `/strategy/market` | 残す | 資格の基礎一覧。 |
| `/strategy/taxonomy` | 内 | 事業の領域・分類はどう定義されるか。 | `domains` | `/strategy/policy` | 残す | 分類の確認。 |
| `/todo` | 直 | 月間・週間・バックログのカードは何か。 | `todoBoard` | `/schedule`、`/plan/roadmap` | 残す | タスクそのもの。 |

## 細かい指摘

Codex の一覧。上の表で確かめたもの以外は、実物との照合を済ませていない。

1. **高** — `product/status/page.tsx:51`: `/content/note-status` と `/content/kindle` のページ全体を埋め込むため、同じ表・集計・見出しが二つの URL に現れる。まず表示部品と入口を整理したい。
2. **高** — `content/note-status/page.tsx:46`: 販売状態内の note タブから「記事の公開状態」を押すと `/content/note-status` へ移動し、親のチャネルタブから離れる。Kindle 側も同様に `/content/kindle` へのリンクを持つ。
3. **高** — `metrics/ga4/page.tsx:99`: ページ別タブの履歴ピッカーが `basePath="/metrics/ga4"` を渡し、`SnapshotPicker` は `?snapshot=` だけを生成する。履歴を選ぶと既定のチャネルタブへ戻り、選んだページ別履歴を見られない。
4. **高** — `sales.ts:113`: `note.sales` の読み込み失敗を売上 0 件・0 円に変換し、`売上ページ` が累計 0 円と表示する。欠測と実際のゼロが区別できない。
5. **高** — `metrics/gsc/page.tsx:50`: スナップショットが無い・壊れている場合も空配列の合計を「総クリック 0」「総表示 0」と表示する。共通の `loadSnapshot` は失敗時 `null` を返せるため、画面側で未取得を示せる。
6. **中** — `product/status/page.tsx:18`: ココナラ状態の日本語変換と並び順をこのページだけで定義している。横断台帳・商品詳細も同じ商品の状態を扱うため、表記と判定がずれる余地がある。
7. **中** — `content/magazines/page.tsx:29`: `membershipState()` によるマガジン別 repo 記事数を、`note 公開状態の収録表` と別画面で表示している。商品一覧の価値は残るが、収録突合の入口はまとめられる。
8. **中** — `strategy/market/page.tsx:25`: このページ独自の金額書式は **実績 0 円を「—」**にする。0 と欠測が同じ表示になるうえ、共通 `format.ts` と異なる。
9. **中** — `README.md:110`: メニューを「6 グループ」と説明するが、`domains.json` には戦略・計画・商品・アフィリエイト・サイト・SNS・教材・管理の **8 領域**がある。
10. **中** — `README.md:101`: Route handler は `/media` のみと説明するが、実際には `/affiliate/layout-shot/*` と `/api/character-frame/*` もある。
11. **中** — `strategy/qualifications/page.tsx:10`: 資格の展開状態ラベル・色を `market/page.tsx:16` にも同じ形で定義している。同じ `portfolio` の表示判定は共通化できる。
12. **低** — `SearchTabs.tsx:3`: コメントは「キーワード戦略 → 全体 → 改善中 → インデックス」の 4 タブだが、実際の `SectionTabs` は 3 タブ。説明が古い。
13. **低・要確認** — `metrics/gsc/page.tsx:64`: 「上位100クエリ」という固定ラベルを表示する一方、この画面は取得行数を確認・制限していない。供給側の件数が変わるとラベルと集計範囲が食い違う。
14. **低** — `content/note/page.tsx:19`: コメントに「827 本」などの固定件数が残る。画面の表示値ではないが、現状説明として読むと古くなり得る。

メニューに直接ないページは、確認した範囲では画面内タブ、親画面のリンク、詳細へのドリルダウン、または旧 URL の転送として使われています。**到達経路のない孤立ページや切れた内部リンクは、静的な照合では確証を得られませんでした。**
