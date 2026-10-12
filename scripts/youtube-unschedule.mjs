#!/usr/bin/env node
/**
 * youtube-unschedule.mjs — 台帳で scheduled の YouTube 動画の公開予約を外す（private のまま・動画は消さない）。
 *
 * 2026-10-13: 運営者が YouTube の投稿を一旦止め、予約済みの公開も全部取り消すと決めた。後で予約し直せるよう
 * 「非公開でアップロード済み」に戻す（台帳の stopped は戻れない終端なので使わない）。
 * 認証情報は CI にしか無いので .github/workflows/youtube-unschedule.yml から動かす。
 *
 * 使い方:
 *   node scripts/youtube-unschedule.mjs              # 試運転（YouTube を読むだけ・書かない）
 *   node scripts/youtube-unschedule.mjs --apply      # 外す。外せた公開 ID を --out のファイル（1 行 1 件）に書く
 *   node scripts/youtube-unschedule.mjs --apply --out .tmp/unscheduled.txt
 * exit: 0 全件外した（か既に無い）/ 1 外せないものがあった / 2 検査不成立（対象 0 件・認証なし）
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { google } from 'googleapis';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { loadRegistry } from './lib/content-registry.mjs';
import { selectScheduled, unscheduledStatus, decide, isUnscheduled } from './lib/youtube-unschedule.mjs';

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const outIdx = argv.indexOf('--out');
const OUT = outIdx >= 0 ? argv[outIdx + 1] : '.tmp/youtube-unscheduled.txt';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const targets = selectScheduled(loadRegistry(REPO_ROOT).publications);
  console.log(`[youtube-unschedule] 台帳の予約済み（未来）${targets.length} 件 / ${APPLY ? '実行' : '試運転'}`);
  if (targets.length === 0) { console.log('対象 0 件（予約済みの未来の公開が台帳に無い）'); return 2; }
  for (const k of ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN']) {
    if (!process.env[k]) { console.error(`認証情報が無い: ${k}`); return 2; }
  }
  const auth = new google.auth.OAuth2(process.env.YOUTUBE_CLIENT_ID, process.env.YOUTUBE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
  const youtube = google.youtube({ version: 'v3', auth });

  // チャンネルは台帳の文面ファイル（youtube.json の channel）と OAuth のチャンネルの一致で確かめる
  const copyFile = targets[0].copy.split('#')[0];
  const expected = JSON.parse(readFileSync(join(REPO_ROOT, copyFile), 'utf8')).channel;
  const me = (await youtube.channels.list({ part: 'snippet', mine: true })).data.items ?? [];
  if (me.length !== 1 || me[0].id !== expected.id) { console.error(`チャンネル不一致: expected=${expected.id} actual=${me.map((c) => c.id).join(',')}`); return 1; }
  console.log(`account: ${me[0].snippet?.title} (${me[0].id})`);

  const ids = targets.map((p) => p.platform.id);
  const videos = new Map();
  for (let i = 0; i < ids.length; i += 50) {
    const res = await youtube.videos.list({ part: 'snippet,status', id: ids.slice(i, i + 50).join(','), maxResults: 50 });
    for (const v of res.data.items ?? []) videos.set(v.id, v);
  }

  const done = []; const errors = [];
  for (const p of targets) {
    const v = videos.get(p.platform.id);
    const d = decide(v, expected.id);
    console.log(`  ${p.publishAt} ${p.id} ${p.platform.id}: ${d.action}（${d.reason}）`);
    if (d.action === 'error') { errors.push(p.id); continue; }
    if (d.action === 'already') { done.push(p.id); continue; }
    if (!APPLY) continue;
    await youtube.videos.update({ part: 'status', requestBody: { id: p.platform.id, status: unscheduledStatus(v.status) } });
    let ok = false;
    for (let n = 0; n < 10 && !ok; n += 1) {
      await sleep(1500);
      const after = (await youtube.videos.list({ part: 'status', id: p.platform.id })).data.items?.[0];
      ok = isUnscheduled(after);
    }
    if (ok) { done.push(p.id); console.log(`    ✓ private・予約なしを確認`); } else { errors.push(p.id); console.log('    ✗ 10 回確かめても予約が残っている'); }
  }
  if (APPLY) {
    mkdirSync(dirname(join(REPO_ROOT, OUT)), { recursive: true });
    writeFileSync(join(REPO_ROOT, OUT), done.map((id) => `${id}\n`).join(''));
  }
  console.log(`[youtube-unschedule] 対象 ${targets.length} / ${APPLY ? `外した（か既に無い）${done.length}` : `外す予定 ${targets.length - errors.length}`} / 外せない ${errors.length}`);
  return errors.length ? 1 : 0;
}

main().then((code) => { process.exitCode = code; }).catch((e) => { console.error(e?.message ?? e); process.exitCode = 1; });
