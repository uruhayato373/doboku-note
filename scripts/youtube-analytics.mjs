#!/usr/bin/env node
/** 公開台帳の現役動画を YouTube Analytics API で計測する。認証が無ければ記録を書かず exit 2。 */
import { readDataset } from './lib/dataset-io.mjs';
import { fileURLToPath } from 'node:url';
import { writeDataset } from './lib/dataset-write.mjs';
import { youtubePublications } from './lib/registry-youtube-view.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { jstDayOf } from './lib/jst-date.mjs';
import { analyticsSnapshot, queryVideoAnalytics } from './lib/youtube-analytics-report.mjs';

const DAY = 86_400_000;
const REQUIRED = ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN'];

/** 停止済み・旧Shortsを除き、動画IDを持つ公開行だけを計測対象にする。 */
export function analyticsTargets(publications) {
  return publications.filter((p) => p.status === 'published' && !p.legacy && p.videoId && p.format !== 'reel')
    .map((p) => ({ publicationId: p.id, videoId: p.videoId, packId: p.work, kind: p.format === 'short' ? 'short' : 'longform' }))
    .sort((a, b) => a.publicationId.localeCompare(b.publicationId));
}

export function reportPeriod(now = Date.now()) {
  return { startDate: jstDayOf(now - 29 * DAY), endDate: jstDayOf(now - 2 * DAY) };
}

async function main() {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const dry = args.includes('--dry-run');
  const channelId = readDataset(REPO_ROOT, 'config.youtube-formats').channel.id;
  const targets = analyticsTargets(youtubePublications(REPO_ROOT));
  const startedAt = Date.now();
  const period = reportPeriod(startedAt);
  console.log(`[youtube-analytics] 公開台帳の計測対象 ${targets.length} 本 / 期間 ${period.startDate}〜${period.endDate}`);
  if (!targets.length) { console.error('[youtube-analytics] 対象0件。計測成立とは扱わない'); process.exitCode = 2; return; }
  if (check) return;
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length) { console.error(`[youtube-analytics] 認証情報が不足: ${missing.join(', ')}。記録しない`); process.exitCode = 2; return; }
  const { google } = await import('googleapis');
  const auth = new google.auth.OAuth2(process.env.YOUTUBE_CLIENT_ID, process.env.YOUTUBE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
  const api = google.youtubeAnalytics({ version: 'v2', auth });
  const videos = [];
  for (let i = 0; i < targets.length; i += 4) {
    const batch = await Promise.all(targets.slice(i, i + 4).map(async (target) => ({
      ...target, ...await queryVideoAnalytics(api, channelId, target.videoId, period),
    })));
    videos.push(...batch);
  }
  const snapshot = analyticsSnapshot({ channelId, period, fetchedAt: new Date(startedAt).toISOString(), videos });
  console.log(`[youtube-analytics] API照合 ${videos.length}/${targets.length} 本 / 指標行 ${snapshot.coverage.measured} 本 / 行なし ${snapshot.coverage.noData} 本`);
  if (!snapshot.coverage.measured) { console.error('[youtube-analytics] 全動画で指標行なし。取得不成立として記録しない'); process.exitCode = 2; return; }
  if (dry) return;
  const { file } = writeDataset(REPO_ROOT, 'youtube.analytics', snapshot, { values: { date: jstDayOf(startedAt) } });
  console.log(`[youtube-analytics] 保存: ${file}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => { console.error(`[youtube-analytics] 取得失敗・保存なし: ${error.message}`); process.exitCode = 2; });
}
