import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { isDeepStrictEqual } from 'node:util';
import sharp from 'sharp';

export async function thumbnailInput(buffer, { videoId, channel, expectedSha256, commit = false }) {
  if (!/^[\w-]{11}$/.test(videoId ?? '')) throw new Error('単一の videoId が必要');
  if (!/^UC[\w-]{22}$/.test(channel?.id ?? '') || !channel?.title) throw new Error('期待する channel id/title が必要');
  if (buffer.length > 2 * 1024 * 1024) throw new Error('YouTube Data API の画像上限2MBを超えています');
  const meta = await sharp(buffer).metadata();
  if (!['png', 'jpeg'].includes(meta.format)) throw new Error('PNG / JPEG のみ使用できます');
  const sha256 = createHash('sha256').update(buffer).digest('hex');
  if (expectedSha256 && sha256 !== expectedSha256) throw new Error('確認済み画像の sha256 と一致しません');
  if (commit && !expectedSha256) throw new Error('--commit には --expect-sha256 が必要');
  return { videoId, channel, sha256, bytes: buffer.length, width: meta.width, height: meta.height,
    mimeType: meta.format === 'png' ? 'image/png' : 'image/jpeg' };
}

/** Only videos.list/channels.list + thumbnails.set. Never insert/delete/videos.update. */
export async function updateThumbnail(youtube, input, buffer, { commit = false, record = () => {} } = {}) {
  if (createHash('sha256').update(buffer).digest('hex') !== input.sha256) throw new Error('画像が検証後に変わりました');
  const report = { ...input, mode: commit ? 'commit' : 'dry-run', apiAccepted: false, visualVerified: false };
  const channels = (await youtube.channels.list({ part: 'snippet', mine: true })).data.items ?? [];
  if (channels.length !== 1 || channels[0].id !== input.channel.id || channels[0].snippet?.title !== input.channel.title) throw new Error('YouTube アカウント不一致');
  async function fetchVideo() {
    const res = await youtube.videos.list({ part: 'snippet,status,contentDetails', id: input.videoId });
    const video = res.data.items?.[0];
    if (!video || res.data.items.length !== 1 || video.id !== input.videoId || video.snippet?.channelId !== input.channel.id) throw new Error('動画が存在しないか、チャンネルが一致しません');
    return video;
  }
  report.before = await fetchVideo();
  report.phase = 'checked';
  await record(report);
  if (!commit) return report;
  try {
    // Freeze bytes, not a reread of the possibly changed path. No retry on uncertain writes.
    report.phase = 'sending';
    await record(report);
    const response = await youtube.thumbnails.set({ videoId: input.videoId,
      media: { mimeType: input.mimeType, body: Readable.from([buffer]) } }, { retry: false });
    report.apiAccepted = true;
    report.response = response.data;
    report.phase = 'accepted-awaiting-readback';
    await record(report);
    report.after = await fetchVideo();
    const protectedFields = video => {
      const { thumbnails: _thumbnails, ...snippet } = video.snippet;
      return { id: video.id, snippet, status: video.status, contentDetails: video.contentDetails };
    };
    if (!isDeepStrictEqual(protectedFields(report.before), protectedFields(report.after))) throw new Error('サムネイル以外の動画情報に変化があります。自動復旧せず実機確認が必要');
    report.phase = 'api-accepted-visual-check-required';
    await record(report);
    return report;
  } catch (error) {
    report.phase = report.apiAccepted ? 'accepted-but-verification-failed' : 'write-outcome-uncertain';
    report.error = error.message;
    await record(report);
    throw error;
  }
}
