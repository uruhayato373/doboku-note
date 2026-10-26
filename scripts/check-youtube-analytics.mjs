#!/usr/bin/env node
/** 最新の YouTube Analytics 記録と公開台帳を照合する（外部通信なし）。 */
import { readDataset, readLatest } from './lib/dataset-io.mjs';
import { fileURLToPath } from 'node:url';
import { schemaOf } from './lib/dataset-validate.mjs';
import { freshnessDays, resolveDataset } from './lib/datasets.mjs';
import { youtubePublications } from './lib/registry-youtube-view.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { analyticsTargets, reportPeriod } from './youtube-analytics.mjs';

export function checkAnalyticsSnapshot(snapshot, targets, { channelId, now = Date.now(), maxAgeDays = freshnessDays('youtube.analytics', 'warnDays') }) {
  const errors = [];
  if (!snapshot) return { targets: targets.length, checked: 0, measured: 0, errors: ['計測記録が未取得'] };
  const schema = schemaOf(resolveDataset('youtube.analytics'));
  const parsed = schema.safeParse(snapshot);
  if (!parsed.success) return { targets: targets.length, checked: 0, measured: 0, errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
  if (snapshot.channelId !== channelId) errors.push(`チャンネルが違う: ${snapshot.channelId}`);
  const ageDays = Math.floor((now - Date.parse(snapshot.fetchedAt)) / 86_400_000);
  if (ageDays < 0 || ageDays > maxAgeDays) errors.push(`取得記録が古いか未来: ${ageDays} 日`);
  const expectedPeriod = reportPeriod(Date.parse(snapshot.fetchedAt));
  if (snapshot.period.startDate !== expectedPeriod.startDate || snapshot.period.endDate !== expectedPeriod.endDate) {
    errors.push(`対象期間が取得日時と違う: ${snapshot.period.startDate}〜${snapshot.period.endDate}`);
  }
  const expected = new Map(targets.map((x) => [x.videoId, x]));
  const actual = new Set(snapshot.videos.map((x) => x.videoId));
  for (const id of expected.keys()) if (!actual.has(id)) errors.push(`現役の公開動画が未計測: ${id}`);
  for (const row of snapshot.videos) {
    const target = expected.get(row.videoId);
    if (!target) { errors.push(`現役台帳に無い動画: ${row.videoId}`); continue; }
    for (const field of ['publicationId', 'packId', 'kind']) if (row[field] !== target[field]) errors.push(`${row.videoId}: ${field} が公開台帳と違う`);
  }
  if (snapshot.coverage.measured === 0) errors.push('指標行を得た動画が0件');
  return { targets: targets.length, checked: snapshot.videos.length, measured: snapshot.coverage.measured, errors };
}

function main() {
  const targets = analyticsTargets(youtubePublications(REPO_ROOT));
  const snapshot = readLatest(REPO_ROOT, 'youtube.analytics')?.data ?? null;
  const channelId = readDataset(REPO_ROOT, 'config.youtube-formats').channel.id;
  const result = checkAnalyticsSnapshot(snapshot, targets, { channelId });
  console.log(`check-youtube-analytics: 対象 ${result.targets} 本 / 記録 ${result.checked} 本 / 指標行 ${result.measured} 本 / 不一致 ${result.errors.length} 件`);
  for (const error of result.errors) console.error(`  ${error}`);
  if (result.errors.length || result.targets === 0) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
