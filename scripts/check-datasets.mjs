#!/usr/bin/env node
/**
 * check-datasets.mjs — 設定（config/）・記録（data/）・作業状態（.claude/state/）の台帳（scripts/lib/datasets.mjs）と実物の整合を検査する。
 *
 *   1. git 管理下の config/・data/・.claude/state/ の全ファイルが、ちょうど 1 つのデータセットに当たる（未宣言・重なりは違反）
 *   2. 宣言したデータセットにファイルがある（手元だけ local・Drive vault の drive・未着手 planned を除く）。local・drive に git 管理のファイルは無い
 *      （planned に CI のボットが初めて書いたときは警告だけにする。無関係な PR を赤くしない）。local は作り直し方（regen）を持つ。
 *      drive は config/drive-vault.json の active な group を指し、その group の pathRegex が台帳のパスに当たる。置き場の外のパスは drive だけ
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
 *   9. config/・data/（strict の置き場）の JSON・JSON Lines のデータセットは型（schema）を持つ（.claude/state/ は任意）（型が無いと形が崩れても書き戻し・検査が素通りする）。
 *      planned に CI のボットが初めて書いたときは 2. と同じく警告だけにする
 *  10. JSON に同じオブジェクト内の重複キーが無い（JSON.parse は後ろの値で黙って上書きするので型では見えない）
 *  11. .claude/state/ のパスの直書きを増やさない（ファイルごとの件数を .claude/config/state-path-literal-baseline.json と比べるラチェット。
 *      基準線より多い・基準線に無いファイルは違反、減ったら基準線を下げさせる）
 *  12. refs を宣言したデータセットは、全ファイルで参照（資格 id・商品 id・記事 slug）が参照先に実在する（外部キー相当・DN-0586）。
 *      宣言の形（at・to）も見る。宣言があるのに参照を 1 件も読めなかったら検査不成立
 * 検査したファイル数を出し、1 件も読めない・git が失敗したときは検査不成立（exit 2）。違反は exit 1。
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AREAS, DATASETS, KINDS, areaOf, datasetFiles, datasetsFor, freshnessProblems, listAreaFiles, matchFiles, pathMatchesId, patternOf, resolveDataset } from './lib/datasets.mjs';
import { readDataset } from './lib/dataset-io.mjs';
import { REF_TARGETS, checkRefs, refResolvers } from './lib/dataset-refs.mjs';
import { schemaOf, validateFiles } from './lib/dataset-validate.mjs';
import { loadDomains } from './lib/domains.mjs';
import { findDuplicateKeys } from './lib/json-duplicate-keys.mjs';
import { REPORT_KINDS } from './lib/metric-reports.mjs';
import { PATH_LITERAL_ALLOW, basenameIndex, findConfigPaths, findDatasetIds, findPathLiterals, findStatePathLiterals } from './lib/path-literals.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const warnings = [];

/** 台帳 1 行に書いてよいキー（d() の位置引数と opts） */
const DECLARATION_KEYS = new Set(['id', 'path', 'kind', 'domain', 'doc', 'schema', 'immutable', 'local', 'drive', 'regen', 'planned', 'retain', 'freshness', 'refs']);
/** .claude/state/ の直書きの基準線（ファイル → 件数） */
const STATE_LITERAL_BASELINE = '.claude/config/state-path-literal-baseline.json';
/** 台帳のパスの可変部分を、drive の group の pathRegex に当てる見本の値にする */
const SAMPLE = { '{**}': 'x/y.json', '{ts}': '2026-01-01T00-00-00Z', '{date}': '2026-01-01', '{month}': '2026-01', '{week}': '2026-W01', '{suffix}': '', '{rev}': '', '{rerun}': '' };
const sampleOf = (path) => path.replace(/\{[^}]+\}/g, (m) => SAMPLE[m] ?? 'x');

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
const driveGroups = new Map(readDataset(ROOT, 'config.drive-vault').groups.map((g) => [g.id, g]));
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
  const area = areaOf(x);
  const n = byId.get(x.id)?.length ?? (area ? 0 : tracked.filter((f) => patternOf(x.path).test(f)).length);
  if (x.local && x.drive) errors.push(`${x.id}: local と drive は同時に付けない（Drive vault に置くなら drive だけ）`);
  if (x.local && n > 0) errors.push(`${x.id}: 手元だけ（local）のはずが git 管理に ${n} ファイルある（.gitignore を確かめる）`);
  if (x.local && !x.regen) errors.push(`${x.id}: 手元だけ（local）は作り直せる一時出力に限る。作り直し方を regen に書く（記録・判定なら git か Drive vault（drive）へ）`);
  if (x.drive) {
    const g = driveGroups.get(x.drive);
    if (!g) errors.push(`${x.id}: drive の group「${x.drive}」が Drive vault の設定（config.drive-vault）に無い`);
    else if (g.status !== 'active') errors.push(`${x.id}: drive の group「${x.drive}」が active でない（${g.status}）`);
    else if (!new RegExp(g.match.pathRegex).test(sampleOf(x.path))) errors.push(`${x.id}: drive の group「${x.drive}」の pathRegex が台帳のパス ${x.path} に当たらない（drive-vault-sync が同期しない）`);
    if (n > 0) errors.push(`${x.id}: Drive vault（drive）のはずが git 管理に ${n} ファイルある（.gitignore を確かめる）`);
  }
  if (!area && !x.drive) errors.push(`${x.id}: 置き場（${Object.values(AREAS).map((a) => `${a.dir}/`).join('・')}）の外のパスは Drive vault（drive）のときだけ`);
  if (x.planned && n > 0) warnings.push(`${x.id}: ファイルが入ったので planned を外してよい`);
  if (!x.local && !x.drive && !x.planned && n === 0) errors.push(`${x.id}: 宣言だけでファイルが無い（${x.path}）`);
  const jsonFiles = (byId.get(x.id) ?? []).filter((f) => /\.jsonl?$/.test(f)).length;
  if (!x.schema && jsonFiles > 0 && AREAS[area]?.strict) {
    const message = `${x.id}: JSON（${jsonFiles} ファイル）に型が無い（scripts/lib/dataset-schemas*.mjs に zod の型を書き、台帳の schema に名前で結ぶ）`;
    (x.planned ? warnings : errors).push(message);
  }
}

let validated = 0;
const typed = DATASETS.filter((x) => x.schema);
for (const x of typed) {
  const r = validateFiles(ROOT, x, byId.get(x.id) ?? []);
  validated += r.checked;
  for (const e of r.errors) errors.push(`${e.file}: 型（${x.id}）に合わない — ${e.message}`);
}

let dupScanned = 0;
for (const f of files.filter((x) => /\.jsonl?$/.test(x))) {
  dupScanned++;
  for (const d of findDuplicateKeys(readFileSync(join(ROOT, f), 'utf8'))) errors.push(`${f}:${d.line}: キー「${d.key}」が同じオブジェクトに重複している（JSON.parse は後ろの値だけを残す）`);
}

const CODE_ROOT = /^(scripts|tools|src|\.claude)\//;
const codeFiles = tracked.filter((f) => CODE_ROOT.test(f) && /\.(mjs|cjs|js|mts|ts|tsx)$/.test(f));
let stateBaseline;
try {
  stateBaseline = JSON.parse(readFileSync(join(ROOT, STATE_LITERAL_BASELINE), 'utf8')).files;
} catch (e) {
  inconclusive(`${STATE_LITERAL_BASELINE} を読めなかった（${e.message.split('\n')[0]}）`);
}
const stateLiterals = {};
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
    const st = findStatePathLiterals(source);
    if (st.length) stateLiterals[f] = st;
  }
  checkIds(f, source);
}

for (const [f, hits] of Object.entries(stateLiterals)) {
  const allowed = stateBaseline[f] ?? 0;
  if (hits.length > allowed) errors.push(`${f}:${hits[0].line}: .claude/state/ のパスの直書きが ${hits.length} 件（基準線 ${allowed}）。台帳から datasetPath('state.…') で引く — ${hits[0].text}`);
}
for (const [f, allowed] of Object.entries(stateBaseline)) {
  const now = stateLiterals[f]?.length ?? 0;
  if (now < allowed) errors.push(`${STATE_LITERAL_BASELINE}: ${f} の直書きが ${allowed} → ${now} 件に減った。基準線を ${now} に下げる（0 なら行を消す）`);
}
const stateLiteralTotal = Object.values(stateLiterals).reduce((n, h) => n + h.length, 0);

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

// 12. 参照の実在（外部キー相当）
const refDatasets = DATASETS.filter((x) => x.refs);
let refsChecked = 0;
let refsBroken = 0;
let refFiles = 0;
const resolvers = refResolvers({ root: ROOT, registry: readDataset(ROOT, 'config.qualification-registry'), products: readDataset(ROOT, 'config.products') });
for (const x of refDatasets) {
  const bad = !Array.isArray(x.refs) || x.refs.some((r) => typeof r?.at !== 'string' || !r.at || !REF_TARGETS.includes(r.to));
  if (bad) { errors.push(`${x.id}: refs は [{ at: '場所', to: '${REF_TARGETS.join("'|'")}' }] で書く`); continue; }
  const files = datasetFiles(ROOT, x.id).map((file) => ({ file, data: JSON.parse(readFileSync(join(ROOT, file), 'utf8')) }));
  if (!files.length) { warnings.push(`${x.id}: refs を宣言しているがファイルが手元に無く、参照を検査していない`); continue; }
  refFiles += files.length;
  const r = checkRefs(x, files, resolvers);
  refsChecked += r.checked;
  if (r.checked === 0) errors.push(`${x.id}: refs（${x.refs.map((ref) => ref.at).join('・')}）の場所に値が 1 件も無い。場所の書き方を確かめる`);
  for (const b of r.broken) {
    refsBroken++;
    errors.push(`${b.file}: ${b.where} の「${b.value}」は ${b.to} に実在しない（参照切れ）`);
  }
}

const count = (pred) => DATASETS.filter(pred).length;
console.log(
  `[check-datasets] 設定・データ・作業状態 ${files.length} ファイル / データセット ${DATASETS.length}（型あり ${typed.length}・Drive vault ${count((x) => x.drive)}・手元だけ ${count((x) => x.local)}・未着手 ${count((x) => x.planned)}）を実検査 / 型の検査 ${validated} ファイル / 重複キーの走査 ${dupScanned} ファイル / 直書きの走査 ${codeFiles.length} ファイル（名前で引ける台帳のファイル名 ${basenames.size}・.claude/state/ の直書き ${Object.keys(stateLiterals).length} ファイル ${stateLiteralTotal} 件）/ id の参照 ${idRefs} 件 / ワークフロー・package.json のパス ${settingPaths} 件 / 参照（refs）${refDatasets.length} データセット・${refFiles} ファイル・${refsChecked} 件（参照切れ ${refsBroken}）/ 違反 ${errors.length} 件`,
);
if (files.length === 0) inconclusive('config/・data/・.claude/state/ のファイルを 1 件も読めなかった');
if (codeFiles.length === 0) inconclusive('直書きを走査するコードを 1 件も読めなかった');
if (refDatasets.length && refsChecked === 0) inconclusive('refs を宣言したデータセットの参照を 1 件も検査できなかった');
for (const w of warnings) console.log(`  ! ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log('[check-datasets] ✓ 台帳と実物は整合（全ファイルがちょうど 1 つのデータセットに当たり、型のあるものは型に合い、コードに config/・data/ の直書きが無く、引く id が台帳にあり、宣言した参照が実在する）');
