export async function channelInventory(youtube, expected) {
  const channels = (await youtube.channels.list({ part: 'snippet,contentDetails,statistics', mine: true })).data.items ?? [];
  const channel = channels[0];
  if (channels.length !== 1 || channel.id !== expected.id || channel.snippet?.title !== expected.title) throw new Error('YouTube account mismatch');
  const playlistId = channel.contentDetails?.relatedPlaylists?.uploads;
  if (!playlistId) throw new Error('Uploads playlist missing');
  const ids = [], tokens = new Set();
  let pageToken, reportedTotal;
  do {
    const data = (await youtube.playlistItems.list({ part: 'contentDetails', playlistId, maxResults: 50, ...(pageToken ? { pageToken } : {}) })).data;
    if (reportedTotal === undefined) reportedTotal = data.pageInfo?.totalResults;
    if (reportedTotal !== data.pageInfo?.totalResults) throw new Error('Channel changed during pagination; repeat inventory');
    const page = data.items ?? [];
    if (!page.length && data.nextPageToken) throw new Error('Empty page with next token');
    for (const item of page) {
      const id = item.contentDetails?.videoId;
      if (!/^[\w-]{11}$/.test(id ?? '') || ids.includes(id)) throw new Error('Missing or duplicate video id');
      ids.push(id);
    }
    pageToken = data.nextPageToken;
    if (pageToken && tokens.has(pageToken)) throw new Error('Pagination token repeated');
    if (pageToken) tokens.add(pageToken);
  } while (pageToken);
  if (!ids.length || ids.length !== reportedTotal) throw new Error(`Inventory incomplete: retrieved ${ids.length}, reported ${reportedTotal}`);
  const videos = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const found = (await youtube.videos.list({ part: 'snippet,status,contentDetails', id: batch.join(',') })).data.items ?? [];
    if (found.length !== batch.length || new Set(found.map(v => v.id)).size !== found.length ||
        found.some(v => !batch.includes(v.id) || v.snippet?.channelId !== expected.id)) throw new Error('Video detail coverage/channel mismatch');
    videos.push(...found);
  }
  return { generatedAt: new Date().toISOString(), channel: expected, playlistId, reportedTotal,
    checked: videos.length, complete: true, videos };
}
