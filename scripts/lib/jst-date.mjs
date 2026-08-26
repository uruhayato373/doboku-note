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
 *   - todayJst()  … 運用記録の日付（公開日 / 受注日 / 実測日 / verifiedAt など）
 *   - 生の toISOString() … 外部 API が UTC を要求する箇所・機械的な一意キー。
 *     そちらは意図が分かるようコメントを添え、check-jst-date の allowlist に載せる。
 * ---------------------------------------------------------------------------
 */

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 日本時間の「今日」を YYYY-MM-DD で返す。 */
export function todayJst(now = Date.now()) {
  return new Date(now + JST_OFFSET_MS).toISOString().slice(0, 10);
}

/** 日本時間の現在時刻を +09:00 付き ISO8601 で返す（updated_at 等の記録用）。 */
export function nowJstIso(now = Date.now()) {
  return new Date(now + JST_OFFSET_MS).toISOString().replace('Z', '+09:00');
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
