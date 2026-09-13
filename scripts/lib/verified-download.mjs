import { createWriteStream } from 'node:fs';
import { rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export async function downloadVerified(body, path, entry) {
  const hash = createHash('sha256'); let bytes = 0;
  let owned = false;
  const guard = new Transform({ transform(chunk, encoding, callback) {
    bytes += chunk.length;
    if (bytes > entry.bytes) return callback(new Error('Remote object exceeds manifest bytes'));
    hash.update(chunk); callback(null, chunk);
  } });
  try {
    const output = createWriteStream(path, { flags: 'wx' });
    output.on('open', () => { owned = true; });
    await pipeline(body, guard, output);
    if (bytes !== entry.bytes || hash.digest('hex') !== entry.sha256) throw new Error('Remote bytes/hash mismatch');
  } catch (error) { if (owned) await rm(path, { force: true }); throw error; }
}
