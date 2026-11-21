/**
 * x-queue-surfacer の純関数部。I/O を持たないのでテストで固定できる。
 *
 * ここを切り出した理由（2026-08-17）: 見出しの日付書式が 3 系統あるのにパーサが 1 系統しか
 * 読めておらず、同じ根から**偽赤と偽陰性の両方**が出ていた。
 *   - 偽赤: 日付が読めない pack は end が null → covered_until が古い日付で固まり、
 *           キューは埋まっているのに永久に「残り -43 日」
 *   - 偽陰性: start が null → due 判定から静かに落ち、068 の未投入 28 件が一度も surface されなかった
 * 書式は今後も増えるので、**日付が 1 件も読めなかった pack は握り潰さず undated として返す**
 * のが本質的な防御（検査ゼロを PASS と呼ばない・12原則 9）。
 */

import { stripTweetMemos } from "./x-tweets-md.mjs";

export const DAY_MS = 86_400_000;

/**
 * 見出しから拾う日付の書式。実在する 3 系統。
 * 増えたらここに足し、tests/x-queue-surfacer.test.mjs に 1 ケース足す。
 */
export const HEADER_DATE_PATTERNS = [
  /—\s*(\d{1,2})\/(\d{1,2})/, // 「— 7/6 残り14日」
  /[（(]\s*[月火水木金土日]?\s*(\d{1,2})\/(\d{1,2})/, // 「（土 7/19 07:15）」
  /^## Tweet \d+:\s*(\d{1,2})\/(\d{1,2})\b/, // 「## Tweet 01: 9/1 07:15 civil-1 / …」
];

/**
 * tweets.md の生テキストから見出し数と日付群を返す。
 * @param {string} raw tweets.md の中身
 * @param {Date} now 年の決定に使う基準時刻（テストのため注入する）
 * @returns {{count:number, dates:Date[]}} count は見出し総数、dates は読めた分だけ
 */
export function parseDatesFromRaw(raw, now) {
  // コメントアウトされたツイートの見出しまで数えると、投稿しない下書きが予約枠に載る。
  const headers = stripTweetMemos(String(raw || "")).match(/^## Tweet \d+:.*$/gm) || [];
  const dates = [];
  for (const h of headers) {
    let m = null;
    for (const re of HEADER_DATE_PATTERNS) {
      m = h.match(re);
      if (m) break;
    }
    if (!m) continue;
    const month = Number(m[1]);
    const day = Number(m[2]);
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;
    let d = new Date(now.getFullYear(), month - 1, day);
    // 半年以上過去なら翌年の予定とみなす（12月→1月の年跨ぎ）
    if (d.getTime() < now.getTime() - 183 * DAY_MS) {
      d = new Date(now.getFullYear() + 1, month - 1, day);
    }
    dates.push(d);
  }
  return { count: headers.length, dates };
}

/**
 * 日時を決めずに置いておくストックの印。tweets.md に HTML コメントで 1 行書く:
 *   <!-- x-stock: x-c1-restart-2027 -->（載せる先の年間計画の枠 id か、担当のカード番号）
 * 日付が 1 件も読めない下書きでも、印があれば「判定不能（要対応）」でなく「ストック」に数える。
 * @param {string} raw tweets.md の中身
 * @returns {string|null} 印の値（無ければ null）
 */
export function parseStockMarker(raw) {
  const m = String(raw || "").match(/<!--\s*x-stock:\s*([^\s>](?:[^>]*?[^\s>])?)\s*-->/);
  return m ? m[1] : null;
}

/**
 * 台帳の X の投稿（loadXPosts の行）から投入状況を集計する。
 * 予約に入っている（phase が submitted・queued）ものを queued に数える。planned（承認済み・未投入）は数えない。
 * `lastScheduled` は予約に入っているものの最終日時。連続した予約の充足は保証しない。
 * @param {{ phase: string, publishAt?: string|null }[]} posts 1 つの下書きフォルダ分の行
 */
export function summarizeStatus(posts) {
  let queued = 0;
  let posted = 0;
  // retired＝stopped（予約を別の原稿へ差し替えた・取り下げた）。投稿しないことが決まっているので「未投入」に数えない
  // （2026-10-12: 2級の締切告知で既存の予約 2 本の本文を差し替えたら、surfacer が 1 本未投入の OVERDUE を出した）。
  let retired = 0;
  let lastScheduled = null;
  for (const t of Array.isArray(posts) ? posts : []) {
    if (!t || typeof t !== "object") continue;
    if (t.phase === "posted") posted++;
    else if (t.phase === "retired") retired++;
    else if ((t.phase === "queued" || t.phase === "submitted") && Number.isFinite(Date.parse(t.publishAt))) {
      queued++;
      const d = new Date(t.publishAt);
      if (!lastScheduled || d > lastScheduled) lastScheduled = d;
    }
  }
  return { queued, posted, retired, lastScheduled };
}
