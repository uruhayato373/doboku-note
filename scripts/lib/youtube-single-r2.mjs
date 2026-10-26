/** 初回通常動画の一時転送と、CI停止後も残る非公開の投稿意図。 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { loadRegistry } from './content-registry.mjs';
import { readJson } from './json-io.mjs';

const BUCKET = 'doboku-note-archive';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function client() {
  const keys = ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_R2_ACCESS_KEY_ID', 'CLOUDFLARE_R2_SECRET_ACCESS_KEY'];
  if (keys.some(key => !process.env[key])) throw new Error(`R2環境変数が不足: ${keys.filter(key => !process.env[key]).join(', ')}`);
  return new S3Client({ region: 'auto', endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID, secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY } });
}

async function bytes(body) { return Buffer.from(await body.transformToByteArray()); }

function revisionAssets(root, pubId) {
  const reg = loadRegistry(root), pub = reg.publications.find(p => p.id === pubId);
  if (!pub?.revisionOf || pub.channel !== 'youtube' || pub.format !== 'longform') throw new Error('改訂通常動画の公開IDが不正');
  const work = reg.works.find(w => w.id === pub.work && w.exam === pub.exam);
  if (!work || !pub.copy?.startsWith(`${work.definition}/youtube.revision-`)) throw new Error('改訂入力の置き場が不正');
  const input = readJson(root, pub.copy), byId = new Map(reg.media.map(m => [m.id, m]));
  if (input.publicationId !== pubId || input.revisionOf !== pub.revisionOf) throw new Error('改訂入力の公開IDが不一致');
  const roles = Object.keys(input.media ?? {});
  if (roles.length < 3) throw new Error('改訂素材が不足');
  const prefix = `.tmp/media/${pub.exam}/${pub.work}/work/candidate-`;
  return roles.map(role => {
    const m = byId.get(pub.media[role]), expected = input.media?.[role];
    if (!m || m.id !== `${pub.exam}/${pub.work}/work/candidate-${role}` || expected?.id !== m.id || pub.media?.[role] !== m.id ||
        expected.path !== m.store?.path || expected.sha256 !== m.sha256 || !m.store.path.startsWith(prefix) ||
        !/^[a-f0-9]{64}$/.test(m.sha256) || !(m.bytes > 0)) throw new Error(`${role}: 改訂素材の台帳・入力が不一致`);
    return { role, path: join(root, m.store.path), sha256: m.sha256, size: m.bytes,
      key: `youtube-revision-assets/${sha(pubId).slice(0, 40)}/${m.sha256}` };
  });
}

/** 改訂候補をCI用のprivate R2へ一時転送し、全件を読み戻して照合する。 */
export async function stageRevisionAssets(root, pubId, { commit = false } = {}) {
  const assets = revisionAssets(root, pubId);
  for (const a of assets) {
    if (!existsSync(a.path) || sha(readFileSync(a.path)) !== a.sha256) throw new Error(`${a.role}: ローカル素材のSHAが不一致`);
  }
  const uploadAssets = assets.filter(a => ['video', 'cover'].includes(a.role));
  if (uploadAssets.length !== 2) throw new Error('改訂通常動画のMP4・表紙が不足');
  if (!commit) return { publicationId: pubId, checked: assets.length, staged: 0, stageTargets: 2, dryRun: true };
  const s3 = client();
  for (const a of uploadAssets) {
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: a.key, Body: readFileSync(a.path) }));
    const data = await bytes((await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: a.key }))).Body);
    if (sha(data) !== a.sha256 || data.length !== a.size) throw new Error(`${a.role}: R2読戻しSHA・サイズが不一致`);
  }
  return { publicationId: pubId, checked: assets.length, staged: uploadAssets.length, dryRun: false };
}

/** CI checkoutには.tmp/mediaが無い。R2の転送実体を全件SHA照合して復元する。 */
export async function hydrateRevisionPublish(root, pubId) {
  const assets = revisionAssets(root, pubId).filter(a => ['video', 'cover'].includes(a.role)), s3 = client();
  for (const a of assets) {
    if (!existsSync(a.path)) {
      const data = await bytes((await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: a.key }))).Body);
      if (sha(data) !== a.sha256 || data.length !== a.size) throw new Error(`${a.role}: R2転送実体のSHA・サイズが不一致`);
      mkdirSync(dirname(a.path), { recursive: true }); writeFileSync(a.path, data);
    }
    if (sha(readFileSync(a.path)) !== a.sha256) throw new Error(`${a.role}: 復元素材のSHAが不一致`);
  }
  console.log(`改訂通常動画の転送実体を実検査: ${assets.length}/2`);
}

export async function hydrateSinglePublish(root, pubId) {
  const reg = loadRegistry(root), pub = reg.publications.find(p => p.id === pubId);
  if (!pub || pub.revisionOf || pub.format !== 'longform' || pub.channel !== 'youtube') throw new Error('初回通常動画の公開IDが不正');
  const work = reg.works.find(w => w.id === pub.work && w.exam === pub.exam);
  const input = readJson(root, `${work.definition}/youtube.json`).longform;
  const byId = new Map(reg.media.map(m => [m.id, m]));
  const s3 = client();
  let checked = 0;
  for (const [role, key, expected] of [['video', input.r2Key, input.sha256], ['cover', input.thumbnailR2Key, input.thumbnailSha256]]) {
    const asset = byId.get(pub.media?.[role]);
    if (!asset || asset.sha256 !== expected || !key) throw new Error(`${role}: R2転送入力と台帳が一致しない`);
    const path = join(root, asset.store.path);
    if (!existsSync(path)) {
      const data = await bytes((await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))).Body);
      if (sha(data) !== expected || data.length !== asset.bytes) throw new Error(`${role}: R2実体のSHA・サイズが不一致`);
      mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, data);
    }
    if (sha(readFileSync(path)) !== expected) throw new Error(`${role}: ローカル実体のSHAが不一致`);
    checked++;
  }
  console.log(`初回通常動画の転送実体を実検査: ${checked}/2`);
}

export function singlePublishJournal(pubId) {
  const s3 = client(), key = `youtube-single-intents/${sha(pubId).slice(0, 40)}.json`;
  return {
    async load() {
      try { return JSON.parse((await bytes((await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))).Body)).toString('utf8')); }
      catch (error) { if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) return null; throw error; }
    },
    async save(record) {
      if (record.pubId !== pubId || !record.delivery?.inputSha256 || !record.delivery?.marker) throw new Error('投稿意図のID・入力が不正');
      await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: JSON.stringify(record), ContentType: 'application/json' }));
    },
  };
}
