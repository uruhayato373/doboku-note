#!/usr/bin/env node
/** YouTube Shorts 量産メタデータと公開枠のオフライン整合ゲート。 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { utmChannel } from './lib/utm-contract.mjs';
import { loadVideoState } from './lib/registry-video-state.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

const PACKS_ROOT = join(ROOT, 'content/sns/video-packs');
// 概要欄の送客リンクの UTM の期待値は契約（config/utm-templates.json の youtube.shorts）から受け取る
const SHORTS_UTM = utmChannel('youtube.shorts');
const EXAMS = [
  'civil-construction-1',
  'civil-construction-2',
  'concrete-engineer',
  'concrete-chief-engineer',
];
const errors = [];
const warnings = [];
const titles = new Map();
const slots = new Map();
const daily = new Map();
const pendingSlots = [];
const APPROVED = new Set(['approved', 'rendered', 'scheduled', 'published', 'measured', 'refresh_due']);
const STATE = loadVideoState(ROOT);
let packCount = 0;
let targetCount = 0;
let shortsCount = 0;

function readJsonLenient(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function addSlot(value, label) {
  if (!value) return;
  if (slots.has(value)) errors.push(`公開枠重複: ${value} (${slots.get(value)}, ${label})`);
  else slots.set(value, label);
  const day = value.slice(0, 10);
  daily.set(day, (daily.get(day) ?? 0) + 1);
}

// 公開の正本は台帳。停止済みの旧 publishAt を予定枠として復活させない。
function publicationSlot(packId, kind, item) {
  const derivatives = STATE.packs?.[packId]?.derivatives;
  const row = kind === 'longform' ? derivatives?.longform : derivatives?.shorts?.find((s) => s.key === item.key);
  if (row?.status === 'stopped') return;
  const label = `${packId}:${kind === 'longform' ? kind : item.key}`;
  if (APPROVED.has(row?.status)) {
    // 実予約・公開のある行は台帳の時刻だけを見る。承認済みで未予約なら制作計画を検査する。
    const live = ['scheduled', 'published', 'measured', 'refresh_due'].includes(row.status);
    const value = live ? row.publishAt : row.publishAt ?? item?.publishAt;
    if (row.status === 'scheduled' && !value) errors.push(`${label}: 台帳の予約日時なし`);
    addSlot(value, label);
  } else if (item?.publishAt) pendingSlots.push([item.publishAt, label]);
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
    if (!existsSync(manifestPath)) continue;
    targetCount += 1;
    if (![storyboardPath, youtubePath].every(existsSync)) {
      if (APPROVED.has(STATE.packs?.[packId]?.derivatives?.longform?.status)) errors.push(`${packId}: storyboard.json または youtube.json がない`);
      else warnings.push(`${packId}: 未承認パックのメタデータ未作成`);
      continue;
    }
    packCount += 1;
    const manifest = readJsonLenient(manifestPath);
    const storyboard = readJsonLenient(storyboardPath);
    const youtube = readJsonLenient(youtubePath);
    const sceneIds = new Set((storyboard.scenes ?? []).map((scene) => scene.sceneId));
    const shorts = youtube.shorts ?? [];
    const expected = manifest.outputs?.shorts;
    if (!Number.isInteger(expected) || expected < 0) errors.push(`${packId}: outputs.shorts が非負の整数ではない (${expected})`);
    if (shorts.length !== expected) errors.push(`${packId}: shorts=${shorts.length} (期待値${expected})`);
    if (!youtube.longform) errors.push(`${packId}: longform メタデータなし`);
    else publicationSlot(packId, 'longform', youtube.longform);

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
        `utm_source=${SHORTS_UTM.source}`,
        `utm_medium=${SHORTS_UTM.medium}`,
        `utm_campaign=${packId}`,
        `utm_content=${SHORTS_UTM.content}`,
        '技術士（総合技術監理部門）',
      ]) {
        if (!description.includes(token)) errors.push(`${label}: descriptionに ${token} がない`);
      }
      const disclosureCount = description.split('【この動画の制作について】').length - 1;
      if (disclosureCount !== 1) errors.push(`${label}: 制作表記見出し=${disclosureCount}回 (期待値1)`);
      // 描画先（video/render/…/shorts/…）か、差し替え版を中身のハッシュ名で置いた移行先（youtube-migration/<回>/media/<sha256>.<拡張子>。ファイル名が sha と一致すること）
      const migrated = (key, ext, sha) => new RegExp(`^youtube-migration/[^/]+/media/([a-f0-9]{64})\\.${ext}$`, 'u').exec(key ?? '')?.[1] === sha;
      if (!/^video\/render\/.+\/shorts\/.+\/shorts\.mp4$/u.test(item.r2Key ?? '') && !migrated(item.r2Key, 'mp4', item.sha256)) errors.push(`${label}: r2Key不正`);
      if (!/^video\/render\/.+\/shorts\/.+\/thumbnail\.png$/u.test(item.thumbnailR2Key ?? '') && !migrated(item.thumbnailR2Key, 'png', item.thumbnailSha256)) errors.push(`${label}: thumbnailR2Key不正`);
      if (!/^[a-f0-9]{64}$/u.test(item.sha256 ?? '')) errors.push(`${label}: sha256未確定または不正`);
      if (!/^[a-f0-9]{64}$/u.test(item.thumbnailSha256 ?? '')) errors.push(`${label}: thumbnailSha256未確定または不正`);
      if (!item.publishAt) errors.push(`${label}: publishAtなし`);
      if (item.publishAt && youtube.longform?.publishAt && item.publishAt <= youtube.longform.publishAt) {
        errors.push(`${label}: 通常動画より前または同時に公開 (${item.publishAt})`);
      }
      publicationSlot(packId, 'short', item);
    }
  }
}

if (!packCount) errors.push('動画パックを1件も検査していません');
for (const [day, count] of daily) {
  if (count > 3) errors.push(`${day}: 公開${count}本 (1日上限3本)`);
}
for (const [publishAt, label] of pendingSlots) {
  const day = publishAt.slice(0, 10);
  if (slots.has(publishAt)) warnings.push(`承認前の予定枠が重複: ${publishAt} (${slots.get(publishAt)}, ${label})`);
  if ((daily.get(day) ?? 0) >= 3) warnings.push(`承認前の予定枠: ${day} は既に${daily.get(day)}本（承認すると1日上限3本を超える）: ${label}`);
}

console.log(`YouTube Shorts gate: targets=${targetCount}, packs=${packCount}, shorts=${shortsCount}, titles=${titles.size}, slots=${slots.size}`);
for (const warning of warnings) console.warn(`WARN: ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`FAIL: ${error}`);
  process.exit(1);
}
console.log('PASS: パックごとの制作本数・タイトル・UTM・著者表記・関連scene・公開枠上限が整合');
