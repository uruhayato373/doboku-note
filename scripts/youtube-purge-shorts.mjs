#!/usr/bin/env node
/**
 * youtube-purge-shorts.mjs — チャンネルに残る古い非公開ショートを消す（取り消せない）。
 *
 * 2026-11-10: 運営者が、旧工程のショートを消してから新しい通常動画の派生として企画し直すと決めた。
 * 消すのは「非公開・予約なし・縦長・3 分以内・台帳で守られていない」動画だけ（判定は lib/youtube-purge-shorts.mjs）。
 * 認証情報は CI にしか無いので youtube-single-publish の mode=purge-shorts-audit / purge-shorts から動かす。
 * リポジトリは公開なので、非公開動画の ID・題名はログへ出さない（件数・月別・digest だけ）。
 *
 * 使い方:
 *   node scripts/youtube-purge-shorts.mjs                          # 試運転（読むだけ）。対象の件数と digest を出す
 *   node scripts/youtube-purge-shorts.mjs --apply --expect <digest> [--limit 100]   # 試運転と同じ digest のときだけ消す
 * exit: 0 成功（試運転・全件消した・対象 0 件）/ 1 消せないものがあった・digest 不一致 / 2 検査不成立（認証なし・一覧が取れない）
 */
import { parseArgs } from 'node:util';
import { google } from 'googleapis';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { loadRegistry } from './lib/content-registry.mjs';
import { readDataset } from './lib/dataset-io.mjs';
import { purgePlan } from './lib/youtube-purge-shorts.mjs';

const { values: args } = parseArgs({ options: { apply: { type: 'boolean', default: false }, expect: { type: 'string' }, limit: { type: 'string', default: '100' } } });

async function main() {
  for (const k of ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN']) {
    if (!process.env[k]) { console.error(`認証情報が無い: ${k}`); return 2; }
  }
  const auth = new google.auth.OAuth2(process.env.YOUTUBE_CLIENT_ID, process.env.YOUTUBE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
  const youtube = google.youtube({ version: 'v3', auth, retry: false });

  const expected = readDataset(REPO_ROOT, 'config.youtube-formats').channel;
  const me = (await youtube.channels.list({ part: 'snippet,contentDetails', mine: true })).data.items ?? [];
  if (me.length !== 1 || me[0].id !== expected.id) { console.error('チャンネル不一致'); return 2; }
  const playlistId = me[0].contentDetails?.relatedPlaylists?.uploads;
  const ids = [];
  let pageToken, total;
  do {
    const data = (await youtube.playlistItems.list({ part: 'contentDetails', playlistId, maxResults: 50, ...(pageToken ? { pageToken } : {}) })).data;
    total ??= data.pageInfo?.totalResults;
    for (const item of data.items ?? []) ids.push(item.contentDetails.videoId);
    pageToken = data.nextPageToken;
  } while (pageToken);
  const unique = [...new Set(ids)];
  if (!unique.length || unique.length !== total) { console.error(`一覧が揃わない: 取得 ${unique.length} / 申告 ${total}`); return 2; }
  const videos = [];
  for (let i = 0; i < unique.length; i += 50) {
    const found = (await youtube.videos.list({ part: 'snippet,status,contentDetails,fileDetails', id: unique.slice(i, i + 50).join(','), maxResults: 50 })).data.items ?? [];
    videos.push(...found.filter((v) => v.snippet?.channelId === expected.id));
  }
  if (videos.length !== unique.length) { console.error(`詳細が揃わない: 一覧 ${unique.length} / 詳細 ${videos.length}`); return 2; }

  const plan = purgePlan(videos, loadRegistry(REPO_ROOT).publications);
  console.log(`[youtube-purge-shorts] チャンネルの動画 ${plan.checked} 本を実検査 / ${args.apply ? '実行' : '試運転'}`);
  console.log(`  内訳: ${JSON.stringify(plan.counts)}`);
  console.log(`  消す対象 ${plan.targets.length} 本（アップロード月別 ${JSON.stringify(plan.byMonth)}）`);
  console.log(`  台帳に行がある対象 ${plan.ledgerRows.length} 本${plan.ledgerRows.map((id) => `\n    ${id}`).join('')}`);
  console.log(`  digest: ${plan.digest}`);
  if (!args.apply) return 0;
  if (!plan.targets.length) { console.log('対象 0 件（消すものが無い）'); return 0; }
  if (args.expect !== plan.digest) { console.error('試運転で確認した digest と一致しない。消さない'); return 1; }

  const batch = plan.targets.slice(0, Number(args.limit));
  let deleted = 0, failed = 0;
  for (const v of batch) {
    try {
      await youtube.videos.delete({ id: v.id }, { retry: false });
      const still = (await youtube.videos.list({ part: 'id', id: v.id })).data.items ?? [];
      if (still.length) failed += 1; else deleted += 1;
    } catch (error) {
      failed += 1;
      console.error(`  削除に失敗（${error?.code ?? error?.message ?? 'unknown'}）`);
      if (error?.code === 403) break; // 割当の超過。残りは翌日に試運転からやり直す
    }
  }
  console.log(`[youtube-purge-shorts] 対象 ${plan.targets.length} / 今回 ${batch.length} / 消して不在を確認 ${deleted} / 失敗 ${failed} / 残り ${plan.targets.length - deleted}`);
  return failed ? 1 : 0;
}

main().then((code) => { process.exitCode = code; }).catch((e) => { console.error(e?.message ?? e); process.exitCode = 1; });
