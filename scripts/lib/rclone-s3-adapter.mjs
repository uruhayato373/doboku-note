/**
 * rclone-s3-adapter.mjs — @aws-sdk/client-s3 の `send(command)` 互換の最小アダプタ（rclone 経由）
 * ---------------------------------------------------------------------------
 * なぜ: この PC には R2 の access key を置かない方針（.env.example・asset-inbox-push.mjs）。一方で
 * Mac には rclone remote `doboku-r2`（private bucket）が既に設定されている。`auth:export` が
 * 暗号化 storageState を R2 へ置くとき、env の key が無ければこのアダプタで rclone に代行させる。
 * CI（GitHub Actions）は Secrets の key で本物の S3 クライアントを使うので、ここは通らない。
 *
 * 対応コマンド: GetObjectCommand / HeadObjectCommand / PutObjectCommand / CopyObjectCommand。
 * 制約: PutObject の IfMatch（CAS）は rclone に無いので**無視する**（操作者の export は常に世代を
 * 進める側で、CI の書き戻しは restoredGeneration 一致でしか書かないため、衝突は CI 側で止まる）。
 * 秘密は扱わない（rclone の設定は rclone 自身が持つ）。
 * ---------------------------------------------------------------------------
 */
import { execFile as execFileCb } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promisify } from 'node:util';

const execFile = promisify(execFileCb);

class S3LikeError extends Error {
  constructor(name, status, message) {
    super(message ?? name);
    this.name = name;
    this.$metadata = { httpStatusCode: status };
  }
}

/** rcat は stdin から読む。promisify(execFile) は stdin を直接渡せないので child を取る。 */
function defaultRunWithInput(cmd, args, opts, input) {
  return new Promise((resolve, reject) => {
    const child = execFileCb(cmd, args, opts, (err, stdout, stderr) => (err ? reject(Object.assign(err, { stderr })) : resolve({ stdout, stderr })));
    child.stdin.end(Buffer.from(input));
  });
}

/** rclone remote が使えるか（listremotes に含まれるか）。 */
export async function rcloneRemoteAvailable(remote, { run = execFile } = {}) {
  try {
    const { stdout } = await run('rclone', ['listremotes']);
    return stdout.split(/\r?\n/).map((s) => s.trim()).includes(`${remote}:`);
  } catch {
    return false;
  }
}

/**
 * @param {{ remote: string, run?: Function }} opts run は execFile 互換（テスト注入用）
 * @returns {{ send(command: object): Promise<object>, kind: 'rclone' }}
 */
export function makeRcloneS3({ remote, run = execFile, runWithInput = defaultRunWithInput }) {
  const target = (bucket, key) => `${remote}:${bucket}/${key}`;
  const runRclone = async (args, input) => {
    const opts = { maxBuffer: 64 * 1024 * 1024, encoding: 'buffer' };
    if (input !== undefined) return runWithInput('rclone', args, opts, input);
    return run('rclone', args, opts);
  };
  const isMissing = (err) => /directory not found|object not found|not found|no such/i.test(String(err?.stderr ?? err?.message ?? ''));
  // lsjson は存在しないキーでも exit 0 で [] を返す。[] は「無い」として扱う。
  const stat = async (bucket, key) => {
    try {
      const { stdout } = await runRclone(['lsjson', target(bucket, key)]);
      const list = JSON.parse(Buffer.from(stdout).toString('utf8') || '[]');
      return Array.isArray(list) && list.length > 0 && !list[0].IsDir ? list[0] : null;
    } catch (err) {
      if (isMissing(err)) return null;
      throw err;
    }
  };
  const exists = async (bucket, key) => (await stat(bucket, key)) !== null;

  return {
    kind: 'rclone',
    async send(command) {
      const name = command?.constructor?.name ?? command?.name;
      const input = command?.input ?? command;
      if (name === 'GetObjectCommand') {
        try {
          // rclone cat は存在しないキーでも exit 0・空出力になる（2026-09-21 実測）。先に lsjson で実在を確認する。
          if (!(await exists(input.Bucket, input.Key))) throw new S3LikeError('NoSuchKey', 404, `NoSuchKey: ${input.Key}`);
          const { stdout } = await runRclone(['cat', target(input.Bucket, input.Key)]);
          const bytes = Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout);
          return {
            Body: { transformToByteArray: async () => new Uint8Array(bytes), transformToString: async () => bytes.toString('utf8') },
            ETag: null,
          };
        } catch (err) {
          if (isMissing(err)) throw new S3LikeError('NoSuchKey', 404, `NoSuchKey: ${input.Key}`);
          throw err;
        }
      }
      if (name === 'HeadObjectCommand') {
        const info = await stat(input.Bucket, input.Key);
        if (!info) throw new S3LikeError('NotFound', 404, `NotFound: ${input.Key}`);
        return { ContentLength: info.Size ?? null };
      }
      if (name === 'CopyObjectCommand') {
        const [srcBucket, ...rest] = String(input.CopySource).split('/');
        await runRclone(['copyto', target(srcBucket, rest.join('/')), target(input.Bucket, input.Key)]);
        return {};
      }
      if (name === 'PutObjectCommand') {
        const body = typeof input.Body === 'string' ? Buffer.from(input.Body, 'utf8') : Buffer.from(input.Body);
        await runRclone(['rcat', target(input.Bucket, input.Key)], body);
        // IfMatch は非対応（ヘッダ参照）。ETag は単一パート put の慣習どおり md5。
        return { ETag: `"${createHash('md5').update(body).digest('hex')}"` };
      }
      throw new Error(`RCLONE_S3_ADAPTER_UNSUPPORTED: ${name}`);
    },
  };
}
