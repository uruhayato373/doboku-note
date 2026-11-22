/**
 * 本文の AdSense の枠の決まり（ページの種類ごとの値の唯一の置き場・2026-11-22 運営者判断「サイト全体で共通に」）。
 * 計画する処理は 2 つ: 字数で割る記事・基準書（standards-inline-slots.mjs の planInlineSlots）と、問題の数で割る過去問（article-inline-slots.mjs）。
 *
 * - 転職の本文の枠（最大 3）は今までどおり先に置き、AdSense はそこから gapChars 以上離して、本文の終わりまで intervalChars ごとに置く。
 *   以前は記事が最大 2 枠・基準書が 5,000 字ごとで、本文の下半分に何も無い区間が PC で 6,000〜16,700px・スマホで最大 2.9 万 px あった
 *   （2026-11-22 の手元の実測・技術士一次 R7 基礎・基準書 必携 3-2）。
 * - 字数は 1 行を lineChars 字に切り上げて数える（PC の本文の 1 行は約 40 字。様式・箇条・表の短い行は字数のわりに画面を取り、
 *   字数のままでは基準書 必携 3-2 の後半〔様式〕の 6,500px に 1 枠も入らなかった）。転職の枠の計画は字数のまま。
 * - 過去問（設問が続く記事）は設問の境目にだけ置き、字数ではなく問題の数で割る（解答・解説が畳まれていて、字数と画面の高さが合わない）。
 *   直前の転職・AdSense・CTA から questionsPerAd 問以上あける。1 問が長い試験（二次の記述）は、直前の枠から article の intervalChars を
 *   超えた設問の前にも置く（1 級土木 二次 R6 はスマホで 4,800px 空いた）。
 * - 画面の高さで確かめる検査は e2e/ad-coverage.spec.ts（本文で広告も導線も無い区間の上限）。
 */
export const BODY_AD_RULES = Object.freeze({
  article: Object.freeze({ gapChars: 800, intervalChars: 1500, maxSlots: 30, lineChars: 40 }),
  standards: Object.freeze({ gapChars: 800, intervalChars: 1500, maxSlots: 30, lineChars: 40 }),
  questionSeries: Object.freeze({ questionsPerAd: 3, maxSlots: 30 }),
});
