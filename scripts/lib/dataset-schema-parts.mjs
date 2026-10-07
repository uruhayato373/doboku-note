/**
 * dataset-schema-parts.mjs — 設定・記録の型（dataset-schemas*.mjs）が共有する部品（日時・金額・件数・不変条件・版）。
 * 型を足す約束は dataset-schemas.mjs の先頭にある。ここは部品だけで、型（export された z の型）は置かない。
 */
import { z } from 'zod';
import { jstDayTime } from './jst-date.mjs';


export const jstDate = (what) => z.iso.date().describe(`${what}（JST の YYYY-MM-DD）`);
/** 取得・記録の時刻。末尾 Z の UTC だけ通す（+09:00 や存在しない日時は通さない）。時差つきで書かれると Date.parse は通るが日付が 1 日ずれる */
/** 事業の計測（config/business-direction.json の指標・計測の記録）の取得元。型 2 つと business-direction.mjs の検査がここを引く（2026-10-07 まで 3 か所に写していた） */
export const BUSINESS_CHANNELS = ['GA4', 'GSC', 'note', 'KDP', 'coconala', 'A8', 'operations', 'instagram', 'cloudflare'];

export const utcTime = (what) => z.iso.datetime().describe(`${what}（UTC の ISO 8601・末尾 Z）`);
/** 時差つきの ISO 8601（Z か ±HH:MM）。予定の時刻のように JST の +09:00 で書く欄だけ使い、理由を .describe() に書く */
export const offsetTime = (what) => z.iso.datetime({ offset: true }).describe(`${what}（時差つきの ISO 8601。JST の +09:00 を含む）`);
export const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'YYYY-MM（月は 01〜12）');
export const yen = (what) => z.number().int().min(0).describe(`${what}（円）`);
/** 返品・調整で負になりうる金額（KDP のロイヤリティ） */
export const signedYen = (what) => z.number().int().describe(`${what}（円・返品で負になりうる）`);
export const count = (what) => z.number().int().min(0).describe(what);
/** null を許す型。説明は元の説明に null の意味を足す（管理画面の表は外側の説明を出す） */
export const orNull = (schema, why) => schema.nullable().describe(`${schema.description}。${why}`);
/** 日付か UTC の時刻（実験の開始日のように、日付だけで書かれた古い行と時刻つきの新しい行が混ざる欄） */
export const jstDateOrUtcTime = (what) =>
  z
    .string()
    .refine((s) => z.iso.date().safeParse(s).success || z.iso.datetime().safeParse(s).success, 'YYYY-MM-DD か UTC の ISO 8601（末尾 Z）')
    .describe(`${what}（JST の日付か UTC の ISO 8601）`);

// ---- 不変条件の部品（superRefine から使う） ----------------------------------------------

export const flag = (ctx, path, message) => ctx.addIssue({ code: 'custom', path, message });

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
export const lastDayOfMonth = (m) => new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0)).getUTCDate();

/** ISO 8601 の日時の JST の日付。時差の無い値は JST の壁時計とみなす（人が書く台帳の日時は JST） */
export const jstDayOf = (s) => jstDayTime(/(?:Z|[+-]\d{2}:\d{2})$/.test(s) ? s : `${s}+09:00`)?.date ?? null;

/** ISO 8601 の日時のエポックミリ秒。時差の無い値は JST の壁時計とみなす */
export const toMs = (s) => Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/.test(s) ? s : `${s}+09:00`);

export const mondayDate = (what) => jstDate(what).refine(isMonday, '月曜日の日付ではない');

/**
 * 版つきの型。版の欄（field）の値で型を選ぶ判別共用体で、versions は { 版: その版の z.object（版の欄は書かない） }。
 * 版を上げるときは新しい版を足して旧版は残す（その版で書かれた過去のファイル・不変の台帳の過去の記録が落ちない）。
 * 版の欄は schemaVersion に揃える（既存ファイルの version 等は移すときに揃え、それまでは今の名前を渡す）
 */
export function versioned(field, versions) {
  const members = Object.entries(versions).map(([v, shape]) => shape.extend({ [field]: z.literal(Number(v)) }));
  return z.discriminatedUnion(field, members);
}

// 人が手で書く台帳の日時は JST の時差つき・分まで（例 2026-08-05T11:59+09:00）。秒は省略可。存在しない日時は通さない（2026-99-99T99:99 も 2026-02-30T10:00 も）。
// 時差の無い値は読み手の実行環境のタイムゾーンで解釈される（CI は UTC で 9 時間ずれる）ので、時差は必須。画面の表示をそのまま取る欄だけ zone: false で省略を許す
export const ISO_TIME = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/;
export const isoTime = (what, { zone = true } = {}) =>
  z
    .string()
    .regex(ISO_TIME, `ISO 8601 の日時（時刻は 00:00〜23:59${zone ? '・時差つき（+09:00 か Z）' : ''}）`)
    .refine((s) => z.iso.date().safeParse(s.slice(0, 10)).success, '存在しない日付')
    .refine((s) => !zone || /(?:Z|[+-]\d{2}:\d{2})$/.test(s), '時差（+09:00 か Z）が要る')
    .describe(`${what}（ISO 8601・分まで可${zone ? '・時差つき' : '・時差は省略可（JST の壁時計）'}）`);
export const period = z.object({ startDate: jstDate('開始日'), endDate: jstDate('終了日') }).strict().describe('対象期間（両端を含む）');
export const sha256 = z.string().regex(/^[0-9a-f]{64}$/, 'SHA-256（16 進 64 桁）');
