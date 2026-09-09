import { createHash } from 'node:crypto';

export const sha256 = value => createHash('sha256').update(value).digest('hex');
export const MIGRATION = 'bridge-notebook-a-20260909';
const pick = (o, keys) => Object.fromEntries(keys.filter(k => o[k] !== undefined && o[k] !== null).map(k => [k, o[k]]));
export const writableSnippet = video => pick(video.snippet, ['title', 'description', 'tags', 'categoryId', 'defaultLanguage', 'defaultAudioLanguage']);
export const writableStatus = video => pick(video.status, ['embeddable', 'license', 'publicStatsViewable', 'selfDeclaredMadeForKids', 'containsSyntheticMedia']);
export const migrationMarker = item => `dn-a-${sha256(item.oldVideo.id + item.media.sha256).slice(0, 24)}`;
export function durationSeconds(value) {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(value ?? '');
  if (!m) throw new Error('Invalid duration');
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}
export function assertPlan(plan) {
  if (plan.schemaVersion !== 1 || plan.migration !== MIGRATION || plan.channel.id !== 'UCHRnXPqoc0Hls8nXiK_ZYqA' || plan.channel.title !== 'doboku-note') throw new Error('Unexpected migration/channel');
  if (!plan.entries?.length || new Set(plan.entries.map(e => e.oldVideo.id)).size !== plan.entries.length) throw new Error('Empty/duplicate plan');
  for (const item of plan.entries) {
    if (!/^[\w-]{11}$/.test(item.oldVideo.id) || item.oldVideo.snippet.channelId !== plan.channel.id) throw new Error('Wrong old video');
    if (!item.media) continue;
    if (item.desiredSnippet && (item.desiredSnippet.title !== item.oldVideo.snippet.title || typeof item.desiredSnippet.description !== 'string' || item.desiredSnippet.description.length > 5000 || !item.desiredSnippet.categoryId)) throw new Error('Invalid replacement metadata');
    if (item.verification?.status !== 'passed' || item.verification.revision !== MIGRATION) throw new Error('Unverified media');
    for (const media of [item.media, item.thumbnail]) {
      if (!/^[a-f0-9]{64}$/.test(media?.sha256 ?? '') || media.key !== `youtube-migration/${MIGRATION}/media/${media.sha256}.${media === item.media ? 'mp4' : 'png'}` || !(media.bytes > 0)) throw new Error('Invalid immutable media');
    }
    if (!(item.media.duration > 0) || item.thumbnail.bytes > 2097152) throw new Error('Invalid media dimensions/size');
  }
}
export async function assertChannel(youtube, channel) {
  const items = (await youtube.channels.list({ part: 'snippet', mine: true })).data.items ?? [];
  if (items.length !== 1 || items[0].id !== channel.id || items[0].snippet?.title !== channel.title) throw new Error('YouTube account mismatch');
}
export async function getVideo(youtube, id, details = false) {
  const result = (await youtube.videos.list({ part: details ? 'snippet,status,contentDetails,processingDetails,fileDetails' : 'snippet,status,contentDetails', id })).data.items ?? [];
  if (result.length > 1 || result.some(v => v.id !== id)) throw new Error('Unexpected video response');
  return result[0] ?? null;
}
export function assertOldUnchanged(actual, frozen) {
  if (!actual || actual.id !== frozen.id || actual.snippet.channelId !== frozen.snippet.channelId ||
      JSON.stringify(writableSnippet(actual)) !== JSON.stringify(writableSnippet(frozen)) ||
      JSON.stringify(writableStatus(actual)) !== JSON.stringify(writableStatus(frozen))) throw new Error('Old video metadata drift');
  const scheduledTransition = frozen.status.privacyStatus === 'private' && frozen.status.publishAt && Date.parse(frozen.status.publishAt) <= Date.now() && actual.status.privacyStatus === 'public';
  if (!scheduledTransition && (actual.status.privacyStatus !== frozen.status.privacyStatus || actual.status.publishAt !== frozen.status.publishAt)) throw new Error('Old video visibility/schedule drift');
}
export function assertProcessed(video, item) {
  if (!video || video.snippet.channelId !== item.oldVideo.snippet.channelId || video.id === item.oldVideo.id) throw new Error('Wrong replacement video');
  if (video.processingDetails?.processingStatus !== 'succeeded' || video.status.uploadStatus !== 'processed') return false;
  if (Math.abs(durationSeconds(video.contentDetails.duration) - item.media.duration) > 1) throw new Error(`Replacement duration differs: API=${video.contentDetails.duration}, source=${item.media.duration}s`);
  const stream = video.fileDetails?.videoStreams?.[0];
  if (!stream || stream.widthPixels !== item.media.width || stream.heightPixels !== item.media.height || !video.fileDetails?.audioStreams?.length) throw new Error('Replacement video/audio stream mismatch');
  return true;
}

/** Upload only. This function has no visibility-update or deletion path. */
export async function uploadReplacement(youtube, item, { load, save, getMedia, commit = false }) {
  if (!item.media) return { phase: 'awaiting-render' };
  let receipt = await load(item.oldVideo.id);
  if (receipt && (receipt.migration !== MIGRATION || receipt.oldId !== item.oldVideo.id || receipt.mediaSha256 !== item.media.sha256)) throw new Error('Receipt/version conflict');
  const old = await getVideo(youtube, item.oldVideo.id);
  assertOldUnchanged(old, item.oldVideo);
  if (!commit) return { phase: receipt?.phase ?? 'dry-run', changed: 0 };
  if (receipt?.phase === 'upload-intent' && !receipt.newId) throw new Error('Upload outcome uncertain: reconcile marker before retrying');
  if (!receipt?.newId) {
    const media = await getMedia(item.media);
    receipt = { migration: MIGRATION, oldId: old.id, sourceKey: item.sourceKey, mediaSha256: item.media.sha256,
      phase: 'upload-intent', marker: migrationMarker(item), startedAt: new Date().toISOString(), oldVideo: old };
    if (item.desiredSnippet) receipt.desiredSnippet = item.desiredSnippet;
    // Durable private journal first. A lost response must never create a second copy.
    await save(old.id, receipt);
    try {
      const snippet = structuredClone(item.desiredSnippet ?? writableSnippet(old));
      snippet.tags = [...(snippet.tags ?? []), receipt.marker];
      const response = await youtube.videos.insert({ part: 'snippet,status', notifySubscribers: false,
        requestBody: { snippet, status: { ...writableStatus(old), privacyStatus: 'private' } },
        media: { mimeType: 'video/mp4', body: media } }, { retry: false });
      if (!/^[\w-]{11}$/.test(response.data.id ?? '') || response.data.id === old.id) throw new Error('Upload response has no new identity');
      receipt.newId = response.data.id;
      receipt.phase = 'uploaded-private';
      await save(old.id, receipt);
    } catch (error) {
      const reasons = error.response?.data?.error?.errors?.map(e => e.reason) ?? [];
      receipt.error = { status: error.response?.status, reasons, message: error.message };
      // An explicit quota rejection created no resource. Network/5xx stays uncertain.
      if ([403, 429].includes(error.response?.status) && reasons.some(r => ['uploadLimitExceeded', 'dailyLimitExceeded', 'quotaExceeded', 'rateLimitExceeded'].includes(r))) receipt.phase = 'upload-rejected';
      await save(old.id, receipt);
      throw error;
    }
  }
  const video = await getVideo(youtube, receipt.newId, true);
  receipt.processingObservation = { checkedAt: new Date().toISOString(), video };
  await save(old.id, receipt);
  if (video && video.status.privacyStatus !== 'private') throw new Error('Replacement unexpectedly public');
  if (assertProcessed(video, item)) {
    receipt.phase = 'processed-private';
    receipt.processingVerifiedAt = new Date().toISOString();
    receipt.newVideo = video;
    await save(old.id, receipt);
  }
  return { phase: receipt.phase, changed: receipt.newId ? 1 : 0 };
}
