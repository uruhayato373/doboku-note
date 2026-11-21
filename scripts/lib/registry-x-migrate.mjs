/**
 * registry-x-migrate.mjs — 一回きり: X の状態の正本を下書きの status.json からコンテンツ台帳へ移す（DN-0612 P7・2026-11-21）。
 * npm run registry -- migrate-x [--commit] が使う。古い下書きを消す PR で、このファイルと migrate-x を消す。
 *
 * 残す下書き（予約中 5・ストック 9・訂正 1）だけを扱う:
 *   1. tweets.md の本文と status.json の text が全部一致するかを確かめる（違えば止まる）
 *   2. 台帳に行が無い投稿の行を作る（status.json の状態を新しい意味へ写す）
 *        queued（X の予約に入れた）→ scheduled / scheduled（計画だけ）→ approved / posted → published（posted_url があるとき）か scheduled
 *        cancelled → stopped(user-decision) / replaced → stopped(superseded) / それ以外・status.json に無い → draft
 *   3. 既にある行の文面の場所（copy）を tweets.md#tweet/N に替える。訂正の 1 本には元の投稿 ID を reason に書く
 * 承認は、X の予約に入れた・計画に載せた時点の運営者の判断を写したもの（grandfathered・ハッシュなし）。
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readJsonIf } from './json-io.mjs';
import { parseTweetBlocks } from './x-tweets-md.mjs';
import { xExam, xWorkId } from './registry-x-state.mjs';
import { xFolderRef, xPublicationRow } from './registry-x-ops.mjs';
import { X_HANDLE } from './site-identity.mjs';

export const X_KEEP_FOLDERS = [
  '096-civil1-pressure-correction',
  '097-civil1-diagram-reuse', '098-cem-textbook-diagrams', '099-pe-construction-textbook-diagrams',
  '100-pe-first-stage-calculation-diagrams', '101-civil-textbook-diagrams', '103-cem-existing-figure-diagrams',
  '108-civil1-prestress-diagrams', '109-civil1-construction-diagrams', '114-pe-merit-series',
  '112-pe-first-stage-final-2026-11', '113-concrete-chief-final-2026-11', '117-pe-oral-w1-2026-11',
  '118-pe-oral-rest-2026-11', '120-pe-oral-coconala-w2-2026-11',
];

const GRAND = { by: 'user', contentSha256: null, grandfathered: true };

/**
 * 台帳に行の無いフォルダの資格と作品 ID。機械の命名（xWorkId）は「-2026-11」を「11」に縮めて読みにくいので、ここで決める。
 * 114 はフォルダ名から資格が決まらない（技術士の受験・取得のメリット。建設部門の記事へ送る）。
 */
const NEW_WORKS = {
  '112-pe-first-stage-final-2026-11': { exam: 'pe-first-stage', id: 'pe1-final-nov' },
  '113-concrete-chief-final-2026-11': { exam: 'concrete-chief-engineer', id: 'concrete-chief-final-nov' },
  '114-pe-merit-series': { exam: 'pe-construction', id: 'pe-merit-series' },
  '117-pe-oral-w1-2026-11': { exam: 'pe-construction', id: 'pe-oral-w1-nov' },
  '118-pe-oral-rest-2026-11': { exam: 'pe-construction', id: 'pe-oral-rest-nov' },
  '120-pe-oral-coconala-w2-2026-11': { exam: 'pe-construction', id: 'pe-oral-coconala-w2-nov' },
};

/** status.json の 1 投稿 → 新しい意味の台帳の状態の欄 */
function stateFromStatus(t) {
  if (!t) return { status: 'draft' };
  if (t.status === 'cancelled') return { status: 'stopped', stopReason: 'user-decision', reason: t.cancelled_reason ?? t.note ?? '取り消した' };
  if (t.status === 'replaced') return { status: 'stopped', stopReason: 'superseded', reason: t.replaced_by ? `差し替え: ${t.replaced_by}` : '差し替えた' };
  if (t.status === 'posted') {
    const id = /\/status\/(\d+)/.exec(t.posted_url ?? '')?.[1];
    if (id) {
      const platform = { id, url: t.posted_url ?? `https://x.com/${X_HANDLE}/status/${id}`, privacy: 'public', evidence: { kind: 'posted-url', ref: 'status.json' } };
      if (t.posted_at) platform.publishedAt = new Date(Date.parse(t.posted_at)).toISOString();
      return { status: 'published', approval: GRAND, platform, ...(t.scheduled_at ? { publishAt: t.scheduled_at } : {}) };
    }
    if (t.scheduled_at) return { status: 'scheduled', publishAt: t.scheduled_at, approval: GRAND };
    return { status: 'draft' };
  }
  if (t.status === 'queued' && t.scheduled_at) return { status: 'scheduled', publishAt: t.scheduled_at, approval: GRAND };
  if (t.status === 'scheduled' && t.scheduled_at) return { status: 'approved', publishAt: t.scheduled_at, approval: GRAND };
  return { status: 'draft' };
}

/**
 * @returns {{ works: {exam, row}[], publications: {exam, row}[], report: object }}
 */
export function planXMigration(root, { reg }) {
  const works = [];
  const publications = [];
  const report = { folders: 0, textChecked: 0, created: {}, copyMoved: 0, correction: 0 };
  const mismatch = [];
  for (const folder of X_KEEP_FOLDERS) {
    const { name, rel, dir } = xFolderRef(folder);
    const mdPath = join(root, dir, 'tweets.md');
    if (!existsSync(mdPath)) throw new Error(`残す下書きに tweets.md が無い: ${dir}`);
    report.folders += 1;
    const blocks = parseTweetBlocks(readFileSync(mdPath, 'utf8'));
    const status = readJsonIf(root, `${dir}/status.json`);
    const tweets = status?.tweets ?? {};
    for (const [key, t] of Object.entries(tweets)) {
      const b = blocks.find((x) => x.key === String(Number(key)));
      report.textChecked += 1;
      if (!b || b.text !== String(t.text ?? '').trim()) mismatch.push(`${name}#${key}`);
    }
    const work = reg.works.find((w) => w.definition === dir);
    const exam = work?.exam ?? NEW_WORKS[name]?.exam ?? xExam(name, status?.exam);
    const workId = work?.id ?? NEW_WORKS[name]?.id ?? xWorkId(name);
    if (!work && !NEW_WORKS[name]) throw new Error(`台帳に作品の無いフォルダの資格と ID が決まっていない: ${name}`);
    if (!work) works.push({ exam, row: { id: workId, kind: 'x-thread', definition: dir, legacyKey: name } });
    for (const b of blocks) {
      const cur = reg.publications.find((p) => p.channel === 'x' && p.legacyKey === `${rel}#${b.key}`);
      if (cur) {
        const row = Object.fromEntries(Object.entries(cur).filter(([k]) => !['file', 'exam', 'channel'].includes(k)));
        const copy = `${dir}/tweets.md#tweet/${b.key}`;
        let changed = false;
        if (row.copy !== copy) { row.copy = copy; report.copyMoved += 1; changed = true; }
        const corr = tweets[b.key]?.correction_of;
        if (corr && row.reason !== `訂正: ${corr}`) { row.reason = `訂正: ${corr}`; report.correction += 1; changed = true; }
        if (row.status === 'draft' && row.reason === 'tweets.md にだけある（status.json に鍵が無い）') { delete row.reason; changed = true; }
        if (changed) publications.push({ exam: cur.exam, row });
        continue;
      }
      const row = { ...xPublicationRow({ exam, work: workId, dir, rel, key: b.key }), ...stateFromStatus(tweets[b.key]) };
      report.created[row.status] = (report.created[row.status] ?? 0) + 1;
      publications.push({ exam, row });
    }
  }
  if (mismatch.length) throw new Error(`tweets.md と status.json の本文が違う ${mismatch.length} 件（直してから移す）: ${mismatch.slice(0, 10).join(', ')}`);
  return { works, publications, report };
}
