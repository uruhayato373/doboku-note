// gemini-api.mjs — Gemini API（Interactions API）を 1 回呼ぶ部品（DN-0939）。
//
// 経路は記憶 feedback_gemini_text_public_only: 課金の無いプロジェクトの無料枠キーを .env.local の GEMINI_API_KEY に置き、
// v1beta/interactions に {model, input} を送る（新しいモデル名は models/…:generateContent では本文の無い 404 になる）。
// 送ってよいのは公開済みのサイト記事だけ。キーは引数・ログ・例外に出さず、ヘッダーは権限 600 の一時ファイルで curl に渡す。
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadEnvLocal } from './asset-storage.mjs';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';
/** 待てば通る応答（回数の上限・一時的な混雑） */
const RETRYABLE = new Set([429, 500, 503]);

/** 同期で待つ（回数の上限に当たったときの間隔） */
export function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** 応答の JSON から、モデルの出力の本文を取り出す（思考の段は捨てる） */
export function interactionText(json) {
  return (json?.steps ?? [])
    .filter((s) => s.type === 'model_output')
    .flatMap((s) => s.content ?? [])
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('');
}

/** 応答の本文から最初の JSON オブジェクトを読む（```json の囲みを許す）。読めなければ null */
export function parseJsonReply(text) {
  const body = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(body.slice(start, end + 1)); } catch { return null; }
}

/**
 * @param {{model:string, input:string, timeoutSec?:number, retries?:number, waitMs?:number, onRetry?:(status:number, waitMs:number)=>void}} opts
 * @returns {{ok:boolean, text?:string, usage?:object, status:number, error?:string}}
 *   status 0 は接続できなかった（検査不成立の扱い）。402・403 は待っても通らないので再試行しない。
 */
export function geminiInteract({ model, input, timeoutSec = 180, retries = 3, waitMs = 30_000, onRetry = null }) {
  loadEnvLocal();
  if (!process.env.GEMINI_API_KEY) return { ok: false, status: 0, error: 'GEMINI_API_KEY が .env.local に無い' };
  const dir = mkdtempSync(join(tmpdir(), 'gemini-'));
  const headerFile = join(dir, 'headers');
  writeFileSync(headerFile, `x-goog-api-key: ${process.env.GEMINI_API_KEY}\nContent-Type: application/json\n`, { mode: 0o600 });
  try {
    let last = { ok: false, status: 0, error: '未実行' };
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      let out = '';
      try {
        out = execFileSync('curl', ['-sS', '--ssl-no-revoke', '-m', String(timeoutSec), '-H', `@${headerFile}`, '--data-binary', '@-', '-w', '\n%{http_code}', ENDPOINT], {
          input: JSON.stringify({ model, input }),
          encoding: 'utf8',
          maxBuffer: 32 * 1024 * 1024,
        });
      } catch (e) {
        last = { ok: false, status: 0, error: `curl が失敗: ${String(e.message).split('\n')[0]}` };
        continue;
      }
      const cut = out.lastIndexOf('\n');
      const status = Number(out.slice(cut + 1));
      let json = null;
      try { json = JSON.parse(out.slice(0, cut)); } catch { /* 本文の無い応答 */ }
      if (status === 200 && json) return { ok: true, status, text: interactionText(json), usage: json.usage ?? null };
      const message = (Array.isArray(json) ? json[0] : json)?.error?.message ?? '(本文なし)';
      last = { ok: false, status, error: `HTTP ${status}: ${String(message).slice(0, 200)}` };
      if (!RETRYABLE.has(status)) break;
      if (attempt < retries) {
        onRetry?.(status, waitMs * (attempt + 1));
        sleepMs(waitMs * (attempt + 1));
      }
    }
    return last;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
