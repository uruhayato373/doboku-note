import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { sha256, MIGRATION } from './youtube-migration.mjs';
export function migrationReceiptPrefix(prefix, scope) {
  if (scope !== undefined && !/^[a-z0-9][a-z0-9-]{2,79}$/.test(scope)) throw new Error('Invalid migration receipt scope');
  return scope ? `${prefix}revisions/${scope}/receipts/` : `${prefix}receipts/`;
}
export function migrationStorage(env = process.env, { receiptScope } = {}) {
  for (const key of ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_R2_ACCESS_KEY_ID', 'CLOUDFLARE_R2_SECRET_ACCESS_KEY']) if (!env[key]) throw new Error('Private transfer credentials unavailable');
  const client = new S3Client({ region: 'auto', endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID, secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY } });
  const Bucket = 'doboku-note-archive', prefix = `youtube-migration/${MIGRATION}/`;
  const receiptPrefix = migrationReceiptPrefix(prefix, receiptScope);
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
  return { get, put, load: async id => { const b = await get(`${receiptPrefix}${id}.json`); return b ? JSON.parse(b) : null; },
    save: async (id, value) => put(`${receiptPrefix}${id}.json`, Buffer.from(JSON.stringify(value))), prefix, receiptPrefix };
}
