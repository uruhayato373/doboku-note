#!/usr/bin/env node
// npm run youtube-retention-summary — 最新の YouTube Analytics 記録の維持率曲線を storyboard の場面の秒数に重ね、場面ごとの離脱をパックごと・型ごとに出す（読み取りのみ・外部通信なし・DN-1063）。--format <型 id> --pack <packId> --json。視聴回数が基準（RETENTION_MIN_VIEWS）未満は「判断できない」で、型ごとの平均に混ぜない。video-script-writer と video-content-qa が台本の前後に読む
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCliArgs } from './lib/cli-args.mjs';
import { readDataset, readLatest } from './lib/dataset-io.mjs';
import { readJson } from './lib/json-io.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { summarizeRetention } from './lib/youtube-retention-scenes.mjs';
import { formatOf as formatIdOf } from './youtube-own-metrics.mjs';

const PACKS = 'content/sns/video-packs';

/** packId → storyboard.json（content/sns/video-packs/<資格>/<packId>/）。無ければ null */
export function storyboardLoader(root) {
  const dirs = new Map();
  for (const exam of existsSync(join(root, PACKS)) ? readdirSync(join(root, PACKS)) : []) {
    if (!existsSync(join(root, PACKS, exam)) || exam.includes('.')) continue;
    for (const pack of readdirSync(join(root, PACKS, exam))) dirs.set(pack, `${PACKS}/${exam}/${pack}/storyboard.json`);
  }
  return (packId) => {
    const rel = dirs.get(packId);
    return rel && existsSync(join(root, rel)) ? readJson(root, rel) : null;
  };
}

function main() {
  const args = parseCliArgs({ format: { type: 'string' }, pack: { type: 'string' }, json: { type: 'boolean' } });
  const latest = readLatest(REPO_ROOT, 'youtube.analytics');
  if (!latest) { console.error('[youtube-retention-summary] YouTube Analytics の記録が無い（検査不成立）'); process.exitCode = 1; return; }
  const formats = readDataset(REPO_ROOT, 'config.youtube-formats').formats;
  const summary = summarizeRetention(latest.data, {
    formatOf: (v) => formatIdOf(v, { packId: v.packId }, formats),
    storyboardOf: storyboardLoader(REPO_ROOT),
  });
  if (args.format) summary.byFormat = summary.byFormat.filter((f) => f.format === args.format);
  if (args.pack) summary.packs = summary.packs.filter((p) => p.packId === args.pack);
  if (args.json) { console.log(JSON.stringify(summary, null, 2)); return; }
  const { counts } = summary;
  console.log(`[youtube-retention-summary] ${summary.period.startDate}〜${summary.period.endDate} / 動画 ${counts.videos} 本・場面ごとの離脱が出る ${counts.ok} 本・判断できない ${counts.undetermined} 本（視聴 ${summary.minViews} 回未満など）`);
  if (!counts.ok) console.log('  判断できる動画が無い。型ごとの傾向は出さない（台本の指示にしない）');
  for (const f of summary.byFormat) {
    console.log(`型 ${f.format}（${f.packs} 本の平均・離脱の多い場面から）`);
    for (const s of f.scenes) console.log(`  ${s.sceneId}: 動画の頭の視聴者のうち ${s.meanDropPoints} ポイント失う（${s.packs} 本）`);
  }
  for (const p of summary.packs.filter((x) => args.pack && x.state === 'undetermined')) console.log(`${p.packId}: 判断できない（${p.reason}）`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
