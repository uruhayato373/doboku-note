/**
 * 投稿済み（非公開・予約・公開）の YouTube 動画の表紙だけを、台帳の表紙に差し替える（2026-11-11）。
 * 投稿の経路は表紙を最初に一度だけ設定する作りで、公開後に差し替える経路が無かった。
 * 手元で表紙を private R2 に置き（stage）、CI が YouTube へ送って読み戻し、台帳の thumbnail.update に記録する（apply）。
 * 動画・題名・説明・公開状態は変えない（updateThumbnail が送る前後の差を検査する）。
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { loadRegistry } from './content-registry.mjs';
import { upsertPublications } from './content-registry-write.mjs';
import { jstClock } from './jst-date.mjs';
import { readJson } from './json-io.mjs';
import { getVerified, putVerified } from './youtube-single-r2.mjs';
import { thumbnailInput, updateThumbnail } from './youtube-thumbnail-update.mjs';
import { compareThumbnail, fetchThumbnail } from './youtube-thumbnail-image.mjs';

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const LIVE = ['uploaded_private', 'scheduled', 'published'];
const MAX_BYTES = 2 * 1024 * 1024;

/** 外部に触れずに決まる計画。digest は CI の --expect に渡す */
export function coverReplacePlan(root, pubId, mediaId) {
  const reg = loadRegistry(root);
  const pub = reg.publications.find((p) => p.id === pubId);
  const media = reg.media.find((m) => m.id === mediaId);
  if (!pub || pub.channel !== 'youtube' || !LIVE.includes(pub.status) || !/^[\w-]{11}$/.test(pub.platform?.id ?? '')) throw new Error(`${pubId}: 投稿済みの YouTube の公開行ではない`);
  if (!media || media.role !== 'cover' || !/^[a-f0-9]{64}$/.test(media.sha256 ?? '')) throw new Error(`${mediaId}: 台帳の表紙ではない`);
  if (!media.id.startsWith(`${pub.exam}/${pub.work}/`)) throw new Error(`${mediaId}: 別の作品の表紙`);
  const packDir = `content/sns/video-packs/${pub.exam}/${pub.work}`;
  const channel = readJson(root, `${packDir}/youtube.json`).channel;
  const videoId = pub.platform.id;
  return {
    pub, media, videoId, channel, designPath: `${packDir}/cover-design.json`,
    r2Key: `youtube-cover-replace/${media.sha256}`,
    digest: sha(JSON.stringify({ pubId, videoId, cover: media.sha256 })),
  };
}

/** 手元: 表紙の実体を private R2 に置いて読み戻す */
export async function stageCoverReplace(root, plan) {
  const path = join(root, plan.media.store.path);
  if (!existsSync(path)) throw new Error(`手元に表紙が無い: ${plan.media.store.path}（npm run media -- pull --work ${plan.pub.exam}/${plan.pub.work} --commit）`);
  await putVerified(plan.r2Key, readFileSync(path), plan.media.sha256);
  return { staged: plan.r2Key };
}

/** CI: R2 から取り、YouTube へ送り、読み戻した表紙が台帳の表紙と一致したときだけ記録する */
export async function applyCoverReplace(root, plan, youtube, { now = () => new Date() } = {}) {
  const source = await getVerified(plan.r2Key, plan.media.sha256);
  const upload = source.length > MAX_BYTES ? await sharp(source).jpeg({ quality: 93, mozjpeg: true }).toBuffer() : source;
  const input = await thumbnailInput(upload, { videoId: plan.videoId, channel: plan.channel, expectedSha256: sha(upload), commit: true });
  const report = await updateThumbnail(youtube, input, upload, { commit: true });
  const live = await fetchThumbnail(report.after);
  const compared = await compareThumbnail(source, live.data);
  if (!compared.matched) throw new Error(`送った後の表紙が台帳の表紙と一致しない（mean ${compared.mean.toFixed(2)}）。台帳は書かない`);
  const at = now();
  const jst = jstClock(at).toISOString().replace(/\.\d+Z$/, '+09:00');
  const update = {
    verifiedAt: jst, method: 'youtube-cover-replace', designPath: plan.designPath, coverKey: plan.media.id,
    uploadedSha256: input.sha256, saveConfirmed: true, visualVerifiedIn: `api-readback ${compared.method}`,
    publicFeedVerified: false, metadataUnchanged: true, videoFileChanged: false,
    privacyBefore: report.before.status?.privacyStatus ?? 'unknown', privacyAfter: report.after.status?.privacyStatus ?? 'unknown',
  };
  upsertPublications(root, 'youtube', plan.pub.exam, [{ ...plan.pub, thumbnail: { status: 'set', setAt: at.toISOString(), update } }]);
  return { videoId: plan.videoId, cover: plan.media.id, mean: compared.mean, update };
}
