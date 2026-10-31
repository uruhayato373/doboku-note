/**
 * registry-ig-store.mjs — Instagram の書き手（投稿・予約・照合のスクリプト）がコンテンツ台帳へ状態を書く唯一の入口（DN-0611）。
 * 正本は台帳（content/registry/publications/instagram/{exam}.json）。作品フォルダの status.json・posted.json は P7 で消す
 * 旧い写しで、書き手は移行のあいだ今までどおり書いてよいが、状態の判断（予約したか・公開したか）は台帳を読む。
 *
 * 公開 ID は作品フォルダの相対パス（content/sns/instagram の下）と形式から registry-ig-state.mjs の classifyIgFolder で決める。
 */
import { canTransition, loadRegistry, loadRegistryConfig, pubIdOf } from './content-registry.mjs';
import { classifyIgFolder, IG_ROOT } from './registry-ig-state.mjs';
import { isAbsolute, relative, resolve } from 'node:path';
import { approvalState } from './media-review.mjs';

/** 作品フォルダ（content/sns/instagram の下の相対パス、または content/sns/instagram/… から始まるパス）と形式 → 公開 ID。対象外は null */
export async function igPubId(root, folder, format) {
  const input = String(folder);
  const rel = (isAbsolute(input) ? relative(resolve(root, IG_ROOT), resolve(input))
    : input.replace(/\\/g, '/').replace(new RegExp(`^(?:\\./)?${IG_ROOT}/`), ''))
    .replace(/\\/g, '/').replace(/\/$/, '');
  if (rel.startsWith('../') || rel === '..' || isAbsolute(rel)) return null;
  const { discoverVideoPacks } = await import('./content-registry-check.mjs');
  const c = classifyIgFolder(rel, new Set(discoverVideoPacks(root).keys()));
  if (!c) return null;
  const f = c.format ?? format;
  return pubIdOf({ exam: c.exam, work: c.work, channel: 'instagram', format: f, variant: c.variant ?? null });
}

/** 台帳の行を読む（無ければ null） */
export async function readIgPublication(root, folder, format) {
  const id = await igPubId(root, folder, format);
  if (!id) return null;
  return loadRegistry(root).publications.find((p) => p.id === id) ?? null;
}

/** 予約前に、見た版のハッシュ付き承認と予定時刻が今の本文・素材に一致するかを調べる。 */
export function assertIgScheduleApproval(root, row, publishAt) {
  if (!row.legacyKey?.startsWith('profile-pinned/')) return;
  if (!['approved', 'rendered', 'scheduled'].includes(row.status)) throw new Error(`${row.id}: 投稿前の状態が ${row.status}（approved/rendered/scheduled が必要）`);
  if (!row.publishAt || Date.parse(row.publishAt) !== Date.parse(publishAt)) throw new Error(`${row.id}: 承認した予約日時と投稿日時が違う`);
  const reg = loadRegistry(root);
  const media = new Map(reg.media.map((m) => [m.id, m]));
  const state = approvalState(root, row, media);
  if (!state.final.valid || row.approval?.by !== 'user' || row.approval?.grandfathered) {
    throw new Error(`${row.id}: 現版のハッシュ付き運営者承認がない`);
  }
}

/**
 * 状態を書く。event:
 * - 'scheduled': { publishAt, postId?, receipt? }（予約した。postId は Business Suite の ID）
 * - 'published': { url, evidence: { kind, ref } }（公開を確かめた。url は /p/ か /reel/ の URL）
 * - 'unscheduled': {}（予約を取り消した → draft に戻すのではなく、行を approved のままにして publishAt を外す）
 * 遷移は config の transitions に従い、合わなければ投げる（例外: stopped(unverified-legacy)→published は証拠つきで可）。
 * @returns {Promise<object>} 書いた行
 */
export async function recordIg(root, folder, format, event, data = {}) {
  const id = await igPubId(root, folder, format);
  if (!id) throw new Error(`Instagram の作品フォルダとして台帳で扱えない: ${folder}`);
  const cfg = loadRegistryConfig(root);
  const reg = loadRegistry(root);
  const cur = reg.publications.find((p) => p.id === id);
  if (!cur) throw new Error(`台帳に無い公開: ${id}（先に npm run registry -- import-instagram --commit）`);
  const row = Object.fromEntries(Object.entries(cur).filter(([k]) => !['file', 'exam', 'channel'].includes(k)));
  const can = (to) => row.status === to || canTransition(cfg, row.status, to, 'instagram');
  const grand = row.approval ?? { by: 'user', contentSha256: null, grandfathered: true };
  if (event === 'scheduled') {
    if (!data.publishAt) throw new Error('scheduled には publishAt が要る');
    if (!can('scheduled')) throw new Error(`${row.status} → scheduled は遷移に無い（${id}）`);
    assertIgScheduleApproval(root, cur, data.publishAt);
    if (row.status === 'scheduled') {
      if (!data.postId || !data.receipt) throw new Error('予約済み行の再記録にはプランナーで読み戻した postId と receipt が要る');
      if (row.platform?.id && row.platform.id !== String(data.postId)) throw new Error(`${id}: 既存の Business Suite 投稿 ID と違う`);
    }
    Object.assign(row, { status: 'scheduled', publishAt: data.publishAt, approval: cur.approval ?? grand });
    row.platform = { ...(row.platform ?? {}), privacy: 'scheduled', ...(data.postId ? { id: String(data.postId), kind: 'business-suite' } : {}), ...(data.receipt ? { evidence: { kind: 'planner-receipt', ref: data.receipt } } : {}) };
    delete row.stopReason; delete row.reason;
  } else if (event === 'published') {
    if (!data.url || !data.evidence) throw new Error('published には url と evidence が要る');
    const fromUnverified = row.status === 'stopped' && row.stopReason === 'unverified-legacy';
    if (!fromUnverified && !can('published')) throw new Error(`${row.status} → published は遷移に無い（${id}）`);
    const m = String(data.url).match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
    Object.assign(row, { status: 'published', approval: grand, platform: { id: m?.[1], url: data.url, privacy: 'public', kind: 'shortcode', evidence: data.evidence } });
    delete row.stopReason; delete row.reason;
  } else if (event === 'unscheduled') {
    if (row.status !== 'scheduled') return row;
    Object.assign(row, { status: 'approved', approval: grand });
    delete row.publishAt;
    if (row.platform) { row.platform = { ...row.platform }; delete row.platform.privacy; delete row.platform.id; delete row.platform.kind; }
  } else {
    throw new Error(`知らない event: ${event}`);
  }
  const { upsertPublications } = await import('./content-registry-write.mjs');
  upsertPublications(root, 'instagram', cur.exam, [row]);
  return row;
}
