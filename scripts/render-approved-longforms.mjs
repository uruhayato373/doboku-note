#!/usr/bin/env node
/** Render approved 1級・2級 longform packs in publishAt order. Safe to resume. */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STATE_PATH = join(ROOT, '.claude/state/video-content-status.json');
const PACKS_ROOT = join(ROOT, 'content/sns/video-packs');
const OUT_ROOT = join(ROOT, '.tmp/video-render');
const TARGET_EXAMS = new Set(['civil-construction-1', 'civil-construction-2']);
const argv = process.argv.slice(2);
const value = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const max = Math.max(1, Number(value('--max', '999')) || 999);
const shardCount = Math.max(1, Number(value('--shard-count', '1')) || 1);
const shardIndex = Math.max(0, Number(value('--shard-index', '0')) || 0);
if (shardIndex >= shardCount) throw new Error(`--shard-index は --shard-count 未満にしてください: ${shardIndex}/${shardCount}`);

function complete(packId) {
  const dir = join(OUT_ROOT, packId);
  const video = join(dir, 'video.mp4');
  const thumbnail = join(dir, 'img/00-cover.png');
  const manifestPath = join(dir, 'render-manifest.json');
  if (![video, thumbnail, manifestPath].every((path) => existsSync(path) && statSync(path).size > 0)) return false;
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    return manifest.tts === true && manifest.mp4 === 'video.mp4' && manifest.totalSec >= 60 && manifest.totalSec <= 1200;
  } catch {
    return false;
  }
}

function packs() {
  const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  const out = [];
  for (const exam of TARGET_EXAMS) {
    const examRoot = join(PACKS_ROOT, exam);
    for (const entry of readdirSync(examRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dir = join(examRoot, entry.name);
      const manifest = JSON.parse(readFileSync(join(dir, 'video-pack.json'), 'utf8'));
      const derivative = state.packs?.[manifest.packId]?.derivatives?.longform;
      if (derivative?.status === 'approved') out.push({ dir, packId: manifest.packId, publishAt: derivative.publishAt });
    }
  }
  return out.sort((a, b) => new Date(a.publishAt).getTime() - new Date(b.publishAt).getTime());
}

function main() {
  const all = packs();
  const allPending = all.filter(({ packId }) => !complete(packId));
  const pending = allPending.filter((_, index) => index % shardCount === shardIndex).slice(0, max);
  console.log(`render target: ${pending.length} / approved=${all.length} / already-complete=${all.length - allPending.length} / shard=${shardIndex}/${shardCount}`);
  const failures = [];
  for (const [index, item] of pending.entries()) {
    console.log(`\n[${index + 1}/${pending.length}] ${item.publishAt} ${item.packId}`);
    const result = spawnSync(process.execPath, [
      join(ROOT, 'scripts/render-longform.mjs'), '--pack-dir', item.dir, '--resume',
    ], { cwd: ROOT, stdio: 'inherit' });
    if (result.status !== 0 || !complete(item.packId)) failures.push(item.packId);
  }
  console.log(`\nrender result: success=${pending.length - failures.length} failed=${failures.length} remaining=${packs().filter(({ packId }) => !complete(packId)).length}`);
  if (failures.length) {
    console.error(`failed packs: ${failures.join(', ')}`);
    process.exitCode = 1;
  }
}

main();
