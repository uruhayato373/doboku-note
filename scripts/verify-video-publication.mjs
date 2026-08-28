#!/usr/bin/env node
/**
 * verify-video-publication.mjs — 動画パック派生物の「公開実体」照合（DN-0110 Phase 3）。
 *
 * 何を解くか: `.claude/state/video-content-status.json` は published と書けてしまうが、
 *   実際にその動画が公開されているか・消えていないか・概要欄の CTA と UTM が生きているか・
 *   Short に関連動画が設定されているかは、**誰も確かめていなかった**。台帳と実体のドリフトは
 *   次に人が見るまで表面化しない（2026-06-17 の YouTube 事故＝6本アップ済みなのに台帳 pending が実例）。
 *
 * 設計:
 *   - **read-only**。投稿・削除・状態変更はしない。台帳の書き戻しもしない（是正は人が判断）。
 *   - 認証は CI 供給が正（YOUTUBE_CLIENT_ID / SECRET / REFRESH_TOKEN）。ローカル creds 不要ルール
 *     （measurement-incidents.md）。creds が無ければ **記録を書かずに exit 2（検査不成立）**。
 *     「creds が無い」を「異常なし」として記録すると、以後 check 側が緑を出し続けて事故が埋もれる。
 *   - 結果は `.claude/state/video-publication-verify.json` へ。オフラインの
 *     `check-video-publication` がこれを読んで鮮度・未照合・ドリフトを surface する。
 *
 * 使い方:
 *   node scripts/verify-video-publication.mjs           # 照合（CI/Mac）
 *   node scripts/verify-video-publication.mjs --dry     # API を叩かず対象だけ表示（会社PC可）
 *   node scripts/verify-video-publication.mjs --json    # 機械可読
 *
 * exit: 0 ドリフトなし / 1 ドリフトあり / 2 検査不成立（creds 無し・API 失敗）
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadConfig, discoverPacks } from './lib/video-content-check.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = new Set(process.argv.slice(2));
const DRY = argv.has('--dry');
const JSON_OUT = argv.has('--json');
const log = (...a) => { if (!JSON_OUT) console.log(...a); };

const config = loadConfig(ROOT);
const STATE_PATH = join(ROOT, config.paths.stateFile);
const OUT_PATH = join(ROOT, '.claude/state/video-publication-verify.json');

/** published 相当＝外部実体を持つはずの状態 */
const LIVE_STATUSES = ['published', 'measured', 'refresh_due'];

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

/** state から「照合すべき派生物」を列挙する（manifest と突き合わせて孤児も検出できるようにする） */
function collectTargets() {
  if (!existsSync(STATE_PATH)) return { stateExists: false, targets: [] };
  const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  const known = new Set(
    discoverPacks(ROOT, config).packs
      .map((p) => {
        try {
          return JSON.parse(readFileSync(p.manifestPath, 'utf8')).packId;
        } catch {
          return null;
        }
      })
      .filter(Boolean),
  );
  const targets = [];
  for (const [packId, entry] of Object.entries(state.packs ?? {})) {
    for (const [key, raw] of Object.entries(entry.derivatives ?? {})) {
      const list = Array.isArray(raw) ? raw : [raw];
      list.forEach((d, i) => {
        if (!LIVE_STATUSES.includes(d.status)) return;
        targets.push({
          packId,
          derivative: Array.isArray(raw) ? `${key}[${i}]` : key,
          kind: key,
          status: d.status,
          videoId: d.videoId ?? null,
          url: d.url ?? null,
          relatedVideoId: d.relatedVideoId ?? null,
          packKnown: known.has(packId),
        });
      });
    }
  }
  return { stateExists: true, targets };
}

/** 外部 URL の到達性。fetch ではなく curl（会社プロキシと失効チェックの罠 → measurement-incidents.md） */
function httpStatus(url) {
  const nul = process.platform === 'win32' ? 'NUL' : '/dev/null';
  try {
    const out = execFileSync(
      'curl',
      ['-s', '-o', nul, '-w', '%{http_code}', '--ssl-no-revoke', '--max-time', '20', '-L', url],
      { encoding: 'utf8' },
    );
    return Number(out.trim());
  } catch {
    return 0;
  }
}

const { stateExists, targets } = collectTargets();
log(`[verify-video-publication] 照合対象 ${targets.length} 件（state: ${stateExists ? 'あり' : 'なし'}）`);

if (targets.length === 0) {
  // 「対象 0 件」は正常（まだ公開していない）だが、**異常 0 件と区別して記録する**。
  const record = {
    schemaVersion: 1,
    verifiedAt: new Date().toISOString(),
    ok: true,
    reason: stateExists ? '公開済みの派生物がまだ無い（対象0件）' : 'state ファイルが無い',
    checked: 0,
    findings: [],
    entries: {},
  };
  if (!DRY) {
    mkdirSync(dirname(OUT_PATH), { recursive: true });
    writeFileSync(OUT_PATH, JSON.stringify(record, null, 2) + '\n', 'utf8');
  }
  if (JSON_OUT) console.log(JSON.stringify(record, null, 2));
  else log('  公開済みの派生物がまだ無いため照合はスキップ（記録には checked:0 を残す）');
  process.exit(0);
}

if (DRY) {
  log('[verify-video-publication] --dry: API を叩かず対象のみ表示');
  for (const t of targets) {
    log(`  ${t.packId} / ${t.derivative} status=${t.status} videoId=${t.videoId ?? '-'} url=${t.url ?? '-'}`);
  }
  process.exit(0);
}

const env = loadEnv();
const videoTargets = targets.filter((t) => t.videoId);
const statusMap = new Map();

if (videoTargets.length > 0) {
  const missing = ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN'].filter((k) => !env[k]);
  if (missing.length) {
    console.error(`[verify-video-publication] 検査不成立: 環境変数が不足（CI 供給が正）: ${missing.join(', ')}`);
    console.error('[verify-video-publication] ローカルで構造だけ見るなら --dry。記録は書き換えない（偽の緑を残さないため）。');
    process.exit(2);
  }
  let google;
  try {
    ({ google } = await import('googleapis'));
  } catch (e) {
    console.error('[verify-video-publication] 検査不成立: googleapis 読み込み失敗:', String(e));
    process.exit(2);
  }
  const oauth2 = new google.auth.OAuth2(env.YOUTUBE_CLIENT_ID, env.YOUTUBE_CLIENT_SECRET);
  oauth2.setCredentials({ refresh_token: env.YOUTUBE_REFRESH_TOKEN });
  const youtube = google.youtube({ version: 'v3', auth: oauth2 });
  try {
    const ids = videoTargets.map((t) => t.videoId);
    for (let i = 0; i < ids.length; i += 50) {
      const res = await youtube.videos.list({ part: 'status,snippet', id: ids.slice(i, i + 50) });
      for (const v of res.data.items ?? []) statusMap.set(v.id, v);
    }
  } catch (e) {
    const detail = e.response?.data ? JSON.stringify(e.response.data) : e.message;
    console.error('[verify-video-publication] 検査不成立: videos.list 失敗:', detail);
    process.exit(2);
  }
}

const findings = [];
const entries = {};

for (const t of targets) {
  const id = `${t.packId}/${t.derivative}`;
  const problems = [];

  if (!t.packKnown) problems.push({ code: 'orphan_pack', message: 'state にあるが video-pack.json が無い' });

  if (t.videoId) {
    const v = statusMap.get(t.videoId);
    if (!v) {
      problems.push({ code: 'gone', message: `videoId ${t.videoId} が videos.list で取得できない（削除/非公開/BAN）` });
    } else {
      const privacy = v.status?.privacyStatus;
      if (privacy !== 'public') problems.push({ code: 'not_public', message: `privacyStatus=${privacy}` });
      const desc = v.snippet?.description ?? '';
      // 概要欄の CTA（UTM）が生きているか。utm_campaign は packId と一致する契約（policy §2）
      if (!desc.includes(`utm_campaign=${t.packId}`)) {
        problems.push({ code: 'cta_utm_missing', message: `概要欄に utm_campaign=${t.packId} が無い（送客が計測不能）` });
      }
      if (!desc.includes(`utm_source=${config.utm.source}`)) {
        problems.push({ code: 'cta_utm_source', message: `概要欄に utm_source=${config.utm.source} が無い` });
      }
    }
    // Short は説明欄 URL が非クリックなので関連動画が主導線（yt-shorts-publisher-policy §2）
    if (t.kind === 'shorts' && !t.relatedVideoId) {
      problems.push({ code: 'related_missing', message: '公開済み Short に relatedVideoId が無い（主導線が繋がっていない）' });
    }
  } else if (t.url) {
    const code = httpStatus(t.url);
    if (code === 0) problems.push({ code: 'unreachable', message: `${t.url} へ到達できない（検査不成立扱い）` });
    else if (code >= 400) problems.push({ code: 'http_error', message: `${t.url} が HTTP ${code}` });
  } else {
    problems.push({ code: 'no_entity', message: `status=${t.status} なのに videoId も url も無い` });
  }

  entries[id] = {
    packId: t.packId,
    derivative: t.derivative,
    status: t.status,
    videoId: t.videoId,
    url: t.url,
    ok: problems.length === 0,
    problems,
  };
  for (const p of problems) findings.push({ id, ...p });
}

const record = {
  schemaVersion: 1,
  verifiedAt: new Date().toISOString(),
  ok: findings.length === 0,
  reason: null,
  checked: targets.length,
  findings,
  entries,
};
mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(record, null, 2) + '\n', 'utf8');

if (JSON_OUT) {
  console.log(JSON.stringify(record, null, 2));
} else {
  log(`[verify-video-publication] 照合 ${targets.length} 件 / 問題 ${findings.length} 件`);
  for (const f of findings) log(`  [${f.code}] ${f.id}: ${f.message}`);
  log(`  記録: ${OUT_PATH}`);
}
process.exit(findings.length > 0 ? 1 : 0);
