#!/usr/bin/env node
/**
 * gen-image-gemini.mjs — Gemini 画像生成 API（gemini-2.5-flash-image / nano-banana）
 * ---------------------------------------------------------------------------
 * .env.local の GEMINI_API_KEY を使い、プロンプトから画像を1枚生成して保存する。
 * ブランド写真プール（docs/reference/brand-image-system.md §5）と同じ「文字なし雰囲気写真」
 * を生成する用途。文字は satori/HTML で別途重ねる（AI に日本語を焼き込ませない）。
 *
 * 使い方:
 *   node scripts/gen-image-gemini.mjs --out .tmp/x.png --prompt "..."
 *   node scripts/gen-image-gemini.mjs --out .tmp/x.png --prompt-file path.txt
 *   （--model で上書き可。既定 gemini-2.5-flash-image）
 *
 * 課金: Gemini 画像 API は有料（API キー課金）。1 呼び出し=1 枚。
 * ---------------------------------------------------------------------------
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };

const OUT = getArg('--out');
const PROMPT = getArg('--prompt') || (getArg('--prompt-file') ? readFileSync(getArg('--prompt-file'), 'utf8') : null);
const MODEL = getArg('--model') || 'gemini-2.5-flash-image';
if (!OUT || !PROMPT) { console.error('--out <path> と --prompt/--prompt-file が必要'); process.exit(1); }

// .env.local から GEMINI_API_KEY を読む（値は表示しない）
function readEnvKey(name) {
  if (process.env[name]) return process.env[name];
  try {
    const env = readFileSync(join(ROOT, '.env.local'), 'utf8');
    const m = env.match(new RegExp('^' + name + '\\s*=\\s*["\']?([^"\'\\r\\n]+)', 'm'));
    return m ? m[1].trim() : null;
  } catch { return null; }
}
const KEY = readEnvKey('GEMINI_API_KEY');
if (!KEY) { console.error('ABORT: GEMINI_API_KEY が .env.local / env に無い'); process.exit(2); }

const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const body = { contents: [{ parts: [{ text: PROMPT }] }] };

console.log(`[gemini] model=${MODEL} → ${OUT}`);
const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
  body: JSON.stringify(body),
});
if (!res.ok) {
  const t = await res.text();
  console.error(`ABORT: HTTP ${res.status}\n${t.slice(0, 800)}`);
  process.exit(3);
}
const json = await res.json();
const parts = json?.candidates?.[0]?.content?.parts || [];
const imgPart = parts.find((p) => p.inlineData?.data);
if (!imgPart) {
  const textPart = parts.find((p) => p.text)?.text || '';
  console.error('ABORT: 画像パートが無い（safety block か? モデル応答テキスト↓）\n' + textPart.slice(0, 500));
  console.error('finishReason=' + (json?.candidates?.[0]?.finishReason || '?'));
  process.exit(4);
}
mkdirSync(dirname(join(ROOT, OUT)), { recursive: true });
const buf = Buffer.from(imgPart.inlineData.data, 'base64');
writeFileSync(join(ROOT, OUT), buf);
console.log(`[gemini] 保存: ${OUT} (${Math.round(buf.length / 1024)} KB, mime=${imgPart.inlineData.mimeType})`);
