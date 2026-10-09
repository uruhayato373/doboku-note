/**
 * registry-x-state.mjs — X の下書きフォルダ（content/sns/x/{draft,published}/**）の投稿を、コンテンツ台帳の作品・公開の行に変換する
 * （DN-0612・content-registry.md「X」）。書き込みはしない（npm run registry -- import-x が書く）。
 *
 * - 作品 = 下書きフォルダ。ID は先頭の NNN- を外し、日付（-2026）を外し、末尾の「-数字」は前の語にくっつける（規則に合う形を機械で付ける）。
 *   日本語だけで ASCII が残らないフォルダは x{NNN}-{残り}。元のフォルダ名は legacyKey（作品）に残す。
 * - 公開 = 1 ツイート（tweets.md の「## Tweet NN」と status.json の鍵 "N"）。variant は t{NN}。文面は status.json#tweets/{鍵}（題名・本文）。
 * - 公開の証拠（運営者の決定・2026-10-09）: 自分の投稿の一覧（data/x/own-posts）と本文が一致（URL・#タグ・空白を除いて完全一致、
 *   なければ先頭 40 字の一致で 1 件だけ）するもの、または posted_url があるものだけ published。時刻だけの一致・結び付かないものは
 *   stopped(unverified-legacy)。凍結した旧アカウント（_archive-old-account）の投稿・予約は stopped(gone)。
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { idShapeIssues, pubIdOf } from './content-registry.mjs';
import { datasetDir } from './datasets.mjs';
import { readJsonIf } from './json-io.mjs';
import { X_HANDLE } from './site-identity.mjs';

export const X_ROOT = 'content/sns/x';
const OLD_ACCOUNT = '_archive-old-account';
const EXAM_ALIAS = {
  'pe-construction': 'pe-construction', 'pe-comprehensive': 'pe-comprehensive-management', cem: 'pe-comprehensive-management',
  'civil-1': 'civil-construction-1', civil1: 'civil-construction-1', 'civil-construction-1': 'civil-construction-1',
  'civil-2': 'civil-construction-2', civil2: 'civil-construction-2', 'civil-1-2': 'civil-construction-1-2', 'civil-1+2': 'civil-construction-1-2', civil: 'civil-construction-1-2',
  'concrete-chief': 'concrete-chief-engineer', 'pe-first-stage': 'pe-first-stage', rccm: 'rccm',
};

/** フォルダ名 → 作品 ID（規則に合う形） */
export function xWorkId(folder) {
  const m = /^(\d{3})-(.*)$/.exec(folder);
  const num = m?.[1] ?? '';
  const rest = m ? m[2] : folder;
  const ascii = rest.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(?:^|-)20\d{2}(?=-|$)/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const fold = (s) => s.replace(/-(\d+)$/, '$1');
  const nonAscii = /[^\x00-\x7f]/.test(rest);
  if (!nonAscii && ascii.length >= 3 && /^[a-z]/.test(ascii)) return fold(ascii);
  return fold(`x${num}${ascii ? `-${ascii}` : ''}`);
}

/** フォルダの資格（status.json の exam か、名前から） */
export function xExam(folder, statusExam) {
  if (statusExam && EXAM_ALIAS[statusExam]) return EXAM_ALIAS[statusExam];
  const rest = folder.replace(/^\d{3}-/, '');
  for (const [k, v] of Object.entries(EXAM_ALIAS).sort((a, b) => b[0].length - a[0].length)) if (rest.startsWith(`${k}-`) || rest === k) return v;
  return 'account';
}

const normText = (s) => String(s ?? '').replace(/https?:\/\/\S+/g, '').replace(/[#＃]\S+/g, '').replace(/\s+/g, '').trim();

/** 自分の投稿の一覧（全ファイルを id で合わせる） */
export function loadOwnPosts(root) {
  const dir = join(root, datasetDir('x.own-posts'));
  const byId = new Map();
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).sort() : [];
  for (const f of files) for (const p of JSON.parse(readFileSync(join(dir, f), 'utf8')).posts ?? []) byId.set(p.id, p);
  return { posts: [...byId.values()], ref: `${datasetDir('x.own-posts')}/（${files.length} ファイル）` };
}

/** 下書きフォルダを集める（draft・published の直下と、_ で始まる箱の下） */
export function xFolders(root) {
  const out = [];
  for (const base of ['draft', 'published']) {
    const abs = join(root, X_ROOT, base);
    if (!existsSync(abs)) continue;
    for (const n of readdirSync(abs)) {
      const p = join(abs, n);
      if (!statSync(p).isDirectory()) continue;
      if (n.startsWith('_')) {
        for (const m of readdirSync(p)) if (statSync(join(p, m)).isDirectory()) out.push({ rel: `${base}/${n}/${m}`, folder: m, box: n });
      } else out.push({ rel: `${base}/${n}`, folder: n, box: null });
    }
  }
  return out;
}

/** tweets.md の「## Tweet NN」の番号 */
function tweetKeys(root, dir) {
  const p = join(root, dir, 'tweets.md');
  if (!existsSync(p)) return [];
  return [...readFileSync(p, 'utf8').matchAll(/^## Tweet (\d+)/gm)].map((m) => String(Number(m[1])));
}

/**
 * @param {string} root
 * @param {{ rules: object, own?: { posts: object[], ref: string }, now?: Date }} ctx
 */
export function xRows(root, { rules, own = loadOwnPosts(root), now = new Date() }) {
  const byNorm = new Map();
  const byHead = new Map();
  for (const p of own.posts) {
    const n = normText(p.text);
    byNorm.set(n, [...(byNorm.get(n) ?? []), p]);
    byHead.set(n.slice(0, 40), [...(byHead.get(n.slice(0, 40)) ?? []), p]);
  }
  const used = new Set();
  const works = new Map();
  const publications = [];
  const report = { folders: 0, byStatus: {}, matchedByText: 0, matchedByHead: 0, byUrl: 0, idExceptions: [] };
  const grand = { by: 'user', contentSha256: null, grandfathered: true };
  for (const f of xFolders(root)) {
    report.folders += 1;
    const dir = `${X_ROOT}/${f.rel}`;
    const status = readJsonIf(root, `${dir}/status.json`);
    const exam = xExam(f.folder, status?.exam);
    let workId = xWorkId(f.folder);
    const wkey = `${exam}/${workId}`;
    if (works.has(wkey) && works.get(wkey).row.definition !== dir) workId = `${workId}-${f.box ? 'old' : 'b'}`;
    const row = { id: workId, kind: 'x-thread', definition: dir, legacyKey: f.folder };
    if (idShapeIssues('work', workId, rules).length) { row.idException = 'imported-before-cutover'; report.idExceptions.push(workId); }
    works.set(`${exam}/${workId}`, { exam, row });
    const tweets = status?.tweets ?? {};
    const keys = [...new Set([...Object.keys(tweets), ...tweetKeys(root, dir)])].sort((a, b) => Number(a) - Number(b));
    for (const key of keys) {
      const t = tweets[key] ?? null;
      const variant = `t${String(key).padStart(2, '0')}`;
      const pub = { id: pubIdOf({ exam, work: workId, channel: 'x', format: 'post', variant }), work: workId, account: 'x:main', format: 'post', variant, legacyKey: `${f.rel}#${key}` };
      if (t) pub.copy = `${dir}/status.json#tweets/${key}`;
      if (t?.scheduled_at) pub.publishAt = t.scheduled_at;
      Object.assign(pub, xStatus({ t, f, byNorm, byHead, used, now, own, report, grand }));
      publications.push(pub);
      const k = `${pub.status}${pub.stopReason ? `(${pub.stopReason})` : ''}`;
      report.byStatus[k] = (report.byStatus[k] ?? 0) + 1;
    }
  }
  return { works: [...works.values()], publications, report };
}

function xStatus({ t, f, byNorm, byHead, used, now, own, report, grand }) {
  if (!t) return { status: 'draft', reason: 'tweets.md にだけある（status.json に鍵が無い）' };
  const old = f.box === OLD_ACCOUNT;
  if (old && ['posted', 'scheduled', 'queued'].includes(t.status)) return { status: 'stopped', stopReason: 'gone', reason: '凍結した旧アカウント（@dobokunotecom）の投稿・予約' };
  if (t.status === 'replaced') return { status: 'stopped', stopReason: 'superseded', reason: t.replaced_by ? `差し替え: ${t.replaced_by}` : '差し替えた' };
  if (t.status === 'cancelled') return { status: 'stopped', stopReason: 'user-decision', reason: t.cancelled_reason ?? '取り消した' };
  if (t.status === 'posted') {
    const urlId = /\/status\/(\d+)/.exec(t.posted_url ?? '')?.[1];
    if (urlId) { used.add(urlId); report.byUrl += 1; return published(urlId, t.posted_url, { kind: 'posted-url', ref: 'status.json' }, grand); }
    const n = normText(t.text);
    const exact = n ? (byNorm.get(n) ?? []).filter((p) => !used.has(p.id)) : [];
    if (exact.length === 1) { used.add(exact[0].id); report.matchedByText += 1; return published(exact[0].id, null, { kind: 'own-posts', ref: `${own.ref}#text` }, grand); }
    const head = n.length >= 40 ? (byHead.get(n.slice(0, 40)) ?? []).filter((p) => !used.has(p.id)) : [];
    if (exact.length === 0 && head.length === 1) { used.add(head[0].id); report.matchedByHead += 1; return published(head[0].id, null, { kind: 'own-posts', ref: `${own.ref}#head40` }, grand); }
    return { status: 'stopped', stopReason: 'unverified-legacy', reason: t.text ? '自分の投稿の一覧と本文で 1 件に結び付かない' : 'status.json に本文が無く、自分の投稿の一覧と結べない' };
  }
  if (t.status === 'scheduled' || t.status === 'queued') {
    const due = t.scheduled_at && Date.parse(t.scheduled_at) < now.getTime();
    if (due) return { status: 'stopped', stopReason: 'unverified-legacy', reason: `予約（${t.scheduled_at}）を過ぎたが、投稿の記録が無い（X の CI 投稿は停止中）` };
    return { status: t.status === 'queued' ? 'approved' : 'scheduled', approval: grand };
  }
  return { status: 'draft' };
}

function published(id, url, evidence, grand) {
  return { status: 'published', approval: grand, platform: { id, url: url ?? `https://x.com/${X_HANDLE}/status/${id}`, privacy: 'public', evidence } };
}
