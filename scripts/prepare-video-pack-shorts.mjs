#!/usr/bin/env node
/**
 * 全動画パックから 1 パック 2 本の YouTube Shorts メタデータを生成し、
 * 通常動画を含むチャンネル全体で 1 日 3 本を超えない公開枠へ割り当てる。
 *
 * 既定は dry-run。--write で youtube.json を更新する。
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const ROOT = process.cwd();
const PACKS_ROOT = join(ROOT, 'content/sns/video-packs');
const DISCLOSURE = JSON.parse(readFileSync(join(ROOT, '.claude/config/youtube-production-disclosure.json'), 'utf8'));
const STATE = JSON.parse(readFileSync(join(ROOT, '.claude/state/video-content-status.json'), 'utf8'));
const SLOT_TIMES = ['07:30:00', '12:30:00', '20:00:00'];

const EXAMS = {
  'civil-construction-1': {
    title: '1級土木', tag: '#1級土木', examDate: '2026-10-04',
  },
  'civil-construction-2': {
    title: '2級土木', tag: '#2級土木', examDate: '2026-10-25',
  },
  'concrete-engineer': {
    title: 'コンクリート技士', tag: '#コンクリート技士', examDate: '2026-11-29',
  },
  'concrete-chief-engineer': {
    title: 'コンクリート主任技士', tag: '#コンクリート主任技士', examDate: '2026-11-29',
  },
};

const { values: args } = parseArgs({
  args: process.argv.slice(2),
  options: {
    write: { type: 'boolean', default: false },
    refresh: { type: 'boolean', default: false },
    start: { type: 'string', default: '2026-09-16' },
    exam: { type: 'string', default: Object.keys(EXAMS).join(',') },
  },
});

if (!/^\d{4}-\d{2}-\d{2}$/.test(args.start)) throw new Error(`--start は YYYY-MM-DD: ${args.start}`);
const selectedExams = new Set(args.exam.split(',').filter(Boolean));
for (const exam of selectedExams) if (!EXAMS[exam]) throw new Error(`未対応の試験: ${exam}`);

function addDays(date, days) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function codepoints(text) {
  return [...String(text ?? '')];
}

function fit(text, max) {
  const chars = codepoints(text);
  return chars.length <= max ? text : `${chars.slice(0, max - 1).join('')}…`;
}

function compactTitle(text) {
  return String(text ?? '')
    .replace(/（[^）]*）/gu, '')
    .replace(/[\s　]+/gu, ' ')
    .replace(/[|｜]　*/gu, '｜')
    .trim();
}

function cleanHeading(text) {
  return String(text ?? '')
    .replace(/\s+/g, ' ')
    .replace(/^(?:STEP\s*\d+|原因\s*\d+|ポイント\s*\d+|\d+)[\s　.:：、．-]*/iu, '')
    .trim();
}

function slug(text) {
  const value = String(text ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return value || 'point';
}

function firstSentence(text) {
  const normalized = String(text ?? '').replace(/\s+/g, ' ').trim();
  const m = normalized.match(/^.*?[。！？]/u);
  return fit(m?.[0] ?? normalized, 110);
}

function withShortsUtm(url, packId) {
  const parsed = new URL(url);
  parsed.searchParams.set('utm_source', 'youtube');
  parsed.searchParams.set('utm_medium', 'video');
  parsed.searchParams.set('utm_campaign', packId);
  parsed.searchParams.set('utm_content', 'shorts');
  return parsed.toString();
}

function findPrimaryUrl(description, packId) {
  const raw = String(description ?? '').match(/https?:\/\/[^\s]+/u)?.[0];
  if (!raw) throw new Error(`${packId}: longform description に送客URLがありません`);
  return withShortsUtm(raw, packId);
}

function contentScenes(storyboard, packId) {
  const scenes = (storyboard.scenes ?? []).filter((scene) => {
    const id = String(scene.sceneId ?? '').toLowerCase();
    return !['cover', 'premise', 'summary', 'cta'].includes(id)
      && scene.narration
      && (scene.visual?.heading || scene.caption);
  });
  if (scenes.length < 2) throw new Error(`${packId}: Shorts に使える本文sceneが2件未満です`);
  return scenes.slice(0, 2);
}

function makeTitle(profile, scene, manifest, ordinal, usedTitles) {
  const topic = compactTitle(cleanHeading(scene.visual?.heading || scene.caption));
  const suffix = ' #Shorts';
  const candidates = [
    `${profile.title}｜${topic}`,
    `${profile.title}｜${topic} ${ordinal + 1}`,
    `${profile.title}｜${manifest.title} ${ordinal + 1}`,
  ];
  for (const candidate of candidates) {
    // 40字ぎりぎりの機械的な途中切れを避け、一覧でも論点を読み切れる36字以内にする。
    const title = `${fit(compactTitle(candidate), 36 - codepoints(suffix).length)}${suffix}`;
    if (!usedTitles.has(title)) {
      usedTitles.add(title);
      return title;
    }
  }
  throw new Error(`${manifest.packId}: Shorts title を一意にできません`);
}

function makeDescription({ scene, manifest, youtube, profile }) {
  const url = findPrimaryUrl(youtube.longform?.description, manifest.packId);
  return [
    `${firstSentence(scene.narration)}詳しい解説は、このShortの関連動画から確認できます。`,
    '',
    DISCLOSURE.authorityNotice,
    '',
    '▼ 詳しい解説を見る',
    url,
    '',
    `${profile.tag} #試験対策 #Shorts`,
  ].join('\n');
}

function loadPacks() {
  const rows = [];
  for (const exam of Object.keys(EXAMS)) {
    const examRoot = join(PACKS_ROOT, exam);
    if (!existsSync(examRoot)) continue;
    for (const packId of readdirSync(examRoot).sort()) {
      const dir = join(examRoot, packId);
      const manifestPath = join(dir, 'video-pack.json');
      const storyboardPath = join(dir, 'storyboard.json');
      const youtubePath = join(dir, 'youtube.json');
      if (![manifestPath, storyboardPath, youtubePath].every(existsSync)) continue;
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      const storyboard = JSON.parse(readFileSync(storyboardPath, 'utf8'));
      const youtube = JSON.parse(readFileSync(youtubePath, 'utf8'));
      if (manifest.outputs?.shorts !== 2) throw new Error(`${packId}: outputs.shorts は2である必要があります`);
      const protectedShorts = (STATE.packs?.[packId]?.derivatives?.shorts ?? []).some((item) => item.videoId);
      rows.push({ exam, packId, dir, youtubePath, manifest, storyboard, youtube, protectedShorts });
    }
  }
  return rows;
}

function createDrafts(rows) {
  for (const row of rows) {
    row.regenerate = selectedExams.has(row.exam)
      && ((row.youtube.shorts?.length ?? 0) === 0 || (args.refresh && !row.protectedShorts));
  }
  const usedTitles = new Set();
  for (const row of rows) {
    if (!row.regenerate) for (const item of row.youtube.shorts ?? []) usedTitles.add(item.title);
  }
  const drafts = [];
  for (const row of rows) {
    if (!row.regenerate) continue;
    if (![0, 2].includes(row.youtube.shorts?.length ?? 0)) {
      throw new Error(`${row.packId}: shorts は0件または2件にしてください`);
    }
    const profile = EXAMS[row.exam];
    for (const [ordinal, scene] of contentScenes(row.storyboard, row.packId).entries()) {
      const key = `point-${slug(scene.sceneId)}-${ordinal + 1}`;
      const previous = (row.youtube.shorts ?? []).find((item) => item.key === key) ?? {};
      drafts.push({
        row,
        ordinal,
        exam: row.exam,
        examDate: profile.examDate,
        eligibleDate: addDays(row.youtube.longform.publishAt.slice(0, 10), 1),
        item: {
          key,
          sceneId: scene.sceneId,
          title: makeTitle(profile, scene, row.manifest, ordinal, usedTitles),
          description: makeDescription({ scene, manifest: row.manifest, youtube: row.youtube, profile }),
          tags: [...new Set([...(row.youtube.longform.tags ?? []), profile.title, 'Shorts'])].slice(0, 12),
          categoryId: row.youtube.longform.categoryId ?? '27',
          publishAt: null,
          r2Key: `video/render/${row.packId}/shorts/${key}/shorts.mp4`,
          thumbnailR2Key: `video/render/${row.packId}/shorts/${key}/thumbnail.png`,
          sha256: previous.sha256 ?? '',
          thumbnailSha256: previous.thumbnailSha256 ?? '',
        },
      });
    }
  }
  return drafts;
}

function schedule(rows, drafts) {
  const occupied = new Set();
  for (const row of rows) {
    if (row.youtube.longform?.publishAt) occupied.add(row.youtube.longform.publishAt);
    if (!row.regenerate) {
      for (const item of row.youtube.shorts ?? []) if (item.publishAt) occupied.add(item.publishAt);
    }
  }
  let day = args.start;
  const unscheduled = new Set(drafts);
  const silenceDays = new Set(Object.values(EXAMS).map((profile) => profile.examDate));
  let guard = 0;
  while (unscheduled.size) {
    if (guard++ > 730) throw new Error('730日以内に全Shortsを割り当てられませんでした');
    const usedPacks = new Set();
    if (!silenceDays.has(day)) {
      for (const time of SLOT_TIMES) {
        const publishAt = `${day}T${time}+09:00`;
        if (occupied.has(publishAt)) continue;
        const candidates = [...unscheduled]
          .filter((draft) => draft.eligibleDate <= day && !usedPacks.has(draft.row.packId))
          .sort((a, b) => {
            const aFuture = a.examDate >= day ? 0 : 1;
            const bFuture = b.examDate >= day ? 0 : 1;
            return aFuture - bFuture
              || a.examDate.localeCompare(b.examDate)
              || a.eligibleDate.localeCompare(b.eligibleDate)
              || a.row.youtube.longform.publishAt.localeCompare(b.row.youtube.longform.publishAt)
              || a.row.packId.localeCompare(b.row.packId)
              || a.ordinal - b.ordinal;
          });
        const chosen = candidates[0];
        if (!chosen) continue;
        chosen.item.publishAt = publishAt;
        occupied.add(publishAt);
        usedPacks.add(chosen.row.packId);
        unscheduled.delete(chosen);
      }
    }
    day = addDays(day, 1);
  }
}

const rows = loadPacks();
const drafts = createDrafts(rows);
schedule(rows, drafts);
const byPack = new Map();
for (const draft of drafts) {
  const list = byPack.get(draft.row.packId) ?? [];
  list.push(draft.item);
  byPack.set(draft.row.packId, list);
}

for (const row of rows) {
  const items = byPack.get(row.packId);
  if (!items) continue;
  row.youtube.shorts = items.sort((a, b) => a.publishAt.localeCompare(b.publishAt));
  if (args.write) writeFileSync(row.youtubePath, `${JSON.stringify(row.youtube, null, 2)}\n`);
}

const scheduled = drafts.map((draft) => draft.item.publishAt).sort();
const counts = Object.fromEntries(Object.keys(EXAMS).map((exam) => [exam, drafts.filter((d) => d.exam === exam).length]));
console.log(JSON.stringify({
  mode: args.write ? 'write' : 'dry-run',
  packs: byPack.size,
  shorts: drafts.length,
  counts,
  firstPublishAt: scheduled[0] ?? null,
  lastPublishAt: scheduled.at(-1) ?? null,
}, null, 2));
