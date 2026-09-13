import { Readable } from 'node:stream';
import { MIGRATION, sha256, writableSnippet, writableStatus, getVideo, assertOldUnchanged, assertProcessed } from './youtube-migration.mjs';
import { fetchThumbnail, compareThumbnail } from './youtube-thumbnail-image.mjs';

export const THUMBNAIL_RETRY_NOT_BEFORE = '2026-09-10T10:40:47Z';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const now = () => new Date().toISOString();
export async function listAll(fetchPage, params) {
  const items = []; let pageToken;
  do { const { data } = await fetchPage({ ...params, maxResults: 50, ...(pageToken ? { pageToken } : {}) }); items.push(...(data.items ?? [])); pageToken = data.nextPageToken; } while (pageToken);
  return items;
}
export async function inspectPlaylists(youtube) {
  const playlists = await listAll(args => youtube.playlists.list(args), { part: 'snippet,status', mine: true });
  const result = [];
  for (const playlist of playlists) result.push({ playlist, items: await listAll(args => youtube.playlistItems.list(args), { part: 'snippet,contentDetails', playlistId: playlist.id }) });
  return { checkedAt: now(), complete: true, playlists: result };
}
async function checkedReceipt(item, load) {
  const receipt = await load(item.oldVideo.id);
  if (!receipt?.newId || receipt.migration !== MIGRATION || receipt.oldId !== item.oldVideo.id || receipt.newId === receipt.oldId || receipt.mediaSha256 !== item.media?.sha256) throw new Error('No matching replacement receipt');
  return receipt;
}
export async function auditReplacement(youtube, item, { load, save, commit, playlists }) {
  const old = await getVideo(youtube, item.oldVideo.id);
  assertOldUnchanged(old, item.oldVideo);
  const receipt = await load(old.id);
  if (!receipt?.newId) return { phase: 'awaiting-upload' };
  await checkedReceipt(item, load);
  const video = await getVideo(youtube, receipt.newId, true);
  if (commit) { receipt.processingObservation = { checkedAt: now(), video }; await save(old.id, receipt); }
  if (!assertProcessed(video, item)) return { phase: 'awaiting-processing' };
  const captions = old.contentDetails?.caption === 'true' ? (await youtube.captions.list({ part: 'snippet', videoId: old.id })).data.items ?? [] : [];
  const memberships = playlists.playlists.flatMap(p => p.items.filter(i => i.contentDetails?.videoId === old.id).map(i => ({ playlistId: p.playlist.id, item: i })));
  if (commit) {
    receipt.processingVerifiedAt = now(); receipt.newVideo = video;
    receipt.preservationAudit = { checkedAt: now(), oldCaptions: captions, memberships, playlistInventoryComplete: playlists.complete };
    if (video.status.privacyStatus === 'private') receipt.phase = 'processed-private';
    await save(old.id, receipt);
  }
  return { phase: 'audited', captions: captions.length, memberships: memberships.length };
}
export async function updateReplacementThumbnail(youtube, item, options) {
  const { load, save, getBytes, commit, loadControl, saveControl, fetchImage = fetchThumbnail, compare = compareThumbnail } = options;
  const receipt = await checkedReceipt(item, load), video = await getVideo(youtube, receipt.newId, true);
  if (!assertProcessed(video, item)) throw new Error('Replacement processing incomplete');
  const control = await loadControl();
  if (Date.now() < Math.max(Date.parse(THUMBNAIL_RETRY_NOT_BEFORE), Date.parse(control?.thumbnailRetryNotBefore ?? 0) || 0)) return { phase: 'thumbnail-rate-limit-wait' };
  const bytes = await getBytes(item.thumbnail);
  let match = await compare(bytes, (await fetchImage(video)).data);
  if (!match.matched && receipt.thumbnail?.phase === 'intent') return { phase: 'thumbnail-outcome-uncertain' };
  if (!match.matched && commit && receipt.thumbnail?.acceptedSha256 !== item.thumbnail.sha256) {
    receipt.thumbnail = { requestedAt: now(), expectedSha256: item.thumbnail.sha256, phase: 'intent' }; await save(receipt.oldId, receipt);
    try {
      await youtube.thumbnails.set({ videoId: receipt.newId, media: { mimeType: 'image/png', body: Readable.from(bytes) } }, { retry: false });
    } catch (error) {
      const reasons = error.response?.data?.error?.errors?.map(e => e.reason) ?? [];
      if ([403, 429].includes(error.response?.status) && reasons.some(r => /uploadRateLimitExceeded|quotaExceeded|rateLimitExceeded/.test(r))) {
        // An explicit rejection is safe to retry after cooldown. A lost response
        // remains "intent" and must be reconciled without another upload.
        receipt.thumbnail.phase = 'rejected'; receipt.thumbnail.rejectedAt = now();
        await save(receipt.oldId, receipt);
        await saveControl({ ...control, thumbnailRetryNotBefore: new Date(Date.now() + 24 * 3600e3).toISOString() });
      }
      throw error;
    }
    receipt.thumbnail.acceptedSha256 = item.thumbnail.sha256; receipt.thumbnail.phase = 'accepted'; await save(receipt.oldId, receipt);
    match = await compare(bytes, (await fetchImage(await getVideo(youtube, receipt.newId))).data);
  }
  if (match.matched && commit) { receipt.thumbnail = { ...receipt.thumbnail, phase: 'verified', expectedSha256: item.thumbnail.sha256, checkedAt: now(), comparison: match }; await save(receipt.oldId, receipt); }
  return { phase: match.matched ? 'thumbnail-verified' : 'thumbnail-awaiting-display' };
}
export function desiredStatus(oldVideo) {
  const status = { ...writableStatus(oldVideo), privacyStatus: oldVideo.status.privacyStatus };
  if (status.privacyStatus === 'private' && oldVideo.status.publishAt) {
    if (Date.parse(oldVideo.status.publishAt) <= Date.now()) status.privacyStatus = 'public';
    else status.publishAt = oldVideo.status.publishAt;
  }
  return status;
}
export function assertPreservationReady(receipt, item) {
  if (receipt.thumbnail?.phase !== 'verified' || receipt.thumbnail.expectedSha256 !== item.thumbnail.sha256) throw new Error('Thumbnail not verified');
  if (!receipt.playbackVerification?.channelMatched || !receipt.playbackVerification?.coverLogoMatched || !receipt.playbackVerification?.ctaMatched) throw new Error('Playback not verified');
  const audit = receipt.preservationAudit;
  if (!audit?.playlistInventoryComplete) throw new Error('Preservation inventory incomplete');
  if (audit.oldCaptions?.some(c => c.snippet?.trackKind !== 'ASR') && !receipt.captionVerification?.matched) throw new Error('Authored captions require migration');
  if (audit.memberships?.length && !receipt.playlistVerification?.matched) throw new Error('Playlist membership not restored');
  if (!item.sourceKey.endsWith('/longform') && !receipt.relatedVerification?.matched) throw new Error('Shorts related-video state not verified');
}
/** Visibility and deletion are separate, restartable phases. No deletion occurs during activation. */
export async function activateReplacement(youtube, item, { load, save, commit }) {
  const receipt = await checkedReceipt(item, load);
  const old = await getVideo(youtube, receipt.oldId); assertOldUnchanged(old, item.oldVideo);
  let video = await getVideo(youtube, receipt.newId, true);
  if (!assertProcessed(video, item)) throw new Error('Replacement not processed');
  assertPreservationReady(receipt, item);
  const snippet = receipt.desiredSnippet ?? item.desiredSnippet ?? writableSnippet(old), status = desiredStatus(old);
  if (!commit) return { phase: 'activation-dry-run' };
  receipt.activationIntent = { checkedAt: now(), snippet, status }; await save(receipt.oldId, receipt);
  if (!same(writableSnippet(video), snippet) || !same({ ...writableStatus(video), privacyStatus: video.status.privacyStatus, ...(video.status.publishAt ? { publishAt: video.status.publishAt } : {}) }, status)) {
    await youtube.videos.update({ part: 'snippet,status', requestBody: { id: receipt.newId, snippet, status } }, { retry: false });
    video = await getVideo(youtube, receipt.newId, true);
  }
  const scheduleMatches = !status.publishAt ? !video.status.publishAt : Date.parse(video.status.publishAt) === Date.parse(status.publishAt);
  if (!same(writableSnippet(video), snippet) || !same(writableStatus(video), writableStatus({ status })) || video.status.privacyStatus !== status.privacyStatus || !scheduleMatches) throw new Error('Activation readback differs');
  receipt.phase = 'activated'; receipt.activation = { checkedAt: now(), snippet, status }; receipt.newVideo = video;
  await save(receipt.oldId, receipt);
  return { phase: 'activated' };
}
function assertActivatedVideo(video, receipt, item) {
  if (!assertProcessed(video, item)) throw new Error('Replacement unavailable');
  const expected = desiredStatus({ ...item.oldVideo, status: receipt.activation.status });
  const scheduleMatches = expected.publishAt ? Date.parse(video.status.publishAt) === Date.parse(expected.publishAt) : !video.status.publishAt;
  if (video.status.privacyStatus !== expected.privacyStatus || !scheduleMatches || !same(writableStatus(video), writableStatus({ status: expected })) || !same(writableSnippet(video), receipt.activation.snippet)) throw new Error('Replacement changed after activation');
}
const authoredCaptions = tracks => (tracks ?? []).filter(c => c.snippet?.trackKind !== 'ASR');
const captionIdentity = c => ({ id: c.id, language: c.snippet?.language, name: c.snippet?.name, lastUpdated: c.snippet?.lastUpdated, status: c.snippet?.status, isDraft: c.snippet?.isDraft, trackKind: c.snippet?.trackKind });

/** Recheck machine-readable facts just before deletion. UI/link proof is never invented. */
export async function auditDeletion(youtube, item, { load, save, commit, getBytes, fetchImage = fetchThumbnail, compare = compareThumbnail }) {
  const receipt = await checkedReceipt(item, load);
  if (!receipt.activation || !['activated', 'delete-intent', 'deleted'].includes(receipt.phase)) throw new Error('Replacement not activated');
  assertPreservationReady(receipt, item);
  if (!receipt.linkVerification?.matched || receipt.linkVerification.newId !== receipt.newId) throw new Error('Dependent links not repaired');
  const video = await getVideo(youtube, receipt.newId, true);
  assertActivatedVideo(video, receipt, item);
  const old = await getVideo(youtube, receipt.oldId);
  if (!old && !['delete-intent', 'deleted'].includes(receipt.phase)) throw new Error('Old video missing before deletion intent');
  if (old) assertOldUnchanged(old, item.oldVideo);
  const imageMatch = await compare(await getBytes(item.thumbnail), (await fetchImage(video)).data);
  if (!imageMatch.matched) throw new Error('Replacement thumbnail changed before deletion');
  const inventory = await inspectPlaylists(youtube);
  const oldMemberships = inventory.playlists.filter(p => p.items.some(i => i.contentDetails?.videoId === receipt.oldId));
  if (oldMemberships.some(p => !p.items.some(i => i.contentDetails?.videoId === receipt.newId))) throw new Error('Playlist still depends on old video');
  const oldTracks = old?.contentDetails?.caption === 'true' ? authoredCaptions((await youtube.captions.list({ part: 'snippet', videoId: receipt.oldId })).data.items) : [];
  if (oldTracks.length) {
    const recorded = new Map(authoredCaptions(receipt.preservationAudit.oldCaptions).map(c => [c.id, c]));
    const fresh = authoredCaptions((await youtube.captions.list({ part: 'snippet', videoId: receipt.newId })).data.items);
    for (const track of oldTracks) {
      const savedTrack = recorded.get(track.id), pair = receipt.captionVerification?.tracks?.find(p => p.oldId === track.id);
      const newTrack = fresh.find(c => c.id === pair?.newId);
      if (!savedTrack || !same(captionIdentity(savedTrack), captionIdentity(track)) || !receipt.captionVerification?.matched || !pair?.contentMatched || !pair.newLastUpdated || !newTrack || newTrack.snippet.lastUpdated !== pair.newLastUpdated || newTrack.snippet.language !== track.snippet.language || newTrack.snippet.isDraft || newTrack.snippet.status !== 'serving') throw new Error('Authored caption preservation changed or unverified');
    }
  }
  const audit = { matched: true, checkedAt: now(), method: 'live-youtube-api-and-thumbnail', oldId: receipt.oldId, newId: receipt.newId,
    mediaSha256: receipt.mediaSha256, thumbnailSha256: item.thumbnail.sha256, thumbnail: imageMatch,
    linkProofSha256: sha256(JSON.stringify(receipt.linkVerification)), playlistIds: oldMemberships.map(p => p.playlist.id), authoredCaptionIds: oldTracks.map(c => c.id), oldAbsent: !old };
  if (commit) { receipt.deletionAudit = audit; await save(receipt.oldId, receipt); }
  return { receipt, old, audit };
}
export async function deleteOldReplacement(youtube, item, options) {
  const { load, save, commit } = options;
  if ((await checkedReceipt(item, load)).phase === 'deleted') return { phase: 'deleted' };
  const { receipt, old, audit } = await auditDeletion(youtube, item, options);
  if (!commit) return { phase: 'deletion-dry-run' };
  // Read the durable receipt again. A stale/manual audit cannot authorize deletion.
  const current = await checkedReceipt(item, load);
  const checkedAt = Date.parse(current.deletionAudit?.checkedAt);
  if (!same(current.deletionAudit, audit) || !Number.isFinite(checkedAt) || Date.now() - checkedAt > 3600e3 || checkedAt > Date.now() + 5000 || current.deletionAudit.linkProofSha256 !== sha256(JSON.stringify(current.linkVerification))) throw new Error('Deletion audit changed before deletion');
  if (old) {
    receipt.phase = 'delete-intent'; receipt.deleteRequestedAt = now(); await save(receipt.oldId, receipt);
    await youtube.videos.delete({ id: receipt.oldId }, { retry: false });
    if (await getVideo(youtube, receipt.oldId)) throw new Error('Old video still exists after deletion');
  }
  receipt.phase = 'deleted'; receipt.deletedAt = now(); await save(receipt.oldId, receipt);
  return { phase: 'deleted' };
}
