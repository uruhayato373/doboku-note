#!/usr/bin/env node
/**
 * registry.mjs — コンテンツ台帳（content/registry）の CLI。設計は .claude/knowledge/reference/content-registry.md。
 *
 *   npm run registry -- list [--channel youtube] [--exam civil-construction-2] [--status scheduled]
 *   npm run registry -- show <公開 ID・作品 ID・素材 ID>
 *   npm run registry -- index                      # .tmp/content-registry/index.json（作品・公開・素材・題名・段階を結んだ生成物）
 *   npm run registry -- import-video-pack --pack-dir content/sns/video-packs/{exam}/{packId} [--commit]
 *   npm run registry -- import-video-packs [--commit]   # 全動画パック。2 回目は書く行 0。公開中の一覧（own-videos）と件数を突き合わせる
 *
 * 書き込み（import）は既定で dry-run。状態を進める approve・stop などは P2・P3 で足す（content-registry.md）。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { loadRegistry, loadRegistryConfig, publicationStage, resolveCopy } from './lib/content-registry.mjs';
import { upsertPublications, upsertWorks } from './lib/content-registry-write.mjs';
import { VIDEO_STATE_PATH, applyVideoRows, planVideoRows, videoPackRows } from './lib/registry-video-state.mjs';
import { discoverVideoPacks } from './lib/content-registry-check.mjs';
import { readLatest } from './lib/dataset-io.mjs';
import { readJsonIf } from './lib/json-io.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    channel: { type: 'string' }, exam: { type: 'string' }, status: { type: 'string' },
    'pack-dir': { type: 'string' }, commit: { type: 'boolean' },
  },
});
const [command, target] = positionals;

function list() {
  const reg = loadRegistry(ROOT);
  const rows = reg.publications.filter((p) => (!args.channel || p.channel === args.channel) && (!args.exam || p.exam === args.exam) && (!args.status || p.status === args.status));
  for (const p of rows) console.log([p.id, p.status, p.publishAt ?? '-', p.platform?.id ?? '-'].join('\t'));
  console.log(`公開 ${rows.length} 件（台帳全体: 作品 ${reg.works.length}・公開 ${reg.publications.length}・素材 ${reg.media.length}）`);
}

function show() {
  if (!target) throw new Error('show には ID が要る');
  const reg = loadRegistry(ROOT);
  const hit = reg.publications.find((p) => p.id === target) ?? reg.works.find((w) => w.id === target) ?? reg.media.find((m) => m.id === target);
  if (!hit) { console.error(`台帳に無い: ${target}`); process.exit(1); }
  console.log(JSON.stringify(hit, null, 2));
  if (hit.status) console.log(`段階: ${publicationStage(hit.status)}`);
}

function index() {
  const reg = loadRegistry(ROOT);
  const titleOf = (p) => resolveCopy(ROOT, p.copy)?.title ?? null;
  const out = {
    generatedAt: new Date().toISOString(),
    works: reg.works.map((w) => ({
      id: w.id, exam: w.exam, kind: w.kind, format: w.format ?? null, definition: w.definition,
      publications: reg.publications.filter((p) => p.work === w.id).map((p) => ({
        id: p.id, channel: p.channel, format: p.format, variant: p.variant ?? null, status: p.status, stage: publicationStage(p.status),
        publishAt: p.publishAt ?? null, platformId: p.platform?.id ?? null, title: titleOf(p), media: p.media ?? {},
      })),
    })),
    media: reg.media.map((m) => ({ id: m.id, role: m.role, type: m.type, sha256: m.sha256, path: m.store.path, provenance: m.provenance.kind })),
  };
  const outPath = join(ROOT, '.tmp/content-registry/index.json');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
  console.log(`索引: 作品 ${out.works.length}・素材 ${out.media.length} → ${relative(ROOT, outPath)}`);
}

function importVideoPack() {
  if (!args['pack-dir']) throw new Error('--pack-dir が要る');
  const packDir = relative(ROOT, resolve(ROOT, args['pack-dir'])).split('\\').join('/');
  const cfg = loadRegistryConfig(ROOT);
  const state = readJsonIf(ROOT, VIDEO_STATE_PATH);
  const { exam, work, publications } = videoPackRows(ROOT, packDir, { state, rules: cfg.idRules });
  console.log(JSON.stringify({ exam, work, publications }, null, 2));
  if (!args.commit) { console.log('dry-run（台帳へは書いていない）。書くときは --commit'); return; }
  upsertWorks(ROOT, exam, [work]);
  upsertPublications(ROOT, 'youtube', exam, publications);
  console.log(`書いた: 作品 1・公開 ${publications.length}（${exam}）`);
}

const LEGACY_EVIDENCE = { kind: 'legacy-ledger', ref: 'video-content-status.json' };

async function importVideoPacks() {
  const state = readJsonIf(ROOT, VIDEO_STATE_PATH);
  const packIds = [...discoverVideoPacks(ROOT).keys()].sort();
  const plan = await planVideoRows(ROOT, state, { packIds, evidence: LEGACY_EVIDENCE });
  const c = plan.counts;
  console.log(`動画パック ${c.packs} 本を実検査 / 書く行: 作品 ${c.works}・公開 ${c.publications}（変わらない公開 ${c.unchangedPublications}）`);
  for (const [exam, rows] of plan.publications) console.log(`  ${exam}: 公開 ${rows.length}`);
  if (args.commit) {
    await applyVideoRows(ROOT, plan);
    console.log('書いた。もう一度流すと書く行は 0 になる');
  } else console.log('dry-run（台帳へは書いていない）。書くときは --commit');
  report(plan);
}

/** 取り込んだ後の YouTube の公開の状態の内訳と、公開中の一覧（own-videos・yt-dlp）との突き合わせ */
function report(plan) {
  const after = new Map(loadRegistry(ROOT).publications.filter((p) => p.channel === 'youtube').map((p) => [p.id, p]));
  for (const p of [...plan.publications.values()].flat()) after.set(p.id, p);
  const rows = [...after.values()];
  const tally = (list) => Object.entries(list.reduce((m, p) => ({ ...m, [`${p.format}:${p.status}`]: (m[`${p.format}:${p.status}`] ?? 0) + 1 }), {})).sort();
  console.log(`取り込み後の状態: ${tally(rows).map(([k, n]) => `${k} ${n}`).join(' / ')}`);
  let own;
  own = readLatest(ROOT, 'youtube.own-videos')?.data ?? null;
  if (!own) { console.log('公開中の一覧（youtube.own-videos）が無いので突き合わせていない'); return; }
  const publicIds = new Set(own.videos.map((v) => v.id));
  const matched = rows.filter((p) => publicIds.has(p.platform?.id));
  const ours = new Set(rows.map((p) => p.platform?.id).filter(Boolean));
  const outside = own.videos.filter((v) => !ours.has(v.id)).length;
  console.log(`公開中の一覧（${own.fetchedAt}・${own.videos.length} 本）のうち台帳にあるもの ${matched.length} 本: ${tally(matched).map(([k, n]) => `${k} ${n}`).join(' / ')}。台帳に無いもの ${outside} 本（動画パック以前の旧動画は P4）`);
  const behind = matched.filter((p) => p.status !== 'published').length;
  if (behind) console.log(`→ 公開中なのに published でないもの ${behind} 本は、照合（registry-reconcile）が証拠つきで進める`);
}

const commands = { list, show, index, 'import-video-pack': importVideoPack, 'import-video-packs': importVideoPacks };
if (!commands[command]) {
  console.error('Usage: npm run registry -- list|show|index|import-video-pack|import-video-packs …');
  process.exit(2);
}
await commands[command]();
