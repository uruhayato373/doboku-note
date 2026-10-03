/**
 * dataset-schemas-search.mjs — 検索・計測（GSC・GA4・Bing・PSI・RUM）の取得記録 の型（zod）。dataset-schemas.mjs が export * で束ね、台帳（datasets.mjs）の schema が名前で引く。
 * 型を足す約束は dataset-schemas.mjs の先頭。部品は dataset-schema-parts.mjs。
 */
import { z } from 'zod';
import { jstDate, utcTime, count, orNull, flag, uniqueBy, jstDayOf } from './dataset-schema-parts.mjs';

// ---- 共通の部品 ---------------------------------------------------------------------------------

/** 画面取得・管理画面の取得の run id（makeRunId の書式。末尾 Z の UTC を - でつないだもの） */
const runId = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z$/, 'run id（YYYY-MM-DDTHH-MM-SSZ）');
const rate = (what) => z.number().min(0).max(1).describe(what);
const nonNegative = (what) => z.number().min(0).describe(what);

// ---- GA4・GSC のレポート（data/{ga4,gsc}/reports/{date}.json・書き手 scripts/lib/metric-reports.mjs） ----------------

/** 1 回の取得の時刻（UTC）を名前用の書式にしたもの（2026-10-02T00-21-12・末尾 Z なし） */
const reportStamp = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/, '取得時刻（UTC・YYYY-MM-DDTHH-MM-SS）').describe('この枠を書いた取得の時刻（UTC・名前用の書式・末尾 Z なし）');

/** 名前用の書式（UTC）→ JST の日付。読めなければ null */
const jstDayOfStamp = (stamp) => jstDayOf(`${stamp.slice(0, 10)}T${stamp.slice(11).replace(/-/g, ':')}Z`);

/** 日ごとのファイルの外側（ga4・gsc 共通）。枠の stamp を JST にした日がファイルの日付と一致する（writeReport が stamp から日付を決める） */
const reportsDay = (source, reports, what) =>
  z
    .strictObject({
      schemaVersion: z.literal(1),
      source: z.literal(source).describe('取得元'),
      date: jstDate('取得した日'),
      reports: reports.describe('レポートの種類ごとの枠（同じ日に同じ種類を取り直したら上書きされる）'),
    })
    .superRefine((day, ctx) => {
      const sections = Object.entries(day.reports);
      if (sections.length === 0) flag(ctx, ['reports'], 'レポートの枠が 1 つも無い（取得が無い日はファイルを作らない）');
      for (const [name, report] of sections) {
        const d = jstDayOfStamp(report.stamp);
        if (d !== day.date) flag(ctx, ['reports', name, 'stamp'], `stamp ${report.stamp} の JST の日付 ${d} がファイルの日付 ${day.date} と合わない`);
      }
    })
    .meta({ title: what });

const dateRange = {
  startDate: jstDate('集計期間の開始日'),
  endDate: jstDate('集計期間の終了日'),
};
const rangeOrdered = (meta, ctx) => {
  if (meta.startDate > meta.endDate) flag(ctx, ['meta', 'endDate'], `終了日 ${meta.endDate} が開始日 ${meta.startDate} より前`);
};

// -- GA4 --

const GA4_PROPERTY = z.string().regex(/^properties\/\d+$/, 'properties/<数字>').describe('GA4 プロパティ（properties/<id>）');

/** セッション系の指標（fetch-ga4-data が出す 6 種）。API が値を返さなかった指標は null */
const ga4SessionMetrics = {
  activeUsers: z.number().min(0).nullable().describe('アクティブユーザー数'),
  sessions: z.number().min(0).nullable().describe('セッション数'),
  screenPageViewsPerSession: z.number().min(0).nullable().describe('セッションあたりの閲覧数'),
  averageSessionDuration: z.number().min(0).nullable().describe('平均セッション時間（秒）'),
  engagementRate: z.number().min(0).max(1).nullable().describe('エンゲージメント率（0〜1）'),
  bounceRate: z.number().min(0).max(1).nullable().describe('直帰率（0〜1）'),
};

/** ディメンション 1 つ×セッション系 6 指標のレポート（page・date・channel・source など。行の欄の名前はディメンション名） */
const ga4DimensionReport = (dim, { rowKeyPattern } = {}) =>
  z.strictObject({
    stamp: reportStamp,
    meta: z
      .looseObject({
        ...dateRange,
        dimension: z.literal(dim).describe('行のキーになるディメンション（行の欄の名前と同じ）'),
        dimensionApiName: z.string().min(1).describe('GA4 Data API のディメンション名'),
        metrics: z.array(z.string()).min(1).describe('取得した指標'),
        limit: z.number().int().min(1).describe('取得する行の上限'),
        organicOnly: z.boolean().describe('Organic Search に絞ったか'),
        snsOnly: z.boolean().optional().describe('SNS の流入元に絞ったか（古い記録には無い）'),
        japanOnly: z.boolean().describe('国が Japan に絞ったか'),
        excludeSpam: z.boolean().describe('スパムの参照元を除いたか'),
        propertyId: GA4_PROPERTY,
        rowCount: count('API が返した総行数（古い記録には無い）').optional(),
        truncated: z.boolean().optional().describe('上限で打ち切ったか（古い記録には無い）'),
      })
      .superRefine(rangeOrdered),
    rows: z
      .array(
        z.looseObject({
          [dim]: rowKeyPattern ? z.string().regex(rowKeyPattern) : z.string(),
          ...ga4SessionMetrics,
        }),
      )
      .superRefine(uniqueBy(dim, dim))
      .describe(`${dim} ごとの行（ディメンション 1 つなので同じ値は 1 行）`),
  });

/** CTA 系のイベント件数（fetch-ga4-cta-clicks）。行は [キー, eventName] の件数 */
const ga4EventCountReport = (key, { by, month = false } = {}) =>
  z
    .strictObject({
      stamp: reportStamp,
      meta: z
        .looseObject({
          ...dateRange,
          windowKind: z.enum(['days', 'month', 'explicit']).optional().describe('窓の種類（days=直近 N 日・month=暦月・explicit=日付指定。無い古い記録は days 扱い）'),
          eventNames: z.array(z.string()).min(1).describe('集計したイベント名'),
          japanOnly: z.boolean().describe('国が Japan に絞ったか'),
          byDevice: z.boolean().describe('デバイス別か'),
          byLabel: z.boolean().describe('CTA ラベル別か'),
          byPlacement: z.boolean().optional().describe('配置別か（古い記録には無い）'),
          propertyId: GA4_PROPERTY,
          rowCount: count('API が返した総行数（古い記録には無い）').optional(),
          truncated: z.boolean().optional().describe('上限で打ち切ったか（古い記録には無い）'),
        })
        .superRefine(rangeOrdered),
      rows: z
        .array(z.looseObject({ [key]: z.string(), eventName: z.string().min(1), eventCount: count('イベント件数') }))
        .superRefine(uniqueBy((r) => `${r[key]}\u0000${r.eventName}`, `${key}×eventName`)),
    })
    .superRefine((report, ctx) => {
      const m = report.meta;
      // どの分け方の枠かは meta の byDevice・byLabel・byPlacement と一致する（枠の名前で書き手が決める）
      if (m.byDevice !== (by === 'device')) flag(ctx, ['meta', 'byDevice'], `byDevice=${m.byDevice} が枠の種類（${key}）と合わない`);
      if (m.byLabel !== (by === 'label')) flag(ctx, ['meta', 'byLabel'], `byLabel=${m.byLabel} が枠の種類（${key}）と合わない`);
      if (m.byPlacement !== undefined && m.byPlacement !== (by === 'placement')) flag(ctx, ['meta', 'byPlacement'], `byPlacement=${m.byPlacement} が枠の種類（${key}）と合わない`);
      // 暦月の窓は専用の枠（cta-clicks-by-label:month）にだけ入る
      if (month && m.windowKind !== 'month') flag(ctx, ['meta', 'windowKind'], '暦月の枠なのに windowKind が month でない');
      if (!month && m.windowKind === 'month') flag(ctx, ['meta', 'windowKind'], 'windowKind が month の取得は :month の枠に入る');
    });

const Ga4Sections = z.strictObject({
  page: ga4DimensionReport('page').optional(),
  date: ga4DimensionReport('date', { rowKeyPattern: /^\d{8}$/ }).optional(),
  channel: ga4DimensionReport('channel').optional(),
  'channel-organic': ga4DimensionReport('channel').optional(),
  source: ga4DimensionReport('source').optional(),
  'sourceMedium-sns': ga4DimensionReport('sourceMedium').optional(),
  campaign: ga4DimensionReport('campaign').optional(),
  hostName: ga4DimensionReport('hostName').optional(),
  device: ga4DimensionReport('device').optional(),
  'cta-clicks': ga4EventCountReport('page').optional(),
  'cta-clicks-by-device': ga4EventCountReport('device', { by: 'device' }).optional(),
  'cta-clicks-by-label': ga4EventCountReport('label', { by: 'label' }).optional(),
  'cta-clicks-by-label:month': ga4EventCountReport('label', { by: 'label', month: true }).optional(),
  'cta-clicks-by-placement': ga4EventCountReport('placement', { by: 'placement' }).optional(),
  'key-events-by-page': z
    .strictObject({
      stamp: reportStamp,
      meta: z
        .looseObject({
          ...dateRange,
          windowKind: z.enum(['days', 'month', 'explicit']).optional(),
          mode: z.literal('key-events-by-page'),
          metrics: z.array(z.string()).min(1),
          japanOnly: z.boolean(),
          spamExcluded: z.boolean(),
          propertyId: GA4_PROPERTY,
          rowCount: count('API が返した総行数'),
          truncated: z.boolean().describe('上限で打ち切ったか'),
          limited: z.boolean().describe('しきい値・サンプリングで行が欠けているか'),
        })
        .superRefine(rangeOrdered),
      rows: z
        .array(
          z.looseObject({
            page: z.string(),
            sessions: count('セッション数'),
            keyEvents: nonNegative('キーイベント数'),
            sessionKeyEventRate: nonNegative('セッションキーイベント率'),
          }),
        )
        .superRefine(uniqueBy('page', 'page')),
    })
    .optional(),
  'quiz-funnel': z
    .strictObject({
      stamp: reportStamp,
      meta: z
        .looseObject({
          ...dateRange,
          windowKind: z.enum(['days', 'month', 'explicit']),
          days: z.number().int().min(1),
          pagePath: z.string().startsWith('/'),
          country: z.string(),
          eventNames: z.array(z.string()).min(1),
          placementStatus: z.enum(['available', 'custom_dimension_unavailable', 'request_failed']).describe('配置別の取得の結果（available 以外は placementRows が空）'),
        })
        .superRefine(rangeOrdered),
      rows: z.array(z.looseObject({ eventName: z.string().min(1), eventCount: count('イベント件数'), totalUsers: count('ユーザー数') })).superRefine(uniqueBy('eventName', 'eventName')),
      placementRows: z.array(z.looseObject({ eventName: z.string().min(1), placement: z.string(), eventCount: count('イベント件数') })),
    })
    .superRefine((r, ctx) => {
      if (r.meta.placementStatus !== 'available' && r.placementRows.length > 0) flag(ctx, ['placementRows'], `placementStatus が ${r.meta.placementStatus} なのに配置別の行がある`);
    })
    .optional(),
  'bot-audit': z
    .strictObject({
      stamp: reportStamp,
      meta: z.looseObject({ ...dateRange, minUsers: count('この人数に満たない参照元は監査しない'), threshold: rate('海外ユーザー比率のしきい値（以上で flagged）') }).superRefine(rangeOrdered),
      totals: z.strictObject({ allUsers: count('全ユーザー'), jpUsers: count('国内ユーザー'), foreignUsers: count('海外ユーザー') }),
      rows: z
        .array(
          z.looseObject({
            source: z.string(),
            totalUsers: count('参照元の全ユーザー'),
            jpUsers: count('国内ユーザー'),
            foreignUsers: count('海外ユーザー'),
            foreignRatio: rate('海外ユーザー ÷ 全ユーザー'),
            engagementRate: rate('エンゲージメント率'),
            flagged: z.boolean().describe('海外比率がしきい値以上（bot の疑い）'),
          }),
        )
        .superRefine(uniqueBy('source', 'source')),
    })
    .superRefine((r, ctx) => {
      r.rows.forEach((row, i) => {
        if (row.flagged !== row.foreignRatio >= r.meta.threshold) flag(ctx, ['rows', i, 'flagged'], `flagged=${row.flagged} が海外比率 ${row.foreignRatio} としきい値 ${r.meta.threshold} と合わない`);
        if (row.totalUsers < r.meta.minUsers) flag(ctx, ['rows', i, 'totalUsers'], `全ユーザー ${row.totalUsers} が下限 ${r.meta.minUsers} に満たない行は書かれない`);
      });
    })
    .optional(),
});

/** GA4 の週次取得（data/ga4/reports/{date}.json）。種類の定義は scripts/lib/metric-reports.mjs の REPORT_KINDS */
export const Ga4Reports = reportsDay('ga4', Ga4Sections, 'GA4 の週次取得');

// -- GSC --

/** Search Analytics の 1 行。keys は dimensions と同じ並びの値 */
const gscRow = z.looseObject({
  keys: z.array(z.string()).min(1).describe('ディメンションの値（dimensions と同じ並び）'),
  clicks: count('クリック数'),
  impressions: count('表示回数'),
  ctr: rate('クリック率（0〜1）'),
  position: nonNegative('平均掲載順位'),
});

const gscReport = (dimensions) =>
  z
    .strictObject({
      stamp: reportStamp,
      meta: z
        .looseObject({
          ...dateRange,
          siteUrl: z.string().min(1).optional().describe('GSC のプロパティ（古い記録には無い）'),
          dataState: z.enum(['final', 'all']).optional().describe('確定値だけか（古い記録には無い）'),
          type: z.literal('web').optional(),
          timeZone: z.string().optional().describe('Search Analytics の日付の時刻帯（America/Los_Angeles）'),
          filters: z.array(z.looseObject({})).optional().describe('絞り込み条件（無ければ空）'),
          dimensions: z.array(z.string()).min(1).optional().describe('取得したディメンション（最初期の記録には無い）'),
          dimension: z.string().optional().describe('ディメンションが 1 つのときだけ残る旧い欄'),
          limit: z.number().int().min(1).nullable().optional().describe('行の上限（null は全件取得・最初期の記録には無い）'),
          pages_fetched: z.number().int().min(1).optional().describe('API を何ページ呼んだか'),
          row_count: count('取得できた行数（rows の長さ）').optional(),
          truncated: z.boolean().optional().describe('上限で打ち切ったか'),
          api_note: z.string().optional(),
        })
        .superRefine((meta, ctx) => {
          rangeOrdered(meta, ctx);
          if (meta.dimensions && meta.dimensions.join(',') !== dimensions.join(',')) flag(ctx, ['dimensions'], `dimensions ${meta.dimensions.join(',')} が枠の種類（${dimensions.join(',')}）と合わない`);
        }),
      rows: z.array(gscRow).superRefine(uniqueBy((r) => r.keys.join('\u0000'), 'keys')),
    })
    .superRefine((report, ctx) => {
      if (report.meta.row_count !== undefined && report.meta.row_count !== report.rows.length) flag(ctx, ['meta', 'row_count'], `row_count ${report.meta.row_count} が rows の ${report.rows.length} 行と合わない`);
      report.rows.forEach((row, i) => {
        if (row.keys.length !== dimensions.length) flag(ctx, ['rows', i, 'keys'], `keys が ${row.keys.length} 個（ディメンション ${dimensions.length} 個）`);
        if (row.clicks > row.impressions) flag(ctx, ['rows', i, 'clicks'], `クリック ${row.clicks} が表示回数 ${row.impressions} を超える`);
        if (dimensions[0] === 'date' && !jstDate('日付').safeParse(row.keys[0]).success) flag(ctx, ['rows', i, 'keys', 0], `日付 ${row.keys[0]} が YYYY-MM-DD でない`);
      });
    });

/** GSC の検索指標（data/gsc/reports/{date}.json）。水曜分の page は 1000 行で打ち切られる */
export const GscReports = reportsDay(
  'gsc',
  z.strictObject({
    date: gscReport(['date']).optional(),
    page: gscReport(['page']).optional(),
    query: gscReport(['query']).optional(),
    'page-query': gscReport(['page', 'query']).optional(),
  }),
  'GSC の検索指標',
);

// ---- GA4 管理画面の設定（data/ga4/admin-inventory.json） -----------------------------------------------------------

/** GA4 管理画面の設定の最新。書き手は 2 つ（scripts/ga4-admin-api.mjs＝Admin API・scripts/ga4-admin-setup.mjs＝画面）で、後者は失敗時に欄が欠ける */
export const Ga4AdminInventory = z
  .looseObject({
    schemaVersion: z.literal(1),
    runId,
    collectedAt: utcTime('観測時刻'),
    propertyId: z.string().regex(/^\d+$/).describe('GA4 プロパティ id（数字）'),
    mode: z.enum(['api-check', 'api-apply', 'dry-run', 'commit']).describe('api-check/api-apply=Admin API・dry-run/commit=画面'),
    status: z.string().min(1).describe('ok のほか、画面経由では no-targets・not-signed-in・property-mismatch・custom-definitions-unreachable・partial・drift・error'),
    desiredCount: count('期待するカスタムディメンション数'),
    inventory: z
      .looseObject({ dimensions: z.array(z.looseObject({ displayName: z.string(), parameterName: z.string().nullable(), scopeLabel: z.string().nullable() })) })
      .nullable()
      .describe('実機のカスタムディメンション（観測できなかったときは null）'),
    missing: z.array(z.string()).describe('不足しているカスタムディメンション（parameterName）'),
    present: z.array(z.string()).describe('登録済みのカスタムディメンション'),
    created: z.array(z.string()).describe('この実行で作ったカスタムディメンション'),
    createFailures: z.array(z.looseObject({})).describe('作成に失敗したもの'),
    missingAfter: z.array(z.string()).optional().describe('作成後にもまだ不足しているもの（画面で作成したときだけ）'),
    keyEvents: z
      .looseObject({
        observed: z.array(z.looseObject({ eventName: z.string(), countingMethod: z.string().optional(), createTime: utcTime('作成時刻').optional() })),
        present: z.array(z.string()),
        missing: z.array(z.string()),
        created: z.array(z.string()),
        createFailures: z.array(z.looseObject({ eventName: z.string() })),
      })
      .optional()
      .describe('キーイベントの観測（Admin API 経由のときだけ）'),
    dataRetention: z
      .looseObject({
        desired: z.looseObject({}).nullable().describe('期待するデータ保持（desired-state の値）'),
        observed: z.looseObject({ reached: z.boolean().optional(), unverified: z.boolean().optional(), months: z.number().int().nullable().optional() }).nullable(),
        drift: z.string().nullable().describe('期待との差（無ければ null）'),
        unverified: z.boolean().optional().describe('画面から月数を読めなかった'),
      })
      .describe('イベントデータの保持期間'),
    note: z.string(),
  })
  .superRefine((inv, ctx) => {
    if (inv.status === 'ok' && inv.inventory === null) flag(ctx, ['inventory'], 'status が ok なのに観測した一覧が無い');
  })
  .meta({ title: 'GA4 管理画面の設定' });

// ---- 画面取得の実行マーカー（data/{ga4,gsc}/ui-last-run.json・書き手 scripts/lib/google-console-units.mjs の buildMarker） ----

const uiAttempt = z
  .looseObject({
    runId,
    collectedAt: utcTime('実行時刻'),
    status: z.enum(['ok', 'partial', 'error', 'empty', 'no-units', 'not-signed-in', 'property-mismatch', 'page-indexing-unreachable']).describe('run 全体の判定（ok だけが complete）'),
    complete: z.boolean().describe('この run で月次サイクルを満たしたか（status が ok のときだけ true）'),
    totalUnits: count('検査対象のユニット数'),
    downloadedUnits: count('取得できたユニット'),
    zeroUnits: count('対象なし（正常なゼロ）のユニット'),
    failedUnits: count('失敗したユニット'),
    failedDetail: z.array(z.looseObject({ unit: z.string(), status: z.string().nullable(), error: z.string().nullable() })),
    suspiciousScopes: z.array(z.string()).describe('取得成功が 0 件の面（UI 変更の疑い）'),
    byScope: z.record(z.string(), z.strictObject({ total: count('件数'), ok: count('取得'), zero: count('対象なし'), failed: count('失敗') })),
  })
  .superRefine((a, ctx) => {
    if (a.complete !== (a.status === 'ok')) flag(ctx, ['complete'], `complete=${a.complete} が status ${a.status} と合わない（ok のときだけ true）`);
    if (a.downloadedUnits + a.zeroUnits + a.failedUnits !== a.totalUnits) flag(ctx, ['totalUnits'], `総数 ${a.totalUnits} が 取得+対象なし+失敗 ${a.downloadedUnits + a.zeroUnits + a.failedUnits} と合わない`);
    if (a.failedDetail.length !== a.failedUnits) flag(ctx, ['failedDetail'], `失敗の内訳 ${a.failedDetail.length} 件が失敗数 ${a.failedUnits} と合わない`);
  })
  .describe('最後の実行（失敗も含む・毎回更新）');

const uiLastComplete = z
  .looseObject({ runId, collectedAt: utcTime('実行時刻'), totalUnits: count('ユニット数'), downloadedUnits: count('取得'), zeroUnits: count('対象なし') })
  .nullable()
  .describe('最後に完全だった実行（完全な run のときだけ更新・失敗では前の値を保つ。まだ無ければ null）');

const uiLegacy = z
  .looseObject({
    schemaVersion: z.number().int().min(1).describe('畳み込んだ旧マーカーの版'),
    runId: z.string(),
    collectedAt: z.string().nullable(),
    status: z.string().nullable(),
    complete: z.boolean().nullable(),
    downloadedUnits: z.number().int().nullable(),
    totalUnits: z.number().int().nullable(),
    note: z.string(),
  })
  .nullable()
  .describe('旧スキーマ（v1・v2）のマーカーを畳み込んだ記録（無ければ null）');

/** 画面取得のマーカー。ルートの lastRun 以下は旧い読み手のための複製で、lastAttempt と同じ値 */
const uiLastRun = (channel, extra, title) =>
  z
    .strictObject({
      schemaVersion: z.literal(3),
      channel: z.literal(channel),
      ...extra,
      lastAttempt: uiAttempt,
      lastComplete: uiLastComplete,
      legacy: uiLegacy,
      lastRun: runId.describe('lastAttempt.runId の複製（旧い読み手用）'),
      collectedAt: utcTime('lastAttempt.collectedAt の複製'),
      status: z.string().describe('lastAttempt.status の複製'),
      complete: z.boolean().describe('lastAttempt.complete の複製'),
      totalUnits: count('lastAttempt.totalUnits の複製'),
      downloadedUnits: count('lastAttempt.downloadedUnits の複製'),
      note: z.string(),
    })
    .superRefine((m, ctx) => {
      const a = m.lastAttempt;
      for (const [top, inner] of [['lastRun', a.runId], ['collectedAt', a.collectedAt], ['status', a.status], ['complete', a.complete], ['totalUnits', a.totalUnits], ['downloadedUnits', a.downloadedUnits]]) {
        if (m[top] !== inner) flag(ctx, [top], `${top} が lastAttempt の値（${inner}）と違う`);
      }
      if (a.complete && m.lastComplete?.runId !== a.runId) flag(ctx, ['lastComplete'], '最後の実行が完全なら lastComplete もその run を指す');
    })
    .meta({ title });

/** GA4 の画面取得の実行マーカー（一次経路は Data API で、画面は照合用のバックアップ） */
export const Ga4UiLastRun = uiLastRun(
  'ga4-ui',
  {
    propertyId: z.string().regex(/^\d+$/).optional().describe('GA4 プロパティ id'),
    window: z.looseObject({ startDate: jstDate('開始日'), endDate: jstDate('終了日'), timezone: z.string() }).optional().describe('取得した期間'),
    apiPreferred: z.boolean().optional().describe('Data API が一次経路か'),
  },
  'GA4 画面取得の実行マーカー',
);

/** GSC の画面取得の実行マーカー（check-gsc-ui-due が読む） */
export const GscUiLastRun = uiLastRun('gsc-ui', { property: z.string().min(1).describe('GSC のプロパティ') }, 'GSC 画面取得の実行マーカー');

// ---- GSC のサイトマップ・URL 検査・登録申請 -------------------------------------------------------------------------

/** サイトマップの送信状態（data/gsc/sitemaps.json・書き手 scripts/gsc-sitemaps.mjs） */
export const GscSitemaps = z
  .strictObject({
    schemaVersion: z.literal(1),
    fetchedAt: utcTime('取得時刻'),
    property: z.string().min(1).describe('GSC のプロパティ'),
    robotsSitemaps: z.array(z.url()).min(1).describe('本番 robots.txt の Sitemap 行（送るべき sitemap の真実源）'),
    submit: z
      .array(
        z.strictObject({
          path: z.url(),
          status: z.enum(['ok', 'permission-denied', 'error']).describe('送信の結果（permission-denied=サービスアカウントに「フル」権限が要る）'),
          code: z.number().int().nullable().optional().describe('HTTP ステータス（失敗時）'),
          message: z.string().optional().describe('失敗の内容（失敗時）'),
        }),
      )
      .describe('送信の記録（--submit のときだけ。送らない取得では空）'),
    sitemaps: z
      .array(
        z.strictObject({
          path: z.url(),
          type: z.string().nullable(),
          isSitemapsIndex: z.boolean(),
          isPending: z.boolean().describe('Google がまだ処理していない'),
          lastSubmitted: orNull(utcTime('最終送信'), '送信の記録が無いとき'),
          lastDownloaded: orNull(utcTime('Google の最終読み込み'), 'まだ読まれていないとき'),
          warnings: count('警告数'),
          errors: count('エラー数'),
          contents: z.array(z.strictObject({ type: z.string(), submitted: count('送信した URL 数') })),
        }),
      )
      .superRefine(uniqueBy('path', 'sitemap の path'))
      .describe('GSC に登録されている sitemap'),
  })
  .superRefine((s, ctx) => {
    if (s.submit.length !== 0 && s.submit.length !== s.robotsSitemaps.length) flag(ctx, ['submit'], `送信 ${s.submit.length} 件が robots.txt の sitemap ${s.robotsSitemaps.length} 件と合わない（送るなら全部送る）`);
  })
  .meta({ title: 'GSC のサイトマップ' });

/** URL 検査 1 件。バッチは読まれる欄だけ（2026-10〜）、単発と旧いバッチは全欄。失敗した URL は error だけ */
const inspectionResult = z
  .looseObject({
    url: z.string().min(1).describe('検査した URL'),
    inspected_at: utcTime('検査時刻').optional(),
    index: z
      .looseObject({
        verdict: z.enum(['PASS', 'PARTIAL', 'FAIL', 'NEUTRAL', 'VERDICT_UNSPECIFIED']).nullable().describe('インデックスの判定（PASS=登録済み）'),
        coverage_state: z.string().nullable().describe('カバレッジの状態（GSC の日本語表記）'),
        robots_txt_state: z.string().nullable(),
        last_crawl_time: orNull(utcTime('最終クロール'), '未クロールのとき').optional(),
        page_fetch_state: z.string().nullable(),
        google_canonical: z.string().nullable(),
        user_canonical: z.string().nullable(),
      })
      .optional(),
    error: z.string().optional().describe('検査に失敗した URL のエラー'),
  })
  .superRefine((r, ctx) => {
    if (r.error === undefined && (r.index === undefined || r.inspected_at === undefined)) flag(ctx, [], '成功した検査には inspected_at と index が要る（失敗は error）');
    if (r.error !== undefined && r.index !== undefined) flag(ctx, ['error'], 'error のある行に index がある');
  });

/** URL 検査のバッチの外側。completed は「検査を試みた件数（失敗も数える）」、partial は未完了 */
const inspectionDoc = (resultsMax, { requireCounts }) =>
  z
    .strictObject({
      schemaVersion: z.literal(1),
      generated_at: utcTime('書き出し時刻'),
      partial: requireCounts ? z.boolean().describe('total 件すべてが済んでいないとき true（途中の保存・中断）') : z.boolean().optional(),
      completed: requireCounts ? count('済んだ件数') : count('済んだ件数').optional(),
      total: requireCounts ? count('検査対象の件数') : count('検査対象の件数').optional(),
      results: z.array(inspectionResult).superRefine(uniqueBy('url', 'url')).max(resultsMax),
    })
    .superRefine((doc, ctx) => {
      if (doc.completed !== undefined && doc.completed !== doc.results.length) flag(ctx, ['completed'], `completed ${doc.completed} が results の ${doc.results.length} 件と合わない`);
      if (doc.total !== undefined && doc.completed !== undefined && doc.completed > doc.total) flag(ctx, ['completed'], `completed ${doc.completed} が total ${doc.total} を超える`);
      if (doc.partial !== undefined && doc.total !== undefined && doc.completed !== undefined && doc.partial !== doc.completed < doc.total) flag(ctx, ['partial'], `partial=${doc.partial} が completed ${doc.completed} / total ${doc.total} と合わない`);
    });

/** URL 検査のバッチ（data/gsc/url-inspection/{ts}.json・書き手 .claude/scripts/inspect-url.mjs）。インデックス率の元データ */
export const GscUrlInspection = inspectionDoc(Infinity, { requireCounts: true }).meta({ title: 'URL 検査（バッチ）' });

/** URL 検査の単発（data/gsc/url-inspection-single/{ts}.json）。古い記録は partial・completed・total が無い */
export const GscUrlInspectionSingle = inspectionDoc(1, { requireCounts: false }).meta({ title: 'URL 検査（単発）' });

/** 登録を申請する URL の優先順（data/gsc/indexing-priority.json・書き手 scripts/build-gsc-indexing-priority.mjs） */
export const GscIndexingPriority = z
  .strictObject({
    schemaVersion: z.literal(1),
    generatedAt: utcTime('作成時刻'),
    batchFile: z.string().min(1).describe('元にした URL 検査のバッチ（リポジトリ相対）'),
    gscPageFile: z.string().min(1).describe('元にした GSC page レポート（ファイル#枠）'),
    gscPageWindow: z.strictObject({ startDate: orNull(jstDate('開始日'), '期間を読めなかったとき'), endDate: orNull(jstDate('終了日'), '期間を読めなかったとき') }),
    counts: z.strictObject({
      inspected: count('検査した URL 数'),
      indexed: count('登録済み（候補から除く）'),
      candidates: count('候補（未登録で、直近に申請していないもの）'),
      withDemand: count('候補のうち表示実績のあるもの'),
      cooledDown: count('直近に申請済みで除いたもの'),
    }),
    items: z
      .array(
        z.strictObject({
          path: z.string().startsWith('/').describe('URL のパス（旧 /docs は正規パスに直したもの）'),
          status: z.enum(['discovered', 'unknown', 'duplicate', 'crawled-not-indexed', 'other']).describe('未登録の分類（登録済みは候補に入らない）'),
          reason: orNull(z.string().describe('カバレッジの状態'), '検査結果に無いとき'),
          impressions: count('表示回数（GSC page レポート）'),
          clicks: count('クリック数'),
        }),
      )
      .superRefine(uniqueBy('path', 'path'))
      .describe('順位順の候補（先頭 200 件まで。全件は indexing-priority.txt）'),
    itemsTruncated: z.boolean().describe('候補が 200 件を超えて items を切ったか'),
  })
  .superRefine((p, ctx) => {
    const c = p.counts;
    if (c.indexed + c.candidates + c.cooledDown !== c.inspected) flag(ctx, ['counts', 'inspected'], `検査 ${c.inspected} が 登録済み+候補+除外 ${c.indexed + c.candidates + c.cooledDown} と合わない`);
    if (c.withDemand > c.candidates) flag(ctx, ['counts', 'withDemand'], `表示実績ありの候補 ${c.withDemand} が候補 ${c.candidates} を超える`);
    if (p.items.length !== Math.min(c.candidates, 200)) flag(ctx, ['items'], `items ${p.items.length} 件が 候補 ${c.candidates} 件（上限 200）と合わない`);
    if (p.itemsTruncated !== c.candidates > 200) flag(ctx, ['itemsTruncated'], `itemsTruncated=${p.itemsTruncated} が候補 ${c.candidates} 件と合わない`);
  })
  .meta({ title: '登録申請の優先順' });

/** 登録申請の最新の結果（data/gsc/indexing-requests.json・書き手 scripts/gsc-request-indexing.mjs）。ログインできなかった run は items が空 */
export const GscIndexingRequests = z
  .strictObject({
    schemaVersion: z.literal(1),
    runId,
    collectedAt: utcTime('実行時刻'),
    property: z.string().min(1).describe('GSC のプロパティ'),
    mode: z.enum(['dry-run', 'commit']).describe('dry-run=検査だけ・commit=申請する'),
    scriptVersion: orNull(z.string().min(1).describe('実行したスクリプトの git commit'), 'git を読めなかったとき'),
    filter: z.strictObject({ category: z.string().nullable(), group: z.string().nullable() }),
    limit: z.number().int().min(1).describe('1 回に送る上限'),
    targetCount: count('対象にした URL 数（直近に申請したものを除く）'),
    items: z.array(
      z.looseObject({
        slug: z.string().startsWith('/').describe('URL のパス'),
        url: z.url(),
        inspected: z
          .looseObject({ state: z.string().nullable().describe('GSC の検査の状態（indexed など。読めなければ null）'), reason: z.string().nullable() })
          .nullable()
          .describe('URL 検査の読み取り'),
        request: z
          .looseObject({ requested: z.boolean().describe('申請を受理されたか'), status: z.string().min(1) })
          .nullable()
          .describe('申請の結果（dry-run や、申請前に打ち切った行は null）'),
        reachedVerdict: z.boolean().describe('検査の結果画面まで到達できたか'),
      }),
    ),
    status: z
      .enum(['ok', 'no-requests', 'dry-ok', 'inspection-unreadable', 'not-signed-in', 'property-mismatch', 'error'])
      .describe('ok=受理あり・no-requests=受理なし・dry-ok=dry-run 成功・inspection-unreadable=過半が読めず・ほかは中断'),
    summary: z
      .strictObject({ inspected: count('検査した件数'), accepted: count('受理された件数'), alreadyIndexed: count('登録済みだった件数'), unreadable: count('状態を読めなかった件数') })
      .optional()
      .describe('集計（中断した run には無い）'),
    error: z.string().optional().describe('想定外の失敗の内容（status が error のとき）'),
  })
  .superRefine((r, ctx) => {
    if (r.items.length > r.targetCount) flag(ctx, ['items'], `items ${r.items.length} 件が対象 ${r.targetCount} 件を超える`);
    if (r.summary) {
      const accepted = r.items.filter((i) => i.request?.requested).length;
      if (r.summary.inspected !== r.items.length) flag(ctx, ['summary', 'inspected'], `inspected ${r.summary.inspected} が items の ${r.items.length} 件と合わない`);
      if (r.summary.accepted !== accepted) flag(ctx, ['summary', 'accepted'], `accepted ${r.summary.accepted} が受理された行 ${accepted} 件と合わない`);
    } else if (!['not-signed-in', 'property-mismatch', 'error'].includes(r.status)) {
      flag(ctx, ['summary'], `status ${r.status} なのに summary が無い（中断した run だけ無い）`);
    }
    if (r.mode === 'dry-run' && r.items.some((i) => i.request !== null)) flag(ctx, ['items'], 'dry-run なのに申請の結果がある');
  })
  .meta({ title: '登録申請の結果' });

// ---- GSC の画面取得の結果（data/gsc/ui-diff・ui-urls） ---------------------------------------------------------------

const uiChannel = z.literal('gsc-ui');

/** 画面取得の前回との差（data/gsc/ui-diff/{ts}.json・書き手 scripts/lib/google-console-ssot.mjs の writeRunDiff） */
export const GscUiDiff = z
  .strictObject({
    schemaVersion: z.literal(1),
    channel: uiChannel,
    runId,
    collectedAt: utcTime('実行時刻'),
    units: z
      .array(
        z.strictObject({
          unit: z.string().regex(/^[A-Za-z]+--[A-Za-z]+$/, '<理由>--<範囲>').describe('ユニット（<未登録の理由>--<範囲>）'),
          rows: count('今回の行数'),
          previousRows: orNull(count('前回の行数'), '前回の記録が無いとき'),
          added: z.array(z.string()).describe('今回増えた URL'),
          removed: z.array(z.string()).describe('前回から消えた URL'),
        }),
      )
      .superRefine(uniqueBy('unit', 'unit')),
  })
  .superRefine((d, ctx) => {
    d.units.forEach((u, i) => {
      if (u.added.length > u.rows) flag(ctx, ['units', i, 'added'], `増えた ${u.added.length} 件が今回の行数 ${u.rows} を超える`);
      if (u.previousRows === null && u.removed.length > 0) flag(ctx, ['units', i, 'removed'], '前回が無いのに消えた URL がある');
      if (u.previousRows !== null && u.removed.length > u.previousRows) flag(ctx, ['units', i, 'removed'], `消えた ${u.removed.length} 件が前回の行数 ${u.previousRows} を超える`);
    });
  })
  .meta({ title: 'GSC 画面取得の差' });

/** 理由×範囲ごとの未登録 URL 一覧（data/gsc/ui-urls.json・書き手 scripts/lib/google-console-ssot.mjs の writeUnitSsot） */
export const GscUiUrls = z
  .strictObject({
    schemaVersion: z.literal(1),
    channel: uiChannel,
    units: z
      .record(
        z.string(),
        z.strictObject({
          schemaVersion: z.literal(1),
          channel: uiChannel,
          source: z.string().min(1).describe('取得元（gsc-ui-page-indexing）'),
          property: orNull(z.string().describe('GSC のプロパティ'), '正規化に渡されなかったとき'),
          issue: z.string().min(1).describe('未登録の理由（GSC のレポートの理由名）'),
          scope: z.enum(['allKnownPages', 'allSubmittedPages']).describe('範囲（既知の全ページ・送信した全ページ）'),
          runId: orNull(runId, 'run が分からないとき'),
          collectedAt: orNull(utcTime('取得時刻'), 'run が分からないとき'),
          uiTotal: orNull(count('画面に出ている総数'), '読めなかったとき'),
          exportedRows: count('CSV から読めた行数（rows の長さ）'),
          truncated: z.boolean().describe('画面の総数より少ない（CSV の上限 1000 行で切れた）か'),
          rejectCount: count('読めずに捨てた行数'),
          rejects: z.array(z.unknown()).describe('読めずに捨てた行'),
          previous: z.strictObject({ runId: z.string().nullable(), collectedAt: z.string().nullable(), exportedRows: count('前回の行数') }).nullable().describe('直前の run（無ければ null）'),
          delta: z.strictObject({ added: count('増えた行'), removed: count('消えた行') }).nullable().describe('直前の run からの増減（previous が無ければ null）'),
          rows: z.array(
            z.looseObject({
              url: z.string().min(1).describe('URL'),
              lastCrawled: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional().describe('最終クロール日（1970-01-01 は未クロール）'),
              duplicateCount: z.number().int().min(2).optional().describe('同じ比較キーで重なった行数'),
            }),
          ),
        }),
      )
      .describe('ユニット（<理由>--<範囲>）ごとの最新'),
  })
  .superRefine((all, ctx) => {
    for (const [key, u] of Object.entries(all.units)) {
      if (key !== `${u.issue}--${u.scope}`) flag(ctx, ['units', key], `キー ${key} が issue と scope（${u.issue}--${u.scope}）と合わない`);
      if (u.exportedRows !== u.rows.length) flag(ctx, ['units', key, 'exportedRows'], `exportedRows ${u.exportedRows} が rows の ${u.rows.length} 行と合わない`);
      if (u.rejectCount !== u.rejects.length) flag(ctx, ['units', key, 'rejectCount'], `rejectCount ${u.rejectCount} が rejects の ${u.rejects.length} 件と合わない`);
      if ((u.previous === null) !== (u.delta === null)) flag(ctx, ['units', key, 'delta'], 'previous と delta は両方あるか両方 null');
      if (u.truncated && u.uiTotal !== null && u.uiTotal <= u.exportedRows) flag(ctx, ['units', key, 'truncated'], `truncated なのに画面の総数 ${u.uiTotal} が取れた行 ${u.exportedRows} 以下`);
    }
  })
  .meta({ title: 'GSC 未登録 URL の一覧' });

// ---- Bing（data/bing/snapshots/{date}.json・書き手 scripts/fetch-bing-webmaster.mjs） -----------------------------------

const bingSection = (rowShape) =>
  z.discriminatedUnion('ok', [
    z.strictObject({ ok: z.literal(true), rows: z.array(z.looseObject(rowShape)).describe('日付昇順のバケット（since 以降）') }),
    z.strictObject({ ok: z.literal(false), error: z.string().min(1).describe('この区画の取得失敗（API キーは伏せてある）') }),
  ]);

const bingBase = { date: jstDate('バケットの日付'), clicks: count('クリック数'), impressions: count('表示回数') };
const bingPosition = {
  avgClickPosition: z.number().describe('クリックされたときの平均順位（-1 は未計測）'),
  avgImpressionPosition: z.number().describe('表示されたときの平均順位'),
};

/** Bing Webmaster の検索指標（1 回の取得）。区画は query・page・traffic の 3 つで、全部失敗なら書かれない */
export const BingSnapshots = z
  .strictObject({
    schemaVersion: z.literal(1),
    siteUrl: z.url().describe('Bing に登録したサイトの URL'),
    fetchedAt: utcTime('取得時刻'),
    since: jstDate('この日以降のバケットだけ残す'),
    sections: z.strictObject({
      query: bingSection({ ...bingBase, query: z.string(), ...bingPosition }),
      page: bingSection({ ...bingBase, page: z.string(), ...bingPosition }),
      traffic: bingSection(bingBase),
    }),
  })
  .superRefine((s, ctx) => {
    const sections = Object.entries(s.sections);
    if (sections.every(([, v]) => !v.ok)) flag(ctx, ['sections'], '全区画が失敗した取得は書かれない');
    for (const [name, sec] of sections) {
      if (!sec.ok) continue;
      sec.rows.forEach((row, i) => {
        if (row.date < s.since) flag(ctx, ['sections', name, 'rows', i, 'date'], `${row.date} が since ${s.since} より前`);
        if (i > 0 && row.date < sec.rows[i - 1].date) flag(ctx, ['sections', name, 'rows', i, 'date'], '日付の昇順でない');
      });
    }
  })
  .meta({ title: 'Bing の検索指標' });

// ---- PSI（data/psi/batch/{ts}.json・書き手 .claude/scripts/fetch-psi-data.mjs） ------------------------------------------

const psiScore = z.number().int().min(0).max(100).nullable().describe('Lighthouse のスコア（0〜100・測れなければ null）');
const psiLab = (what) => z.number().min(0).nullable().describe(`${what}（lab・測れなければ null）`);
const cruxMetric = z
  .looseObject({
    percentile: z.number().min(0).describe('75 パーセンタイルの値'),
    distributions: z.array(z.looseObject({ min: z.number().min(0), max: z.number().min(0).optional(), proportion: rate('割合') })).describe('良好・要改善・不良の分布'),
    category: z.enum(['FAST', 'AVERAGE', 'SLOW']),
  })
  .nullable()
  .describe('実ユーザー（CrUX）の値（無ければ null）');

const psiMeasured = z.strictObject({
  url: z.url().describe('計測した URL'),
  strategy: z.enum(['mobile', 'desktop']),
  fetched_at: utcTime('取得時刻'),
  scores: z.strictObject({ performance: psiScore, accessibility: psiScore, best_practices: psiScore, seo: psiScore }),
  lab_data: z.strictObject({ LCP_ms: psiLab('LCP（ms）'), TBT_ms: psiLab('TBT（ms）'), CLS: psiLab('CLS'), FCP_ms: psiLab('FCP（ms）'), TTI_ms: psiLab('TTI（ms）'), SI_ms: psiLab('Speed Index（ms）') }),
  field_data: z.strictObject({ LCP: cruxMetric, INP: cruxMetric, CLS: cruxMetric, FCP: cruxMetric, TTFB: cruxMetric }),
  field_availability: z.strictObject({
    url_level: z.boolean().describe('URL 単位の CrUX があるか'),
    origin_level: z.boolean().describe('origin 単位の CrUX があるか'),
    origin_fallback: z.boolean().describe('URL の欄に origin の値が入っているか'),
    url_overall_category: z.string().nullable(),
    origin_overall_category: z.string().nullable(),
  }),
  lcp_element: z.looseObject({ selector: z.string().nullable(), snippet: z.string().nullable(), node_label: z.string().nullable() }).nullable().describe('LCP になった要素（取れなければ null）'),
  analysis_utc: orNull(utcTime('Lighthouse の実行時刻'), 'PSI が返さなかったとき'),
  final_url: z.url().describe('リダイレクト後の URL'),
});
/** 計測に失敗した URL（欠測。違反が消えたことと区別するために残す） */
const psiFailed = z.strictObject({ url: z.url(), strategy: z.enum(['mobile', 'desktop']), error: z.string().min(1).describe('失敗の内容（200 字まで）') });

/** PageSpeed Insights の定期計測（1 回分）。失敗した URL は error だけの行 */
export const PsiBatch = z
  .strictObject({
    schemaVersion: z.literal(1),
    generated_at: utcTime('書き出し時刻'),
    results: z
      .array(z.union([psiMeasured, psiFailed]))
      .min(1)
      .superRefine(uniqueBy((r) => `${r.url}\u0000${r.strategy}`, 'url×strategy')),
  })
  .meta({ title: 'PageSpeed Insights の計測' });

// ---- RUM（data/rum/web-vitals/{date}.json・書き手 .claude/scripts/fetch-ga4-web-vitals.mjs） -------------------------------

const RUM_METRICS = ['LCP', 'INP', 'CLS'];
const rumCounts = z.strictObject({ good: count('良好'), 'needs-improvement': count('要改善'), poor: count('不良') });

/** 実ユーザーの Web Vitals（GA4 経由・週次）。status が ok 以外のときは summary.rows が空 */
export const RumWebVitals = z
  .strictObject({
    schemaVersion: z.literal(1),
    generatedAt: utcTime('作成時刻'),
    status: z.enum(['ok', 'no-events', 'dimensions-missing']).describe('ok=集計できた・no-events=送信 0 件（計装の deploy 前など）・dimensions-missing=GA4 にカスタムディメンション未登録'),
    window: z
      .strictObject({ startDate: jstDate('開始日'), endDate: jstDate('終了日'), days: z.number().int().min(1).describe('日数') })
      .nullable()
      .describe('集計期間（dimensions-missing で取得できなかったときは null）'),
    limited: z.boolean().describe('しきい値・サンプリングで行が欠けたか'),
    truncated: z.boolean().describe('上限で打ち切ったか'),
    error: z.string().optional().describe('取得失敗の内容（dimensions-missing のとき）'),
    summary: z.strictObject({
      rows: z.array(
        z.strictObject({
          template: z.string().startsWith('/').describe('ページの型（/exam/<資格>/<種別> など）'),
          device: z.string().min(1).describe('デバイス（mobile・desktop・tablet）'),
          metric: z.enum(RUM_METRICS),
          counts: rumCounts.describe('評価ごとの件数'),
          n: count('件数の合計'),
          status: z.enum(['good', 'needs-improvement', 'poor', 'insufficient']).describe('判定（insufficient=件数不足で判定しない）'),
          goodShare: orNull(rate('良好の割合'), '件数不足で判定しないとき'),
        }),
      ),
      events: count('集計したイベント数'),
      dropped: count('対象外として落としたイベント数'),
    }),
  })
  .superRefine((r, ctx) => {
    r.summary.rows.forEach((row, i) => {
      const n = row.counts.good + row.counts['needs-improvement'] + row.counts.poor;
      if (row.n !== n) flag(ctx, ['summary', 'rows', i, 'n'], `n ${row.n} が評価別の合計 ${n} と合わない`);
      if ((row.status === 'insufficient') !== (row.goodShare === null)) flag(ctx, ['summary', 'rows', i, 'goodShare'], 'goodShare は件数不足のときだけ null');
    });
    if (r.status === 'dimensions-missing' && r.summary.rows.length > 0) flag(ctx, ['summary', 'rows'], 'dimensions-missing なのに集計行がある');
    if (r.status === 'no-events' && r.summary.events !== 0) flag(ctx, ['summary', 'events'], 'no-events なのにイベントがある');
    if (r.status === 'ok' && r.summary.events === 0) flag(ctx, ['status'], 'イベント 0 件は no-events（ok ではない）');
    if ((r.status === 'dimensions-missing') !== (r.error !== undefined)) flag(ctx, ['error'], 'error は dimensions-missing のときだけ付く');
  })
  .meta({ title: '実ユーザーの Web Vitals' });
