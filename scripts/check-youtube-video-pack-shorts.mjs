#!/usr/bin/env node
/** YouTube Shorts 量産メタデータと公開枠のオフライン整合ゲート。 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const PACKS_ROOT = join(ROOT, 'content/sns/video-packs');
const EXAMS = [
  'civil-construction-1',
  'civil-construction-2',
  'concrete-engineer',
  'concrete-chief-engineer',
];
const EXPECTED_PACKS = 112;
const EXPECTED_SHORTS = 224;
const errors = [];
const warnings = [];
const titles = new Map();
const slots = new Map();
const daily = new Map();
let packCount = 0;
let shortsCount = 0;

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function addSlot(value, label) {
  if (!value) return;
  if (slots.has(value)) errors.push(`公開枠重複: ${value} (${slots.get(value)}, ${label})`);
  else slots.set(value, label);
  const day = value.slice(0, 10);
  daily.set(day, (daily.get(day) ?? 0) + 1);
}

for (const exam of EXAMS) {
  const examRoot = join(PACKS_ROOT, exam);
  if (!existsSync(examRoot)) {
    errors.push(`試験ディレクトリなし: ${exam}`);
    continue;
  }
  for (const packId of readdirSync(examRoot).sort()) {
    const dir = join(examRoot, packId);
    const manifestPath = join(dir, 'video-pack.json');
    const storyboardPath = join(dir, 'storyboard.json');
    const youtubePath = join(dir, 'youtube.json');
    if (![manifestPath, storyboardPath, youtubePath].every(existsSync)) continue;
    packCount += 1;
    const manifest = readJson(manifestPath);
    const storyboard = readJson(storyboardPath);
    const youtube = readJson(youtubePath);
    const sceneIds = new Set((storyboard.scenes ?? []).map((scene) => scene.sceneId));
    const shorts = youtube.shorts ?? [];
    const expected = manifest.outputs?.shorts;
    if (expected !== 2) errors.push(`${packId}: outputs.shorts=${expected} (期待値2)`);
    if (shorts.length !== expected) errors.push(`${packId}: shorts=${shorts.length} (期待値${expected})`);
    addSlot(youtube.longform?.publishAt, `${packId}:longform`);

    for (const item of shorts) {
      shortsCount += 1;
      const label = `${packId}:${item.key ?? '?'}`;
      const chars = [...String(item.title ?? '')].length;
      if (!item.key) errors.push(`${label}: keyなし`);
      if (!sceneIds.has(item.sceneId)) errors.push(`${label}: sceneIdがstoryboardにない (${item.sceneId})`);
      if (!item.title || chars > 40) errors.push(`${label}: title ${chars}字 (上限40)`);
      if (/[（(][^）)]*$/.test(item.title ?? '')) errors.push(`${label}: 閉じていない括弧を含むtitle`);
      if (titles.has(item.title)) errors.push(`${label}: title重複 (${titles.get(item.title)})`);
      else titles.set(item.title, label);
      const description = String(item.description ?? '');
      for (const token of [
        'utm_source=youtube',
        'utm_medium=video',
        `utm_campaign=${packId}`,
        'utm_content=shorts',
        '技術士（総合技術監理部門）',
      ]) {
        if (!description.includes(token)) errors.push(`${label}: descriptionに ${token} がない`);
      }
      const disclosureCount = description.split('【この動画の制作について】').length - 1;
      if (disclosureCount !== 1) errors.push(`${label}: 制作表記見出し=${disclosureCount}回 (期待値1)`);
      if (!/^video\/render\/.+\/shorts\/.+\/shorts\.mp4$/u.test(item.r2Key ?? '')) errors.push(`${label}: r2Key不正`);
      if (!/^video\/render\/.+\/shorts\/.+\/thumbnail\.png$/u.test(item.thumbnailR2Key ?? '')) errors.push(`${label}: thumbnailR2Key不正`);
      if (!/^[a-f0-9]{64}$/u.test(item.sha256 ?? '')) errors.push(`${label}: sha256未確定または不正`);
      if (!/^[a-f0-9]{64}$/u.test(item.thumbnailSha256 ?? '')) errors.push(`${label}: thumbnailSha256未確定または不正`);
      if (!item.publishAt) errors.push(`${label}: publishAtなし`);
      if (item.publishAt && youtube.longform?.publishAt && item.publishAt <= youtube.longform.publishAt) {
        errors.push(`${label}: 通常動画より前または同時に公開 (${item.publishAt})`);
      }
      addSlot(item.publishAt, label);
    }
  }
}

if (packCount !== EXPECTED_PACKS) errors.push(`動画パック=${packCount} (期待値${EXPECTED_PACKS})`);
if (shortsCount !== EXPECTED_SHORTS) errors.push(`Shorts=${shortsCount} (期待値${EXPECTED_SHORTS})`);
for (const [day, count] of daily) {
  if (count > 3) errors.push(`${day}: 公開${count}本 (1日上限3本)`);
}
if ([...daily.values()].every((count) => count < 3)) warnings.push('1日3本の枠を使う日がありません');

console.log(`YouTube Shorts gate: packs=${packCount}, shorts=${shortsCount}, titles=${titles.size}, slots=${slots.size}`);
for (const warning of warnings) console.warn(`WARN: ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`FAIL: ${error}`);
  process.exit(1);
}
console.log('PASS: 2本/pack・タイトル・UTM・著者表記・関連scene・公開枠上限が整合');
