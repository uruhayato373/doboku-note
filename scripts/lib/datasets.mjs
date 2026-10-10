/**
 * datasets.mjs — 設定（config/）・記録（data/）・作業状態（.claude/state/）の台帳。どのファイルが何のデータかを決める唯一の正本。
 * 置き場（フォルダ）は格納場所にすぎず、データの一覧・種類・型はここだけが持つ。git に置けないもの（市販書籍の見出しを含む判定など）は
 * Google Drive vault に置き、ここで drive（config/drive-vault.json の group）を付けて宣言する（手元だけの置き場は作らない）。
 *
 * 1 データセット＝パス（下の SLOTS を使った型）・種類・領域・説明・型の名前（任意）。依存ゼロに保つ（npm ci をしないワークフローも
 * パスを引くために読む）。zod の型は dataset-schemas.mjs、型の検査は dataset-validate.mjs。
 * git 管理下の config/・data/・.claude/state/ の全ファイルは、ちょうど 1 つのデータセットに当たらなければならない（npm run check-datasets・CI）。
 * 新しい設定・記録を足すときは、先にここへ 1 行足す。型（dataset-schemas.mjs）があれば中身も検査する。
 * 管理画面 管理＞設定／データ（/ops/store）はこの台帳を並べる。判断の経緯は data-storage-decision.md
 * 「設定・記録の構成と型の正本」。
 *
 * id は「取得元.データセット」（自社の記録は business.、計算した結果・文書が引く調査は analysis.）。
 * 置き場を移しても id は変えない（パスだけ書き換える）。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 置き場。strict の置き場（config/・data/）は JSON に型が必須で、コードのパスの直書きを止める。
 * .claude/state/ は型を任意にし、直書きはラチェット（.claude/config/state-path-literal-baseline.json）で減らす
 */
export const AREAS = {
  config: { dir: 'config', label: '設定', strict: true },
  data: { dir: 'data', label: 'データ', strict: true },
  state: { dir: '.claude/state', label: '作業状態', strict: false },
  // 公開の事実の正本（content-registry.md）。書き手は npm run registry・npm run media だけ
  registry: { dir: 'content/registry', label: 'コンテンツ台帳', strict: true },
};

export const KINDS = {
  config: '設定・正本',
  ledger: '台帳（追記）',
  series: '時系列',
  state: '最新状態',
  report: 'レポート（人が読む）',
  evidence: '根拠（一回きりの調査）',
  raw: '生データ（手元だけ）',
};

/** パスの中の可変部分。{**} は下の階層すべて */
const SLOTS = {
  '{ts}': '\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}(?:-\\d{3})?Z?',
  '{date}': '\\d{4}-\\d{2}-\\d{2}',
  '{month}': '\\d{4}-\\d{2}',
  '{week}': '\\d{4}-W\\d{2}',
  '{range}': '\\d{8}_\\d{8}',
  '{uuid}': '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
  '{hash}': '[0-9a-f]{8}',
  '{rev}': '(?:-r\\d+)?',
  '{rerun}': '(?:-\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}(?:-\\d{3})?Z?)?',
  '{name}': '[^/]+',
  '{suffix}': '(?:-[^/]+)?',
  '{**}': '.+',
};

/**
 * 1 行 1 データセット。opts: schema（型の名前。zod の型は dataset-schemas.mjs・検査は dataset-validate.mjs）・immutable（中身を変えない台帳）・
 * drive（実体は Google Drive vault。config/drive-vault.json の group id。path は repo 側の写しの置き場で git 管理外。drive-vault-sync で同期し、
 *   ほかの PC は --pull で取り戻す）・local（git 管理外で、作り直せる一時出力だけ。記録・判定は置かない。regen に作り直し方が要る）・
 * regen（作り直すコマンド・手順）・
 * planned（置き場は決めたがまだ 1 件も無い）・retain（日付つきファイルの寿命。scripts/prune-state-snapshots.mjs が消す）・
 * freshness（最新の記録の古さの閾値。検査と管理画面が freshnessOf・freshnessDays で引く）
 * refs（中の値が指す先。[{ at: '場所', to: 'qualification'|'product'|'article' }]。check-datasets が全ファイルで参照先の実在を見る＝外部キー相当。
 *   場所の書き方と参照先は scripts/lib/dataset-refs.mjs。DN-0586）
 *
 * retain: { family, keepNewest: N }   新しい N 件を残す
 *         { family, maxAgeDays: D }   D 日より古いものを消す（最新 1 件は必ず残す）
 *         { family, keepAll: true }   消さない（寿命を「無期限」と宣言するだけ）
 *   alsoKeepNewestWhere: { path, equals }  JSON の path が equals のうち最新 1 件も残す
 *   keepNewestPerSection: 日ごとのレポート（reports.<種類>）で、各種類の最新を含む日は古くても残す
 *   family はワークフローが `--family` で渡す名前（main の YAML との契約。変えるときは両方を同時に）
 *
 * freshness: { warnDays, failDays }   片方だけでもよい。最新の記録がこの日数より古いときの扱い（retain の寿命とは別。retain は消す時期）
 *   warnDays  注意（DUE・要対応）。終了コードは落とさない読み手が多い
 *   failDays  失敗（取得が止まっている・検査不成立）
 *   「超えたら」（>）か「以上」（>=）かと、日数の数え方（暦日・経過時間）は検査ごとに決める（閾値の数字だけが正本）。
 *   台帳の外（.claude/state の記録・docs・backlog）の鮮度は台帳に入れない。設定ファイル（config/）の中の閾値はそのファイルが正本
 */
const d = (id, path, kind, domain, doc, opts = {}) => ({ id, path, kind, domain, doc, ...opts });

export const DATASETS = [
  // ===== config/: 事業・試験・商品の正本と、スクリプト・CI・サイトの設定 =====
  // 戦略
  d('config.business-direction', 'config/business-direction.json', 'config', 'strategy', '重点資格・KPI の定義・レビュー周期', { schema: 'ConfigBusinessDirection', refs: [{ at: 'qualifications[].id', to: 'qualification' }] }),
  d('config.qualification-registry', 'config/qualification-registry.json', 'config', 'strategy', '資格の一覧・名前・並び順・展開状態', { schema: 'QualificationRegistry' }),
  d('config.exam-calendar', 'config/exam-calendar.json', 'config', 'strategy', '試験日程', { schema: 'ExamCalendar' }),
  d('config.exam-formats', 'config/exam-formats.json', 'config', 'strategy', '試験区分・出題形式・過去問の公開範囲', { schema: 'ConfigExamFormats' }),
  d('config.exam-stats', 'config/exam-stats.json', 'config', 'strategy', '受験者数・合格率', { schema: 'ConfigExamStats' }),
  d('config.market-scan', 'config/market-scan.json', 'config', 'strategy', '資格ごとの市場（競合の混み具合）を取る検索語と閾値', { schema: 'ConfigMarketScan' }),
  d('config.competitors', 'config/competitors.json', 'config', 'strategy', '競合の追跡リスト（note・ココナラ・Instagram・X・YouTube の枠ごと）', { schema: 'ConfigCompetitors' }),
  // 計画
  d('config.annual-roadmap', 'config/annual-roadmap.json', 'config', 'plan', '年間ロードマップの期間と買い場の週数', { schema: 'ConfigAnnualRoadmap' }),
  // 商品
  d('config.products', 'config/products.json', 'config', 'product', '商品の正本（全チャネル・1ファイル。書き換えは npm run product）', { schema: 'ConfigProducts', refs: [{ at: 'products[].qualification', to: 'qualification' }] }),
  d('config.product-lineup', 'config/product-lineup.json', 'config', 'product', '商品ラインナップの分類', { schema: 'ProductLineup' }),
  d('config.content-themes', 'config/content-themes.json', 'config', 'product', '制作物のテーマの語彙とチャネル→テーマの写し方', { schema: 'ConfigContentThemes' }),
  d('config.note-funnel', 'config/note-funnel.json', 'config', 'product', 'note 導線（ファネル）の構成', { schema: 'NoteFunnel' }),
  d('config.note-membership', 'config/note-membership.json', 'config', 'product', 'note メンバーシップの会費・特典', { schema: 'ConfigNoteMembership' }),
  d('config.note-magazine-membership', 'config/note-magazine-membership.json', 'config', 'product', 'マガジン収録の期待値', { schema: 'ConfigNoteMagazineMembership' }),
  d('config.note-price-consistency', 'config/note-price-consistency.json', 'config', 'product', '単品価格のずれを止める検査の設定', { schema: 'ConfigNotePriceConsistency' }),
  d('config.note-intro-standard', 'config/note-intro-standard.json', 'config', 'product', 'note 記事の冒頭の標準（1級・2級・両方の型を variants に）', { schema: 'ConfigNoteIntroStandard' }),
  d('config.note-covers', 'config/note-covers.json', 'config', 'product', 'note カバーの設定（記事の上書き・分類の語彙・マガジンの文言）', { schema: 'ConfigNoteCovers' }),
  d('config.coconala-account', 'config/coconala-account.json', 'config', 'product', 'ココナラの出品アカウント', { schema: 'ConfigCoconalaAccount' }),
  d('config.coconala-listings', 'config/coconala-listings.json', 'config', 'product', 'ココナラ出品の投入用データ', { schema: 'CoconalaListings' }),
  d('config.coconala-blog', 'config/coconala-blog.json', 'config', 'product', 'ココナラブログの偵察対象と運用値', { schema: 'ConfigCoconalaBlog' }),
  d('config.kdp-memo', 'config/kdp-memo.json', 'config', 'product', 'KDP 入稿の既定値と各本の情報', { schema: 'ConfigKdpMemo' }),
  d('config.keiken-answer-sheet-limits', 'config/keiken-answer-sheet-limits.json', 'config', 'product', '経験記述の解答欄の字数上限', { schema: 'ConfigKeikenAnswerSheetLimits' }),
  d('config.pe-answer-sheets', 'config/pe-answer-sheets.json', 'config', 'product', '技術士 第二次 筆記の答案用紙の字数と区分ごとの枚数', { schema: 'ConfigPeAnswerSheets' }),
  d('config.cce-essay-history', 'config/cce-essay-history.json', 'config', 'product', 'コンクリート主任技士 小論文の出題履歴とテーマ分類', { schema: 'ConfigCceEssayHistory' }),
  // アフィリエイト
  d('config.affiliate-asp', 'config/affiliate-asp.json', 'config', 'affiliate', '3 ASP（A8・もしも・afb）の提携運用の接続設定', { schema: 'ConfigAffiliateAsp' }),
  d('config.a8-report-automation', 'config/a8-report-automation.json', 'config', 'affiliate', 'A8 のレポート CSV 取得の設定', { schema: 'ConfigA8ReportAutomation' }),
  d('config.career-funnel', 'config/career-funnel.json', 'config', 'affiliate', '転職アフィリエイトのファネルの設定', { schema: 'ConfigCareerFunnel' }),
  d('config.affiliate-mats', 'config/affiliate-mats.json', 'config', 'affiliate', 'A8 の広告リンク（mat）の許可リスト', { schema: 'ConfigAffiliateMats' }),
  d('config.affiliate-placements', 'config/affiliate-placements.json', 'config', 'affiliate', '転職アフィリエイトの配置ルール（案件×面×対象×期間）', { schema: 'ConfigAffiliatePlacements' }),
  d('config.cta-placements', 'config/cta-placements.json', 'config', 'affiliate', 'サイトの広告・送客の配置（GA4 の cta_placement）の語彙と状態', { schema: 'ConfigCtaPlacements' }),
  // サイト
  d('config.content-rules', 'config/content-rules.json', 'config', 'site', 'サイト記事の機械品質ルールの重大度と適用範囲', { schema: 'ConfigContentRules' }),
  d('config.search-strategy', 'config/search-strategy.json', 'config', 'site', '検索キーワード戦略のクラスタ', { schema: 'ConfigSearchStrategy' }),
  d('config.seo-watchwords', 'config/seo-watchwords.json', 'config', 'site', '順位を見張る検索語', { schema: 'ConfigSeoWatchwords' }),
  d('config.seo-meta-config', 'config/seo-meta-config.json', 'config', 'site', 'SEO meta 監査の対象と巡回の設定', { schema: 'ConfigSeoMeta' }),
  d('config.growth-cycle', 'config/growth-cycle.json', 'config', 'site', '成長サイクル（計測ダイジェスト）の設定', { schema: 'ConfigGrowthCycle' }),
  d('config.indexnow', 'config/indexnow.json', 'config', 'site', 'IndexNow の更新通知の設定', { schema: 'ConfigIndexnow' }),
  d('config.google-console-automation', 'config/google-console-automation.json', 'config', 'site', 'GSC・GA4 の画面取得の設定', { schema: 'ConfigGoogleConsoleAutomation' }),
  d('config.ga4-admin-desired-state', 'config/ga4-admin-desired-state.json', 'config', 'site', 'GA4 管理画面の望ましい状態', { schema: 'ConfigGa4AdminDesiredState' }),
  d('config.psi-config', 'config/psi-config.json', 'config', 'site', 'PSI 定期計測の設定と閾値', { schema: 'ConfigPsi' }),
  d('config.psi-urls', 'config/psi-urls.txt', 'config', 'site', 'PSI の計測対象 URL'),
  d('config.utm-templates', 'config/utm-templates.json', 'config', 'site', 'UTM の付け方', { schema: 'ConfigUtmTemplates' }),
  d('config.figure-canvas', 'config/figure-canvas.json', 'config', 'site', '図版 SVG の固定キャンバスの標準', { schema: 'ConfigFigureCanvas' }),
  d('config.figure-sources', 'config/figure-sources.json', 'config', 'site', '記事図の元素材の所在と品質', { schema: 'ConfigFigureSources' }),
  d('config.image-limits', 'config/image-limits.json', 'config', 'site', '画像アセットの品質ガードの閾値', { schema: 'ConfigImageLimits' }),
  d('config.public-view-breakpoints', 'config/public-view-breakpoints.json', 'config', 'site', '公開ページの見え方検査の画面幅', { schema: 'ConfigPublicViewBreakpoints' }),
  d('config.standards-structure', 'config/standards-structure.json', 'config', 'site', '土木工事共通仕様書の構造化の設定', { schema: 'ConfigStandardsStructure' }),
  d('config.ogp-settings', 'config/ogp/settings.json', 'config', 'site', 'OGP の設定（テンプレートの自動選定・定義＝note カバー共通・タイトルの改行と字の大きさ）', { schema: 'ConfigOgpSettings' }),
  d('config.ogp-backgrounds', 'config/ogp/backgrounds/{name}.png', 'config', 'site', 'OGP の資格別の背景画像'),
  // SNS
  d('config.x-account', 'config/x-account.json', 'config', 'sns', 'X のアカウントとプロフィール', { schema: 'ConfigXAccount' }),
  d('config.x-repost', 'config/x-repost.json', 'config', 'sns', 'X の引用リポストの設定', { schema: 'ConfigXRepost' }),
  d('config.ig-account', 'config/ig-account.json', 'config', 'sns', 'Instagram のアカウントとプロフィール', { schema: 'ConfigIgAccount' }),
  d('config.character-poses', 'config/character-poses.json', 'config', 'sns', 'キャラクター素材のポーズと命名', { schema: 'ConfigCharacterPoses' }),
  d('config.video-brand', 'config/video-brand.json', 'config', 'sns', '動画のブランド（ロゴ・背景）', { schema: 'ConfigVideoBrand' }),
  d('config.video-content', 'config/video-content.json', 'config', 'sns', '動画パックの契約', { schema: 'ConfigVideoContent' }),
  d('config.youtube-delivery', 'config/youtube-delivery.json', 'config', 'sns', 'YouTube 配信の設定', { schema: 'ConfigYoutubeDelivery' }),
  d('config.youtube-production-disclosure', 'config/youtube-production-disclosure.json', 'config', 'sns', 'YouTube の制作の開示（合成メディア）', { schema: 'ConfigYoutubeProductionDisclosure' }),
  d('config.youtube-formats', 'config/youtube-formats.json', 'config', 'sns', 'YouTube の動画の型と採否（商品展開）・自社チャンネル', { schema: 'ConfigYoutubeFormats' }),
  d('config.content-registry', 'config/content-registry.json', 'config', 'sns', 'コンテンツ台帳の設定（チャネル×形式・ID 規則・状態の語彙と遷移・切り替え済みのチャネル）', { schema: 'ConfigContentRegistry' }),
  // コンテンツ台帳（content/registry）。資格ごとの 1 ファイル。設計は content-registry.md
  d('registry.works', 'content/registry/works/{name}', 'config', 'sns', 'コンテンツ台帳: 作品（資格ごと）', { schema: 'RegistryWorks' }),
  d('registry.youtube', 'content/registry/publications/youtube/{name}', 'config', 'sns', 'コンテンツ台帳: YouTube の公開（資格ごと）', { schema: 'RegistryPublications' }),
  d('registry.instagram', 'content/registry/publications/instagram/{name}', 'config', 'sns', 'コンテンツ台帳: Instagram の公開（資格ごと）', { schema: 'RegistryPublications' }),
  d('registry.x', 'content/registry/publications/x/{name}', 'config', 'sns', 'コンテンツ台帳: X の公開（資格ごと）', { schema: 'RegistryPublications' }),
  d('registry.threads', 'content/registry/publications/threads/{name}', 'config', 'sns', 'コンテンツ台帳: Threads の公開（資格ごと）', { schema: 'RegistryPublications', planned: true }),
  d('registry.tiktok', 'content/registry/publications/tiktok/{name}', 'config', 'sns', 'コンテンツ台帳: TikTok の公開（資格ごと）', { schema: 'RegistryPublications', planned: true }),
  d('registry.media', 'content/registry/media/{name}', 'config', 'sns', 'コンテンツ台帳: 素材（資格ごと・brand）', { schema: 'RegistryMedia' }),
  // 教材
  d('config.reference-sources', 'config/reference-sources.json', 'config', 'material', '参考文献（原本・一次資料）の区分と扱い', { schema: 'ConfigReferenceSources' }),
  // 管理
  d('config.domains', 'config/domains.json', 'config', 'ops', '事業の領域・サイドバー・文書の割り当て', { schema: 'DomainsConfig' }),
  d('config.asset-storage', 'config/asset-storage.json', 'config', 'ops', 'R2 に置くアセットの置き場', { schema: 'ConfigAssetStorage' }),
  d('config.drive-vault', 'config/drive-vault.json', 'config', 'ops', 'Google Drive vault に置くアセットの置き場', { schema: 'ConfigDriveVault' }),
  d('config.git-binary-policy', 'config/git-binary-policy.json', 'config', 'ops', 'Git に追跡してよいファイルの決まり', { schema: 'ConfigGitBinaryPolicy' }),
  d('config.disk-hygiene', 'config/disk-hygiene.json', 'config', 'ops', '手元のディスク肥大を止める閾値', { schema: 'ConfigDiskHygiene' }),
  d('config.local-resources', 'config/local-resources.json', 'config', 'ops', '手元 PC の空き容量・メモリの閾値', { schema: 'ConfigLocalResources' }),
  d('config.workflow-health', 'config/workflow-health.json', 'config', 'ops', '重要なワークフローの健全性の閾値', { schema: 'ConfigWorkflowHealth' }),
  d('config.cloudflare', 'config/cloudflare.json', 'config', 'ops', 'Cloudflare の解析とゾーン設定監視の設定', { schema: 'ConfigCloudflare' }),

  // ===== data/: 取得元ごとの記録 =====
  // note
  d('note.sales', 'data/note/sales.json', 'ledger', 'product', 'note の販売履歴（1 取引 1 行・購入者は記録しない）', { schema: 'NoteSalesLog', freshness: { warnDays: 10, failDays: 21 } }),
  d('note.magazines', 'data/note/magazines.json', 'state', 'product', 'note のマガジンと収録記事の公開状態（週次の取得）', { schema: 'NoteMagazines', freshness: { failDays: 9 } }),
  d('note.status', 'data/note/status.json', 'state', 'product', 'note 記事の公開状態の要約（週次の取得）', { freshness: { failDays: 9 }, schema: 'NoteStatusSnapshot' }),
  d('note.sync-log', 'data/note/sync-log.json', 'ledger', 'product', '原稿から note への反映の記録', { schema: 'NoteSyncLog' }),
  d('note.articles-pv', 'data/note/articles-pv/{month}.json', 'series', 'product', 'note の記事別の月間 PV', { schema: 'NoteArticlesPv' }),
  d('note.referrers', 'data/note/referrers/{month}.json', 'series', 'product', 'note の月間の流入元', { schema: 'NoteReferrers' }),
  d('note.competitors', 'data/note/competitors/{date}.json', 'series', 'strategy', 'note の競合クリエイターの商品と価格（四半期・全社の通常実行だけ）', { retain: { family: 'competitors', keepAll: true }, freshness: { warnDays: 90 }, schema: 'NoteCompetitors' }),
  // KDP
  d('kdp.royalties', 'data/kdp/royalties.json', 'ledger', 'product', 'KDP の月ごとのロイヤリティ（当月は推計）', { schema: 'KdpRoyalties' }),
  // ココナラ
  d('coconala.orders', 'data/coconala/orders.json', 'ledger', 'product', 'ココナラの受注の記録', { schema: 'CoconalaOrders' }),
  d('coconala.orders-snapshot', 'data/coconala/orders-snapshot.json', 'state', 'product', 'ココナラの取引一覧の最新（受注の照合元）', { schema: 'CoconalaOrdersSnapshot', freshness: { failDays: 7 } }),
  d('coconala.kpi', 'data/coconala/kpi.json', 'ledger', 'product', 'ココナラの出品ごとの閲覧・お気に入りの推移', { schema: 'CoconalaKpi' }),
  d('coconala.analytics', 'data/coconala/analytics.json', 'state', 'product', 'ココナラの出品分析の最新', { schema: 'CoconalaAnalytics', freshness: { failDays: 8 } }),
  d('coconala.thumb-approved', 'data/coconala/thumb-approved.json', 'ledger', 'product', '承認したココナラのサムネイル（承認日・画像ごとの承認）', { schema: 'CoconalaThumbApproved' }),
  d('coconala.resolved-inquiries', 'data/coconala/resolved-inquiries.json', 'ledger', 'product', '人が決着と判断した問い合わせ（受注の検査から外す）', { schema: 'CoconalaResolvedInquiries' }),
  d('coconala.competitors', 'data/coconala/competitors/{date}.json', 'series', 'strategy', 'ココナラの競合セラーの出品と価格（四半期・全社の通常実行だけ）', { retain: { family: 'competitors', keepAll: true }, freshness: { warnDays: 90 }, schema: 'CoconalaCompetitors' }),
  d('coconala.blog-competitors', 'data/coconala/blog-competitors/{date}.json', 'series', 'strategy', 'ココナラブログの競合記事', { retain: { family: 'competitors', keepAll: true }, schema: 'CoconalaBlogCompetitors' }),
  d('coconala.market-research', 'data/coconala/market-research.json', 'state', 'strategy', 'ココナラの市場調査（検索結果の出品）', { schema: 'CoconalaMarketResearch' }),
  d('coconala.market-summary', 'data/coconala/market-summary.json', 'state', 'strategy', '同上の要約', { schema: 'CoconalaMarketSummary' }),
  // X
  d('x.own-posts', 'data/x/own-posts/{date}.json', 'series', 'sns', '自分の X 投稿の反応', { retain: { family: 'x', keepAll: true }, schema: 'XOwnPosts' }),
  d('x.reposted', 'data/x/reposted.json', 'ledger', 'sns', 'X で引用リポストした投稿', { schema: 'XReposted' }),
  d('x.competitors', 'data/x/competitors/{date}.json', 'series', 'strategy', 'X の競合アカウント（全社の通常実行だけ）', { retain: { family: 'competitors', keepAll: true }, freshness: { warnDays: 90 }, schema: 'XCompetitors' }),
  // Instagram・YouTube
  d('instagram.competitors', 'data/instagram/competitors/{date}.json', 'series', 'strategy', 'Instagram の競合アカウント（全社の通常実行だけ）', { retain: { family: 'competitors', keepAll: true }, freshness: { warnDays: 90 }, schema: 'InstagramCompetitors' }),
  d('instagram.insights', 'data/instagram/insights/{date}.json', 'series', 'sns', 'Instagram のインサイト', { planned: true, retain: { family: 'instagram', maxAgeDays: 180 }, freshness: { failDays: 10 } }),
  d('youtube.posted', 'data/youtube/posted.jsonl', 'ledger', 'sns', 'YouTube に投稿した動画', { schema: 'YoutubePosted' }),
  d('youtube.own-videos', 'data/youtube/own-videos/{date}.json', 'series', 'sns', '自社 YouTube の動画ごとの再生数・尺（月次）', { retain: { family: 'youtube', keepAll: true }, freshness: { warnDays: 35 }, schema: 'YoutubeOwnVideos' }),
  d('youtube.competitors', 'data/youtube/competitors/{date}.json', 'series', 'strategy', 'YouTube の競合チャンネルの再生数・尺（四半期・全社の通常実行だけ）', { retain: { family: 'competitors', keepAll: true }, freshness: { warnDays: 90 }, schema: 'YoutubeCompetitors' }),
  // A8・アフィリエイト
  d('a8.report-log', 'data/a8/report-log.json', 'ledger', 'affiliate', 'A8 の月次レポート（成果・報酬）', { schema: 'A8ReportLog' }),
  d('a8.catalog', 'data/a8/catalog.json', 'state', 'affiliate', 'A8 の提携案件の一覧', { schema: 'A8Catalog' }),
  d('a8.ui-last-run', 'data/a8/ui-last-run.json', 'state', 'affiliate', 'A8 の画面取得を最後に回した記録（login-collectors が週次で更新。週 1 回＋2 日を超えたら止まっている）', { freshness: { warnDays: 9 }, schema: 'A8UiLastRun' }),
  d('a8.ui-raw', 'data/a8/ui/{ts}/{**}', 'raw', 'affiliate', 'A8 の画面から取った CSV と正規化結果（正規化した結果は data/a8/ の台帳へ書く）', { local: true, regen: 'npm run a8-ui:fetch（画面から取り直す）' }),
  d('a8.inventory', 'data/a8/inventory.json', 'state', 'affiliate', 'A8 の画面から取った案件の在庫', { planned: true }),
  d('afb.outcomes', 'data/afb/outcomes/{date}.json', 'series', 'affiliate', 'afb の成果（公式 API・日付別）', { planned: true, retain: { family: 'affiliate', keepAll: true }, freshness: { failDays: 10 } }),
  d('affiliate.catalog', 'data/affiliate/catalog.json', 'state', 'affiliate', '3 ASP の提携案件と広告素材の一覧', { schema: 'AffiliateCatalog' }),
  // GA4
  d('ga4.reports', 'data/ga4/reports/{date}.json', 'series', 'site', 'GA4 の週次取得（取得日ごとに1ファイル。意匠実験を含む種類と読み書きはscripts/lib/metric-reports.mjs）', { retain: { family: 'ga4', maxAgeDays: 90, keepNewestPerSection: true, alsoKeepNewestWhere: { path: ['reports', 'cta-clicks-by-label:month', 'meta', 'windowKind'], equals: 'month' } }, freshness: { warnDays: 10 }, schema: 'Ga4Reports' }),
  d('ga4.admin-history', 'data/ga4/admin-history.json', 'ledger', 'site', 'GA4 管理画面の設定の点検の記録', { schema: 'Ga4AdminHistory' }),
  d('ga4.admin-inventory', 'data/ga4/admin-inventory.json', 'state', 'site', 'GA4 管理画面の設定の最新', { freshness: { warnDays: 90 }, schema: 'Ga4AdminInventory' }),
  d('ga4.admin-last-run', 'data/ga4/admin-last-run.json', 'state', 'site', 'GA4 管理画面の設定を画面から最後に揃えた記録', { planned: true }),
  d('ga4.ui-last-run', 'data/ga4/ui-last-run.json', 'state', 'site', 'GA4 の画面取得を最後に回した記録', { schema: 'Ga4UiLastRun' }),
  d('ga4.ui-raw', 'data/ga4/ui/{ts}/{**}', 'raw', 'site', 'GA4 の画面から取った CSV', { local: true, regen: 'npm run ga4-ui:fetch（画面から取り直す）' }),
  // GSC
  d('gsc.reports', 'data/gsc/reports/{date}.json', 'series', 'site', 'GSC の検索指標（取得した日ごとに 1 ファイル・page／query／page×query／date。水曜分の page は 1000 行で打ち切り）', { retain: { family: 'gsc', maxAgeDays: 90, keepNewestPerSection: true }, schema: 'GscReports' }),
  d('gsc.sitemaps', 'data/gsc/sitemaps.json', 'state', 'site', 'サイトマップの送信状態', { freshness: { warnDays: 10 }, schema: 'GscSitemaps' }),
  d('gsc.index-coverage-history', 'data/gsc/index-coverage.json', 'ledger', 'site', 'インデックス登録率の推移（全体と資格別）', { schema: 'GscIndexCoverage' }),
  d('gsc.rank-watch', 'data/gsc/rank-watch/{month}.jsonl', 'ledger', 'site', '見張っている検索語の順位（watch-…）と見張りの判断（run-…）。月ごとに 1 行 1 件の追記だけ', { immutable: true, schema: 'RankWatch' }),
  d('gsc.url-inspection', 'data/gsc/url-inspection/{ts}.json', 'series', 'site', 'URL 検査の結果（新しい 2 回分だけ残す。資格別の率は履歴 gsc.index-coverage-history に書く）', { retain: { family: 'url-inspection', keepNewest: 2 }, schema: 'GscUrlInspection' }),
  d('gsc.url-inspection-single', 'data/gsc/url-inspection-single/{ts}.json', 'series', 'site', 'URL 検査の単発の結果', { retain: { family: 'url-inspection', keepNewest: 2 }, schema: 'GscUrlInspectionSingle' }),
  d('gsc.indexing-history', 'data/gsc/indexing-history.json', 'ledger', 'site', 'インデックス登録の申請の記録', { schema: 'GscIndexingHistory' }),
  d('gsc.indexing-priority', 'data/gsc/indexing-priority.json', 'state', 'site', '登録を申請する URL の優先順', { schema: 'GscIndexingPriority' }),
  d('gsc.indexing-priority-list', 'data/gsc/indexing-priority.txt', 'state', 'site', '同上の URL 一覧（手元の申請作業が読む）'),
  d('gsc.indexing-requests', 'data/gsc/indexing-requests.json', 'state', 'site', '登録申請の最新の結果', { schema: 'GscIndexingRequests' }),
  d('gsc.ui-last-run', 'data/gsc/ui-last-run.json', 'state', 'site', 'GSC の画面取得を最後に回した記録', { freshness: { warnDays: 30 }, schema: 'GscUiLastRun' }),
  d('gsc.ui-history', 'data/gsc/ui-history.json', 'ledger', 'site', 'GSC の画面取得の結果の推移', { schema: 'GscUiHistory' }),
  d('gsc.ui-diff', 'data/gsc/ui-diff/{ts}.json', 'series', 'site', 'GSC の画面取得の前回との差', { retain: { family: 'gsc-ui', keepAll: true }, schema: 'GscUiDiff' }),
  d('gsc.ui-urls', 'data/gsc/ui-urls.json', 'state', 'site', 'GSC の未登録理由ごとの URL 一覧（理由×範囲ごとの最新を 1 ファイルに）', { schema: 'GscUiUrls' }),
  d('gsc.ui-raw', 'data/gsc/ui/{ts}/{**}', 'raw', 'site', 'GSC の画面から取った CSV と正規化結果（正規化した結果は data/gsc/ の台帳へ書く）', { local: true, regen: 'npm run gsc-ui:fetch（画面から取り直す）' }),
  d('gsc.ui-adhoc', 'data/gsc/ui/_adhoc/{**}', 'raw', 'site', 'GSC の画面の CSV を単発で正規化した結果', { local: true, regen: 'npm run google-console:normalize' }),
  // Bing・PSI・実ユーザー・Cloudflare・自サイト
  d('bing.snapshots', 'data/bing/snapshots/{date}.json', 'series', 'site', 'Bing Webmaster の検索指標', { retain: { family: 'bing', maxAgeDays: 120 }, schema: 'BingSnapshots' }),
  d('psi.batch', 'data/psi/batch/{ts}.json', 'series', 'site', 'PageSpeed Insights の定期計測', { retain: { family: 'psi', keepNewest: 14 }, schema: 'PsiBatch' }),
  d('rum.web-vitals', 'data/rum/web-vitals/{date}.json', 'series', 'site', '実ユーザーの Web Vitals（GA4 経由）', { retain: { family: 'rum', maxAgeDays: 120 }, freshness: { failDays: 10 }, schema: 'RumWebVitals' }),
  d('cloudflare.zone', 'data/cloudflare/zone/{date}.json', 'series', 'site', 'Cloudflare のゾーンの解析', { planned: true, retain: { family: 'cloudflare', maxAgeDays: 120 }, freshness: { failDays: 3 } }),
  // 過去問・R2（人とスクリプトが書く作業の台帳。config/ から移した。設定ではなく、取得・削除の進み具合の記録）
  d('pastexams.inventory', 'data/pastexams/inventory.json', 'ledger', 'product', '過去問の年度の在庫（公式の掲載状態・取得日・PDF の SHA-256 とページ数。取得スクリプトが書き換える）', { schema: 'PastExamInventory' }),
  d('pastexams.question-ledger', 'data/pastexams/questions/{name}.json', 'ledger', 'product', '過去問の問題台帳（1 問ごとの原典・ページ・公式正答・転記の照合。キーは演習データの問題 ID。検査は check-past-exam-ledger）', { schema: 'PastExamQuestionLedger', refs: [{ at: 'qualification', to: 'qualification' }, { at: 'questions[].article', to: 'article' }] }),
  d('r2.delete-list', 'data/r2/delete-list.txt', 'ledger', 'ops', 'R2 から消すオブジェクトの一覧（1 行 1 キー。削除済みはコメント行で残す）'),

  // ===== data/: 自社で発生した記録 =====
  d('business.measurement', 'data/business/records/measurement-{ts}-{uuid}.json', 'ledger', 'strategy', 'KPI の計測値', { immutable: true, schema: 'BusinessMeasurement' }),
  d('business.snapshot', 'data/business/records/snapshot-{ts}-{uuid}.json', 'ledger', 'strategy', 'KPI の一覧の時点記録', { immutable: true, schema: 'BusinessSnapshot' }),
  d('business.target', 'data/business/records/target-{ts}-{uuid}.json', 'ledger', 'strategy', 'KPI の目標', { immutable: true, schema: 'BusinessTarget' }),
  d('business.review', 'data/business/records/review-{ts}-{uuid}.json', 'ledger', 'strategy', '週次・月次レビューの判断', { immutable: true, schema: 'BusinessReview' }),
  d('business.site-to-sales', 'data/business/records/site-to-sales-{month}{rev}.json', 'evidence', 'strategy', 'サイトから売上への暦月の突合', { immutable: true, schema: 'BusinessSiteToSales' }),
  d('business.checks-monthly', 'data/business/records/checks-monthly-{month}{rerun}.json', 'evidence', 'strategy', '月次レビューの点検の振り分け', { immutable: true, schema: 'BusinessChecksMonthly' }),
  d('business.checks-weekly', 'data/business/records/checks-weekly-{week}{rerun}.json', 'evidence', 'strategy', '週次レビューの点検の振り分け', { immutable: true, planned: true, schema: 'BusinessChecksWeekly' }),
  d('business.experiments', 'data/business/experiments.json', 'state', 'strategy', '実験の台帳（仮説・期間・判定）', { schema: 'Experiments' }),
  // 受け箱（別リポジトリの obsidian mail-triage が毎日 develop へ直接書く。売上の正本ではない）
  d('inbox.mail-events', 'data/inbox/mail-events.json', 'state', 'ops', 'メールから拾ったイベントの受け箱（obsidian mail-triage が書く・最大 500 件）', { schema: 'InboxMailEvents' }),
  d('business.weekly', 'data/business/weekly/{week}.json', 'series', 'strategy', '週次レビュー用の計測のまとめ（窓は確定した月〜日・ファイル名の週はその窓の ISO 週）', { retain: { family: 'weekly-metrics', keepNewest: 26 }, schema: 'WeeklyMetrics' }),

  // ===== data/: 記録から計算した結果・文書が引く調査 =====
  d('analysis.monetization-coverage', 'data/analysis/monetization/coverage-{ts}.json', 'series', 'product', '記事から商品への導線の網羅（読むのは最新 1 本）', { retain: { family: 'monetization', keepNewest: 1 }, schema: 'MonetizationCoverage' }),
  d('analysis.monetization-report', 'data/analysis/monetization/coverage-latest.md', 'report', 'product', '同上の報告（週次レビューが読む）'),
  d('analysis.growth-pack', 'data/analysis/growth/pack-{week}.json', 'series', 'site', '成長サイクルの週次の材料（最新＋減衰判定の過去 3 週だけ残す）', { retain: { family: 'growth', keepNewest: 4 }, schema: 'GrowthPack' }),
  d('analysis.growth-digest', 'data/analysis/growth/digest-{week}.json', 'series', 'site', '成長サイクルの週次ダイジェスト', { retain: { family: 'growth', keepNewest: 26 }, freshness: { failDays: 10 }, schema: 'GrowthDigest' }),
  d('analysis.growth-triage', 'data/analysis/growth/triage-log.json', 'ledger', 'site', 'ダイジェストの処分の記録', { schema: 'GrowthTriage' }),
  d('analysis.quiz-premium-funnel', 'data/analysis/quiz-premium-funnel.json', 'state', 'site', '演習アプリの有料化のファネル', { schema: 'QuizPremiumFunnel' }),
  d('analysis.career-funnel', 'data/analysis/career-funnel.json', 'state', 'affiliate', '転職アフィリエイトのファネル（fetch-metrics が週次で作る）', { schema: 'CareerFunnel', freshness: { warnDays: 10, failDays: 21 } }),
  d('analysis.career-funnel-report', 'data/analysis/career-funnel.md', 'report', 'affiliate', '同上の報告（月次レビューが読む）'),
  d('analysis.career-funnel-baseline', 'data/analysis/career-funnel-baseline/{date}.json', 'evidence', 'affiliate', '転職アフィリエイトのファネルの基準線', { retain: { family: 'affiliate', keepAll: true }, schema: 'CareerFunnelBaseline' }),
  d('analysis.buildjob-report', 'data/analysis/buildjob-report.md', 'report', 'affiliate', 'ビルドジョブの成果の報告'),
  d('analysis.psi-report', 'data/analysis/psi-report.md', 'report', 'site', 'PSI の最新の報告'),
  d('analysis.seo-meta', 'data/analysis/seo-meta.json', 'state', 'site', 'サイトの SEO meta の監査結果', { schema: 'SeoMeta' }),
  d('analysis.affiliate-opportunities', 'data/analysis/affiliate-opportunities/{date}.json', 'evidence', 'affiliate', '未活用のアフィリエイト案件の調査（文書が引用）', { retain: { family: 'affiliate', keepAll: true }, schema: 'AffiliateOpportunities' }),
  d('analysis.affiliate-research', 'data/analysis/affiliate-research/{date}.json', 'evidence', 'affiliate', '転職アフィリエイトの競合・読者の調査（文書が引用）', { retain: { family: 'affiliate', keepAll: true }, schema: 'AffiliateResearch' }),
  d('analysis.qualification-market', 'data/analysis/qualification-market/{date}.json', 'series', 'strategy', '資格ごとの市場（競合の混み具合）', { retain: { family: 'competitors', keepAll: true }, freshness: { warnDays: 90 }, schema: 'QualificationMarketScan' }),
  d('analysis.civil-service-applicants', 'data/analysis/civil-service-applicants.json', 'evidence', 'strategy', '公務員土木職の受験者数（文書が引用）', { schema: 'CivilServiceApplicants' }),

  // ===== .claude/state/: エージェント・スキルの作業状態（品質サイクル・監査・ロールアウトの進み具合・生成索引） =====
  // 型は任意（config/・data/ と違って必須にしない）。パスの直書きはラチェット（.claude/config/state-path-literal-baseline.json）で減らす
  d('state.readme', '.claude/state/README.md', 'report', 'ops', 'この置き場の説明'),
  // 計画・タスク
  d('state.todo-claims', '.claude/state/todo-claims.json', 'state', 'plan', 'タスクの claim（二重着手の防止。todo:claim・todo:complete）'),
  d('state.dispatch-log', '.claude/state/dispatch/dispatch-log.json', 'ledger', 'plan', 'タスクの実行記録'),
  d('state.backlog-audit-log', '.claude/state/backlog/audit-log.json', 'ledger', 'plan', 'backlog 棚卸しの処分の記録'),
  d('state.backlog-verify-status', '.claude/state/backlog/verify-status.json', 'state', 'plan', 'backlog カードの完了確認の状態'),
  // 品質サイクル（技術士総監・1級土木）
  d('state.mechanical-screen', '.claude/state/mechanical-screen.json', 'state', 'site', '全ページの機械的指標（/quality-cycle --mode screen）'),
  d('state.quality-scores', '.claude/state/quality-scores.json', 'state', 'site', '技術士総監のキーワードページの採点（/quality-cycle --mode score）'),
  d('state.quality-cycle-state', '.claude/state/quality-cycle-state.json', 'state', 'site', '同上の各ページの状態の移り変わり'),
  d('state.civil-quality-scores', '.claude/state/civil-quality-scores.json', 'state', 'site', '1級土木の textbook/guide の採点（/civil-textbook-cycle）'),
  d('state.civil-quality-cycle-state', '.claude/state/civil-quality-cycle-state.json', 'state', 'site', '同上の各ページの状態の移り変わり'),
  d('state.broken-explanations', '.claude/state/broken-explanations.json', 'evidence', 'site', '壊れた過去問解説の検出結果'),
  d('state.primary-answer-distribution', '.claude/state/primary-answer-distribution.json', 'state', 'site', '択一過去問の正答番号の分布'),
  d('state.content-expansion', '.claude/state/content-expansion.json', 'state', 'site', '記事の拡充の進み具合'),
  d('state.resurrection-candidates', '.claude/state/resurrection-candidates/{date}.md', 'report', 'site', '復活候補ページ（/resurrect-content）'),
  d('state.proofread-learnings', '.claude/state/proofread-learnings/{date}.md', 'report', 'site', '校正の学びの蒸留（/distill-proofread-learnings）'),
  d('state.pdf-mdx-audit', '.claude/state/pdf-mdx-audit/{date}{suffix}.json', 'evidence', 'site', 'PDF→MDX 変換の監査結果'),
  d('state.civil-figure-rework-failures', '.claude/state/civil-figure-rework/failures.log', 'evidence', 'site', '1級土木の図の作り直しで失敗したものの記録'),
  // 過去問起点のキーワード校正（技術士総監）
  d('state.exam-keyword-cycles-progress', '.claude/state/exam-keyword-cycles/progress.json', 'state', 'site', '過去問起点の校正サイクルの進み具合（/exam-keyword-cycle）'),
  d('state.exam-keyword-cycles-archive', '.claude/state/exam-keyword-cycles/logs-archive-2026-04/{**}', 'evidence', 'site', '同上の 2026-04 までのログ（凍結）'),
  d('state.exam-keyword-umbrella-drafts', '.claude/state/exam-keyword-cycles/umbrella-drafts/{name}.md', 'raw', 'site', '同上の親キーワードの下書き', { local: true, regen: '/exam-keyword-cycle が作り直す' }),
  d('state.exam-keyword-audits', '.claude/state/exam-keyword-audits/{name}/{**}', 'evidence', 'site', '過去問とキーワードの紐づけ監査（/audit-exam-mapping）'),
  d('state.exam-keyword-map', '.claude/state/exam-keyword-map.json', 'state', 'site', '過去問→キーワードの対応（生成索引）'),
  d('state.essay-keyword-frequency', '.claude/state/essay-keyword-frequency.json', 'state', 'site', '技術士総監の記述式に出たキーワードの頻度'),
  d('state.keyword-summaries', '.claude/state/keyword-summaries.json', 'state', 'site', 'キーワードページの要約（生成索引）'),
  d('state.pe-textbook-keyword-coverage', '.claude/state/pe-textbook-keyword-coverage.json', 'state', 'site', '技術士総監の教材→キーワードページの網羅'),
  d('state.pe-textbook-keyword-coverage-candidates', '.claude/state/pe-textbook-keyword-coverage-candidates.json', 'state', 'site', '同上の候補'),
  d('state.pe-first-stage-audit', '.claude/state/pe-first-stage-audit/{name}.json', 'evidence', 'site', '技術士第一次試験の過去問の監査（年度×科目と要約）'),
  d('state.pe-essay-review', '.claude/state/pe-essay-review/{name}.md', 'report', 'site', '技術士総監の記述式答案のレビュー'),
  // 図版
  d('state.figure-audit', '.claude/state/figure-audit/{date}.json', 'evidence', 'site', '図版の監査結果'),
  d('state.figure-audit-visual', '.claude/state/figure-audit-visual/{name}.json', 'evidence', 'site', '過去問の図の目視監査（年度ごと）'),
  d('state.figure-provenance', '.claude/state/figure-provenance.json', 'state', 'site', '図の出所の索引（audit-figures）'),
  d('state.figure-text-audit', '.claude/state/figure-text-audit.json', 'evidence', 'site', '図の文字の監査結果'),
  d('state.svg-audit', '.claude/state/svg-audit.json', 'state', 'site', 'SVG の機械監査（refresh-indexes）'),
  d('state.svg-catalog', '.claude/state/svg-catalog.json', 'state', 'site', 'SVG の一覧（生成索引）'),
  // 品質ゲートの基準と採点（quality/）
  d('state.quality-baselines', '.claude/state/quality/{name}-baseline.json', 'config', 'ops', '品質ゲートの基準線（lint・knip・画像・git バイナリ・図のクロップ・エージェントの説明）'),
  d('state.quality-scores-by-qualification', '.claude/state/quality/{name}-scores.json', 'state', 'site', '資格ごとの採点（1級土木一次・2級土木・コンクリート主任技士・建設部門・第一次試験・総監その他）'),
  d('state.quality-history', '.claude/state/quality/history.jsonl', 'ledger', 'ops', 'quality:audit の結果の推移'),
  d('state.quality-census', '.claude/state/quality/census.json', 'state', 'ops', '品質の棚卸し（census）の最新'),
  d('state.quality-census-history', '.claude/state/quality/census-history.jsonl', 'ledger', 'ops', '同上の推移'),
  d('state.quality-latest-report', '.claude/state/quality/latest-report.md', 'report', 'ops', 'quality:audit の最新の報告'),
  d('state.quality-audit-latest', '.claude/state/quality/audit-latest.{name}', 'raw', 'ops', 'quality:audit の最新の生の結果', { local: true, regen: 'npm run quality:audit' }),
  d('state.quality-env-inventory', '.claude/state/quality/env-inventory.json', 'raw', 'ops', '手元の環境の棚卸し', { local: true, regen: 'npm run quality:audit' }),
  d('state.quality-image-audit', '.claude/state/quality/image-audit.{name}', 'raw', 'ops', '画像アセットの監査の最新', { local: true, regen: 'npm run quality:audit' }),
  d('state.ai-image-review-ledger', '.claude/state/quality/ai-image-review-ledger.json', 'ledger', 'site', 'AI 生成の写真の実物どおり判定の記録（check-image-origin record-ai）'),
  d('state.figure-review-ledger', '.claude/state/quality/figure-review-ledger.json', 'ledger', 'site', '図の目視判定の記録'),
  d('state.figure-crop-report', '.claude/state/quality/figure-crop-report.json', 'state', 'site', '図のクロップ品質の最新'),
  d('state.quality-campaigns', '.claude/state/quality/content-{name}.json', 'evidence', 'site', '記事の拡充・出典の回復の一回きりの作業記録'),
  d('state.playwright-auth-wiring', '.claude/state/quality/playwright-auth-wiring-last.json', 'state', 'ops', 'Playwright の認証の配線検査の最新'),
  d('state.repo-assets-baseline', '.claude/state/repo-assets/baseline.json', 'config', 'ops', 'リポジトリのアセットの基準線'),
  d('state.repo-assets-report', '.claude/state/repo-assets/audit-latest.md', 'report', 'ops', 'リポジトリのアセットの監査の最新の報告'),
  d('state.repo-assets-audit', '.claude/state/repo-assets/audit-latest.json', 'raw', 'ops', '同上の生の結果', { local: true, regen: 'npm run quality:audit' }),
  // リンク・改善
  d('state.link-audit', '.claude/state/link-audit/audit-{ts}.json', 'series', 'site', '内部リンクの監査'),
  d('state.link-audit-external', '.claude/state/link-audit/external-latest.json', 'state', 'site', '外部リンクの監査の最新'),
  d('state.link-audit-report', '.claude/state/link-audit/latest-report.md', 'report', 'site', 'リンクの監査の最新の報告'),
  d('state.improvements', '.claude/state/improvements/{date}{suffix}.md', 'report', 'site', '改善候補の報告（performance-auditor・調査）'),
  d('state.improvements-evidence', '.claude/state/improvements/{name}-{date}.json', 'evidence', 'site', '改善候補の根拠（同じ名前の .md と対）'),
  d('state.improvements-topic', '.claude/state/improvements/{name}-{date}.md', 'report', 'site', '主題ごとの改善候補の報告（同じ名前の .json と対）'),
  d('state.search-growth-report', '.claude/state/improvements/search-growth-latest.md', 'report', 'site', '検索の成長の最新の報告'),
  d('state.search-growth-raw', '.claude/state/improvements/search-growth-{ts}.json', 'raw', 'site', '同上の生の結果', { local: true, regen: '/google-search-growth' }),
  d('state.content-ledger', '.claude/state/content-ledger.json', 'raw', 'site', '記事の台帳（生成索引）', { local: true, regen: 'npm run refresh-indexes' }),
  // 教材・アセット
  d('state.drive-manifest', '.claude/state/assets/drive-manifest.json', 'ledger', 'ops', 'Google Drive vault に置いたアセットの台帳（drive-vault-sync）'),
  d('state.r2-manifest', '.claude/state/assets/manifest.json', 'ledger', 'ops', 'R2 に置いたアセットの台帳（asset-offload）'),
  d('state.instagram-campaign-backup', '.claude/state/assets/instagram-campaign-backup.json', 'evidence', 'sns', 'Instagram のキャンペーンの素材を退避したときの記録'),
  d('state.reference-book-occlusion-scan', '.claude/state/assets/reference-book-occlusion-scan.json', 'evidence', 'material', '書籍のページ画像の遮蔽の走査結果'),
  d('state.reference-vault-consolidation', '.claude/state/assets/reference-vault-consolidation.json', 'evidence', 'material', '参考文献を Drive vault の 1 冊 1 フォルダへ統合したときの記録'),
  d('state.standards-drive-map', '.claude/state/assets/standards-drive-map.json', 'state', 'material', '共通仕様書の原本と Drive vault の対応'),
  d('state.ocr-audit', '.claude/state/ocr-audit/{**}', 'evidence', 'material', '文字起こしの監査の作業記録（市販書籍の本文を含むので Drive vault のアーカイブに置く）', { drive: 'repo-archive' }),
  // note
  d('state.note-published', '.claude/state/note-published.json', 'state', 'product', 'note の公開状態の生成索引（frontmatter から作る・手で直さない）'),
  d('state.note-republish', '.claude/state/note-republish/{**}', 'state', 'product', 'note の再公開の進み具合と対象の一覧'),
  d('state.note-publish-lists', '.claude/state/note-publish/{name}.txt', 'state', 'product', 'note の公開の対象の一覧'),
  d('state.note-cover-v4', '.claude/state/note-cover-v4-{name}', 'state', 'product', 'note カバー V4 の差し替えの進み具合（記事・マガジン・目視の一覧）'),
  d('state.note-attachments', '.claude/state/note-attach{name}.json', 'state', 'product', 'note の PDF 添付の反映・欠落の記録'),
  d('state.note-remaining-lists', '.claude/state/note-{name}.txt', 'state', 'product', 'note の一括反映で残っている記事の一覧（タグ・UTM・タグ同期）'),
  d('state.note-republish-hashes', '.claude/state/note-republish-hashes.json', 'state', 'product', 'note の再公開で反映した本文のハッシュ'),
  d('state.note-swap-banner-done', '.claude/state/note-swap-banner-done.json', 'state', 'product', 'note のバナーの差し替えを終えた記事'),
  d('state.note-update-aborted', '.claude/state/note-update-aborted.json', 'state', 'product', 'note の本文の反映を途中で止めた記事'),
  // SNS・動画
  d('state.youtube-thumbnails', '.claude/state/youtube-thumbnail-{name}.json', 'state', 'sns', 'YouTube のサムネイルの意匠と差し替えの進み具合'),
  d('state.video-status', '.claude/state/video-{name}.json', 'state', 'sns', '動画パックの状態・編集の指摘・公開の照合'),
  d('state.yt-verify', '.claude/state/yt-verify/latest.json', 'state', 'sns', 'YouTube の公開の照合の最新'),
  d('state.x-posted-live', '.claude/state/x-posted-live/latest.json', 'state', 'sns', 'X の投稿の照合の最新'),
  d('state.x-repost-queue', '.claude/state/x-repost/{name}', 'raw', 'sns', 'X の引用リポストの候補・承認・停止の印', { local: true, regen: '/x-repost が作り直す' }),
  d('state.instagram', '.claude/state/instagram-{name}.json', 'state', 'sns', 'Instagram のキャンペーンと編集の品質確認'),
  d('state.ig-reconcile', '.claude/state/ig-reconcile/{name}.json', 'state', 'sns', 'Instagram の照合結果（verify-ig-status）'),
  d('state.registry-reconcile', '.claude/state/registry-reconcile/{name}.json', 'state', 'sns', 'コンテンツ台帳と公開先の照合の最新（registry-reconcile）'),
  d('state.sns-progress', '.claude/state/sns/{name}.json', 'state', 'sns', 'SNS の品質キャンペーンとカードの描画の進み具合'),
  // 書籍の網羅（要約は git・見出しを含む詳細は Drive vault。content-taxonomy.md §7）
  d('state.book-coverage', '.claude/state/book-coverage.json', 'state', 'material', '書籍ごとの網羅の要約（判定の件数・判定日・展開した記事とコミット。市販書籍の見出しは持たない）', { schema: 'StateBookCoverage', refs: [{ at: 'books.*.expansions[].article', to: 'article' }] }),
  d('vault.book-coverage-candidates', 'content/sources/books/{name}/coverage/candidates.json', 'evidence', 'material', '書籍の節とサイトの節の候補表（audit-reference-book-coverage・市販書籍の見出しを含む）', { drive: 'reference-book-coverage', regen: 'npm run audit-reference-book-coverage' }),
  d('vault.book-coverage-verdict', 'content/sources/books/{name}/coverage/verdict.json', 'evidence', 'material', '同上の意味判定と展開の計画（Evaluator が書く・市販書籍の見出しを含む）', { drive: 'reference-book-coverage' }),
];

// ---- パスの照合 -----------------------------------------------------------------

const escape = (s) => s.replace(/[.+?^$()[\]\\|]/g, '\\$&');
const compiled = new Map();

/** 台帳のパスの型を正規表現にする（全体一致） */
export function patternOf(path) {
  if (!compiled.has(path)) {
    let re = '';
    for (const part of path.split(/(\{[^}]+\})/)) re += part.startsWith('{') ? (SLOTS[part] ?? escape(part)) : escape(part);
    compiled.set(path, new RegExp(`^${re}$`));
  }
  return compiled.get(path);
}

/** データセットの置き場（AREAS のキー）。content/registry のような 2 階層の置き場もあるので dir の前方一致で引く。どの置き場にも無い（Drive vault の写しが content/ にある）ときは null */
export const areaOf = (dataset) => Object.keys(AREAS).find((k) => dataset.path.startsWith(`${AREAS[k].dir}/`)) ?? null;
export const datasetById = (id) => DATASETS.find((x) => x.id === id) ?? null;

/**
 * 台帳から消した id → 後継の id。ワークフローは id で記録を指すので（scripts/ci-data.mjs）、main の YAML が
 * 古い id を渡しても止まらないよう、消した id はここへ移して後継に読み替える（tests/ci-data.test.mjs が YAML の id を検査）。
 */
export const RETIRED_IDS = {
  'note.competitors-latest': 'note.competitors',
  'coconala.competitors-latest': 'coconala.competitors',
  'coconala.blog-competitors-latest': 'coconala.blog-competitors',
  'x.competitors-latest': 'x.competitors',
  'instagram.competitors-latest': 'instagram.competitors',
  'x.own-posts-latest': 'x.own-posts',
  'afb.outcomes-latest': 'afb.outcomes',
  'psi.report': 'analysis.psi-report',
  'site.seo-meta': 'analysis.seo-meta',
  'gsc.rank-watch-run': 'gsc.rank-watch',
  'config.past-exam-inventory': 'pastexams.inventory',
  'config.pe-first-stage-historical-sources': 'pastexams.inventory',
  'config.r2-delete-list': 'r2.delete-list',
};

/** id を台帳のデータセットに解決する（廃止した id は後継へ）。無ければ null */
export const resolveDataset = (id) => datasetById(id) ?? datasetById(RETIRED_IDS[id]) ?? null;

/** ファイル（リポジトリ相対・/ 区切り）に当たるデータセット。ちょうど 1 つが正しい */
export const datasetsFor = (file) => DATASETS.filter((x) => patternOf(x.path).test(file));

/**
 * ファイルをデータセットごとに分ける。
 * @returns {{ byId: Map<string, string[]>, unmatched: string[], ambiguous: { file: string, ids: string[] }[] }}
 */
export function matchFiles(files) {
  const byId = new Map();
  const unmatched = [];
  const ambiguous = [];
  for (const f of files) {
    const hits = datasetsFor(f);
    if (hits.length === 0) unmatched.push(f);
    else if (hits.length > 1) ambiguous.push({ file: f, ids: hits.map((x) => x.id) });
    else {
      if (!byId.has(hits[0].id)) byId.set(hits[0].id, []);
      byId.get(hits[0].id).push(f);
    }
  }
  for (const list of byId.values()) list.sort().reverse(); // 新しい順（名前に日時があるものは名前順＝時刻順）
  return { byId, unmatched, ambiguous };
}

/**
 * 置き場のファイル（リポジトリ相対・/ 区切り）。tracked=true は git 管理下だけ（CI と同じ見え方）、
 * false は手元の git 管理外（画面から取った CSV など）も含める。
 */
export function listAreaFiles(root, area, { tracked = false } = {}) {
  const { dir } = AREAS[area];
  if (tracked) {
    const out = execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files', '-z', '--', `${dir}/`], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    return out.split('\0').filter((f) => f && !f.endsWith('/.gitkeep'));
  }
  const files = [];
  const walk = (rel) => {
    const abs = join(root, rel);
    if (!existsSync(abs)) return;
    for (const e of readdirSync(abs, { withFileTypes: true })) {
      const p = `${rel}/${e.name}`;
      if (e.isDirectory()) walk(p);
      else if (e.isFile() && e.name !== '.gitkeep') files.push(p);
    }
  };
  walk(dir);
  return files.sort();
}

// ---- 読み書き（パスを直書きせず台帳から引く） ---------------------------------------

function mustGet(id) {
  const x = resolveDataset(id);
  if (!x) throw new Error(`台帳に無いデータセット: ${id}`);
  return x;
}

/**
 * 書き込み先のパス（リポジトリ相対）。可変部分（{date} など）は values で埋め、台帳の型に合うことを確かめる。
 * {rev}・{rerun} のように省略できる部分は空文字でよい。
 */
export function datasetPath(id, values = {}) {
  const x = mustGet(id);
  const p = x.path.replace(/\{([a-z*]+)\}/g, (m, k) => {
    if (!(k in values)) throw new Error(`${id}: ${m} の値が要る（${x.path}）`);
    return String(values[k]);
  });
  if (!patternOf(x.path).test(p)) throw new Error(`${id}: ${p} は台帳の型 ${x.path} に合わない`);
  return p;
}

/** パスの可変部分の手前のディレクトリ（可変部分が無ければパスそのもの） */
export function datasetDir(id) {
  const { path } = mustGet(id);
  const i = path.indexOf('{');
  return i < 0 ? path : path.slice(0, path.lastIndexOf('/', i));
}

/**
 * 鮮度の閾値（最新の記録が何日古いと注意・失敗か）。台帳の行の freshness の宣言を返す。宣言が無ければ投げる
 * （検査が閾値を直書きしたり、宣言が無いのを「閾値なし」と読んで古いまま緑にしたりしない）。
 * @returns {{ warnDays?: number, failDays?: number }}
 */
export function freshnessOf(id) {
  const x = mustGet(id);
  if (!x.freshness) throw new Error(`${id}: 鮮度（freshness）が台帳に宣言されていない（scripts/lib/datasets.mjs の行に freshness: { warnDays, failDays } を足す）`);
  return x.freshness;
}

/** 鮮度の閾値のうち warnDays か failDays の片方。その側が宣言されていなければ投げる（undefined との比較は常に偽になり、古いまま緑になる） */
export function freshnessDays(id, kind) {
  const days = freshnessOf(id)[kind];
  if (!Number.isFinite(days)) throw new Error(`${id}: freshness.${kind} が台帳に宣言されていない`);
  return days;
}

/** freshness の宣言（{ warnDays, failDays }。片方だけでもよい）の誤りを文にして返す。正しければ空（check-datasets が使う） */
export function freshnessProblems(freshness) {
  const keys = Object.keys(freshness ?? {});
  if (keys.length === 0) return ['freshness が空（warnDays か failDays を書く）'];
  const problems = [];
  const unknown = keys.filter((k) => k !== 'warnDays' && k !== 'failDays');
  if (unknown.length) problems.push(`知らないキー ${unknown.join('・')}（warnDays・failDays だけ）`);
  for (const k of ['warnDays', 'failDays']) {
    if (k in freshness && !(Number.isInteger(freshness[k]) && freshness[k] > 0)) problems.push(`${k} は 1 以上の整数（日数）`);
  }
  if (Number.isInteger(freshness.warnDays) && Number.isInteger(freshness.failDays) && freshness.warnDays >= freshness.failDays) problems.push('warnDays は failDays より小さく（注意が先・失敗が後）');
  return problems;
}

/**
 * 台帳のパスの型に当たる手元のファイル。可変部分の無い階層だけを下り、可変部分はその階層の名前で絞る（{**} から下は全部）。
 * 置き場の外（Drive vault の写し）のデータセットを、書籍のページ画像のような大きな木を全部歩かずに引く
 */
function walkPattern(root, pattern) {
  const parts = pattern.split('/');
  const out = [];
  const walk = (i, rel) => {
    const abs = join(root, rel);
    if (!existsSync(abs)) return;
    if (parts[i].includes('{**}')) {
      const all = [];
      const deep = (r) => {
        for (const e of readdirSync(join(root, r), { withFileTypes: true })) {
          if (e.isDirectory()) deep(`${r}/${e.name}`);
          else if (e.isFile()) all.push(`${r}/${e.name}`);
        }
      };
      deep(rel);
      out.push(...all.filter((f) => patternOf(pattern).test(f)));
      return;
    }
    const last = i === parts.length - 1;
    const seg = parts[i].includes('{') ? patternOf(parts[i]) : null;
    for (const e of readdirSync(abs, { withFileTypes: true })) {
      if (seg ? !seg.test(e.name) : e.name !== parts[i]) continue;
      if (last && e.isFile()) out.push(`${rel}/${e.name}`);
      else if (!last && e.isDirectory()) walk(i + 1, `${rel}/${e.name}`);
    }
  };
  walk(1, parts[0]);
  return out;
}

/** データセットのファイル（リポジトリ相対・新しい順＝名前の降順。手元の git 管理外・Drive vault の写しも含む） */
export function datasetFiles(root, id) {
  const x = mustGet(id);
  const area = areaOf(x);
  const files = area ? listAreaFiles(root, area) : walkPattern(root, x.path);
  return matchFiles(files).byId.get(id) ?? [];
}

/** 最新のファイル（無ければ null） */
export const latestFile = (root, id) => datasetFiles(root, id)[0] ?? null;

/** その置き場に宣言のある領域 id（ファイルを読まない・サイドバー用） */
export const areaDomainIds = (area, domainIds) => domainIds.filter((id) => DATASETS.some((x) => areaOf(x) === area && x.domain === id));

/**
 * 置き場が id の取得元と合うか（config.* は config/、state.* は .claude/state/、vault.* は Drive vault の写し（drive 付き・置き場は問わない）、
 * それ以外は data/<取得元>/ か data/<取得元>.*）。フォルダを取得元ごとにした（段階 3）ので、id と置き場がずれたら台帳か置き場のどちらかが古い
 */
export function pathMatchesId(dataset) {
  const source = dataset.id.split('.')[0];
  if (source === 'config') return dataset.path.startsWith('config/');
  if (source === 'state') return dataset.path.startsWith(`${AREAS.state.dir}/`);
  if (source === 'registry') return dataset.path.startsWith(`${AREAS.registry.dir}/`);
  if (source === 'vault') return !!dataset.drive && areaOf(dataset) === null;
  return dataset.path.startsWith(`data/${source}/`) || dataset.path.startsWith(`data/${source}.`);
}

/**
 * JSON Schema を「場所・型・説明」の行にする（管理画面の表）。
 * 判別共用体（oneOf・anyOf の object が 2 つ以上）は各形の欄を 1 つの表に集め、全部の形にある必須の欄だけを必須にする
 */
export function schemaRows(js) {
  const variantsOf = (s) => s.anyOf ?? s.oneOf;
  const typeOf = (s) => {
    if (s.const !== undefined) return JSON.stringify(s.const);
    if (s.enum) return s.enum.map((v) => JSON.stringify(v)).join(' | ');
    const variants = variantsOf(s);
    if (variants) return [...new Set(variants.map(typeOf))].join(' | ');
    const t = Array.isArray(s.type) ? s.type.join(' | ') : s.type;
    if (t === 'object') return s.properties ? 'object' : '対応表';
    if (t === 'string' && s.format) return `string（${s.format}）`;
    return t ?? 'unknown';
  };
  /** 形ごとの行を欄の場所で束ねる。全部の形にあって必須の欄だけ必須、型は形ごとの型を並べる */
  const mergeRows = (lists) => {
    const byPath = new Map();
    for (const rows of lists) {
      const seen = new Set();
      for (const r of rows) {
        const path = r.path.replace(/\?$/, '');
        const cur = byPath.get(path) ?? { path, types: [], description: r.description, optional: false, n: 0 };
        if (!cur.types.includes(r.type)) cur.types.push(r.type);
        cur.optional ||= r.path.endsWith('?');
        if (!seen.has(path)) cur.n++;
        seen.add(path);
        byPath.set(path, cur);
      }
    }
    return [...byPath.values()].map((c) => ({ path: c.optional || c.n < lists.length ? `${c.path}?` : c.path, type: c.types.join(' | '), description: c.description }));
  };
  /** s の下の行（s 自身の行は含めない） */
  const below = (s, path) => {
    const variants = variantsOf(s);
    const objects = (variants ?? []).filter((x) => x.properties);
    if (objects.length > 1) return mergeRows(objects.map((o) => below(o, path)));
    const body = variants?.find((x) => x.type !== 'null') ?? s;
    if (body.properties) {
      return Object.entries(body.properties).flatMap(([k, v]) => rowsOf(v, path ? `${path}.${k}` : k, (body.required ?? []).includes(k)));
    }
    if (body.additionalProperties && typeof body.additionalProperties === 'object') return rowsOf(body.additionalProperties, `${path}.{id}`, true);
    if (body.items) return rowsOf(body.items, `${path}[]`, true);
    return [];
  };
  const descriptionOf = (s) => s.description ?? variantsOf(s)?.find((x) => x.type !== 'null')?.description ?? null; // null を許す欄は元の型の説明を出す
  const rowsOf = (s, path, required) => [{ path: required ? path : `${path}?`, type: typeOf(s), description: descriptionOf(s) }, ...below(s, path)];
  return below(js, '');
}

// ---- 型の読み取り（型の無いデータセット用） --------------------------------------

const MAX_ROWS = 80;
const MAX_DEPTH = 5;
const IDENT = /^[a-z_$][A-Za-z0-9_$]*$/;

const kindOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
const kindsOf = (values) => [...new Set(values.map(kindOf))].join(' | ');

/**
 * id → 値 の対応表か（フィールド名の並んだオブジェクトと分ける）。
 * キーが id（ハイフン・数字始まり）で値の型が揃っていれば件数に関わらず対応表。
 * それ以外は 5 件以上で、値が全部オブジェクトでキーの半分以上が共通、または値が全部同じ基本型でキーが多い。
 */
function looksLikeMap(obj) {
  const keys = Object.keys(obj);
  const vals = Object.values(obj);
  const sameKind = vals.length > 0 && vals.every((v) => kindOf(v) === kindOf(vals[0]));
  if (sameKind && keys.some((x) => !IDENT.test(x))) return true;
  if (keys.length < 5) return false;
  if (vals.every((v) => kindOf(v) === 'object')) {
    const sets = vals.map((v) => new Set(Object.keys(v)));
    const union = new Set(sets.flatMap((x) => [...x]));
    const common = [...union].filter((k) => sets.every((x) => x.has(k)));
    return union.size > 0 && common.length * 2 >= union.size;
  }
  const k = kindOf(vals[0]);
  return k !== 'object' && k !== 'array' && sameKind && keys.length >= 10;
}

/**
 * 同じ場所に現れる値（配列の要素・対応表の値）をまとめて 1 行ずつ書く。
 * オブジェクトはキーごとに下へ、出現しないことがあるキーは ? を付ける。
 */
function describe(values, path, depth, rows) {
  if (rows.length >= MAX_ROWS) return;
  const objects = values.filter((v) => kindOf(v) === 'object');
  const arrays = values.filter((v) => kindOf(v) === 'array');
  const others = values.filter((v) => kindOf(v) !== 'object' && kindOf(v) !== 'array');

  if (objects.length && objects.every(looksLikeMap)) {
    const inner = objects.flatMap((o) => Object.values(o));
    const n = objects.length === 1 ? `（${inner.length} 件）` : '';
    const leaf = inner.every((v) => kindOf(v) !== 'object' && kindOf(v) !== 'array');
    rows.push({ path, type: leaf ? `対応表<${kindsOf(inner)}>${n}` : `対応表${n}` });
    if (!leaf && depth < MAX_DEPTH) describe(inner, `${path}.{id}`, depth + 1, rows);
    return;
  }
  if (arrays.length) {
    const items = arrays.flat();
    const n = arrays.length === 1 ? `（${items.length} 件）` : '';
    const leaf = items.every((v) => kindOf(v) !== 'object' && kindOf(v) !== 'array');
    const head = items.length ? (leaf ? `array<${kindsOf(items)}>${n}` : `array${n}`) : 'array（空）';
    rows.push({ path, type: [head, ...others.map(kindOf)].join(' | ') });
    if (!leaf && depth < MAX_DEPTH) describe(items, `${path}[]`, depth + 1, rows);
    return;
  }
  if (objects.length) {
    if (path) rows.push({ path, type: others.length ? `object | ${kindsOf(others)}` : 'object' });
    if (depth >= MAX_DEPTH) return;
    const seen = new Map();
    for (const o of objects) for (const [k, v] of Object.entries(o)) {
      if (!seen.has(k)) seen.set(k, []);
      seen.get(k).push(v);
    }
    for (const [k, vs] of seen) {
      const optional = vs.length < objects.length ? '?' : '';
      describe(vs, `${path ? `${path}.` : ''}${k}${optional}`, depth + 1, rows);
    }
    return;
  }
  rows.push({ path, type: kindsOf(values) });
}

function summaryOf(value) {
  const k = kindOf(value);
  if (k === 'array') return `array（${value.length} 件）`;
  if (k === 'object') return looksLikeMap(value) ? `対応表（${Object.keys(value).length} 件）` : `object（キー ${Object.keys(value).length}）`;
  return k;
}

/** 説明文: 先頭の _doc / description / $comment（文字列のときだけ） */
export function fileDoc(value) {
  if (kindOf(value) !== 'object') return null;
  for (const k of ['_doc', 'description', '$comment', '_comment']) if (typeof value[k] === 'string') return value[k];
  return null;
}

/**
 * ファイルの型を実物から読む。JSON・JSON Lines・CSV・テキストに対応し、大きすぎるファイルは読まない。
 * @returns {{ format: string, summary: string, rows: { path: string, type: string }[], doc: string|null, error?: string }}
 */
export function inferShape(root, path, { maxBytes = 8 * 1024 * 1024 } = {}) {
  const abs = join(root, path);
  const size = statSync(abs).size;
  const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
  if (size > maxBytes) return { format: ext, summary: `大きいので読まない（${Math.round(size / 1024 / 1024)}MB）`, rows: [], doc: null };
  if (!['json', 'jsonl', 'csv', 'md', 'txt'].includes(ext)) return { format: ext, summary: `${Math.round(size / 1024)}KB`, rows: [], doc: null };
  const text = readFileSync(abs, 'utf8').replace(/^\uFEFF/, '');
  try {
    if (ext === 'json') {
      const v = JSON.parse(text);
      const rows = [];
      describe([v], '', 0, rows);
      return { format: 'JSON', summary: summaryOf(v), rows: rows.map((r) => ({ ...r, path: r.path || '(全体)' })), doc: fileDoc(v) };
    }
    if (ext === 'jsonl') {
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      const rows = [];
      describe(lines.slice(0, 200).map((l) => JSON.parse(l)), '', 0, rows);
      return { format: 'JSON Lines', summary: `${lines.length} 行`, rows: rows.filter((r) => r.path), doc: null };
    }
    if (ext === 'csv') {
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      const head = (lines[0] ?? '').split(',').map((h) => h.replace(/^"|"$/g, ''));
      return { format: 'CSV', summary: `${Math.max(lines.length - 1, 0)} 行 × ${head.length} 列`, rows: head.map((h) => ({ path: h, type: '列' })), doc: null };
    }
  } catch (e) {
    return { format: ext, summary: '読み取れない', rows: [], doc: null, error: e.message };
  }
  return { format: ext === 'md' ? 'Markdown' : 'テキスト', summary: `${text.split(/\r?\n/).length} 行`, rows: [], doc: null };
}
