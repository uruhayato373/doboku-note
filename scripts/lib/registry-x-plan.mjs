/**
 * registry-x-plan.mjs — X の月次計画（content/sns/x/campaigns/*.json）を 1 回でまとめて承認するための計算（DN-0612 P7）。
 * npm run registry -- approve-x-plan（運営者だけ）と管理画面が同じ関数を使う。書き込みはしない。
 *
 * - 計画の各投稿（draft＝下書きフォルダ・tweet＝投稿番号）を台帳の行に結ぶ。結べない投稿が 1 本でもあれば承認できない
 * - 1 投稿のハッシュは approvalHash（アカウント・形式・予定日時＝計画の date＋time・tweets.md の本文）。
 *   承認後に本文か日時を変えた投稿だけハッシュが合わなくなり、その投稿だけ承認し直す
 * - 計画の digest は「計画のファイル名と、投稿ごとの公開 ID とハッシュ」から作る。運営者は見た版の digest を --expect に渡す
 */
import { createHash } from 'node:crypto';
import { approvalHash, approvalParts, canonicalJson, loadRegistry, resolveCopy } from './content-registry.mjs';
import { readJson } from './json-io.mjs';
import { X_ROOT } from './registry-x-state.mjs';

/** 計画の 1 投稿の予定日時（+09:00） */
export const planPublishAt = (post) => `${post.date}T${post.time}:00+09:00`;

/** 予約に入れた後の行は承認を書き換えない */
const LOCKED = new Set(['scheduled', 'published', 'stopped']);

/**
 * @param {string} root
 * @param {string} planFile campaigns の下のファイル名か、リポジトリからのパス
 * @returns {{ plan: string, rows: object[], unresolved: string[], digest: string, toWrite: object[] }}
 */
export function xPlanApproval(root, planFile, { reg = loadRegistry(root) } = {}) {
  const plan = String(planFile).replace(/\\/g, '/').split('/').pop();
  const doc = readJson(root, `${X_ROOT}/campaigns/${plan}`);
  const byLegacy = new Map(reg.publications.filter((p) => p.channel === 'x').map((p) => [p.legacyKey, p]));
  const mediaById = new Map(reg.media.map((m) => [m.id, m]));
  const rows = [];
  const unresolved = [];
  for (const post of doc.posts ?? []) {
    if (!post.draft || post.tweet === undefined) { unresolved.push(`${post.date} ${post.time ?? ''}（draft・tweet が無い）`.trim()); continue; }
    const key = `draft/${post.draft}#${Number(post.tweet)}`;
    const pub = byLegacy.get(key);
    if (!pub) { unresolved.push(`${key}（台帳に行が無い。先に import-x --folder ${post.draft}）`); continue; }
    if (!resolveCopy(root, pub.copy)) { unresolved.push(`${key}（tweets.md に投稿 ${post.tweet} が無い）`); continue; }
    const publishAt = planPublishAt(post);
    const hash = approvalHash(approvalParts(root, { ...pub, publishAt }, mediaById));
    const approved = pub.approval?.contentSha256 === hash;
    rows.push({
      id: pub.id, exam: pub.exam, key, date: post.date, time: post.time, slot: post.slot ?? null, frame: post.frame ?? null,
      status: pub.status, publishAt, hash, approved, locked: LOCKED.has(pub.status), text: resolveCopy(root, pub.copy)?.text ?? '', pub,
    });
  }
  const digest = createHash('sha256')
    .update(canonicalJson({ plan, posts: rows.map((r) => ({ id: r.id, contentSha256: r.hash })).sort((a, b) => a.id.localeCompare(b.id)) }))
    .digest('hex');
  const toWrite = rows.filter((r) => !r.locked && !r.approved);
  return { plan, rows, unresolved, digest, toWrite };
}

/** 承認を書く行（台帳の形）。frame があれば planSlot に写す */
export function approvedRow(r, at = new Date().toISOString(), plan) {
  const row = Object.fromEntries(Object.entries(r.pub).filter(([k]) => !['file', 'exam', 'channel'].includes(k)));
  row.status = 'approved';
  row.publishAt = r.publishAt;
  if (r.frame) row.planSlot = r.frame;
  row.approval = { by: 'user', at, contentSha256: r.hash, scope: `x-plan:${plan}` };
  return row;
}

/**
 * publish-x の関門: この行を、この日時で予約・投稿してよいか（理由を返す。null なら可）。
 * 承認のハッシュが今の本文と予定日時に一致し、指定の日時が台帳の publishAt と同じ分であること。
 */
export function xApprovalBlock(root, pub, { scheduledAt = null, reg = loadRegistry(root) } = {}) {
  if (pub.status !== 'approved') return null; // scheduled（予約済み）・published などの扱いは呼び手が決める
  if (!pub.approval?.contentSha256) return `${pub.id} は承認のハッシュが無い（月次計画を approve-x-plan で承認し直す）`;
  const mediaById = new Map(reg.media.map((m) => [m.id, m]));
  if (approvalHash(approvalParts(root, pub, mediaById)) !== pub.approval.contentSha256) return `${pub.id} は承認した後に本文か日時が変わった（approve-x-plan で承認し直す）`;
  if (scheduledAt) {
    const minute = (v) => Math.floor(Date.parse(v) / 60000);
    if (minute(scheduledAt) !== minute(pub.publishAt)) return `${pub.id} の予約日時（${scheduledAt}）が承認した日時（${pub.publishAt}）と違う`;
  }
  return null;
}
