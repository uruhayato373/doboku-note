#!/usr/bin/env node
/**
 * YouTube Shorts サムネイル（thumbnail.png）のみを生成して R2 にアップする。
 *
 * per-problem-shorts.mjs と同じ cover PNG を生成するが、動画・音声は不要なため
 * VOICEVOX なしで実行できる。
 *
 * 処理フロー:
 *   台帳の全エントリ → slide-data.json から topic を取得 →
 *   renderExamCoverIg で SVG → svgToPng で PNG → R2 へアップ
 *
 * R2 キー: sns/youtube-thumbnails/<year>-pack-<NN>-q<N>.png
 *
 * Usage:
 *   node .claude/scripts/youtube/generate-thumbnails.mjs               # R2 未アップ分のみ
 *   node .claude/scripts/youtube/generate-thumbnails.mjs --force       # 既存も上書き
 *   node .claude/scripts/youtube/generate-thumbnails.mjs --key r03-pack-01-q1  # 1件のみ
 *
 * 認証: .env.local または環境変数の CLOUDFLARE_ACCOUNT_ID /
 *       CLOUDFLARE_R2_ACCESS_KEY_ID / CLOUDFLARE_R2_SECRET_ACCESS_KEY
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

function loadEnv() {
  const env = { ...process.env };
  if (existsSync('.env.local')) {
    for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].trim();
    }
  }
  return env;
}
const env = loadEnv();
if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_R2_ACCESS_KEY_ID || !env.CLOUDFLARE_R2_SECRET_ACCESS_KEY) {
  console.error('Error: CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_R2_ACCESS_KEY_ID / CLOUDFLARE_R2_SECRET_ACCESS_KEY が必要');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID, secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY },
});
const BUCKET = 'doboku-note';
const THUMB_PREFIX = 'sns/youtube-thumbnails/';

const force = process.argv.includes('--force');
const keyIdx = process.argv.indexOf('--key');
const targetKey = keyIdx !== -1 ? process.argv[keyIdx + 1] : null;

const W = 1080;
const EXAM_DIR = 'content/sns/instagram/cem/exam-packs/技術士総監';

const { renderExamCoverIg } = await import(pathToFileURL(resolve('.claude/scripts/sns/templates/exam-cover-ig.mjs')).href);
const { svgToPng } = await import(pathToFileURL(resolve('.claude/scripts/sns/lib/svg-to-png.mjs')).href);

function yearLabel(year) {
  return `令和${year.replace(/^[rRhH]0?/, '')}年度`;
}

/** タイトル文字列から「｜」以降の論点テキストを抽出。例: "技術士総監 令和3年度 択一｜回収期間法の限界と評価手法 #Shorts" → "回収期間法の限界と評価手法" */
function topicFromTitle(title) {
  if (!title) return '';
  const m = title.match(/｜(.+?)(?:\s*#|$)/);
  return m ? m[1].trim() : '';
}

/** slide-data.json の problem スライドから管理分野ラベルを取得 */
function managementFromSlides(slides) {
  const prob = (slides || []).find((s) => s.type === 'problem');
  return prob?.management || '';
}

async function r2Exists(key) {
  try { await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key })); return true; } catch { return false; }
}

const ledger = JSON.parse(readFileSync('.claude/state/youtube-schedule.json', 'utf8'));
const items = targetKey
  ? ledger.items.filter((it) => it.key === targetKey)
  : ledger.items;

const tmpDir = join('.tmp', 'yt-thumbnails');
mkdirSync(tmpDir, { recursive: true });

let done = 0, skip = 0, fail = 0;
for (const it of items) {
  const thumbKey = `${THUMB_PREFIX}${it.key}.png`;
  if (!force && await r2Exists(thumbKey)) { skip++; continue; }

  // 動画キーから year と packNum を抽出: r03-pack-01-q2 → year=r03, packNum=01
  const m = it.key.match(/^(r\d+)-pack-(\d+)-q(\d+)$/);
  if (!m) { console.log(`  ⚠ キー形式不明: ${it.key}`); fail++; continue; }
  const [, year, packNum] = m;

  // slide-data.json を読む
  const slideFile = join(EXAM_DIR, year, `pack-${packNum}`, 'slide-data.json');
  if (!existsSync(slideFile)) { console.log(`  ⚠ slide-data.json なし: ${slideFile}`); fail++; continue; }
  const slideData = JSON.parse(readFileSync(slideFile, 'utf8'));

  const topic = topicFromTitle(it.title);
  // 管理分野キー（_meta.management が真実源。スライド埋め込みは fallback）
  const management = slideData._meta?.management || managementFromSlides(slideData.slides) || null;
  // 管理分野はカバー主役に表示するため、形式ラベルは年度横の従属表示のみに簡素化
  const fmtLabel = '択一式 過去問';
  const coverExam = '技術士総監';

  try {
    const coverSvg = renderExamCoverIg({
      exam: coverExam,
      tag: '過去問',
      year: yearLabel(year),
      fmtLabel,
      format: 'reels',
      hidePage: true,
      showCta: false,
      topic,
      management,
    });
    const png = await svgToPng(coverSvg, { width: W });
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: thumbKey, Body: png, ContentType: 'image/png' }));
    done++;
    if (done % 20 === 0 || targetKey) console.log(`  ✓ ${it.key} → ${thumbKey}`);
  } catch (e) {
    console.error(`  ✗ ${it.key}: ${e.message}`);
    fail++;
  }
}

console.log(`\nサムネイル生成完了: 新規 ${done} / スキップ(既存) ${skip} / 失敗 ${fail}`);
