#!/usr/bin/env node
/**
 * 動画パック由来の YouTube Shorts 2本/pack を Instagram Reels 用へ展開する。
 *
 * - source: content/sns/video-packs/{exam}/{packId}/youtube.json.shorts[]
 * - output: content/sns/instagram/video-packs/{exam}/{packId}-{key}/reels/{meta.json,caption.txt}
 * - binary は render-instagram-video-pack-reels.mjs が JIT 生成する（Git 追跡外）。
 *
 * 既定 dry-run。--write で派生 SoT と video-pack.json outputs.instagramReel=2 を書く。
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseArgs } from 'node:util';

const ROOT = process.cwd();
const PACKS_ROOT = join(ROOT, 'content/sns/video-packs');
const IG_ROOT = join(ROOT, 'content/sns/instagram/video-packs');
const ACCOUNT = 'dobokunotecom';
const SLOT_TIMES = ['12:30:00'];
const EXAMS = {
  'civil-construction-1': {
    label: '1級土木施工管理技士',
    tags: ['#1級土木', '#1級土木施工管理技士', '#土木施工管理技士', '#施工経験記述', '#土木技術者', '#現場監督', '#建設業', '#資格取得'],
  },
  'civil-construction-2': {
    label: '2級土木施工管理技士',
    tags: ['#2級土木', '#2級土木施工管理技士', '#土木施工管理技士', '#施工経験記述', '#土木技術者', '#現場監督', '#建設業', '#資格取得'],
  },
  'concrete-engineer': {
    label: 'コンクリート技士',
    tags: ['#コンクリート技士', '#コンクリート', '#JCI', '#配合設計', '#コンクリート材料', '#コンクリート施工', '#品質管理', '#耐久性', '#建設技術', '#資格取得'],
  },
  'concrete-chief-engineer': {
    label: 'コンクリート主任技士',
    tags: ['#コンクリート主任技士', '#コンクリート', '#JCI', '#小論文対策', '#配合設計', '#コンクリート施工', '#品質管理', '#耐久性', '#建設技術', '#資格取得'],
  },
};
const COMMON_TAGS = ['#土木', '#国家資格', '#資格勉強', '#試験対策', '#過去問', '#勉強垢', '#社会人勉強', '#スキマ時間', '#施工管理', '#doboku_note'];

const todayJst = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());
const { values: args } = parseArgs({
  args: process.argv.slice(2),
  options: {
    write: { type: 'boolean', default: false },
    start: { type: 'string', default: todayJst },
    exam: { type: 'string', default: Object.keys(EXAMS).join(',') },
  },
});
if (!/^\d{4}-\d{2}-\d{2}$/.test(args.start)) throw new Error(`--start は YYYY-MM-DD: ${args.start}`);
const selected = new Set(args.exam.split(',').filter(Boolean));
for (const exam of selected) if (!EXAMS[exam]) throw new Error(`未対応の試験: ${exam}`);

function addDays(date, days) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function chars(value) { return [...String(value ?? '')]; }
function fit(value, max) {
  const c = chars(value);
  return c.length <= max ? c.join('') : `${c.slice(0, max - 1).join('')}…`;
}
function cleanTitle(value) {
  return String(value ?? '')
    .replace(/\s*#Shorts\s*$/iu, '')
    .replace(/\s+/gu, ' ')
    .trim();
}
function firstSentence(value, max = 52) {
  const normalized = String(value ?? '').replace(/\s+/gu, ' ').trim();
  const sentence = normalized.match(/^.*?[。！？]/u)?.[0] ?? normalized;
  return fit(sentence, max);
}
function captionFor(row) {
  const body = [
    fit(cleanTitle(row.short.title), 42),
    '',
    firstSentence(row.scene.narration),
    '',
    '技術士（総合技術監理部門）取得者が、実務経験と公的資料をもとに企画・監修。AIは音声と映像制作の補助に使用しています。',
    '',
    'フォローで試験対策を継続。詳しい解説はプロフィールのリンクから。',
  ].join('\n');
  const civil = row.exam.startsWith('civil-construction-');
  const secondary = /施工経験|経験記述|第二次|二次|2次/u.test(`${row.short.title} ${row.scene.narration}`);
  const phaseTags = civil ? [secondary ? '#第二次検定' : '#第一次検定', '#合格'] : [];
  const tags = [...EXAMS[row.exam].tags, ...phaseTags, ...COMMON_TAGS];
  return `${body}\n\n${tags.join(' ')}`;
}
function loadRows() {
  const rows = [];
  for (const exam of Object.keys(EXAMS)) {
    if (!selected.has(exam)) continue;
    const examRoot = join(PACKS_ROOT, exam);
    if (!existsSync(examRoot)) continue;
    for (const packId of readdirSync(examRoot).sort()) {
      const sourceDir = join(examRoot, packId);
      const manifestPath = join(sourceDir, 'video-pack.json');
      const storyboardPath = join(sourceDir, 'storyboard.json');
      const youtubePath = join(sourceDir, 'youtube.json');
      if (![manifestPath, storyboardPath, youtubePath].every(existsSync)) continue;
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      const storyboard = JSON.parse(readFileSync(storyboardPath, 'utf8'));
      const youtube = JSON.parse(readFileSync(youtubePath, 'utf8'));
      if (!Array.isArray(youtube.shorts) || youtube.shorts.length !== 2) continue;
      for (const short of youtube.shorts) {
        const scene = storyboard.scenes?.find((candidate) => candidate.sceneId === short.sceneId);
        if (!scene) throw new Error(`${packId}/${short.key}: sceneId=${short.sceneId} がありません`);
        rows.push({ exam, packId, sourceDir, manifestPath, manifest, short, scene });
      }
    }
  }
  return rows.sort((a, b) => String(a.short.publishAt).localeCompare(String(b.short.publishAt)) || a.packId.localeCompare(b.packId) || a.short.key.localeCompare(b.short.key));
}

const rows = loadRows();
const occupied = new Set();
for (const row of rows) {
  row.destDir = join(IG_ROOT, row.exam, `${row.packId}-${row.short.key}`);
  row.caption = captionFor(row);
  const statusPath = join(row.destDir, 'status.json');
  const reel = existsSync(statusPath) ? JSON.parse(readFileSync(statusPath, 'utf8')).reel : null;
  if (['scheduled', 'posted'].includes(reel?.status) && reel.scheduled_at) {
    row.publishAt = reel.scheduled_at.replace('.000+09:00', '+09:00');
    occupied.add(row.publishAt.slice(0, 10));
  }
}
let nextDay = 0;
for (const row of rows) {
  if (row.publishAt) continue;
  let day = addDays(args.start, nextDay);
  while (occupied.has(day)) day = addDays(args.start, ++nextDay);
  row.publishAt = `${day}T${SLOT_TIMES[0]}+09:00`;
  occupied.add(day);
  nextDay += 1;
}

if (args.write) {
  const manifests = new Map();
  for (const row of rows) {
    mkdirSync(join(row.destDir, 'reels'), { recursive: true });
    const metaPath = join(row.destDir, 'reels', 'meta.json');
    const existingMeta = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, 'utf8')) : {};
    const meta = {
      ...existingMeta,
      schemaVersion: 1,
      channel: 'instagram',
      account: ACCOUNT,
      sourcePackId: row.packId,
      exam: row.exam,
      key: row.short.key,
      sceneId: row.short.sceneId,
      title: fit(cleanTitle(row.short.title), 42),
      publishAt: row.publishAt,
      approvedBy: 'user',
      approvedAt: existingMeta.approvedAt ?? new Date().toISOString(),
      productionDisclosure: 'author-led-ai-assisted',
      sourceShort: relative(ROOT, join(ROOT, '.tmp/video-render', row.packId, 'shorts', row.short.key, 'shorts.mp4')).replace(/\\/g, '/'),
    };
    writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
    writeFileSync(join(row.destDir, 'reels', 'caption.txt'), `${row.caption}\n`);
    manifests.set(row.manifestPath, row.manifest);
  }
  for (const [manifestPath, manifest] of manifests) {
    manifest.outputs ||= {};
    manifest.outputs.instagramReel = 2;
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }
}

const counts = Object.fromEntries(Object.keys(EXAMS).map((exam) => [exam, rows.filter((row) => row.exam === exam).length]));
console.log(JSON.stringify({
  mode: args.write ? 'write' : 'dry-run',
  account: ACCOUNT,
  sourcePacks: new Set(rows.map((row) => row.packId)).size,
  reels: rows.length,
  counts,
  firstPublishAt: rows[0]?.publishAt ?? null,
  lastPublishAt: rows.at(-1)?.publishAt ?? null,
  firstTarget: rows[0] ? relative(ROOT, rows[0].destDir).replace(/\\/g, '/') : null,
}, null, 2));
