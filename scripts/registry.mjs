#!/usr/bin/env node
/**
 * registry.mjs — コンテンツ台帳（content/registry）の CLI。設計は .claude/knowledge/reference/content-registry.md。
 *
 *   npm run registry -- list [--channel youtube] [--exam civil-construction-2] [--status scheduled]
 *   npm run registry -- show <公開 ID・作品 ID・素材 ID>
 *   npm run registry -- index                      # .tmp/content-registry/index.json（作品・公開・素材・題名・段階を結んだ生成物）
 *   npm run registry -- import-video-pack --pack-dir content/sns/video-packs/{exam}/{packId} [--commit]
 *   npm run registry -- import-video-packs [--commit]   # 全動画パック。2 回目は書く行 0。公開中の一覧（own-videos）と件数を突き合わせる
 *   npm run registry -- import-legacy-youtube [--commit]  # 動画パック以前の旧 Shorts（youtube-schedule.json の 200・作り直した 10）。表紙は ID の置き場へ移す
 *   npm run registry -- import-instagram [--commit]      # IG の作品フォルダ全部（照合の記録 snapshot.json の live.list が要る・手元で verify-ig-status）
 *   npm run registry -- approve --pub <公開 ID> --stage visual|final --expect <digest>   # 運営者だけ（管理画面の確認画面からコピーする）
 *   npm run registry -- stop --pub <公開 ID> --reason user-decision|superseded|gone|unverified-legacy
 *
 * 取り込み（import）は既定で dry-run。approve は --expect（画面で見た版の digest）が今の中身と一致したときだけ書く。
 * approve・stop は運営者の判断なので、エージェント（Claude Code の Bash＝環境変数 CLAUDECODE=1）からは実行できない。
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
import { approvalState } from './lib/media-review.mjs';
import { projectVideoState, writeVideoState } from './lib/registry-video-state.mjs';
import { canTransition, requiresApproval } from './lib/content-registry.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    channel: { type: 'string' }, exam: { type: 'string' }, status: { type: 'string' },
    'pack-dir': { type: 'string' }, commit: { type: 'boolean' },
    pub: { type: 'string' }, stage: { type: 'string' }, expect: { type: 'string' }, reason: { type: 'string' },
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

// ---- 承認・停止（運営者だけ） ------------------------------------------------------------------------

function operatorOnly(what) {
  if (process.env.CLAUDECODE === '1') {
    throw new Error(`${what} は運営者の判断なので、エージェントからは実行しない。管理画面の確認画面のコマンドを、運営者が自分の端末で実行する`);
  }
}

/** 公開の行を 1 件書き換え、YouTube なら今の台帳（写し）も作り直す */
function writePublication(pub, patch) {
  const row = Object.fromEntries(Object.entries({ ...pub, ...patch }).filter(([k, v]) => !['file', 'exam', 'channel'].includes(k) && v !== undefined));
  upsertPublications(ROOT, pub.channel, pub.exam, [row]);
  if (pub.channel === 'youtube') writeVideoState(ROOT, projectVideoState(readJsonIf(ROOT, VIDEO_STATE_PATH), loadRegistry(ROOT)));
  return row;
}

function approve() {
  operatorOnly('承認');
  if (!args.pub || !['visual', 'final'].includes(args.stage) || !/^[0-9a-f]{64}$/.test(args.expect ?? '')) {
    throw new Error('approve には --pub <公開 ID> --stage visual|final --expect <digest（管理画面の確認画面に出る 64 桁）> が要る');
  }
  const cfg = loadRegistryConfig(ROOT);
  const reg = loadRegistry(ROOT);
  const pub = reg.publications.find((p) => p.id === args.pub);
  if (!pub) throw new Error(`台帳に無い: ${args.pub}`);
  const mediaById = new Map(reg.media.map((m) => [m.id, m]));
  const state = approvalState(ROOT, pub, mediaById);
  const at = new Date().toISOString();
  if (args.stage === 'visual') {
    if (!state.visual.current) throw new Error('画面確認の素材（表紙・締め・コンタクトシート・プレビュー）が台帳に無い。先に npm run media -- preview');
    if (state.visual.current !== args.expect) throw new Error(`見た版と今の画面の素材が違う（今の digest ${state.visual.current}）。確認画面を開き直してから承認する`);
    writePublication(pub, { review: { ...(pub.review ?? {}), visual: { status: 'approved', by: 'user', at, digest: args.expect } } });
    console.log(`画面確認を承認した: ${pub.id}（digest ${args.expect.slice(0, 12)}…）`);
    return;
  }
  if (state.final.current !== args.expect) throw new Error(`見た版と今の中身（文面・素材・予定）が違う（今の digest ${state.final.current}）。確認画面を開き直してから承認する`);
  if (pub.channel === 'youtube' && pub.media && Object.keys(pub.media).length && !state.visual.valid) {
    throw new Error(`画面確認（音声なし）の承認が先（${state.visual.reason}）`);
  }
  const aiBlocked = Object.values(pub.media ?? {}).map((id) => mediaById.get(id)).filter((m) => m?.provenance?.kind === 'ai-generated');
  if (aiBlocked.length) {
    const ledger = readJsonIf(ROOT, '.claude/state/quality/ai-image-review-ledger.json');
    const bad = aiBlocked.filter((m) => { const r = ledger?.figures?.[`media:${m.id}`]; return !(r?.verdict === 'ok' && String(m.sha256).startsWith(r.sha ?? '-')); });
    if (bad.length) throw new Error(`AI 生成の素材に今の画像の判定 ok が無い: ${bad.map((m) => m.id).join(', ')}`);
  }
  const next = pub.status === 'qa_passed' ? 'approved' : pub.status;
  if (next !== pub.status && !canTransition(cfg, pub.status, next, pub.channel)) throw new Error(`${pub.status} → ${next} は遷移に無い`);
  if (!requiresApproval(cfg, next) && next === pub.status && !['approved', 'rendered'].includes(next)) {
    throw new Error(`今の状態（${pub.status}）は最終承認の対象ではない（qa_passed・approved・rendered だけ）`);
  }
  writePublication(pub, { status: next, approval: { by: 'user', at, contentSha256: args.expect } });
  console.log(`最終承認した: ${pub.id}（${pub.status} → ${next}・digest ${args.expect.slice(0, 12)}…）。中身が変わると承認は無効になり、stage と公開が止まる`);
}

function stop() {
  operatorOnly('停止');
  const cfg = loadRegistryConfig(ROOT);
  if (!args.pub || !cfg.status.stopReasons.includes(args.reason)) throw new Error(`stop には --pub <公開 ID> --reason ${cfg.status.stopReasons.join('|')} が要る`);
  const pub = loadRegistry(ROOT).publications.find((p) => p.id === args.pub);
  if (!pub) throw new Error(`台帳に無い: ${args.pub}`);
  if (!canTransition(cfg, pub.status, 'stopped', pub.channel)) throw new Error(`${pub.status} → stopped は遷移に無い`);
  writePublication(pub, { status: 'stopped', stopReason: args.reason });
  console.log(`止めた: ${pub.id}（${pub.status} → stopped・${args.reason}）`);
}

async function importLegacyYoutube() {
  const { LEGACY_EXAM, legacyYoutubeRows } = await import('./lib/registry-legacy-youtube.mjs');
  const { readFileSync, existsSync } = await import('node:fs');
  const cfg = loadRegistryConfig(ROOT);
  const latest = readLatest(ROOT, 'youtube.own-videos');
  if (!latest) throw new Error('公開中の一覧（youtube.own-videos）が無い。公開の証拠が無いので取り込めない');
  const rows = legacyYoutubeRows(ROOT, { own: latest.data, ownRef: latest.file, rules: cfg.idRules });
  const reg = loadRegistry(ROOT);
  const strip = (r) => Object.fromEntries(Object.entries(r).filter(([k]) => !['file', 'exam', 'channel'].includes(k)));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const changedWorks = rows.works.filter((w) => { const cur = reg.works.find((x) => x.id === w.id); return !cur || !same(strip(cur), w); });
  // 台帳の素材の参照（表紙）は残す: 既存の行の media を引き継ぐ
  const pubs = rows.publications.map((p) => { const cur = reg.publications.find((x) => x.id === p.id); return cur?.media ? { ...p, media: cur.media } : p; });
  const changedPubs = pubs.filter((p) => { const cur = reg.publications.find((x) => x.id === p.id); return !cur || !same(strip(cur), p); });
  const r = rows.report;
  console.log(`旧 Shorts ${r.schedule} 件＋作り直したキーワード ${r.keyword} 件 → 作品 ${rows.works.length}・公開 ${rows.publications.length}（published ${r.published}＝外部 ID ${r.byIdMatch}・題名の完全一致 ${r.byTitleMatch} / stopped(gone) ${r.stoppedGone} / stopped(user-decision) ${r.stoppedRetired}）`);
  const postedPath = 'data/youtube/posted.jsonl'; // path-literal-ok: 凍結した旧台帳（台帳 id youtube.posted）を件数の突き合わせに読む
  if (existsSync(join(ROOT, postedPath))) {
    const posted = readFileSync(join(ROOT, postedPath), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    const ids = new Set(rows.publications.map((p) => p.platform?.id).filter(Boolean));
    console.log(`  posted.jsonl ${posted.length} 件のうち台帳の外部 ID と一致 ${posted.filter((p) => ids.has(p.videoId)).length} 件`);
  }
  console.log(`  書く行: 作品 ${changedWorks.length}・公開 ${changedPubs.length} / 移す表紙 ${rows.covers.length} 件`);
  if (!args.commit) { console.log('dry-run（台帳へは書いていない）。書くときは --commit'); return; }
  if (changedWorks.length) upsertWorks(ROOT, LEGACY_EXAM, changedWorks);
  if (changedPubs.length) upsertPublications(ROOT, 'youtube', LEGACY_EXAM, changedPubs);
  console.log('書いた。表紙は npm run media -- adopt-legacy-covers --commit で ID の置き場へ移す');
}

async function importInstagram() {
  const { instagramRows } = await import('./lib/registry-ig-state.mjs');
  const cfg = loadRegistryConfig(ROOT);
  const reg = loadRegistry(ROOT);
  const snapshot = readJsonIf(ROOT, '.claude/state/ig-reconcile/snapshot.json');
  const rows = instagramRows(ROOT, { snapshot, videoPackIds: new Set(discoverVideoPacks(ROOT).keys()), rules: cfg.idRules, regWorks: reg.works });
  const strip = (r) => Object.fromEntries(Object.entries(r).filter(([k, v]) => !['file', 'exam', 'channel'].includes(k) && v !== undefined));
  const same = (a, b) => JSON.stringify(strip(a)) === JSON.stringify(strip(b));
  const worksByExam = new Map();
  for (const { exam, row } of rows.works) {
    const cur = reg.works.find((w) => w.id === row.id && w.exam === exam);
    if (!cur || !same(cur, row)) worksByExam.set(exam, [...(worksByExam.get(exam) ?? []), row]);
  }
  const pubsByExam = new Map();
  for (const p of rows.publications) {
    const exam = p.id.split('/')[0];
    const cur = reg.publications.find((x) => x.id === p.id);
    const merged = cur?.media ? { ...p, media: cur.media } : p;
    if (!cur || !same(cur, merged)) pubsByExam.set(exam, [...(pubsByExam.get(exam) ?? []), merged]);
  }
  const n = (m) => [...m.values()].flat().length;
  console.log(`IG の作品フォルダ ${rows.report.folders} 個（対象外 ${rows.report.skipped.length}）/ 照合の記録 ${snapshot?.at}（公開中 ${snapshot?.live?.posts} 件）`);
  console.log(`  状態: ${Object.entries(rows.report.byStatus).sort().map(([k, v]) => `${k} ${v}`).join(' / ')}`);
  console.log(`  書く行: 作品 ${n(worksByExam)}・公開 ${n(pubsByExam)}`);
  if (!args.commit) { console.log('dry-run（台帳へは書いていない）。書くときは --commit'); return; }
  for (const [exam, ws] of worksByExam) upsertWorks(ROOT, exam, ws);
  for (const [exam, ps] of pubsByExam) upsertPublications(ROOT, 'instagram', exam, ps);
  console.log('書いた。stopped(unverified-legacy) は管理画面 /content/items の「要確認」で見られる');
}

const commands = { list, show, index, 'import-video-pack': importVideoPack, 'import-video-packs': importVideoPacks, 'import-legacy-youtube': importLegacyYoutube, 'import-instagram': importInstagram, approve, stop };
if (!commands[command]) {
  console.error('Usage: npm run registry -- list|show|index|import-video-pack|import-video-packs|import-legacy-youtube|import-instagram|approve|stop …');
  process.exit(2);
}
await commands[command]();
