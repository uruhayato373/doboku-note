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

/** note の販売履歴（data/sales/sales-log.json）。購入者は記録しない */
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

/** KDP のロイヤリティ（data/sales/kdp-royalties.json）。当月分は推計で、確定後に同じ月を取り直して上書きする */
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
