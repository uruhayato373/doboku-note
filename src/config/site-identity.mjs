/**
 * サイトと note の識別子の唯一の定義（サイトの origin・Search Console のプロパティ・R2 の公開ホスト・note のクリエイター）。
 *
 * サイト本体（src/・TypeScript）と、スクリプト・管理画面・.claude/scripts（Node）が同じ値を使うため、依存の無い
 * .mjs にしてある（src/lib/keyword-href.mjs と同じ置き方）。スクリプト側は scripts/lib/site-identity.mjs が
 * これを再公開し、X・Instagram のハンドル（config/x-account.json・config/ig-account.json が正本）を足す。
 *
 * ここ以外に `const X = 'https://doboku-note.com'` のような再宣言を書かない。値が動いたとき、直し漏れた側が
 * 古い識別子のまま動き続ける（2026-08-13: 旧 note URL が YouTube 概要欄 32 本に出た・x-repost の ownHandle が
 * 凍結アカウントのままだった）。`npm run check-dead-handles` が再宣言を止める。
 * 表の中の個々の記事 URL（note-magazines.ts の各マガジン URL など）はデータであり、ここの対象ではない。
 */

/** サイトのホスト名（表示用・メール・Search Console のプロパティ・R2 のホストの元） */
export const SITE_HOST = 'doboku-note.com';

/** サイトの origin（末尾スラッシュなし）。URL は `${SITE_ORIGIN}/path` の形で組み立てる */
export const SITE_ORIGIN = `https://${SITE_HOST}`;

/** Google Search Console のプロパティ（ドメインプロパティ） */
export const GSC_PROPERTY = `sc-domain:${SITE_HOST}`;

/**
 * R2（公開バケット）のホスト。config/asset-storage.json の buckets.public.publicHost と同じ値で、
 * 食い違いは tests/site-identity.test.mjs が止める（サイトのバンドルに asset-storage.json を入れないため、こちらを持つ）。
 */
export const R2_PUBLIC_HOST = `storage.${SITE_HOST}`;
export const R2_PUBLIC_ORIGIN = `https://${R2_PUBLIC_HOST}`;

/** note のクリエイター ID と、そのトップ URL（末尾スラッシュなし） */
export const NOTE_CREATOR = 'dobokunote';
export const NOTE_BASE = `https://note.com/${NOTE_CREATOR}`;
