import { getVideo, assertProcessed, writableStatus } from './youtube-migration.mjs';
import { assertPreservationReady } from './youtube-migration-finalize.mjs';

export async function scheduleReplacement(youtube, item, { publication, load, save, parentNewId }) {
  const receipt = await load(item.oldVideo.id);
  if (receipt.phase !== 'deleted' || receipt.oldId !== item.oldVideo.id || receipt.mediaSha256 !== item.media.sha256 || !publication) throw new Error('Schedule requires completed replacement and planned slot');
  assertPreservationReady(receipt, item);
  if (Date.parse(publication.publishAt) <= Date.now() + 5 * 60000) throw new Error('Publication slot expired');
  const video = await getVideo(youtube, receipt.newId, true);
  if (!assertProcessed(video, item)) throw new Error('Scheduled video unavailable');
  if (video.status.privacyStatus !== 'private') throw new Error('Publication visibility drift');
  // The UI proof is required above; recheck the selected target is still watchable.
  const parentId = receipt.relatedVerification?.relatedVideoId;
  if (!/^[\w-]{11}$/.test(parentId ?? '') || parentId !== parentNewId) throw new Error('Related target identity missing');
  const parent = await getVideo(youtube, parentId);
  if (!parent || parent.snippet.channelId !== item.oldVideo.snippet.channelId || !['public', 'unlisted'].includes(parent.status.privacyStatus)) throw new Error('Related target not watchable');
  if (receipt.publicationIntent && receipt.publicationIntent.publishAt !== publication.publishAt) throw new Error('Publication intent changed');
  receipt.publicationIntent = { publishAt: publication.publishAt, requestedAt: new Date().toISOString() };
  await save(receipt.oldId, receipt);
  if (Date.parse(video.status.publishAt) !== Date.parse(publication.publishAt)) {
    if (video.status.publishAt) throw new Error('Existing publication schedule differs');
    await youtube.videos.update({ part: 'status', requestBody: { id: receipt.newId, status: { ...writableStatus(video), privacyStatus: 'private', publishAt: publication.publishAt } } }, { retry: false });
  }
  const actual = await getVideo(youtube, receipt.newId);
  if (actual.status.privacyStatus !== 'private' || Date.parse(actual.status.publishAt) !== Date.parse(publication.publishAt)) throw new Error('Publication schedule readback differs');
  receipt.publication = { status: 'scheduled', publishAt: actual.status.publishAt, checkedAt: new Date().toISOString() };
  await save(receipt.oldId, receipt);
  return { phase: 'scheduled' };
}

