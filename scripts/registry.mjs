#!/usr/bin/env node
/**
 * registry.mjs — コンテンツ台帳（content/registry）の CLI。設計は .claude/knowledge/reference/content-registry.md。
 *
 *   npm run registry -- list [--channel youtube] [--exam civil-construction-2] [--status scheduled]
 *   npm run registry -- show <公開 ID・作品 ID・素材 ID>
 *   npm run registry -- index                      # .tmp/content-registry/index.json（作品・公開・素材・題名・段階を結んだ生成物）
 *   npm run registry -- import-video-pack --pack-dir content/sns/video-packs/{exam}/{packId} [--commit]
 *   npm run registry -- import-video-pack --pack-dir <dir> --only-new [--commit]   # 台帳に無い公開の行（新しいショートなど）だけを足す。既にある行は作り直さない
 *   npm run registry -- import-video-packs [--commit]   # 全動画パック。2 回目は書く行 0。公開中の一覧（own-videos）と件数を突き合わせる
 *   npm run registry -- prepare-youtube --pub <公開 ID> --publish-at <日時> [--commit] # 通常動画の文面・予定を登録（承認はしない）
 *   npm run registry -- mark-rendered --pub <公開 ID> [--commit] # 承認済み通常動画の完成レンダーを実検査して状態を進める
 *   npm run registry -- import-instagram --folder <相対フォルダ> [--slot <年間の枠>] [--commit] # 新しく投稿する IG 作品を個別に登録し、年間の枠へ結ぶ。照合 snapshot が要る
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
 *   npm run registry -- reschedule --pub <公開 ID>   # 外した予約の公開日時を戻す（承認した文面の publishAt だけ。YouTube への予約は youtube-single-publish の publish）
 *   npm run registry -- prepare-short --pub <ショートの公開 ID> --publish-at <日時> [--commit]  # 在庫のショートの素材・関連動画・公開日時を台帳に入れる（承認の前）
 *   npm run registry -- stage-youtube --pub <公開 ID> [--commit]   # 初回の投稿の動画と表紙を CI へ渡す private R2 に置く
 *   npm run registry -- auto-approve-short --pub <ショートの公開 ID>                     # prepare-short の判定を通し直して方針で承認する（shorts.autoApprove）
 *   npm run registry -- record-related --pub <ショートの公開 ID> --video-id <親の動画 ID>  # Studio で設定した関連動画を記録する（予約の前提）
 *   npm run registry -- replace-youtube-cover --pub <公開 ID> --cover <素材 ID> [--stage-r2 | --commit --expect <digest>]  # 投稿済みの動画の表紙だけを台帳の表紙に差し替える（--stage-r2 は手元で R2 に置く・--commit は CI が送って読み戻す）
 *
 * 取り込み（import）は既定で dry-run。approve は --expect（画面で見た版の digest）が今の中身と一致したときだけ書く。
 * approve・stop は運営者の判断なので、エージェント（Claude Code の Bash＝環境変数 CLAUDECODE=1）からは実行できない。
 *
 * npm run registry -- prepare-youtube --pub <公開ID> --publish-at <ISO日時> — 同じ日時の youtube.json を確認し、未承認の通常動画へ文面と予定を結線する。既定 dry-run、--commit で台帳へ書く。承認・状態は変更しない
 *
 * npm run registry -- publish-youtube --pub <公開ID> --phase upload — 初回通常動画のAPI予約。既定は外部通信なしで入力digestを出す。GitHub Actionsの youtube-single-publish.yml に公開IDとdigestを渡す。手動workflowはprivate R2のintentとAPI実査で重複投入を止める
 *
 * npm run registry -- prepare-youtube-revision --pub <元公開ID> --variant <新版名> — 新候補を別公開IDの下書きへ結線。既定ローカル検査、--commit --expect <digest>で保存。別文面は --copy <同作品内のJSON#fragment>（文面もdigest対象）。--refresh-draft は未承認のdraft/qa_passed/qa_blocked入力を履歴保存付きで更新し、変更時はdraftに戻す（初回不可）。旧入力・外部ID・承認を保持
 *
 * npm run registry -- publish-youtube-revision --pub <新公開ID> --phase upload — 個別改訂版。upload/schedule/verify、既定は外部通信なし。--commit --expect <digest>でのみ実行。結果不明は再送せずverify、承認・日時・Shorts関連先条件と停止後の扱いはcontent-registry.md参照。制作担当が実行前に結果を読む
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { execFileSync } from 'node:child_process';
import { loadRegistry, loadRegistryConfig, publicationStage, resolveCopy } from './lib/content-registry.mjs';
import { upsertMedia, upsertPublications, upsertWorks } from './lib/content-registry-write.mjs';
import { applyVideoRows, loadVideoState, planVideoRows, videoPackRows } from './lib/registry-video-state.mjs';
import { discoverVideoPacks } from './lib/content-registry-check.mjs';
import { readLatest } from './lib/dataset-io.mjs';
import { readJsonIf, writeJson } from './lib/json-io.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { acceptedApproval, readPolicy } from './lib/video-publish-gate.mjs';
import { approvalState } from './lib/media-review.mjs';
import { canTransition, requiresApproval } from './lib/content-registry.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    channel: { type: 'string' }, exam: { type: 'string' }, status: { type: 'string' },
    'pack-dir': { type: 'string' }, 'video-id': { type: 'string' }, 'only-new': { type: 'boolean' }, folder: { type: 'string' }, slot: { type: 'string' }, commit: { type: 'boolean' }, delete: { type: 'boolean' },
    pub: { type: 'string' }, stage: { type: 'string' }, expect: { type: 'string' }, reason: { type: 'string' },
    variant: { type: 'string' }, 'related-to': { type: 'string' }, 'publish-at': { type: 'string' },
    phase: { type: 'string' }, copy: { type: 'string' }, 'refresh-draft': { type: 'boolean' },
    avg: { type: 'string' }, blocks: { type: 'string' }, cover: { type: 'string' }, 'stage-r2': { type: 'boolean' },
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
  const reg = loadRegistry(ROOT);
  const derived = videoPackRows(ROOT, packDir, { state, rules: cfg.idRules, reg });
  const { exam, work } = derived;
  // --only-new は台帳に無い公開の行だけを足す。既にある行（承認・予約・照合の記録を持つ）は作り直さない。
  // 公開済みの通常動画にショートを足すときに使う（2026-11-10・作り直すと承認と予約の記録が消えた）
  const known = new Set(reg.publications.map((p) => p.id));
  const publications = args['only-new'] ? derived.publications.filter((p) => !known.has(p.id)) : derived.publications;
  console.log(JSON.stringify({ exam, work, publications }, null, 2));
  if (!args.commit) { console.log('dry-run（台帳へは書いていない）。書くときは --commit'); return; }
  if (!args['only-new']) upsertWorks(ROOT, exam, [work]);
  upsertPublications(ROOT, 'youtube', exam, publications);
  console.log(`書いた: 作品 ${args['only-new'] ? 0 : 1}・公開 ${publications.length}（${exam}）`);
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

async function markRendered() {
  if (!args.pub) throw new Error('mark-rendered には --pub <公開 ID> が要る');
  const cfg = loadRegistryConfig(ROOT);
  const reg = loadRegistry(ROOT);
  const pub = reg.publications.find((p) => p.id === args.pub);
  if (!pub || pub.channel !== 'youtube' || !['longform', 'short'].includes(pub.format) || pub.revisionOf) throw new Error('元の通常動画・初回のショートの公開行がない');
  if (pub.status !== 'approved' || !canTransition(cfg, pub.status, 'rendered', pub.channel)) throw new Error(`${pub.id}: approved → rendered の対象ではない`);
  const mediaById = new Map(reg.media.map((m) => [m.id, m]));
  const approval = approvalState(ROOT, pub, mediaById);
  if (!approval.visual.valid || !approval.final.valid || !acceptedApproval(pub) || pub.approval.grandfathered) throw new Error('今の画面・文面・素材の承認が必要');
  if (pub.format === 'short') {
    // ショートの完成の検査は shorts-factory の記録（描画・画面確認・音声・在庫）が今の動画のものか（DN-1002）
    const { qualityProblems } = await import('./lib/shorts-release.mjs');
    const work = reg.works.find((w) => w.id === pub.work && w.exam === pub.exam);
    const record = readJsonIf(ROOT, `${work.definition}/pop-image.json`);
    const problems = qualityProblems(record?.revisions?.[record?.activeShorts?.[pub.variant]], mediaById.get(pub.media?.video)?.sha256, readPolicy(ROOT));
    if (problems.length) throw new Error(`${pub.id}: ${problems.join('・')}`);
  } else execFileSync(process.execPath, [join(ROOT, 'scripts/media.mjs'), 'verify-render', '--work', `${pub.exam}/${pub.work}`], { cwd: ROOT, stdio: 'inherit' });
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
async function unschedule() {
  const { SCHEDULE_DELIVERY_KEYS } = await import('./lib/youtube-revision-publisher.mjs');
  const cfg = loadRegistryConfig(ROOT);
  if (!args.pub || !args.reason || String(args.reason).trim().length < 4) throw new Error('unschedule には --pub <公開 ID> --reason <理由> が要る');
  const pub = loadRegistry(ROOT).publications.find((p) => p.id === args.pub);
  if (!pub) throw new Error(`台帳に無い: ${args.pub}`);
  if (pub.status !== 'scheduled') throw new Error(`予約済みではない（${pub.status}）: ${pub.id}`);
  if (!canTransition(cfg, 'scheduled', 'uploaded_private', pub.channel)) throw new Error('scheduled → uploaded_private は遷移に無い');
  const reason = `${String(args.reason).trim()}（元の予約 ${pub.publishAt}）`;
  // 予約の実行記録は publishAt と対なので、予約を外したら一緒に消す。投稿と表紙の記録は残す
  const delivery = Object.fromEntries(Object.entries(pub.delivery ?? {}).filter(([key]) => !SCHEDULE_DELIVERY_KEYS.includes(key)));
  writePublication(pub, { status: 'uploaded_private', publishAt: undefined, reason, ...(pub.delivery ? { delivery } : {}) });
  console.log(`予約を外した: ${pub.id}（scheduled → uploaded_private・元の予約 ${pub.publishAt}）`);
}

/**
 * 外した予約を戻す（uploaded_private のまま publishAt だけ戻す・DN-1064）。改訂版が元の動画と同じ中身だったときなど、
 * アップロード済みの動画をそのまま予約し直すのに使う。YouTube への予約は youtube-single-publish の publish（再アップロードしない）。
 * 戻せるのは運営者が承認した公開日時（文面の publishAt）だけで、戻した行の承認が今の中身と一致しなければ書かない。
 * 別の日時にするなら文面を直して運営者が承認し直す。
 */
async function reschedule() {
  if (!args.pub) throw new Error('reschedule には --pub <公開 ID> が要る');
  const reg = loadRegistry(ROOT);
  const pub = reg.publications.find((p) => p.id === args.pub);
  if (!pub) throw new Error(`台帳に無い: ${args.pub}`);
  if (pub.channel !== 'youtube' || pub.status !== 'uploaded_private' || !pub.platform?.id || pub.delivery?.videoId !== pub.platform.id) throw new Error(`予約を外したアップロード済みの YouTube 動画ではない（${pub.status}）: ${pub.id}`);
  if (pub.publishAt || pub.delivery.scheduleRequestedAt) throw new Error(`予約の記録が残っている: ${pub.id}`);
  // 予約の段は文面の publishAt と行の publishAt の一致を求める（singlePublishPlan）ので、文面の値へ戻す
  const [copyFile, copyKey] = String(pub.copy ?? '').split('#');
  const publishAt = readJsonIf(ROOT, copyFile)?.[copyKey]?.publishAt;
  const leadMs = (readPolicy(ROOT).minLeadHours ?? 24) * 3_600_000;
  if (!(Date.parse(publishAt) - Date.now() >= leadMs)) throw new Error(`文面の公開日時 ${publishAt ?? '（無し）'} が近すぎるか過ぎている。文面を直して運営者が承認し直す`);
  const clash = reg.publications.find((p) => p.id !== pub.id && p.channel === 'youtube' && p.status !== 'stopped' && p.platform?.id && Date.parse(p.publishAt) === Date.parse(publishAt));
  if (clash) throw new Error(`同じ公開日時に別の動画がある: ${clash.id}`);
  const next = { ...pub, publishAt };
  if (!acceptedApproval(next) || !approvalState(ROOT, next, new Map(reg.media.map((m) => [m.id, m]))).final.valid) throw new Error('戻した公開日時で承認が今の中身と一致しない。運営者が承認し直す');
  writePublication(pub, { publishAt });
  console.log(`予約の公開日時を戻した: ${pub.id}（${publishAt}・uploaded_private のまま）。次: youtube-single-publish の publish`);
}

/**
 * 在庫に入れた初回のショートを、承認と予約の段へ進める準備（DN-1002）。素材（動画・表紙・画面の一覧・字幕）を台帳に結び、
 * 関連動画（予約済みか公開済みの親の通常動画）と公開日時を入れて qa_passed にする。承認は運営者（approve）。
 * 投稿・予約は stage-youtube → youtube-single-publish の publish。関連動画は Studio で設定し、record-related で記録する。
 */
async function prepareShort() {
  const { prepareShortPlan } = await import('./lib/shorts-release.mjs');
  if (!args.pub || !args['publish-at']) throw new Error('prepare-short には --pub <ショートの公開 ID> --publish-at <時差つきの日時> が要る');
  const plan = prepareShortPlan(ROOT, { pubId: args.pub, publishAt: args['publish-at'] });
  console.log(JSON.stringify(plan.summary, null, 2));
  if (!args.commit) { console.log('dry-run（台帳へは書いていない）。書くときは --commit'); return; }
  upsertMedia(ROOT, plan.exam, plan.media);
  const ledgerPath = datasetPath('state.ai-image-review-ledger');
  const ledger = readJsonIf(ROOT, ledgerPath);
  if (!ledger?.figures) throw new Error('画像の判定の台帳が読めない');
  ledger.figures[plan.ledger.key] = plan.ledger.value;
  writeJson(ROOT, ledgerPath, ledger);
  const copyFile = `${plan.dir}/youtube.json`;
  const release = readJsonIf(ROOT, copyFile);
  release.shorts.find((s) => s.key === plan.pub.variant).publishAt = plan.patch.publishAt;
  writeJson(ROOT, copyFile, release);
  writePublication(plan.pub, plan.patch);
  console.log(`準備した: ${plan.pub.id}（${plan.pub.status} → qa_passed・関連 ${plan.parent.id}・公開 ${plan.patch.publishAt}）。次: 運営者の approve（visual → final）`);
}

/**
 * 方針でショートを承認する（2026-11-12・運営者の決定。台帳 config.video-auto-publish の shorts.autoApprove）。
 * prepare-short の判定（画面確認・音声・在庫・関連動画・公開日時）を今の行でもう一度通し、AI 生成の表紙の判定 ok を確かめてから、
 * 画面確認と最終の承認を by=policy で今の digest に書く。中身が変わると承認は無効になる
 */
async function autoApproveShort() {
  const { prepareShortPlan } = await import('./lib/shorts-release.mjs');
  if (!readPolicy(ROOT).shorts?.autoApprove) throw new Error('ショートの方針の承認が無効（台帳 config.video-auto-publish の shorts.autoApprove）');
  const reg = loadRegistry(ROOT);
  const pub = reg.publications.find((p) => p.id === args.pub);
  if (!pub || pub.format !== 'short' || pub.revisionOf || pub.status !== 'qa_passed' || !pub.relatedTo || !pub.publishAt) throw new Error(`prepare-short の済んだ初回のショートではない: ${args.pub}`);
  prepareShortPlan(ROOT, { pubId: pub.id, publishAt: pub.publishAt });
  const mediaById = new Map(reg.media.map((m) => [m.id, m]));
  const ledger = readJsonIf(ROOT, datasetPath('state.ai-image-review-ledger'));
  const bad = Object.values(pub.media ?? {}).map((id) => mediaById.get(id)).filter((m) => m?.provenance?.kind === 'ai-generated')
    .filter((m) => { const r = ledger?.figures?.[`media:${m.id}`]; return !(r?.verdict === 'ok' && String(m.sha256).startsWith(r.sha ?? '-')); });
  if (bad.length) throw new Error(`AI 生成の素材に今の画像の判定 ok が無い: ${bad.map((m) => m.id).join(', ')}`);
  const state = approvalState(ROOT, pub, mediaById);
  if (!state.visual.current || !state.final.current) throw new Error(`${pub.id}: 承認の digest を作れない（素材か文面が台帳に無い）`);
  const at = new Date().toISOString();
  writePublication(pub, {
    status: 'approved',
    review: { ...(pub.review ?? {}), visual: { status: 'approved', by: 'policy', at, digest: state.visual.current } },
    approval: { by: 'policy', at, contentSha256: state.final.current },
  });
  console.log(`方針の承認を書いた: ${pub.id}（digest ${state.final.current.slice(0, 12)}…）`);
}

/**
 * Studio で設定した関連動画を記録する（ショートの予約の前提・API では設定できない）。運営者が Studio で確かめてから打つ。
 * 予約の段（publish-youtube --phase schedule）は、この記録と親の動画 ID の一致を求め、親が視聴できるかを API で確かめる。
 */
function recordRelated() {
  if (!args.pub || !/^[\w-]{11}$/.test(args['video-id'] ?? '')) throw new Error('record-related には --pub <ショートの公開 ID> --video-id <親の動画 ID（11 字）> が要る');
  const reg = loadRegistry(ROOT);
  const pub = reg.publications.find((p) => p.id === args.pub);
  if (!pub || pub.format !== 'short' || !pub.platform?.id) throw new Error(`投稿済みのショートではない: ${args.pub}`);
  const parent = reg.publications.find((p) => p.id === pub.relatedTo);
  if (parent?.platform?.id !== args['video-id']) throw new Error(`関連先（${pub.relatedTo}）の動画 ID（${parent?.platform?.id ?? 'なし'}）と違う`);
  writePublication(pub, { platform: { ...pub.platform, relatedVideoId: args['video-id'], desiredRelatedVideoId: args['video-id'] } });
  console.log(`関連動画を記録した: ${pub.id} → ${args['video-id']}（Studio で設定済みとして）`);
}

/** 初回の投稿（通常動画・ショート）の動画と表紙を、CI へ渡す private R2 に置いて読み戻す。手元に実体が要る（ショートは shorts-factory restore） */
async function stageYoutube() {
  const { stageSinglePublish } = await import('./lib/youtube-single-r2.mjs');
  if (!args.pub) throw new Error('stage-youtube には --pub が要る');
  console.log(JSON.stringify(await stageSinglePublish(ROOT, args.pub, { commit: Boolean(args.commit) }), null, 2));
}

async function importInstagram() {
  if (!args.folder) throw new Error('Instagram は今後投稿する作品を --folder で個別指定する。一括取り込みは旧投稿を再登録するため使えない');
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
  if (args.slot) {
    const { loadChannelPlan } = await import('./lib/channel-plan.mjs');
    const slot = loadChannelPlan(ROOT).channels.instagram.slots.find((s) => s.id === args.slot);
    if (!slot) throw new Error(`Instagram の年間の枠に無い: ${args.slot}`);
    const wrong = rows.publications.find((p) => p.id.split('/')[0] !== slot.exam);
    if (wrong) throw new Error(`枠と資格が違う: ${wrong.id}（${slot.id}）`);
  }
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
    // posted.json・照合 snapshot で stopped(gone) や scheduled を巻き戻さない。枠の結びだけは足す。
    const row = args.slot ? { ...(cur ? strip(cur) : p), planSlot: args.slot } : p;
    if (!cur || (args.slot && cur.planSlot !== args.slot)) pubsByExam.set(exam, [...(pubsByExam.get(exam) ?? []), row]);
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
  if (args.delete) {
    const { unstageRevisionAssets } = await import('./lib/youtube-single-r2.mjs');
    console.log(JSON.stringify(await unstageRevisionAssets(ROOT, args.pub), null, 2));
    return;
  }
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

/** 投稿済みの動画の表紙だけを差し替える（2026-11-11・youtube-cover-replace.mjs） */
async function replaceYoutubeCover() {
  const { applyCoverReplace, coverReplacePlan, stageCoverReplace } = await import('./lib/youtube-cover-replace.mjs');
  const plan = coverReplacePlan(ROOT, args.pub, args.cover);
  if (args['stage-r2']) { console.log(JSON.stringify({ ...(await stageCoverReplace(ROOT, plan)), digest: plan.digest })); return; }
  if (!args.commit) { console.log(JSON.stringify({ pub: plan.pub.id, videoId: plan.videoId, cover: plan.media.id, r2Key: plan.r2Key, digest: plan.digest }, null, 2)); return; }
  if (args.expect !== plan.digest) throw new Error('--expect が計画の digest と一致しない');
  const required = ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN'];
  if (required.some((key) => !process.env[key])) throw new Error('YouTube環境変数が未設定');
  const { google } = await import('googleapis');
  const auth = new google.auth.OAuth2(process.env.YOUTUBE_CLIENT_ID, process.env.YOUTUBE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
  console.log(JSON.stringify(await applyCoverReplace(ROOT, plan, google.youtube({ version: 'v3', auth, retry: false })), null, 2));
}

const commands = { 'replace-youtube-cover': replaceYoutubeCover, list, show, index, 'import-video-pack': importVideoPack, 'import-video-packs': importVideoPacks, 'prepare-youtube': prepareYoutube, 'mark-rendered': markRendered, 'import-instagram': importInstagram, 'prepare-instagram-pinned': prepareInstagramPinned, 'mark-instagram-rendered': markInstagramRendered, 'import-x': importX, 'prepare-youtube-revision': prepareYoutubeRevision, 'record-youtube-revision-qa': recordYoutubeRevisionQa, 'stage-youtube-revision': stageYoutubeRevision, 'publish-youtube-revision': publishYoutubeRevision, 'publish-youtube': publishYoutube, approve, stop, unschedule, reschedule, 'prepare-short': prepareShort, 'auto-approve-short': autoApproveShort, 'record-related': recordRelated, 'stage-youtube': stageYoutube };
if (!commands[command]) {
  console.error('Usage: npm run registry -- list|show|index|import-video-pack|import-video-packs|prepare-youtube|mark-rendered|import-instagram|import-x|prepare-youtube-revision|record-youtube-revision-qa|stage-youtube-revision|publish-youtube-revision|publish-youtube|approve|stop|unschedule|reschedule|prepare-short|auto-approve-short|record-related|stage-youtube …');
  process.exit(2);
}
await commands[command]();
