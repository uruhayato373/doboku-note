#!/usr/bin/env node
/**
 * video-factory.mjs — 通常動画の量産工程の入口。手順は .claude/knowledge/reference/video-factory.md
 *
 *   npm run video-factory -- status [--exam <exam>] [--json]   全パックの次の工程
 *   npm run video-factory -- plan --pack <exam>/<work> [--scope all|cover] [--date YYYYMMDD]
 *   npm run video-factory -- generate --pack <exam>/<work> [--concurrency 3]
 *   npm run video-factory -- audit-queue --pack <exam>/<work>             監査へ渡す項目
 *   npm run video-factory -- record-audit --pack <exam>/<work> --file <verdicts.json> --by <担当>
 *   npm run video-factory -- adopt --pack <exam>/<work>                   ok が揃ったら採用
 *   npm run video-factory -- render --pack <exam>/<work>                  音声・動画・照合・取り込み
 *   npm run video-factory -- ledger --pack <exam>/<work>                  採用画像の判定を AI 台帳へ
 *   npm run video-factory -- record-qa --pack <exam>/<work> --avg <0-3> --blocks <件数>
 *   npm run video-factory -- commit --pack <exam>/<work>                 制作記録だけをコミット
 *   npm run video-factory -- audio-check --pack <exam>/<work>            音声を文字起こしして台本と照合する
 *   npm run video-factory -- wire --pack <exam>/<work> [--publish-at <ISO>]  文面へ転送先と空き枠を入れる
 *   npm run video-factory -- gate --pack <exam>/<work>                   予約へ進めてよいかを検査だけする
 *   npm run video-factory -- auto-approve --pack <exam>/<work>           関門を通ったら方針の承認を台帳へ書く
 *   npm run video-factory -- produce --pack <exam>/<work>                採用・音声・動画・AI 台帳を続けて回す
 *   npm run video-factory -- finish --packs <a,b>                        音声照合・方針の承認・コミットを 1 本ずつ回す
 *   npm run video-factory -- publish --packs <a,b>                       台帳を develop へ出し、転送して予約を流す（要 R2 の環境変数）
 *   npm run video-factory -- cleanup --packs <a,b>                       予約済みの転送用ファイルを消す（要 R2 の環境変数）
 *
 * 運営者の approve・stop は別の入口。auto-approve は config/video-auto-publish.json の方針で動き、関門の全項目を通ったときだけ書く。
 */
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { loadRegistry } from './lib/content-registry.mjs';
import { upsertPublications, upsertWorks } from './lib/content-registry-write.mjs';
import { readDataset } from './lib/dataset-io.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { readJsonIf } from './lib/json-io.mjs';
import { requirePopDiagramStandard } from './lib/longform-pop-images.mjs';
import { approvalState } from './lib/media-review.mjs';
import { recordYoutubeRevisionQa } from './lib/registry-youtube-revision.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';
import { todayJst } from './lib/jst-date.mjs';
import { audioProblems, evaluateGate, nextSlot, readPolicy, speechSimilarity } from './lib/video-publish-gate.mjs';
import { adoptPlan, auditQueue, buildPlan, generatePlan, hydrateAdopted, ledgerVerdicts, nextStage, packDirOf, readPlan, recordAudit, summarize } from './lib/video-factory.mjs';

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    pack: { type: 'string' }, exam: { type: 'string' }, scope: { type: 'string' }, date: { type: 'string' }, json: { type: 'boolean' },
    concurrency: { type: 'string' }, packs: { type: 'string' }, 'publish-at': { type: 'string' }, file: { type: 'string' }, by: { type: 'string' }, avg: { type: 'string' }, blocks: { type: 'string' },
  },
});
const [command] = positionals;
const requirePack = () => {
  if (!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(args.pack ?? '')) throw new Error('--pack <exam>/<work> が要る');
  return args.pack;
};
const createSha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const today = () => todayJst().replaceAll('-', '');

/** 作品の公開行のうち、次に出す版。未承認の改訂があれば改訂を優先する */
function targetPub(reg, exam, work) {
  const rows = reg.publications.filter((p) => p.exam === exam && p.work === work && p.channel === 'youtube' && p.format === 'longform' && p.status !== 'stopped');
  return rows.find((p) => p.revisionOf) ?? rows[0] ?? null;
}

function factsOf(reg, pack, reviews, mediaById) {
  const [exam, work] = pack.split('/');
  const pub = targetPub(reg, exam, work);
  if (!pub) return null;
  const dir = packDirOf(pack);
  let standard = true;
  try { requirePopDiagramStandard(ROOT, join(ROOT, dir)); } catch { standard = false; }
  const video = mediaById.get(pub.media?.video);
  const boardSha = createSha(readFileSync(join(ROOT, dir, 'storyboard.json')));
  const q = reg.works.find((w) => w.id === work && w.exam === exam)?.qa;
  const state = approvalState(ROOT, pub, mediaById);
  const r = reviews[pub.id];
  const fresh = r && r.visualDigest === state.visual.current && r.finalDigest === state.final.current;
  return {
    pub: pub.id, status: pub.status, standard, plan: readPlan(ROOT, pack) ? summarize(readPlan(ROOT, pack)) : null,
    rendered: video?.provenance?.specSha256 === boardSha,
    qa: !q ? 'none' : q.avg >= 2 && q.blocks === 0 ? 'passed' : 'blocked',
    review: fresh ? r.verdict : 'none',
  };
}

function status() {
  const reg = loadRegistry(ROOT);
  const mediaById = new Map(reg.media.map((m) => [m.id, m]));
  const reviews = readJsonIf(ROOT, datasetPath('state.video-agent-reviews'))?.reviews ?? {};
  const root = join(ROOT, 'content/sns/video-packs');
  const exams = args.exam ? [args.exam] : readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  const rows = [];
  let scanned = 0;
  for (const exam of exams) {
    for (const entry of readdirSync(join(root, exam), { withFileTypes: true })) {
      if (!entry.isDirectory() || !existsSync(join(root, exam, entry.name, 'storyboard.json'))) continue;
      scanned += 1;
      const facts = factsOf(reg, `${exam}/${entry.name}`, reviews, mediaById);
      if (facts) rows.push({ pack: `${exam}/${entry.name}`, stage: nextStage(facts), ...facts });
    }
  }
  if (!scanned) { console.error('検査不成立: 対象のパックが 0 件'); process.exit(2); }
  const counts = {};
  for (const r of rows) counts[r.stage] = (counts[r.stage] ?? 0) + 1;
  if (args.json) { console.log(JSON.stringify({ scanned, checked: rows.length, counts, rows }, null, 2)); return; }
  console.log(`パック ${scanned} 件のうち、公開行のある ${rows.length} 件を判定`);
  for (const [stage, n] of Object.entries(counts).sort()) console.log(`  ${stage}: ${n}`);
  for (const r of rows.filter((x) => !['done', 'stopped'].includes(x.stage))) console.log(`${r.stage}\t${r.pack}`);
}

async function ensureVoicevox() {
  const up = () => fetch('http://127.0.0.1:50021/version').then((r) => r.ok, () => false);
  if (await up()) return null;
  const engine = join(homedir(), 'voicevox_engine/macos-arm64/run');
  if (!existsSync(engine)) throw new Error(`VOICEVOX が無い: ${engine}`);
  const child = spawn(engine, ['--host', '127.0.0.1', '--port', '50021'], { stdio: 'ignore', detached: true });
  for (let i = 0; i < 60; i += 1) {
    await new Promise((r) => { setTimeout(r, 1000); });
    if (await up()) return child;
  }
  child.kill();
  throw new Error('VOICEVOX が起動しない');
}

async function render() {
  const pack = requirePack();
  const [exam, work] = pack.split('/');
  const reg = loadRegistry(ROOT);
  const pub = targetPub(reg, exam, work);
  if (!pub) throw new Error(`${pack}: 公開行が無い`);
  requirePopDiagramStandard(ROOT, join(ROOT, packDirOf(pack)));
  hydrateAdopted(ROOT, pack);
  const engine = await ensureVoicevox();
  try {
    const run = (cmd, argv) => execFileSync(cmd, argv, { cwd: ROOT, stdio: 'inherit' });
    run(process.execPath, ['scripts/render-longform.mjs', '--pack-dir', join(ROOT, packDirOf(pack)), '--speaker', '13', '--loudnorm', '--resume']);
    run('npm', ['run', '-s', 'media', '--', 'verify-render', '--work', pack]);
    if (pub.revisionOf) {
      run('npm', ['run', '-s', 'media', '--', 'promote', '--candidate', '--pub', pub.revisionOf, '--commit']);
      const variant = pub.variant;
      const dry = execFileSync('npm', ['run', '-s', 'registry', '--', 'prepare-youtube-revision', '--pub', pub.revisionOf, '--variant', variant, '--refresh-draft'], { cwd: ROOT, encoding: 'utf8' });
      run('npm', ['run', '-s', 'registry', '--', 'prepare-youtube-revision', '--pub', pub.revisionOf, '--variant', variant, '--refresh-draft', '--commit', '--expect', JSON.parse(dry).digest]);
    } else {
      run('npm', ['run', '-s', 'media', '--', 'promote', '--pub', pub.id, '--commit']);
    }
  } finally { engine?.kill(); }
}

function ledger() {
  const pack = requirePack();
  const [exam, work] = pack.split('/');
  const media = loadRegistry(ROOT).media.filter((m) => m.id.startsWith(`${exam}/${work}/`));
  const verdicts = ledgerVerdicts(ROOT, pack, media);
  if (!verdicts.length) throw new Error(`${pack}: 写す判定が 0 件`);
  const file = join(ROOT, `.tmp/media/${pack}/work/factory/ledger.json`);
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, JSON.stringify(verdicts, null, 2));
  execFileSync(process.execPath, ['scripts/check-image-origin.mjs', 'record-ai', file], { cwd: ROOT, stdio: 'inherit' });
  console.log(`判定 ${verdicts.length} 件を AI 台帳へ写した`);
}

function recordQa() {
  const pack = requirePack();
  const [exam, work] = pack.split('/');
  const avg = Number(args.avg), blocks = Number(args.blocks);
  if (!Number.isFinite(avg) || avg < 0 || avg > 3 || !Number.isInteger(blocks) || blocks < 0) throw new Error('--avg 0〜3 と --blocks 件数が要る');
  const reg = loadRegistry(ROOT);
  const pub = targetPub(reg, exam, work);
  if (pub?.revisionOf) { console.log(JSON.stringify(recordYoutubeRevisionQa(ROOT, { pubId: pub.id, avg, blocks, commit: true }))); return; }
  const row = reg.works.find((w) => w.id === work && w.exam === exam);
  if (!pub || pub.approval || !['draft', 'qa_blocked', 'qa_passed'].includes(pub.status) || !row) throw new Error(`${pack}: 未承認の公開行だけ記録できる`);
  const qa = { avg, blocks, at: todayJst(), by: 'Claude Code video-content-qa' };
  upsertWorks(ROOT, exam, [{ ...row, qa }]);
  upsertPublications(ROOT, 'youtube', exam, [{ ...pub, status: avg >= 2 && blocks === 0 ? 'qa_passed' : 'qa_blocked' }]);
  console.log(`${pub.id}: QA を記録（平均 ${avg}・BLOCK ${blocks}）`);
}

/** 制作記録だけを明示してコミットする。並行作業の変更を巻き込まない */
function commit() {
  const pack = requirePack();
  const exam = pack.split('/')[0];
  execFileSync('npm', ['run', '-s', 'media', '--', 'sync', '--work', pack, '--commit'], { cwd: ROOT, stdio: 'inherit' });
  const paths = [
    packDirOf(pack), ...['registry.works', 'registry.youtube', 'registry.media'].map((id) => datasetPath(id, { name: `${exam}.json` })),
    datasetPath('state.video-agent-reviews'), datasetPath('state.video-audio-checks'), datasetPath('state.ai-image-review-ledger'), datasetPath('state.drive-manifest'),
  ].filter((p) => existsSync(join(ROOT, p)));
  execFileSync('git', ['add', '--', ...paths], { cwd: ROOT, stdio: 'inherit' });
  execFileSync('git', ['commit', '-m', `content(video): ${pack} を量産工程で制作する`, '--', ...paths], { cwd: ROOT, stdio: 'inherit' });
}

const AUDIO_PATH = datasetPath('state.video-audio-checks');
const readAudio = () => readJsonIf(ROOT, AUDIO_PATH) ?? { schemaVersion: 1, checks: {} };

/** 完成動画の実体を手元に揃える。無ければ台帳の sha で Drive から戻す */
function videoFile(pack, mediaById, pub) {
  const video = mediaById.get(pub.media?.video);
  if (!video) throw new Error(`${pub.id}: 完成動画が台帳に無い`);
  const abs = join(ROOT, video.store.path);
  if (!existsSync(abs)) execFileSync('npm', ['run', '-s', 'media', '--', 'pull', '--work', pack, '--commit'], { cwd: ROOT, stdio: 'inherit' });
  if (!existsSync(abs) || createSha(readFileSync(abs)) !== video.sha256) throw new Error(`${pub.id}: 完成動画の実体が台帳の sha と違う`);
  return { abs, video };
}

/** 音声の機械検査。読み間違いの 1 語までは分からない。欠落・崩れ・音量・尺を見る */
function audioCheck() {
  const pack = requirePack();
  const [exam, work] = pack.split('/');
  const policy = readPolicy(ROOT);
  const model = policy.audio.model.replace(/^~/, homedir());
  if (!existsSync(model)) { console.error(`検査不成立: 文字起こしのモデルが無い: ${model}`); process.exit(2); }
  const reg = loadRegistry(ROOT);
  const pub = targetPub(reg, exam, work);
  const { abs, video } = videoFile(pack, new Map(reg.media.map((m) => [m.id, m])), pub);
  const out = join(ROOT, '.tmp/media', pack, 'work/factory');
  mkdirSync(out, { recursive: true });
  // 全編を 1 回で渡すと whisper が途中を飛ばす（2026-11-05 に場面単体では聞き取れた箇所が欠けた）。短く切って渡す
  const chunks = join(out, 'audio-chunks');
  rmSync(chunks, { recursive: true, force: true });
  mkdirSync(chunks, { recursive: true });
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', abs, '-ar', '16000', '-ac', '1', '-f', 'segment', '-segment_time', '30', join(chunks, 'part-%03d.wav')]);
  const wavs = readdirSync(chunks).filter((f) => f.endsWith('.wav')).sort().map((f) => join(chunks, f));
  execFileSync('whisper-cli', ['-m', model, '-l', policy.audio.language, '-nt', '-otxt', ...wavs.flatMap((f) => ['-f', f])], { stdio: 'ignore' });
  const heard = wavs.map((f) => readFileSync(`${f}.txt`, 'utf8')).join('');
  const board = JSON.parse(readFileSync(join(ROOT, packDirOf(pack), 'storyboard.json'), 'utf8'));
  const expected = board.scenes.map((s) => s.narration ?? '').join('');
  const volume = spawnSync('ffmpeg', ['-hide_banner', '-i', abs, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const maxVolumeDb = Number(/max_volume: (-?[\d.]+) dB/.exec(volume)?.[1]);
  // 台本の予定尺は読み上げ前の見積りなので、音声が映像の途中で切れていないかを実体で比べる
  const streams = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,duration', '-of', 'json', abs], { encoding: 'utf8' })).streams;
  const seconds = (type) => Number(streams.find((x) => x.codec_type === type)?.duration);
  const row = {
    videoSha256: video.sha256, at: new Date().toISOString(), similarity: Number(speechSimilarity(expected, heard).toFixed(3)),
    maxVolumeDb, durationGapSec: Number(Math.abs(seconds('video') - seconds('audio')).toFixed(1)), chars: { expected: expected.length, heard: heard.length },
  };
  const store = readAudio();
  store.checks[pub.id] = row;
  writeFileSync(join(ROOT, AUDIO_PATH), `${JSON.stringify(store, null, 2)}\n`);
  console.log(JSON.stringify({ pub: pub.id, ...row, problems: audioProblems(row, video.sha256, policy) }));
}

/** 文面と公開日時を決める。文面が無ければ描画の実体から作り、予約の検査が要る欄を人手で足さない */
function wire() {
  const pack = requirePack();
  const [exam, work] = pack.split('/');
  const policy = readPolicy(ROOT);
  const reg = loadRegistry(ROOT);
  const pub = targetPub(reg, exam, work);
  const taken = reg.publications.filter((p) => p.channel === 'youtube' && p.publishAt && p.status !== 'stopped' && p.id !== pub?.id && Date.parse(p.publishAt) > Date.now()).map((p) => p.publishAt);
  const publishAt = args['publish-at'] ?? (Date.parse(pub?.publishAt) > Date.now() ? pub.publishAt : nextSlot(taken, policy));
  if (pub?.revisionOf) { wireRevision(reg, pub, publishAt); return; }
  if (!pub || pub.status !== 'qa_passed') throw new Error(`${pack}: QA 済みで未承認の初回の公開行だけ結線できる`);
  const mediaById = new Map(reg.media.map((m) => [m.id, m]));
  const file = join(ROOT, packDirOf(pack), 'youtube.json');
  if (!existsSync(file)) {
    execFileSync('npx', ['tsx', 'scripts/prepare-youtube-longforms.mts', '--metadata', '--scope', 'single', '--pack-id', work, '--publish-at', publishAt], { cwd: ROOT, stdio: 'inherit' });
  }
  const release = JSON.parse(readFileSync(file, 'utf8'));
  const { channel } = readDataset(ROOT, 'config.youtube-formats');
  writeFileSync(file, `${JSON.stringify({
    ...release, channel: { id: channel.id, title: channel.title },
    longform: {
      ...release.longform, categoryId: release.longform.categoryId ?? '27', publishAt,
      r2Key: `video/render/${work}/video.mp4`, thumbnailR2Key: `video/render/${work}/img/00-cover.png`,
      sha256: mediaById.get(pub.media.video).sha256, thumbnailSha256: mediaById.get(pub.media.cover).sha256,
    },
  }, null, 2)}\n`);
  upsertPublications(ROOT, 'youtube', exam, [{ ...stripRow(pub), copy: `${packDirOf(pack)}/youtube.json#longform`, publishAt }]);
  console.log(JSON.stringify({ pub: pub.id, publishAt }));
}

/** 改訂版は予定だけを変える。文面と素材は同じなので、下書きへ戻った行に同じ QA を記録し直す */
function wireRevision(reg, pub, publishAt) {
  if (!['draft', 'qa_passed'].includes(pub.status) || pub.approval) throw new Error(`${pub.id}: 未承認の改訂版だけ結線できる`);
  if (pub.publishAt === publishAt) { console.log(JSON.stringify({ pub: pub.id, publishAt })); return; }
  execFileSync('npm', ['run', '-s', 'media', '--', 'pull', '--work', `${pub.exam}/${pub.work}`, '--commit'], { cwd: ROOT, stdio: 'inherit' });
  const prepare = (...extra) => execFileSync(process.execPath, [join(ROOT, 'scripts/registry.mjs'), 'prepare-youtube-revision', '--pub', pub.revisionOf, '--variant', pub.variant, '--refresh-draft', '--publish-at', publishAt, ...extra], { cwd: ROOT, encoding: 'utf8' });
  const { digest } = JSON.parse(prepare());
  prepare('--commit', '--expect', digest);
  const { qa } = reg.works.find((w) => w.id === pub.work && w.exam === pub.exam);
  recordYoutubeRevisionQa(ROOT, { pubId: pub.id, avg: qa.avg, blocks: qa.blocks, commit: true });
  console.log(JSON.stringify({ pub: pub.id, publishAt }));
}

const stripRow = (pub) => Object.fromEntries(Object.entries(pub).filter(([k]) => !['file', 'exam', 'channel'].includes(k)));

/** 関門の事実を集める。実行できなかった検査は不合格として返す */
function gateFacts(pack) {
  const [exam, work] = pack.split('/');
  const policy = readPolicy(ROOT);
  const reg = loadRegistry(ROOT);
  const mediaById = new Map(reg.media.map((m) => [m.id, m]));
  const pub = targetPub(reg, exam, work);
  if (!pub) throw new Error(`${pack}: 公開行が無い`);
  const reviews = readJsonIf(ROOT, datasetPath('state.video-agent-reviews'))?.reviews ?? {};
  const facts = factsOf(reg, pack, reviews, mediaById);
  const ledger = readJsonIf(ROOT, datasetPath('state.ai-image-review-ledger'));
  const aiBlocked = Object.values(pub.media ?? {}).map((id) => mediaById.get(id)).filter((m) => m?.provenance?.kind === 'ai-generated')
    .filter((m) => { const r = ledger?.figures?.[`media:${m.id}`]; return !(r?.verdict === 'ok' && String(m.sha256).startsWith(r.sha ?? '-')); }).map((m) => m.id);
  // 改訂版は描画の作業場を持たない。素材の sha と制作入力は投稿計画の検査が照合する
  const verify = pub.revisionOf
    ? spawnSync(process.execPath, [join(ROOT, 'scripts/registry.mjs'), 'publish-youtube-revision', '--pub', pub.id, '--phase', 'upload'], { cwd: ROOT, encoding: 'utf8' })
    : spawnSync(process.execPath, [join(ROOT, 'scripts/media.mjs'), 'verify-render', '--work', pack], { cwd: ROOT, encoding: 'utf8' });
  const funnel = spawnSync(process.execPath, [join(ROOT, 'scripts/check-youtube-funnels.mjs'), '--pub', pub.id], { cwd: ROOT, encoding: 'utf8' });
  const video = mediaById.get(pub.media?.video);
  return {
    policy, reg, mediaById,
    facts: {
      pub, standard: facts.standard, aiBlocked, renderVerified: verify.status === 0, qa: reg.works.find((w) => w.id === work && w.exam === exam)?.qa,
      review: facts.review, funnelOk: funnel.status === 0, funnelDetail: funnel.status === 0 ? '' : (funnel.stderr || funnel.stdout).trim().split('\n').slice(0, 3).join(' / '),
      audioProblems: audioProblems(readAudio().checks[pub.id], video?.sha256, policy),
    },
  };
}

function gate() {
  const pack = requirePack();
  const { facts, policy } = gateFacts(pack);
  const result = evaluateGate(facts, policy);
  console.log(JSON.stringify({ pub: facts.pub.id, ...result }, null, 2));
  if (!result.ok) process.exit(1);
}

/** 関門の全項目を通ったときだけ、今の digest に方針の承認を書く */
function autoApprove() {
  const pack = requirePack();
  const { facts, policy, mediaById } = gateFacts(pack);
  const { pub } = facts;
  const result = evaluateGate(facts, policy);
  if (!result.ok) { console.error(JSON.stringify(result.checks.filter((c) => !c.ok), null, 2)); process.exit(1); }
  if (!['qa_passed', 'approved', 'rendered', 'scheduled'].includes(pub.status)) throw new Error(`${pub.id}: ${pub.status} は承認の対象ではない`);
  const state = approvalState(ROOT, pub, mediaById);
  const at = new Date().toISOString();
  upsertPublications(ROOT, 'youtube', pub.exam, [{
    ...stripRow(pub), status: pub.status === 'qa_passed' ? 'approved' : pub.status,
    review: { ...(pub.review ?? {}), visual: { status: 'approved', by: 'policy', at, digest: state.visual.current } },
    approval: { by: 'policy', at, contentSha256: state.final.current },
  }]);
  console.log(`方針の承認を書いた: ${pub.id}（digest ${state.final.current.slice(0, 12)}…）`);
}

const self = (...cmd) => spawnSync(process.execPath, [join(ROOT, 'scripts/video-factory.mjs'), ...cmd], { cwd: ROOT, encoding: 'utf8' });
const requirePacks = () => {
  const packs = (args.packs ?? '').split(',').filter(Boolean);
  if (!packs.length || packs.some((p) => !/^[a-z0-9-]+\/[a-z0-9-]+$/.test(p))) throw new Error('--packs <exam>/<work>,… が要る');
  return packs;
};

/** 描画の段を 1 コマンドにする。Workflow の代理エージェントの数を減らすため */
async function produce() {
  await adoptPlan(ROOT, requirePack(), { now: new Date().toISOString() });
  await render();
  ledger();
}

/** 関門の仕上げ。1 本の失敗で他を止めず、理由を返す */
function finish() {
  const rows = [];
  for (const pack of requirePacks()) {
    const steps = [['audio-check', '--pack', pack], ['auto-approve', '--pack', pack], ['commit', '--pack', pack]];
    let failed = null;
    for (const step of steps) {
      const r = self(...step);
      if (r.status !== 0) { failed = `${step[0]}: ${(r.stderr || r.stdout).trim().slice(0, 1000)}`; break; }
    }
    rows.push({ pack, ok: !failed, ...(failed ? { failed } : {}) });
  }
  console.log(JSON.stringify(rows, null, 2));
}

const runNode = (script, ...rest) => execFileSync(process.execPath, [join(ROOT, script), ...rest], { cwd: ROOT, encoding: 'utf8' });
const lastJson = (text) => JSON.parse(text.slice(text.lastIndexOf('\n{') + 1));

/** 承認済みを転送し、台帳を develop へ出してから予約のワークフローを流す */
function publish() {
  const jobs = [];
  for (const pack of requirePacks()) {
    const [exam, work] = pack.split('/');
    const reg = loadRegistry(ROOT);
    const pub = targetPub(reg, exam, work);
    if (!pub?.approval || !['approved', 'rendered'].includes(pub.status)) throw new Error(`${pack}: 承認済みではない`);
    if (pub.revisionOf) {
      const { digest, blockers } = lastJson(runNode('scripts/registry.mjs', 'publish-youtube-revision', '--pub', pub.id, '--phase', 'upload'));
      if (blockers.length) throw new Error(`${pub.id}: ${blockers.join(', ')}`);
      runNode('scripts/registry.mjs', 'stage-youtube-revision', '--pub', pub.id, '--commit', '--expect', digest);
      jobs.push({ pub: pub.id, digest });
      continue;
    }
    if (pub.status === 'approved') runNode('scripts/registry.mjs', 'mark-rendered', '--pub', pub.id, '--commit');
    const { digest, blockers } = lastJson(runNode('scripts/registry.mjs', 'publish-youtube', '--pub', pub.id, '--phase', 'upload'));
    if (blockers.length) throw new Error(`${pub.id}: ${blockers.join(', ')}`);
    runNode('scripts/stage-youtube-renders-r2.mjs', '--exam', exam, '--pack-id', work, '--commit');
    jobs.push({ pub: pub.id, digest });
  }
  const paths = [...new Set(jobs.map((j) => datasetPath('registry.youtube', { name: `${j.pub.split('/')[0]}.json` })))];
  const dirty = execFileSync('git', ['status', '--porcelain', '--', ...paths], { cwd: ROOT, encoding: 'utf8' }).trim();
  if (dirty) execFileSync('git', ['commit', '-m', 'content(video): 関門を通った動画を予約へ進める', '--', ...paths], { cwd: ROOT, stdio: 'inherit' });
  execFileSync('git', ['pull', '--rebase', 'origin', 'develop'], { cwd: ROOT, stdio: 'inherit' });
  execFileSync('git', ['push', 'origin', 'HEAD:develop'], { cwd: ROOT, stdio: 'inherit' });
  for (const j of jobs) execFileSync('gh', ['workflow', 'run', 'youtube-single-publish.yml', '--ref', 'develop', '-f', 'mode=publish', '-f', `publication=${j.pub}`, '-f', `expect=${j.digest}`], { cwd: ROOT, stdio: 'inherit' });
  console.log(JSON.stringify(jobs, null, 2));
}

/** 予約を実体で確かめたあと、転送用の一時ファイルを消す */
function cleanup() {
  for (const pack of requirePacks()) {
    const [exam, work] = pack.split('/');
    const pub = targetPub(loadRegistry(ROOT), exam, work);
    if (pub?.revisionOf) runNode('scripts/registry.mjs', 'stage-youtube-revision', '--pub', pub.id, '--delete');
    else runNode('scripts/stage-youtube-renders-r2.mjs', '--exam', exam, '--pack-id', work, '--delete', '--commit');
    console.log(`消した: ${pub.id}`);
  }
}

const commands = {
  status,
  plan: () => { const p = buildPlan(ROOT, requirePack(), { scope: args.scope, date: args.date ?? today() }); console.log(JSON.stringify(summarize(p))); },
  generate: async () => console.log(JSON.stringify(await generatePlan(ROOT, requirePack(), { concurrency: Number(args.concurrency ?? 3), log: console.log }))),
  'audit-queue': () => console.log(JSON.stringify(auditQueue(ROOT, requirePack()), null, 2)),
  'record-audit': () => console.log(JSON.stringify(recordAudit(ROOT, requirePack(), JSON.parse(readFileSync(args.file, 'utf8')), { by: args.by }))),
  adopt: async () => console.log(JSON.stringify(await adoptPlan(ROOT, requirePack(), { now: new Date().toISOString() }))),
  render,
  ledger,
  'record-qa': recordQa,
  commit,
  'audio-check': audioCheck,
  wire,
  gate,
  'auto-approve': autoApprove,
  produce,
  finish,
  publish,
  cleanup,
};
if (!commands[command]) { console.error('Usage: npm run video-factory -- status|plan|generate|audit-queue|record-audit|adopt|render|ledger|record-qa|commit|audio-check|wire|gate|auto-approve|produce|finish|publish|cleanup'); process.exit(2); }
await commands[command]();
