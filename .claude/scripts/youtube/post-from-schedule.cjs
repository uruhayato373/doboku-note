#!/usr/bin/env node
/**
 * YouTube Shorts 予約投稿（台帳駆動・CI/CD 用）。
 *
 * `.claude/state/youtube-schedule.json` の pending のうち publishAt が近い（leadDays 以内）ものを
 * 最大 uploadBatchPerDay 本（YouTube quota ≈6本/日）、R2 から取得して private+publishAt でアップ。
 * YouTube が publishAt 時刻に自動公開する。アップ後 videoId/uploadedAt/status を台帳に書き戻し、
 * `.claude/state/yt-posted-log.jsonl` に追記する。
 *
 * 実行: GitHub Actions の post-youtube-scheduled.yml（毎日 cron）。ローカル検証は --dry-run。
 *
 * 認証（環境変数 or .env.local）:
 *   YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN
 *   CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_R2_ACCESS_KEY_ID / CLOUDFLARE_R2_SECRET_ACCESS_KEY
 *
 * オプション:
 *   --dry-run   アップロードせず対象だけ表示
 *   --max N     1回のアップ上限を上書き（既定: 台帳 meta.uploadBatchPerDay）
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { google } = require('googleapis');
const { S3Client, GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

const LEDGER = '.claude/state/youtube-schedule.json';
const LOG = '.claude/state/yt-posted-log.jsonl';
const DRY = process.argv.includes('--dry-run');
const maxIdx = process.argv.indexOf('--max');
const MAX_OVERRIDE = maxIdx !== -1 ? Number(process.argv[maxIdx + 1]) : null;

function loadEnv() {
  const env = { ...process.env };
  const p = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].trim();
    }
  }
  return env;
}
const env = loadEnv();

function requireEnv(keys) {
  const miss = keys.filter((k) => !env[k]);
  if (miss.length) { console.error(`Error: 環境変数が不足: ${miss.join(', ')}`); process.exit(1); }
}
requireEnv(['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN',
  'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_R2_ACCESS_KEY_ID', 'CLOUDFLARE_R2_SECRET_ACCESS_KEY']);

if (!fs.existsSync(LEDGER)) { console.error(`Error: 台帳がありません: ${LEDGER}（先に build-schedule.mjs）`); process.exit(1); }
const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
const meta = ledger.meta || {};
const LEAD_MS = (meta.leadDays ?? 4) * 86400000;
const MAX = MAX_OVERRIDE ?? meta.uploadBatchPerDay ?? 6;
const BUCKET = meta.r2Bucket || 'doboku-note';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID, secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY },
});

const oauth2 = new google.auth.OAuth2(env.YOUTUBE_CLIENT_ID, env.YOUTUBE_CLIENT_SECRET);
oauth2.setCredentials({ refresh_token: env.YOUTUBE_REFRESH_TOKEN });
const youtube = google.youtube({ version: 'v3', auth: oauth2 });

async function downloadR2(key, dest) {
  const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const chunks = [];
  for await (const c of obj.Body) chunks.push(c);
  fs.writeFileSync(dest, Buffer.concat(chunks));
}

/** サムネイルの R2 キーを r2Key（mp4）から導出する。台帳に thumbnailR2Key があればそちら優先。 */
function thumbnailR2Key(it) {
  if (it.thumbnailR2Key) return it.thumbnailR2Key;
  // sns/youtube-shorts/r03-pack-01-q1.mp4 → sns/youtube-thumbnails/r03-pack-01-q1.png
  return it.r2Key.replace('sns/youtube-shorts/', 'sns/youtube-thumbnails/').replace(/\.mp4$/, '.png');
}

async function r2Exists(key) {
  try { await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key })); return true; } catch { return false; }
}

/** YouTube にサムネイルを設定する（R2 から PNG を取得して thumbnails.set）。失敗しても投稿自体は続行。 */
async function setThumbnail(videoId, thumbKey) {
  const tmpPng = path.join(os.tmpdir(), `${videoId}-thumbnail.png`);
  try {
    if (!await r2Exists(thumbKey)) { console.log(`  ⚠ サムネイル R2 なし: ${thumbKey} → スキップ`); return; }
    await downloadR2(thumbKey, tmpPng);
    await youtube.thumbnails.set({
      videoId,
      media: { mimeType: 'image/png', body: fs.createReadStream(tmpPng) },
    });
    console.log(`    🖼  サムネイル設定済み`);
  } catch (e) {
    console.warn(`    ⚠ サムネイル設定失敗（動画投稿には影響なし）: ${e.message}`);
  } finally {
    if (fs.existsSync(tmpPng)) fs.unlinkSync(tmpPng);
  }
}

/** publishAt は未来でなければ YouTube が弾く。過去/直近なら now+10分へ繰り下げ。 */
function safePublishAt(iso, now) {
  const t = new Date(iso).getTime();
  if (t > now + 5 * 60000) return iso;
  return new Date(now + 10 * 60000).toISOString();
}

/**
 * 台帳をディスクから読み込んで最新状態を返す。
 * アップロード直前にも呼んで、並行プロセスが先に済ませていないか確認する（楽観的ロック）。
 */
function reloadLedger() {
  return JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
}

async function main() {
  const now = Date.now();
  const due = ledger.items
    .filter((it) => it.status === 'pending' && new Date(it.publishAt).getTime() <= now + LEAD_MS)
    .sort((a, b) => new Date(a.publishAt) - new Date(b.publishAt))
    .slice(0, MAX);

  console.log(`台帳: 全${ledger.items.length} / pending ${ledger.items.filter((x) => x.status === 'pending').length}`);
  console.log(`本日アップ対象（publishAt ≤ now+${meta.leadDays ?? 4}日, 上限${MAX}）: ${due.length} 本`);
  for (const it of due) console.log(`  - ${it.key}  publishAt=${it.publishAt}  ${it.title}`);
  if (DRY) { console.log('\n[dry-run] アップロードはしません'); return; }
  if (!due.length) { console.log('対象なし → 終了'); return; }

  let uploaded = 0;
  for (const it of due) {
    const tmp = path.join(os.tmpdir(), `${it.key}.mp4`);
    try {
      // --- 楽観的ロック: アップ直前に台帳を再読み込みして重複アップを防ぐ ---
      const fresh = reloadLedger();
      const freshItem = fresh.items.find((x) => x.key === it.key);
      if (!freshItem || freshItem.status !== 'pending') {
        console.log(`  ⚡ ${it.key}: 別プロセスが先にアップ済み → スキップ`);
        continue;
      }
      // freshItem が pending のままなら、インメモリ ledger の参照を使って続行
      await downloadR2(it.r2Key, tmp);
      const publishAt = safePublishAt(it.publishAt, Date.now());
      const res = await youtube.videos.insert({
        part: 'snippet,status',
        requestBody: {
          snippet: { title: it.title, description: it.description, tags: it.tags, categoryId: it.categoryId || '27', defaultLanguage: 'ja', defaultAudioLanguage: 'ja' },
          status: { privacyStatus: 'private', publishAt, selfDeclaredMadeForKids: false },
        },
        media: { body: fs.createReadStream(tmp) },
      });
      const videoId = res.data.id;
      it.status = 'uploaded';
      it.videoId = videoId;
      it.uploadedAt = new Date().toISOString();
      it.publishAt = publishAt;
      // 台帳を即時書き込み（各アップ後に保存してクラッシュ耐性を高める）
      fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + '\n');
      fs.appendFileSync(LOG, JSON.stringify({ key: it.key, videoId, publishAt, title: it.title, uploadedAt: it.uploadedAt }) + '\n');
      console.log(`  ✓ ${it.key} → https://youtube.com/watch?v=${videoId}  (公開予約 ${publishAt})`);
      // サムネイル設定（失敗しても投稿は完了扱い）
      await setThumbnail(videoId, thumbnailR2Key(it));
      uploaded++;
    } catch (e) {
      const detail = e.response?.data ? JSON.stringify(e.response.data) : e.message;
      console.error(`  ✗ ${it.key}: ${detail}`);
      // quota 超過なら以降は中断（翌日に回す）
      if (/quota/i.test(detail)) { console.error('  quota 超過 → 本日は打ち切り'); break; }
    } finally {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    }
  }
  // ループ後も最終状態を書き込み（ループ内での個別書き込みの補完）
  fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + '\n');
  console.log(`\nアップ ${uploaded} 本完了。台帳更新済み。残り pending ${ledger.items.filter((x) => x.status === 'pending').length}`);
  // workflow 用の出力
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `uploaded=${uploaded}\n`);
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });
