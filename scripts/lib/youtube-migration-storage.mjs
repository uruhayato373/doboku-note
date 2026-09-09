import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { sha256, MIGRATION } from './youtube-migration.mjs';
export function migrationStorage(env = process.env) {
  for (const key of ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_R2_ACCESS_KEY_ID', 'CLOUDFLARE_R2_SECRET_ACCESS_KEY']) if (!env[key]) throw new Error('Private transfer credentials unavailable');
  const client = new S3Client({ region: 'auto', endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID, secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY } });
  const Bucket = 'doboku-note-archive', prefix = `youtube-migration/${MIGRATION}/`;
  const assertKey = key => { if (!key.startsWith(prefix) || key.includes('..')) throw new Error('Invalid private transfer key'); };
  const get = async key => {
    assertKey(key);
    try { return Buffer.from(await (await client.send(new GetObjectCommand({ Bucket, Key: key }))).Body.transformToByteArray()); }
    catch (error) { if (error.name === 'NoSuchKey') return null; throw error; }
  };
  const put = async (key, bytes, mime = 'application/json') => {
    assertKey(key);
    await client.send(new PutObjectCommand({ Bucket, Key: key, Body: bytes, ContentType: mime }));
    const check = await get(key);
    if (!check || sha256(check) !== sha256(bytes)) throw new Error('Private transfer readback failed');
  };
  return { get, put, load: async id => { const b = await get(`${prefix}receipts/${id}.json`); return b ? JSON.parse(b) : null; },
    save: async (id, value) => put(`${prefix}receipts/${id}.json`, Buffer.from(JSON.stringify(value))), prefix };
}
