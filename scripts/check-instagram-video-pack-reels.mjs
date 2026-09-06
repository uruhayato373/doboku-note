#!/usr/bin/env node
/** Instagram video-pack Reels の構造・CTA・任意メディアを検査する。 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const BASE = join(ROOT, 'content/sns/instagram/video-packs');
const checkMedia = process.argv.includes('--media');
const EXPECTED = {
  'civil-construction-1': 132,
  'civil-construction-2': 36,
  'concrete-engineer': 24,
  'concrete-chief-engineer': 32,
};
const errors = [];
const rows = [];

function walk(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (name === 'meta.json' && dirname(path).endsWith('/reels')) rows.push(path);
  }
}
function fail(label, message) { errors.push(`${label}: ${message}`); }
function probe(path) {
  const result = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,width,height', '-show_entries', 'format=duration', '-of', 'json', path], { encoding: 'utf8' });
  if (result.status !== 0) return null;
  return JSON.parse(result.stdout);
}

walk(BASE);
const counts = {};
const seen = new Set();
for (const metaPath of rows) {
  const reelsDir = dirname(metaPath);
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  const label = `${meta.sourcePackId}/${meta.key}`;
  const id = `${meta.sourcePackId}:${meta.key}`;
  if (seen.has(id)) fail(label, 'sourcePackId+key が重複');
  seen.add(id);
  counts[meta.exam] = (counts[meta.exam] ?? 0) + 1;
  if (meta.schemaVersion !== 1 || meta.channel !== 'instagram' || meta.account !== 'dobokunotecom') fail(label, 'meta 契約不一致');
  if (!/^\d{4}-\d{2}-\d{2}T(?:07:30|12:30|21:00):00\+09:00$/.test(meta.publishAt ?? '')) fail(label, `publishAt 不正: ${meta.publishAt}`);
  if (meta.approvedBy !== 'user') fail(label, 'approvedBy=user がありません');
  const captionPath = join(reelsDir, 'caption.txt');
  if (!existsSync(captionPath)) { fail(label, 'caption.txt がありません'); continue; }
  const caption = readFileSync(captionPath, 'utf8');
  const body = caption.split(/\n\s*\n(?=#)/u)[0].trim();
  const tagCount = (caption.match(/#[^\s#]+/gu) ?? []).length;
  if ([...body].length < 100 || [...body].length > 200) fail(label, `本文 ${[...body].length}字（100-200外）`);
  if (tagCount < 20 || tagCount > 25) fail(label, `ハッシュタグ ${tagCount}件（20-25外）`);
  for (const required of ['総合技術監理部門', '企画・監修', 'フォロー', 'プロフィール']) if (!caption.includes(required)) fail(label, `caption 必須語なし: ${required}`);
  for (const forbidden of ['#Shorts', '関連動画', '概要欄', 'http://', 'https://']) if (caption.includes(forbidden)) fail(label, `Instagram 禁忌: ${forbidden}`);
  if (checkMedia) {
    const video = join(reelsDir, 'video.mp4');
    const cover = join(reelsDir, 'cover.png');
    if (!existsSync(video) || !existsSync(cover)) { fail(label, 'video.mp4 または cover.png がありません'); continue; }
    const info = probe(video);
    const visual = info?.streams?.find((stream) => stream.codec_type === 'video');
    const audio = info?.streams?.find((stream) => stream.codec_type === 'audio');
    const duration = Number(info?.format?.duration);
    if (!visual || visual.width !== 1080 || visual.height !== 1920) fail(label, `video 解像度不正: ${visual?.width}x${visual?.height}`);
    if (!audio) fail(label, '音声 stream がありません');
    if (!(duration >= 30 && duration <= 60)) fail(label, `尺外: ${duration}`);
  }
}
for (const [exam, expected] of Object.entries(EXPECTED)) if ((counts[exam] ?? 0) !== expected) fail(exam, `${counts[exam] ?? 0}本（期待 ${expected}）`);
if (rows.length !== 224) fail('total', `${rows.length}本（期待 224）`);

console.log(`Instagram video-pack Reels gate: reels=${rows.length} media=${checkMedia ? 'on' : 'off'} counts=${JSON.stringify(counts)}`);
if (errors.length) {
  for (const error of errors) console.error(`FAIL ${error}`);
  process.exit(1);
}
console.log('PASS');
