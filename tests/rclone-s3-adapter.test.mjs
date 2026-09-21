// rclone-s3-adapter.test.mjs — rclone 経由の S3 互換アダプタ（Mac の auth:export 用）の回帰テスト。
// 実測（2026-09-21）: rclone cat / lsjson は存在しないキーでも exit 0（空出力 / []）を返すので、
// 「無い」を S3 の NoSuchKey / NotFound に写像できているかを固定する。
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRcloneS3, rcloneRemoteAvailable } from '../scripts/lib/rclone-s3-adapter.mjs';

class GetObjectCommand { constructor(input) { this.input = input; } }
class HeadObjectCommand { constructor(input) { this.input = input; } }
class PutObjectCommand { constructor(input) { this.input = input; } }
class CopyObjectCommand { constructor(input) { this.input = input; } }

function fakeRclone(objects) {
  const calls = [];
  const run = async (cmd, args) => {
    calls.push(args);
    const [sub, ...rest] = args;
    const path = rest[0]?.replace(/^r:b\//, '');
    if (sub === 'listremotes') return { stdout: 'r:\nother:\n' };
    if (sub === 'lsjson') return { stdout: Buffer.from(JSON.stringify(objects.has(path) ? [{ Name: path.split('/').at(-1), Size: objects.get(path).length, IsDir: false }] : [])) };
    if (sub === 'cat') return { stdout: Buffer.from(objects.get(path) ?? '') };
    if (sub === 'copyto') { objects.set(rest[1].replace(/^r:b\//, ''), objects.get(path)); return { stdout: Buffer.alloc(0) }; }
    throw new Error(`unexpected ${sub}`);
  };
  const runWithInput = async (cmd, args, opts, input) => { calls.push(args); objects.set(args[1].replace(/^r:b\//, ''), Buffer.from(input).toString()); return { stdout: Buffer.alloc(0) }; };
  return { run, runWithInput, calls };
}

test('rcloneRemoteAvailable は listremotes の一致で判定', async () => {
  const { run } = fakeRclone(new Map());
  assert.equal(await rcloneRemoteAvailable('r', { run }), true);
  assert.equal(await rcloneRemoteAvailable('nope', { run }), false);
  assert.equal(await rcloneRemoteAvailable('r', { run: async () => { throw new Error('no rclone'); } }), false);
});

test('存在しないキーは NoSuchKey / NotFound（exit 0 の空出力を「無い」に写像）', async () => {
  const f = fakeRclone(new Map());
  const s3 = makeRcloneS3({ remote: 'r', run: f.run, runWithInput: f.runWithInput });
  await assert.rejects(s3.send(new GetObjectCommand({ Bucket: 'b', Key: 'auth-state/x/manifest.json' })), (e) => e.name === 'NoSuchKey' && e.$metadata.httpStatusCode === 404);
  await assert.rejects(s3.send(new HeadObjectCommand({ Bucket: 'b', Key: 'auth-state/x/state.age' })), (e) => e.name === 'NotFound');
});

test('put → head → get → copy の往復', async () => {
  const f = fakeRclone(new Map());
  const s3 = makeRcloneS3({ remote: 'r', run: f.run, runWithInput: f.runWithInput });
  const put = await s3.send(new PutObjectCommand({ Bucket: 'b', Key: 'auth-state/x/state.age', Body: new Uint8Array([1, 2, 3]), IfMatch: '"ignored"' }));
  assert.match(put.ETag, /^"[0-9a-f]{32}"$/);
  const head = await s3.send(new HeadObjectCommand({ Bucket: 'b', Key: 'auth-state/x/state.age' }));
  assert.equal(head.ContentLength, 3);
  await s3.send(new PutObjectCommand({ Bucket: 'b', Key: 'auth-state/x/manifest.json', Body: '{"generation":1}', ContentType: 'application/json' }));
  const got = await s3.send(new GetObjectCommand({ Bucket: 'b', Key: 'auth-state/x/manifest.json' }));
  assert.equal(await got.Body.transformToString(), '{"generation":1}');
  await s3.send(new CopyObjectCommand({ Bucket: 'b', Key: 'auth-state/x/state.prev.age', CopySource: 'b/auth-state/x/state.age' }));
  assert.equal((await s3.send(new HeadObjectCommand({ Bucket: 'b', Key: 'auth-state/x/state.prev.age' }))).ContentLength, 3);
  assert.ok(f.calls.some((a) => a[0] === 'copyto' && a[1] === 'r:b/auth-state/x/state.age' && a[2] === 'r:b/auth-state/x/state.prev.age'));
  await assert.rejects(s3.send({ constructor: { name: 'DeleteObjectCommand' }, input: {} }), /UNSUPPORTED/);
});
