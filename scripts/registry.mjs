#!/usr/bin/env node
/**
 * registry.mjs — コンテンツ台帳（content/registry）の CLI。設計は .claude/knowledge/reference/content-registry.md。
 *
 *   npm run registry -- list [--channel youtube] [--exam civil-construction-2] [--status scheduled]
 *   npm run registry -- show <公開 ID・作品 ID・素材 ID>
 *   npm run registry -- index                      # .tmp/content-registry/index.json（作品・公開・素材・題名・段階を結んだ生成物）
 *   npm run registry -- import-video-pack --pack-dir content/sns/video-packs/{exam}/{packId} [--commit]
 *   npm run registry -- import-video-packs [--commit]   # 全動画パック。2 回目は書く行 0。公開中の一覧（own-videos）と件数を突き合わせる
 *   npm run registry -- prepare-youtube --pub <公開 ID> --publish-at <日時> [--commit] # 通常動画の文面・予定を登録（承認はしない）
 *   npm run registry -- mark-rendered --pub <公開 ID> [--commit] # 承認済み通常動画の完成レンダーを実検査して状態を進める
 *   npm run registry -- import-instagram [--folder <相対フォルダ>] [--commit] # IG の作品（folder なしは全件）。照合 snapshot が要る
 *   npm run registry -- prepare-instagram-pinned --pub <公開ID> --publish-at <ISO+09:00> [--commit]
 *   npm run registry -- mark-instagram-rendered --pub <公開ID> [--commit]
 *   npm run registry -- import-x [--commit]              # X の下書きフォルダ全部（自分の投稿の一覧 data/x/own-posts と本文で照合）
 *   npm run registry -- prepare-youtube-revision --pub <元の公開ID> --variant <新版名> [--copy <同作品内のJSON#fragment>] [--refresh-draft] [--related-to <新版通常動画ID>] [--publish-at <日時>] [--commit --expect <digest>]
 *   npm run registry -- record-youtube-revision-qa --pub <改訂公開ID> --avg <0〜3> --blocks <件数> [--commit]
 *   npm run registry -- publish-youtube-revision --pub <改訂公開ID> --phase upload|schedule|verify [--commit --expect <digest>] # 既定はローカル検査のみ
 *   npm run registry -- stage-youtube-revision --pub <改訂公開ID> [--commit --expect <digest>] # CIへの一時転送用private R2
 *   npm run registry -- publish-youtube --pub <初回通常動画ID> --phase upload|schedule|verify [--commit --expect <digest>] # R2 intent と API 実査
 *   npm run registry -- approve --pub <公開 ID> --stage visual|final --expect <digest>   # 運営者だけ（管理画面の確認画面からコピーする）
 *   npm run registry -- stop --pub <公開 ID> --reason user-decision|superseded|gone|unverified-legacy
 *   npm run registry -- unschedule --pub <公開 ID> --reason <理由>   # 予約を外す（scheduled → uploaded_private・後で予約し直せる）
 *
 * 取り込み（import）は既定で dry-run。approve は --expect（画面で見た版の digest）が今の中身と一致したときだけ書く。
 * approve・stop は運営者の判断なので、エージェント（Claude Code の Bash＝環境変数 CLAUDECODE=1）からは実行できない。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { execFileSync } from 'node:child_process';
import { loadRegistry, loadRegistryConfig, publicationStage, resolveCopy } from './lib/content-registry.mjs';
import { upsertPublications, upsertWorks } from './lib/content-registry-write.mjs';
import { applyVideoRows, loadVideoState, planVideoRows, videoPackRows } from './lib/registry-video-state.mjs';
import { discoverVideoPacks } from './lib/content-registry-check.mjs';
import { readLatest } from './lib/dataset-io.mjs';
import { readJsonIf } from './lib/json-io.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { approvalState } from './lib/media-review.mjs';
import { canTransition, requiresApproval } from './lib/content-registry.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    channel: { type: 'string' }, exam: { type: 'string' }, status: { type: 'string' },
    'pack-dir': { type: 'string' }, folder: { type: 'string' }, commit: { type: 'boolean' },
    pub: { type: 'string' }, stage: { type: 'string' }, expect: { type: 'string' }, reason: { type: 'string' },
    variant: { type: 'string' }, 'related-to': { type: 'string' }, 'publish-at': { type: 'string' },
    phase: { type: 'string' }, copy: { type: 'string' }, 'refresh-draft': { type: 'boolean' },
    avg: { type: 'string' }, blocks: { type: 'string' },
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
  const state = loadVideoState(ROOT);
  const { exam, work, publications } = videoPackRows(ROOT, packDir, { state, rules: cfg.idRules, reg: loadRegistry(ROOT) });
  console.log(JSON.stringify({ exam, work, publications }, null, 2));
  if (!args.commit) { console.log('dry-run（台帳へは書いていない）。書くときは --commit'); return; }
  upsertWorks(ROOT, exam, [work]);
  upsertPublications(ROOT, 'youtube', exam, publications);
  console.log(`書いた: 作品 1・公開 ${publications.length}（${exam}）`);
}

function prepareYoutube() {
  if (!args.pub || !args['publish-at']) throw new Error('prepare-youtube には --pub と --publish-at が要る');
  const reg = loadRegistry(ROOT);
  const pub = reg.publications.find((p) => p.id === args.pub);
  if (!pub || pub.channel !== 'youtube' || pub.format !== 'longform') throw new Error(`通常動画の公開行がない: ${args.pub}`);
  if (!['draft', 'qa_passed'].includes(pub.status) || pub.approval) throw new Error(`${pub.id}: 承認後の文面・予定は変更できない`);
  const work = reg.works.find((w) => w.id === pub.work && w.exam === pub.exam);
  if (!work?.definition) throw new Error(`${pub.id}: 作品の定義がない`);
  const copy = `${work.definition}/youtube.json#longform`;
  const metadata = resolveCopy(ROOT, copy);
  const release = readJsonIf(ROOT, `${work.definition}/youtube.json`)?.longform;
  if (!metadata?.title || !metadata?.description || !Array.isArray(metadata.tags)) throw new Error(`${pub.id}: youtube.json の文面が不完全`);
  const mediaById = new Map(reg.media.map((m) => [m.id, m]));
  if (release?.sha256 !== mediaById.get(pub.media?.video)?.sha256 || release?.thumbnailSha256 !== mediaById.get(pub.media?.cover)?.sha256) {
    throw new Error(`${pub.id}: youtube.json の動画・表紙SHAが台帳と違う`);
  }
  const requested = new Date(args['publish-at']);
  if (!Number.isFinite(requested.getTime()) || requested.getTime() <= Date.now() + 5 * 60_000) throw new Error('公開日時は5分以上先にする');
  if (!release?.publishAt || new Date(release.publishAt).getTime() !== requested.getTime()) throw new Error('youtube.json と指定した公開日時が違う');
  console.log(`${pub.id}: ${metadata.title} / ${args['publish-at']} / ${copy}`);
  if (!args.commit) { console.log('dry-run（台帳へは書いていない）。書くときは --commit'); return; }
  writePublication(pub, { copy, publishAt: args['publish-at'] });
  console.log('文面と公開予定を登録した。承認状態は変更していない');
}

const LEGACY_EVIDENCE = { kind: 'legacy-ledger', ref: 'import-video-packs' };

async function importVideoPacks() {
  const state = loadVideoState(ROOT);
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

/** 公開の行を 1 件書き換える */
function writePublication(pub, patch) {
  const row = Object.fromEntries(Object.entries({ ...pub, ...patch }).filter(([k, v]) => !['file', 'exam', 'channel'].includes(k) && v !== undefined));
  upsertPublications(ROOT, pub.channel, pub.exam, [row]);
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
    const ledger = readJsonIf(ROOT, datasetPath('state.ai-image-review-ledger'));
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

function markRendered() {
  if (!args.pub) throw new Error('mark-rendered には --pub <公開 ID> が要る');
  const cfg = loadRegistryConfig(ROOT);
  const reg = loadRegistry(ROOT);
  const pub = reg.publications.find((p) => p.id === args.pub);
  if (!pub || pub.channel !== 'youtube' || pub.format !== 'longform' || pub.revisionOf) throw new Error('元の通常動画の公開行がない');
  if (pub.status !== 'approved' || !canTransition(cfg, pub.status, 'rendered', pub.channel)) throw new Error(`${pub.id}: approved → rendered の対象ではない`);
  const mediaById = new Map(reg.media.map((m) => [m.id, m]));
  const approval = approvalState(ROOT, pub, mediaById);
  if (!approval.visual.valid || !approval.final.valid || pub.approval?.by !== 'user' || pub.approval.grandfathered) throw new Error('今の画面・文面・素材の承認が必要');
  execFileSync(process.execPath, [join(ROOT, 'scripts/media.mjs'), 'verify-render', '--work', `${pub.exam}/${pub.work}`], { cwd: ROOT, stdio: 'inherit' });
  if (!args.commit) { console.log('dry-run（台帳へは書いていない）。書くときは --commit'); return; }
  writePublication(pub, { status: 'rendered', times: { ...pub.times, rendered: new Date().toISOString() } });
  console.log(`完成レンダーを検査して状態を進めた: ${pub.id}（approved → rendered）`);
}

function stop() {
  operatorOnly('停止');
  const cfg = loadRegistryConfig(ROOT);
  if (!args.pub || !cfg.status.stopReasons.includes(args.reason)) throw new Error(`stop には --pub <公開 ID> --reason ${cfg.status.stopReasons.join('|')} が要る`);
  const pub = loadRegistry(ROOT).publications.find((p) => p.id === args.pub);
  if (!pub) throw new Error(`台帳に無い: ${args.pub}`);
  const sameGone = pub.status === 'stopped' && pub.stopReason === 'gone' && args.reason === 'gone';
  if (!sameGone && !canTransition(cfg, pub.status, 'stopped', pub.channel)) throw new Error(`${pub.status} → stopped は遷移に無い`);
  writePublication(pub, {
    status: 'stopped', stopReason: args.reason,
    ...(args.reason === 'gone' && pub.platform ? { platform: { ...pub.platform, privacy: 'gone' } } : {}),
  });
  console.log(`止めた: ${pub.id}（${pub.status} → stopped・${args.reason}）`);
}

/**
 * 予約を外す（scheduled → uploaded_private）。YouTube 側の公開予約を外したあとに台帳を合わせる（2026-10-13・運営者が YouTube の投稿を一旦止めた）。
 * stopped は戻れない終端なので、後で予約し直せる「非公開でアップロード済み」に戻す。元の予約日時は reason に残す。
 * 公開を減らす向きの操作なので運営者だけに限らないが、理由は必須。YouTube 側の実体は scripts/youtube-unschedule.mjs が先に外して確かめる。
 */
function unschedule() {
  const cfg = loadRegistryConfig(ROOT);
  if (!args.pub || !args.reason || String(args.reason).trim().length < 4) throw new Error('unschedule には --pub <公開 ID> --reason <理由> が要る');
  const pub = loadRegistry(ROOT).publications.find((p) => p.id === args.pub);
  if (!pub) throw new Error(`台帳に無い: ${args.pub}`);
  if (pub.status !== 'scheduled') throw new Error(`予約済みではない（${pub.status}）: ${pub.id}`);
  if (!canTransition(cfg, 'scheduled', 'uploaded_private', pub.channel)) throw new Error('scheduled → uploaded_private は遷移に無い');
  const reason = `${String(args.reason).trim()}（元の予約 ${pub.publishAt}）`;
  writePublication(pub, { status: 'uploaded_private', publishAt: undefined, reason });
  console.log(`予約を外した: ${pub.id}（scheduled → uploaded_private・元の予約 ${pub.publishAt}）`);
}

async function importInstagram() {
  const { instagramRows } = await import('./lib/registry-ig-state.mjs');
  const cfg = loadRegistryConfig(ROOT);
  const reg = loadRegistry(ROOT);
  const snapshot = readJsonIf(ROOT, datasetPath('state.ig-reconcile', { name: 'snapshot' }));
  const rows = instagramRows(ROOT, { snapshot, videoPackIds: new Set(discoverVideoPacks(ROOT).keys()), rules: cfg.idRules, regWorks: reg.works });
  if (args.folder) {
    const folder = args.folder.replace(/^content\/sns\/instagram\//, '').replace(/\/$/, '');
    rows.publications = rows.publications.filter((p) => p.legacyKey === folder);
    if (rows.publications.length === 0) throw new Error(`Instagram の対象フォルダが無い: ${folder}`);
    const selected = new Set(rows.publications.map((p) => `${p.id.split('/')[0]}/${p.work}`));
    rows.works = rows.works.filter(({ exam, row }) => selected.has(`${exam}/${row.id}`));
  }
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
    // import は未登録の公開だけを追加する。既存行の状態は台帳が正本なので、古い
    // posted.json・照合 snapshot で stopped(gone) や scheduled を巻き戻さない。
    if (!cur) pubsByExam.set(exam, [...(pubsByExam.get(exam) ?? []), p]);
  }
  const n = (m) => [...m.values()].flat().length;
  console.log(`IG の作品フォルダ ${args.folder ?? rows.report.folders}（対象外 ${rows.report.skipped.length}）/ 照合の記録 ${snapshot?.at}（公開中 ${snapshot?.live?.posts} 件）`);
  console.log(`  状態: ${Object.entries(rows.report.byStatus).sort().map(([k, v]) => `${k} ${v}`).join(' / ')}`);
  console.log(`  書く行: 作品 ${n(worksByExam)}・公開 ${n(pubsByExam)}`);
  if (!args.commit) { console.log('dry-run（台帳へは書いていない）。書くときは --commit'); return; }
  for (const [exam, ws] of worksByExam) upsertWorks(ROOT, exam, ws);
  for (const [exam, ps] of pubsByExam) upsertPublications(ROOT, 'instagram', exam, ps);
  console.log('書いた。stopped(unverified-legacy) は管理画面 /content/items の「要確認」で見られる');
}

/** 固定カルーセルの本文・素材・日時を照合してQA通過へ進める。承認は運営者が別に行う。 */
async function prepareInstagramPinned() {
  if (!args.pub || !args['publish-at']) throw new Error('prepare-instagram-pinned は --pub と --publish-at が要る');
  const reg = loadRegistry(ROOT);
  const pub = reg.publications.find((p) => p.id === args.pub);
  if (!pub || pub.channel !== 'instagram' || pub.format !== 'carousel' || !pub.legacyKey?.startsWith('profile-pinned/') || pub.status !== 'draft') {
    throw new Error('固定カルーセルの draft 公開行が要る');
  }
  const when = args['publish-at'];
  if (!/\+09:00$/.test(when) || !Number.isFinite(Date.parse(when)) || Date.parse(when) < Date.now() + 3 * 60 * 60_000) {
    throw new Error('投稿日時は3時間以上先のISO +09:00で指定する');
  }
  const { execFileSync } = await import('node:child_process');
  execFileSync(process.execPath, [join(ROOT, 'scripts/check-instagram-profile-funnel.mjs')], { cwd: ROOT, stdio: 'inherit' });
  const { readFileSync, existsSync } = await import('node:fs');
  const { createHash } = await import('node:crypto');
  const { readDataset } = await import('./lib/dataset-io.mjs');
  const drive = readDataset(ROOT, 'state.drive-manifest');
  const ledger = readDataset(ROOT, 'state.ai-image-review-ledger');
  const mediaById = new Map(reg.media.map((m) => [m.id, m]));
  for (const role of ['cover', 'route']) {
    const media = mediaById.get(pub.media?.[role]);
    if (!media) throw new Error(`${pub.id}: ${role} の素材台帳が無い`);
    const abs = join(ROOT, media.store.path);
    const sha = existsSync(abs) ? createHash('sha256').update(readFileSync(abs)).digest('hex') : null;
    if (sha !== media.sha256 || drive.entries?.[media.store.path]?.sha256 !== media.sha256) throw new Error(`${pub.id}: ${role} の手元・Drive・素材台帳が一致しない`);
    if (role === 'cover' && (ledger.figures?.[`media:${media.id}`]?.verdict !== 'ok' || !media.sha256.startsWith(ledger.figures?.[`media:${media.id}`]?.sha ?? '-'))) {
      throw new Error(`${pub.id}: 表紙のAI画像監査が現版でokではない`);
    }
  }
  console.log(`${pub.id}: 画像2点・文面・日時 ${when} を照合`);
  if (!args.commit) { console.log('dry-run（台帳へは書いていない）'); return; }
  writePublication(pub, { status: 'qa_passed', publishAt: when });
  console.log('QA通過に進めた。運営者が確認シートを見て final 承認する');
}

/** 運営者の最終承認後、同じ素材があることを確かめて予約可能な rendered に進める。 */
async function markInstagramRendered() {
  if (!args.pub) throw new Error('mark-instagram-rendered は --pub が要る');
  const reg = loadRegistry(ROOT);
  const pub = reg.publications.find((p) => p.id === args.pub);
  if (!pub || pub.channel !== 'instagram' || !pub.legacyKey?.startsWith('profile-pinned/') || pub.status !== 'approved') throw new Error('承認済みの固定投稿が要る');
  const mediaById = new Map(reg.media.map((m) => [m.id, m]));
  const state = approvalState(ROOT, pub, mediaById);
  if (!state.final.valid || pub.approval?.by !== 'user' || pub.approval?.grandfathered) throw new Error('現版のハッシュ付き最終承認が必要');
  console.log(`${pub.id}: 最終承認と素材SHAを照合`);
  if (!args.commit) { console.log('dry-run（台帳へは書いていない）'); return; }
  writePublication(pub, { status: 'rendered', times: { ...(pub.times ?? {}), rendered: new Date().toISOString() } });
  console.log('rendered に進めた');
}

async function importX() {
  const { xRows } = await import('./lib/registry-x-state.mjs');
  const cfg = loadRegistryConfig(ROOT);
  const reg = loadRegistry(ROOT);
  const rows = xRows(ROOT, { rules: cfg.idRules });
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
    if (!cur || !same(cur, p)) pubsByExam.set(exam, [...(pubsByExam.get(exam) ?? []), p]);
  }
  const n = (m) => [...m.values()].flat().length;
  const r = rows.report;
  console.log(`X の下書きフォルダ ${r.folders} 個 → 作品 ${rows.works.length}・公開 ${rows.publications.length}`);
  console.log(`  状態: ${Object.entries(r.byStatus).sort().map(([k, v]) => `${k} ${v}`).join(' / ')}`);
  console.log(`  published の証拠: 本文の完全一致 ${r.matchedByText}・先頭 40 字 ${r.matchedByHead}・posted_url ${r.byUrl} / ID の例外 ${r.idExceptions.length}（${r.idExceptions.join(', ')}）`);
  console.log(`  書く行: 作品 ${n(worksByExam)}・公開 ${n(pubsByExam)}`);
  if (!args.commit) { console.log('dry-run（台帳へは書いていない）。書くときは --commit'); return; }
  for (const [exam, ws] of worksByExam) upsertWorks(ROOT, exam, ws);
  for (const [exam, ps] of pubsByExam) upsertPublications(ROOT, 'x', exam, ps);
  console.log('書いた');
}

async function prepareYoutubeRevision() {
  const { prepareYoutubeRevision } = await import('./lib/registry-youtube-revision.mjs');
  const result = prepareYoutubeRevision(ROOT, {
    pubId: args.pub, variant: args.variant, relatedTo: args['related-to'], publishAt: args['publish-at'], copyRef: args.copy,
    commit: args.commit, expect: args.expect, refreshDraft: args['refresh-draft'],
  });
  console.log(JSON.stringify(result, null, 2));
}

async function recordYoutubeRevisionQa() {
  const { recordYoutubeRevisionQa } = await import('./lib/registry-youtube-revision.mjs');
  const result = recordYoutubeRevisionQa(ROOT, {
    pubId: args.pub, avg: Number(args.avg), blocks: Number(args.blocks), commit: Boolean(args.commit),
  });
  console.log(JSON.stringify(result, null, 2));
}

async function publishYoutubeRevision() {
  const { publishYoutubeRevision } = await import('./lib/youtube-revision-publisher.mjs');
  const options = { pubId: args.pub, phase: args.phase, expect: args.expect };
  if (args.commit) {
    const { hydrateRevisionPublish } = await import('./lib/youtube-single-r2.mjs');
    await hydrateRevisionPublish(ROOT, args.pub);
  }
  const preview = await publishYoutubeRevision(ROOT, options);
  if (!args.commit) { console.log(JSON.stringify(preview, null, 2)); return; }
  if (args.expect !== preview.digest || (args.phase !== 'verify' && preview.blockers.length)) throw new Error(`改訂版の実行条件が不足: ${preview.blockers.join(', ')}`);
  const required = ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN'];
  if (required.some(key => !process.env[key])) throw new Error('既存のYouTube環境変数が未設定。認証操作は行わない');
  const { google } = await import('googleapis');
  const auth = new google.auth.OAuth2(process.env.YOUTUBE_CLIENT_ID, process.env.YOUTUBE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
  const youtube = google.youtube({ version: 'v3', auth, retry: false });
  console.log(JSON.stringify(await publishYoutubeRevision(ROOT, { ...options, commit: true }, { youtube }), null, 2));
}

async function stageYoutubeRevision() {
  const { revisionPublishPlan } = await import('./lib/youtube-revision-publisher.mjs');
  const { stageRevisionAssets } = await import('./lib/youtube-single-r2.mjs');
  const plan = revisionPublishPlan(ROOT, args.pub);
  if (args.commit && args.expect !== plan.digest) throw new Error('確認した改訂入力digestと一致しない');
  if (args.commit && plan.blockers.length) throw new Error(`改訂版の転送条件が不足: ${plan.blockers.join(', ')}`);
  const result = await stageRevisionAssets(ROOT, args.pub, { commit: Boolean(args.commit) });
  console.log(JSON.stringify({ ...result, digest: plan.digest }, null, 2));
}

async function publishYoutube() {
  const { publishYoutubePublication, singlePublishPlan } = await import('./lib/youtube-revision-publisher.mjs');
  const options = { pubId: args.pub, phase: args.phase, expect: args.expect };
  if (args.commit) {
    const { hydrateSinglePublish } = await import('./lib/youtube-single-r2.mjs');
    await hydrateSinglePublish(ROOT, args.pub);
  }
  singlePublishPlan(ROOT, args.pub);
  const preview = await publishYoutubePublication(ROOT, options);
  if (!args.commit) { console.log(JSON.stringify(preview, null, 2)); return; }
  if (args.expect !== preview.digest || (args.phase !== 'verify' && preview.blockers.length)) throw new Error(`初回投稿の実行条件が不足: ${preview.blockers.join(', ')}`);
  const required = ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN'];
  if (required.some(key => !process.env[key])) throw new Error('YouTube環境変数が未設定');
  const { google } = await import('googleapis');
  const { singlePublishJournal } = await import('./lib/youtube-single-r2.mjs');
  const auth = new google.auth.OAuth2(process.env.YOUTUBE_CLIENT_ID, process.env.YOUTUBE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
  const youtube = google.youtube({ version: 'v3', auth, retry: false });
  console.log(JSON.stringify(await publishYoutubePublication(ROOT, { ...options, commit: true }, { youtube, journal: singlePublishJournal(args.pub) }), null, 2));
}

const commands = { list, show, index, 'import-video-pack': importVideoPack, 'import-video-packs': importVideoPacks, 'prepare-youtube': prepareYoutube, 'mark-rendered': markRendered, 'import-instagram': importInstagram, 'prepare-instagram-pinned': prepareInstagramPinned, 'mark-instagram-rendered': markInstagramRendered, 'import-x': importX, 'prepare-youtube-revision': prepareYoutubeRevision, 'record-youtube-revision-qa': recordYoutubeRevisionQa, 'stage-youtube-revision': stageYoutubeRevision, 'publish-youtube-revision': publishYoutubeRevision, 'publish-youtube': publishYoutube, approve, stop, unschedule };
if (!commands[command]) {
  console.error('Usage: npm run registry -- list|show|index|import-video-pack|import-video-packs|prepare-youtube|mark-rendered|import-instagram|import-x|prepare-youtube-revision|record-youtube-revision-qa|stage-youtube-revision|publish-youtube-revision|publish-youtube|approve|stop|unschedule …');
  process.exit(2);
}
await commands[command]();
