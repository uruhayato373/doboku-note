#!/usr/bin/env node
// verify-yt-status.mjs — YouTube 台帳(.claude/state/youtube-schedule.json) ↔ ライブ公開状態 の照合 reconciler。
//
// 背景（再発防止の対象）: post-from-schedule.cjs（GitHub Actions post-youtube-scheduled.yml の cron）が
//   pending を消化して videoId/status=uploaded を台帳に書き戻す。だが「台帳に uploaded とあるが実際に
//   public か・削除/BAN されていないか・publishAt を過ぎたのに未公開のままか」を照合する仕組みが無い。
//
// 設計: verify-ig-status.mjs（IG 版 reconciler）の YouTube 版。検知・報告のみ＝是正しない。read-only。
//   videos.list（読取のみ）を使い、投稿・削除・ステータス変更は一切行わない。
//
// 認証（CI 供給が正・ローカル creds 不要の恒久ルール。measurement-incidents.md 参照）:
//   環境変数 YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN
//   OAuth 初期化パターンは post-from-schedule.cjs（.claude/scripts/youtube/post-from-schedule.cjs）を
//   そのまま流用: google.auth.OAuth2 → setCredentials({ refresh_token }) → google.youtube({ version: 'v3', auth })。
//   このリフレッシュトークンは動画アップロード権限（フル youtube スコープ）を持つため videos.list
//   （読取のみ・quota 1 unit/コール）も通る。ローカルでは API を叩かない設計＝creds が無ければ
//   明示エラーで exit 1（--dry 指定時のみ台帳読取だけ行い API 呼び出し自体をスキップする）。
//
// 使い方:
//   node .claude/scripts/youtube/verify-yt-status.mjs            # 全件照合（人間向けサマリ）
//   node .claude/scripts/youtube/verify-yt-status.mjs --json     # JSON で stdout 出力
//   node .claude/scripts/youtube/verify-yt-status.mjs --dry      # creds 無しでも台帳読取だけして構造を表示（API 不叩き）
//
// exit code（verify-ig-status.mjs の慣習に合わせる）: 0 = ドリフトなし / 2 = ドリフトあり
//   （recorded_but_gone / not_public_after_publishAt / pending_overdue のいずれかが 1 件以上） / 1 = 認証・ネットワーク失敗。

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const LEDGER = join(ROOT, '.claude/state/youtube-schedule.json');
const REPORT_DIR = join(ROOT, '.claude/state/yt-verify');
const REPORT_PATH = join(REPORT_DIR, 'latest.json');

const argv = process.argv.slice(2);
const JSON_OUT = argv.includes('--json');
const DRY = argv.includes('--dry');
const log = (...a) => { if (!JSON_OUT) console.log(...a); };

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

function loadLedger() {
  if (!existsSync(LEDGER)) {
    console.error(`[verify-yt-status] 台帳が見つかりません: ${LEDGER}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(LEDGER, 'utf8'));
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ─── main ───────────────────────────────────────────────────────
const env = loadEnv();
const ledger = loadLedger();
const items = ledger.items || [];
const withVideoId = items.filter((it) => it.videoId);
const now = Date.now();

log(`[verify-yt-status] 台帳: 全${items.length} / videoId あり ${withVideoId.length}`);

if (DRY) {
  log('[verify-yt-status] --dry: API は叩かず台帳構造のみ表示します。');
  log(`  status 内訳: ${JSON.stringify(
    items.reduce((acc, it) => { acc[it.status] = (acc[it.status] || 0) + 1; return acc; }, {})
  )}`);
  log(`  videoId サンプル(先頭3件): ${withVideoId.slice(0, 3).map((it) => `${it.key}=${it.videoId}`).join(', ') || '(なし)'}`);
  process.exit(0);
}

const missing = ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN'].filter((k) => !env[k]);
if (missing.length) {
  console.error(`[verify-yt-status] 環境変数が不足（CI 供給が正・ローカル creds 不要ルール）: ${missing.join(', ')}`);
  console.error('[verify-yt-status] ローカルで検証するだけなら --dry を使ってください（API を叩きません）。');
  process.exit(1);
}

let google;
try {
  ({ google } = await import('googleapis'));
} catch (e) {
  console.error('[verify-yt-status] googleapis の読み込みに失敗:', String(e));
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(env.YOUTUBE_CLIENT_ID, env.YOUTUBE_CLIENT_SECRET);
oauth2.setCredentials({ refresh_token: env.YOUTUBE_REFRESH_TOKEN });
const youtube = google.youtube({ version: 'v3', auth: oauth2 });

// videoId → { status: {...}, snippet: {...} } の応答マップを作る（50件/コール、quota 1 unit/コール）
async function fetchStatuses(videoIds) {
  const map = new Map();
  for (const batch of chunk(videoIds, 50)) {
    const res = await youtube.videos.list({ part: 'status,snippet', id: batch });
    for (const v of res.data.items || []) map.set(v.id, v);
  }
  return map;
}

let statusMap;
try {
  statusMap = await fetchStatuses(withVideoId.map((it) => it.videoId));
} catch (e) {
  const detail = e.response?.data ? JSON.stringify(e.response.data) : e.message;
  console.error('[verify-yt-status] videos.list 失敗（認証/ネットワーク）:', detail);
  process.exit(1);
}

// ─── 分類 ───────────────────────────────────────────────────────
const cats = { recorded_but_gone: [], not_public_after_publishAt: [], pending_overdue: [], ok: [] };

for (const it of withVideoId) {
  const v = statusMap.get(it.videoId);
  if (!v) {
    cats.recorded_but_gone.push({ key: it.key, videoId: it.videoId, publishAt: it.publishAt, title: it.title });
    continue;
  }
  const privacyStatus = v.status?.privacyStatus;
  const publishAtPast = it.publishAt && new Date(it.publishAt).getTime() <= now;
  if (publishAtPast && privacyStatus !== 'public') {
    cats.not_public_after_publishAt.push({
      key: it.key, videoId: it.videoId, publishAt: it.publishAt, privacyStatus, title: it.title,
    });
    continue;
  }
  cats.ok.push({ key: it.key, videoId: it.videoId });
}

// pending（videoId 無し）のうち publishAt を過ぎているもの＝アップロード穴
for (const it of items) {
  if (it.videoId) continue;
  if (it.status === 'pending' && it.publishAt && new Date(it.publishAt).getTime() <= now) {
    cats.pending_overdue.push({ key: it.key, publishAt: it.publishAt, title: it.title });
  }
}

const driftCount = cats.recorded_but_gone.length + cats.not_public_after_publishAt.length + cats.pending_overdue.length;

const report = {
  generatedAt: new Date().toISOString(),
  counts: {
    total: items.length,
    withVideoId: withVideoId.length,
    ok: cats.ok.length,
    recorded_but_gone: cats.recorded_but_gone.length,
    not_public_after_publishAt: cats.not_public_after_publishAt.length,
    pending_overdue: cats.pending_overdue.length,
  },
  items: {
    recorded_but_gone: cats.recorded_but_gone,
    not_public_after_publishAt: cats.not_public_after_publishAt,
    pending_overdue: cats.pending_overdue,
  },
};

mkdirSync(REPORT_DIR, { recursive: true });
writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');

if (JSON_OUT) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const show = (label, arr, fn = (p) => `${p.key} (videoId=${p.videoId || '-'}, publishAt=${p.publishAt})`) => {
    if (arr.length) {
      console.log(`\n■ ${label}: ${arr.length}`);
      for (const p of arr) console.log('  ' + fn(p));
    }
  };
  console.log(`\n照合結果: 全${items.length} / videoId あり${withVideoId.length} / OK ${cats.ok.length}`);
  show('★台帳に videoId があるが API 応答に無い（削除/BAN/非公開化の疑い）', cats.recorded_but_gone);
  show('★publishAt を過ぎているのに public でない', cats.not_public_after_publishAt,
    (p) => `${p.key} (videoId=${p.videoId}, publishAt=${p.publishAt}, privacyStatus=${p.privacyStatus})`);
  show('★publishAt を過ぎているのに videoId が無い（アップロード穴）', cats.pending_overdue,
    (p) => `${p.key} (publishAt=${p.publishAt})`);
  console.log(`\nドリフト合計 ${driftCount} 件。レポート → .claude/state/yt-verify/latest.json`);
  if (driftCount) console.log('→ 是正はしません（検知・報告のみ）。原因確認は YouTube Studio で該当 videoId を手動確認してください。');
  else console.log('✓ ドリフトなし');
}

process.exit(driftCount ? 2 : 0);
