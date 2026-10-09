/**
 * jst-date.mjs — 「日本の今日」を出す唯一の場所
 * ---------------------------------------------------------------------------
 * なぜ要るか（2026-08-13 に 2 件が実害を出した）:
 *   `new Date().toISOString().slice(0, 10)` は **UTC の日付**を返す。JST は UTC+9 なので、
 *   日本時間の 00:00〜08:59 に走らせると**前日の日付**が記録される。
 *     - coconala-blog-publish: 07:38 JST に公開した記事の publishedAt が前日付になった。
 *       ココナラは「1日1本まで」の運用なので、日付がズレると出せる/出せないの判断を誤る。
 *     - check-note-attachments: measuredAt が前日付になり、母集団の鮮度判定が
 *       常に「1日古い」と誤警告する状態だった。
 *   このリポジトリの運用（公開日・受注日・計測日・締切判定）はすべて日本時間が基準なので、
 *   記録に使う「今日」は JST で出す。
 *
 * 使い分け:
 *   - todayJst() / jstMonth() / jstDayOf(時刻) … 運用記録の日付（公開日 / 受注日 / 計測日 / verifiedAt など）。
 *     JST の日付・月は**ここだけ**で計算する（`+ 9 * 3600 * 1000` の自前計算・`Intl` の Asia/Tokyo・
 *     `getFullYear()/getMonth()/getDate()`（実行環境のタイムゾーン）を各スクリプトに書かない。check-jst-date が止める）
 *   - jstClock(時刻) … 曜日・時・月跨ぎの計算で JST の壁時計が要るとき。返す Date は getUTC* が JST の値
 *     （getUTCDay()＝JST の曜日・getUTCHours()＝JST の時）。toISOString() は JST の壁時計に Z を付けた嘘の UTC なので記録に使わない
 *   - 記録の日時（取得時刻など）は UTC の ISO 8601 末尾 Z（`new Date().toISOString()`）で書く。JST の ISO（+09:00）を作る
 *     関数は置かない（旧 nowJstIso は廃止）。日付だけの値は JST の YYYY-MM-DD（上の関数）
 *   - 生の toISOString().slice(0, 10) … 外部 API が UTC を要求する箇所・機械的な一意キー。
 *     そちらは意図が分かるようコメントを添え、check-jst-date の allowlist に載せる。
 * ---------------------------------------------------------------------------
 */

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** epoch ms・Date・ISO 8601 文字列を epoch ms にする（読めない値は NaN） */
const toMs = (when) => (typeof when === 'number' ? when : when instanceof Date ? when.getTime() : Date.parse(String(when)));

/** 時刻を JST に寄せた Date（getUTC* が JST の値）。読めない値は RangeError（旧来の `new Date(x + 9h).toISOString()` と同じ） */
function shifted(when) {
  const t = toMs(when) + JST_OFFSET_MS;
  if (!Number.isFinite(t)) throw new RangeError(`読めない時刻: ${String(when)}`);
  return new Date(t);
}

/**
 * ある時刻（epoch ms・Date・ISO 8601 文字列。既定は今）の日本時間の日付を YYYY-MM-DD で返す。
 * 時刻つき文字列は epoch 経由で +9h する（Z の文字列を slice(0, 10) すると JST では前日にずれる）。読めない値は RangeError。
 * @param {number | string | Date} [when]
 * @returns {string}
 */
export function jstDayOf(when = Date.now()) {
  return shifted(when).toISOString().slice(0, 10);
}

/**
 * 日本時間の「今日」を YYYY-MM-DD で返す。
 * @param {number | string | Date} [now]
 * @returns {string}
 */
export function todayJst(now = Date.now()) {
  return jstDayOf(now);
}

/**
 * 日本時間の月を YYYY-MM で返す（既定は今）。
 * @param {number | string | Date} [when]
 * @returns {string}
 */
export function jstMonth(when = Date.now()) {
  return jstDayOf(when).slice(0, 7);
}

/**
 * 日本時間の年月日 { year, month(1〜12), day }（既定は今）。
 * @param {number | string | Date} [when]
 * @returns {{ year: number, month: number, day: number }}
 */
export function jstYmd(when = Date.now()) {
  const [year, month, day] = jstDayOf(when).split('-').map(Number);
  return { year, month, day };
}

/**
 * 日本時間の壁時計を getUTC* で読める Date を返す（getUTCDay()＝JST の曜日・getUTCHours()＝JST の時・getUTCDate()＝JST の日）。
 * toISOString() は「JST の壁時計に Z を付けた」値で本物の UTC ではない。記録には使わない（記録は UTC の Z・日付は jstDayOf）。
 * @param {number | string | Date} [when]
 * @returns {Date}
 */
export function jstClock(when = Date.now()) {
  return shifted(when);
}

/**
 * 日時文字列を JST の日付キーと時刻へ正規化する（スケジュール集約アダプタ用）。
 * 受ける形式: 'YYYY-MM-DD'（日粒度・そのまま返す）／ISO 8601（+09:00 も Z も可）。
 * Z(UTC) を slice(0,10) すると JST では前日にずれるため、必ず epoch 経由で +9h する
 * （x/draft の status.json は posted_at が Z 混在で実害が出た箇所）。
 * @param {string} value
 * @returns {{date: string, time: string|null}|null} パース不能は null
 */
export function jstDayTime(value) {
  if (typeof value !== 'string' || !value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return { date: value, time: null };
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  const jst = new Date(ms + JST_OFFSET_MS).toISOString();
  return { date: jst.slice(0, 10), time: jst.slice(11, 16) };
}

/**
 * 画面表示用の JST ラベル「YYYY-MM-DD HH:MM」。日付だけの値は日付のまま。空は ''、読めない値は元の文字列。
 * @param {string | null | undefined} value
 * @returns {string}
 */
export function jstLabel(value) {
  if (!value) return '';
  const d = jstDayTime(value);
  return d ? (d.time ? `${d.date} ${d.time}` : d.date) : value;
}
