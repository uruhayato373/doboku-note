import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IG_PRUNE = join(REPO_ROOT, 'scripts/prune-instagram-video-pack-reels.mjs');
const VIDEO_PRUNE = join(REPO_ROOT, 'scripts/prune-video-renders.mjs');

function put(root, rel, body = '') {
  const path = join(root, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body);
  return path;
}

function hash(body) {
  return createHash('sha256').update(body).digest('hex');
}

function run(script, root, args = []) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    encoding: 'utf8',
  });
}

test('Instagram rolling cache: 224件のDrive照合が揃うまでfail-closedし、予約済み・29日枠外だけを削除する', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'ig-video-prune-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const manifest = { schemaVersion: 1, entries: {} };
  const verified = [];
  const videos = [];
  const now = Date.now();
  for (let i = 0; i < 224; i += 1) {
    const packId = `pack-${String(i + 1).padStart(3, '0')}`;
    const rel = `content/sns/instagram/video-packs/${packId}/reels/video.mp4`;
    const body = Buffer.from(`video-${i}`);
    const digest = hash(body);
    const publishAt = new Date(now + (i === 0 ? 40 : 7) * 24 * 60 * 60 * 1000).toISOString();
    videos.push(put(root, rel, body));
    put(root, `content/sns/instagram/video-packs/${packId}/reels/meta.json`, JSON.stringify({ sha256: digest, publishAt }));
    put(root, `content/sns/instagram/video-packs/${packId}/status.json`, JSON.stringify({
      reel: { status: i === 1 ? 'scheduled' : 'approved' },
    }));
    manifest.entries[rel] = { group: 'sns-archived-media', sha256: digest, bytes: body.length };
    verified.push(rel);
  }
  put(root, '.claude/state/assets/drive-manifest.json', JSON.stringify(manifest));

  const list = put(root, '.tmp/verified.txt', `${verified.slice(1).join('\n')}\n`);
  const blocked = run(IG_PRUNE, root, ['--verified-list', list]);
  assert.notEqual(blocked.status, 0);
  assert.match(blocked.stderr, /purge gate失敗/);

  writeFileSync(list, `${verified.join('\n')}\n`);
  const dry = run(IG_PRUNE, root, ['--verified-list', list]);
  assert.equal(dry.status, 0, dry.stderr);
  assert.match(dry.stdout, /"prune": 2/);
  assert.match(dry.stdout, /"keep": 222/);
  assert.ok(videos.every(existsSync), 'dry-runで実体を削除しない');

  const committed = run(IG_PRUNE, root, ['--verified-list', list, '--commit']);
  assert.equal(committed.status, 0, committed.stderr);
  assert.equal(existsSync(videos[0]), false, '29日枠外を削除');
  assert.equal(existsSync(videos[1]), false, '予約済みを削除');
  assert.equal(existsSync(videos[2]), true, '近日公開の未予約分は保持');
});

test('動画レンダー: Drive台帳とローカルhashを照合し、未公開の通常動画だけを保持する', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'video-render-prune-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const state = {
    schemaVersion: 1,
    packs: {
      scheduled: { derivatives: { longform: { status: 'scheduled' } } },
      rendered: { derivatives: { longform: { status: 'rendered' } } },
    },
  };
  put(root, '.claude/state/video-content-status.json', JSON.stringify(state));

  const specs = [
    ['.tmp/video-render/scheduled/video.mp4', 'scheduled-video'],
    ['.tmp/video-render/scheduled/img/00-cover.png', 'scheduled-cover'],
    ['.tmp/video-render/rendered/video.mp4', 'rendered-video'],
    ['.tmp/video-render/rendered/img/00-cover.png', 'rendered-cover'],
    ['.tmp/video-render/rendered/shorts/q1/shorts.mp4', 'rendered-short'],
  ];
  const manifest = { schemaVersion: 1, entries: {} };
  for (const [rel, text] of specs) {
    const body = Buffer.from(text);
    put(root, rel, body);
    manifest.entries[rel] = { group: 'video-render-artifact', sha256: hash(body), bytes: body.length };
  }
  put(root, '.claude/state/assets/drive-manifest.json', JSON.stringify(manifest));
  const list = put(root, '.tmp/verified.txt', `${specs.map(([rel]) => rel).join('\n')}\n`);

  const badList = put(root, '.tmp/bad-verified.txt', '.tmp/video-render/not-in-manifest/video.mp4\n');
  const blocked = run(VIDEO_PRUNE, root, ['--verified-list', badList]);
  assert.notEqual(blocked.status, 0);
  assert.match(blocked.stderr, /purge gate失敗/);

  const dry = run(VIDEO_PRUNE, root, ['--verified-list', list]);
  assert.equal(dry.status, 0, dry.stderr);
  assert.match(dry.stdout, /"prune": 3/);
  assert.match(dry.stdout, /"keep": 2/);
  assert.ok(specs.every(([rel]) => existsSync(join(root, rel))), 'dry-runで実体を削除しない');

  const committed = run(VIDEO_PRUNE, root, ['--verified-list', list, '--commit']);
  assert.equal(committed.status, 0, committed.stderr);
  assert.equal(existsSync(join(root, specs[0][0])), false);
  assert.equal(existsSync(join(root, specs[1][0])), false);
  assert.equal(existsSync(join(root, specs[2][0])), true, 'QA待ち通常動画を保持');
  assert.equal(existsSync(join(root, specs[3][0])), true, 'QA待ちサムネイルを保持');
  assert.equal(existsSync(join(root, specs[4][0])), false, '再生成可能な派生物を削除');
});
