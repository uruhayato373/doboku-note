#!/usr/bin/env node
/**
 * report-sns-archive-candidates.mjs — SNS バイナリ（reels の wav/mp4・YouTube Shorts の mp4）を Drive vault へ退避する前の、パック単位の判定
 * （旧 sns-archive-auditor の OFFLOAD / ARCHIVE_KEEP / KEEP_LOCAL / BLOCK を移した・DN-1242）
 * ---------------------------------------------------------------------------
 * 退避の実行は drive-vault-sync（sha256 の読み直し一致だけ台帳へ載せる・ローカルは消さない）。ここは「手放してよいか」だけを決める。
 * 判定は上から順（安全最優先。迷ったら KEEP / BLOCK）:
 *   BLOCK       SoT（再生成の元）が欠けている・壊れている → ローカル削除禁止。SoT の復元が先
 *                 reels の wav/mp4 … slide-data.json（JSON として妥当）＋ reels/script.txt（または script.json）
 *                 carousel/ があるとき … carousel/caption.txt
 *                 YouTube のパック … meta.json / script.json / script.txt / slide-data.json のどれか 1 つ（JSON は妥当であること）
 *   KEEP_LOCAL  status.json が draft など未確定・status.json が無く直近 90 日以内に更新（制作中）
 *   ARCHIVE_KEEP 投稿予定（scheduled）・投稿済みでも直近 14 日以内の更新 → vault へバックアップのみ
 *   OFFLOAD     SoT 無傷 ＋ 投稿済み（posted_at / status=posted）で 14 日以上更新なし、または status.json 無しで 90 日以上更新なし（confidence low）
 * 候補の範囲は config/drive-vault.json の group sns-archived-media（pathRegex）。ここで vault 側の一致は見ない（drive-vault-sync --verify --cloud が持つ）。
 *
 * 使い方: node scripts/reports/report-sns-archive-candidates.mjs [--path <repo 相対の接頭辞>] [--root <repo>] [--now <ISO>] [--json]
 * exit: 0=判定した（BLOCK があっても 0・一覧に出す。候補 0 件も「退避する物が無い」で 0）/ 2=検査不成立（group の定義が読めない）
 * ---------------------------------------------------------------------------
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { parseCliArgs } from '../lib/cli-args.mjs';
import { datasetPath } from '../lib/datasets.mjs';
import { listFiles } from '../lib/fs-walk.mjs';
import { REPO_ROOT } from '../lib/repository-paths.mjs';
import { readJsonOrNull } from '../lib/run-audit.mjs';
import { isCliEntry } from '../lib/cli-run.mjs';

const TAG = '[report-sns-archive-candidates]';
export const GROUP_ID = 'sns-archived-media';
export const RECENT_DAYS = 14;
export const OLD_DAYS = 90;
const BIN_DIRS = new Set(['reels', 'shorts', 'video', 'videos']);

const filesUnder = (dir) => listFiles(dir, { allowMissing: true, skipDir: (_p, name) => name === 'node_modules' || name === '.git' });

const validJson = (p) => { const j = readJsonOrNull(p); return j !== null && typeof j === 'object' && Object.keys(j).length > 0; };

/** パック（バイナリを含む制作単位）の SoT の欠けを返す（空配列なら無傷）。 */
export function sotProblems(packDir, { hasReels, isYoutube }) {
  const p = [];
  const at = (...s) => join(packDir, ...s);
  if (hasReels) {
    if (!existsSync(at('slide-data.json'))) p.push('slide-data.json が無い');
    else if (!validJson(at('slide-data.json'))) p.push('slide-data.json が JSON として壊れている・空');
    if (!existsSync(at('reels', 'script.txt')) && !existsSync(at('reels', 'script.json'))) p.push('reels/script.txt（または script.json）が無い');
  }
  if (isYoutube && !hasReels) {
    const cands = ['meta.json', 'script.json', 'slide-data.json'].filter((f) => existsSync(at(f)) && validJson(at(f)));
    if (cands.length === 0 && !existsSync(at('script.txt'))) p.push('meta.json / script.json / script.txt / slide-data.json のどれも無い（壊れている）');
  }
  if (existsSync(at('carousel')) && !existsSync(at('carousel', 'caption.txt'))) p.push('carousel/caption.txt が無い');
  return p;
}

/** status.json から投稿の状態を決める（pure）。 */
export function postState(status) {
  const entries = Object.values(status ?? {}).filter((v) => v && typeof v === 'object' && !Array.isArray(v) && ('status' in v || 'posted_at' in v));
  if (entries.length === 0) return 'none';
  if (entries.every((e) => e.posted_at || e.status === 'posted')) return 'posted';
  if (entries.some((e) => e.status === 'scheduled')) return 'scheduled';
  return 'draft';
}

/** pure。mtime から経過日数、SoT 問題、投稿状態を受けて verdict を返す。 */
export function judgePack({ problems, state, ageDays }) {
  if (problems.length > 0) return { verdict: 'BLOCK', confidence: 'high', reason: `SoT 欠落: ${problems.join(' / ')}` };
  if (state === 'draft') return { verdict: 'KEEP_LOCAL', confidence: 'high', reason: 'status.json が未確定（draft など）＝制作中' };
  if (state === 'scheduled') return { verdict: 'ARCHIVE_KEEP', confidence: 'med', reason: '投稿予定（scheduled）。手元で見たいのでバックアップのみ' };
  if (state === 'posted') {
    return ageDays >= RECENT_DAYS
      ? { verdict: 'OFFLOAD', confidence: 'high', reason: `SoT 無傷＋投稿済み＋${Math.floor(ageDays)} 日更新なし` }
      : { verdict: 'ARCHIVE_KEEP', confidence: 'med', reason: `投稿済みだが直近 ${RECENT_DAYS} 日以内の更新（${Math.floor(ageDays)} 日前）` };
  }
  return ageDays >= OLD_DAYS
    ? { verdict: 'OFFLOAD', confidence: 'low', reason: `status.json 無し・SoT 無傷・${Math.floor(ageDays)} 日更新なし（旧パック）` }
    : { verdict: 'KEEP_LOCAL', confidence: 'med', reason: `status.json 無しで直近 ${OLD_DAYS} 日以内の更新（制作中の可能性）` };
}

export function collectCandidates({ root, prefix = '', now = Date.now() }) {
  const cfg = readJsonOrNull(join(root, datasetPath('config.drive-vault')));
  const group = (cfg?.groups ?? []).find((g) => g.id === GROUP_ID);
  if (!group?.match?.pathRegex) return { error: `Drive vault の設定に group ${GROUP_ID} の pathRegex が無い`, packs: [] };
  const re = new RegExp(group.match.pathRegex);
  const files = filesUnder(join(root, 'content', 'sns')).map((p) => ({ abs: p, rel: relative(root, p).split('\\').join('/') }))
    .filter((f) => re.test(f.rel) && f.rel.startsWith(prefix));
  const byPack = new Map();
  for (const f of files) {
    let dir = dirname(f.abs);
    let hasReels = false;
    if (BIN_DIRS.has(basename(dir))) { hasReels = basename(dir) === 'reels'; dir = dirname(dir); }
    const e = byPack.get(dir) ?? { dir, hasReels: false, files: [] };
    e.hasReels ||= hasReels;
    e.files.push(f);
    byPack.set(dir, e);
  }
  const packs = [];
  for (const e of byPack.values()) {
    const rel = relative(root, e.dir).split('\\').join('/');
    const isYoutube = rel.startsWith('content/sns/youtube/');
    const status = readJsonOrNull(join(e.dir, 'status.json'));
    const mtime = Math.max(...filesUnder(e.dir).map((p) => statSync(p).mtimeMs));
    const ageDays = (now - mtime) / 86_400_000;
    const problems = sotProblems(e.dir, { hasReels: e.hasReels, isYoutube });
    const mb = e.files.reduce((n, f) => n + statSync(f.abs).size, 0) / 1048576;
    packs.push({ pack: rel, binaries: e.files.length, mb: Math.round(mb * 10) / 10, state: postState(status), ageDays: Math.round(ageDays), ...judgePack({ problems, state: postState(status), ageDays }) });
  }
  packs.sort((a, b) => a.pack.localeCompare(b.pack));
  return { error: null, packs };
}

const isMain = isCliEntry(import.meta.url);
if (isMain) {
  const args = parseCliArgs({ path: { type: 'string' }, root: { type: 'string' }, now: { type: 'string' }, json: { type: 'boolean' } });
  const { error, packs } = collectCandidates({ root: args.root ?? REPO_ROOT, prefix: args.path ?? '', now: args.now ? Date.parse(args.now) : Date.now() });
  const code = error ? 2 : 0;
  const by = (v) => packs.filter((p) => p.verdict === v);
  const cmd = (p) => `npm run drive-vault-sync -- --group ${GROUP_ID} --path ${p.pack}/ --commit`;
  if (args.json) console.log(JSON.stringify({ check: 'sns-archive-candidates', error, packs, counts: Object.fromEntries(['OFFLOAD', 'ARCHIVE_KEEP', 'KEEP_LOCAL', 'BLOCK'].map((v) => [v, by(v).length])), exit: code }, null, 2));
  else {
    if (error) console.error(`${TAG} ${error}`);
    for (const v of ['OFFLOAD', 'ARCHIVE_KEEP', 'KEEP_LOCAL', 'BLOCK']) {
      for (const p of by(v)) console.log(`${TAG} ${v} ${p.pack}（${p.binaries} 本・${p.mb}MB・confidence ${p.confidence}）${p.reason}${v === 'OFFLOAD' || v === 'ARCHIVE_KEEP' ? `\n    実行: ${cmd(p)}${v === 'OFFLOAD' ? ' → --verify --deep --cloud → ローカル削除（人）' : ''}` : ''}`);
    }
    const off = by('OFFLOAD').reduce((n, p) => n + p.mb, 0);
    console.log(`${TAG} 候補 ${packs.length} パック（OFFLOAD ${by('OFFLOAD').length}・${Math.round(off * 10) / 10}MB / ARCHIVE_KEEP ${by('ARCHIVE_KEEP').length} / KEEP_LOCAL ${by('KEEP_LOCAL').length} / BLOCK ${by('BLOCK').length}）`);
    if (!error && packs.length === 0) console.log(`${TAG} 退避する物は無い（content/sns に退避対象の wav/mp4 が無い）`);
  }
  process.exit(code);
}
