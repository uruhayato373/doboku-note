#!/usr/bin/env node
/**
 * check-datasets.mjs — 設定（config/）と記録（data/）の台帳（scripts/lib/datasets.mjs）と実物の整合を検査する。
 *
 *   1. git 管理下の config/・data/ の全ファイルが、ちょうど 1 つのデータセットに当たる（未宣言・重なりは違反）
 *   2. 宣言したデータセットにファイルがある（手元だけ local・未着手 planned を除く）。local に git 管理のファイルは無い
 *      （planned に CI のボットが初めて書いたときは警告だけにする。無関係な PR を赤くしない）
 *   3. id・種類・領域・宣言のキーが正しい（id の重複・KINDS に無い種類・domains.json に無い領域・id の取得元と合わない置き場・
 *      知らないキー（`immutble` のような誤記は黙って無視されるので）は違反）
 *   4. 型（zod）のあるデータセットは、全ファイルが型に合う
 *   5. コード（scripts/・tools/・src/・.claude/）は config/・data/ のパスを直書きせず、台帳から datasetPath などで引く
 *      （置き場を移したとき直書きが旧パスのまま残り、読めずに黙って空を返す不具合を止める）。ファイル名だけの直書き
 *      （`readConfig('exam-stats.json')`）と、`join(ROOT, 'data', 変数)` の分割形も拾う
 *   6. コードと YAML が引く台帳の id（datasetPath('id')・readDataset・writeDataset・freshnessDays・`ci-data latest <id>` など）が台帳にある（無ければ実行時に初めて落ちる）
 *   7. ワークフローと package.json に書いた config/・data/ のパスが台帳に当たる（YAML は main で動くので、移した後に旧パスが
 *      残ると黙って空振りする。DN-0497）
 *   8. 鮮度（freshness: { warnDays, failDays }）の宣言が正しい形（1 以上の整数・warnDays < failDays・知らないキーなし）
 * 検査したファイル数を出し、1 件も読めない・git が失敗したときは検査不成立（exit 2）。違反は exit 1。
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AREAS, DATASETS, KINDS, datasetsFor, freshnessProblems, listAreaFiles, matchFiles, pathMatchesId, resolveDataset } from './lib/datasets.mjs';
import { schemaOf, validateFiles } from './lib/dataset-validate.mjs';
import { loadDomains } from './lib/domains.mjs';
import { REPORT_KINDS } from './lib/metric-reports.mjs';
import { PATH_LITERAL_ALLOW, basenameIndex, findConfigPaths, findDatasetIds, findPathLiterals } from './lib/path-literals.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const warnings = [];

/** 台帳 1 行に書いてよいキー（d() の位置引数と opts） */
const DECLARATION_KEYS = new Set(['id', 'path', 'kind', 'domain', 'doc', 'schema', 'immutable', 'local', 'planned', 'retain', 'freshness']);

function inconclusive(message) {
  console.error(`✗ 検査不成立: ${message}`);
  process.exit(2);
}

let files;
let tracked;
try {
  files = Object.keys(AREAS).flatMap((area) => listAreaFiles(ROOT, area, { tracked: true }));
  tracked = execFileSync('git', ['-C', ROOT, '-c', 'core.quotepath=false', 'ls-files', '-z'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\0')
    .filter(Boolean);
} catch (e) {
  inconclusive(`git から追跡ファイルを取れなかった（${e.message.split('\n')[0]}）`);
}
const { byId, unmatched, ambiguous } = matchFiles(files);
for (const f of unmatched) errors.push(`${f}: 台帳（scripts/lib/datasets.mjs）に当たるデータセットが無い`);
for (const a of ambiguous) errors.push(`${a.file}: 複数のデータセットに当たる（${a.ids.join('・')}）`);

const domainIds = new Set(loadDomains(ROOT).domains.map((d) => d.id));
const seen = new Set();
for (const x of DATASETS) {
  if (seen.has(x.id)) errors.push(`${x.id}: id が重複している`);
  seen.add(x.id);
  if (!/^[a-z0-9]+(\.[a-z0-9-]+)+$/.test(x.id)) errors.push(`${x.id}: id は「取得元.データセット」（英小文字・数字・ハイフン）`);
  if (!pathMatchesId(x)) errors.push(`${x.id}: 置き場 ${x.path} が id の取得元と合わない（config.* は config/、他は data/<取得元>/）`);
  if (!(x.kind in KINDS)) errors.push(`${x.id}: 種類 ${x.kind} は KINDS に無い`);
  if (!domainIds.has(x.domain)) errors.push(`${x.id}: 領域 ${x.domain} は domains.json に無い`);
  try {
    schemaOf(x);
  } catch (e) {
    errors.push(e.message);
  }
  const unknown = Object.keys(x).filter((k) => !DECLARATION_KEYS.has(k));
  if (unknown.length) errors.push(`${x.id}: 台帳の宣言に知らないキー ${unknown.join('・')}（誤記なら直す。新しい宣言なら check-datasets の DECLARATION_KEYS に足す）`);
  if (x.freshness) for (const p of freshnessProblems(x.freshness)) errors.push(`${x.id}: 鮮度の宣言（freshness）が不正 — ${p}`);
  const n = byId.get(x.id)?.length ?? 0;
  if (x.local && n > 0) errors.push(`${x.id}: 手元だけ（local）のはずが git 管理に ${n} ファイルある（.gitignore を確かめる）`);
  if (x.planned && n > 0) warnings.push(`${x.id}: ファイルが入ったので planned を外してよい`);
  if (!x.local && !x.planned && n === 0) errors.push(`${x.id}: 宣言だけでファイルが無い（${x.path}）`);
}

let validated = 0;
const typed = DATASETS.filter((x) => x.schema);
for (const x of typed) {
  const r = validateFiles(ROOT, x, byId.get(x.id) ?? []);
  validated += r.checked;
  for (const e of r.errors) errors.push(`${e.file}: 型（${x.id}）に合わない — ${e.message}`);
}

const CODE_ROOT = /^(scripts|tools|src|\.claude)\//;
const codeFiles = tracked.filter((f) => CODE_ROOT.test(f) && /\.(mjs|cjs|js|mts|ts|tsx)$/.test(f));
const settingFiles = tracked.filter((f) => /^\.github\/workflows\/[^/]+\.ya?ml$/.test(f) || f === 'package.json');
const basenames = basenameIndex(tracked);
let idRefs = 0;
const checkIds = (f, source) => {
  for (const r of findDatasetIds(source)) {
    idRefs++;
    // ci-data latest は GA4・GSC のレポートの種類（ga4.page など。scripts/lib/metric-reports.mjs）も受ける
    if (resolveDataset(r.id) || (r.via === 'ci-data latest' && r.id in REPORT_KINDS)) continue;
    errors.push(`${f}:${r.line}: 台帳に無い id「${r.id}」を引いている（${r.via}）`);
  }
};
for (const f of codeFiles) {
  const source = readFileSync(join(ROOT, f), 'utf8');
  if (!PATH_LITERAL_ALLOW.includes(f)) {
    for (const h of findPathLiterals(source, { basenames })) {
      errors.push(`${f}:${h.line}: config/・data/ のパスを直書きしている（台帳から datasetPath・datasetDir で引く）— ${h.text}`);
    }
  }
  checkIds(f, source);
}

/** 台帳のファイル・ディレクトリ（可変部分の手前）・グロブのどれかに当たるか */
const registeredDirs = DATASETS.map((x) => (x.path.includes('{') ? x.path.slice(0, x.path.lastIndexOf('/', x.path.indexOf('{'))) : x.path));
const isRegistered = (p) => {
  const bare = p.replace(/\/$/, '');
  if (datasetsFor(bare).length) return true;
  if (registeredDirs.some((d) => d === bare || d.startsWith(`${bare}/`) || bare.startsWith(`${d}/`))) return true;
  if (bare.includes('*')) {
    const head = bare.slice(0, bare.indexOf('*')).replace(/\/[^/]*$/, '');
    return registeredDirs.some((d) => d === head || d.startsWith(`${head}/`));
  }
  return Object.values(AREAS).some((a) => a.dir === bare);
};
let settingPaths = 0;
for (const f of settingFiles) {
  const source = readFileSync(join(ROOT, f), 'utf8');
  for (const p of findConfigPaths(source)) {
    settingPaths++;
    if (!isRegistered(p.path)) errors.push(`${f}:${p.line}: 台帳に当たらない config/・data/ のパス「${p.path}」（移したなら新しい置き場か ci-data の id へ）`);
  }
  checkIds(f, source);
}

const count = (pred) => DATASETS.filter(pred).length;
console.log(
  `[check-datasets] 設定とデータ ${files.length} ファイル / データセット ${DATASETS.length}（型あり ${typed.length}・手元だけ ${count((x) => x.local)}・未着手 ${count((x) => x.planned)}）を実検査 / 型の検査 ${validated} ファイル / 直書きの走査 ${codeFiles.length} ファイル（名前で引ける台帳のファイル名 ${basenames.size}）/ id の参照 ${idRefs} 件 / ワークフロー・package.json のパス ${settingPaths} 件 / 違反 ${errors.length} 件`,
);
if (files.length === 0) inconclusive('config/・data/ のファイルを 1 件も読めなかった');
if (codeFiles.length === 0) inconclusive('直書きを走査するコードを 1 件も読めなかった');
for (const w of warnings) console.log(`  ! ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log('[check-datasets] ✓ 台帳と実物は整合（全ファイルがちょうど 1 つのデータセットに当たり、型のあるものは型に合い、コードに config/・data/ の直書きが無く、引く id が台帳にある）');
