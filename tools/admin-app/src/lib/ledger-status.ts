import type { LedgerRow } from './ledger';

/**
 * コンテンツ台帳（/content/ledger）の状態判定。画面の部品から切り離した純関数だけを置く。
 * note は同期の計画（note-sync-plan）の結果、ココナラは公開ページの照合結果、導線は公開 API の照合結果を読むだけで、
 * ここで新しい判定を作らない。
 */

export type DriftState = 'ok' | 'drift' | 'blocked' | 'unknown' | 'none';
export type Drift = { state: DriftState; why?: string };

export const STATES: { key: string; label: string }[] = [
  { key: 'published', label: '公開' },
  { key: 'unpublished', label: '未公開' },
  { key: 'ready', label: 'ずれあり' },
  { key: 'blocked', label: '止まっている' },
  { key: 'cta', label: '導線ずれ' },
  { key: 'ended', label: '終了' },
];

const PART_LABEL: Record<string, string> = { body: '本文', cover: 'カバー', tags: 'タグ', title: '題名' };
// 未反映の理由（scripts/lib/note-sync-plan.mjs の classifySync・reasons）。本文の asset は「本文の画像・PDF だけ差し替えた」
const REASON_LABEL: Record<string, string> = {
  'body:drift': '本文を直した',
  'body:unrecorded': '本文の反映記録が無い',
  'body:asset': '本文の画像・PDF を差し替えた',
  'title:drift': '題名が note と違う（原稿の題名を反映する）',
  'cover:unrecorded': 'カバーの反映記録が無い',
  'cover:design': 'カバーのデザインが変わった',
  'cover:input': 'カバーの元（題名など）が変わった',
  'cover:no-cover': 'note にカバーが無い',
  'cover:live-changed': 'note のカバーが記録と違う',
  'tags:drift': 'タグを直した',
};
export const CTA_LABEL: Record<string, string> = { 'coconala-custom': 'ココナラ', 'pack-top': 'パック' };
export const CTA_STATE_LABEL: Record<string, string> = { missing: '出ていない', order: '順番が違う', position: '最初の見出しの後ろにある' };
const CTA_DRIFT = new Set(['missing', 'order', 'position']);

/** ISO 時刻を JST の「MM/DD HH:MM」に。 */
export function jst(iso: string | null | undefined): string {
  if (!iso) return '?';
  const d = new Date(Date.parse(iso) + 9 * 3_600_000).toISOString();
  return `${d.slice(5, 10).replace('-', '/')} ${d.slice(11, 16)}`;
}

/** ココナラの出品中のサービス: 本文＝タイトル・キャッチコピー・本文と販売状態、画像＝承認済み POP 画像の登録 */
function productDrift(live: NonNullable<LedgerRow['live']>, part: 'body' | 'cover'): Drift {
  if (part === 'cover') {
    if (live.imageUnknown) return { state: 'unknown', why: live.imageUnknown };
    return live.image ? { state: 'drift', why: live.image } : { state: 'ok', why: live.okNote?.image ?? '承認済みの POP 画像が登録されている（公開ページの画像との一致は見ていない）' };
  }
  if (live.bodyUnknown) return { state: 'unknown', why: live.bodyUnknown };
  if (!live.checkedAt) return { state: 'unknown', why: '公開照合をしていない（npm run content-ledger で作る）' };
  const issues = [...live.sale, ...live.text];
  return issues.length ? { state: 'drift', why: issues.join(' / ') } : { state: 'ok', why: live.okNote?.body ?? `公開ページが正本と一致（照合 ${jst(live.checkedAt)}）` };
}

/**
 * 公開先と原稿の「ずれ」を本文・画像に分けて出す。
 *   note … 本文＝本文のテキスト・本文の画像や PDF・タグ／画像＝カバー　ココナラ … productDrift
 */
export function drift(row: LedgerRow, part: 'body' | 'cover', blocker?: (id: string | null) => string | undefined): Drift {
  if (row.live) return productDrift(row.live, part);
  if (row.channel !== 'note' || row.kind !== '記事' || !row.published) return { state: 'none' };
  const sync = row.sync;
  if (!sync) return { state: 'ok' };
  const keys = part === 'body' ? ['body', 'tags', 'title'] : ['cover'];
  const hit = keys.filter((k) => sync.parts.includes(k));
  const stopped = sync.status === 'blocked' ? `止まっている理由: ${blocker?.(sync.blocker) ?? sync.blocker}` : null;
  // 止まっている記事は本文の欄に出す（部分の差が無くても、メタ情報のずれなどで記事ごと止まることがある）
  if (!hit.length) return stopped && part === 'body' ? { state: 'blocked', why: stopped } : { state: 'ok' };
  const why = hit.map((k) => REASON_LABEL[`${k}:${sync.reasons?.[k]}`] ?? PART_LABEL[k] ?? k).join('・');
  return stopped ? { state: 'blocked', why: `${why}（${stopped}）` } : { state: 'drift', why };
}

/** 導線: 公開 API の照合結果（索引を作った時点）。 */
export function ctaDrift(row: LedgerRow): Drift {
  const live = row.ctaLive;
  if (!live) return { state: 'none' };
  if (live.state === 'unknown') return { state: 'unknown', why: `公開 API を取得できなかった: ${live.error ?? ''}` };
  const why = Object.entries(live.byId ?? {})
    .map(([id, r]) => `${CTA_LABEL[id] ?? id}: ${r.state === 'ok' ? '出ている' : CTA_STATE_LABEL[r.state] ?? r.state}`)
    .join(' / ');
  return { state: live.state === 'ok' ? 'ok' : 'drift', why: `${why}（照合 ${jst(live.checkedAt)}）` };
}

function hasDrift(r: LedgerRow): boolean {
  if (r.live) return Boolean(r.live.image || r.live.sale.length || r.live.text.length || r.live.price.length);
  return r.sync?.status === 'ready';
}

/** 状態の絞り込み（STATES の key）に当たるか。 */
export function inState(r: LedgerRow, key: string): boolean {
  if (key === 'ended') return r.ended;
  if (key === 'published') return r.published;
  if (key === 'unpublished') return !r.published;
  if (key === 'cta') return CTA_DRIFT.has(r.ctaLive?.state ?? '');
  if (key === 'ready') return hasDrift(r);
  return r.sync?.status === key;
}
