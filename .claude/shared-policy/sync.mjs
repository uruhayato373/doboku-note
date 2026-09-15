import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const consumers = { stats47: 'stats47-monorepo', 'doboku-note': 'doboku-note' };
const folder = '.claude/shared-policy';
/** 配布する文書。キー = 消費側の `.claude/shared-policy/` 内のファイル名、値 = obsidian の正本。先頭が主文書（manifest のトップレベル version/updated/sourcePath に載る）。 */
const docs = {
  'POLICY.md': 'memos/共通事業方針SSOT.md',
  'REPURPOSE.md': 'memos/リパーパス戦略SSOT.md',
  'STRUCTURE.md': 'memos/note記事構成SSOT.md',
};
const primaryDoc = Object.keys(docs)[0];
const hash = (text) => createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');
const read = (file) => readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const json = (file) => JSON.parse(read(file));
const serialize = (value) => `${JSON.stringify(value, null, 2)}\n`;

/** SSOTの先頭YAMLフロントマターから version/updated だけを拾う簡易パーサ（コメント行 `#` は無視）。 */
export function frontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) throw new Error('Missing frontmatter in shared policy SSOT');
  const fields = {};
  for (const line of match[1].split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const [, key, value] = line.match(/^(\w+):\s*(.+)$/) ?? [];
    if (key) fields[key] = value.trim();
  }
  if (!fields.version || !fields.updated) throw new Error('Shared policy SSOT frontmatter missing version/updated');
  return fields;
}

/**
 * SSOT本文をそのまま配布する。生成コメントはYAMLフロントマター内の `#` コメント行として
 * 挿入する(本文中のHTMLコメントとして入れると、react-markdown等が素通しして可視テキスト化する)。
 */
export function render(sourceText, sourceDoc) {
  return sourceText.replace(
    /^---\n([\s\S]*?)\n---\n/,
    (_, fm) => `---\n${fm}\n# GENERATED FROM: ${sourceDoc} (obsidian). DO NOT EDIT.\n---\n`,
  );
}

function identity(root) {
  const name = json(join(root, 'package.json')).name;
  const id = Object.keys(consumers).find((key) => consumers[key] === name);
  if (!id) throw new Error(`Unknown consumer: ${root}`);
  return id;
}

export function outputs(source) {
  if (json(join(source, 'package.json')).name !== 'obsidian-scripts') throw new Error('Invalid source repository');
  const files = {};
  const meta = {};
  for (const [name, sourceDoc] of Object.entries(docs)) {
    const sourceText = read(join(source, sourceDoc));
    const { version, updated } = frontmatter(sourceText);
    files[`${folder}/${name}`] = render(sourceText, sourceDoc);
    meta[name] = { sourcePath: sourceDoc, version, updated };
  }
  files[`${folder}/sync.mjs`] = read(join(source, folder, 'sync.mjs'));
  const manifest = {
    schemaVersion: 2,
    source: 'obsidian',
    // トップレベルは主文書（POLICY.md）の値。stats47 admin 等の既存読者との互換のため残す
    sourcePath: meta[primaryDoc].sourcePath,
    version: meta[primaryDoc].version,
    updated: meta[primaryDoc].updated,
    docs: meta,
    files: Object.fromEntries(Object.entries(files).map(([path, text]) => [path, hash(text)])),
  };
  return { ...files, [`${folder}/manifest.json`]: serialize(manifest) };
}

/**
 * 消費側の配布物が manifest どおりか（手編集・欠落が無いか）を検査する。
 * 検査対象は manifest が自己申告するファイル集合。正本側の現行文書セットとの差（文書の追加・削除）は
 * synchronize の --check が見る——ここで現行セットを要求すると、旧 manifest からの更新自体が拒否される。
 */
export function verify(root) {
  identity(root);
  const manifest = json(join(root, folder, 'manifest.json'));
  const listed = Object.keys(manifest.files ?? {});
  if (![1, 2].includes(manifest.schemaVersion) || manifest.source !== 'obsidian' ||
      !listed.includes(`${folder}/sync.mjs`) || listed.some((path) => !path.startsWith(`${folder}/`))) throw new Error('Invalid manifest');
  for (const path of listed) {
    if (!existsSync(join(root, path)) || hash(read(join(root, path))) !== manifest.files[path]) {
      throw new Error(`Shared policy modified or missing: ${path}`);
    }
  }
  return manifest;
}

export function synchronize({ source, targets, check = false }) {
  if (!targets.length) throw new Error('No target repositories');
  // Validate every target before writing any repository; never overwrite consumer edits.
  const plans = targets.map((root) => {
    identity(root);
    const files = outputs(source);
    if (existsSync(join(root, folder, 'manifest.json'))) verify(root);
    else if (check || Object.keys(files).some((path) => existsSync(join(root, path)))) throw new Error(`Missing manifest or unmanaged files: ${root}`);
    if (check) for (const [path, text] of Object.entries(files)) {
      if (!existsSync(join(root, path)) || read(join(root, path)) !== text) throw new Error(`Shared policy is out of date: ${root}/${path}`);
    }
    return { root, files };
  });
  if (!check) for (const { root, files } of plans) for (const [path, text] of Object.entries(files)) {
    const destination = join(root, path);
    if (existsSync(destination) && read(destination) === text) continue;
    mkdirSync(dirname(destination), { recursive: true });
    const temp = `${destination}.${process.pid}.tmp`;
    writeFileSync(temp, text);
    renameSync(temp, destination);
  }
  return plans.length;
}

function main() {
  const args = process.argv.slice(2);
  const value = (flag) => { const i = args.indexOf(flag); if (i < 0) return undefined; if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Missing value: ${flag}`); return resolve(args[i + 1]); };
  for (let i = 0; i < args.length; i++) {
    if (['--source', '--target'].includes(args[i])) { i++; continue; }
    if (!['--sync', '--check', '--all', '--staged'].includes(args[i])) throw new Error(`Unknown option: ${args[i]}`);
  }
  if (args.includes('--sync') === args.includes('--check')) throw new Error('Choose --sync or --check');
  const here = dirname(fileURLToPath(import.meta.url));
  const root = resolve(here, '../..');
  const central = json(join(root, 'package.json')).name === 'obsidian-scripts';
  if (args.includes('--staged')) {
    // pre-commit 用: 配布対象（正本 SSOT か sync.mjs 自身）が staged なときだけ検査する。
    // 正本を直して commit したのに配布し忘れる事故を、その場で止めるのが目的。
    if (!central) throw new Error('--staged is only available at the source');
    const staged = execFileSync('git', ['-c', 'core.quotepath=false', 'diff', '--cached', '--name-only', '--diff-filter=ACMR'], { cwd: root, encoding: 'utf8' })
      .split('\n').map((line) => line.trim().replace(/\\/g, '/')).filter(Boolean);
    const watched = [...Object.values(docs), `${folder}/sync.mjs`];
    const hit = staged.filter((path) => watched.includes(path));
    if (!hit.length) return;
    console.log(`shared-policy: 配布対象が staged（${hit.join(', ')}）→ 配布状態を検査`);
    process.on('exit', (code) => { if (code) console.error('  → 正本を変えたら `npm run policy:sync` で配布し、stats47 / doboku-note 側も commit してください。'); });
  }
  const source = value('--source') ?? (central ? root : resolve(root, '../obsidian'));
  const target = value('--target');
  if (args.includes('--all') && !central) throw new Error('--all is only available at the source');
  let targets = args.includes('--all') ? Object.keys(consumers).map((id) => resolve(source, '..', id)) : [target ?? root];
  if (args.includes('--all')) {
    // 消費側リポは同じ親ディレクトリに checkout されている前提。無い環境（CI・単独 clone）では
    // 検査できないだけで異常ではないので SKIP にする（ここで落ちると npm run check の全ガードが道連れになる）。
    const missing = targets.filter((root) => !existsSync(join(root, 'package.json')));
    for (const root of missing) console.log(`SKIP ${root}: not checked out here`);
    targets = targets.filter((root) => !missing.includes(root));
    if (!targets.length) { console.log(`SKIP ${args.includes('--check') ? 'check' : 'sync'}: no consumer repositories checked out`); return; }
  }
  if (!existsSync(source) && !central && args.includes('--check') && !args.includes('--source')) {
    const manifest = verify(root);
    console.log(`PASS local integrity: ${manifest.version}; source unavailable, latest version not checked`);
    return;
  }
  const count = synchronize({ source, targets, check: args.includes('--check') });
  console.log(`PASS ${args.includes('--check') ? 'check' : 'sync'}: ${count}/${targets.length} repositories`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
