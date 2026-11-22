/**
 * registry-x-ops.mjs — X の投稿をコンテンツ台帳へ足す（import-x --folder）と、投稿済みへ照合する（reconcile-x）の計算（DN-0612 P7）。
 * 書き込みはしない（npm run registry が書く）。X の状態の正本は台帳で、文面は下書きフォルダの tweets.md。
 *
 * - 取り込みは「台帳に無い投稿の行を draft で足す」だけ。既にある行（承認・予約・照合の記録を持つ）は作り直さない
 *   （全件を作り直していた旧 import-x は、予約の日時を過ぎた行を一律に止めてしまい流せなかった・2026-11-21）
 * - 照合は、予約の日時を過ぎた行を自分の投稿の一覧（data/x/own-posts）と本文の先頭 40 字・投稿時刻 ±10 分で結ぶ。
 *   1 件だけ結べた行だけ published にし、結べない行は触らない（期日の超過は check-registry-due が出す）
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { idShapeIssues, pubIdOf } from './content-registry.mjs';
import { readJsonIf } from './json-io.mjs';
import { X_HANDLE } from './site-identity.mjs';
import { parseTweetBlocks } from './x-tweets-md.mjs';
import { X_ROOT, xExam, xWorkId } from './registry-x-state.mjs';

/** 「--folder」の値（フォルダ名・draft/名前・content/sns/x/draft/名前）→ { name, rel: 'draft/名前', dir: 'content/sns/x/draft/名前' } */
export function xFolderRef(value) {
  const name = String(value ?? '').replace(/\\/g, '/').replace(/\/$/, '').split('/').pop();
  if (!name) throw new Error('--folder <下書きフォルダ> が要る');
  return { name, rel: `draft/${name}`, dir: `${X_ROOT}/draft/${name}` };
}

/** tweets.md の投稿の行（1 投稿）を作る。copy は tweets.md#tweet/N */
export function xPublicationRow({ exam, work, dir, rel, key, status = 'draft' }) {
  const variant = `t${String(key).padStart(2, '0')}`;
  return {
    id: pubIdOf({ exam, work, channel: 'x', format: 'post', variant }),
    work, account: 'x:main', format: 'post', variant,
    legacyKey: `${rel}#${key}`, copy: `${dir}/tweets.md#tweet/${key}`, status,
  };
}

/**
 * 1 フォルダの台帳に無い投稿の行を作る。
 * @returns {{ exam: string, work: object|null, publications: object[], skipped: number }}
 */
export function xFolderRows(root, folder, { reg, rules, exam: examArg, slot } = {}) {
  const { name, rel, dir } = xFolderRef(folder);
  const md = join(root, dir, 'tweets.md');
  if (!existsSync(md)) throw new Error(`tweets.md が無い: ${dir}`);
  const blocks = parseTweetBlocks(readFileSync(md, 'utf8'));
  if (!blocks.length) throw new Error(`「## Tweet NN:」の投稿が 1 本も無い: ${dir}/tweets.md`);
  const known = reg.works.find((w) => w.definition === dir);
  const exam = known?.exam ?? examArg ?? xExam(name, readJsonIf(root, `${dir}/status.json`)?.exam);
  if (exam === 'account' && !examArg) throw new Error(`資格をフォルダ名から決められない: ${name}（--exam <資格 id> を付ける）`);
  const workId = known?.id ?? xWorkId(name);
  if (!known) {
    const issues = idShapeIssues('work', workId, rules);
    if (issues.length) throw new Error(`作品 ID の形が規則に合わない: ${issues.join(' / ')}（フォルダ名を直す）`);
  }
  const byLegacy = new Set(reg.publications.filter((p) => p.channel === 'x').map((p) => p.legacyKey));
  const publications = [];
  let skipped = 0;
  for (const b of blocks) {
    if (byLegacy.has(`${rel}#${b.key}`)) { skipped += 1; continue; }
    const row = xPublicationRow({ exam, work: workId, dir, rel, key: b.key });
    if (slot) row.planSlot = slot;
    publications.push(row);
  }
  return { exam, work: known ? null : { id: workId, kind: 'x-thread', definition: dir, legacyKey: name }, publications, skipped };
}

/**
 * 下書きフォルダを消した X の作品の、台帳の行の片付けを計算する（retire-x）。
 * 対象は定義フォルダ（definition）が無くなった x-thread の作品。
 *   - 止めた行（stopped）・下書き（draft）・予約の日時を過ぎた承認済み（approved）は消す
 *   - 投稿済み（published）は文面の場所（copy）を外して残す（ID・URL・日付だけ）
 *   - 公開の行が 1 つも残らない作品は作品の行も消す
 * 予約に入れた行（scheduled）と、これからの日時の承認済みは片付けない（blockers。先に止めるか reconcile-x で照合する）。
 * @param {{ works: object[], publications: object[] }} reg
 * @param {(definition: string) => boolean} folderExists
 * @returns {{ works: number, removeWorks: {exam, id}[], removePublications: {exam, id}[], strip: {exam, row}[], blockers: string[] }}
 */
export function xRetirePlan(reg, folderExists, now = new Date()) {
  const out = { works: 0, removeWorks: [], removePublications: [], strip: [], blockers: [] };
  for (const w of reg.works) {
    if (w.kind !== 'x-thread' || folderExists(w.definition)) continue;
    const pubs = reg.publications.filter((p) => p.channel === 'x' && p.exam === w.exam && p.work === w.id);
    if (pubs.length && pubs.every((p) => p.status === 'published' && !p.copy)) continue; // 片付け済み
    out.works += 1;
    let kept = 0;
    for (const p of pubs) {
      const future = p.publishAt && Date.parse(p.publishAt) >= now.getTime();
      if (p.status === 'scheduled' || (p.status === 'approved' && future)) { out.blockers.push(`${p.id}（${p.status}・${p.publishAt ?? '日時なし'}）`); kept += 1; continue; }
      if (p.status === 'published') {
        kept += 1;
        if (p.copy) {
          const row = Object.fromEntries(Object.entries(p).filter(([k]) => !['file', 'exam', 'channel', 'copy'].includes(k)));
          out.strip.push({ exam: p.exam, row });
        }
        continue;
      }
      if (['stopped', 'draft', 'approved'].includes(p.status)) { out.removePublications.push({ exam: p.exam, id: p.id }); continue; }
      out.blockers.push(`${p.id}（${p.status}）`); kept += 1;
    }
    if (kept === 0) out.removeWorks.push({ exam: w.exam, id: w.id });
  }
  return out;
}

/** 照合に使う本文（URL・#タグ・空白を落とす。own-posts は t.co の短縮 URL になるため） */
export const normXText = (s) => String(s ?? '').replace(/https?:\/\/\S+/g, '').replace(/[#＃]\S+/g, '').replace(/\s+/g, '').trim();

const HEAD = 40;
const WINDOW_MS = 10 * 60 * 1000;

/**
 * 予約の日時を過ぎた行（approved・scheduled）を自分の投稿の一覧と結ぶ。
 * @param {ReturnType<import('./registry-x-store.mjs').loadXPosts>} posts
 * @param {{ posts: object[], ref: string }} own loadOwnPosts の結果
 * @returns {{ target: number, matched: { post: object, own: object }[], unmatched: object[], noText: number }}
 */
export function reconcileXPosts(posts, own, now = new Date()) {
  const usedIds = new Set(posts.map((p) => p.platform?.id).filter(Boolean));
  const target = posts.filter((p) => ['approved', 'scheduled'].includes(p.status) && p.publishAt && Date.parse(p.publishAt) < now.getTime());
  const matched = [];
  const unmatched = [];
  let noText = 0;
  for (const p of target) {
    const head = normXText(p.text).slice(0, HEAD);
    if (!head) { noText += 1; unmatched.push(p); continue; }
    const at = Date.parse(p.publishAt);
    const hits = own.posts.filter((o) => !usedIds.has(String(o.id))
      && normXText(o.text).slice(0, HEAD) === head
      && Math.abs(Date.parse(o.postedAtJst) - at) <= WINDOW_MS);
    if (hits.length === 1) { matched.push({ post: p, own: hits[0] }); usedIds.add(String(hits[0].id)); } else unmatched.push(p);
  }
  return { target: target.length, matched, unmatched, noText };
}

/** 結べた行を published にした台帳の行を返す */
export function publishedRow(row, own, ownRef) {
  const out = { ...row, status: 'published' };
  delete out.stopReason; delete out.reason;
  out.approval = row.approval ?? { by: 'user', contentSha256: null, grandfathered: true };
  out.platform = {
    id: String(own.id), url: `https://x.com/${X_HANDLE}/status/${own.id}`, privacy: 'public',
    publishedAt: new Date(Date.parse(own.postedAtJst)).toISOString(),
    evidence: { kind: 'own-posts', ref: `${ownRef}#${own.id}` },
  };
  return out;
}
