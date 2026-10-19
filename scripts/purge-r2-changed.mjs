#!/usr/bin/env node
/**
 * r2-sync が送った画像の CDN キャッシュを URL で消し、通常 URL の実体が送った中身と同じかを SHA-256 で照合する（DN-0756）。
 *
 * 同じ URL への上書きだけでは、Cloudflare の CDN が max-age（公開画像は 1 日）のあいだ旧版を返し続ける。
 * 2026-10-16 に変更画像 140 点のうち 22 点が旧 SVG のままだった。
 *
 * Usage:
 *   node scripts/purge-r2-changed.mjs --list <upload-images-r2 --changed-out の JSON>
 *
 * 認証: CLOUDFLARE_CACHE_PURGE_TOKEN（無ければ CLOUDFLARE_API_TOKEN）に doboku-note.com の「キャッシュ パージ」権限が要る。
 *   ゾーン ID はその token で引き、引けなければ CLOUDFLARE_ANALYTICS_API_TOKEN（ゾーン読み取り）で引く。
 * exit: 0 全件一致（送った画像 0 件を含む）/ 1 旧版のままの URL がある / 2 検査不成立（取れない URL がある・引数不正）
 */
import { readFileSync } from 'node:fs';
import { parseCliArgs } from './lib/cli-args.mjs';
import { readDataset } from './lib/dataset-io.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { R2_PUBLIC_HOST } from './lib/site-identity.mjs';
import { chunk, judgeCdnCheck } from './lib/r2-cdn-check.mjs';
import { createHash } from 'node:crypto';

const args = parseCliArgs({ list: { type: 'string' } });
if (!args.list) {
  console.error('[purge-r2-changed] --list <JSON> が要る');
  process.exit(2);
}
const { uploaded = [] } = JSON.parse(readFileSync(args.list, 'utf8'));
const urlOf = (key) => `https://${R2_PUBLIC_HOST}/${key.split('/').map(encodeURIComponent).join('/')}`;

if (uploaded.length === 0) {
  console.log('[purge-r2-changed] 送った画像 0 件（照合するものは無い）');
  process.exit(0);
}

const config = readDataset(REPO_ROOT, 'config.cloudflare');
const purgeToken = process.env.CLOUDFLARE_CACHE_PURGE_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
const lookupTokens = [purgeToken, process.env.CLOUDFLARE_ANALYTICS_API_TOKEN].filter(Boolean);
const api = async (path, token, init = {}) => {
  const res = await fetch(`${config.rest}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) } });
  return { ok: res.ok, status: res.status, body: await res.json().catch(() => null) };
};

// 1) 上書きした URL だけ purge する（新しいキーは CDN にまだ無い）
const overwritten = uploaded.filter((x) => x.overwritten);
let purgeNote = 'purge 不要（上書き 0 件）';
if (overwritten.length) {
  let zoneId = null;
  for (const t of lookupTokens) {
    const r = await api(`/zones?name=${encodeURIComponent(config.zoneName)}`, t);
    zoneId = r.body?.result?.[0]?.id ?? null;
    if (zoneId) break;
  }
  if (!purgeToken || !zoneId) {
    purgeNote = `purge できない（${!purgeToken ? 'token が無い' : `ゾーン ${config.zoneName} を引けない`}）`;
  } else {
    let done = 0;
    const errors = [];
    for (const batch of chunk(overwritten.map((x) => urlOf(x.key)))) {
      const r = await api(`/zones/${zoneId}/purge_cache`, purgeToken, { method: 'POST', body: JSON.stringify({ files: batch }) });
      if (r.ok && r.body?.success) done += batch.length;
      else errors.push(`HTTP ${r.status} ${JSON.stringify(r.body?.errors ?? []).slice(0, 160)}`);
    }
    purgeNote = `purge ${done}/${overwritten.length} URL${errors.length ? `・失敗 ${errors.length} 回: ${errors[0]}（token に doboku-note.com のキャッシュ パージ権限があるか）` : ''}`;
  }
}
console.log(`[purge-r2-changed] 送った ${uploaded.length} 件（上書き ${overwritten.length}）/ ${purgeNote}`);

// 2) 通常 URL の実体を SHA-256 で照合する（purge の反映待ちに 3 回まで間を空けて取り直す）
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function check(item) {
  let last = 'fetch-failed';
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await sleep(5000);
    try {
      const res = await fetch(urlOf(item.key));
      if (!res.ok) { last = 'fetch-failed'; continue; }
      const sha = createHash('sha256').update(Buffer.from(await res.arrayBuffer())).digest('hex');
      if (sha === item.sha256) return { ...item, status: 'match' };
      last = 'mismatch';
    } catch {
      last = 'fetch-failed';
    }
  }
  return { ...item, status: last };
}
const results = [];
for (const batch of chunk(uploaded, 8)) results.push(...(await Promise.all(batch.map(check))));

const { exitCode, summary } = judgeCdnCheck(results);
console.log(`[purge-r2-changed] 照合 対象 ${summary.targets} / 実検査 ${summary.checked} / 一致 ${summary.match} / 旧版のまま ${summary.mismatch} / 取得失敗 ${summary.fetchFailed}`);
for (const r of results.filter((x) => x.status !== 'match').slice(0, 20)) console.error(`  ${r.status === 'mismatch' ? '旧版' : '取得失敗'}  ${urlOf(r.key)}`);
if (exitCode === 1) console.error('✗ CDN が旧版を返す URL がある。purge の権限と結果を確かめる（DN-0756）');
else if (exitCode === 2) console.error('✗ 検査不成立: 取れなかった URL がある');
else console.log('✓ 送った画像の通常 URL はすべて送った中身と一致');
process.exitCode = exitCode;
