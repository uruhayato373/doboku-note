/**
 * registry-legacy-youtube.mjs — 動画パック以前の旧 YouTube Shorts（総監の過去問 1 問ずつ・2026-06）を、コンテンツ台帳の
 * 作品・公開・素材の行に変換する（DN-0610・content-registry.md「旧 YouTube」）。書き込みはしない（npm run registry -- import-legacy-youtube が書く）。
 *
 * 取り込み元（どれも凍結。書き手は止まっている）:
 * - .claude/state/youtube-schedule.json の 200 件（鍵 r0N-pack-NN-qN。uploaded 7・消失 6・退役 187。data/youtube/posted.jsonl の 13 件は uploaded 7＋消失 6 の写しで、CLI が件数を突き合わせる）
 * - content/sns/youtube/legacy-refresh.json・legacy-metadata.json・cover-design.json の 10 件（作り直した版の鍵 r03-pfi など。
 *   元の動画は legacy-refresh の original から 1 問に結ぶ。キーワードの 2 本は記事から作ったもの）
 * - data/youtube/own-videos（自社チャンネルの公開中の一覧・yt-dlp）: 公開の証拠
 *
 * ID は規則に合う形を機械で付ける（運営者の決定・2026-10-09）: r03-pack-01-q2 → cem-r03-p01-q2、キーワード → cem-kw-{鍵}。
 * 元の鍵は legacyKey に残す。状態は、外部 ID か自社チャンネルの一覧で題名が完全一致したものだけ published。
 * 作り直した版の新しい動画 ID のうち、まだ公開されていないものは非公開 R2 の delivery-state だけが持つ（台帳には書かない）。
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { idShapeIssues, pubIdOf } from './content-registry.mjs';
import { readJsonIf } from './json-io.mjs';

export const LEGACY_EXAM = 'pe-comprehensive-management';
const SCHEDULE = '.claude/state/youtube-schedule.json';
const REFRESH = 'content/sns/youtube/legacy-refresh.json';
const METADATA = 'content/sns/youtube/legacy-metadata.json';
const COVERS = 'content/sns/youtube/cover-design.json';
const KEY_RE = /^r(\d{2})-pack-(\d{2})-q(\d)$/;

/** 旧の鍵 → 作品 ID（規則に合う形）。r03-pack-01-q2 → cem-r03-p01-q2、キーワード（記事由来）は cem-kw-{鍵} */
export function legacyWorkId(key, { keyword = false } = {}) {
  const m = KEY_RE.exec(key);
  if (m) return `cem-r${m[1]}-p${m[2]}-q${m[3]}`;
  if (keyword) return `cem-kw-${key}`;
  throw new Error(`旧 Shorts の鍵の形が違う: ${key}`);
}

/** 旧の鍵 → 中身のフォルダ（IG の過去問パック。4 問で 1 パック） */
export function legacyDefinition(key) {
  const m = KEY_RE.exec(key);
  if (!m) return null;
  return `content/sns/instagram/cem/exam-packs/r${m[1]}/pack-${m[2]}`;
}

const normTitle = (t) => String(t ?? '').replace(/\s+/g, ' ').trim();

/**
 * 旧 YouTube の作品・公開の行と、移す表紙の一覧を作る。
 * @param {string} root
 * @param {{ own: { fetchedAt: string, videos: { id: string, title: string, kind: string, packId?: string|null }[] }|null, ownRef: string, rules: object }} ctx
 * @returns {{ works: object[], publications: object[], covers: { pubId: string, from: string, sha256: string, specSha256?: string, key: string }[], report: object }}
 */
export function legacyYoutubeRows(root, { own, ownRef, rules }) {
  const schedule = readJsonIf(root, SCHEDULE);
  if (!schedule?.items?.length) throw new Error(`${SCHEDULE} が無い・0 件（取り込めない）`);
  const refresh = readJsonIf(root, REFRESH)?.entries ?? [];
  const metadata = readJsonIf(root, METADATA)?.entries ?? {};
  const covers = readJsonIf(root, COVERS)?.covers ?? {};
  const publicById = new Map((own?.videos ?? []).map((v) => [v.id, v]));
  const publicByTitle = new Map();
  for (const v of own?.videos ?? []) {
    if (v.kind !== 'short' || v.packId) continue;
    const t = normTitle(v.title);
    publicByTitle.set(t, publicByTitle.has(t) ? null : v); // 同じ題名が 2 本あれば題名では結ばない
  }
  const ownEvidence = { kind: 'own-videos', ref: ownRef };

  // 作り直した版（refresh の鍵）→ 元の 1 問の鍵（original の mp4 名）か、記事由来のキーワード
  const refreshByOriginal = new Map();
  const keywordRefresh = [];
  for (const e of refresh) {
    const m = /\/(r\d{2}-pack-\d{2}-q\d)\.mp4$/.exec(e.original ?? '');
    if (m) refreshByOriginal.set(m[1], e.key);
    else keywordRefresh.push(e);
  }

  const works = [];
  const publications = [];
  const coverMoves = [];
  const report = { schedule: schedule.items.length, published: 0, stoppedGone: 0, stoppedRetired: 0, keyword: 0, byIdMatch: 0, byTitleMatch: 0 };

  const addCover = (pubId, refreshKey) => {
    const img = covers[refreshKey]?.approvedImage;
    if (img?.path) coverMoves.push({ pubId, from: img.path, sha256: img.sha256, specSha256: img.specSha256, key: refreshKey });
  };

  for (const item of schedule.items) {
    const workId = legacyWorkId(item.key);
    const work = { id: workId, kind: 'legacy-short', definition: legacyDefinition(item.key) };
    if (idShapeIssues('work', workId, rules).length) work.idException = 'imported-before-cutover';
    works.push(work);
    const refreshKey = refreshByOriginal.get(item.key) ?? null;
    const pub = {
      id: pubIdOf({ exam: LEGACY_EXAM, work: workId, channel: 'youtube', format: 'short' }),
      work: workId, account: 'youtube:main', format: 'short', legacyKey: item.key,
    };
    if (refreshKey && metadata[refreshKey]) pub.copy = `${METADATA}#entries/${refreshKey}`;
    if (item.publishAt) pub.publishAt = item.publishAt;
    const seenById = item.videoId ? publicById.get(item.videoId) : null;
    const refreshTitle = refreshKey ? normTitle(metadata[refreshKey]?.title) : null;
    const seenByTitle = !seenById && refreshTitle ? publicByTitle.get(refreshTitle) : null;
    if (item.status === 'uploaded' && item.videoId && seenById) {
      Object.assign(pub, { status: 'published', approval: { by: 'user', contentSha256: null, grandfathered: true } });
      pub.platform = { id: item.videoId, url: `https://www.youtube.com/watch?v=${item.videoId}`, privacy: 'public', evidence: ownEvidence };
      if (item.uploadedAt) pub.times = { uploaded: new Date(item.uploadedAt).toISOString() };
      report.published += 1; report.byIdMatch += 1;
    } else if (seenByTitle) {
      // 退役した 1 問を作り直して上げ直したもの（公開中の一覧で題名が完全一致）
      Object.assign(pub, { status: 'published', approval: { by: 'user', contentSha256: null, grandfathered: true } });
      pub.platform = { id: seenByTitle.id, url: `https://www.youtube.com/watch?v=${seenByTitle.id}`, privacy: 'public', evidence: { ...ownEvidence, ref: `${ownRef}#title` } };
      report.published += 1; report.byTitleMatch += 1;
    } else if (item.lostVideoId) {
      Object.assign(pub, { status: 'stopped', stopReason: 'gone', reason: item.retiredReason ?? 'YouTube 上で消失' });
      pub.platform = { id: item.lostVideoId, privacy: 'gone' };
      report.stoppedGone += 1;
    } else {
      Object.assign(pub, { status: 'stopped', stopReason: 'user-decision', reason: item.retiredReason ?? '運営者の決定で退役' });
      report.stoppedRetired += 1;
    }
    publications.push(pub);
    if (refreshKey) addCover(pub.id, refreshKey);
  }

  for (const e of keywordRefresh) {
    const workId = legacyWorkId(e.key, { keyword: true });
    const definition = (e.source ?? '').replace(/\/article\.mdx$/, '');
    if (!definition || !existsSync(join(root, definition))) throw new Error(`${e.key}: 記事のフォルダが無い: ${e.source}`);
    works.push({ id: workId, kind: 'legacy-short', definition });
    const pub = {
      id: pubIdOf({ exam: LEGACY_EXAM, work: workId, channel: 'youtube', format: 'short' }),
      work: workId, account: 'youtube:main', format: 'short', legacyKey: e.key,
    };
    if (metadata[e.key]) pub.copy = `${METADATA}#entries/${e.key}`;
    const seen = publicByTitle.get(normTitle(metadata[e.key]?.title));
    if (seen) {
      Object.assign(pub, { status: 'published', approval: { by: 'user', contentSha256: null, grandfathered: true } });
      pub.platform = { id: seen.id, url: `https://www.youtube.com/watch?v=${seen.id}`, privacy: 'public', evidence: { ...ownEvidence, ref: `${ownRef}#title` } };
      report.published += 1; report.byTitleMatch += 1;
    } else {
      // 作り直したが公開を確かめられないもの（新しい ID は delivery-state だけが持つ）
      Object.assign(pub, { status: 'stopped', stopReason: 'unverified-legacy', reason: '作り直した版の公開を自社チャンネルの一覧で確かめられない' });
    }
    report.keyword += 1;
    publications.push(pub);
    addCover(pub.id, e.key);
  }
  return { works, publications, covers: coverMoves, report };
}
