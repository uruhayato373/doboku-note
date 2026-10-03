/**
 * dataset-schemas.mjs — 設定・記録の型（zod）。正本はここで、JSON Schema は z.toJSONSchema で生成する。
 *
 * どのファイルにどの型を当てるかは datasets.mjs の台帳が決める（ここはパスを知らない）。
 * 型を足すときの約束（data-storage-decision.md「設定・記録の構成と型の正本」）:
 *   - version 欄は schemaVersion（整数）1 本。既存ファイルの名前（version 等）は移すときに揃え、それまでは今の名前を書く。
 *     schemaVersion 以外の版の欄を持つ型・版の欄が無い型は tests/dataset-schemas.test.mjs の許可リストが数える（増やせない）
 *   - 日時は UTC の ISO 8601（末尾 Z）、日付だけの値は JST の YYYY-MM-DD。意味・単位は .describe() に書く（管理画面に出る）。
 *     +09:00 を許す欄（人が手で書く台帳・予定の時刻）は utcTime でなく isoTime / offsetTime で書き、理由を .describe() に残す
 *   - 人と CI が手で書き足す記録は .strict()（知らない欄が増えたら型を先に直す）
 *   - 型は形（欄・型・語彙・範囲）と、1 つのファイルの中で決まる不変条件（行の一意・合計の一致・日付の前後）を持つ。ファイル間の
 *     整合（資格 id の照合・商品 id の実在）は既存の check-* に任せる（同じ判定を 2 か所に書かない）。不変条件は実データ全件で
 *     違反 0 を確かめたものだけを superRefine に足す。不変の台帳は過去の行を書き換えられないので、過去の行が守らない規則は型に入れない
 *   - 版を上げるときは versioned() に新しい版の型を足し、旧版は消さない（過去のファイル・過去の記録が落ちない）
 */
import { z } from 'zod';
import { jstDayTime, todayJst } from './jst-date.mjs';

const jstDate = (what) => z.iso.date().describe(`${what}（JST の YYYY-MM-DD）`);
/** 取得・記録の時刻。末尾 Z の UTC だけ通す（+09:00 や存在しない日時は通さない）。時差つきで書かれると Date.parse は通るが日付が 1 日ずれる */
const utcTime = (what) => z.iso.datetime().describe(`${what}（UTC の ISO 8601・末尾 Z）`);
/** 時差つきの ISO 8601（Z か ±HH:MM）。予定の時刻のように JST の +09:00 で書く欄だけ使い、理由を .describe() に書く */
const offsetTime = (what) => z.iso.datetime({ offset: true }).describe(`${what}（時差つきの ISO 8601。JST の +09:00 を含む）`);
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'YYYY-MM（月は 01〜12）');
const yen = (what) => z.number().int().min(0).describe(`${what}（円）`);
/** 返品・調整で負になりうる金額（KDP のロイヤリティ） */
const signedYen = (what) => z.number().int().describe(`${what}（円・返品で負になりうる）`);
const count = (what) => z.number().int().min(0).describe(what);
/** null を許す型。説明は元の説明に null の意味を足す（管理画面の表は外側の説明を出す） */
const orNull = (schema, why) => schema.nullable().describe(`${schema.description}。${why}`);
/** 日付か UTC の時刻（実験の開始日のように、日付だけで書かれた古い行と時刻つきの新しい行が混ざる欄） */
const jstDateOrUtcTime = (what) =>
  z
    .string()
    .refine((s) => z.iso.date().safeParse(s).success || z.iso.datetime().safeParse(s).success, 'YYYY-MM-DD か UTC の ISO 8601（末尾 Z）')
    .describe(`${what}（JST の日付か UTC の ISO 8601）`);

// ---- 不変条件の部品（superRefine から使う） ----------------------------------------------

const flag = (ctx, path, message) => ctx.addIssue({ code: 'custom', path, message });

/**
 * 配列の行が key（欄の名前か、行から値を作る関数）で一意であること。2 行目以降の重複を、その行を指して報告する。
 * 使い方: z.array(行).superRefine(uniqueBy('talkroomId'))。key の値が null・undefined の行は数えない
 */
export const uniqueBy = (key, what = typeof key === 'string' ? key : '値') => {
  const keyOf = typeof key === 'function' ? key : (row) => row?.[key];
  return (rows, ctx) => {
    const first = new Map();
    rows.forEach((row, i) => {
      const k = keyOf(row);
      if (k === undefined || k === null) return;
      if (first.has(k)) flag(ctx, [i], `${what}「${k}」が重複（${first.get(k) + 1} 行目と同じ）`);
      else first.set(k, i);
    });
  };
};

/** 部分の合計が total に一致するか。丸めで数円ずれる集計は tolerance（円）で許す */
export const sumEquals = (parts, total, tolerance = 0) => Math.abs(parts.reduce((a, b) => a + b, 0) - total) <= tolerance;

/** YYYY-MM-DD が月曜か（暦の計算なので時差に依らない） */
export const isMonday = (date) => new Date(`${date}T00:00:00Z`).getUTCDay() === 1;

/** YYYY-MM の月末日（28〜31） */
const lastDayOfMonth = (m) => new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0)).getUTCDate();

/** ISO 8601 の日時の JST の日付。時差の無い値は JST の壁時計とみなす（人が書く台帳の日時は JST） */
const jstDayOf = (s) => jstDayTime(/(?:Z|[+-]\d{2}:\d{2})$/.test(s) ? s : `${s}+09:00`)?.date ?? null;

/** ISO 8601 の日時のエポックミリ秒。時差の無い値は JST の壁時計とみなす */
const toMs = (s) => Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/.test(s) ? s : `${s}+09:00`);

const mondayDate = (what) => jstDate(what).refine(isMonday, '月曜日の日付ではない');

/**
 * 版つきの型。版の欄（field）の値で型を選ぶ判別共用体で、versions は { 版: その版の z.object（版の欄は書かない） }。
 * 版を上げるときは新しい版を足して旧版は残す（その版で書かれた過去のファイル・不変の台帳の過去の記録が落ちない）。
 * 版の欄は schemaVersion に揃える（既存ファイルの version 等は移すときに揃え、それまでは今の名前を渡す）
 */
export function versioned(field, versions) {
  const members = Object.entries(versions).map(([v, shape]) => shape.extend({ [field]: z.literal(Number(v)) }));
  return z.discriminatedUnion(field, members);
}

/** 販売価格の上限（円）。実データの最大は 11,800。桁違いの記録ミスを止める上限で、これを超える商品を売るときはここを上げる */
const NOTE_PRICE_MAX = 50_000;

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
            productId: z.string().min(1).describe('src/lib/note-magazines.ts の id。単品記事は article:<slug>・メンバーシップは membership:<プラン>'),
            title: z.string(),
            type: z.enum(['magazine', 'article', 'membership']).describe('マガジン・単品記事・メンバーシップ。productId の接頭辞（無し・article:・membership:）と一致する'),
            price: z.number().int().min(1).max(NOTE_PRICE_MAX).describe('販売価格（円）'),
          })
          .strict(),
      )
      .describe('1 取引 1 行。同じ日に同じ商品が 2 件売れると同じ内容の行が並ぶので、丸ごと重複した行は誤りとは限らない（月の件数と合計で突合する）'),
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
      .describe('月ごとの取得記録。取得したときの件数と総額で、その月の sales の行と一致する（note-sales-fetch が月ごと差し替える）'),
  })
  .strict()
  .superRefine((log, ctx) => {
    const today = todayJst();
    const typeOfId = (id) => (id.startsWith('article:') ? 'article' : id.startsWith('membership:') ? 'membership' : 'magazine');
    log.sales.forEach((s, i) => {
      if (s.date > today) flag(ctx, ['sales', i, 'date'], `販売日 ${s.date} が今日（${today}）より先`);
      if (typeOfId(s.productId) !== s.type) flag(ctx, ['sales', i, 'type'], `type ${s.type} と productId ${s.productId} の接頭辞が合わない`);
    });
    for (const [m, rec] of Object.entries(log.months)) {
      const rows = log.sales.filter((s) => s.date.slice(0, 7) === m);
      if (rows.length !== rec.count) flag(ctx, ['months', m, 'count'], `件数 ${rec.count} が sales の ${m} の行数 ${rows.length} と合わない`);
      if (!sumEquals(rows.map((s) => s.price), rec.total)) flag(ctx, ['months', m, 'total'], `総額 ${rec.total} が sales の ${m} の合計と合わない`);
    }
  })
  .meta({ title: 'note の販売履歴' });

const kdpAmounts = { ebook: signedYen('電子書籍のロイヤリティ'), print: signedYen('ペーパーバックのロイヤリティ'), kenp: signedYen('KENP のロイヤリティ') };

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
            range: z.object({ start: jstDate('集計の開始日'), end: jstDate('集計の終了日') }).strict().describe('集計の期間（その月の 1 日〜月末）'),
            estimated: z.boolean().describe('推計値なら true（KENP の確定前）'),
            total: z.object({ bookCount: count('本の数'), ...kdpAmounts, royalty: signedYen('ロイヤリティの合計') }).strict().describe('アカウント全体の合計。royalty は 3 項目の合計（各項目の丸めで 1 円ずれうる）'),
            kenpPagesRead: orNull(count('KENP の既読ページ数（マーケットプレイスの合計）'), 'マーケットプレイス別を読めなかった月は null'),
            marketplaces: z
              .array(
                z
                  .object({
                    marketplace: z.string(),
                    currency: z.string(),
                    ebook: signedYen('電子書籍'),
                    paperback: signedYen('ペーパーバック'),
                    hardcover: signedYen('ハードカバー'),
                    kenpPages: count('KENP の既読ページ数'),
                  })
                  .strict(),
              )
              .nullable()
              .describe('マーケットプレイス別。画面から読めなかった月は null（0 件と区別する）'),
            books: z
              .array(
                z
                  .object({
                    bookId: z.string().nullable().describe('content/kindle の本の id。このサイト以外の本は null'),
                    title: z.string(),
                    ...kdpAmounts,
                    royalty: signedYen('ロイヤリティ'),
                  })
                  .strict(),
              )
              .describe('本ごと。ロイヤリティの降順'),
            scope: z
              .object({
                accountBookCount: count('アカウントの本の数'),
                accountRows: count('レポートの行数'),
                externalRows: count('このサイト以外の本の行数'),
                expectedDobokuBooks: count('このサイトの本として期待する数'),
                matchedDobokuBooks: count('照合できたこのサイトの本の数'),
                missingDobokuBookIds: z.array(z.string()),
                dobokuRoyalty: signedYen('このサイトの本のロイヤリティ'),
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
  .superRefine((log, ctx) => {
    for (const [m, e] of Object.entries(log.months)) {
      const at = (...path) => ['months', m, ...path];
      if (e.range.start !== `${m}-01` || e.range.end !== `${m}-${String(lastDayOfMonth(m)).padStart(2, '0')}`) {
        flag(ctx, at('range'), `集計の期間 ${e.range.start}〜${e.range.end} が ${m} の 1 日〜月末ではない`);
      }
      // 3 項目はそれぞれ丸めて表示されるので、合計が 1 円ずれることがある
      if (!sumEquals([e.total.ebook, e.total.print, e.total.kenp], e.total.royalty, 1)) flag(ctx, at('total', 'royalty'), `royalty ${e.total.royalty} が ebook＋print＋kenp と合わない`);
      e.books.forEach((b, i) => {
        if (!sumEquals([b.ebook, b.print, b.kenp], b.royalty, 1)) flag(ctx, at('books', i, 'royalty'), `${b.title}: royalty ${b.royalty} が ebook＋print＋kenp と合わない`);
      });
      // 本ごとにも丸めるので、1 冊あたり最大 0.5 円ずれる。ページ送りで取りこぼした本があると、これを超えて合わない
      if (!sumEquals(e.books.map((b) => b.royalty), e.total.royalty, Math.ceil(e.books.length / 2))) {
        flag(ctx, at('books'), `本ごとの royalty の合計が全体 ${e.total.royalty} と合わない（取りこぼしか誤記）`);
      }
      if (e.marketplaces && e.kenpPagesRead !== null && e.kenpPagesRead !== e.marketplaces.reduce((a, x) => a + x.kenpPages, 0)) {
        flag(ctx, at('kenpPagesRead'), `kenpPagesRead ${e.kenpPagesRead} が marketplaces の kenpPages の合計と合わない`);
      }
      if (e.scope) {
        if (e.scope.accountBookCount !== e.total.bookCount) flag(ctx, at('scope', 'accountBookCount'), `${e.scope.accountBookCount} が total.bookCount ${e.total.bookCount} と合わない`);
        if (e.scope.accountRows !== e.books.length) flag(ctx, at('scope', 'accountRows'), `${e.scope.accountRows} が books の行数 ${e.books.length} と合わない`);
        const external = e.books.filter((b) => b.bookId === null).length;
        if (e.scope.externalRows !== external) flag(ctx, at('scope', 'externalRows'), `${e.scope.externalRows} が bookId の無い本の行数 ${external} と合わない`);
      }
    }
  })
  .meta({ title: 'KDP のロイヤリティ' });

// 人が手で書く台帳の日時は JST の時差つき・分まで（例 2026-08-05T11:59+09:00）。秒は省略可。存在しない日時は通さない（2026-99-99T99:99 も 2026-02-30T10:00 も）。
// 時差の無い値は読み手の実行環境のタイムゾーンで解釈される（CI は UTC で 9 時間ずれる）ので、時差は必須。画面の表示をそのまま取る欄だけ zone: false で省略を許す
const ISO_TIME = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/;
const isoTime = (what, { zone = true } = {}) =>
  z
    .string()
    .regex(ISO_TIME, `ISO 8601 の日時（時刻は 00:00〜23:59${zone ? '・時差つき（+09:00 か Z）' : ''}）`)
    .refine((s) => z.iso.date().safeParse(s.slice(0, 10)).success, '存在しない日付')
    .refine((s) => !zone || /(?:Z|[+-]\d{2}:\d{2})$/.test(s), '時差（+09:00 か Z）が要る')
    .describe(`${what}（ISO 8601・分まで可${zone ? '・時差つき' : '・時差は省略可（JST の壁時計）'}）`);
const period = z.object({ startDate: jstDate('開始日'), endDate: jstDate('終了日') }).strict().describe('対象期間（両端を含む）');
const sha256 = z.string().regex(/^[0-9a-f]{64}$/, 'SHA-256（16 進 64 桁）');

/** 受注 1 件の型（版の欄を除く）。版つきの型 CoconalaOrders がこれに版の欄を足す */
const CoconalaOrderRow = z
  .object({
    date: jstDate('販売日'),
    serviceId: z.string().min(1).describe('src/lib/coconala-services.ts の id'),
    talkroomId: z.string().regex(/^\d+$/).describe('トークルーム ID（取引の一意キー）'),
    priceYen: yen('販売額（手数料差引前）'),
    grade: z.union([z.literal(1), z.literal(2)]).nullable().describe('級。級の無い商品は null'),
    status: z.enum(['received', 'delivered', 'revised', 'closed']).describe('received → delivered → revised → closed。received 以外は納品日時がある'),
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
          .object({
            overall: z.number().int().min(1).max(5).describe('総合（1〜5）'),
            demand: z.number().int().min(1).max(5).describe('要望（1〜5）'),
            communication: z.number().int().min(1).max(5).describe('対応（1〜5）'),
            schedule: z.number().int().min(1).max(5).describe('期日（1〜5）'),
          })
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
  .strict()
  .superRefine((o, ctx) => {
    if (o.status !== 'received' && !o.deliveredAt) flag(ctx, ['deliveredAt'], `status が ${o.status} なのに納品日時が無い`);
    if (o.deliveredAt && jstDayOf(o.deliveredAt) < o.date) flag(ctx, ['deliveredAt'], `納品日時 ${o.deliveredAt} が販売日 ${o.date} より前`);
    if (o.quote && toMs(o.quote.proposedAt) > toMs(o.quote.purchasedAt)) flag(ctx, ['quote', 'proposedAt'], '見積りの提案日時が購入日時より後');
    const r = o.rating;
    if (r?.comment != null && r.commentChars !== [...r.comment].length) flag(ctx, ['rating', 'commentChars'], `commentChars ${r.commentChars} がコメントの字数 ${[...r.comment].length} と合わない`);
  });

/** ココナラの受注（data/coconala/orders.json）。購入者名・原稿・トークルーム本文は記録しない。版の欄は今も version（移すときに schemaVersion へ） */
export const CoconalaOrders = versioned('version', {
  2: z.object({
    updatedAt: isoTime('最終更新'),
    currency: z.literal('JPY'),
    source: z.string(),
    privacyNote: z.string(),
    howToUpdate: z.string(),
    schema: z.record(z.string(), z.string()).describe('欄ごとの説明（ファイル内の手引き）'),
    orders: z.array(CoconalaOrderRow).superRefine(uniqueBy('talkroomId', 'talkroomId')).describe('1 受注 1 行'),
  }).strict(),
}).meta({ title: 'ココナラの受注' });

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
    schemaVersion: z.literal(3),
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
      .array(z.object({ ...a8Program, program: z.string().nullable().describe('提携案件の id（台帳 affiliate.catalog の programs のキー）。対応が無いものは null'), accountWide: z.literal(true), ...a8Amounts }).strict())
      .describe('口座全体のプログラム別。案件に対応した行（全期間）と、当期の対応の無い行（他サイト分）だけ。月次の成果はここの単月の期間から導く'),
    crossCheck: z.looseObject({ comparable: z.boolean(), period: z.string() }).describe('サイト実績とプログラム別の突き合わせ'),
    notAttributable: z.array(z.unknown()).describe('対象期間が単月でなく月次の成果に写せなかった行'),
    missingProgramCandidates: z.array(z.object({ ...a8Program, clicks: count('クリック数'), grossRevenueYen: yen('発生報酬') }).strict()).describe('取りこぼしの疑い（サイト別を説明しきれないときだけ・他サイト分を除いた候補）'),
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
    strategy: z.looseObject({ qualifications: z.array(z.looseObject({ id: z.string() })), metrics: z.array(z.looseObject({ id: z.string() })) }).describe('記録したときの事業方針（台帳 config.business-direction の写し）'),
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

/** 実験の状態。コードとスキル（/nsm-experiment）が書く語彙は proposed → running → measuring → done と、中止の abandoned */
const experimentStatus = z.enum(['proposed', 'running', 'measuring', 'done', 'abandoned']).describe('proposed → running → measuring → done。中止は abandoned（旧名の completed・cancelled は done・abandoned に揃えた）');

const measureWindow = z
  .object({
    startDate: jstDate('開始日'),
    endDate: jstDate('終了日'),
    value: z.number().nullable().describe('窓の値（欠測は null）'),
    volume: z.number().min(0).describe('判定に足る母数（順位なら表示回数）'),
  })
  .strict();

/** measure-experiments.mjs が measurements[] に足す自動計測の 1 行。手で書いた計測（source が auto 以外）は欄が自由なので型を持たない */
const AutoMeasurement = z
  .object({
    source: z.literal('auto'),
    measuredAt: utcTime('計測時刻'),
    specHash: z.string().regex(/^[0-9a-f]{12}$/).describe('measure 仕様のハッシュ。同じ仕様・同じ事後窓の再計測を省くのに使う'),
    metric: z.string(),
    pre: measureWindow.describe('事前窓'),
    post: measureWindow.describe('事後窓'),
    complete: z.boolean().describe('事後窓が確定したか（途中なら false）'),
    salesLedgerThrough: jstDate('売上台帳の最終販売日（売上の指標だけ）').nullable().optional(),
    deltaPct: z.number().nullable().describe('日あたりの変化率（%）。順位は差'),
    verdictHint: z.string().describe('判定の目安（裁定ではない）。語彙は experiment-measure.mjs の verdictHint'),
  })
  .strict();

/**
 * 実験の measure 仕様（running / measuring の実験に付けると CI が前後の窓で自動計測する）。任意: 前後比較できない実験（EXP-008・010 など）には付けない。
 * 仕様の語彙・範囲（metric の種類・scope の組み合わせ・preDays の下限）の検査は experiment-measure.mjs の specErrors が持つ
 */
const ExperimentMeasure = z.looseObject({
  specVersion: z.literal(1),
  metric: z.string().min(1).describe('gsc.clicks / gsc.impressions / gsc.position / ga4.sessions / ga4.event:<名前> / sales.revenue / sales.count'),
  scope: z.looseObject({
    pages: z.array(z.string()).optional(),
    pagePrefix: z.string().optional(),
    source: z.string().optional(),
    productPrefix: z.string().optional(),
    productIds: z.array(z.string()).optional(),
  }),
  anchor: jstDate('前後の境目（既定は開始日）').optional(),
  preDays: z.number().int().min(1).describe('事前窓の日数'),
  postDays: z.number().int().min(1).describe('事後窓の日数'),
  lagDays: z.number().int().min(0).optional().describe('境目から事後窓までの空き日数'),
  direction: z.enum(['increase', 'decrease']),
  minEffect: z.number().optional(),
  minVolume: z.number().optional(),
  target: z.number().min(0).optional().describe('事後窓の絶対目標（新商品の売上など前後比が意味を持たない実験）'),
  note: z.string().optional(),
});

/** 履歴の 1 行。古い行は date（日付か時刻）、新しい行は at（時刻）に日時を持つ */
const ExperimentHistoryEntry = z
  .looseObject({ date: jstDateOrUtcTime('日付').optional(), at: utcTime('日時').optional() })
  .refine((h) => h.date !== undefined || h.at !== undefined, 'date か at のどちらかに日時が要る');

const Experiment = z
  .looseObject({
    id: z.string().min(1),
    title: z.string().min(1),
    kind: z.string().optional().describe('seo-rank-watch は seo-rank-watch.mjs が書く検索順位の実験（hypothesis・target_delta を持たない）。それ以外は無い'),
    hypothesis: z.string().min(1).optional().describe('仮説。kind が seo-rank-watch でない実験では必須'),
    target_metric: z.string().min(1).optional().describe('指標。kind が seo-rank-watch でない実験では必須'),
    target_delta: z.string().optional().describe('目標の変化。kind が seo-rank-watch でない実験では必須'),
    status: experimentStatus,
    created_at: jstDateOrUtcTime('起票').optional(),
    started_at: jstDateOrUtcTime('開始').optional(),
    closed_at: jstDateOrUtcTime('終了').nullable().optional(),
    result: z.string().nullable().optional(),
    next_check_date: jstDate('次の確認日').nullable().optional(),
    baseline: z.record(z.string(), z.unknown()).optional().describe('開始時点の基準値（欄は実験ごとに違う）'),
    history: z.array(ExperimentHistoryEntry).optional(),
    pending_user_actions: z.array(z.looseObject({ action: z.string() })).optional().describe('人が手を打つ残作業'),
    measure: ExperimentMeasure.optional(),
    measurements: z.array(z.looseObject({ source: z.string().optional() })).optional().describe('計測の記録。source が auto の行は measure-experiments.mjs が追記する'),
    watchId: z.string().optional().describe('seo-rank-watch の実験が指す見張りの id'),
    actions: z.array(z.union([z.string(), z.looseObject({})])).optional().describe('施策の一覧。手で書いた実験は文字列の行、seo-rank-watch の実験はオブジェクト'),
    reviewDays: z.number().int().min(1).optional().describe('seo-rank-watch の再計測の窓（7・14・28 日）'),
  })
  .superRefine((e, ctx) => {
    if (e.kind === 'seo-rank-watch') {
      if (!e.watchId) flag(ctx, ['watchId'], 'seo-rank-watch の実験には watchId が要る');
      for (const k of ['actions', 'history']) if (e[k] === undefined) flag(ctx, [k], `seo-rank-watch の実験には ${k} が要る`);
    } else {
      for (const k of ['hypothesis', 'target_metric', 'target_delta']) if (e[k] === undefined) flag(ctx, [k], `${k} が要る（seo-rank-watch 以外の実験）`);
    }
    (e.measurements ?? []).forEach((m, i) => {
      if (m.source !== 'auto') return;
      const r = AutoMeasurement.safeParse(m);
      if (!r.success) for (const issue of r.error.issues) flag(ctx, ['measurements', i, ...issue.path], issue.message);
    });
  });

/** 改善の実験台帳（data/business/experiments.json）。実験ごとの記録欄は自由なので、共通の欄だけ型を持つ */
export const Experiments = z
  .object({
    version: z.literal(1),
    updated_at: utcTime('最終更新'),
    experiments: z.array(Experiment).superRefine(uniqueBy('id', '実験の id')),
  })
  .strict()
  .meta({ title: '改善の実験' });

const delta = { userDelta: z.number(), userDeltaPct: z.number().nullable() };
const ga4Block = z.looseObject({
  channels: z.array(z.looseObject({ channel: z.string(), thisUsers: count('今週の人数'), prevUsers: count('前週の人数'), ...delta })),
  total: z.looseObject({ thisUsers: count('今週の人数'), prevUsers: count('前週の人数') }),
});

/** ココナラ画面の集計期間（30 日累計）。period の日数と一致する */
const kpiWindow = {
  period: z.object({ from: jstDate('開始'), to: jstDate('終了') }).strict(),
  windowDays: z.literal(30).describe('集計日数（ココナラ画面の過去 30 日間）'),
  cumulative: z.literal(true).describe('期間の累計であって週次の増分ではない'),
};
const kpiWindowMatches = (row, ctx) => {
  const days = (Date.parse(row.period.to) - Date.parse(row.period.from)) / 86_400_000 + 1;
  if (days !== row.windowDays) flag(ctx, ['period'], `期間 ${row.period.from}〜${row.period.to} が ${days} 日で windowDays ${row.windowDays} と合わない`);
};

/** ココナラの閲覧・お気に入りの週次（data/coconala/kpi.json）。数値はココナラ画面の 30 日累計 */
export const CoconalaKpi = z
  .object({
    version: z.literal(1),
    updatedAt: jstDate('最終更新'),
    source: z.string(),
    howToUpdate: z.string(),
    weekly: z
      .array(
        z
          .object({
            weekOf: mondayDate('週の月曜'),
            serviceId: z.string().min(1),
            views: count('閲覧'),
            favorites: count('お気に入り'),
            orders: count('購入'),
            ...kpiWindow,
            source: z.string(),
          })
          .strict()
          .superRefine(kpiWindowMatches),
      )
      .superRefine(uniqueBy((w) => `${w.weekOf}|${w.serviceId}`, '(週, 出品)'))
      .describe('出品ごとの週次。同じ週・同じ出品は 1 行（取り直すと置き換える）'),
    milestones: z.array(z.object({ date: jstDate('日付'), event: z.string(), detail: z.string() }).strict()),
    sellerRank: z.object({ value: z.string(), since: jstDate('昇格日'), source: z.string() }).strict(),
    notificationMailbox: z.object({ address: z.string(), note: z.string(), verifiedAt: jstDate('確認日') }).strict(),
    blogsWeekly: z
      .array(
        z
          .object({
            weekOf: mondayDate('週の月曜'),
            slug: z.string().nullable().describe('ブログ台帳に無い記事は null（題名で識別する）'),
            blogId: z.string().regex(/^\d+$/).nullable().describe('ブログ台帳に無い記事は null'),
            title: z.string(),
            views: count('閲覧'),
            postedOn: jstDate('投稿日'),
            ...kpiWindow,
            source: z.string(),
          })
          .strict()
          .superRefine(kpiWindowMatches),
      )
      .superRefine(uniqueBy((b) => `${b.weekOf}|${b.slug ?? b.title}`, '(週, 記事)')),
  })
  .strict()
  .meta({ title: 'ココナラの閲覧の週次' });

/** 承認したココナラのサムネイル（data/coconala/thumb-approved.json） */
export const CoconalaThumbApproved = z
  .object({
    _doc: z.string(),
    approvedAt: jstDate('承認日'),
    design: z.string(),
    images: z.record(z.string(), z.object({ path: z.string(), sha256 }).strict()).describe('サービス id → 承認した画像'),
  })
  .strict()
  .meta({ title: 'ココナラのサムネイル承認' });

/** 人が決着と判断した DM（data/coconala/resolved-inquiries.json） */
export const CoconalaResolvedInquiries = z
  .object({
    _comment: z.string(),
    _updatedAt: jstDate('最終更新'),
    resolved: z.array(z.object({ dmId: z.string().regex(/^\d+$/), reason: z.string().min(1), resolvedOn: z.union([jstDate('決着日'), isoTime('決着日時')]) }).strict()),
  })
  .strict()
  .meta({ title: 'ココナラの決着した問い合わせ' });

/** 引用リポスト済みの記録（data/x/reposted.json）。重複リポストを防ぐ */
export const XReposted = z
  .object({
    _comment: z.string(),
    reposted: z.array(
      z
        .object({
          id: z.string().regex(/^\d+$/),
          url: z.string().url(),
          comment: z.string(),
          exam: z.string(),
          reason: z.string(),
          repostedAt: utcTime('リポスト時刻'),
          handle: z.string().optional(),
        })
        .strict(),
    ),
  })
  .strict()
  .meta({ title: 'X の引用リポスト' });

/** YouTube の投稿済み（data/youtube/posted.jsonl・1 行 1 本） */
export const YoutubePosted = z
  .array(
    z
      .object({
        key: z.string().min(1),
        videoId: z.string().min(1),
        publishAt: offsetTime('公開予定（予定表の書式で JST の +09:00。直近に繰り下げた行は UTC の Z）'),
        title: z.string(),
        uploadedAt: utcTime('アップロード時刻'),
      })
      .strict(),
  )
  .superRefine(uniqueBy('videoId', 'videoId'))
  .superRefine(uniqueBy('key', 'key'))
  .meta({ title: 'YouTube の投稿済み' });

// 順位の見張り（data/gsc/rank-watch/<月>.jsonl・追記だけ）。行の中身は seo-rank-watch.mjs が決める。
// recordId の接頭辞と type が対応する: watch-（計測 measurement・施策後の再計測 review）と run-（判断 decision・方針の見直し policy-review）
const rankMetrics = z
  .object({
    rank: z.number().min(1).nullable().describe('平均掲載順位。表示が無い窓は null'),
    impressions: count('表示回数'),
    clicks: count('クリック数'),
    ctr: z.number().min(0).max(1).nullable().describe('クリック率。表示が無い窓は null'),
    activeDays: count('表示のあった日数'),
  })
  .strict();
const rankWindow = z
  .object({
    window: z.object({ startDate: jstDate('開始日'), endDate: jstDate('終了日') }).strict(),
    metrics: rankMetrics,
    raw: z.looseObject({
      meta: z.looseObject({ siteUrl: z.string(), dataState: z.string(), startDate: jstDate('開始日'), endDate: jstDate('終了日'), truncated: z.boolean() }),
      rows: z.array(z.looseObject({ keys: z.array(z.string()), clicks: count('クリック'), impressions: count('表示'), position: z.number().min(0) })),
    }),
  })
  .strict();
const rankWatchRow = {
  version: z.literal(1),
  watchId: z.string().min(1),
  scope: z.looseObject({
    id: z.string().min(1),
    keyword: z.string().min(1),
    targetPath: z.string().regex(/^\//, '/ で始まるパス'),
    contentPath: z.string().min(1),
    priority: z.number().int().min(1).max(3),
    enabled: z.boolean(),
  }),
  scopeKey: sha256.describe('見張りの対象（語・ページ・国・端末）のハッシュ'),
  fetchedAt: utcTime('取得時刻'),
  before: rankWindow,
  after: rankWindow,
  contentHash: sha256.describe('見張ったページの本文のハッシュ'),
};
const watchRecordId = z.string().regex(/^watch-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[0-9a-f]{8}$/, 'watch-<時刻>-<8 桁>');
const runRecordId = z.string().regex(/^run-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[0-9a-f]{8}$/, 'run-<時刻>-<8 桁>');
const rankRunRow = {
  recordId: runRecordId,
  version: z.literal(1),
  date: jstDate('記録日'),
  configHash: sha256.describe('見張りの設定のハッシュ'),
  strategy: z.looseObject({ version: z.number().int(), reviewedAt: jstDate('方針の見直し日'), focusQualifications: z.array(z.string()) }),
  selectionOrder: z.string(),
  selectedId: z.string().nullable().describe('選んだ見張りの id。選ばなかったときは null'),
  candidateId: z.string().nullable(),
  result: z.enum(['ready', 'failed', 'policy-review-due', 'capacity-limit', 'no-candidate']),
  activeExperiments: z.array(z.looseObject({ id: z.string() })),
  due: z.array(z.unknown()),
  policyNextReviewDate: jstDate('次の方針の見直し日'),
  candidates: z.array(z.looseObject({ id: z.string() })),
  qualifications: z.array(z.looseObject({ id: z.string() })),
  rows: z.array(z.looseObject({ id: z.string(), keyword: z.string(), targetPath: z.string() })),
  note: z.string(),
  recordedAt: utcTime('記録時刻'),
  fingerprint: sha256.describe('記録の中身のハッシュ（同じ判断を二重に書かない）'),
};

/** 順位の見張り（data/gsc/rank-watch/<月>.jsonl・追記だけ）。行の種類は type で決まる */
export const RankWatch = z
  .array(
    z.discriminatedUnion('type', [
      z.object({ recordId: watchRecordId, type: z.literal('measurement'), ...rankWatchRow }).strict(),
      z
        .object({
          recordId: watchRecordId,
          type: z.literal('review'),
          ...rankWatchRow,
          actionIndex: count('施策の番号'),
          days: count('再計測の窓（日）'),
          deployedAt: utcTime('本番反映の時刻'),
        })
        .strict(),
      z.object({ type: z.literal('decision'), ...rankRunRow }).strict(),
      z.object({ type: z.literal('policy-review'), ...rankRunRow }).strict(),
    ]),
  )
  .superRefine(uniqueBy('recordId', 'recordId'))
  .meta({ title: '順位の見張り' });

// ---- 不変の証拠（data/business/records/ の突合と点検の結果）------------------------------------
// 書き手のスクリプトが出力を決める。書き手が欄を足したら型を先に直す（.strict()）。追記だけなので、過去の記録が通る形にする

const clickStatus = z.enum(['exact', 'window-mismatch', 'missing']).describe('GA4 の窓が月と一致（exact）・ずれ（window-mismatch）・月と重ならない（missing）');
const salesReconciliationStatus = z.enum(['match', 'match-partial-month', 'mismatch', 'unverified']);

/** サイトの note 送客クリック × note の売上の暦月の突合（data/business/records/site-to-sales-<月>.json）。書き手は scripts/report-site-to-sales.mjs */
export const BusinessSiteToSales = z
  .object({
    schemaVersion: z.literal(1),
    month,
    period: z.object({ startDate: jstDate('開始日'), endDate: jstDate('終了日') }).strict().describe('対象の暦月（1 日〜月末）'),
    joinKey: z.string().describe('商品を結ぶキーの説明'),
    clicks: z
      .object({
        status: clickStatus,
        file: z.string().nullable().describe('使った GA4 の取得ファイル。無い月は null'),
        window: z.object({ startDate: jstDate('開始日'), endDate: jstDate('終了日') }).strict().nullable().describe('その取得の窓'),
        overlapDays: count('月と重なる日数'),
        outsideDays: count('月の外の日数'),
        labelRows: count('label の行数'),
        total: orNull(count('クリックの合計'), 'GA4 が月と重ならない月は null（0 にしない）'),
        resolved: count('商品へ解決できたクリック').nullable(),
        unresolved: z.array(z.object({ label: z.string(), clicks: count('クリック数'), reason: z.string() }).strict()).describe('商品へ結べなかったクリック（除外して黙らず理由を残す）'),
      })
      .strict(),
    noteReferral: z
      .object({
        status: z.enum(['missing', 'not-measurable', 'measured', 'partial-month']),
        file: z.string().nullable(),
        fetchedAt: utcTime('取得時刻').nullable(),
        siteReferredViews: count('サイト経由の閲覧').nullable(),
        totalViews: count('全体の閲覧').nullable(),
        noReferrerViews: count('no referrer の閲覧').nullable(),
        note: z.string().nullable().optional(),
        dashboardSales: z.object({ yen: yen('note の月次売上表示'), file: z.string(), fetchedAt: utcTime('取得時刻') }).strict().nullable(),
        perProduct: z.literal('unresolvable'),
        perProductReason: z.string(),
      })
      .strict()
      .describe('note の流入元（アカウント全体の月次値だけ）'),
    sales: z
      .object({
        count: count('売上の件数'),
        revenue: yen('売上の合計'),
        resolved: count('商品へ解決できた件数'),
        unresolved: z.array(z.object({ productId: z.string().optional(), title: z.string(), price: yen('価格'), reason: z.string() }).strict()),
        reconciliation: z
          .object({
            dashboardYen: yen('note の月次売上表示').nullable(),
            logYen: yen('販売履歴の月の合計'),
            status: salesReconciliationStatus,
            source: z.string().nullable(),
            fetchedAt: utcTime('表示の取得時刻').nullable(),
          })
          .strict(),
      })
      .strict(),
    products: z
      .array(
        z
          .object({
            productId: z.string().min(1),
            kind: z.enum(['catalog', 'article', 'membership']),
            inCatalog: z.boolean(),
            clicks: orNull(count('サイトのクリック'), 'GA4 が無い月は null'),
            impressions: count('サイトの表示').nullable(),
            sales: count('販売件数'),
            revenue: yen('売上'),
            containedIn: z.array(z.string()).describe('収録されているマガジンの id'),
            containedArticleSales: count('収録単品の販売件数（各収録マガジンへ重複して載せた非加算値）'),
            containedArticleRevenue: yen('収録単品の売上（非加算値）'),
            topPlacements: z.array(z.object({ placement: z.string(), clicks: count('クリック数') }).strict()).max(3),
            siteReferredViews: z.null().describe('商品別は解決不能'),
            status: z.object({ clicks: clickStatus, sales: z.enum(['reconciled', 'partial-month', 'mismatch', 'unverified']), siteReferredViews: z.literal('unresolvable') }).strict(),
          })
          .strict(),
      )
      .superRefine(uniqueBy('productId', 'productId')),
    summary: z.object({ products: count('商品の数'), productsWithClicks: count('クリックのある商品'), productsWithSales: count('販売のある商品'), productsWithClicksAndSales: count('クリックも販売もある商品') }).strict(),
    limitations: z.array(z.string()),
    inputs: z
      .object({
        ga4: z.string().nullable(),
        noteReferrers: z.string().nullable(),
        sales: z.string(),
        salesLogUpdatedAt: z.string().nullable(),
        catalog: z.string(),
        magazineSnapshot: z.string().nullable(),
      })
      .strict()
      .describe('使った入力'),
  })
  .strict()
  .superRefine((r, ctx) => {
    if (r.period.startDate !== `${r.month}-01` || r.period.endDate !== `${r.month}-${String(lastDayOfMonth(r.month)).padStart(2, '0')}`) flag(ctx, ['period'], `期間が ${r.month} の 1 日〜月末ではない`);
    const c = r.clicks;
    if (c.total !== null && c.resolved !== null && c.total !== c.resolved + c.unresolved.reduce((a, u) => a + u.clicks, 0)) flag(ctx, ['clicks', 'total'], 'クリックの合計が「解決＋未解決」と合わない');
    if (r.sales.count !== r.sales.resolved + r.sales.unresolved.length) flag(ctx, ['sales', 'count'], '売上の件数が「解決＋未解決」と合わない');
    if (r.sales.reconciliation.logYen !== r.sales.revenue) flag(ctx, ['sales', 'reconciliation', 'logYen'], `logYen ${r.sales.reconciliation.logYen} が売上の合計 ${r.sales.revenue} と合わない`);
    const s = r.summary;
    if (s.products !== r.products.length) flag(ctx, ['summary', 'products'], '商品の数が products の行数と合わない');
    if (s.productsWithSales !== r.products.filter((p) => p.sales > 0).length) flag(ctx, ['summary', 'productsWithSales'], '販売のある商品の数が products と合わない');
    if (s.productsWithClicks !== r.products.filter((p) => (p.clicks ?? 0) > 0).length) flag(ctx, ['summary', 'productsWithClicks'], 'クリックのある商品の数が products と合わない');
  })
  .meta({ title: 'サイトから売上への突合' });

const checkResult = z
  .object({
    command: z.string().min(1).describe('npm run の名前（node scripts/ 直は「node:」＋スクリプト名）'),
    label: z.string(),
    exitCode: z.number().int().nullable().describe('終了コード。時間切れ・シグナルは null'),
    state: z.enum(['ok', 'fail', 'broken']).describe('0 は ok・1 は fail（要対応）・それ以外は broken（検査不成立）'),
    summary: z.string(),
    seconds: count('所要時間（秒）'),
  })
  .strict()
  .superRefine((c, ctx) => {
    const want = c.exitCode === 0 ? 'ok' : c.exitCode === 1 ? 'fail' : 'broken';
    if (c.state !== want) flag(ctx, ['state'], `exitCode ${c.exitCode} なら state は ${want}`);
  });
const reviewChecksShape = {
  ranAt: utcTime('実行時刻'),
  checks: z.array(checkResult),
  issues: z.array(z.object({ number: z.number().int().min(1), title: z.string(), createdAt: utcTime('作成時刻'), labels: z.array(z.string()) }).strict()).describe('開いていた GitHub Issue'),
  alerts: z
    .array(z.object({ number: z.number().int().min(1), severity: z.string().optional(), package: z.string().optional(), summary: z.string().optional(), createdAt: utcTime('作成時刻') }).strict())
    .optional()
    .describe('開いていた Dependabot のアラート（古い記録には無い）'),
  issuesError: z.string().optional().describe('Issue を読めなかったときの理由（0 件と区別する）'),
  alertsError: z.string().optional().describe('アラートを読めなかったときの理由'),
};

/** 月次レビューの点検の振り分け（data/business/records/checks-monthly-<月>[-<時刻>].json）。書き手は scripts/review-checks.mjs */
export const BusinessChecksMonthly = z
  .object({ cadence: z.literal('monthly'), runKey: month.describe('対象の月'), ...reviewChecksShape })
  .strict()
  .meta({ title: '月次レビューの点検' });

/** 週次レビューの点検の振り分け（data/business/records/checks-weekly-<週>[-<時刻>].json）。書き手は同じ scripts/review-checks.mjs */
export const BusinessChecksWeekly = z
  .object({ cadence: z.literal('weekly'), runKey: z.string().regex(/^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/, 'YYYY-Www').describe('対象の週'), ...reviewChecksShape })
  .strict()
  .meta({ title: '週次レビューの点検' });

// ---- 画面から取る記録（Playwright）。KPI が読む欄は必須・型付きで、画面が変わって取れなくなると型が止める ----------------------

const noteSourceCounts = z.record(z.string(), count('流入元ごとの PV'));
const periodFromTo = z.object({ from: jstDate('開始日'), to: jstDate('終了日') }).strict();

/** note の月間の流入元（data/note/referrers/<月>.json）。取得は scripts/note-traffic-fetch.mjs。summary.salesYen が売上の「完全」判定の基準になる */
export const NoteReferrers = z
  .object({
    schemaVersion: z.literal(1),
    month,
    fetchedAt: utcTime('取得時刻'),
    source: z.string().describe('取得元'),
    period: periodFromTo.describe('対象期間（確定後の月は月初〜月末、月の途中は取得日まで）'),
    monthly: z
      .array(z.object({ month, total: count('PV の合計'), sources: noteSourceCounts }).strict())
      .min(1)
      .describe('月ごとの流入元（時系列テーブル）。total は流入元の合計'),
    targetMonth: z.object({ month, total: count('PV の合計'), sources: noteSourceCounts }).strict().nullable().describe('対象月の行。時系列に無い月は null'),
    pie: z.array(z.object({ source: z.string(), pv: count('PV'), share: z.number().min(0).max(100).describe('割合（%）') }).strict()).min(1).describe('円グラフ（対象期間の流入元）'),
    summary: z
      .object({
        impressions: orNull(count('インプレッション'), '画面で「-」の項目は null'),
        pageViews: count('ページビュー'),
        likes: orNull(count('スキ'), '画面で「-」の項目は null'),
        comments: orNull(count('コメント'), '画面で「-」の項目は null'),
        salesYen: orNull(yen('note の月次売上表示'), '売上の「完全」判定は、これと販売履歴の合計の一致で見る（business-direction.mjs）。画面で「-」なら null'),
      })
      .strict(),
  })
  .strict()
  .superRefine((r, ctx) => {
    const sumOf = (sources) => Object.values(sources).reduce((a, b) => a + b, 0);
    r.monthly.forEach((m, i) => {
      if (m.total !== sumOf(m.sources)) flag(ctx, ['monthly', i, 'total'], `${m.month} の total ${m.total} が流入元の合計と合わない`);
    });
    if (r.targetMonth && r.targetMonth.total !== sumOf(r.targetMonth.sources)) flag(ctx, ['targetMonth', 'total'], `total ${r.targetMonth.total} が流入元の合計と合わない`);
  })
  .meta({ title: 'note の月間の流入元' });

/** note の記事別の月間 PV（data/note/articles-pv/<月>.json）。取得は scripts/note-traffic-fetch.mjs */
export const NoteArticlesPv = z
  .object({
    schemaVersion: z.literal(1),
    month,
    fetchedAt: utcTime('取得時刻'),
    period: periodFromTo.describe('対象期間'),
    sortedBy: z.enum(['pageViews', 'publishedAt']).describe('記事一覧の並び順（ページビュー順を選べなかったときは公開日順のまま取り、publishedAt と記録する）'),
    count: count('記事の数'),
    rows: z
      .array(
        z
          .object({
            title: z.string().min(1),
            status: z.string().describe('公開中など（画面の表示）'),
            publishedAt: jstDate('公開日'),
            impressions: orNull(count('インプレッション'), '画面で「-」の項目は null'),
            pageViews: orNull(count('ページビュー'), '画面で「-」の項目は null'),
            likes: orNull(count('スキ'), '画面で「-」の項目は null'),
            comments: orNull(count('コメント'), '画面で「-」の項目は null'),
            salesYen: orNull(yen('記事の売上'), '画面で「-」の項目は null'),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .superRefine((r, ctx) => {
    if (r.count !== r.rows.length) flag(ctx, ['count'], `count ${r.count} が rows の行数 ${r.rows.length} と合わない`);
  })
  .meta({ title: 'note の記事別の月間 PV' });

/** note のマガジンと収録記事の公開状態（data/note/magazines.json）。週次の note-live-audit が verify-note-magazines --contents --json で取る */
export const NoteMagazines = z
  .object({
    fetchedAt: utcTime('取得時刻'),
    creator: z.string().min(1),
    magazineCount: count('マガジンの数'),
    magazines: z
      .array(
        z
          .object({
            key: z.string().regex(/^m[0-9a-f]+$/).describe('note のマガジンのキー'),
            id: z.number().int().min(1),
            name: z.string().min(1),
            price: yen('マガジンの価格').nullable(),
            description: z.string(),
            publishAt: z.string().nullable().describe('予約公開の日時。公開済みは null'),
            sotId: z.string().nullable().describe('src/lib/note-magazines.ts の id。SoT に配線の無いマガジンは null'),
            notes: z
              .array(z.object({ key: z.string().min(1), name: z.string(), price: yen('収録記事の価格') }).strict())
              .describe('収録記事。--contents 無しで取ると無くなり、収録数の照合（check-magazine-membership）が成り立たない'),
          })
          .strict(),
      )
      .superRefine(uniqueBy('key', 'マガジンの key')),
    contentsFailed: z
      .array(z.string().min(1))
      .optional()
      .describe('収録記事を取れなかったマガジンの key（--contents で取ったとき。過半なら書き手は上書きしない）'),
    issues: z.array(z.string()).describe('SoT とのずれ（空なら一致）'),
  })
  .strict()
  .superRefine((r, ctx) => {
    if (r.magazineCount !== r.magazines.length) flag(ctx, ['magazineCount'], `magazineCount ${r.magazineCount} が magazines の行数 ${r.magazines.length} と合わない`);
  })
  .meta({ title: 'note のマガジンと収録記事' });

const scanStep = z.looseObject({ key: z.string(), label: z.string(), url: z.string(), ok: z.boolean() });

/** ココナラの取引一覧の最新（data/coconala/orders-snapshot.json）。取得は scripts/coconala-orders.mjs。購入者名・本文は保存しない */
export const CoconalaOrdersSnapshot = z
  .object({
    version: z.literal(1),
    fetchedAt: utcTime('取得時刻'),
    status: z.enum(['ok', 'partial']).describe('全タブを取れたら ok・取れなかったタブがあれば partial（件数を全件と扱わない）'),
    source: z.string(),
    privacyNote: z.string(),
    scan: z
      .object({
        tabs: z.array(scanStep.extend({ rows: count('取れた行数').nullable(), rawRows: count('二重描画を除く前の行数').optional(), reason: z.string().optional() })),
        tabsOk: count('取れたタブ'),
        tabsTotal: count('タブの数'),
        deadlineFailed: count('返信期限を読めなかった取引'),
      })
      .strict(),
    orders: z
      .array(
        z
          .object({
            talkroomId: z.string().regex(/^\d+$/),
            talkroomUrl: z.string().url(),
            tab: z.string().describe('見つけたタブ（required・requests・open・closed・canceled）'),
            tabLabel: z.string(),
            serviceId: z.string().nullable().describe('カタログの id。見積り受注などで引けないものは null'),
            listingText: z.string(),
            priceYen: orNull(yen('販売額'), '読めなかったときは null（KPI は部分集計になる）'),
            soldOn: orNull(jstDate('販売日'), '見積りなど販売前の行は null'),
            deliveryDueSet: z.boolean(),
            statusLabel: z.string(),
            lastMessageAt: z.string().describe('画面の表示のまま（例 09/25 20:45）'),
            unreplied: z.boolean(),
            replyDueAt: isoTime('返信期限（画面の JST の時刻に +09:00 を付けたもの）').nullable(),
          })
          .strict(),
      )
      .superRefine(uniqueBy('talkroomId', 'talkroomId')),
    inquiries: z.array(
      z
        .object({
          dmId: z.string().regex(/^\d+$/),
          dmUrl: z.string().url(),
          dateText: z.string().describe('画面の表示のまま（例 2 日前・9月1日）'),
          subject: z.string(),
          serviceId: z.string().nullable(),
          unread: z.boolean(),
          fromStaff: z.boolean(),
          oneWay: z.boolean(),
          violationRemoved: z.boolean(),
        })
        .strict(),
    ),
  })
  .strict()
  .superRefine((r, ctx) => {
    const ok = r.scan.tabs.filter((t) => t.ok).length;
    if (r.scan.tabsOk !== ok) flag(ctx, ['scan', 'tabsOk'], `tabsOk ${r.scan.tabsOk} が tabs の ok の数 ${ok} と合わない`);
    if (r.scan.tabsTotal !== r.scan.tabs.length) flag(ctx, ['scan', 'tabsTotal'], `tabsTotal ${r.scan.tabsTotal} が tabs の数 ${r.scan.tabs.length} と合わない`);
    if ((r.status === 'ok') !== (r.scan.tabsOk === r.scan.tabsTotal)) flag(ctx, ['status'], 'status が全タブの取得結果（tabsOk と tabsTotal）と合わない');
  })
  .meta({ title: 'ココナラの取引一覧' });

const coconalaPeriod = z
  .object({ from: jstDate('開始日'), to: jstDate('終了日'), label: z.string().nullable().describe('画面の表示（例 過去30日間）。読めなければ null'), windowDays: orNull(count('集計日数'), '画面の表示から読めなかったときは null') })
  .strict();
const coconalaMetrics = {
  impressions: orNull(count('表示回数'), 'セラーサクセス未加入ではマスクされ null（0 ではない）'),
  views: orNull(count('閲覧'), '読めなかったときは null'),
  orders: orNull(count('購入'), '読めなかったときは null'),
  favorites: orNull(count('お気に入り'), '読めなかったときは null'),
};

/** ココナラの出品分析の最新（data/coconala/analytics.json）。取得は scripts/coconala-analytics.mjs。数値は対象期間の累計で週次の増分ではない */
export const CoconalaAnalytics = z
  .object({
    version: z.literal(1),
    fetchedAt: utcTime('取得時刻'),
    fetchedOnJst: jstDate('取得した日'),
    status: z.enum(['ok', 'partial']).describe('全対象を取れたら ok・取れなかったものがあれば partial'),
    source: z.string(),
    caveats: z.array(z.string()),
    period: z.object({ services: coconalaPeriod.nullable(), blogs: coconalaPeriod.nullable() }).strict().describe('画面の対象期間。全体のページを取れなかったときは null'),
    totals: z.object({ ...coconalaMetrics, salesYen: orNull(yen('売上'), '読めなかったときは null'), masked: z.array(z.string()) }).strict().nullable().describe('全体の値。ページを取れなかったときは null'),
    services: z
      .array(
        z
          .object({
            serviceId: z.string().min(1),
            numericId: z.string().regex(/^\d+$/),
            catalogStatus: z.string(),
            title: z.string().optional().describe('取れなかった出品には無い'),
            ok: z.boolean().describe('指標カードを 1 枚でも取れたか（取れなかったら構造変化・権限の疑い）'),
            ...coconalaMetrics,
            masked: z.array(z.string()).optional().describe('マスクされた指標（取れなかった出品には無い）'),
            reason: z.string().optional(),
          })
          .strict(),
      )
      .superRefine(uniqueBy('serviceId', 'serviceId')),
    skipped: z.array(z.object({ serviceId: z.string(), catalogStatus: z.string(), pauseReason: z.string().nullable(), reason: z.string() }).strict()).describe('公開中でなく分析ページが無い出品（黙って落とさず残す）'),
    blogs: z.array(z.object({ title: z.string(), kind: z.string().nullable(), status: z.string().nullable(), postedOn: jstDate('投稿日').nullable(), views: count('閲覧').nullable() }).strict()),
    scan: z.object({ steps: z.array(scanStep.extend({ cards: count('指標カード').optional(), blogs: count('ブログ').optional(), serviceCards: count('画面の出品カード').optional(), rows: count('取れた出品').optional(), expected: count('取る予定の出品').optional(), skipped: count('除外した出品').optional(), reason: z.string().optional() })), ok: count('成功した段'), total: count('段の数') }).strict(),
  })
  .strict()
  .superRefine((r, ctx) => {
    const ok = r.scan.steps.filter((s) => s.ok).length;
    if (r.scan.ok !== ok) flag(ctx, ['scan', 'ok'], `scan.ok ${r.scan.ok} が steps の ok の数 ${ok} と合わない`);
    if (r.scan.total !== r.scan.steps.length) flag(ctx, ['scan', 'total'], `scan.total ${r.scan.total} が steps の数 ${r.scan.steps.length} と合わない`);
    if ((r.status === 'ok') !== (r.scan.ok === r.scan.total)) flag(ctx, ['status'], 'status が全段の取得結果（scan.ok と scan.total）と合わない');
    if (jstDayOf(r.fetchedAt) !== r.fetchedOnJst) flag(ctx, ['fetchedOnJst'], `fetchedOnJst ${r.fetchedOnJst} が fetchedAt の JST の日付 ${jstDayOf(r.fetchedAt)} と合わない`);
  })
  .meta({ title: 'ココナラの出品分析' });

// ---- 提携案件 ----------------------------------------------------------------------------

const aspEntry = z.looseObject({
  status: z.enum(['approved', 'applying', 'none', 'unavailable', 'unknown']).describe('その ASP での提携の状態（語彙は _statusVocab）'),
  programId: z.string().optional().describe('ASP 側の案件 id'),
  rewardYen: z.number().min(0).nullable().optional().describe('1 件あたりの報酬（円）'),
  epcYen: z.number().min(0).nullable().optional(),
  confirmRatePct: z.number().min(0).max(100).nullable().optional(),
  verifiedAt: jstDate('実機で確かめた日').optional(),
});

/** 3 ASP（A8・もしも・afb）の提携案件（data/affiliate/catalog.json）。ASP の画面と照合して更新する（affiliate-status・affiliate-apply）。読み手が使う欄だけ型を持ち、案件ごとの記録欄は自由 */
export const AffiliateCatalog = z
  .looseObject({
    schemaVersion: z.literal(1),
    updatedAt: utcTime('最終更新'),
    verifiedAt: jstDate('最終照合日'),
    _statusVocab: z.record(z.string(), z.string()),
    programs: z.record(
      z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
      z.looseObject({
        label: z.string().min(1),
        vertical: z.string().nullable().describe('転職の系統（civil-career・pe-career）。転職でない案件は null'),
        placement: z.enum(['active', 'none']).describe('サイトに置いているか（active）・置いていないか（none）'),
        decision: z.string().min(1).describe('配置の判断とその日付'),
        redLine: z.boolean().optional().describe('講座・教材など配置してはいけない案件'),
        asps: z.strictObject({ a8: aspEntry.optional(), moshimo: aspEntry.optional(), afb: aspEntry.optional() }),
      }),
    ),
  })
  .meta({ title: '3 ASP の提携案件' });

// ---- 設定（config/）。読み手の多いものから型を付ける。ファイル間の整合（資格 id の照合）は既存の check-* が持つ ------------------

const ID = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, '英小文字・数字・ハイフンだけ');

/** 資格の一覧・名前・並び順・展開状態（config/qualification-registry.json）。読み手 32。id の照合は check-exam-calendar・check-qualification-ssot */
export const QualificationRegistry = z
  .object({
    _doc: z.string(),
    portfolioStatuses: z.record(z.string(), z.string()).describe('展開状態の語彙（qualifications[].portfolio の値）'),
    families: z.record(ID, z.string().min(1)).describe('資格ファミリーの名前'),
    familyShortLabels: z.record(ID, z.string().min(1)).describe('資格ファミリーの短い名前'),
    groups: z
      .record(
        ID,
        z
          .object({
            label: z.string().min(1),
            shortLabel: z.string().min(1),
            badgeLabel: z.string().min(1).optional(),
            members: z.array(ID).min(2).describe('まとめる資格の id'),
          })
          .strict(),
      )
      .describe('複数の資格をまとめて扱う単位（1級・2級土木・舗装 など）'),
    qualifications: z
      .array(
        z
          .object({
            id: ID,
            label: z.string().min(1).describe('正式名'),
            shortLabel: z.string().min(1).optional().describe('画面の短い名前'),
            badgeLabel: z.string().min(1).optional().describe('バッジ・狭い列のごく短い名前'),
            family: ID,
            portfolio: z.string().min(1).describe('展開状態（portfolioStatuses のキー）'),
            decision: z.object({ summary: z.string().min(1), ref: z.string().min(1) }).strict().optional().describe('参入しない判断の理由と文書'),
          })
          .strict(),
      )
      .min(1)
      .superRefine(uniqueBy('id', '資格の id'))
      .describe('資格の一覧。並びがそのまま画面の並び順'),
  })
  .strict()
  .meta({ title: '資格の一覧' });

const navView = z
  .object({
    label: z.string().min(1),
    href: z.string().regex(/^\//, '/ で始まるパス'),
    kind: z.string().min(1).describe('navKinds のキー'),
    match: z.string().regex(/^\//, '/ で始まるパス'),
    matchAlso: z.array(z.string().regex(/^\//, '/ で始まるパス')).optional(),
    query: z.record(z.string(), z.string()).optional(),
  })
  .strict();

/** 事業の領域・サイドバー・文書の割り当て（config/domains.json）。読み手 24。領域 id の照合は check-domains */
export const DomainsConfig = z
  .object({
    version: z.literal(1),
    _doc: z.string(),
    description: z.string(),
    domains: z
      .array(z.object({ id: ID, label: z.string().min(1), role: z.string().min(1), manages: z.string().min(1), nav: z.array(navView).min(1) }).strict())
      .min(1)
      .superRefine(uniqueBy('id', '領域の id')),
    documents: z.record(z.string().min(1), z.string().min(1)).describe('文書のパス（末尾 / は接頭辞）→ 領域 id'),
    navKinds: z.record(z.string(), z.string()).describe('サイドバーの画面の種類'),
    navRules: z.array(z.string()),
  })
  .strict()
  .meta({ title: '事業の領域' });

const lineupCell = z.string().regex(/^[a-z0-9-]+:[a-z0-9-]+$/, '資格id:区分id');
const lineupRule = z.object({ match: z.string().min(1).describe('商品 id に当てる正規表現（上から順に評価し最初の一致を採る）'), cells: z.array(lineupCell).min(1) }).strict();

/** 商品ラインナップの分類（config/product-lineup.json）。読み手 14。マスの実在・正規表現の妥当性は product-lineup.mjs の validateLineupConfig */
export const ProductLineup = z
  .object({
    _doc: z.string(),
    _salesRules: z.string(),
    _apps: z.string(),
    channels: z.array(z.object({ id: ID, label: z.string().min(1) }).strict()).min(1).superRefine(uniqueBy('id', 'チャネルの id')),
    rules: z.record(ID, z.array(lineupRule)).describe('チャネルごとの分類ルール'),
    salesRules: z.array(lineupRule).describe('売上記録の productId を写すルール'),
    apps: z
      .array(
        z
          .object({
            id: ID,
            title: z.string().min(1),
            platform: z.string().min(1),
            status: z.string().min(1).describe('planned / draft / review / published / retired（content-lifecycle.mjs の STAGES）'),
            price: z.string(),
            url: z.string().url().optional(),
            note: z.string().optional(),
            cells: z.array(lineupCell).min(1),
          })
          .strict(),
      )
      .superRefine(uniqueBy('id', 'アプリの id')),
  })
  .strict()
  .meta({ title: '商品ラインナップ' });

/** ココナラ出品の投入用データ（config/coconala-listings.json）。coconala-publish.mjs・coconala-edit.mjs が serviceId で引いてフォームへ流し込む。価格は書かない（カタログが正本） */
export const CoconalaListings = z
  .object({
    _note: z.string(),
    listings: z.record(
      ID,
      z
        .object({
          category: z.object({ master: z.string().regex(/^\d+$/), sub: z.string().regex(/^\d+$/), type: z.string().regex(/^\d+$/), _labels: z.string() }).strict(),
          provisionFormat: z.string().regex(/^\d+$/),
          catchphrase: z.string().min(1),
          deliveryDays: z.number().int().min(1),
          purchaseNote: z.string().min(1),
          body: z.string().min(1),
          faq: z.array(z.object({ q: z.string().min(1), a: z.string().min(1) }).strict()),
          options: z.array(z.object({ title: z.string().min(1), priceYen: yen('オプションの価格'), deliveryDays: z.number().int().min(1) }).strict()),
          genreFacets: z.array(z.string().regex(/^\d+$/)),
        })
        .strict(),
    ),
  })
  .strict()
  .meta({ title: 'ココナラ出品の投入用データ' });

const calendarVerification = z
  .object({
    checkedAt: jstDate('照合日'),
    checkedBy: z.enum(['self', 'agent']).describe('self は主担当が公式原文を読んで照合・agent は調査担当の読み取りだけ（未照合）'),
    unresolved: z.array(z.string().min(1)).describe('こちらが確認できていない事項'),
    pending: z.array(z.string().min(1)).describe('公式が未発表の事項'),
    notPublished: z.array(z.string().min(1)).describe('公式が公表していない事項'),
  })
  .strict();

/** 試験日程（config/exam-calendar.json）。本番サイトにも同梱される。資格 id の照合・日程の規則は check-exam-calendar（validateQualificationRegistry） */
export const ExamCalendar = z
  .object({
    schemaVersion: z.literal(1),
    timezone: z.literal('Asia/Tokyo'),
    verifiedAt: jstDate('最終照合日'),
    policy: z.string(),
    periodsPolicy: z.string(),
    eventKinds: z.record(z.string(), z.string()).describe('日程の種類の語彙（events[].kind の値）'),
    exams: z.record(
      ID,
      z
        .object({
          label: z.string().min(1).describe('公式名称'),
          year: z.number().int().min(2000),
          source: z.string().url().describe('公式の発表ページ'),
          events: z.record(z.string().min(1), z.object({ label: z.string().min(1), date: jstDate('日付'), kind: z.string().min(1) }).strict()).describe('日付が確定した日程'),
          periods: z.record(z.string().min(1), z.object({ label: z.string().min(1), window: z.string().min(1) }).strict()).optional().describe('日付が未発表の日程（期間の文言）'),
          verification: calendarVerification,
          note: z.string().min(1).optional(),
        })
        .strict(),
    ),
  })
  .strict()
  .meta({ title: '試験日程' });

const funnelNote = z.object({ noteId: z.string().regex(/^n[0-9a-f]+$/), title: z.string().min(1), articleDir: z.string().min(1), noteUrl: z.string().url() }).strict();
/** 導線の CTA。marker は本文に埋める HTML コメントの印で、text の先頭にも同じ印が入る。置かない資格は marker・text とも空 */
const funnelCta = z
  .object({ marker: z.string(), text: z.string() })
  .strict()
  .superRefine((c, ctx) => {
    if (c.marker === '' && c.text === '') return;
    if (!/^cta:[a-z0-9-]+$/.test(c.marker)) flag(ctx, ['marker'], 'marker は cta:<名前>（導線を置かない資格は marker・text とも空）');
    else if (!c.text.startsWith(`<!-- ${c.marker} -->`)) flag(ctx, ['text'], `text の先頭に <!-- ${c.marker} --> が要る`);
  });

/** note 導線（ファネル）の構成（config/note-funnel.json）。本番サイトにも同梱される。真実源の文章は note-funnel-architecture.md */
export const NoteFunnel = z
  .object({
    _doc: z.string(),
    L1: funnelNote.describe('全資格サイトマップの記事'),
    exams: z.record(
      ID,
      z
        .object({
          qualification: ID.describe('registry の資格 id か group id'),
          articleGlob: z.string().min(1),
          excludeDirs: z.array(z.string().min(1)),
          magazineExamMatch: z.array(z.string().min(1)),
          topCtaExcludeDirs: z.array(z.string().min(1)).optional(),
          topCtaOverrides: z.array(z.object({ dirPrefix: z.string().min(1), marker: z.string().regex(/^cta:[a-z0-9-]+$/), text: z.string().min(1) }).strict()).optional().describe('記事ごとに先頭の導線を差し替える（dirPrefix で始まる記事）'),
          L2: funnelNote.describe('資格別のもくじ記事'),
          topCta: funnelCta,
          bottomCta: funnelCta,
        })
        .strict(),
    ),
  })
  .strict()
  .meta({ title: 'note 導線の構成' });

const runBase = { runId: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z$/), collectedAt: utcTime('取得時刻') };

/** GA4 管理設定の照合の履歴（data/ga4/admin-history.json） */
export const Ga4AdminHistory = z
  .object({
    schemaVersion: z.literal(1),
    channel: z.literal('ga4-admin'),
    runs: z.array(z.looseObject({ ...runBase, mode: z.enum(['dry-run', 'commit']), status: z.string() })),
  })
  .strict()
  .meta({ title: 'GA4 管理設定の照合' });

/** GSC のインデックス登録依頼の履歴（data/gsc/indexing-history.json） */
export const GscIndexingHistory = z
  .object({
    schemaVersion: z.literal(1),
    runs: z.array(z.looseObject({ ...runBase, mode: z.enum(['dry-run', 'commit']), status: z.string(), slugs: z.array(z.string()) })),
  })
  .strict()
  .meta({ title: 'GSC のインデックス登録依頼' });

/** GSC 画面取得の履歴（data/gsc/ui-history.json） */
export const GscUiHistory = z
  .object({
    schemaVersion: z.literal(1),
    channel: z.literal('gsc-ui'),
    runs: z.array(
      z.looseObject({
        ...runBase,
        property: z.string(),
        status: z.string(),
        complete: z.boolean(),
        units: z.array(z.object({ unit: z.string(), rows: count('行数'), added: count('増えた行'), removed: count('消えた行') }).strict()),
      }),
    ),
  })
  .strict()
  .meta({ title: 'GSC 画面取得の履歴' });

/** インデックス状況の推移（data/gsc/index-coverage.json）。欄の名前は既存の snake_case のまま */
export const GscIndexCoverage = z
  .object({
    schema_version: z.literal('1.0'),
    updated_at: utcTime('最終更新'),
    entries: z.array(
      z.looseObject({
        date: jstDate('計測日'),
        run_at: utcTime('実行時刻'),
        sitemap_urls: count('sitemap の URL 数'),
        inspected: count('検査した URL 数'),
        indexed: count('登録済み'),
        indexed_ratio: z.number().min(0).max(1),
        by_qualification: z
          .record(z.string(), z.object({ inspected: count('検査した URL 数'), indexed: count('登録済み'), ratio: z.number().min(0).max(1).describe('登録済み ÷ 検査した URL 数') }).strict())
          .optional()
          .describe('資格別（URL が /exam/<資格 id>/ 配下）の検査結果。資格の URL が無かった回は空。バッチが消えていて数え直せない回は欄が無い'),
      }),
    ),
  })
  .strict()
  .meta({ title: 'インデックス状況の推移' });

/** 成長機会の振り分けの記録（data/analysis/growth/triage-log.json） */
export const GrowthTriage = z
  .object({
    schemaVersion: z.literal(1),
    entries: z.array(
      z.looseObject({
        id: z.string().nullable(),
        week: z.string().regex(/^\d{4}-W\d{2}$/),
        weekStart: jstDate('週の月曜'),
        action: z.enum(['verdict', 'defer', 'backlog', 'reject', 'bundle']),
        at: utcTime('記録時刻'),
      }),
    ),
  })
  .strict()
  .meta({ title: '成長機会の振り分け' });

/** note の同期の実行記録（data/note/sync-log.json） */
export const NoteSyncLog = z
  .object({
    runs: z.array(
      z
        .object({
          startedAt: utcTime('開始'),
          finishedAt: utcTime('終了'),
          plan: z.looseObject({ synced: count('同期済み'), ready: count('同期できる'), blocked: count('止まっている') }),
          articles: z.object({ attempted: count('試みた記事'), updated: z.array(z.unknown()), failed: z.array(z.unknown()) }).strict(),
          magazines: z.object({ attempted: count('試みたマガジン'), updated: z.array(z.unknown()), failed: z.array(z.unknown()) }).strict(),
          problems: z.array(z.unknown()),
        })
        .strict(),
    ),
  })
  .strict()
  .meta({ title: 'note の同期の記録' });

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
