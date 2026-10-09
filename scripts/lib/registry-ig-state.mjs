/**
 * registry-ig-state.mjs — Instagram の作品フォルダ（content/sns/instagram/**）を、コンテンツ台帳の作品・公開の行に変換する
 * （DN-0611・content-registry.md「Instagram」）。書き込みはしない（npm run registry -- import-instagram が書く）。
 *
 * 公開の証拠（運営者の決定・2026-10-09）:
 * - published: posted.json の記録（照合で生存を確かめたもの）・照合で 1 件だけに結び付いた公開中の投稿・公開中の投稿の一覧で
 *   キャプション先頭が 1 件だけ一致したリール
 * - scheduled: status.json の予約で、予約の時刻がまだ先のもの
 * - stopped(unverified-legacy): 期日を過ぎた予約で公開中の一覧に見つからないもの・複数の投稿に一致して決められないもの・記録の無い
 *   ハイライトとストーリー（照合や人が証拠を付けたら published へ進める）
 * - draft: 素材があり、予約も公開もしていないもの
 * 照合の記録（.claude/state/ig-reconcile/snapshot.json）は verify-ig-status が手元のログインで作る。live.list（公開中の投稿の一覧）が要る。
 *
 * ID は規則に合う形を機械で付ける（元の相対パスは legacyKey）:
 *   video-packs/{exam}/{packId}            → 作品 packId・instagram.carousel
 *   video-packs/{exam}/{packId}-{key}      → 作品 packId・instagram.reel.{key}（definition にフォルダ）
 *   cem/exam-packs/r03/pack-01             → cem-r03-p01（_summary は cem-r03-summary）。reels-pp/{q} は instagram.reel.{q}
 *   cem/keyword-packs/{slug}               → cem-kw-{slug}（旧 YouTube のキーワード作品と同じ ID になれば同じ作品）
 *   cem/{slug}・cem/angle-reels/{slug}      → cem-{slug}・cem-angle-{slug}
 *   civil-1|civil-2/theme-packs/{t}/pack-NN → c1|c2-{t}-pNN、keyword-packs/{slug} → c1|c2-kw-{slug}
 *   pe-first-stage/...                      → pe1-kw-{slug}・pe1-r07-pNN、pe-construction/{日付-slug} → pec-{slug}
 *   highlights/NN_name                      → 資格 account・hl-{name}・instagram.highlight
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { idShapeIssues, pubIdOf } from './content-registry.mjs';
import { normHead, shortcodeOf } from './ig-reconcile-core.mjs';
import { readJsonIf } from './json-io.mjs';

export const IG_ROOT = 'content/sns/instagram';
const EXAM_OF_DIR = { cem: 'pe-comprehensive-management', 'civil-1': 'civil-construction-1', 'civil-2': 'civil-construction-2', 'pe-first-stage': 'pe-first-stage', 'pe-construction': 'pe-construction' };
const PREFIX_OF_DIR = { cem: 'cem', 'civil-1': 'c1', 'civil-2': 'c2', 'pe-first-stage': 'pe1', 'pe-construction': 'pec' };
// 末尾の「-数字」は ID の規則（末尾の連番）に触れるので、数字を前の語にくっつける（civil-1 → civil1・iso-14000 → iso14000）
const slugify = (s) => String(s).toLowerCase().replace(/_/g, '-').replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').replace(/-(\d+)$/, '$1');
const isDir = (p) => existsSync(p) && statSync(p).isDirectory();

/**
 * フォルダの相対パス（content/sns/instagram の下）→ 作品の位置。対象外は null。
 * @param {Set<string>} videoPackIds 動画パックの packId
 */
export function classifyIgFolder(rel, videoPackIds) {
  const parts = rel.split('/');
  if (parts[0] === 'video-packs' && parts.length === 3) {
    const [, exam, slug] = parts;
    if (videoPackIds.has(slug)) return { exam, work: slug, kind: 'video-pack', format: 'carousel' };
    const pack = [...videoPackIds].filter((id) => slug.startsWith(`${id}-`)).sort((a, b) => b.length - a.length)[0];
    if (pack) return { exam, work: pack, kind: 'video-pack', format: 'reel', variant: slug.slice(pack.length + 1), ownDefinition: true };
    return null;
  }
  if (parts[0] === 'highlights' && parts.length === 2) return { exam: 'account', work: `hl-${slugify(parts[1].replace(/^\d+_/, ''))}`, kind: 'ig-pack', format: 'highlight' };
  const exam = EXAM_OF_DIR[parts[0]];
  const pre = PREFIX_OF_DIR[parts[0]];
  if (!exam) return null;
  if (parts[1] === 'exam-packs' && parts.length === 4) {
    const year = parts[2];
    const pack = parts[3] === '_summary' ? 'summary' : parts[3].replace(/^pack-(\d+)$/, 'p$1');
    return { exam, work: `${pre}-${year}-${pack}`, kind: 'ig-pack' };
  }
  if (parts[1] === 'exam-packs' && parts.length === 6 && parts[4] === 'reels-pp') {
    const pack = parts[3].replace(/^pack-(\d+)$/, 'p$1');
    return { exam, work: `${pre}-${parts[2]}-${pack}`, kind: 'ig-pack', format: 'reel', variant: `pp-${slugify(parts[5])}`, ownDefinition: true };
  }
  if (parts[1] === 'theme-packs' && parts.length === 4) return { exam, work: `${pre}-${slugify(parts[2])}-${parts[3].replace(/^pack-(\d+)$/, 'p$1')}`, kind: 'ig-pack' };
  if (parts[1] === 'keyword-packs' && parts.length === 3) return { exam, work: `${pre}-kw-${slugify(parts[2])}`, kind: 'ig-pack' };
  if (parts[1] === 'angle-reels' && parts.length === 3) return { exam, work: `${pre}-angle-${slugify(parts[2])}`, kind: 'ig-pack' };
  if (parts.length === 2) return { exam, work: `${pre}-${slugify(parts[1])}`, kind: 'ig-pack' };
  return null;
}

/** 作品フォルダ（中身・状態・記録のどれかを持つもの）を集める */
export function igFolders(root) {
  const out = [];
  const base = join(root, IG_ROOT);
  const walk = (abs, rel) => {
    const names = readdirSync(abs);
    const has = (n) => names.includes(n);
    const carousel = has('slide-data.json') || isDir(join(abs, 'carousel'));
    const reels = isDir(join(abs, 'reels'));
    const stories = isDir(join(abs, 'stories'));
    if (rel && (carousel || reels || stories || has('status.json') || has('posted.json') || (rel.startsWith('highlights/') && has('slide-data.json')))) {
      out.push({ rel, carousel, reels, stories });
    }
    for (const n of names) {
      if (['reels', 'carousel', 'img', '_dev', 'stories'].includes(n) || n.startsWith('.')) continue;
      if (isDir(join(abs, n))) walk(join(abs, n), rel ? `${rel}/${n}` : n);
    }
  };
  walk(base, '');
  return out;
}

const firstFile = (root, dir, names) => names.map((n) => `${dir}/${n}`).find((p) => existsSync(join(root, p))) ?? null;

/**
 * Instagram の作品・公開の行。
 * @param {string} root
 * @param {{ snapshot: object, videoPackIds: Set<string>, rules: object, regWorks?: object[] }} ctx
 */
export function instagramRows(root, { snapshot, videoPackIds, rules, regWorks = [] }) {
  if (!snapshot?.live?.list) throw new Error('照合の記録に公開中の投稿の一覧（live.list）が無い。先に node scripts/verify-ig-status.mjs を手元で流す');
  const at = snapshot.at;
  const snapRef = `.claude/state/ig-reconcile/snapshot.json@${at}`;
  const now = Date.parse(at);
  const catOf = new Map();
  for (const [cat, list] of Object.entries(snapshot.cats ?? {})) for (const x of list) if (!['reel_gap', 'reel_built_unposted', 'anomaly'].includes(cat)) catOf.set(x.rel, { cat, ...x });
  const anomaly = new Set((snapshot.cats?.anomaly ?? []).map((x) => x.rel));
  const liveReels = new Map();
  for (const p of snapshot.live.list) {
    if (p.type !== 'reel' || !p.head) continue;
    liveReels.set(p.head, [...(liveReels.get(p.head) ?? []), p.shortcode]);
  }
  const regWorkById = new Map(regWorks.map((w) => [`${w.exam}/${w.id}`, w]));
  const works = new Map();
  const publications = [];
  const report = { folders: 0, skipped: [], byStatus: {} };
  const grand = { by: 'user', contentSha256: null, grandfathered: true };

  const addPub = (pub) => {
    publications.push(pub);
    const k = `${pub.format}:${pub.status}`;
    report.byStatus[k] = (report.byStatus[k] ?? 0) + 1;
  };

  for (const f of igFolders(root)) {
    const c = classifyIgFolder(f.rel, videoPackIds);
    if (!c) { report.skipped.push(f.rel); continue; }
    report.folders += 1;
    const dir = `${IG_ROOT}/${f.rel}`;
    const key = `${c.exam}/${c.work}`;
    if (!works.has(key) && !regWorkById.has(key)) {
      const w = { id: c.work, kind: c.kind, definition: dir };
      if (idShapeIssues('work', c.work, rules).length) w.idException = 'imported-before-cutover';
      works.set(key, { exam: c.exam, row: w });
    }
    const posted = readJsonIf(root, `${dir}/posted.json`);
    const status = readJsonIf(root, `${dir}/status.json`);
    const formats = c.format ? [c.format] : [f.carousel && 'carousel', f.reels && 'reel', f.stories && 'story'].filter(Boolean);
    for (const format of formats) {
      const variant = c.variant ?? null;
      const pub = {
        id: pubIdOf({ exam: c.exam, work: c.work, channel: 'instagram', format, variant }),
        work: c.work, account: 'instagram:main', format, legacyKey: f.rel,
      };
      if (variant) {
        pub.variant = variant;
        if (idShapeIssues('variant', variant, rules).length) pub.idException = 'imported-before-cutover';
      }
      if (c.ownDefinition || (works.get(key)?.row.definition ?? regWorkById.get(key)?.definition) !== dir) pub.definition = dir;
      const caption = format === 'reel' ? firstFile(root, dir, ['reels/caption.txt', 'caption.txt']) : format === 'story' ? firstFile(root, dir, ['stories/caption.txt']) : firstFile(root, dir, ['carousel/caption.txt', 'caption.txt']);
      if (caption) pub.copy = caption;
      Object.assign(pub, igStatus({ root, f, format, posted, status, snap: catOf.get(f.rel), anomaly: anomaly.has(f.rel), caption, liveReels, now, snapRef, grand }));
      addPub(pub);
    }
  }
  return { works: [...works.values()], publications, report };
}

/** 公開 1 件の状態（status・publishAt・platform・approval・stopReason・reason） */
function igStatus({ root, f, format, posted, status, snap, anomaly, caption, liveReels, now, snapRef, grand }) {
  const published = (url, evidence) => ({ status: 'published', approval: grand, platform: { id: shortcodeOf(url) ?? undefined, url, privacy: 'public', kind: 'shortcode', evidence } });
  const statusEntry = format === 'carousel' ? status?.carousel : format === 'reel' ? status?.reel : null;
  const sched = typeof statusEntry === 'object' ? statusEntry : null;
  const postedEntry = format === 'carousel' ? (posted?.carousel ?? (posted?.url ? posted : null)) : format === 'reel' ? posted?.reels : posted?.stories;

  if (format === 'carousel') {
    if (snap?.cat === 'published_recorded') return published(snap.recordedUrl, { kind: 'ig-snapshot', ref: `${snapRef}#recorded` });
    if (snap?.cat === 'recorded_but_gone') return { status: 'stopped', stopReason: 'gone', reason: `記録した投稿 ${snap.recordedShortcode} が消えている（照合）` };
    if (snap?.cat === 'type_mismatch') return { status: 'stopped', stopReason: 'unverified-legacy', reason: 'posted.json の記録がリールを指している（カルーセルの公開を確かめられない）' };
    if ((snap?.cat === 'published_UNrecorded' || snap?.cat === 'draft_misrecorded') && snap.matched?.length === 1 && !snap.ambiguous && !anomaly) {
      return published(`https://www.instagram.com/p/${snap.matched[0]}/`, { kind: 'ig-snapshot', ref: `${snapRef}#unrecorded` });
    }
    if (snap?.cat === 'published_UNrecorded' || snap?.cat === 'draft_misrecorded') {
      return { status: 'stopped', stopReason: 'unverified-legacy', reason: `公開中の投稿 ${snap.matched?.length ?? 0} 件（${(snap.matched ?? []).join(',')}）に一致して 1 件に決められない` };
    }
  } else if (postedEntry?.url) {
    return published(postedEntry.url, { kind: 'posted-json', ref: `${IG_ROOT}/${f.rel}/posted.json` });
  }
  if (format === 'reel' && caption) {
    const hits = liveReels.get(normHead(readFileSync(join(root, caption), 'utf8'))) ?? [];
    if (hits.length === 1) return published(`https://www.instagram.com/reel/${hits[0]}/`, { kind: 'ig-snapshot', ref: `${snapRef}#live-reel-head` });
    if (hits.length > 1) return { status: 'stopped', stopReason: 'unverified-legacy', reason: `公開中のリール ${hits.length} 件（${hits.join(',')}）に一致して 1 件に決められない` };
  }
  if (sched?.status === 'scheduled' && sched.scheduled_at) {
    const future = Date.parse(sched.scheduled_at) > now;
    const platform = sched.post_id ? { id: String(sched.post_id), kind: 'business-suite', privacy: 'scheduled', ...(sched.verification_receipt ? { evidence: { kind: 'planner-receipt', ref: sched.verification_receipt } } : {}) } : undefined;
    if (future) return { status: 'scheduled', publishAt: sched.scheduled_at, approval: grand, ...(platform ? { platform } : {}) };
    return { status: 'stopped', stopReason: 'unverified-legacy', publishAt: sched.scheduled_at, reason: `予約（${sched.scheduled_at}）を過ぎたが、照合（${snapRef.split('@')[1]}）の公開中の一覧に見つからない`, ...(platform ? { platform: { ...platform, privacy: undefined } } : {}) };
  }
  if (sched?.status === 'posted' && sched.posted_at) {
    return { status: 'stopped', stopReason: 'unverified-legacy', reason: `status.json は posted（${sched.posted_at}）だが、公開中の投稿の URL が記録に無い` };
  }
  if (format === 'reel') {
    // 動画パック由来のリールで、承認して描いたが予約していないもの（今の動画の台帳の instagramReel が rendered）
    const meta = readJsonIf(root, `${IG_ROOT}/${f.rel}/reels/meta.json`);
    if (meta?.approvedBy === 'user' && meta.renderedAt) {
      return { status: 'rendered', approval: { ...grand, ...(meta.approvedAt ? { at: new Date(meta.approvedAt).toISOString() } : {}) }, times: { rendered: new Date(meta.renderedAt).toISOString() } };
    }
  }
  if (format === 'highlight' || format === 'story') {
    return { status: 'stopped', stopReason: 'unverified-legacy', reason: 'ハイライト・ストーリーは公開の記録が無い（照合の対象外）' };
  }
  return { status: 'draft' };
}
