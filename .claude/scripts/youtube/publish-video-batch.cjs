#!/usr/bin/env node
/**
 * rendered 済みの通常動画を publishAt 順に YouTube へ予約する再開可能なバッチ。
 * 各パックは publish-video-pack.cjs が成功直後に台帳へ書くため、途中停止しても再実行できる。
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '../../..');
const STATE_PATH = path.join(ROOT, '.claude/state/video-content-status.json');
const PACKS_ROOT = path.join(ROOT, 'content/sns/video-packs');

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const exams = new Set(arg('--exam', 'civil-construction-1,civil-construction-2').split(','));
const max = Math.max(1, Number(arg('--max', '20')) || 20);
const dry = process.argv.includes('--dry-run');

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name === 'video-pack.json') out.push(p);
  }
  return out;
}

function candidates() {
  const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  return walk(PACKS_ROOT)
    .map((manifestPath) => {
      const dir = path.dirname(manifestPath);
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const youtubePath = path.join(dir, 'youtube.json');
      const derivative = state.packs?.[manifest.packId]?.derivatives?.longform;
      if (!exams.has(manifest.exam) || derivative?.status !== 'rendered' || !fs.existsSync(youtubePath)) return null;
      const youtube = JSON.parse(fs.readFileSync(youtubePath, 'utf8'));
      return { packId: manifest.packId, publishAt: youtube.longform?.publishAt };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.publishAt).getTime() - new Date(b.publishAt).getTime())
    .slice(0, max);
}

function runPack(item) {
  const result = spawnSync(process.execPath, [
    path.join(__dirname, 'publish-video-pack.cjs'), '--pack-id', item.packId, '--phase', 'longform',
  ], { cwd: ROOT, env: process.env, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return {
    ok: result.status === 0,
    detail: `${result.stdout ?? ''}\n${result.stderr ?? ''}`,
  };
}

function isRetryableProcessingError(detail) {
  return /"code":403/.test(detail)
    && /(?:youtube\.video|youtube\.thumbnail)/.test(detail)
    && /forbidden/i.test(detail)
    && !/uploadLimitExceeded|dailyLimitExceeded|quotaExceeded/i.test(detail);
}

async function main() {
  const targets = candidates();
  console.log(`batch target: ${targets.length}本 / max=${max} / exams=${[...exams].join(',')}`);
  for (const item of targets) console.log(`  ${item.publishAt} ${item.packId}`);
  if (dry || targets.length === 0) return;

  const failed = [];
  let succeeded = 0;
  for (const [index, item] of targets.entries()) {
    console.log(`\n[${index + 1}/${targets.length}] ${item.packId}`);
    const result = runPack(item);
    if (result.ok) {
      succeeded += 1;
      continue;
    }
    failed.push({ item, detail: result.detail });
    if (/uploadLimitExceeded|dailyLimitExceeded|quotaExceeded/i.test(result.detail)) {
      console.error('YouTube の日次上限を検出したため、このバッチを安全に停止します。翌日の再実行で続きから再開できます。');
      break;
    }
  }

  // YouTube はアップロード直後の処理中動画に対する thumbnail.set / videos.update を
  // 一時的に 403 forbidden で拒否することがある。同一タイトルを再利用できるため、
  // バッチ末尾で待ってから対象だけを一度再試行する（重複アップロードはしない）。
  const retryable = failed.filter(({ detail }) => isRetryableProcessingError(detail));
  if (retryable.length) {
    console.log(`\nYouTube 処理待ち ${retryable.length}本を30秒後に再試行します...`);
    await new Promise((resolve) => setTimeout(resolve, 30_000));
    for (const { item } of retryable) {
      console.log(`\n[retry] ${item.packId}`);
      const result = runPack(item);
      if (result.ok) succeeded += 1;
      else failed.find((entry) => entry.item.packId === item.packId).detail = result.detail;
    }
  }

  const unresolved = failed.filter(({ item }) => {
    const current = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    return current.packs?.[item.packId]?.derivatives?.longform?.status !== 'scheduled';
  });
  console.log(`\nbatch result: success=${succeeded} failed=${unresolved.length} remaining=${candidates().length}`);
  if (unresolved.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
