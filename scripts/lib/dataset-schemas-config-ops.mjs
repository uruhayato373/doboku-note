/**
 * dataset-schemas-config-ops.mjs — 設定（config/）の型（zod）。dataset-schemas.mjs が export * で束ね、台帳（datasets.mjs）の schema が名前で引く。
 * 型を足す約束は dataset-schemas.mjs の先頭。部品は dataset-schema-parts.mjs。
 *
 * このファイルは運用・計測・アセット置き場の設定（config.affiliate-asp ほか 19 本）。人が手で書く正本なので基本は .strict()（誤記の欄を止める）。
 * `_note`・`$comment` のような説明用の欄は実データどおり書く。正規表現の欄は「正規表現として読めるか」だけを見る（当てはまり方は読み手と check-* が持つ）。
 * indexnow・workflow-health は npm ci をしないワークフローが読む。読み手にこの型を import しない（型は check-datasets が検査する）。
 */
import { z } from 'zod';
import { jstDate, utcTime, offsetTime, flag, uniqueBy } from './dataset-schema-parts.mjs';
import { findOverlaps } from '../../src/lib/affiliate-placement-core.mjs';

// ---- 共通の小さな部品 --------------------------------------------------------------------------

const note = z.string().optional();
const text = z.string().min(1);
const posInt = z.number().int().min(1);
const nonNeg = z.number().min(0);
const strings = z.array(text);
const nonEmptyStrings = z.array(text).min(1);

const isRegex = (s) => {
  try {
    new RegExp(s);
    return true;
  } catch {
    return false;
  }
};
/** 正規表現の文字列（JS の RegExp として読めること） */
const regexText = text.refine(isRegex, '正規表現として読めない');

/** 'a.b' 形の id が重複していないこと用の共通の書き方は uniqueBy を使う。ここは「_ で始まる欄は説明文・それ以外は値」の辞書 */
const dictWithNotes = (valueSchema, what) =>
  z.record(z.string(), z.union([z.string(), valueSchema])).superRefine((rec, ctx) => {
    for (const [k, v] of Object.entries(rec)) {
      if (k.startsWith('_')) {
        if (typeof v !== 'string') flag(ctx, [k], `${what}: _ で始まる欄は説明文（文字列）`);
      } else if (!valueSchema.safeParse(v).success) flag(ctx, [k], `${what}: ${k} の値が不正`);
    }
  });

/** Playwright の接続設定（ブラウザ）。ASP・A8・Google の画面取得で共通の欄の集合（使う欄だけ書く） */
const browserConfig = z
  .object({
    authService: text.optional().describe('認証プロファイルのサービス名（.claude/config/playwright-auth-profiles.json の id）'),
    legacyProfileDir: text.optional().describe('旧プロファイルのディレクトリ（リポジトリ相対）'),
    legacyStateFile: text.optional().describe('旧 storageState のファイル（リポジトリ相対）'),
    debugDir: text.optional().describe('デバッグ出力のディレクトリ（リポジトリ相対）'),
    channel: z.enum(['chrome', 'msedge', 'chromium']).optional().describe('使うブラウザ'),
    headless: z.boolean().optional(),
    _headlessNote: note,
    sessionPersistsAcrossProcesses: z.boolean().optional().describe('別プロセスにログインを持ち越せるか'),
    _sessionNote: note,
    timeoutMs: posInt.optional().describe('1 操作の待ち時間（ミリ秒）'),
    siteSwitchWaitMs: posInt.optional().describe('サイト切替の待ち時間（ミリ秒）'),
    _timeoutNote: note,
    statusIntervalMs: posInt.optional().describe('ログイン待ちの状況表示の間隔（ミリ秒）'),
    loginMaxWaitMs: posInt.optional().describe('ログイン待ちの上限（ミリ秒）'),
  })
  .strict();

// ---- config.affiliate-asp ----------------------------------------------------------------------

const siteIdMap = z.record(z.string(), z.string().regex(/^\d+$/, '数字だけのサイト ID')).describe('サイト名 → ASP 側のサイト ID');

const aspA8 = z
  .object({
    label: text,
    connectionFrom: z.string().regex(/^config\./, '台帳の id（config.…）').describe('接続（URL・口座・ブラウザの共通部分）の正本の台帳 id。読み出し時に合成する'),
    _connectionNote: note,
    siteSeparation: z.literal('none').describe('A8 は管理画面にサイト切替が無い'),
    _siteSeparationNote: note,
    accountIdPattern: regexText.describe('口座 ID を抜き出す正規表現'),
    partneredPath: text,
    applyingPath: text,
    browser: browserConfig,
  })
  .strict();

const aspMoshimo = z
  .object({
    label: text,
    baseUrl: z.url(),
    homePath: text,
    reAuthPattern: regexText,
    siteSeparation: z.literal('url-param'),
    siteParam: text,
    sites: siteIdMap,
    reportPath: text,
    partneredPath: text,
    applyingPath: text,
    searchPath: text,
    searchParam: text,
    _searchParamNote: note,
    applyButtonLabel: text,
    bulkApplyLabel: text,
    _applyNote: note,
    statusScopeAnchor: text,
    _statusNote: note,
    browser: browserConfig,
  })
  .strict();

const aspAfb = z
  .object({
    label: text,
    api: z
      .object({
        partnerId: z.string().regex(/^\d+$/),
        specUrl: z.url(),
        specUpdated: jstDate('API 仕様書の更新日'),
        _note: note,
      })
      .strict(),
    baseUrl: z.url(),
    homePath: text,
    reAuthPattern: regexText,
    siteSeparation: z.literal('chosen-widget'),
    sites: siteIdMap,
    siteIdPattern: regexText,
    siteSelectName: text,
    chosenContainer: text,
    chosenOption: text,
    _siteSwitchNote: note,
    readyMarker: text,
    readyPath: text,
    _readyPathNote: note,
    _readyNote: note,
    unpartneredPath: text,
    partneredPath: text,
    applyingPath: text,
    searchPath: text,
    searchParam: text,
    searchSubmitSelector: text,
    _searchNote: note,
    listItemPattern: regexText,
    _listNote: note,
    paginationMode: z.enum(['click', 'url']),
    _paginationNote: note,
    browser: browserConfig,
  })
  .strict();

/** 3 ASP（A8・もしも・afb）の提携運用の接続設定（config/affiliate-asp.json）。A8 の成果取込は ConfigA8ReportAutomation */
export const ConfigAffiliateAsp = z
  .object({
    schemaVersion: z.literal(1),
    _note: note,
    _siteAttributionNote: note,
    targetSiteName: text.describe('自社サイトの名前。ASP の画面のサイト名と照合する'),
    forbiddenSiteText: nonEmptyStrings.describe('同じ口座に同居する他サイトの名前。画面に出ていたら例外で止める'),
    asps: z.object({ a8: aspA8, moshimo: aspMoshimo, afb: aspAfb }).strict(),
  })
  .strict()
  .meta({ title: 'ASP 提携運用の接続設定' });

// ---- config.a8-report-automation ---------------------------------------------------------------

const a8Report = z
  .object({
    label: text,
    path: z.string().regex(/^\//, '/ で始まるパス'),
    siteScope: z.enum(['site-rows', 'account-wide']).describe('site-rows＝サイト列で分離できる・account-wide＝口座横断で分離できない'),
    _note: note,
  })
  .strict();

const a8PeriodForm = z
  .object({
    granularity: z.enum(['month', 'day']),
    startPlaceholder: text,
    endPlaceholder: text,
    valueFormat: text,
    applyButtonLabel: text,
    monthTabLabel: text,
    pickerRoot: text,
    monthCell: text,
    disabledCellClass: text,
    yearSwitch: text,
    prevYearLabel: text,
    nextYearLabel: text,
  })
  .strict();

/** A8.net メディア管理画面のレポート CSV 取得設定（config/a8-report-automation.json） */
export const ConfigA8ReportAutomation = z
  .object({
    schemaVersion: z.literal(2).describe('2＝2026-07-27 の実機調査で確定した値'),
    _note: note,
    a8: z
      .object({
        baseUrl: z.url(),
        homePath: z.string().regex(/^\//),
        reAuthPattern: regexText,
        targetSite: text.describe('自社サイトの名前（サイト別レポートの行の完全一致で照合）'),
        relatedSites: strings.describe('副サイトの名前（検算は targetSite との合計と比べる）'),
        _relatedSitesNote: note,
        mediaId: z.string().regex(/^a\d{11}$/, 'a + 数字 11 桁').describe('A8 の口座（メディア）ID'),
        _accountNote: note,
        _isolationNote: note,
        _periodNote: note,
        periodForm: a8PeriodForm,
        _periodFormNote: note,
        reports: z.record(z.string(), a8Report).describe('レポート id → 取得先とサイト分離の可否'),
        exportButtonLabels: nonEmptyStrings,
        _exportButtonNote: note,
        csvEncoding: z.enum(['shift_jis', 'utf-8']),
        _csvEncodingNote: note,
        columnAliases: z.record(z.string(), nonEmptyStrings).describe('内部の列名 → CSV のヘッダー候補'),
        _columnAliasesNote: note,
        programIdMap: dictWithNotes(text, 'programIdMap').describe('A8 のプログラム ID（または名前）→ 自社 mat の語彙。_note は説明'),
        _stats47Programs: dictWithNotes(text, '_stats47Programs').describe('同一口座の他サイトのプログラム（自社の allowlist に入れない）'),
      })
      .strict(),
    browser: browserConfig,
  })
  .strict()
  .meta({ title: 'A8 レポート取得の設定' });

// ---- config.career-funnel ----------------------------------------------------------------------

/** 転職アフィリエイトのファネルの設定（config/career-funnel.json） */
/** 転職アフィリエイトの配置ルール（config/affiliate-placements.json）。判定は src/lib/affiliate-placement-core.mjs と同じ関数を使う */
const PlacementTarget = z
  .object({
    pageKind: z.enum(['doc', 'category', 'tool', 'standards', 'home']).describe('ページの種類（standards＝公的基準の章ページ・home＝トップ）'),
    categories: z.array(z.string().regex(/^[a-z][a-z0-9-]*$/)).min(1).optional().describe('対象のカテゴリ。書かなければ全カテゴリ'),
    excludeCategories: z.array(z.string().regex(/^[a-z][a-z0-9-]*$/)).min(1).optional().describe('除くカテゴリ'),
    careerDoc: z.enum(['any', 'only', 'exclude']).optional().describe('キャリア記事（tags: [career]）の扱い。doc だけ'),
  })
  .strict();
const PlacementRule = z
  .object({
    id: z.string().regex(/^PL-\d{4}$/),
    program: z.string().regex(/^[a-z][a-z0-9-]*$/).describe('案件の id（affiliate.catalog）'),
    slot: z.string().regex(/^[a-z][a-z0-9-]*$/).describe('面（台帳 config.cta-placements の affiliate のキー＝GA4 の cta_placement）'),
    target: PlacementTarget,
    period: z.object({ from: offsetTime('開始'), until: offsetTime('終了（この時刻を含まない）').nullable() }).strict(),
    experiment: z.string().regex(/^EXP-\d{3}$/).nullable().describe('関わる実験の id'),
    note: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((r, ctx) => {
    if (r.period.until && Date.parse(r.period.until) <= Date.parse(r.period.from)) flag(ctx, ['period', 'until'], 'until が from より前');
    if (r.target.pageKind !== 'doc' && r.target.careerDoc) flag(ctx, ['target', 'careerDoc'], 'careerDoc は記事（doc）だけ');
  });
export const ConfigAffiliatePlacements = z
  .object({
    schemaVersion: z.literal(1),
    $comment: note,
    rules: z.array(PlacementRule).min(1).superRefine(uniqueBy('id', 'ルール id')),
  })
  .strict()
  .superRefine((c, ctx) => {
    for (const [a, b] of findOverlaps(c.rules)) flag(ctx, ['rules'], `${a} と ${b} が同じ面・重なる期間・交わる対象（1 ページ 1 面 1 案件にならない）`);
  })
  .meta({ title: '転職アフィリエイトの配置ルール' });

/** A8 の広告リンク（mat）の許可リスト（config/affiliate-mats.json）。check-affiliate-mats が src・content の a8mat= をここと突き合わせる */
export const ConfigAffiliateMats = z
  .object({
    schemaVersion: z.literal(1),
    _comment: text,
    mats: z
      .array(
        z
          .object({
            mat: z.string().regex(/^[0-9A-Z]+(\+[0-9A-Z]+){3}$/, 'A8 の a8mat（4 つのトークンを + でつなぐ）'),
            program: z.string().regex(/^[a-z][a-z0-9-]*$/).describe('案件の id（affiliate.catalog の programs のキー）'),
            label: text.describe('案件の表示名'),
            surfaces: z.array(text).describe('この mat を置く面（sidebar・inline・article-end・note-article・links）。未配線の予備は空'),
            definedIn: text.describe('リンクを書いている場所'),
            expiresAt: jstDate('リンクの終了日').nullable().describe('A8 で確かめた終了日。未定は null'),
            note: text.describe('確認の記録・成果条件'),
          })
          .strict(),
      )
      .min(1)
      .superRefine(uniqueBy('mat', 'mat')),
  })
  .strict()
  .meta({ title: 'A8 の広告リンク（mat）の許可リスト' });

/** サイト内の広告・送客の配置の語彙（config/cta-placements.json）。GA4 の cta_placement の値と同じ id を使う */
const CtaPlacement = z
  .object({
    label: text.describe('管理画面・報告に出す名前'),
    status: z.enum(['active', 'retired']).describe('active＝今の配置／retired＝撤去済み（GA4 の過去の窓には残る）'),
    retiredAt: jstDate('撤去日').optional().describe('撤去日が分かっているときだけ'),
    pageKind: z.enum(['doc', 'category', 'tool', 'standards', 'home', 'links']).describe('配置のあるページの種類'),
    pixelPriority: z.number().int().min(1).nullable().describe('1 ページ 1 ピクセルの発火源の優先順（小さいほど優先・null は発火源にならない）'),
    program: z.string().regex(/^[a-z][a-z0-9-]*$/).optional().describe('この配置に出す案件が決まっているとき（affiliate.catalog の id）'),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.retiredAt && v.status !== 'retired') flag(ctx, ['retiredAt'], 'retiredAt があるのに status が retired でない');
    if (v.status === 'retired' && v.pixelPriority !== null) flag(ctx, ['pixelPriority'], '撤去済みの配置は発火源にならない（null にする）');
  });
export const ConfigCtaPlacements = z
  .object({
    schemaVersion: z.literal(1),
    $comment: note,
    affiliate: z.record(z.string().regex(/^[a-z][a-z0-9-]*$/, 'GA4 の cta_placement の値'), CtaPlacement).describe('配置 id → 名前・状態'),
  })
  .strict()
  .meta({ title: 'サイトの広告・送客の配置の語彙' });

export const ConfigCareerFunnel = z
  .object({
    schemaVersion: z.literal(1),
    $comment: note,
    highIntentQueryTerms: nonEmptyStrings.describe('購買意図の高い検索語（部分一致）'),
    $pillarsComment: note,
    pillarRules: z
      .array(
        z
          .object({
            pillar: z.string().regex(/^[a-z][a-z0-9-]*$/).describe('柱の id'),
            label: text,
            slugPatterns: nonEmptyStrings.describe('記事 slug への部分一致。配列の順に first-match-wins'),
          })
          .strict(),
      )
      .min(1)
      .superRefine(uniqueBy('pillar', '柱')),
    $noteComment: note,
    noteUtmPrefix: text.describe('note のキャリア記事を見分ける utmCampaign の接頭辞'),
    $dimensionComment: note,
    dimensionRegisteredAt: z.record(z.string(), jstDate('GA4 カスタムディメンションの作成日')).describe('パラメータ名 → 作成日。この日より前のイベントには遡及されない'),
    $baselineComment: note,
    baseline: z
      .object({
        dataset: z.literal('analysis.career-funnel-baseline').describe('凍結した基線の台帳 id'),
        date: jstDate('凍結した基線の日（GA4 の窓の終端）'),
      })
      .strict()
      .describe('起票時の基線（凍結ファイルへの参照。数字はここに写さない）'),
    $forbiddenComment: note,
    forbiddenCtaPhrases: nonEmptyStrings.describe('CTA 文言に混ぜてはいけない短絡表現'),
  })
  .strict()
  .meta({ title: '転職ファネルの設定' });

// ---- config.search-strategy --------------------------------------------------------------------

/** 検索キーワード戦略のクラスタ（config/search-strategy.json） */
export const ConfigSearchStrategy = z
  .object({
    schemaVersion: z.literal(1),
    _doc: note,
    _note: note,
    striking: z
      .object({
        minPosition: z.number().min(1).describe('改善候補にする順位の下限（この順位より下）'),
        maxPosition: z.number().min(1).describe('改善候補にする順位の上限'),
        minImpressions: posInt,
        maxCandidatesPerCluster: posInt,
      })
      .strict()
      .superRefine((s, ctx) => {
        if (s.minPosition >= s.maxPosition) flag(ctx, ['minPosition'], 'minPosition は maxPosition より小さい');
      }),
    clusters: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-z][a-z0-9-]*$/),
            label: text,
            audience: text,
            queryPattern: regexText.describe('検索語に当てる正規表現'),
            pagePrefixes: z.array(z.string().regex(/^\//, '/ で始まる')).min(1).describe('受け皿のページのパスの接頭辞'),
            goal: text,
          })
          .strict(),
      )
      .min(1)
      .superRefine(uniqueBy('id', 'クラスタ id')),
  })
  .strict()
  .meta({ title: '検索キーワード戦略' });

// ---- config.seo-watchwords ---------------------------------------------------------------------

const INTENT_IDS = ['exam-task', 'exam-topic', 'qualification-guide', 'reference'];

const watchword = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    keyword: text.describe('見張る検索語'),
    targetPath: z.string().regex(/^\/(exam|practice|standards|topics|tools)\/[\w/-]+$/).refine((p) => !p.endsWith('/'), '正規のパス（末尾スラッシュなし）'),
    contentPath: z.string().regex(/^(content\/site\/.+\.mdx|src\/app\/tools\/[\w/-]+\/page\.tsx)$/, '記事 MDX かツールのページ'),
    priority: z.union([z.literal(1), z.literal(2), z.literal(3)]).describe('学習上の価値（1 が高い）'),
    country: z.string().regex(/^[a-z]{3}$/).nullable().describe('GSC の国コード（3 文字）'),
    device: z.enum(['MOBILE', 'DESKTOP', 'TABLET']).nullable().describe('null＝全端末'),
    enabled: z.boolean(),
    qualification: text.describe('資格 id（qualification-registry の id）'),
    intent: z.enum(INTENT_IDS).describe('受験意図'),
    mode: z.enum(['improve', 'monitor']).describe('improve＝記事を改善する・monitor＝計測だけ'),
    examEvent: text.optional().describe('試験時期の判定に使う exam-calendar の予定の key（資格ごとの events の key）'),
    audience: z.string().min(10),
    need: z.string().min(10),
    rationale: z.string().min(10),
    nextStep: z.object({ label: text, path: z.string().regex(/^\/(exam|tools)\/[\w/-]+$/) }).strict(),
    evidence: z.object({ kind: z.enum(['gsc', 'hypothesis']), source: text }).strict().describe('登録の根拠'),
  })
  .strict();

/** 順位を見張る検索語（config/seo-watchwords.json）。選び方の検査は seo-rank-watch の validateConfig が持つ */
export const ConfigSeoWatchwords = z
  .object({
    schemaVersion: z.literal(1),
    siteUrl: z.string().regex(/^sc-domain:/, 'GSC のドメインプロパティ'),
    policy: z
      .object({
        minImpressions: posInt,
        minActiveDays: posInt,
        maxConcurrent: posInt,
        maxIneffectiveCycles: posInt,
        maxSnapshotAgeDays: posInt,
      })
      .strict(),
    watchwords: z.array(watchword).superRefine(uniqueBy('id', '見張りの id')),
    strategy: z
      .object({
        version: z.literal(2).describe('戦略の版（seo-watch-strategy の strategyErrors が 2 を要求する。ファイルの版は schemaVersion）'),
        reviewedAt: jstDate('戦略を見直した日'),
        reviewEveryDays: z.number().int().min(7),
        objective: z.string().min(10),
        focusSource: text.describe('重点資格の正本（台帳 config.business-direction）。読み手が focusQualifications を足す'),
      })
      .strict(),
  })
  .strict()
  .meta({ title: '順位を見張る検索語' });

// ---- config.seo-meta-config --------------------------------------------------------------------

/** SEO meta 監査の対象と巡回の設定（config/seo-meta-config.json）。キーは読み手（seo-checks・metadata.ts）に合わせた snake_case */
export const ConfigSeoMeta = z
  .object({
    schemaVersion: z.literal(1),
    description: note,
    url_source: text.describe('対象 URL の一覧を持つファイル（リポジトリ相対）'),
    include_routes: z.array(z.string().regex(/^\//)).min(1).describe('一覧に加えて検査するルート'),
    concurrency: posInt,
    timeout_ms: posInt,
    thresholds: z
      .object({
        title: z.object({ max_length: posInt }).strict(),
        description: z
          .object({
            min_length: posInt.describe('短すぎの下限'),
            max_length: posInt.describe('検索結果に出る長さの推奨上限'),
            lint_max_length: posInt.describe('frontmatter の lint が長すぎと指摘する長さ'),
            _note: note,
          })
          .strict()
          .superRefine((d, ctx) => {
            if (d.min_length > d.max_length) flag(ctx, ['min_length'], 'min_length は max_length 以下');
            if (d.max_length > d.lint_max_length) flag(ctx, ['max_length'], 'max_length は lint_max_length 以下');
          }),
      })
      .strict()
      .describe('title と description の長さの唯一の正本'),
  })
  .strict()
  .meta({ title: 'SEO meta 監査の設定' });

// ---- config.growth-cycle -----------------------------------------------------------------------

const ratio = z.number().min(0).max(1);

/** 成長サイクル（計測ダイジェスト）の設定（config/growth-cycle.json） */
export const ConfigGrowthCycle = z
  .object({
    _doc: note,
    _why: note,
    schemaVersion: z.literal(1),
    baselineDays: posInt.describe('基線の日数'),
    gscCountry: z.string().regex(/^[a-z]{3}$/),
    organicSources: nonEmptyStrings.describe('自然検索とみなす GA4 の source'),
    events: nonEmptyStrings.describe('週次で取る GA4 のイベント'),
    digest: z
      .object({
        _why: note,
        surface: z.object({ seo: posInt, revenue: posInt }).strict().describe('ダイジェストに出す件数の上限'),
        suppressWeeks: z.object({ adopted: posInt, reject: posInt }).strict().describe('採用・却下した機会を再表示しない週数'),
        seo: z
          .object({
            minImpressions: posInt,
            expectedCtrByPosition: z.array(ratio).min(1).describe('順位 1 位から順の期待 CTR'),
            expectedCtrBeyond10: ratio,
            lowCtrRatio: ratio,
            strikingPositionMin: nonNeg,
            strikingPositionMax: nonNeg,
            strikingTargetPosition: nonNeg,
            dropMinBaseWeeklyClicks: posInt,
            dropRatio: ratio,
            cannibalMinImpressionsPerPage: posInt,
            cannibalMaxPosition: nonNeg,
            decayWeeks: posInt,
            decayMinWeeklyClicks: posInt,
          })
          .strict()
          .superRefine((s, ctx) => {
            if (s.strikingPositionMin > s.strikingPositionMax) flag(ctx, ['strikingPositionMin'], 'strikingPositionMin は strikingPositionMax 以下');
          }),
        revenue: z
          .object({
            ctaClickEvents: nonEmptyStrings,
            ctaImpressionEvents: nonEmptyStrings,
            minPlacementImpressions28d: posInt,
            lowPlacementCtrRatio: ratio,
            minCtaImpressions: posInt,
            lowPageCtrRatio: ratio,
            quizMinStarts: posInt,
            quizDropRatio: ratio,
          })
          .strict(),
        measurement: z
          .object({
            vanishMinBaseWeekly: posInt,
            bingSessionsPerClickMax: nonNeg,
            maxInputAgeDays: posInt,
          })
          .strict(),
      })
      .strict()
      .describe('機会検出（growth-opportunities）の閾値'),
  })
  .strict()
  .meta({ title: '成長サイクルの設定' });

// ---- config.indexnow ---------------------------------------------------------------------------

/** IndexNow の更新通知の設定（config/indexnow.json）。npm ci をしない indexnow-submit.yml が読む */
export const ConfigIndexnow = z
  .object({
    schemaVersion: z.literal(1),
    _comment: note,
    key: z.string().regex(/^[0-9a-f]{32}$/, '16 進 32 桁').describe('公開必須の識別子（秘密ではない）。public/<key>.txt と一致させる'),
    endpoint: z.url(),
    windowDays: posInt.describe('何日前までの更新を通知するか'),
  })
  .strict()
  .meta({ title: 'IndexNow の設定' });

// ---- config.google-console-automation ----------------------------------------------------------

const ISSUE_LABEL_IDS = [
  'crawledNotIndexed',
  'redirect',
  'notFound',
  'alternateCanonical',
  'forbidden',
  'discoveredNotIndexed',
  'noindex',
  'blockedByRobots',
];

/** GSC・GA4 の画面取得の設定（config/google-console-automation.json） */
export const ConfigGoogleConsoleAutomation = z
  .object({
    schemaVersion: z.literal(1),
    gsc: z
      .object({
        baseUrl: z.url(),
        scopes: z.object({ allKnownPages: nonEmptyStrings, allSubmittedPages: nonEmptyStrings }).strict().describe('範囲 id → 画面のラベル候補'),
        scopeParams: z.object({ allKnownPages: z.string(), allSubmittedPages: z.string() }).strict().describe('範囲 id → URL に足すクエリ'),
        issueLabels: z.object(Object.fromEntries(ISSUE_LABEL_IDS.map((k) => [k, nonEmptyStrings]))).strict().describe('インデックス除外の理由 id → 画面のラベル候補（日英）'),
        exportButtonLabels: nonEmptyStrings,
        csvMenuLabels: nonEmptyStrings,
        sampleUrlCap: posInt,
      })
      .strict(),
    ga4: z
      .object({
        propertyId: z.string().regex(/^\d+$/),
        baseUrl: z.url(),
        windowDays: posInt,
        timezone: text,
        reports: z.object({ trafficAcquisition: nonEmptyStrings, landingPage: nonEmptyStrings, events: nonEmptyStrings }).strict().describe('レポート id → 画面のラベル候補'),
      })
      .strict(),
    browser: browserConfig,
  })
  .strict()
  .meta({ title: 'GSC・GA4 画面取得の設定' });

// ---- config.ga4-admin-desired-state ------------------------------------------------------------

/** GA4 管理画面の望ましい状態（config/ga4-admin-desired-state.json） */
export const ConfigGa4AdminDesiredState = z
  .object({
    $schema: z.string().regex(/^internal:\/\//),
    $note: note,
    schemaVersion: z.literal(1),
    propertyId: z.string().regex(/^\d+$/),
    customDimensions: z
      .array(
        z
          .object({
            displayName: text,
            parameterName: z.string().regex(/^[a-z][a-z0-9_]*$/).describe('照合キー（GA4 のイベントパラメータ名）'),
            scope: z.enum(['EVENT', 'USER', 'ITEM']),
            description: text,
            requiredBy: nonEmptyStrings.describe('これを必要とする取得コマンド・ワークフロー'),
            blocking: z.boolean().describe('欠けたら取得を止めるか'),
            $observed: note,
          })
          .strict(),
      )
      .superRefine(uniqueBy('parameterName', 'parameterName')),
    keyEvents: z
      .array(z.object({ eventName: z.string().regex(/^[a-z][a-z0-9_]*$/), why: text }).strict())
      .superRefine(uniqueBy('eventName', 'eventName')),
    dataRetention: z
      .object({
        $note: note,
        eventDataRetentionMonths: z.union([z.literal(2), z.literal(14)]).describe('GA4 が選べるのは 2 か 14'),
        resetOnNewActivity: z.boolean(),
        autoFix: z.boolean(),
        $observed: note,
      })
      .strict(),
    unwantedReferrals: z.object({ $note: note, autoFix: z.boolean(), domains: z.array(z.string().regex(/^[a-z0-9.-]+$/i, 'ドメイン名')) }).strict(),
  })
  .strict()
  .meta({ title: 'GA4 管理画面の望ましい状態' });

// ---- config.psi-config -------------------------------------------------------------------------

const cruxCategory = z.enum(['FAST', 'AVERAGE', 'SLOW']);

/** PSI 定期計測の判定の設定（config/psi-config.json）。キーは読み手（psi-threshold-check）に合わせた snake_case */
export const ConfigPsi = z
  .object({
    schemaVersion: z.literal(1),
    description: note,
    judgment: z
      .object({
        doc: note,
        primary_source: z.enum(['field', 'lab']).describe('対応要否の判定に使う値。field＝CrUX 実ユーザー p75'),
        note: note,
        min_field_coverage: z.number().int().min(0).describe('field を持つ result の最小件数。未満なら違反をレポートする'),
        field_missing_policy: z.enum(['report_only', 'gate']).describe('field が欠けたとき。report_only＝警告だけ・gate＝CI ゲート'),
        _min_field_coverage_note: note,
        field_missing_reporting_rule: note,
        url_list_review_2026_09_25: note,
      })
      .strict(),
    thresholds: z
      .object({
        performance_score_min: z.number().min(0).max(100),
        accessibility_score_min: z.number().min(0).max(100),
        best_practices_score_min: z.number().min(0).max(100),
        seo_score_min: z.number().min(0).max(100),
        LCP_ms_max: z.number().positive(),
        CLS_max: z.number().positive(),
        INP_ms_max: z.number().positive(),
        FCP_ms_max: z.number().positive(),
        TTFB_ms_max: z.number().positive(),
        TBT_ms_max: z.number().positive(),
        _scope: note,
      })
      .strict()
      .describe('lab 値の目標線。超過は改善余地であって障害ではない'),
    field_thresholds: z
      .object({
        _scope: note,
        LCP_category_min: cruxCategory,
        INP_category_min: cruxCategory,
        CLS_category_min: cruxCategory,
      })
      .strict()
      .describe('実ユーザー(CrUX)の閾値。ここを下回ったときだけ Critical に上げる'),
  })
  .strict()
  .meta({ title: 'PSI 定期計測の設定' });

// ---- config.utm-templates ----------------------------------------------------------------------

const utmChannel = z.object({ source: text, medium: text, content: z.string().describe('配信形式。空文字＝呼び出し側が渡す') }).strict();
const utmSurface = z.object({ source: text, medium: text, campaign: text.optional() }).strict();

/** UTM の付け方（config/utm-templates.json）。リンクを作る側・検査する側が同じ契約から引く */
export const ConfigUtmTemplates = z
  .object({
    schemaVersion: z.literal(1),
    _source: note,
    _decided: note,
    channels: z.record(z.string().regex(/^[a-z0-9]+\.[a-z0-9]+$/, '<チャネル>.<形式>'), utmChannel).describe('SNS・note からサイトへの契約。source の集合が GA4 の SNS 流入の集合になる'),
    _siteToNote_note: note,
    siteToNote: z.record(z.string(), utmSurface).describe('サイトから note へ送る面ごとの UTM'),
    _ebook_note: note,
    ebook: z.record(z.string(), z.object({ source: text, medium: text }).strict()).describe('電子書籍からサイトへ送る UTM'),
  })
  .strict()
  .meta({ title: 'UTM の付け方' });

// ---- config.cloudflare -------------------------------------------------------------------------

/** Cloudflare の解析とゾーン設定監視の設定（config/cloudflare.json）。API トークンなどの秘匿値は置かない */
export const ConfigCloudflare = z
  .object({
    schemaVersion: z.literal(1),
    _doc: note,
    zoneName: z.string().regex(/^[a-z0-9.-]+$/i, 'ドメイン名'),
    graphql: z.url(),
    rest: z.url(),
    rulesetPhases: nonEmptyStrings.refine((a) => new Set(a).size === a.length, '重複がある').describe('監視するルールセットのフェーズ'),
  })
  .strict()
  .meta({ title: 'Cloudflare の監視設定' });

// ---- config.workflow-health --------------------------------------------------------------------

const healthLimits = {
  maxAgeDays: posInt.describe('最後に success してから何日までを健全とするか'),
  maxConsecutiveFailures: posInt.describe('何連続 failure で不健全とするか（その数に達したら違反）'),
};

/** 重要なワークフローの健全性の閾値（config/workflow-health.json）。npm ci をしないワークフローが読む */
export const ConfigWorkflowHealth = z
  .object({
    schemaVersion: z.literal(1),
    _doc: note,
    _why: note,
    defaults: z.object(healthLimits).strict(),
    workflows: z
      .array(
        z
          .object({
            workflow: z.string().regex(/^[\w.-]+\.ya?ml$/, 'ワークフローのファイル名'),
            branch: text.optional().describe('見るブランチ。省略＝既定ブランチ'),
            ...healthLimits,
            schedule: z
              .object({
                activeSince: utcTime('cron の最初の発火枠'),
                maxAgeDays: posInt.describe('event=schedule の run だけで見る鮮度（日）'),
                graceHours: posInt.describe('GitHub の schedule 登録・初回発火の遅延バッファ（時間）'),
                _why: note,
              })
              .strict()
              .optional()
              .describe('手動成功が cron の沈黙を隠さないよう、event=schedule の run だけで見る設定'),
            _note: note,
          })
          .strict(),
      )
      .min(1)
      .superRefine(uniqueBy((w) => `${w.workflow}@${w.branch ?? ''}`, 'ワークフロー@ブランチ')),
  })
  .strict()
  .meta({ title: 'ワークフロー健全性の閾値' });

// ---- アセット置き場（asset-storage・drive-vault・git-binary-policy）---------------------------
// 中身の整合（audience と bucket の組・keyFrom の語彙・group 間の重なり・監査の対象）は
// scripts/lib/asset-storage.mjs・drive-vault.mjs・check-drive-vault・check-git-binary-policy が持つ。型は形だけ。

const pathRegexMatch = z.object({ pathRegex: regexText.describe('対象ファイルのリポジトリ相対パスに当てる正規表現') }).strict();
const generatorField = z.string().nullable().describe('再生成するコマンド。再生成できないものは null');

/** R2 に置くアセットの置き場（config/asset-storage.json） */
export const ConfigAssetStorage = z
  .object({
    schemaVersion: z.literal(1),
    description: note,
    invariants: nonEmptyStrings,
    bucketRouting: note,
    buckets: z
      .object({
        public: z.object({ name: text, publicHost: text, note }).strict().describe('カスタムドメインを付けた公開 CDN'),
        private: z.object({ name: text, publicHost: z.null().describe('private バケットにドメインを付けない'), note }).strict(),
      })
      .strict(),
    cache: z
      .object({
        dir: text,
        maxBytes: posInt,
        maxRestoreMiB: posInt,
        retainDownloadedCopies: z.boolean(),
        note,
      })
      .strict(),
    groups: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-z][a-z0-9-]*$/),
            audience: z.enum(['site', 'ci', 'human']).describe('誰が使うか。site→public・ci→private か byVisibility・human は audienceException が要る'),
            audienceException: text.optional().describe('human を R2 に置く理由'),
            match: pathRegexMatch,
            bucket: z.enum(['public', 'private', 'byVisibility']),
            keyPrefix: text,
            keyFrom: text.describe('R2 のキーの作り方（repoRelative・stripPrefix:<接頭辞> など。語彙は asset-storage.mjs が検査する）'),
            visibilityFrom: text.describe('公開か非公開かの判定（fixed:public など）'),
            regenerable: z.boolean(),
            generator: generatorField,
            requiredBy: strings,
            reason: text,
            phase: text,
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .meta({ title: 'R2 アセットの置き場' });

/** Google Drive vault に置くアセットの置き場（config/drive-vault.json） */
export const ConfigDriveVault = z
  .object({
    schemaVersion: z.literal(1),
    description: note,
    invariants: nonEmptyStrings,
    vaultRoot: z
      .object({
        env: text.describe('vault の場所を指す環境変数（最優先）'),
        marker: text.describe('vault の目印のファイル名。実在する候補だけ採用する'),
        candidates: z
          .array(
            z
              .object({
                platform: z.enum(['darwin', 'win32', 'linux']),
                glob: text.optional(),
                path: text.optional(),
              })
              .strict()
              .refine((c) => Boolean(c.glob) !== Boolean(c.path), 'glob か path のどちらか 1 つだけ'),
          )
          .min(1),
        note,
      })
      .strict(),
    cloud: z.object({ rcloneRemote: text, remoteRoot: text, note }).strict(),
    dedupeScan: strings,
    layout: z.record(z.string(), text).describe('vault 直下のフォルダ → 置くものの説明'),
    groups: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-z][a-z0-9-]*$/),
            status: z.enum(['pending', 'active']),
            audience: z.literal('human'),
            match: pathRegexMatch,
            vaultDir: text,
            keyFrom: text.describe('vault 内のキーの作り方（repoRelative・stripPrefix:<接頭辞>・standards-beside-pdf など。語彙は drive-vault.mjs が検査する）'),
            regenerable: z.boolean(),
            generator: generatorField,
            requiredBy: strings,
            reason: text,
            coexistWithGit: z.boolean().optional().describe('Git にも追跡を残すか'),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .meta({ title: 'Drive vault のアセットの置き場' });

const magicHex = z.string().regex(/^([0-9A-Fa-f]{2})+$/, '16 進のバイト列');
const mib = z.number().positive();

/** Git に追跡してよいファイルの決まり（config/git-binary-policy.json） */
export const ConfigGitBinaryPolicy = z
  .object({
    schemaVersion: z.literal(1),
    description: note,
    philosophy: nonEmptyStrings,
    denyRules: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-z][a-z0-9-]*$/),
            reason: text,
            correctPlace: text,
            match: z
              .object({
                ext: nonEmptyStrings.optional().describe('拡張子（ドットなし）'),
                pathPrefix: nonEmptyStrings.optional(),
                excludeBasename: nonEmptyStrings.optional(),
              })
              .strict(),
            contentPattern: regexText.optional().describe('中身に当てる正規表現'),
            minBytesToScan: posInt.optional(),
          })
          .strict(),
      )
      .superRefine(uniqueBy('id', '拒否ルールの id')),
    sizeLimits: dictWithNotes(mib, 'sizeLimits').describe('拡張子 → 1 blob あたりの上限（MiB）。default は他の拡張子'),
    budgets: dictWithNotes(mib, 'budgets').describe('ディレクトリ → 追跡総量の上限（MiB）'),
    derivedPairRules: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-z][a-z0-9-]*$/),
            reason: text,
            primaryExt: text,
            derivedExt: text,
            onlyWhenDerivedMatches: text.describe('派生側がこの拒否ルールに当たるときだけ対にして止める'),
          })
          .strict(),
      )
      .superRefine(uniqueBy('id', '対ルールの id')),
    magicBytes: dictWithNotes(z.array(magicHex).min(1), 'magicBytes').describe('拡張子 → 先頭バイト列の候補（16 進）'),
    allowlist: z
      .array(
        z
          .object({
            path: text.describe('許す場所（接頭辞またはファイル）'),
            reason: text.describe('許す理由（理由の無い許可は肥大化の入口）'),
            appliesTo: nonEmptyStrings.describe('許す検査（size・magic・拒否ルールの id）'),
          })
          .strict(),
      )
      .superRefine(uniqueBy('path', '許可の path')),
  })
  .strict()
  .meta({ title: 'Git 追跡の決まり' });

// ---- 手元 PC の設定（disk-hygiene・local-resources）------------------------------------------

const platformPaths = z.partialRecord(z.enum(['darwin', 'win32', 'linux']), text);
const bytes = z.number().int().min(0);

/** 手元のディスク肥大を止める閾値（config/disk-hygiene.json） */
export const ConfigDiskHygiene = z
  .object({
    schemaVersion: z.literal(1),
    description: note,
    philosophy: nonEmptyStrings,
    thresholds: z
      .object({
        freeWarnBytes: bytes.describe('空き容量がこれ未満で注意（バイト）'),
        freeFailBytes: bytes.describe('空き容量がこれ未満で失敗（バイト）'),
        workflowTranscriptMaxAgeDays: posInt,
        npxMaxAgeDays: posInt,
        npmCacheMaxBytes: bytes,
        sparkleMaxAgeDays: posInt,
        worktreeIdleHours: posInt,
        automationMaxAgeDays: posInt,
        claudeCleanupMaxDays: posInt,
        codexBrowserCacheMaxBytes: bytes,
      })
      .strict()
      .superRefine((t, ctx) => {
        if (t.freeFailBytes > t.freeWarnBytes) flag(ctx, ['freeFailBytes'], 'freeFailBytes は freeWarnBytes 以下（失敗のほうが厳しい）');
      }),
    allowedWorktreeRoots: nonEmptyStrings,
    baseRefs: nonEmptyStrings,
    sparkleRoot: text,
    codexBrowserCacheRoot: platformPaths,
    claudeProjectsRoot: text,
    claudeSettingsPath: text,
    stampPath: platformPaths.describe('掃除が最後に成功した印のファイル（OS ごと）'),
    reportOnly: z
      .array(z.object({ path: text, note: text, warnBytes: bytes.optional() }).strict())
      .describe('容量を報告するだけで消さない場所'),
  })
  .strict()
  .meta({ title: 'ディスク肥大の閾値' });

const cleanupTarget = z
  .object({
    roots: nonEmptyStrings.optional().describe('掃除の対象（リポジトリ相対）'),
    minAgeDays: posInt.describe('この日数より古いものだけ消す'),
    names: nonEmptyStrings.optional().describe('対象にするフォルダ名'),
  })
  .strict();

/** 手元 PC の空き容量・メモリの閾値（config/local-resources.json） */
export const ConfigLocalResources = z
  .object({
    schemaVersion: z.literal(1),
    minFreeDiskGiB: nonNeg,
    minFreeMemoryGiB: nonNeg,
    historyLimit: posInt,
    scanTimeoutMs: posInt,
    growthWarnGiB: nonNeg,
    roots: nonEmptyStrings.describe('容量を測る場所（リポジトリ相対）'),
    budgetsGiB: z.record(z.string(), mib).describe('場所 → 容量の上限（GiB）'),
    cleanup: z.record(z.string(), cleanupTarget).describe('掃除の区分 → 対象と古さ'),
    cloudSampleCount: posInt,
    cloudSampleMaxBytes: posInt,
  })
  .strict()
  .meta({ title: '手元 PC の資源の閾値' });
