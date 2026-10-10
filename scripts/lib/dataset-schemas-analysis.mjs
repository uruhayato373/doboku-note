/**
 * dataset-schemas-analysis.mjs — 分析の出力・調査の根拠・過去問の台帳 の型（zod）。dataset-schemas.mjs が export * で束ね、台帳（datasets.mjs）の schema が名前で引く。
 * 型を足す約束は dataset-schemas.mjs の先頭。部品は dataset-schema-parts.mjs。
 */
import { z } from 'zod';
import {
  jstDate, utcTime, offsetTime, month, count, flag, isMonday, uniqueBy, sumEquals, sha256,
} from './dataset-schema-parts.mjs';

// ---- 共通の小さな部品 ---------------------------------------------------------------------

const num = (what) => z.number().min(0).describe(what);
const shiftDate = (date, days) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
/** 月曜の日付が属する ISO 週（YYYY-Www） */
const isoWeekOfMonday = (monday) => {
  const thursday = new Date(Date.parse(`${monday}T00:00:00Z`) + 3 * 86_400_000);
  const year = thursday.getUTCFullYear();
  const week = Math.floor((thursday - Date.UTC(year, 0, 1)) / (7 * 86_400_000)) + 1;
  return `${year}-W${String(week).padStart(2, '0')}`;
};
const weekKey = z.string().regex(/^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/, 'YYYY-Www').describe('ISO 週（月〜日・JST）');
const dateRange = (what) => z.object({ startDate: jstDate('開始日'), endDate: jstDate('終了日') }).strict().describe(what);
const growthBaseline = z.object({ startDate: jstDate('開始日'), endDate: jstDate('終了日'), days: count('日数') }).strict().describe('基線の期間（週の直前の 28 日）');
const windowStartEnd = (what) => z.object({ start: jstDate('開始日'), end: jstDate('終了日') }).strict().describe(what);

/** 成長パック・ダイジェスト共通: 週は月〜日で、基線は週の直前。週の名前は月曜の日付から決まる */
function checkGrowthWindow(file, ctx) {
  const { week, period, baseline } = file;
  if (!isMonday(period.startDate)) flag(ctx, ['period', 'startDate'], `${period.startDate} は月曜でない`);
  else if (isoWeekOfMonday(period.startDate) !== week) flag(ctx, ['week'], `week ${week} が期間の開始日 ${period.startDate} の ISO 週 ${isoWeekOfMonday(period.startDate)} と合わない`);
  if (period.endDate !== shiftDate(period.startDate, 6)) flag(ctx, ['period', 'endDate'], `終了日 ${period.endDate} が開始日の 6 日後でない`);
  if (baseline.endDate !== shiftDate(period.startDate, -1)) flag(ctx, ['baseline', 'endDate'], `基線の終了日 ${baseline.endDate} が週の開始日の前日でない`);
  if (baseline.startDate !== shiftDate(baseline.endDate, -(baseline.days - 1))) flag(ctx, ['baseline', 'days'], `days ${baseline.days} が基線の開始〜終了日の日数と合わない`);
}

// ---- 成長パック（analysis.growth-pack・scripts/fetch-growth-pack.mjs が書く） ---------------

const GA4_METRICS = z.object({
  sessions: num('セッション'),
  engagedSessions: num('エンゲージメントのあったセッション'),
  activeUsers: num('アクティブユーザー（重複排除値）'),
  keyEvents: num('キーイベント'),
}).strict();
const GA4_EVENT_METRICS = z.object({ count: num('イベント数'), users: num('ユーザー数') }).strict();
const GSC_ROW = {
  page: z.string().min(1).describe('ページのパス（ドメイン・クエリ・末尾スラッシュを落とした形）'),
  clicks: num('クリック'),
  impressions: num('表示回数'),
  position: num('平均掲載順位（小数 1 桁）'),
};
const GscPageRow = z.object(GSC_ROW).strict();
const GscPageQueryRow = z.object({ ...GSC_ROW, query: z.string().describe('検索クエリ') }).strict();
const failedSection = z.object({ ok: z.literal(false), error: z.string().describe('取得失敗の理由（300 字まで）') }).strict();
const ga4Section = (rowSchema, what) =>
  z.discriminatedUnion('ok', [
    z.object({
      ok: z.literal(true),
      rowCount: count('API が返した行数（畳む前）'),
      truncated: z.boolean().describe('打ち切られたか'),
      limited: z.boolean().describe('GA4 の thresholding / sampling がかかったか（値は下限）'),
      rows: z.array(rowSchema),
    }).strict(),
    failedSection,
  ]).describe(what);
const gscSection = (rowSchema, what) =>
  z.discriminatedUnion('ok', [
    z.object({
      ok: z.literal(true),
      startDate: jstDate('開始日（太平洋時間で取得）'),
      endDate: jstDate('終了日（太平洋時間で取得）'),
      rowCount: count('GSC が返した行数'),
      truncated: z.boolean().describe('打ち切られたか'),
      rows: z.array(rowSchema),
    }).strict(),
    failedSection,
  ]).describe(what);

/** 週次の成長パック（data/analysis/growth/pack-{週}.json）。GA4 と GSC を同じ週と直前 28 日の基線で揃えた材料 */
export const GrowthPack = z
  .object({
    schemaVersion: z.literal(1),
    week: weekKey,
    period: dateRange('対象の週（月〜日・JST）'),
    baseline: growthBaseline,
    generatedAt: utcTime('生成時刻'),
    filters: z.object({ ga4: z.string(), gsc: z.string() }).strict().describe('取得の絞り込み条件（日本・参照スパム除外など）'),
    sections: z
      .object({
        ga4Landing: ga4Section(
          z.object({ page: z.string().min(1), group: z.string().min(1).describe('流入元グループ（google・bing・yahoo・organic-other・チャネル名）'), week: GA4_METRICS, base: GA4_METRICS }).strict(),
          'GA4 のランディングページ × 流入元（週と基線）',
        ),
        ga4Events: ga4Section(
          z.object({ page: z.string().min(1), event: z.string().min(1).describe('イベント名'), week: GA4_EVENT_METRICS, base: GA4_EVENT_METRICS }).strict(),
          'GA4 のページ × イベント（週と基線）',
        ),
        gscPageWeek: gscSection(GscPageRow, 'GSC のページ別（週）'),
        gscPageBase: gscSection(GscPageRow, 'GSC のページ別（基線）'),
        gscPageQueryWeek: gscSection(GscPageQueryRow, 'GSC のページ × クエリ（週）'),
        gscPageQueryBase: gscSection(GscPageQueryRow, 'GSC のページ × クエリ（基線）'),
      })
      .strict()
      .describe('取得した区画。取れなかった区画は ok:false と error（全滅のときはファイルを書かない）'),
  })
  .strict()
  .superRefine((pack, ctx) => {
    checkGrowthWindow(pack, ctx);
    const { sections: s } = pack;
    for (const [name, which] of [['gscPageWeek', pack.period], ['gscPageQueryWeek', pack.period], ['gscPageBase', pack.baseline], ['gscPageQueryBase', pack.baseline]]) {
      const sec = s[name];
      if (sec.ok && (sec.startDate !== which.startDate || sec.endDate !== which.endDate)) flag(ctx, ['sections', name, 'startDate'], `${name} の期間 ${sec.startDate}〜${sec.endDate} が ${which === pack.period ? 'period' : 'baseline'} と合わない`);
    }
    if (s.ga4Landing.ok) uniqueBy((r) => `${r.page}\u0000${r.group}`, 'ページ×流入元')(s.ga4Landing.rows, { addIssue: (i) => ctx.addIssue({ ...i, path: ['sections', 'ga4Landing', 'rows', ...i.path] }) });
    if (s.ga4Events.ok) uniqueBy((r) => `${r.page}\u0000${r.event}`, 'ページ×イベント')(s.ga4Events.rows, { addIssue: (i) => ctx.addIssue({ ...i, path: ['sections', 'ga4Events', 'rows', ...i.path] }) });
  })
  .meta({ title: '成長パック（週次の材料）' });

// ---- 成長ダイジェスト（analysis.growth-digest・scripts/build-growth-digest.mjs が書く） -----

const DELTA_PCT = z.number().nullable().describe('基線の週平均との差（%）。基線が 0 のとき null');
const KPI_GA4 = z.object({
  sessions: num('今週のセッション'),
  baseWeeklySessions: num('基線の週平均セッション'),
  deltaPct: DELTA_PCT,
  engagementRatePct: z.number().nullable().describe('エンゲージ率（%）。セッション 0 のとき null'),
  keyEvents: num('今週のキーイベント'),
  baseWeeklyKeyEvents: num('基線の週平均キーイベント'),
}).strict();
const KPI_GSC = z.object({
  clicks: num('今週のクリック'),
  baseWeeklyClicks: num('基線の週平均クリック'),
  deltaPct: DELTA_PCT,
  impressions: num('今週の表示回数'),
  baseWeeklyImpressions: num('基線の週平均表示回数'),
  ctrPct: z.number().nullable().describe('CTR（%）。表示 0 のとき null'),
}).strict();
const KPI_CTA = z.object({ week: num('今週の件数'), baseWeekly: num('基線の週平均'), deltaPct: DELTA_PCT }).strict();
const OPP_CATEGORIES = ['measurement', 'experiment', 'seo', 'revenue'];
const OppItem = z.looseObject({
  id: z.string().regex(/^OPP-[0-9a-f]{10}$/, 'OPP- + 16 進 10 桁').describe('機会の安定 ID（同じ機会は毎週同じ）'),
  category: z.enum(OPP_CATEGORIES).describe('区分'),
  type: z.string().min(1).describe('機会の種類。先頭は区分と同じ（seo-・revenue-・measurement-・experiment-）'),
  key: z.looseObject({}).describe('機会の主キー（page・query・subject・experiment など）'),
  title: z.string().min(1),
  metrics: z.looseObject({}).describe('根拠の数値'),
  expectedWeeklyGain: z.object({ value: z.number(), unit: z.enum(['searchClicks', 'ctaClicks', 'quizCompletions']) }).strict().nullable().describe('期待効果（週あたり）。計測・実験は null'),
  suggest: z.array(z.enum(['watchword', 'backlog', 'experiment', 'verdict', 'defer'])).describe('推奨の処分'),
  watchwordDraft: z.looseObject({ keyword: z.string(), targetPath: z.string() }).nullable().describe('監視語の下書き。SEO で改善できるときだけ'),
});

/** 週次の成長ダイジェスト（data/analysis/growth/digest-{週}.json）。週次レビューでトリアージする改善機会 */
export const GrowthDigest = z
  .object({
    schemaVersion: z.literal(1),
    week: weekKey,
    period: dateRange('対象の週（月〜日・JST）'),
    baseline: growthBaseline,
    generatedAt: utcTime('生成時刻'),
    pack: z.string().min(1).describe('元にした成長パックのパス'),
    inputs: z
      .array(
        z.object({
          name: z.enum(['growth-pack', 'monetization-coverage', 'bing-webmaster']),
          file: z.string().nullable().describe('入力ファイル。未取得は null'),
          coverage: z.enum(['complete', 'missing']).describe('missing は未取得か古い（計測の機会として表に出る）'),
          note: z.string().nullable().describe('欠測の理由。complete は null'),
        }).strict(),
      )
      .describe('入力の取得状況'),
    kpis: z
      .object({
        ga4: z.record(z.string(), KPI_GA4).nullable().describe('流入元グループ別。GA4 が取れなかったら null'),
        gsc: KPI_GSC.nullable().describe('GSC の週と基線。取れなかったら null'),
        cta: z.record(z.string(), KPI_CTA).nullable().describe('イベント別。取れなかったら null'),
      })
      .strict(),
    bingReconciliation: z
      .object({
        ga4Sessions: z.number().nullable().describe('GA4 の bing 自然検索セッション（週）'),
        wmtClicks: z.number().nullable().describe('Bing Webmaster のクリック（週）。未取得は null'),
        days: count('Bing の日次が揃っていた日数').optional(),
        ratio: z.number().nullable().describe('GA4 セッション ÷ Bing クリック'),
        note: z.string().nullable(),
      })
      .strict(),
    topMovers: z
      .object({
        gainers: z.array(z.object({ page: z.string(), week: num('今週'), baseWeekly: num('基線の週平均'), delta: z.number() }).strict()),
        losers: z.array(z.object({ page: z.string(), week: num('今週'), baseWeekly: num('基線の週平均'), delta: z.number() }).strict()),
      })
      .strict()
      .nullable()
      .describe('google 流入の上位変動ページ。GA4 が取れなかったら null'),
    candidates: count('抽出した機会の件数'),
    suppressed: count('処分の記録で抑止した件数'),
    notSurfaced: z.object({ seo: count('SEO の見送り'), revenue: count('収益導線の見送り') }).strict().describe('表示上限で見送った件数'),
    surfaced: z.array(OppItem).describe('表示する機会（トリアージ対象）'),
  })
  .strict()
  .superRefine((d, ctx) => {
    checkGrowthWindow(d, ctx);
    if (!d.pack.endsWith(`pack-${d.week}.json`)) flag(ctx, ['pack'], `pack ${d.pack} が week ${d.week} のパックでない`);
    uniqueBy('id', '機会 ID')(d.surfaced, { addIssue: (i) => ctx.addIssue({ ...i, path: ['surfaced', ...i.path] }) });
    d.surfaced.forEach((s, i) => {
      if (!s.type.startsWith(`${s.category}-`)) flag(ctx, ['surfaced', i, 'type'], `type ${s.type} が区分 ${s.category} の接頭辞で始まらない`);
    });
    const accounted = d.surfaced.length + d.suppressed + d.notSurfaced.seo + d.notSurfaced.revenue;
    if (accounted > d.candidates) flag(ctx, ['candidates'], `表示 ${d.surfaced.length}＋抑止 ${d.suppressed}＋見送り ${d.notSurfaced.seo + d.notSurfaced.revenue} が候補 ${d.candidates} を超える`);
  })
  .meta({ title: '成長ダイジェスト（週次の改善機会）' });

// ---- 収益導線の網羅（analysis.monetization-coverage・.claude/scripts/report-monetization-coverage.mts が書く） ----

const PairWindow = windowStartEnd('GA4 の取得窓');
/** 記事・ハブごとの収益導線の網羅（data/analysis/monetization/coverage-{時刻}.json）。読むのは最新 1 本 */
export const MonetizationCoverage = z
  .object({
    schemaVersion: z.literal(1),
    meta: z
      .object({
        trafficWindow: PairWindow.describe('流入（ページ別）の窓'),
        clickWindow: PairWindow.nullable().describe('CTA クリックの窓。クリックの入力が無ければ null'),
        labelSalesWindow: PairWindow.nullable().optional().describe('ラベル別クリックと note 販売を突き合わせた窓。入力が無ければ null。2026-10-03 より前の記録は欄なし'),
        minUsers: count('導線なしを「穴」と数める最低ユーザー数'),
        pageFile: z.string().min(1).describe('流入の入力ファイル名'),
        clickFile: z.string().nullable().describe('クリックの入力ファイル名。無ければ null'),
      })
      .strict(),
    summary: z.object({ trafficked: count('流入のあったページ数'), gaps: count('流入があり導線が無いページ数') }).strict(),
    coverage: z
      .object({
        trafficRows: count('GA4 の流入の URL 数'),
        matchedTrafficRows: count('記事・ハブに照合できた URL 数'),
        unmatchedTrafficPages: z.array(z.string()).describe('照合できなかった URL'),
      })
      .strict()
      .refine((c) => c.matchedTrafficRows + c.unmatchedTrafficPages.length === c.trafficRows, '照合できた数と照合できなかった URL の数の和が流入の URL 数と合わない')
      .optional()
      .describe('流入の URL と記事・ハブの照合の網羅（2026-10-03 より前の記録は欄なし）'),
    rows: z
      .array(
        z.object({
          slug: z.string().min(1).describe('記事の slug。非記事のハブは / か /category/…'),
          page: z.string().min(1).describe('ページのパス'),
          category: z.string().describe('資格・カテゴリ。トップは (home)'),
          docGroup: z.string().min(1).describe('記事の型（hub・pillar・guide・primary・secondary・textbook・keyword・pastExam）'),
          users: count('ユーザー（28 日）'),
          sessions: count('セッション（28 日）'),
          noteCta: z.array(z.string()).describe('note への導線（マガジン id かもくじのラベル）'),
          affiliate: z.string().nullable().describe('アフィリエイトの導線（案件名・複数は +）。無ければ null'),
          noteClicks: count('note への CTA クリック').nullable().describe('クリックの入力が無ければ null'),
          affClicks: count('アフィリエイトの CTA クリック').nullable().describe('クリックの入力が無ければ null'),
          monetized: z.boolean().describe('note かアフィリエイトの導線が 1 つでもある'),
          gap: z.boolean().describe('流入が minUsers 以上なのに導線が無い'),
          noteGap: z.boolean().describe('流入が minUsers 以上なのに note 導線が無い（アフィリエイトがあっても立つ）。note 商品の無いカテゴリ・転職記事は立たない'),
        }).strict(),
      )
      .describe('流入の多い順'),
    placementCtr: z
      .array(z.object({ placement: z.string().min(1).describe('配置'), impressions: count('表示'), clicks: count('クリック'), ctrPct: z.number().nullable().describe('CTR（%）。表示 0 は null') }).strict())
      .describe('配置別の CTA の表示とクリック'),
    noteLabelSales: z
      .array(z.object({ magazineId: z.string().min(1), utmContent: z.string().min(1), clicks: count('クリック'), salesCount: count('販売件数'), revenue: count('売上（円）') }).strict())
      .describe('マガジン id 付きクリックと販売の突合'),
    idClickCoverage: z.object({ idClicks: count('マガジン id 付きのクリック'), totalClicks: count('note CTA の全クリック'), pct: z.number().nullable().describe('id 付きの割合（%）。クリック 0 は null') }).strict(),
  })
  .strict()
  .superRefine((c, ctx) => {
    // 行はページ単位（同じ記事の旧 /docs/ の URL は別の行になるので slug は重なりうる）
    uniqueBy('page', 'ページ')(c.rows, { addIssue: (i) => ctx.addIssue({ ...i, path: ['rows', ...i.path] }) });
    const trafficked = c.rows.filter((r) => r.users > 0);
    if (trafficked.length !== c.summary.trafficked) flag(ctx, ['summary', 'trafficked'], `${c.summary.trafficked} が流入のある行 ${trafficked.length} と合わない`);
    const gaps = trafficked.filter((r) => r.gap).length;
    if (gaps !== c.summary.gaps) flag(ctx, ['summary', 'gaps'], `${c.summary.gaps} が gap の行 ${gaps} と合わない`);
    c.rows.forEach((r, i) => {
      const monetized = r.noteCta.length > 0 || r.affiliate !== null;
      if (r.monetized !== monetized) flag(ctx, ['rows', i, 'monetized'], `monetized ${r.monetized} が導線の有無 ${monetized} と合わない`);
      if (r.gap !== (r.users >= c.meta.minUsers && !monetized)) flag(ctx, ['rows', i, 'gap'], `gap ${r.gap} が流入と導線から決まる値と合わない`);
      // noteGap は公開カテゴリか・転職記事でないか（ファイルの外の条件）でも消えるので、立っているときに流入と導線が満たすことだけを見る
      if (r.noteGap && !(r.users >= c.meta.minUsers && r.noteCta.length === 0)) flag(ctx, ['rows', i, 'noteGap'], `noteGap が立っているのに流入 ${r.users}・note 導線 ${r.noteCta.length} 件で条件を満たさない`);
    });
    if (c.idClickCoverage.idClicks > c.idClickCoverage.totalClicks) flag(ctx, ['idClickCoverage', 'idClicks'], 'id 付きクリックが全クリックを超える');
  })
  .meta({ title: '収益導線の網羅' });

// ---- 演習アプリの有料化ファネル（analysis.quiz-premium-funnel・scripts/report-quiz-premium-funnel.mjs が書く） ----

const QuizFunnelMetrics = z.object({
  quizUsers: count('演習の利用者（quiz_start の totalUsers）'),
  quizCompletions: count('演習の完了数（quiz_complete のイベント数）'),
  reviewUsers: count('復習の利用者'),
  premiumViewUsers: count('有料プランの閲覧者'),
  premiumIntentUsers: count('購入意向を示した利用者'),
  premiumIntentRate: z.number().min(0).nullable().describe('購入意向 ÷ 閲覧（0〜1）。閲覧 0 のとき null'),
  emailInterestUsers: count('メール関心'),
  lineInterestUsers: count('LINE 関心'),
  noteCtaUsers: count('note への遷移'),
}).strict();
/** 演習アプリの有料化 Phase 0 の判定（data/analysis/quiz-premium-funnel.json）。未計測は 0 件でなく not_measured */
export const QuizPremiumFunnel = z
  .discriminatedUnion('measured', [
    z.object({ schemaVersion: z.literal(1), measured: z.literal(false), status: z.literal('not_measured'), source: z.null(), metrics: z.null(), gates: z.null() }).strict(),
    z.object({
      schemaVersion: z.literal(1),
      measured: z.literal(true),
      status: z.enum(['ready', 'collecting']).describe('ready は 3 つの条件が全部成立'),
      source: z.object({ startDate: jstDate('計測の開始日'), endDate: jstDate('計測の終了日'), pagePath: z.string().min(1).describe('対象ページ') }).strict(),
      metrics: QuizFunnelMetrics,
      gates: z.object({ quizUsers100: z.boolean().describe('利用者 100 人以上'), premiumIntentRate5Pct: z.boolean().describe('購入意向が閲覧の 5% 以上'), premiumIntentUsers10: z.boolean().describe('購入意向 10 人以上') }).strict(),
    }).strict(),
  ])
  .superRefine((f, ctx) => {
    if (!f.measured) return;
    const { metrics: m, gates: g } = f;
    if (g.quizUsers100 !== m.quizUsers >= 100) flag(ctx, ['gates', 'quizUsers100'], '利用者 100 人の条件が metrics と合わない');
    if (g.premiumIntentUsers10 !== m.premiumIntentUsers >= 10) flag(ctx, ['gates', 'premiumIntentUsers10'], '購入意向 10 人の条件が metrics と合わない');
    if (g.premiumIntentRate5Pct !== (m.premiumIntentRate !== null && m.premiumIntentRate >= 0.05)) flag(ctx, ['gates', 'premiumIntentRate5Pct'], '購入意向 5% の条件が metrics と合わない');
    if ((f.status === 'ready') !== Object.values(g).every(Boolean)) flag(ctx, ['status'], `status ${f.status} が 3 条件の成否と合わない`);
  })
  .meta({ title: '演習アプリの有料化ファネル' });

// ---- 転職アフィリエイトのファネル（analysis.career-funnel・.claude/scripts/report-career-funnel.mjs が書く） ----

const ImprClicks = z.object({ impressions: count('表示'), clicks: count('クリック') }).strict();
const A8Sum = z.object({ clicks: count('クリック'), conversions: count('発生'), approved: count('確定'), revenueYen: count('確定報酬（円）') }).strict();
const OptWindow = windowStartEnd('取得窓').nullable().describe('取得窓。入力が無ければ null');
/** legacy: 基準線（凍結した過去の写し）。書き手が後から足した欄（afb・extraLinkSourcesScanned・notSet）が無い古い写しも通す */
const careerFunnelShape = (legacy) => {
  const later = (schema) => (legacy ? schema.optional() : schema);
  return z
  .object({
    schemaVersion: z.literal(1),
    generatedAt: utcTime('生成時刻'),
    windows: z.object({ ga4: OptWindow, gsc: OptWindow, aligned: z.boolean().describe('GA4 と GSC の窓が一致'), usable: z.boolean().describe('両方の窓がある') }).strict(),
    inputs: z
      .object({
        ga4Label: z.string().nullable(), ga4Placement: z.string().nullable(), ga4ByPage: z.string().nullable().optional(), ga4Device: z.string().nullable(), ga4Page: z.string().nullable(),
        gscPageQuery: z.string().nullable(), a8: z.string().nullable(), afb: later(z.string().nullable()),
      })
      .strict()
      .describe('使った入力のパス。無かったものは null'),
    coverage: z
      .object({
        docMetaIndexTotal: count('doc-meta-index の記事数'), careerArticles: count('career タグの記事数'), siteMdxScanned: count('走査したサイト MDX'),
        extraLinkSourcesScanned: later(count('MDX 以外のリンク源')), gscRowsTotal: count('GSC の行数'), gscRowsMatchedCareer: count('career に一致した GSC の行'),
        ga4LabelRowsMatched: count('label に一致した GA4 の行'), ga4PlacementRowsMatched: count('placement に一致した GA4 の行'),
        careerArticlesInGa4Top: count('GA4 の上位に入った career 記事'), noteCareerArticles: count('note の career 記事'),
      })
      .strict(),
    funnel: z
      .object({
        highIntentQuery: z
          .object({
            impressions: count('高意図クエリの表示'), clicks: count('高意図クエリのクリック'),
            rows: z.array(z.object({ query: z.string(), url: z.string().nullable().optional(), impressions: count('表示'), clicks: count('クリック'), position: z.number().nullable() }).strict()).max(25).describe('表示の多い上位 25 行'),
          })
          .strict(),
        internalLinks: z.record(z.string(), count('柱への内部リンク数')).describe('柱ごとの内部リンク数'),
        affiliateCta: z
          .object({
            byPlacement: z.record(z.string(), ImprClicks).describe('配置別の表示とクリック'),
            byLabel: z.record(z.string(), ImprClicks).describe('ラベル別の表示とクリック（表示の多い順）'),
            totalImpressions: count('配置別の表示合計'),
            totalClicks: count('配置別のクリック合計'),
            ctr: z.number().nullable().describe('クリック ÷ 表示。表示 0 は null'),
            notSet: later(z.array(z.looseObject({ dim: z.enum(['label', 'placement']), param: z.string(), clicks: count('クリック'), impressions: count('表示'), registeredAt: jstDate('カスタムディメンションの作成日').nullable(), kind: z.enum(['unknown', 'wiring-gap', 'pre-registration']), cause: z.string() })).describe('(not set) の原因の切り分け')),
            byRule: z
              .array(
                z
                  .object({
                    ruleId: z.string().regex(/^PL-\d{4}$/),
                    program: z.string().min(1),
                    slot: z.string().min(1),
                    experiment: z.string().nullable(),
                    from: z.string().min(1),
                    until: z.string().nullable(),
                    ga4: z
                      .object({
                        source: z.enum(['page', 'placement']).optional().describe('page＝ページ別からルールを一意に決めた数字／placement＝面の合計（古い記録は placement）'),
                        coveredDays: count('窓のうちルールが有効だった日数'),
                        windowDays: count('窓の日数'),
                        impressions: count('このルールの表示（placement は面の合計）'),
                        clicks: count('このルールのクリック（placement は面の合計）'),
                        impressionsShared: count('閉じて開き直した前後のルールと分けられない表示（page のみ）').optional(),
                        clicksShared: count('境界の日で分けられないクリック（page のみ）').optional(),
                        ctr: z.number().nullable(),
                        sharedWith: z.array(z.string()).describe('数字を分けられないルール（placement は同じ窓・同じ面、page は *Shared の相手）'),
                      })
                      .strict(),
                    a8: z.object({ scope: z.literal('program'), months: z.array(month), conversions: count('発生'), approved: count('確定'), revenueYen: count('確定報酬（円）') }).strict(),
                  })
                  .strict(),
              )
              .superRefine(uniqueBy('ruleId', 'ルール id'))
              .optional()
              .describe('配置ルール（台帳 config.affiliate-placements）ごとの面の数字と A8（2026-10-07〜）'),
            conversions: z
              .array(
                z.strictObject({
                  clickedAt: z.string().min(1).describe('A8 のクリック日時'),
                  program: z.string().min(1),
                  status: z.string().nullable().optional(),
                  grossRevenueYen: z.number().nullable().optional(),
                  revenueYen: z.number().nullable().optional(),
                  device: z.string().nullable().optional(),
                  site: z.string().nullable().optional(),
                  page: z.string().nullable().describe('クリックしたページ（リファラが無ければ null）'),
                  pageKnown: z.boolean(),
                  candidates: z.array(z.strictObject({ ruleId: z.string(), slot: z.string() })).describe('そのページ・案件・時刻で有効だった配置ルール'),
                  ruleId: z.string().nullable().describe('候補が 1 つのときだけ決まる'),
                }),
              )
              .optional()
              .describe('A8 の成果別（1 成果 1 行）を配置ルールへ寄せたもの（attributeConversions・2026-10-07〜）'),
            byRuleWindow: z
              .strictObject({ start: jstDate('開始日'), end: jstDate('終了日'), source: z.enum(['page', 'placement']) })
              .optional()
              .describe('byRule の窓（page＝ページ別の窓・placement＝配置別の窓）'),
            unattributed: z
              .strictObject({
                impressions: count('どのルールにも当たらない表示'),
                clicks: count('どのルールにも当たらないクリック'),
                top: z.array(z.strictObject({ page: z.string(), label: z.string(), placement: z.string(), impressions: count('表示'), clicks: count('クリック') })).max(10),
              })
              .optional()
              .describe('ページ別の行のうち配置ルールに当たらないもの（撤去前の面・ラベル未登録・ページ不明）'),
            clickLog: z
              .array(
                z.strictObject({
                  date: jstDate('クリックの日'),
                  page: z.string(),
                  label: z.string(),
                  placement: z.string(),
                  program: z.string().nullable().describe('ラベルから引いた案件（catalog の ctaLabels に無ければ null）'),
                  ruleId: z.string().regex(/^PL-\d{4}$/).nullable().describe('一意に決まった配置ルール（決まらなければ null）'),
                  clicks: count('クリック'),
                }),
              )
              .optional()
              .describe('アフィリエイトのクリックを日付・ページ・広告ごとに（成果の発生日と突き合わせる）'),
          })
          .strict(),
        a8: z.object({ window: A8Sum, allTime: A8Sum, monthsInWindow: z.array(month) }).strict(),
        afb: later(z.looseObject({ counts: z.object({ pending: count('保留'), approved: count('確定'), rejected: count('否認') }).strict() }).nullable().describe('afb の成果。未取得は null')),
      })
      .strict(),
    pillars: z.record(z.string(), z.object({ articles: count('記事数'), gscImpressions: count('GSC の表示'), gscClicks: count('GSC のクリック'), inboundLinks: count('内部リンク数') }).strict()).describe('柱ごとの集計'),
    ledger: z
      .array(
        z.object({
          slug: z.string().min(1), category: z.string(), title: z.string(), published: z.boolean(),
          reviewStatus: z.string().nullable(), group: z.string().nullable(), pillar: z.string().min(1).describe('柱（当たらなければ unclassified）'),
          gscImpressions: count('GSC の表示'), gscClicks: count('GSC のクリック'), gscPosition: z.number().nullable().describe('平均掲載順位。行が無ければ null'),
          topQueries: z.array(z.object({ query: z.string(), impressions: count('表示'), clicks: count('クリック') }).strict()).max(3),
          ga4Users: count('GA4 のユーザー').nullable().describe('GA4 の上位に無ければ null（0 でなく観測範囲外）'),
          ga4Sessions: count('GA4 のセッション').nullable().describe('同上'),
          inboundLiteralLinks: count('内部リンク数'), careerAffiliateCount: count('CareerAffiliate の数'), placements: z.array(z.string()),
        }).strict(),
      )
      .describe('career 記事の台帳'),
    noteCareer: z.array(z.object({ path: z.string().min(1), utmCampaign: z.string().min(1), noteId: z.string().nullable(), noteUrl: z.string().nullable(), noteStatus: z.string().nullable(), notePricing: z.string().nullable() }).strict()).describe('note の career 記事'),
    baselineDrift: z.array(z.string()).describe('起票時の基線から外れた指標'),
    warnings: z.array(z.string()),
  })
  .strict()
  .superRefine((r, ctx) => {
    uniqueBy('slug', 'slug')(r.ledger, { addIssue: (i) => ctx.addIssue({ ...i, path: ['ledger', ...i.path] }) });
    if (r.coverage.careerArticles !== r.ledger.length) flag(ctx, ['coverage', 'careerArticles'], `${r.coverage.careerArticles} が ledger の ${r.ledger.length} と合わない`);
    if (r.coverage.noteCareerArticles !== r.noteCareer.length) flag(ctx, ['coverage', 'noteCareerArticles'], `${r.coverage.noteCareerArticles} が noteCareer の ${r.noteCareer.length} と合わない`);
    const inTop = r.ledger.filter((l) => l.ga4Users !== null).length;
    if (r.coverage.careerArticlesInGa4Top !== inTop) flag(ctx, ['coverage', 'careerArticlesInGa4Top'], `${r.coverage.careerArticlesInGa4Top} が ledger の GA4 あり ${inTop} と合わない`);
    if (r.coverage.gscRowsMatchedCareer > r.coverage.gscRowsTotal) flag(ctx, ['coverage', 'gscRowsMatchedCareer'], '一致した行が GSC の行数を超える');
    const pillarNames = Object.keys(r.pillars).sort().join(',');
    if (Object.keys(r.funnel.internalLinks).sort().join(',') !== pillarNames) flag(ctx, ['funnel', 'internalLinks'], 'internalLinks の柱が pillars と合わない');
    for (const [p, v] of Object.entries(r.pillars)) {
      const rows = r.ledger.filter((l) => l.pillar === p);
      if (rows.length !== v.articles) flag(ctx, ['pillars', p, 'articles'], `${v.articles} が ledger の ${p} の ${rows.length} と合わない`);
      if (r.funnel.internalLinks[p] !== v.inboundLinks) flag(ctx, ['funnel', 'internalLinks', p], `${r.funnel.internalLinks[p]} が pillars の inboundLinks ${v.inboundLinks} と合わない`);
    }
    const cta = r.funnel.affiliateCta;
    const sumOf = (key) => Object.values(cta.byPlacement).reduce((a, v) => a + v[key], 0);
    if (sumOf('impressions') !== cta.totalImpressions) flag(ctx, ['funnel', 'affiliateCta', 'totalImpressions'], `${cta.totalImpressions} が byPlacement の合計 ${sumOf('impressions')} と合わない`);
    if (sumOf('clicks') !== cta.totalClicks) flag(ctx, ['funnel', 'affiliateCta', 'totalClicks'], `${cta.totalClicks} が byPlacement の合計 ${sumOf('clicks')} と合わない`);
    const ctr = cta.totalImpressions ? cta.totalClicks / cta.totalImpressions : null;
    if ((ctr === null) !== (cta.ctr === null) || (ctr !== null && Math.abs(ctr - cta.ctr) > 1e-9)) flag(ctx, ['funnel', 'affiliateCta', 'ctr'], `ctr ${cta.ctr} がクリック÷表示 ${ctr} と合わない`);
  });
};
/** 転職アフィリエイトのファネル（data/analysis/career-funnel.json）。管理画面のアフィリエイト画面が配置別の表示とクリックを読む */
export const CareerFunnel = careerFunnelShape(false).meta({ title: '転職アフィリエイトのファネル' });
/** 転職アフィリエイトのファネルの基準線。同じ書き手が --freeze で凍結した写しで、型は CareerFunnel と同じ（古い写しに無い欄だけ任意） */
export const CareerFunnelBaseline = careerFunnelShape(true).meta({ title: '転職アフィリエイトのファネルの基準線' });

// ---- SEO meta の監査結果（analysis.seo-meta・check-seo-meta が書く） -----------------------

const SeoViolation = z.object({ type: z.string().min(1).describe('違反コード（seo-checks.mjs の code か fetch_error・html_missing・html_parse_error）'), severity: z.enum(['HIGH', 'MEDIUM', 'LOW']), message: z.string() }).strict();
const SeoTextField = z.object({ value: z.string(), length: count('文字数') }).strict().nullable().describe('取れなければ null');
/** SEO meta の監査結果（data/analysis/seo-meta.json）。summary と違反のある URL の行だけ。欄の名前は書き手の snake_case のまま */
export const SeoMeta = z
  .object({
    schemaVersion: z.literal(3).describe('このファイルの形の版（書き手の旧 version 欄を移した。標準出力の --json は別の形）'),
    generated_at: utcTime('生成時刻'),
    base_url: z.string().min(1).describe('検査した場所（out/ か HTTP の base URL）'),
    mode: z.enum(['out', 'http']).describe('out は静的出力・http は公開サイト'),
    summary: z
      .object({
        urls_checked: count('検査した URL 数'), doc_urls_collected: count('収集した記事 URL 数'), published_total: count('公開記事数'),
        urls_with_violations: count('違反のあった URL 数'),
        by_severity: z.object({ HIGH: count('HIGH'), MEDIUM: count('MEDIUM'), LOW: count('LOW') }).strict(),
        by_type: z.record(z.string(), count('件数')).describe('違反コード別の件数'),
        duration_ms: count('所要時間（ミリ秒）'),
      })
      .strict(),
    results_note: z.string(),
    results: z
      .array(
        z.looseObject({
          url: z.string().min(1),
          title: SeoTextField.optional(), description: SeoTextField.optional(),
          canonical: z.string().nullable().optional(), og_url: z.string().nullable().optional(), robots: z.string().nullable().optional(),
          violations: z.array(SeoViolation).min(1).describe('違反（保存するのは違反のある URL だけ）'),
        }),
      )
      .describe('違反のある URL の行だけ'),
    violations_by_type: z.record(z.string(), z.array(z.string())).describe('違反コード別の URL'),
  })
  .strict()
  .superRefine((m, ctx) => {
    if (m.summary.urls_with_violations !== m.results.length) flag(ctx, ['summary', 'urls_with_violations'], `${m.summary.urls_with_violations} が results の ${m.results.length} 行と合わない`);
    if (m.summary.urls_with_violations > m.summary.urls_checked) flag(ctx, ['summary', 'urls_with_violations'], '違反の URL 数が検査数を超える');
    const total = m.results.reduce((a, r) => a + r.violations.length, 0);
    const bySeverity = Object.values(m.summary.by_severity).reduce((a, b) => a + b, 0);
    const byType = Object.values(m.summary.by_type).reduce((a, b) => a + b, 0);
    if (bySeverity !== total) flag(ctx, ['summary', 'by_severity'], `重大度の合計 ${bySeverity} が results の違反数 ${total} と合わない`);
    if (byType !== total) flag(ctx, ['summary', 'by_type'], `種類別の合計 ${byType} が results の違反数 ${total} と合わない`);
    for (const [t, urls] of Object.entries(m.violations_by_type)) {
      if (m.summary.by_type[t] !== urls.length) flag(ctx, ['violations_by_type', t], `${urls.length} 件が summary.by_type の ${m.summary.by_type[t]} と合わない`);
    }
  })
  .meta({ title: 'SEO meta の監査結果' });

// ---- 調査の根拠（evidence・一回きり。上位の欄は型付き、中身の自由な記述は looseObject） ----

const NonEmpty = z.string().min(1);
/** 未活用のアフィリエイト案件の調査（data/analysis/affiliate-opportunities/{日付}.json・時点調査の記録で書き手はいない） */
export const AffiliateOpportunities = z
  .object({
    schemaVersion: z.literal(1),
    observedAt: offsetTime('調査時刻（JST の +09:00 で手書き）'),
    site: NonEmpty.describe('対象サイト'),
    purpose: NonEmpty.describe('調査の目的'),
    sources: z.array(z.looseObject({ path: NonEmpty, sha256 })).describe('読んだ入力（パスと SHA-256）'),
    collectionAttempts: z.array(z.looseObject({ asp: NonEmpty, status: NonEmpty })).describe('ASP のデータ収集の試行'),
    lastAvailableA8: z.looseObject({ lastRun: NonEmpty }).describe('取れた最新の A8 の成果'),
    serviceCandidates: z.array(z.looseObject({ id: NonEmpty, officialUrl: z.string().nullable() })).describe('既知のサービスの候補'),
    newDiscoveryCandidates: z.array(z.looseObject({ service: NonEmpty, officialUrl: z.string().nullable() })).describe('新しく見つけた候補'),
    measurementFindings: z.looseObject({}).describe('計測の所見'),
    decisions: z.looseObject({ applicationsSubmitted: count('提出した申請') }).describe('その時点の判断'),
    executionUpdate: z.looseObject({ dateJst: jstDate('更新日') }).describe('実行後の追記'),
  })
  .strict()
  .meta({ title: '未活用のアフィリエイト案件の調査' });

const SourceRef = z.looseObject({ path: NonEmpty, sha256, meta: z.looseObject({}) });
/** 転職アフィリエイトの競合・読者の調査（data/analysis/affiliate-research/{日付}.json・時点調査の記録で書き手はいない） */
export const AffiliateResearch = z
  .object({
    schemaVersion: z.literal(1),
    asOfJst: jstDate('調査日'),
    method: NonEmpty.describe('調査の方法'),
    sources: z.record(z.string(), SourceRef).describe('使った入力（パス・SHA-256・取得窓）'),
    limitations: z.array(NonEmpty).describe('この調査でいえないこと'),
    careerInventory: z.array(z.looseObject({ file: NonEmpty, slug: NonEmpty, canonical: NonEmpty, published: z.boolean() })).describe('career 記事の一覧'),
    noteCareerFiles: z.array(NonEmpty).describe('note の career 記事のパス'),
    matchedRows: z
      .looseObject({
        pages: z.array(z.looseObject({ slug: NonEmpty })),
        gscPages: z.array(z.looseObject({ slug: NonEmpty, clicks: count('クリック'), impressions: count('表示') })),
        gscQueries: z.array(z.looseObject({ slug: NonEmpty, clicks: count('クリック'), impressions: count('表示') })),
      })
      .describe('career 記事に一致した行'),
    affiliateEvents: z.looseObject({ labels: z.record(z.string(), ImprClicks), placements: z.record(z.string(), ImprClicks) }).describe('アフィリエイト CTA のラベル別・配置別の表示とクリック'),
    careerNeedEvents: z.array(z.unknown()),
    noteCareerCampaigns: z.array(z.looseObject({ campaign: NonEmpty })).describe('note の career 記事のキャンペーン別の流入'),
    summary: z.looseObject({
      careerArticles: count('career 記事数'), publishedInSource: count('入力で公開の記事数'), noteCareerArticles: count('note の career 記事数'),
      gscMatchedUrlRows: count('一致した GSC の URL 行'), gscImpressions: count('GSC の表示'), gscClicks: count('GSC のクリック'),
      affiliateImpressions: count('アフィリエイトの表示'), affiliateClicks: count('アフィリエイトのクリック'), a8Months: z.array(month),
    }),
  })
  .strict()
  .superRefine((r, ctx) => {
    if (r.summary.careerArticles !== r.careerInventory.length) flag(ctx, ['summary', 'careerArticles'], `${r.summary.careerArticles} が careerInventory の ${r.careerInventory.length} と合わない`);
    if (r.summary.publishedInSource !== r.careerInventory.filter((c) => c.published).length) flag(ctx, ['summary', 'publishedInSource'], 'publishedInSource が careerInventory の公開数と合わない');
    if (r.summary.noteCareerArticles !== r.noteCareerFiles.length) flag(ctx, ['summary', 'noteCareerArticles'], `${r.summary.noteCareerArticles} が noteCareerFiles の ${r.noteCareerFiles.length} と合わない`);
    if (r.summary.gscMatchedUrlRows !== r.matchedRows.gscPages.length) flag(ctx, ['summary', 'gscMatchedUrlRows'], `${r.summary.gscMatchedUrlRows} が matchedRows.gscPages の ${r.matchedRows.gscPages.length} と合わない`);
  })
  .meta({ title: '転職アフィリエイトの競合・読者の調査' });

const CivilServiceTotals = z.object({ applicants: count('申込者'), examinees: count('受験者'), finalPass: count('最終合格者'), planned: count('採用予定') }).strict();
const CivilServiceRow = z
  .object({
    year: z.number().int().min(2000).max(2100).describe('採用試験の年度（西暦）'),
    category: NonEmpty.describe('区分'),
    track: NonEmpty.describe('枠・試験方式'),
    applicants: count('申込者').nullable().describe('未公表は null'),
    examinees: count('受験者').nullable().describe('未公表は null'),
    firstPass: count('第一次合格者').nullable().describe('未公表は null'),
    finalPass: count('最終合格者').nullable().describe('未公表は null'),
    planned: count('採用予定数').nullable().describe('未公表は null'),
    ratio: z.number().min(0).nullable().describe('倍率'),
    source: NonEmpty.describe('出典の URL'),
    official: z.boolean().describe('公式の発表か（false は民間サイトの転載）'),
    note: z.string().optional(),
  })
  .strict();
/** 公務員土木職の受験者数（data/analysis/civil-service-applicants.json・一回きりの調査で書き手はいない） */
export const CivilServiceApplicants = z
  .object({
    schemaVersion: z.literal(1),
    checkedAt: jstDate('確認日'),
    scope: NonEmpty.describe('調査の範囲'),
    aggregationRule: NonEmpty.describe('summary の数え方'),
    decision: NonEmpty.describe('この調査から決めたことの記録先'),
    summary: z.record(z.string().regex(/^\d{4}$/, '西暦'), CivilServiceTotals).describe('年度別の合計（集計の規則は aggregationRule）'),
    prefectures: z
      .record(
        z.string().min(1),
        z.object({ name: NonEmpty.describe('都道府県名'), rows: z.array(CivilServiceRow).min(1), unverified: z.array(NonEmpty).describe('確かめられなかった事項') }).strict(),
      )
      .describe('都道府県別（キーはローマ字）'),
  })
  .strict()
  .superRefine((c, ctx) => {
    const n = Object.keys(c.prefectures).length;
    if (n !== 47) flag(ctx, ['prefectures'], `都道府県が ${n} 件（47 件のはず）`);
    for (const [id, p] of Object.entries(c.prefectures)) {
      uniqueBy((r) => `${r.year}|${r.category}|${r.track}`, '年度・区分・枠')(p.rows, { addIssue: (i) => ctx.addIssue({ ...i, path: ['prefectures', id, 'rows', ...i.path] }) });
    }
  })
  .meta({ title: '公務員土木職の受験者数' });

// ---- 過去問の在庫（pastexams.inventory・人が書き足す台帳。past-exam-fetch が acquiredAt を書く） ----

const InventoryFile = z
  .object({
    kind: z.enum(['question', 'answer']).describe('公式の問題か正答・解答例（第三者の解説は入れない）'),
    section: NonEmpty.describe('科目・区分'),
    file: z.string().regex(/\.pdf$/, '.pdf').describe('資格のディレクトリからの相対パス（.pdf）'),
    sourceUrl: z.string().regex(/^https:\/\//, 'https').nullable().describe('取得元の公式 URL。無ければ null'),
    acquiredAt: jstDate('手元に取得した日').nullable().optional().describe('手元に取得した日（JST）。未取得は null か欄なし（past-exam-fetch が取得したとき書く）'),
    note: z.string().optional(),
    sha256: sha256.optional().describe('固定した原典の検証値（pages と対）'),
    pages: z.number().int().min(1).optional().describe('固定した原典のページ数（sha256 と対）'),
  })
  .strict();
const InventoryTheme = z
  .object({
    section: NonEmpty.describe('科目・区分'),
    theme: NonEmpty.describe('出題テーマ'),
    checkedBy: z.enum(['self', 'agent']).optional().describe('原典で確かめた人'),
    checkedAt: jstDate('確かめた日').optional(),
    source: z.string().optional().describe('出典（原典に当たっていないテーマは民間サイトの URL）'),
    official: z.boolean().optional().describe('公式の出典か'),
  })
  .strict();
const InventoryYear = z
  .object({
    year: z.number().int().min(1990).max(2100).describe('試験の年度（西暦）'),
    official: z.enum(['listed', 'removed', 'never', 'unknown']).describe('公式の掲載状態（掲載中・掲載終了・公式に無いか中止・未照合）'),
    files: z.array(InventoryFile),
    themes: z.array(InventoryTheme).optional().describe('記述・経験記述の出題テーマ（分析結果）'),
    note: z.string().optional(),
  })
  .strict();
const InventoryExam = z
  .object({
    dir: z.string().regex(/^content\/sources\/past-exams\/[^/]+$/, 'content/sources/past-exams/{資格}').describe('PDF を置くディレクトリ'),
    registry: z.boolean().optional().describe('false は保存だけが目的の試験（資格台帳に載せず label で名乗る）'),
    label: z.string().optional().describe('registry:false の試験の名前'),
    official: z
      .object({
        page: z.string().nullable().describe('公式の掲載ページ。無ければ null'),
        windowYears: z.number().int().min(1).nullable().describe('公式が掲載する年数（直近 N 年度）。不明は null'),
        publishLagDays: z.number().int().min(0).nullable().describe('試験日から掲載までの日数の目安。不明は null'),
        policy: NonEmpty.describe('公式の掲載方針'),
        note: z.string().optional(),
        unverified: z.array(NonEmpty).optional().describe('確かめられなかった事項'),
        disclosureRequest: z.union([z.string(), z.looseObject({ exists: z.boolean(), detail: z.string() })]).optional().describe('情報公開請求の案内の調査'),
      })
      .strict(),
    years: z.array(InventoryYear),
    otherSources: z
      .array(z.object({ title: NonEmpty, source: NonEmpty, what: z.string().optional(), publisher: z.string().optional(), years: z.string().optional() }).strict())
      .describe('公式以外の入手元（書籍・民間サイト。取得はしない）'),
  })
  .strict();
/** 過去問の年度別の在庫台帳（data/pastexams/inventory.json）。資格 id は exam-formats.json と同じ（照合は check-past-exam-inventory） */
export const PastExamInventory = z
  .object({
    schemaVersion: z.literal(1),
    verifiedAt: jstDate('台帳を点検した日'),
    policy: NonEmpty.describe('台帳の方針と運用'),
    exams: z.record(z.string().regex(/^[a-z0-9-]+$/, '資格 id'), InventoryExam).describe('資格 id ごとの在庫'),
  })
  .strict()
  .meta({ title: '過去問の在庫台帳' });

// ---- 過去問の問題台帳（data/pastexams/questions/{資格}.json・DN-0647。共通部品は scripts/lib/past-exam-ledger.mjs） ----------

const ledgerCheck = {
  checkedAt: jstDate('確かめた日').optional(),
  by: z.enum(['self', 'agent', 'import']).optional().describe('確かめた人（import は旧データからの移し替え）'),
  note: z.string().optional(),
};
const LedgerRow = z
  .object({
    id: z.string().min(1).describe('演習データの問題 ID（アプリの学習履歴のキー。変えない）'),
    article: z.string().regex(/^[a-z0-9-]+\/[a-z0-9-]+$/, '<資格>/<記事>').describe('問題を載せている記事（content/site の下）'),
    no: z.string().min(1).describe('原典での問題番号（表示用）'),
    source: z
      .object({
        question: z.string().regex(/\.pdf$/).nullable().describe('問題の原典（在庫台帳 files[].file）。無ければ null'),
        page: z.number().int().min(1).nullable().describe('原典のページ（1 始まり）。未確認は null'),
        answer: z.string().regex(/\.pdf$/).nullable().describe('公式正答の原典（在庫台帳 files[].file）。無ければ null'),
      })
      .strict(),
    answer: z
      .object({
        status: z.enum(['unchecked', 'official', 'no-official']).describe('公式正答の確認（未確認・公式で確認済み・公式の正答が無い）'),
        official: z.array(z.number().int().min(1).max(5)).min(1).nullable().describe('公式正答の番号（全員正解などは複数）'),
        ...ledgerCheck,
      })
      .strict()
      .superRefine((a, ctx) => {
        if ((a.status === 'official') !== (a.official != null)) flag(ctx, ['official'], 'official は status が official のときだけ書く');
      }),
    transcription: z
      .object({
        status: z.enum(['unverified', 'verified', 'fixed', 'no-source']).describe('設問・選択肢の転記の照合（未了・原典どおり・直して原典どおり・原典が無い）'),
        ...ledgerCheck,
      })
      .strict()
      .superRefine((t, ctx) => {
        if (t.status !== 'unverified' && !t.checkedAt) flag(ctx, ['checkedAt'], `${t.status} には checkedAt が要る`);
      }),
  })
  .strict();
/** 過去問の問題台帳。1 資格 1 ファイル。照合は check-past-exam-ledger */
export const PastExamQuestionLedger = z
  .object({
    schemaVersion: z.literal(1),
    qualification: z.string().regex(/^[a-z0-9-]+$/).describe('資格 id（在庫台帳・資格台帳と同じ）'),
    quizExam: z.string().min(1).describe('演習データの試験 id（build-quiz-data の SOURCES）'),
    questions: z.array(LedgerRow).superRefine(uniqueBy('id', '問題 ID')),
  })
  .strict()
  .meta({ title: '過去問の問題台帳' });

// ---- 書籍の網羅の要約（.claude/state/book-coverage.json。見出しを含む詳細は Drive vault の coverage/） --------------

const articleSlug = z.string().regex(/^[a-z0-9-]+\/[a-z0-9-]+$/, '<資格>/<記事のディレクトリ>').describe('記事（content/site/ の下）');
const CoverageCandidates = z
  .object({
    generatedAt: utcTime('候補表を作った時刻').nullable().describe('候補表を作った時刻（--stamp を付けないときは null）'),
    units: count('書籍の節の数'),
    textUnits: count('実検査した本文の節の数'),
    examUnits: count('過去問の節の数（対象外）'),
    covered: count('扱われている候補'),
    partial: count('一部だけの候補'),
    gap: count('扱われていない候補'),
  })
  .strict()
  .superRefine((c, ctx) => {
    if (!sumEquals([c.covered, c.partial, c.gap], c.textUnits)) flag(ctx, ['textUnits'], `covered+partial+gap（${c.covered + c.partial + c.gap}）が textUnits ${c.textUnits} と合わない`);
  })
  .describe('機械の候補表（audit-reference-book-coverage）の件数');
const CoverageVerdict = z
  .object({
    judged: count('意味判定した節の数'),
    covered: count('扱われている'),
    partial: count('一部だけ'),
    gap: count('扱われていない'),
    outOfScope: count('対象外（前付け・索引・試験の範囲外など）'),
    additions: count('計画した追記の数'),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (!sumEquals([v.covered, v.partial, v.gap, v.outOfScope], v.judged)) flag(ctx, ['judged'], `covered+partial+gap+outOfScope が judged ${v.judged} と合わない`);
  })
  .describe('Evaluator の意味判定の件数');
export const StateBookCoverage = z
  .object({
    schemaVersion: z.literal(1),
    description: z.string().min(1).describe('ファイルの説明'),
    books: z
      .record(
        z.string().regex(/^[a-z0-9-]+$/, '参考文献 id'),
        z
          .object({
            candidates: CoverageCandidates,
            verdict: CoverageVerdict.nullable().describe('意味判定の件数（まだ判定していなければ null）'),
            judgedAt: jstDate('意味判定の日').nullable(),
            expansions: z
              .array(z.object({ article: articleSlug, commits: z.array(z.string().regex(/^[0-9a-f]{7,40}$/, 'コミットの SHA')).describe('展開したコミット（まだなら空）') }).strict())
              .superRefine(uniqueBy('article', '記事'))
              .describe('判定から展開した（する）記事'),
          })
          .strict(),
      )
      .describe('参考文献 id（config.reference-sources の id）ごとの要約'),
  })
  .strict()
  .meta({ title: '書籍の網羅の要約' });
