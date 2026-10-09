#!/usr/bin/env node
/**
 * data.mjs — 台帳の id でデータを一覧・取得・絞り込む（DN-0585）。中身は scripts/lib/dataset-query.mjs。
 *
 *   npm run data -- list                          # 台帳の全データセット（id・置き場・ファイル数）
 *   npm run data -- list <id>                     # そのデータセットのファイル（新しい順）と行数
 *   npm run data -- get <id> [--file <path>]      # 中身（既定は最新のファイル）
 *   npm run data -- query <id> --where <欄=値> [--where …] [--rows <場所>] [--all] [--limit N] [--json]
 *                                                 # 行（配列の要素・対応表の項目）を絞る。欄!=値・欄~値（含む）も使える
 *
 * exit 0 = 出力した / 1 = 該当なし・読めない / 2 = 引数の不備
 */

import { DATASETS, datasetFiles } from './lib/datasets.mjs';
import { getDataset, listDataset, queryDataset } from './lib/dataset-query.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';

const argv = process.argv.slice(2);
const [cmd, id] = argv;
const vals = (name) => argv.flatMap((a, i) => (a === name && argv[i + 1] ? [argv[i + 1]] : []));
const val = (name) => vals(name)[0] ?? null;
const JSON_OUT = argv.includes('--json');
const usage = () => {
  console.error('usage: npm run data -- list [<id>] | get <id> [--file <path>] | query <id> --where <欄=値> [--rows <場所>] [--all] [--limit N] [--json]');
  process.exit(2);
};
const compact = (v, n = 160) => { const s = JSON.stringify(v); return s.length > n ? `${s.slice(0, n)}…` : s; };

try {
  if (cmd === 'list' && !id) {
    const rows = DATASETS.map((x) => ({ id: x.id, path: x.path, files: datasetFiles(REPO_ROOT, x.id).length, drive: x.drive ?? null }));
    if (JSON_OUT) console.log(JSON.stringify(rows, null, 2));
    else {
      for (const r of rows) console.log(`${r.id.padEnd(48)} ${String(r.files).padStart(4)}  ${r.path}${r.drive ? `（Drive: ${r.drive}）` : ''}`);
      console.log(`[data list] データセット ${rows.length} / 手元にファイルのあるもの ${rows.filter((r) => r.files).length}`);
    }
  } else if (cmd === 'list') {
    const r = listDataset(REPO_ROOT, id);
    if (JSON_OUT) console.log(JSON.stringify(r, null, 2));
    else {
      console.log(`${r.id}  ${r.path}${r.drive ? `（Drive: ${r.drive}）` : ''}\n  ${r.doc}`);
      for (const f of r.files) console.log(`  ${f.file}  ${f.bytes} bytes${f.rows == null ? '' : `・${f.rows} 行`}${f.error ? `・読めない: ${f.error}` : ''}`);
      console.log(`[data list] ファイル ${r.files.length} 件${r.hint ? `（${r.hint}）` : ''}`);
    }
    process.exitCode = r.files.length ? 0 : 1;
  } else if (cmd === 'get' && id) {
    const r = getDataset(REPO_ROOT, id, { file: val('--file') });
    if (typeof r.data === 'string') process.stdout.write(r.data);
    else console.log(JSON.stringify(r.data, null, 2));
    console.error(`[data get] ${r.file}`);
  } else if (cmd === 'query' && id) {
    const where = vals('--where');
    if (!where.length) usage();
    const r = queryDataset(REPO_ROOT, id, { where, file: val('--file'), all: argv.includes('--all'), rowsPath: val('--rows'), limit: Number(val('--limit') ?? 50) });
    if (JSON_OUT) console.log(JSON.stringify(r, null, 2));
    else {
      for (const row of r.rows) console.log(`  ${compact(row)}`);
      console.log(`[data query] ${r.files.join(', ')} の ${r.rowsPath ?? '（最上位の配列）'} から ${r.total} 行${r.total > r.rows.length ? `（先頭 ${r.rows.length} 行を表示）` : ''}`);
    }
    process.exitCode = r.total ? 0 : 1;
  } else {
    usage();
  }
} catch (e) {
  console.error(`[data] ✗ ${e.message}`);
  process.exit(1);
}
