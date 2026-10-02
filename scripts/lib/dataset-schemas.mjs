/**
 * dataset-schemas.mjs — 設定・記録の型（zod）。正本はここで、JSON Schema は z.toJSONSchema で生成する。
 *
 * どのファイルにどの型を当てるかは datasets.mjs の台帳が決める（ここはパスを知らない）。
 * 型を足すときの約束（data-storage-decision.md「設定・記録の構成と型の正本」）:
 *   - version 欄は schemaVersion（整数）1 本。既存ファイルの名前（version 等）は移すときに揃え、それまでは今の名前を書く
 *   - 日時は UTC の ISO 8601（末尾 Z）、日付だけの値は JST の YYYY-MM-DD。意味・単位は .describe() に書く（管理画面に出る）
 *   - 人と CI が手で書き足す記録は .strict()（知らない欄が増えたら型を先に直す）
 */
import { z } from 'zod';

const jstDate = (what) => z.iso.date().describe(`${what}（JST の YYYY-MM-DD）`);
const utcTime = (what) => z.iso.datetime({ offset: true }).describe(`${what}（UTC の ISO 8601）`);
const month = z.string().regex(/^\d{4}-\d{2}$/, 'YYYY-MM');
const yen = (what) => z.number().int().min(0).describe(`${what}（円）`);
const count = (what) => z.number().int().min(0).describe(what);

/** note の販売履歴（data/note/sales.json）。購入者は記録しない */
export const NoteSalesLog = z
  .object({
    version: z.literal(1),
    updatedAt: jstDate('最終更新日'),
    currency: z.literal('JPY'),
    source: z.string().describe('取得元'),
    privacyNote: z.string(),
    howToUpdate: z.string(),
    sales: z
      .array(
        z
          .object({
            date: jstDate('販売日'),
            productId: z.string().min(1).describe('src/lib/note-magazines.ts の id。単品記事は article:<slug>'),
            title: z.string(),
            type: z.enum(['magazine', 'article', 'membership']).describe('マガジン・単品記事・メンバーシップ'),
            price: yen('販売価格'),
          })
          .strict(),
      )
      .describe('1 取引 1 行'),
    months: z
      .record(
        month,
        z
          .object({
            fetchedAt: utcTime('取得時刻'),
            count: count('取引件数'),
            total: yen('月の販売総額'),
            finalized: z.boolean().describe('ダッシュボードの月次総額と突合して確定したか'),
          })
          .strict(),
      )
      .describe('月ごとの取得記録'),
  })
  .strict()
  .meta({ title: 'note の販売履歴' });

const kdpAmounts = { ebook: yen('電子書籍のロイヤリティ'), print: yen('ペーパーバックのロイヤリティ'), kenp: yen('KENP のロイヤリティ') };

/** KDP のロイヤリティ（data/kdp/royalties.json）。当月分は推計で、確定後に同じ月を取り直して上書きする */
export const KdpRoyalties = z
  .object({
    version: z.literal(1),
    updatedAt: jstDate('最終更新日'),
    currency: z.literal('JPY'),
    source: z.string().describe('取得元'),
    caveat: z.string(),
    months: z
      .record(
        month,
        z
          .object({
            fetchedAt: utcTime('取得時刻'),
            range: z.object({ start: jstDate('集計の開始日'), end: jstDate('集計の終了日') }).strict(),
            estimated: z.boolean().describe('推計値なら true（KENP の確定前）'),
            total: z.object({ bookCount: count('本の数'), ...kdpAmounts, royalty: yen('ロイヤリティの合計') }).strict(),
            kenpPagesRead: count('KENP の既読ページ数'),
            marketplaces: z
              .array(
                z
                  .object({
                    marketplace: z.string(),
                    currency: z.string(),
                    ebook: z.number().int().min(0),
                    paperback: z.number().int().min(0),
                    hardcover: z.number().int().min(0),
                    kenpPages: count('KENP の既読ページ数'),
                  })
                  .strict(),
              )
              .describe('マーケットプレイス別'),
            books: z
              .array(
                z
                  .object({
                    bookId: z.string().nullable().describe('content/kindle の本の id。このサイト以外の本は null'),
                    title: z.string(),
                    ...kdpAmounts,
                    royalty: yen('ロイヤリティ'),
                  })
                  .strict(),
              )
              .describe('本ごと'),
            scope: z
              .object({
                accountBookCount: count('アカウントの本の数'),
                accountRows: count('レポートの行数'),
                externalRows: count('このサイト以外の本の行数'),
                expectedDobokuBooks: count('このサイトの本として期待する数'),
                matchedDobokuBooks: count('照合できたこのサイトの本の数'),
                missingDobokuBookIds: z.array(z.string()),
                dobokuRoyalty: yen('このサイトの本のロイヤリティ'),
              })
              .strict()
              .optional()
              .describe('このサイトの本だけを数えた範囲（2026-08 以降）'),
          })
          .strict(),
      )
      .describe('月ごとの集計'),
  })
  .strict()
  .meta({ title: 'KDP のロイヤリティ' });

// 人が手で書く台帳の日時は JST の時差つき・分まで（例 2026-08-05T11:59+09:00）が混ざる。秒と時差は省略可
const isoTime = (what) =>
  z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/, 'ISO 8601 の日時').describe(`${what}（ISO 8601・分まで可）`);
const period = z.object({ startDate: jstDate('開始日'), endDate: jstDate('終了日') }).strict().describe('対象期間（両端を含む）');
const sha256 = z.string().regex(/^[0-9a-f]{64}$/, 'SHA-256（16 進 64 桁）');

/** ココナラの受注（data/coconala/orders.json）。購入者名・原稿・トークルーム本文は記録しない */
export const CoconalaOrders = z
  .object({
    version: z.literal(2),
    updatedAt: isoTime('最終更新'),
    currency: z.literal('JPY'),
    source: z.string(),
    privacyNote: z.string(),
    howToUpdate: z.string(),
    schema: z.record(z.string(), z.string()).describe('欄ごとの説明（ファイル内の手引き）'),
    orders: z
      .array(
        z
          .object({
            date: jstDate('販売日'),
            serviceId: z.string().min(1).describe('src/lib/coconala-services.ts の id'),
            talkroomId: z.string().regex(/^\d+$/).describe('トークルーム ID'),
            priceYen: yen('販売額（手数料差引前）'),
            grade: z.union([z.literal(1), z.literal(2)]).nullable().describe('級。級の無い商品は null'),
            status: z.enum(['received', 'delivered', 'revised', 'closed']).describe('received → delivered → revised → closed'),
            replyDueAt: isoTime('返信期限').nullable(),
            deliveredAt: isoTime('納品日時').nullable(),
            artifacts: z
              .array(z.object({ file: z.string(), sha256: sha256.nullable(), builtAt: isoTime('作成日時').nullable() }).strict())
              .describe('納品した成果物'),
            tensakuMinutes: count('最終赤入れの所要時間（分）').nullable().optional(),
            memo: z.string().optional(),
            quote: z
              .object({ amountYen: yen('見積り額'), basis: z.string(), proposedAt: isoTime('提案日時'), purchasedAt: isoTime('購入日時') })
              .strict()
              .optional()
              .describe('見積り（カスタム提案）受注のときだけ'),
            rating: z
              .object({
                providerRatedAt: isoTime('出品者が評価した日時').nullable(),
                stars: z
                  .object({ overall: count('総合'), demand: count('要望'), communication: count('対応'), schedule: count('期日') })
                  .strict()
                  .nullable(),
                commentChars: count('評価コメントの字数').nullable(),
                comment: z.string().nullable(),
                dueAt: jstDate('評価期限').nullable(),
                verified: z.union([z.string(), z.boolean()]).describe('送信を画面で確かめた記録（未確認は false）'),
              })
              .strict()
              .optional()
              .describe('購入者への評価'),
          })
          .strict(),
      )
      .describe('1 受注 1 行'),
  })
  .strict()
  .meta({ title: 'ココナラの受注' });

const a8Amounts = {
  impressions: count('表示回数'),
  clicks: count('クリック数'),
  conversions: count('発生件数'),
  grossRevenueYen: yen('発生報酬'),
  approved: count('確定件数'),
  revenueYen: yen('確定報酬'),
  cancelledCount: count('否認件数'),
  cancelledYen: yen('否認報酬'),
  pendingCount: count('未確定件数'),
  pendingRevenueYen: yen('未確定報酬'),
  fetchedAt: utcTime('取得時刻'),
  period: z.string().describe('A8 画面の期間指定（YYYYMM-YYYYMM）'),
};
const a8Program = { programId: z.string().regex(/^s\d+$/), programRaw: z.string().describe('A8 のプログラム名') };

/** A8 レポートの正規化（data/a8/report-log.json）。siteSummary だけがこのサイトに分離された実績で、他は口座全体 */
export const A8ReportLog = z
  .object({
    schemaVersion: z.literal(2),
    _comment: z.string(),
    _siteScopeNote: z.string(),
    site: z.literal('doboku-note'),
    updatedAt: utcTime('最終更新'),
    lastRun: z.string().describe('最後の取得の実行 id'),
    period: z.object({ raw: z.string(), start: month, end: month, granularity: z.enum(['month', 'day']), singleMonth: month.nullable().optional() }).strict(),
    siteSummary: z.array(z.object({ site: z.literal('doboku-note'), ...a8Amounts }).strict()).describe('このサイトの実績（期間ごと）'),
    monthly: z.array(z.object({ month, accountWide: z.literal(true), ...a8Amounts }).strict()).describe('口座全体の月別'),
    daily: z.array(z.object({ date: jstDate('日付'), month, accountWide: z.literal(true), ...a8Amounts }).strict()).describe('口座全体の日別'),
    programPeriod: z
      .array(z.object({ ...a8Program, program: z.string().nullable().describe('config/affiliate-programs の id。対応が無いものは null'), accountWide: z.literal(true), ...a8Amounts }).strict())
      .describe('口座全体のプログラム別'),
    crossCheck: z.looseObject({ comparable: z.boolean(), period: z.string() }).describe('サイト実績とプログラム別の突き合わせ'),
    unmapped: z.array(z.object({ ...a8Program, clicks: count('クリック数'), grossRevenueYen: yen('発生報酬') }).strict()),
    notAttributable: z.array(z.unknown()),
    missingProgramCandidates: z.array(z.object({ ...a8Program, clicks: count('クリック数'), grossRevenueYen: yen('発生報酬') }).strict()),
    unmappedCount: count('対応の無いプログラムの数'),
  })
  .strict()
  .meta({ title: 'A8 レポート' });

// 事業の記録（data/business/records/）。中身の整合（資格・指標・期間・訂正の規則）は business-direction.mjs の validateRecord が見る。
// ここは形だけを見る。記録は追記のみで書き換えないので、型は過去の記録が通る形にする
const recordBase = {
  qualification: z.string().min(1).describe('資格 id か all'),
  period,
  supersedes: z.string().optional().describe('訂正した記録のパス'),
  schemaVersion: z.literal(1),
  createdAt: utcTime('記録日時'),
  strategyHash: sha256.describe('記録したときの事業方針のハッシュ'),
};

/** 計測の記録 */
export const BusinessMeasurement = z
  .object({
    kind: z.literal('measurement'),
    ...recordBase,
    channel: z.enum(['GA4', 'GSC', 'note', 'KDP', 'coconala', 'operations', 'instagram', 'cloudflare']),
    subject: z.string().min(1).describe('aggregate か指標 id'),
    coverage: z.enum(['complete', 'partial']),
    source: z.string().min(1).max(500).describe('出典（秘密情報・URL クエリを含めない）'),
    values: z.record(z.string(), z.number().int().min(0).nullable()).describe('指標 id → 値'),
  })
  .strict()
  .meta({ title: '事業の計測' });

/** 計測のスナップショット（資格×指標の表と、そのときの事業方針） */
export const BusinessSnapshot = z
  .object({
    kind: z.literal('snapshot'),
    ...recordBase,
    strategy: z.looseObject({ qualifications: z.array(z.looseObject({ id: z.string() })), metrics: z.array(z.looseObject({ id: z.string() })) }).describe('記録したときの事業方針（config/business-direction.json の写し）'),
    cells: z
      .array(
        z
          .object({
            qualification: z.string(),
            metric: z.string(),
            value: z.number().nullable(),
            coverage: z.enum(['complete', 'partial', 'missing', 'not-applicable']),
            source: z.string().nullable(),
            note: z.string(),
            target: z.number().nullable(),
            applicable: z.boolean().optional(),
          })
          .strict(),
      )
      .describe('資格×指標'),
    sources: z.array(z.object({ file: z.string(), sha256 }).strict()).describe('集計に使ったファイルとその時点のハッシュ'),
    pendingFinalization: z.array(z.looseObject({ finalizeDate: jstDate('確定日') })).optional(),
  })
  .strict()
  .meta({ title: '事業の計測スナップショット' });

/** 目標の記録 */
export const BusinessTarget = z
  .object({
    kind: z.literal('target'),
    ...recordBase,
    metric: z.string().min(1),
    value: z.number().min(0),
    direction: z.enum(['at-least', 'at-most']),
    effectiveDate: jstDate('適用日'),
    reviewDate: jstDate('見直し日'),
    snapshot: z.string().describe('基準のスナップショット'),
    reason: z.string().min(1),
  })
  .strict()
  .meta({ title: '事業の目標' });

/** レビューの記録 */
export const BusinessReview = z
  .object({
    kind: z.literal('review'),
    ...recordBase,
    cadence: z.enum(['weekly', 'monthly']),
    snapshot: z.string().describe('レビューしたスナップショット'),
    qualificationsReviewed: z.array(z.string()),
    status: z.enum(['complete', 'provisional']),
    findings: z.string().min(1),
    decision: z.string().min(1),
    nextAction: z.string().min(1),
    experimentIds: z.array(z.string().min(1).max(120)),
    nextReviewDate: jstDate('次回のレビュー日'),
  })
  .strict()
  .meta({ title: '事業のレビュー' });

/** 改善の実験台帳（data/business/experiments.json）。実験ごとの記録欄は自由なので、共通の欄だけ型を持つ */
export const Experiments = z
  .object({
    version: z.literal(1),
    updated_at: utcTime('最終更新'),
    experiments: z.array(
      z.looseObject({
        id: z.string().min(1),
        title: z.string().min(1),
        hypothesis: z.string().min(1),
        target_metric: z.string().min(1),
        target_delta: z.string(),
        status: z.enum(['proposed', 'running', 'paused', 'done', 'completed', 'cancelled']),
        result: z.string().nullable().optional(),
        next_check_date: jstDate('次の確認日').nullable().optional(),
      }),
    ),
  })
  .strict()
  .meta({ title: '改善の実験' });

const delta = { userDelta: z.number(), userDeltaPct: z.number().nullable() };
const ga4Block = z.looseObject({
  channels: z.array(z.looseObject({ channel: z.string(), thisUsers: count('今週の人数'), prevUsers: count('前週の人数'), ...delta })),
  total: z.looseObject({ thisUsers: count('今週の人数'), prevUsers: count('前週の人数') }),
});

/** 週次の計測まとめ（data/business/weekly/<週>.json）。欄の名前は既存の snake_case のまま */
export const WeeklyMetrics = z
  .looseObject({
    week_id: z.string().regex(/^\d{4}-W\d{2}$/),
    year: z.number().int(),
    week: z.number().int().min(1).max(53),
    generated_at: utcTime('生成時刻'),
    ranges: z.record(z.string(), z.object({ this: z.object({ start: jstDate('開始'), end: jstDate('終了') }), prev: z.object({ start: jstDate('開始'), end: jstDate('終了') }) })),
    ga4: ga4Block,
    ga4_jp: ga4Block.optional(),
    gsc: z.looseObject({ total: z.looseObject({ thisClicks: count('今週のクリック'), prevClicks: count('前週のクリック') }), topQueries: z.array(z.looseObject({ query: z.string() })) }),
    notes: z.array(z.string()),
  })
  .meta({ title: '週次の計測' });
