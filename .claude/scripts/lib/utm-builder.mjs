// SNS 送客リンクへ UTM を統一付与するビルダー。
// 真実源の規約 = .claude/config/utm-templates.json（= docs/marketing/02_チャネル動線設計.md §4）。
// 既存 add-note-utm.mjs の injectUtm と同じ冪等・anchor・区切りの流儀を踏襲する。
//
// ライブラリ:
//   import { buildUtmUrl } from '<path>/utm-builder.mjs'
//   buildUtmUrl('https://doboku-note.com/docs/xxx', { channel:'youtube', format:'shorts', campaign:'exam-pack-r05' })
//     → 'https://doboku-note.com/docs/xxx?utm_source=youtube&utm_medium=video&utm_campaign=exam-pack-r05&utm_content=shorts'
//
// CLI（X は tweets.md 直書きのため人手/エージェントが Bash で呼ぶ）:
//   node .claude/scripts/lib/utm-builder.mjs --url <URL> --channel x --format post --campaign <name> [--content <c>] [--force]

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_PATH = join(HERE, '..', '..', 'config', 'utm-templates.json');

let _templates = null;

export function loadUtmTemplates() {
  if (_templates) return _templates;
  _templates = JSON.parse(readFileSync(TEMPLATES_PATH, 'utf-8'));
  return _templates;
}

/**
 * baseUrl に UTM を付与して返す。
 * @param {string} baseUrl
 * @param {object} opts
 * @param {string} opts.channel  x | instagram | youtube | note
 * @param {string} opts.format   post | reel | carousel | story | bio | shorts | longform | site
 * @param {string} [opts.campaign] 送客対象/slug/pack など（呼び出し側が渡す）
 * @param {string} [opts.content]  テンプレ既定の配信形式を上書きしたい時のみ
 * @param {string} [opts.source]   テンプレ既定を上書きしたい時のみ
 * @param {string} [opts.medium]   テンプレ既定を上書きしたい時のみ
 * @param {boolean} [opts.force]   既存 utm_ があっても張り直す
 * @returns {string}
 */
export function buildUtmUrl(baseUrl, opts = {}) {
  const { channel, format, campaign, force = false } = opts;
  const templates = loadUtmTemplates();
  const key = `${channel}.${format}`;
  const tpl = templates.channels[key];
  if (!tpl) {
    throw new Error(`utm-builder: 未定義の channel.format "${key}"（utm-templates.json を確認）`);
  }
  const source = opts.source ?? tpl.source;
  const medium = opts.medium ?? tpl.medium;
  const content = opts.content ?? tpl.content;

  // anchor 分離（add-note-utm と同じ）
  const hashIdx = baseUrl.indexOf('#');
  const beforeHash = hashIdx === -1 ? baseUrl : baseUrl.slice(0, hashIdx);
  const hash = hashIdx === -1 ? '' : baseUrl.slice(hashIdx);

  const hasUtm = /[?&]utm_/.test(beforeHash);
  // 冪等: 既に utm_ があれば触らない（force のときのみ張り直す）
  if (hasUtm && !force) return baseUrl;

  // force: 既存 utm_* だけ除去し、他のクエリは verbatim 温存（総監等の非ASCIIを再エンコードしない）
  let cleaned = beforeHash;
  if (force && hasUtm) {
    const qIdx = beforeHash.indexOf('?');
    const path = beforeHash.slice(0, qIdx);
    const kept = beforeHash.slice(qIdx + 1).split('&').filter((p) => p && !p.startsWith('utm_'));
    cleaned = kept.length ? `${path}?${kept.join('&')}` : path;
  }

  const utm = new URLSearchParams();
  utm.set('utm_source', source);
  utm.set('utm_medium', medium);
  if (campaign) utm.set('utm_campaign', campaign);
  if (content) utm.set('utm_content', content);

  const sep = cleaned.includes('?') ? '&' : '?';
  return `${cleaned}${sep}${utm.toString()}${hash}`;
}

// ── CLI ──────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force') out.force = true;
    else if (a.startsWith('--')) out[a.slice(2)] = argv[++i];
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const a = parseArgs(process.argv.slice(2));
  if (!a.url || !a.channel || !a.format) {
    console.error('Usage: node utm-builder.mjs --url <URL> --channel <x|instagram|youtube|note> --format <post|reel|carousel|shorts|...> [--campaign <name>] [--content <c>] [--force]');
    process.exit(1);
  }
  console.log(buildUtmUrl(a.url, { channel: a.channel, format: a.format, campaign: a.campaign, content: a.content, force: a.force }));
}
