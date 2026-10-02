/**
 * data-stores.mjs — 設定（config/）とデータ（data/）の一覧・系列・型を読む唯一の実装。
 *
 * 領域の割り当ては domains.json の documents（パス接頭辞・長い一致が優先）で決め、ここでは持たない。
 * 日付・時刻・ハッシュだけが違うファイルは 1 つの「系列」にまとめ（psi-batch-*.json など）、
 * 型は手書きのスキーマでなく実物（系列の最新ファイル）から読み取る。
 * 使う側: check-domains（未割当・空振りの検査）、管理画面 管理＞設定／データ（/ops/store）。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { documentDomain } from './domains.mjs';

export const STORE_KINDS = {
  config: { dir: 'config', label: '設定' },
  data: { dir: 'data', label: 'データ' },
};

/**
 * 置き場のファイル（リポジトリ相対・/ 区切り）。tracked=true は git 管理下だけ（CI と同じ見え方）、
 * false は手元の git 管理外（UI 取得の CSV など）も含める。
 */
export function listStoreFiles(root, kind, { tracked = false } = {}) {
  const { dir } = STORE_KINDS[kind];
  if (tracked) {
    const out = execFileSync('git', ['ls-files', '-z', '--', `${dir}/`], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    return out.split('\0').filter(Boolean);
  }
  const files = [];
  const walk = (rel) => {
    const abs = join(root, rel);
    if (!existsSync(abs)) return;
    for (const e of readdirSync(abs, { withFileTypes: true })) {
      const p = `${rel}/${e.name}`;
      if (e.isDirectory()) walk(p);
      else if (e.isFile() && e.name !== '.gitkeep') files.push(p);
    }
  };
  walk(dir);
  return files.sort();
}

// 日付・時刻・週・期間・UUID・短いハッシュ。長いものから置き換える
const VARYING = [
  /\d{4}-\d{2}-\d{2}T\d{2}[-:]\d{2}[-:]\d{2}(?:[-.]\d{3})?Z?/g,
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g,
  /\d{8}_\d{8}/g,
  /\d{4}-\d{2}-\d{2}/g,
  /\d{4}-W\d{2}/g,
  /(?<=[-_/])W\d{2}(?=[-_.])/g,
  /\d{4}-\d{2}(?=[-_./])/g,
  /(?<=-)[0-9a-f]{8}(?=\.)/g,
];

/**
 * 系列のキー: 日付・時刻・ハッシュの部分を * にしたパス。可変部分が無ければパスそのもの。
 * 連続する可変部分（期間＋実行時刻など）と、その後の版番号（-r2）は 1 つの * にまとめる。
 */
export function seriesKey(path) {
  let key = path;
  for (const re of VARYING) key = key.replace(re, '*');
  return key.replace(/\*(?:[-_]\*)+/g, '*').replace(/(?<=\*)-r\d+(?=\.)/g, '');
}

/**
 * 置き場のファイルを系列にまとめて領域を付ける。
 * @returns {{ series: { key: string, domain: string|null, files: string[] }[], unassigned: string[] }}
 */
export function groupStores(cfg, files) {
  const byKey = new Map();
  const unassigned = [];
  for (const f of files) {
    const domain = documentDomain(cfg, f);
    if (!domain) unassigned.push(f);
    const key = seriesKey(f);
    if (!byKey.has(key)) byKey.set(key, { key, domain, files: [] });
    byKey.get(key).files.push(f);
  }
  const series = [...byKey.values()].map((s) => ({ ...s, files: s.files.sort().reverse() }));
  return { series: series.sort((a, b) => a.key.localeCompare(b.key)), unassigned };
}

/** documents のうち config/・data/ を指すのに、どのファイルにも当たらないキー（移動・削除の取り残し）。 */
export function deadStoreKeys(cfg, files) {
  return Object.keys(cfg.documents ?? {})
    .filter((k) => Object.values(STORE_KINDS).some((s) => k.startsWith(`${s.dir}/`)))
    .filter((k) => !files.some((f) => (k.endsWith('/') ? f.startsWith(k) : f === k)));
}

/** 領域ごとに、その置き場に割り当てがあるか（ファイルを読まずに documents だけで決める・サイドバー用）。 */
export function storeDomainIds(cfg, kind) {
  const prefix = `${STORE_KINDS[kind].dir}/`;
  const ids = new Set(Object.entries(cfg.documents ?? {}).filter(([k]) => k.startsWith(prefix)).map(([, id]) => id));
  return cfg.domains.map((d) => d.id).filter((id) => ids.has(id));
}

// ---- 型の読み取り -------------------------------------------------------------

const MAX_ROWS = 80;
const MAX_DEPTH = 5;
const IDENT = /^[a-z_$][A-Za-z0-9_$]*$/;

const kindOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
const kindsOf = (values) => [...new Set(values.map(kindOf))].join(' | ');

/**
 * id → 値 の対応表か（フィールド名の並んだオブジェクトと分ける）。
 * 値が全部オブジェクトでキーの半分以上が共通、または値が全部同じ基本型でキーがフィールド名らしくない／多い。
 */
function looksLikeMap(obj) {
  const keys = Object.keys(obj);
  const vals = Object.values(obj);
  const sameKind = vals.length > 0 && vals.every((v) => kindOf(v) === kindOf(vals[0]));
  // キーが id（ハイフン・数字始まり）で値の型が揃っていれば件数に関わらず対応表
  if (sameKind && keys.some((x) => !IDENT.test(x))) return true;
  if (keys.length < 5) return false;
  if (vals.every((v) => kindOf(v) === 'object')) {
    const sets = vals.map((v) => new Set(Object.keys(v)));
    const union = new Set(sets.flatMap((x) => [...x]));
    const common = [...union].filter((k) => sets.every((x) => x.has(k)));
    return union.size > 0 && common.length * 2 >= union.size;
  }
  const k = kindOf(vals[0]);
  return k !== 'object' && k !== 'array' && vals.every((v) => kindOf(v) === k) && (keys.length >= 10 || keys.some((x) => !IDENT.test(x)));
}

/**
 * 同じ場所に現れる値（配列の要素・対応表の値）をまとめて 1 行ずつ書く。
 * オブジェクトはキーごとに下へ、出現しないことがあるキーは ? を付ける。
 */
function describe(values, path, depth, rows) {
  if (rows.length >= MAX_ROWS) return;
  const objects = values.filter((v) => kindOf(v) === 'object');
  const arrays = values.filter((v) => kindOf(v) === 'array');
  const others = values.filter((v) => kindOf(v) !== 'object' && kindOf(v) !== 'array');

  if (objects.length && objects.every(looksLikeMap)) {
    const inner = objects.flatMap((o) => Object.values(o));
    const n = objects.length === 1 ? `（${inner.length} 件）` : '';
    const leaf = inner.every((v) => kindOf(v) !== 'object' && kindOf(v) !== 'array');
    rows.push({ path, type: leaf ? `対応表<${kindsOf(inner)}>${n}` : `対応表${n}` });
    if (!leaf && depth < MAX_DEPTH) describe(inner, `${path}.{id}`, depth + 1, rows);
    return;
  }
  if (arrays.length) {
    const items = arrays.flat();
    const n = arrays.length === 1 ? `（${items.length} 件）` : '';
    const leaf = items.every((v) => kindOf(v) !== 'object' && kindOf(v) !== 'array');
    const head = items.length ? (leaf ? `array<${kindsOf(items)}>${n}` : `array${n}`) : 'array（空）';
    rows.push({ path, type: [head, ...others.map(kindOf)].join(' | ') });
    if (!leaf && depth < MAX_DEPTH) describe(items, `${path}[]`, depth + 1, rows);
    return;
  }
  if (objects.length) {
    if (path) rows.push({ path, type: others.length ? `object | ${kindsOf(others)}` : 'object' });
    if (depth >= MAX_DEPTH) return;
    const seen = new Map();
    for (const o of objects) for (const [k, v] of Object.entries(o)) {
      if (!seen.has(k)) seen.set(k, []);
      seen.get(k).push(v);
    }
    for (const [k, vs] of seen) {
      const optional = vs.length < objects.length ? '?' : '';
      describe(vs, `${path ? `${path}.` : ''}${k}${optional}`, depth + 1, rows);
    }
    return;
  }
  rows.push({ path, type: kindsOf(values) });
}

function summaryOf(value) {
  const k = kindOf(value);
  if (k === 'array') return `array（${value.length} 件）`;
  if (k === 'object') return looksLikeMap(value) ? `対応表（${Object.keys(value).length} 件）` : `object（キー ${Object.keys(value).length}）`;
  return k;
}

function describeJson(value) {
  const rows = [];
  describe([value], '', 0, rows);
  return { summary: summaryOf(value), rows: rows.map((r) => ({ ...r, path: r.path || '(全体)' })) };
}

/** 説明文: 先頭の _doc / description / $comment（文字列のときだけ）。 */
export function storeDoc(value) {
  if (kindOf(value) !== 'object') return null;
  for (const k of ['_doc', 'description', '$comment', '_comment']) if (typeof value[k] === 'string') return value[k];
  return null;
}

/**
 * ファイルの型を実物から読む。JSON・JSONL・CSV・テキストに対応し、大きすぎるファイルは読まない。
 * @returns {{ format: string, summary: string, rows: { path: string, type: string }[], doc: string|null, error?: string }}
 */
export function inferShape(root, path, { maxBytes = 8 * 1024 * 1024 } = {}) {
  const abs = join(root, path);
  const size = statSync(abs).size;
  const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
  if (size > maxBytes) return { format: ext, summary: `大きいので読まない（${Math.round(size / 1024 / 1024)}MB）`, rows: [], doc: null };
  const text = readFileSync(abs, 'utf8').replace(/^﻿/, '');
  try {
    if (ext === 'json') {
      const v = JSON.parse(text);
      return { format: 'JSON', ...describeJson(v), doc: storeDoc(v) };
    }
    if (ext === 'jsonl') {
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      const rows = [];
      describe(lines.slice(0, 200).map((l) => JSON.parse(l)), '', 0, rows);
      return { format: 'JSON Lines', summary: `${lines.length} 行`, rows: rows.filter((r) => r.path), doc: null };
    }
    if (ext === 'csv') {
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      const head = (lines[0] ?? '').split(',').map((h) => h.replace(/^"|"$/g, ''));
      return { format: 'CSV', summary: `${Math.max(lines.length - 1, 0)} 行 × ${head.length} 列`, rows: head.map((h) => ({ path: h, type: '列' })), doc: null };
    }
  } catch (e) {
    return { format: ext, summary: '読み取れない', rows: [], doc: null, error: e.message };
  }
  return { format: ext === 'md' ? 'Markdown' : 'テキスト', summary: `${text.split(/\r?\n/).length} 行`, rows: [], doc: null };
}
