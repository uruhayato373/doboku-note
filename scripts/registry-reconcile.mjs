#!/usr/bin/env node
/**
 * registry-reconcile.mjs — コンテンツ台帳（content/registry）の YouTube の公開を、YouTube Data API（videos.list）の観測と
 * 突き合わせる（content-registry.md「照合」・DN-0608）。毎日 .github/workflows/registry-reconcile.yml が動かす。
 *
 * - 予約（scheduled）の動画が public になっていれば published へ進め、証拠（youtube-api）と公開時刻を書く。
 * - 後戻り（published なのに非公開・消えた）と、期日を過ぎても公開にならない予約は所見として記録するだけ（状態は人が決める）。
 * - 記録は .claude/state/registry-reconcile/youtube.json。認証が無い・API が失敗したときは何も書かずに exit 2（検査不成立）。
 *
 *   node scripts/registry-reconcile.mjs            # 照合して書く（CI・Mac）
 *   node scripts/registry-reconcile.mjs --dry      # 書かずに結果だけ出す
 *
 * exit: 0 照合した（前進の有無を問わない）/ 1 後戻り・消えたものがある / 2 検査不成立
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistry, loadRegistryConfig } from './lib/content-registry.mjs';
import { upsertPublications } from './lib/content-registry-write.mjs';
import { reconcileYoutube } from './lib/registry-reconcile.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');
const OUT = '.claude/state/registry-reconcile/youtube.json';
const log = (...a) => console.log('[registry-reconcile]', ...a);

class Inconclusive extends Error {}

function loadEnv() {
  const env = { ...process.env };
  const p = join(ROOT, '.env.local');
  if (existsSync(p)) {
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].trim();
    }
  }
  return env;
}

/** videoId → 観測（取れなかった id は入らない） */
async function observe(ids) {
  const env = loadEnv();
  const missing = ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN'].filter((k) => !env[k]);
  if (missing.length) throw new Inconclusive(`環境変数が無い（CI 供給が正）: ${missing.join(', ')}`);
  let google;
  try {
    ({ google } = await import('googleapis'));
  } catch (e) {
    throw new Inconclusive(`googleapis を読めない: ${e.message}`);
  }
  const oauth2 = new google.auth.OAuth2(env.YOUTUBE_CLIENT_ID, env.YOUTUBE_CLIENT_SECRET);
  oauth2.setCredentials({ refresh_token: env.YOUTUBE_REFRESH_TOKEN });
  const youtube = google.youtube({ version: 'v3', auth: oauth2 });
  const observed = new Map();
  try {
    for (let i = 0; i < ids.length; i += 50) {
      const res = await youtube.videos.list({ part: 'status,snippet', id: ids.slice(i, i + 50), maxResults: 50 });
      for (const v of res.data.items ?? []) observed.set(v.id, { privacy: v.status?.privacyStatus ?? 'unknown', publishedAt: v.snippet?.publishedAt ?? null });
    }
  } catch (e) {
    throw new Inconclusive(`videos.list が失敗: ${e.response?.data ? JSON.stringify(e.response.data) : e.message}`);
  }
  if (!observed.size) throw new Inconclusive(`${ids.length} 件を問い合わせて 1 件も取れない（認証のチャンネル違い・API の不調）`);
  return observed;
}

async function main() {
  const cfg = loadRegistryConfig(ROOT);
  const reg = loadRegistry(ROOT);
  const youtubePubs = reg.publications.filter((p) => p.channel === 'youtube');
  const pubs = youtubePubs.filter((p) => p.platform?.id);
  log(`台帳の YouTube の公開 ${youtubePubs.length} 件のうち外部 ID のあるもの ${pubs.length} 件を照合する`);
  if (!pubs.length) {
    log('外部 ID のある公開が 0 件（照合する対象が無い。異常なしではない）');
    return 0;
  }
  const observed = await observe([...new Set(pubs.map((p) => p.platform.id))]);
  const checkedAt = new Date();
  const { advance, findings, checked } = reconcileYoutube(pubs, observed, {
    now: checkedAt, graceDays: cfg.reconcileGraceDays.youtube ?? 1, evidenceRef: `videos.list@${checkedAt.toISOString()}`,
  });
  log(`照合 ${checked} 件（取れた ${observed.size} 件）/ published へ進める ${advance.length} 件 / 所見 ${findings.length} 件`);
  for (const a of advance) console.log(`  → published: ${a.id}（${a.platform.id}）`);
  for (const f of findings) console.log(`  [${f.severity}] ${f.code} ${f.id}: ${f.message}`);

  if (DRY) {
    log('--dry: 台帳・記録は書いていない');
  } else {
    const byExam = new Map();
    for (const a of advance) {
      const cur = pubs.find((p) => p.id === a.id);
      const row = Object.fromEntries(Object.entries(cur).filter(([k]) => !['file', 'exam', 'channel'].includes(k)));
      const { stopReason: _s, reason: _r, ...rest } = row;
      byExam.set(cur.exam, [...(byExam.get(cur.exam) ?? []), { ...rest, status: 'published', platform: a.platform }]);
    }
    for (const [exam, rows] of byExam) upsertPublications(ROOT, 'youtube', exam, rows);
    const record = {
      schemaVersion: 1, checkedAt: checkedAt.toISOString(), channel: 'youtube',
      targets: pubs.length, checked, observed: observed.size,
      advanced: advance.map((a) => a.id), findings,
    };
    mkdirSync(dirname(join(ROOT, OUT)), { recursive: true });
    writeFileSync(join(ROOT, OUT), `${JSON.stringify(record, null, 2)}\n`);
    log(`記録: ${OUT}${advance.length ? `・台帳 ${advance.length} 行を更新` : ''}`);
  }
  return findings.some((f) => f.severity === 'fail') ? 1 : 0;
}

try {
  process.exitCode = await main();
} catch (e) {
  if (!(e instanceof Inconclusive)) throw e;
  console.error(`[registry-reconcile] 検査不成立: ${e.message}（記録は書かない）`);
  process.exitCode = 2;
}
