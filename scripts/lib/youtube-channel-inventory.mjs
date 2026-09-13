export async function channelInventory(youtube, expected, { record = () => {}, knownVideoIds = [] } = {}) {
  const channels = (await youtube.channels.list({ part: 'snippet,contentDetails,statistics', mine: true })).data.items ?? [];
  const channel = channels[0];
  if (channels.length !== 1 || channel.id !== expected.id || channel.snippet?.title !== expected.title) throw new Error('YouTube account mismatch');
  const playlistId = channel.contentDetails?.relatedPlaylists?.uploads;
  if (!playlistId) throw new Error('Uploads playlist missing');
  const ids = [], duplicateIds = [], tokens = new Set();
  let pageToken, reportedTotal;
  do {
    const data = (await youtube.playlistItems.list({ part: 'contentDetails', playlistId, maxResults: 50, ...(pageToken ? { pageToken } : {}) })).data;
    await record({ kind: 'playlist-page', pageToken: pageToken ?? null, data });
    if (reportedTotal === undefined) reportedTotal = data.pageInfo?.totalResults;
    if (reportedTotal !== data.pageInfo?.totalResults) throw new Error('Channel changed during pagination; repeat inventory');
    const page = data.items ?? [];
    if (!page.length && data.nextPageToken) throw new Error('Empty page with next token');
    for (const item of page) {
      const id = item.contentDetails?.videoId;
      if (!/^[\w-]{11}$/.test(id ?? '')) throw new Error(`Missing/invalid video id at entry ${ids.length}`);
      if (ids.includes(id)) duplicateIds.push(id);
      else ids.push(id);
    }
    pageToken = data.nextPageToken;
    if (pageToken && tokens.has(pageToken)) throw new Error('Pagination token repeated');
    if (pageToken) tokens.add(pageToken);
  } while (pageToken);
  if (!ids.length || !Number.isInteger(reportedTotal) || reportedTotal < 1) throw new Error('Inventory empty or total unavailable');
  if (knownVideoIds.some(id => !/^[\w-]{11}$/.test(id))) throw new Error('Invalid ledger video id');
  const candidateIds = [...new Set([...ids, ...knownVideoIds])];
  const videos = [];
  for (let i = 0; i < candidateIds.length; i += 50) {
    const batch = candidateIds.slice(i, i + 50);
    const found = (await youtube.videos.list({ part: 'snippet,status,contentDetails', id: batch.join(',') })).data.items ?? [];
    if (new Set(found.map(v => v.id)).size !== found.length ||
        found.some(v => !batch.includes(v.id) || v.snippet?.channelId !== expected.id)) throw new Error('Video detail coverage/channel mismatch');
    videos.push(...found);
  }
  const foundIds = new Set(videos.map(v => v.id));
  const missingPlaylistIds = ids.filter(id => !foundIds.has(id));
  const evidence = { playlistUnique: ids.length, duplicateIds, missingPlaylistIds,
    supplementedFromLedger: videos.filter(v => !ids.includes(v.id)).map(v => v.id),
    missingLedgerIds: knownVideoIds.filter(id => !foundIds.has(id)) };
  await record({ kind: 'coverage', reportedTotal, checked: videos.length, evidence });
  // Uploads can repeat public items across private/public page boundaries. Deduplication
  // alone is NOT completeness: corroborate omitted IDs against our ledger and videos.list.
  if (missingPlaylistIds.length || videos.length !== reportedTotal) throw new Error(`Inventory incomplete: owned ${videos.length}, reported ${reportedTotal}, missing playlist ${missingPlaylistIds.length}`);
  return { generatedAt: new Date().toISOString(), channel: expected, playlistId, reportedTotal,
    checked: videos.length, complete: true, evidence, videos };
}
