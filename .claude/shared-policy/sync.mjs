import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const consumers = { stats47: 'stats47-monorepo', 'doboku-note': 'doboku-note' };
const folder = '.claude/shared-policy';
const sourceDoc = '.claude/共通事業方針SSOT.md';
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
export function render(sourceText) {
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

function outputs(source) {
  if (json(join(source, 'package.json')).name !== 'obsidian-scripts') throw new Error('Invalid source repository');
  const sourceText = read(join(source, sourceDoc));
  const { version, updated } = frontmatter(sourceText);
  const files = {
    [`${folder}/POLICY.md`]: render(sourceText),
    [`${folder}/sync.mjs`]: read(join(source, folder, 'sync.mjs')),
  };
  const manifest = {
    schemaVersion: 1,
    source: 'obsidian',
    sourcePath: sourceDoc,
    version,
    updated,
    files: Object.fromEntries(Object.entries(files).map(([path, text]) => [path, hash(text)])),
  };
  return { ...files, [`${folder}/manifest.json`]: serialize(manifest) };
}

export function verify(root) {
  identity(root);
  const manifest = json(join(root, folder, 'manifest.json'));
  const required = [`${folder}/POLICY.md`, `${folder}/sync.mjs`];
  if (manifest.schemaVersion !== 1 || manifest.source !== 'obsidian' ||
      Object.keys(manifest.files ?? {}).sort().join('|') !== required.sort().join('|')) throw new Error('Invalid manifest');
  for (const path of required) {
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
      if (read(join(root, path)) !== text) throw new Error(`Shared policy is out of date: ${root}/${path}`);
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
    if (!['--sync', '--check', '--all'].includes(args[i])) throw new Error(`Unknown option: ${args[i]}`);
  }
  if (args.includes('--sync') === args.includes('--check')) throw new Error('Choose --sync or --check');
  const here = dirname(fileURLToPath(import.meta.url));
  const root = resolve(here, '../..');
  const central = json(join(root, 'package.json')).name === 'obsidian-scripts';
  const source = value('--source') ?? (central ? root : resolve(root, '../obsidian'));
  const target = value('--target');
  if (args.includes('--all') && !central) throw new Error('--all is only available at the source');
  const targets = args.includes('--all') ? Object.keys(consumers).map((id) => resolve(source, '..', id)) : [target ?? root];
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
