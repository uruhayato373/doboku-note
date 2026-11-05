#!/usr/bin/env node
/**
 * video-agent-review.mjs — 承認待ちの動画を video-review エージェントが確認し、運営者がまとめて承認するための入口
 *
 *   npm run video-review -- queue                 確認する動画と素材の場所を出す
 *   npm run video-review -- sheet --pub <ID>      場面の画像を一覧の画像にする（.tmp/video-review/）
 *   npm run video-review -- record --pub <ID> --verdict pass|fail --note "理由"   判定を記録する
 *   npm run video-review -- summary               判定の一覧を出す
 *   npm run video-review -- approve [--commit]    pass の動画を承認する（運営者だけ。既定は表示のみ）
 *
 * 判定は digest ごとに持つ。素材や文面が変わると、その判定は無効になる。承認の主体は運営者のまま変えない。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { loadRegistry } from './lib/content-registry.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { readJsonIf } from './lib/json-io.mjs';
import { resolveVaultRoot, vaultAbsFor } from './lib/drive-vault.mjs';
import { MEDIA_ROOT } from './lib/media-paths.mjs';
import { approvalState, reviewIsCurrent } from './lib/media-review.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';

const ROOT = REPO_ROOT;
const STORE_PATH = datasetPath('state.video-agent-reviews');
const STORE = join(ROOT, STORE_PATH);
const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: { pub: { type: 'string' }, verdict: { type: 'string' }, note: { type: 'string' }, commit: { type: 'boolean' }, all: { type: 'boolean' } },
});
const [command] = positionals;
const load = () => readJsonIf(ROOT, STORE_PATH) ?? { schemaVersion: 1, reviews: {} };
const save = (d) => writeFileSync(STORE, `${JSON.stringify(d, null, 2)}\n`);

/** 素材の実体の場所。手元に無ければ Drive のマウントを見る */
function locate(mediaById, pub, role) {
  const path = mediaById.get(pub.media?.[role])?.store?.path;
  if (!path) return null;
  const abs = join(ROOT, path);
  if (existsSync(abs)) return abs;
  const vault = resolveVaultRoot();
  if (!vault.root || !path.startsWith(`${MEDIA_ROOT}/`)) return null;
  const inVault = vaultAbsFor(vault.root, `制作物/コンテンツ/${path.slice(MEDIA_ROOT.length + 1)}`);
  return existsSync(inVault) ? inVault : null;
}

function queue(statuses = ['qa_passed']) {
  const reg = loadRegistry(ROOT);
  const mediaById = new Map(reg.media.map((m) => [m.id, m]));
  return reg.publications
    .filter((p) => p.channel === 'youtube' && statuses.includes(p.status))
    .map((pub) => {
      const state = approvalState(ROOT, pub, mediaById);
      return { pub, state, sheet: locate(mediaById, pub, 'contact-sheet'), cover: locate(mediaById, pub, 'cover') };
    });
}

function current(row) {
  const r = load().reviews[row.pub.id];
  return reviewIsCurrent(r, row.state) ? r : null;
}

function showQueue() {
  const rows = queue();
  for (const row of rows) {
    const r = current(row);
    console.log([row.pub.id, r ? r.verdict : '未確認', row.sheet ?? 'シート無し', row.cover ?? '表紙無し'].join('\t'));
  }
  console.log(`承認待ち ${rows.length} 本`);
}

/** 場面の画像を 5 列 4 行ずつの一覧にする。確認の素材は Drive にあるので、再描画せずに見られる */
async function sheet() {
  const sharp = (await import('sharp')).default;
  const reg = loadRegistry(ROOT);
  const mediaById = new Map(reg.media.map((m) => [m.id, m]));
  const pub = reg.publications.find((p) => p.id === args.pub);
  if (!pub) throw new Error(`台帳に無い: ${args.pub}`);
  const roles = Object.keys(pub.media ?? {}).filter((r) => /^scene-\d+$/.test(r)).sort();
  const files = roles.map((r) => locate(mediaById, pub, r));
  const missing = files.filter((f) => !f).length;
  const out = join(ROOT, '.tmp/video-review');
  mkdirSync(out, { recursive: true });
  const W = 384; const H = 216; const COLS = 5; const PAGE = 20;
  const name = pub.id.replaceAll('/', '_');
  for (let page = 0; page * PAGE < files.length; page += 1) {
    const slice = files.slice(page * PAGE, (page + 1) * PAGE);
    const rows = Math.ceil(slice.length / COLS);
    const composite = [];
    for (const [i, file] of slice.entries()) {
      if (!file) continue;
      const input = await sharp(file).resize(W, H, { fit: 'contain', background: '#ffffff' }).png().toBuffer();
      composite.push({ input, left: (i % COLS) * W, top: Math.floor(i / COLS) * H });
    }
    const path = join(out, `${name}-${page + 1}.png`);
    await sharp({ create: { width: W * COLS, height: H * rows, channels: 3, background: '#ffffff' } }).composite(composite).png().toFile(path);
    console.log(path);
  }
  console.log(`場面 ${files.length} 枚・欠け ${missing} 枚`);
}

function record() {
  if (!args.pub || !['pass', 'fail'].includes(args.verdict) || !args.note) throw new Error('record には --pub --verdict pass|fail --note が要る');
  // 予約後に文面を直した動画も、関門を通し直すために記録できる
  const row = queue(['qa_passed', 'scheduled']).find((x) => x.pub.id === args.pub);
  if (!row) throw new Error(`確認の対象に無い: ${args.pub}`);
  if (!row.state.visual.current) throw new Error('画面確認の素材が無い。先に npm run media -- preview で作る');
  const d = load();
  d.reviews[args.pub] = {
    verdict: args.verdict,
    note: args.note,
    at: new Date().toISOString(),
    visualDigest: row.state.visual.current,
    finalDigest: row.state.final.current,
    contentDigest: row.state.content,
  };
  save(d);
  console.log(`${args.verdict}: ${args.pub}`);
}

function summary() {
  const rows = queue().map((row) => ({ row, r: current(row) }));
  const count = (v) => rows.filter((x) => (x.r?.verdict ?? 'none') === v).length;
  console.log(`pass ${count('pass')} ／ fail ${count('fail')} ／ 未確認 ${count('none')}`);
  for (const { row, r } of rows) if (r?.verdict === 'fail') console.log(`fail\t${row.pub.id}\t${r.note}`);
}

function approve() {
  if (process.env.CLAUDECODE === '1') throw new Error('承認は運営者だけ。ターミナルから実行する');
  const targets = queue().filter((row) => current(row)?.verdict === 'pass');
  console.log(`承認の対象 ${targets.length} 本`);
  for (const { pub, state } of targets) {
    console.log(pub.id);
    if (!args.commit) continue;
    for (const [stage, expect] of [['visual', state.visual.current], ['final', state.final.current]]) {
      if (stage === 'visual' && state.visual.valid) continue;
      execFileSync('npm', ['run', '-s', 'registry', '--', 'approve', '--pub', pub.id, '--stage', stage, '--expect', expect], { cwd: ROOT, stdio: 'inherit' });
    }
  }
  if (!args.commit) console.log('確認だけ。承認するなら --commit を付ける');
}

const commands = { queue: showQueue, sheet, record, summary, approve };
if (!commands[command]) {
  console.error('Usage: npm run video-review -- queue|sheet|record|summary|approve');
  process.exit(2);
}
await commands[command]();
