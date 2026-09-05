#!/usr/bin/env node
/**
 * 試験日前に公開する通常動画の予約台帳と YouTube metadata を生成する。
 *
 * --schedule: QA 済みパックを approved にし、publishAt を確定する。
 * --metadata: レンダー実体を検証して youtube.json を生成し、status を rendered にする。
 * --report:   予約一覧を TSV で表示する（書き込みなし）。
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BRAIN_PRODUCTS } from '../src/lib/brain-products.ts';
import { COCONALA_SERVICES } from '../src/lib/coconala-services.ts';
import { NOTE_MAGAZINES } from '../src/lib/note-magazines.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACKS_ROOT = join(ROOT, 'content/sns/video-packs');
const STATE_PATH = join(ROOT, '.claude/state/video-content-status.json');
const CHANNEL = { id: 'UCHRnXPqoc0Hls8nXiK_ZYqA', title: 'doboku-note' } as const;
const TARGET_EXAMS = [
  'civil-construction-1', 'civil-construction-2',
  'concrete-engineer', 'concrete-chief-engineer',
] as const;

type TargetExam = (typeof TARGET_EXAMS)[number];
type Manifest = {
  packId: string;
  exam: TargetExam;
  title: string;
  audience: string;
  promise: string;
  intent: string;
  primaryCta: { kind: string; targetId?: string; targetPath?: string; campaign: string };
};

const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(name);
const val = (name: string, fallback: string) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const renderRoot = resolve(val('--render-root', join(ROOT, '.tmp/video-render')));
const onlyPackId = val('--pack-id', '');
const scope = val('--scope', 'civil');

function readJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path: string, value: unknown) {
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
}

function loadPacks(exam: TargetExam) {
  return readdirSync(join(PACKS_ROOT, exam), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const dir = join(PACKS_ROOT, exam, entry.name);
      return { dir, manifest: readJson(join(dir, 'video-pack.json')) as Manifest };
    })
    .filter(({ manifest }) => manifest.exam === exam);
}

const oneKyuEarly = [
  'niji-junbi-roadmap', 'keiken-r6-shinkeishiki', 'keiken-2theme-heiki',
  'keiken-taisho-koji', 'keiken-kadai-kakikata', 'keiken-kento-kakikata',
  'keiken-taio-hyoka', 'keiken-anzen-1kyu', 'keiken-hinshitsu-1kyu',
  'keiken-kotei-1kyu', 'keiken-kankyo-1kyu', 'keiken-sekokeikaku-1kyu',
  'niji-kijutsu-doko', 'niji-kijutsu-concrete', 'niji-kijutsu-hinshitsu',
  'niji-kijutsu-sekokeikaku', 'keiken-soteikoji-katsuyo', 'keiken-ai-sekkei',
];
const oneKyuLate = [
  'kikinagashi-doko-suchi', 'kikinagashi-hinshitsu-kikaku',
  'kikinagashi-hoki-suchi', 'kikinagashi-anzen-suchi',
  'keiken-yosou-renshu', 'keiken-nendo-keiko-1kyu',
  'keiken-dokugaku-genkai', 'keiken-kaizen-example',
  'keiken-ochiru-toan-1kyu', 'chokuzen-check-1kyu-niji',
];
const twoKyuOrder = [
  'nikyuu-gaiyo-roadmap', 'study-plan-2kyu', 'anzen-ippanron-3riyu',
  'gakka-2kyu-doko', 'keiken-gaiyo-2kyu', 'gakka-2kyu-concrete',
  'keiken-anzen-2kyu-kakikata', 'gakka-2kyu-kiso', 'keiken-hinshitsu-kakikata',
  'gakka-2kyu-sekokeikaku', 'keiken-kotei-kakikata', 'gakka-2kyu-hoki',
  'gakka-kijutsu-2kyu', 'keiken-2kyu-level', 'keiken-koji-ga-nai',
  'keiken-genten-kyotsuten', 'keiken-nendo-keiko-2kyu', 'kikinagashi-2kyu-matome',
];

// 10/23〜11/19 は、技士と主任技士の共通分野を交互に出して両方の視聴者を
// 早期から獲得する。小論文・予想・直前総仕上げは試験日に近い後半へ置く。
const concreteOrder = [
  'gishi-shiken-zentaizou', 'shunin-shiken-zentaizou',
  'gishi-12week-plan', 'shunin-hinshutsu-yusen',
  'gishi-materials-ronten', 'shunin-materials-ronten',
  'gishi-properties-testing-ronten', 'shunin-properties-ronten',
  'gishi-mix-design-ronten', 'shunin-mix-design-ronten',
  'gishi-production-qc-ronten', 'shunin-production-qc-ronten',
  'gishi-construction-ronten', 'shunin-construction-ronten',
  'gishi-environment-ronten', 'shunin-durability-ronten',
  'gishi-haigou-keisan', 'shunin-products-ronten',
  'gishi-jis-handan', 'shunin-structural-design-ronten',
  'gishi-jukenshikaku-2026', 'shunin-shouronbun-theme',
  'gishi-shunin-dochira', 'shunin-shouronbun-kousei',
  'shunin-ochiru-shouronbun', 'shunin-r8-juuten',
  'kikinagashi-shunin-suchi', 'shunin-chokuzen-senryaku',
];

function orderedOneKyu(packs: ReturnType<typeof loadPacks>, state: any) {
  const byId = new Map(packs.map((pack) => [pack.manifest.packId, pack]));
  const published = new Set(
    Object.entries(state.packs ?? {})
      .filter(([, value]: any) => value?.derivatives?.longform?.status === 'published')
      .map(([id]) => id),
  );
  const take = (ids: string[]) => ids.map((id) => byId.get(id)).filter(Boolean) as typeof packs;
  const reserved = new Set([...oneKyuEarly, ...oneKyuLate, ...published]);
  const middle = packs
    .filter(({ manifest }) => !reserved.has(manifest.packId))
    .sort((a, b) => {
      const rank = (m: Manifest) => m.packId.startsWith('gakka-') ? 1 : m.intent === 'career' ? 2 : 0;
      return rank(a.manifest) - rank(b.manifest) || a.manifest.packId.localeCompare(b.manifest.packId);
    });
  return [...take(oneKyuEarly), ...middle, ...take(oneKyuLate)].filter(
    ({ manifest }) => !published.has(manifest.packId),
  );
}

function orderedTwoKyu(packs: ReturnType<typeof loadPacks>) {
  const byId = new Map(packs.map((pack) => [pack.manifest.packId, pack]));
  const ordered = twoKyuOrder.map((id) => byId.get(id)).filter(Boolean) as typeof packs;
  if (ordered.length !== packs.length) {
    const known = new Set(ordered.map(({ manifest }) => manifest.packId));
    ordered.push(...packs.filter(({ manifest }) => !known.has(manifest.packId)).sort((a, b) => a.manifest.packId.localeCompare(b.manifest.packId)));
  }
  return ordered;
}

function jst(date: string, time: string) {
  return `${date}T${time}:00+09:00`;
}

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function buildCivilSchedule(state: any) {
  const one = orderedOneKyu(loadPacks('civil-construction-1'), state);
  const two = orderedTwoKyu(loadPacks('civil-construction-2'));
  if (one.length !== 65) throw new Error(`1級の未公開本数が65本でない: ${one.length}`);
  if (two.length !== 18) throw new Error(`2級の本数が18本でない: ${two.length}`);

  const schedule: Array<{ dir: string; manifest: Manifest; publishAt: string }> = [];
  let cursor = 0;
  for (let day = 0; day < 26; day += 1) {
    const slots = day % 2 === 0 ? ['07:30', '12:30', '20:00'] : ['07:30', '20:00'];
    for (const time of slots) {
      const pack = one[cursor++];
      schedule.push({ ...pack, publishAt: jst(addDays('2026-09-08', day), time) });
    }
  }
  if (cursor !== one.length) throw new Error(`1級の予約割当が不一致: ${cursor}/${one.length}`);
  two.forEach((pack, day) => schedule.push({ ...pack, publishAt: jst(addDays('2026-10-05', day), '20:00') }));
  return schedule;
}

function buildConcreteSchedule() {
  const packs = [
    ...loadPacks('concrete-engineer'),
    ...loadPacks('concrete-chief-engineer'),
  ];
  const byId = new Map(packs.map((pack) => [pack.manifest.packId, pack]));
  const ordered = concreteOrder.map((id) => byId.get(id)).filter(Boolean) as typeof packs;
  const missing = concreteOrder.filter((id) => !byId.has(id));
  const extra = packs.filter(({ manifest }) => !concreteOrder.includes(manifest.packId));
  if (missing.length || extra.length || ordered.length !== 28) {
    throw new Error(`コンクリート系の予約順が在庫と不一致 missing=${missing.join(',')} extra=${extra.map(({ manifest }) => manifest.packId).join(',')}`);
  }
  return ordered.map((pack, day) => ({
    ...pack,
    publishAt: jst(addDays('2026-10-23', day), '20:00'),
  }));
}

function buildSchedule(state: any) {
  if (scope === 'civil') return buildCivilSchedule(state);
  if (scope === 'concrete') return buildConcreteSchedule();
  throw new Error(`未知の --scope: ${scope}（civil|concrete）`);
}

function cta(manifest: Manifest) {
  const { kind, targetId, targetPath } = manifest.primaryCta;
  let label: string;
  let target: string;
  if (kind === 'note-magazine' && targetId) {
    const item = (NOTE_MAGAZINES as Record<string, any>)[targetId];
    if (!item?.published) throw new Error(`${manifest.packId}: 未公開の note CTA ${targetId}`);
    label = '教材・完成答案で深掘りする';
    target = item.landingUrl || item.noteUrl;
  } else if (kind === 'coconala-service' && targetId) {
    const item = (COCONALA_SERVICES as Record<string, any>)[targetId];
    if (item?.status !== 'listed') throw new Error(`${manifest.packId}: 非公開のココナラ CTA ${targetId}`);
    label = '経験記述の診断・添削を申し込む';
    target = item.serviceUrl;
  } else if (kind === 'brain-product' && targetId) {
    const item = BRAIN_PRODUCTS.find((candidate) => candidate.id === targetId);
    if (item?.status !== 'listed') throw new Error(`${manifest.packId}: 非公開の Brain CTA ${targetId}`);
    label = '経験記述の設計キットを見る';
    target = item.productUrl;
  } else if (kind === 'site-article' && targetPath) {
    label = 'サイトの詳しい解説を読む';
    target = new URL(targetPath, 'https://doboku-note.com').toString();
  } else if (kind === 'links-hub') {
    label = '資格別の学習ガイド・教材一覧を見る';
    target = 'https://doboku-note.com/links';
  } else {
    throw new Error(`${manifest.packId}: CTA を解決できません ${kind}/${targetId ?? targetPath ?? ''}`);
  }
  const url = new URL(target);
  url.searchParams.set('utm_source', 'youtube');
  url.searchParams.set('utm_medium', 'video');
  url.searchParams.set('utm_campaign', manifest.packId);
  url.searchParams.set('utm_content', 'longform');
  return { label, url: url.toString() };
}

function sha256(path: string) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function assertMedia(packId: string) {
  const dir = join(renderRoot, packId);
  const video = join(dir, 'video.mp4');
  const thumbnail = join(dir, 'img/00-cover.png');
  const renderManifest = join(dir, 'render-manifest.json');
  for (const path of [video, thumbnail, renderManifest]) {
    if (!existsSync(path) || statSync(path).size === 0) throw new Error(`${packId}: レンダー実体がありません ${path}`);
  }
  const rendered = readJson(renderManifest);
  if (!rendered.tts || rendered.mp4 !== 'video.mp4' || rendered.totalSec < 60 || rendered.totalSec > 1200) {
    throw new Error(`${packId}: render-manifest が公開条件を満たしません`);
  }
  const probe = JSON.parse(execFileSync('ffprobe', [
    '-v', 'error', '-show_entries', 'stream=codec_type,width,height', '-of', 'json', video,
  ], { encoding: 'utf8' }));
  const streams = probe.streams ?? [];
  if (!streams.some((s: any) => s.codec_type === 'audio')) throw new Error(`${packId}: 音声ストリームがありません`);
  if (!streams.some((s: any) => s.codec_type === 'video' && s.width === 1920 && s.height === 1080)) {
    throw new Error(`${packId}: 1920x1080動画ではありません`);
  }
  return { video, thumbnail, rendered };
}

function examMeta(exam: TargetExam) {
  if (exam === 'civil-construction-1') {
    return { label: '1級土木', tags: ['1級土木施工管理技士', '1級土木'], hashtags: '#1級土木 #土木施工管理技士 #試験対策' };
  }
  if (exam === 'civil-construction-2') {
    return { label: '2級土木', tags: ['2級土木施工管理技士', '2級土木'], hashtags: '#2級土木 #土木施工管理技士 #試験対策' };
  }
  if (exam === 'concrete-engineer') {
    return { label: 'コンクリート技士', tags: ['コンクリート技士', 'コンクリート'], hashtags: '#コンクリート技士 #コンクリート #試験対策' };
  }
  return { label: 'コンクリート主任技士', tags: ['コンクリート主任技士', 'コンクリート'], hashtags: '#コンクリート主任技士 #コンクリート #試験対策' };
}

function makeYoutube(manifest: Manifest, publishAt: string, existing: any) {
  const artifact = assertMedia(manifest.packId);
  const exam = examMeta(manifest.exam);
  const link = cta(manifest);
  const title = `【${exam.label}】${manifest.title}`;
  if (title.length > 100) throw new Error(`${manifest.packId}: YouTube title が100字超`);
  const description = [
    `${manifest.audience}向けに、「${manifest.title}」を解説します。`,
    '',
    `この動画で分かること：${manifest.promise}`, '',
    `▼ ${link.label}`, link.url, '',
    '※制度・日程は変更される場合があります。受検年度の公式情報も確認してください。', '',
    exam.hashtags,
  ].join('\n');
  const intentTags: Record<string, string[]> = {
    'exam-point': ['試験対策', '頻出論点'], howto: ['勉強法', '答案の書き方'],
    diagnosis: ['施工経験記述', '答案診断'], roadmap: ['勉強計画', '受検対策'], career: ['施工管理', 'キャリア'],
  };
  return {
    schemaVersion: 1,
    channel: CHANNEL,
    longform: {
      key: 'longform', title, description,
      tags: [...exam.tags, ...(intentTags[manifest.intent] ?? ['試験対策']), 'doboku-note'],
      categoryId: '27', publishAt,
      r2Key: `video/render/${manifest.packId}/video.mp4`,
      thumbnailR2Key: `video/render/${manifest.packId}/img/00-cover.png`,
      sha256: sha256(artifact.video), thumbnailSha256: sha256(artifact.thumbnail),
    },
    shorts: Array.isArray(existing?.shorts) ? existing.shorts : [],
  };
}

function main() {
  const modes = [flag('--schedule'), flag('--metadata'), flag('--report')].filter(Boolean).length;
  if (modes !== 1) throw new Error('Usage: npx tsx scripts/prepare-youtube-longforms.mts --schedule|--metadata|--report [--scope civil|concrete] [--render-root PATH]');
  const state = readJson(STATE_PATH);
  const schedule = buildSchedule(state);
  const targets = onlyPackId ? schedule.filter(({ manifest }) => manifest.packId === onlyPackId) : schedule;
  if (onlyPackId && targets.length !== 1) throw new Error(`対象 packId が予約にありません: ${onlyPackId}`);

  if (flag('--report')) {
    console.log('publishAt\texam\tpackId\ttitle');
    for (const item of targets) console.log(`${item.publishAt}\t${item.manifest.exam}\t${item.manifest.packId}\t${item.manifest.title}`);
    return;
  }

  const now = new Date().toISOString();
  for (const item of targets) {
    const { packId } = item.manifest;
    const derivative = state.packs?.[packId]?.derivatives?.longform;
    if (!derivative?.qa || derivative.qa.avg < 2 || derivative.qa.blocks !== 0) {
      throw new Error(`${packId}: QA PASS がありません`);
    }
    state.packs[packId] ??= { derivatives: {} };
    if (flag('--schedule')) {
      state.packs[packId].derivatives.longform = {
        ...derivative, status: 'approved', approvedBy: 'user', approvedAt: now, publishAt: item.publishAt,
      };
    } else {
      const youtubePath = join(item.dir, 'youtube.json');
      const existing = existsSync(youtubePath) ? readJson(youtubePath) : null;
      writeJson(youtubePath, makeYoutube(item.manifest, item.publishAt, existing));
      state.packs[packId].derivatives.longform = {
        ...derivative, status: 'rendered', approvedBy: 'user', renderedAt: now, publishAt: item.publishAt,
      };
    }
  }
  writeJson(STATE_PATH, state);
  console.log(`${flag('--schedule') ? 'approved' : 'rendered'}: ${targets.length}本`);
  if (scope === 'civil') {
    console.log('1級: 2026-09-08〜2026-10-03 / 65本（既公開1本と合計66本）');
    console.log('2級: 2026-10-05〜2026-10-22 / 18本');
  } else {
    console.log('コンクリート技士・主任技士: 2026-10-23〜2026-11-19 / 28本（毎日20:00 JST）');
  }
}

main();
