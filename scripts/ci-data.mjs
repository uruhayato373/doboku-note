#!/usr/bin/env node
/**
 * ci-data.mjs — ワークフローが記録（data/ ほか）を develop へ書き戻すときの共通処理。YAML にデータのパスを書かないための道具。
 *
 * 定期実行は main の YAML が develop を checkout して動く。YAML にパスを直書きすると、develop でデータを移した時点で
 * main の YAML が古いパスを add し、記録が黙って消える（DN-0497）。パスは台帳（scripts/lib/datasets.mjs）から引き、
 * YAML は置き場の根（data など）か台帳の id だけを渡す。
 *
 *   save <dir> [--paths a,b] [--datasets id,id] [--name n]
 *       作業ツリーで変わったファイル（追加・変更・削除・未追跡）のうち、paths の下か datasets に当たるものを <dir> に退避する
 *   restore <dir> [--exclude-datasets id,id]
 *       退避したファイルを作業ツリーへ戻し、削除を反映する（develop の先頭へ hard reset した後に使う）
 *   add [--paths a,b] [--datasets id,id]
 *       paths は実在する（作業ツリーか index にある）ものだけを git add -A、datasets は当たる変更ファイルだけを add する。
 *       無いパスは飛ばす。git の失敗は隠さない（exit 1）
 *   latest <id>      データセットの最新ファイルのパス（無ければ exit 1）
 *   path <id>        データセットのパス（日時などの可変部分があれば、その手前のディレクトリ）
 *   put <id> <src>   可変部分の無いデータセットの位置へファイルを置く
 *   --root <dir>     対象の作業ツリー（既定はこのスクリプトのリポジトリ。node_modules の無い別の worktree で add するとき）
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { AREAS, areaOf, datasetById, listAreaFiles, matchFiles, patternOf } from './lib/datasets.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const git = (root, args, input) =>
  execFileSync('git', ['-c', 'core.quotepath=false', ...args], { cwd: root, encoding: 'utf8', input, maxBuffer: 256 * 1024 * 1024 });

function dataset(id) {
  const x = datasetById(id);
  if (!x) throw new Error(`台帳に無いデータセット: ${id}`);
  return x;
}

/** データセットのパスのうち、可変部分（{ts} など）の手前のディレクトリ。可変部分が無ければパスそのもの */
export function staticPathOf(id) {
  const { path } = dataset(id);
  const i = path.indexOf('{');
  return i < 0 ? path : path.slice(0, path.lastIndexOf('/', i));
}

const matchesAny = (file, ids) => ids.some((id) => patternOf(dataset(id).path).test(file));

/**
 * git status の変更（-z 形式）。改名は「新しいパスの追加」と「古いパスの削除」に分ける。
 * @returns {{ path: string, deleted: boolean }[]}
 */
export function changedFiles(root, pathspecs) {
  if (pathspecs.length === 0) return [];
  const out = git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--', ...pathspecs]);
  const parts = out.split('\0');
  const entries = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (!p) continue;
    const xy = p.slice(0, 2);
    const path = p.slice(3);
    if (xy[0] === 'R' || xy[0] === 'C') {
      const from = parts[++i];
      entries.push({ path, deleted: false });
      if (xy[0] === 'R') entries.push({ path: from, deleted: true });
      continue;
    }
    entries.push({ path, deleted: xy.includes('D') });
  }
  return entries;
}

/** paths（根）と datasets（id）から、対象の変更ファイルを選ぶ */
function selectChanges(root, { paths = [], datasets = [] }) {
  const specs = [...paths, ...datasets.map(staticPathOf)];
  const all = changedFiles(root, specs);
  return all.filter((e) => paths.some((p) => e.path === p || e.path.startsWith(`${p.replace(/\/$/, '')}/`)) || (datasets.length > 0 && matchesAny(e.path, datasets)));
}

export function save(root, dir, opts) {
  const changes = selectChanges(root, opts);
  const files = changes.filter((e) => !e.deleted).map((e) => e.path);
  const deleted = changes.filter((e) => e.deleted).map((e) => e.path);
  for (const f of files) {
    const dest = join(dir, 'files', f);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(join(root, f), dest);
  }
  mkdirSync(dir, { recursive: true });
  const name = opts.name || `${Date.now()}-${process.pid}`;
  writeFileSync(join(dir, `manifest-${name}.json`), `${JSON.stringify({ files, deleted }, null, 2)}\n`);
  return { files: files.length, deleted: deleted.length };
}

export function restore(root, dir, { excludeDatasets = [] } = {}) {
  let files = 0;
  let deleted = 0;
  let skipped = 0;
  if (!existsSync(dir)) return { files, deleted, skipped, manifests: 0 };
  const manifests = readdirSync(dir).filter((n) => /^manifest-.+\.json$/.test(n)).sort();
  for (const m of manifests) {
    const man = JSON.parse(readFileSync(join(dir, m), 'utf8'));
    for (const f of man.files) {
      if (excludeDatasets.length && matchesAny(f, excludeDatasets)) {
        skipped++;
        continue;
      }
      const dest = join(root, f);
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(join(dir, 'files', f), dest);
      files++;
    }
    for (const f of man.deleted) {
      if (excludeDatasets.length && matchesAny(f, excludeDatasets)) {
        skipped++;
        continue;
      }
      if (existsSync(join(root, f))) {
        rmSync(join(root, f), { force: true });
        deleted++;
      }
    }
  }
  return { files, deleted, skipped, manifests: manifests.length };
}

export function add(root, { paths = [], datasets = [] }) {
  const tracked = (p) => git(root, ['ls-files', '-z', '--', p]).length > 0;
  const specs = paths.filter((p) => existsSync(join(root, p)) || tracked(p));
  const skipped = paths.filter((p) => !specs.includes(p));
  if (datasets.length) {
    for (const e of changedFiles(root, datasets.map(staticPathOf).filter((p) => existsSync(join(root, p)) || tracked(p)))) {
      if (matchesAny(e.path, datasets)) specs.push(e.path);
    }
  }
  if (specs.length) git(root, ['add', '-A', '--pathspec-from-file=-', '--pathspec-file-nul'], `${specs.join('\0')}\0`);
  const staged = git(root, ['diff', '--cached', '--name-only', '-z']).split('\0').filter(Boolean).length;
  return { specs: specs.length, skipped, staged };
}

export function latest(root, id) {
  const x = dataset(id);
  const files = listAreaFiles(root, areaOf(x));
  return matchFiles(files).byId.get(id)?.[0] ?? null;
}

// ---- CLI ---------------------------------------------------------------------------------

function parse(argv) {
  const opts = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) opts[a.slice(2)] = argv[++i] ?? '';
    else opts._.push(a);
  }
  const list = (v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);
  return { ...opts, paths: list(opts.paths), datasets: list(opts.datasets), excludeDatasets: list(opts['exclude-datasets']) };
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const o = parse(rest);
  const root = o.root ? resolve(o.root) : ROOT;
  const need = (cond, msg) => {
    if (!cond) {
      console.error(`[ci-data] ${msg}`);
      process.exit(2);
    }
  };
  if (cmd === 'save') {
    need(o._[0], 'save <dir> が要る');
    need(o.paths.length || o.datasets.length, '--paths か --datasets が要る');
    const r = save(root, o._[0], o);
    console.log(`[ci-data] save: 退避 ${r.files} ファイル・削除 ${r.deleted} 件（${[...o.paths, ...o.datasets].join(', ')}）`);
  } else if (cmd === 'restore') {
    need(o._[0], 'restore <dir> が要る');
    const r = restore(root, o._[0], o);
    console.log(`[ci-data] restore: 戻した ${r.files} ファイル・削除 ${r.deleted} 件・除外 ${r.skipped} 件（manifest ${r.manifests}）`);
  } else if (cmd === 'add') {
    need(o.paths.length || o.datasets.length, '--paths か --datasets が要る');
    const r = add(root, o);
    if (r.skipped.length) console.log(`[ci-data] add: 無いので飛ばした ${r.skipped.join(', ')}`);
    console.log(`[ci-data] add: 対象 ${r.specs} 件・stage 済み ${r.staged} ファイル`);
  } else if (cmd === 'latest') {
    need(o._[0], 'latest <id> が要る');
    const p = latest(root, o._[0]);
    if (!p) process.exit(1);
    process.stdout.write(`${p}\n`);
  } else if (cmd === 'path') {
    need(o._[0], 'path <id> が要る');
    process.stdout.write(`${staticPathOf(o._[0])}\n`);
  } else if (cmd === 'put') {
    need(o._[0] && o._[1], 'put <id> <src> が要る');
    const x = dataset(o._[0]);
    need(!x.path.includes('{'), `${x.id} はパスに可変部分があるので put できない`);
    mkdirSync(dirname(join(root, x.path)), { recursive: true });
    copyFileSync(o._[1], join(root, x.path));
    console.log(`[ci-data] put: ${o._[1]} → ${x.path}`);
  } else {
    console.error(`使い方: node scripts/ci-data.mjs <save|restore|add|latest|path|put> …（${Object.keys(AREAS).join('・')} の台帳は scripts/lib/datasets.mjs）`);
    process.exit(2);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
