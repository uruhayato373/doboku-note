// prune-state-snapshots（純粋ロジック）— data/ に CI が積む日付付きファイルの寿命と、削除計画の算出。
// I/O を持たない（読み手は scripts/prune-state-snapshots.mjs）。寿命は台帳（scripts/lib/datasets.mjs）の
// 各データセットの retain が正本で、ここは台帳を読んで計画を立てるだけ。
//
// 守りたい事故: 2026-09-14 時点で日付付き snapshot が 704 件（psi 299 / ga4 222 / gsc 110 …）git に無期限蓄積し、
// 読み手は全部 latest-1〜2 件しか見ていなかった。寿命が宣言されていないファイル＝「誰も消せないので永久に増える」
// なので、**未宣言の日付付きファイルは赤**（coverage 検査）にして、新しい系列が黙って増えるのを止める。
//
// 決して触らないもの: 台帳で immutable のデータセット（data/business/records の KPI 台帳＝check-business-direction が
// 削除を拒否、rank-watch＝check-seo-rank-watch「Rank history is immutable」）。plan() はこれらを delete に入れない
// （tests/prune-state-snapshots.test.mjs が assert する）。手元だけの生データ（local）は対象外。
//
// pin（名前で参照されるので消せない）: `config/seo-watchwords.json` の `evidence.source`、business 台帳が
// `sources[]` で指すパス。CLI が集めて `pins` に渡す。

import { DATASETS, datasetPath, datasetsFor } from './datasets.mjs';
import { resolveMovedPath } from './repository-paths.mjs';

const TS_FULL = /(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})/;
const TS_DATE = /(\d{4})-(\d{2})-(\d{2})/;
const TS_COMPACT = /(\d{4})(\d{2})(\d{2})_\d{8}/;
const TS_WEEK = /(\d{4})-W(\d{2})/;

export const DATA_ROOT = 'data';

/** 寿命の宣言（台帳の retain を持つデータセット） */
export const POLICIES = DATASETS.filter((x) => x.retain).map((x) => ({ family: x.retain.family, dataset: x.id, rule: x.retain }));

export const FAMILIES = [...new Set(POLICIES.map((p) => p.family))];

// 台帳の記録は旧パス（.claude/state/metrics/…）のまま残しているので、新しい位置へ読み替えてから比べる
const norm = (p) => resolveMovedPath(p.replace(/\\/g, '/').replace(/^\.\//, ''));
const baseOf = (p) => p.slice(p.lastIndexOf('/') + 1);

/** 中身を変えない台帳のファイルか（決して消さない） */
export function isExcluded(file) {
  return datasetsFor(norm(file)).some((x) => x.immutable);
}

/** ISO 週（YYYY-Www）の月曜 00:00 UTC */
function isoWeekMonday(year, week) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Dow = jan4.getUTCDay() || 7;
  const monday = new Date(jan4.getTime() - (jan4Dow - 1) * 86400000);
  return new Date(monday.getTime() + (week - 1) * 7 * 86400000);
}

/**
 * ファイル名から時刻を取り出す。戻り値は { time: epoch ms, stamp: ソート用文字列 }。日付が無ければ null。
 * ソートは stamp（ISO 形式で桁固定）の文字列比較で行い、Date の解釈違いに依存しない。
 */
export function snapshotStamp(basename) {
  let m = basename.match(TS_FULL);
  if (m) return { time: Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]), stamp: `${m[1]}-${m[2]}-${m[3]}T${m[4]}-${m[5]}-${m[6]}` };
  m = basename.match(TS_COMPACT);
  if (m) return { time: Date.UTC(+m[1], +m[2] - 1, +m[3]), stamp: `${m[1]}-${m[2]}-${m[3]}T00-00-00` };
  m = basename.match(TS_WEEK);
  if (m) {
    const d = isoWeekMonday(+m[1], +m[2]);
    return { time: d.getTime(), stamp: d.toISOString().slice(0, 19).replace(/:/g, '-') };
  }
  m = basename.match(TS_DATE);
  if (m) return { time: Date.UTC(+m[1], +m[2] - 1, +m[3]), stamp: `${m[1]}-${m[2]}-${m[3]}T00-00-00` };
  return null;
}

/** 日付付きファイルか（寿命を宣言すべき対象か） */
export function isDated(file) {
  return snapshotStamp(baseOf(norm(file))) !== null;
}

/** ファイルに当たる寿命の宣言（台帳で 1 つのデータセットに当たり、そのデータセットが retain を持つときだけ 1 件） */
export function policiesFor(file) {
  const hits = datasetsFor(norm(file));
  return hits.length === 1 ? POLICIES.filter((p) => p.dataset === hits[0].id) : [];
}

const getPath = (obj, path) => path.reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);

/**
 * 削除計画を立てる。
 * @param {object} args
 * @param {string[]} args.files 走査対象（data/ 配下の相対パス。tracked + untracked を渡す）
 * @param {number} [args.now] epoch ms（maxAgeDays の基準）
 * @param {Iterable<string>} [args.pins] 名前で参照されるため消せないパス
 * @param {(file:string)=>any} [args.readJson] alsoKeepNewestWhere の判定に使う（無ければその条件は無視＝保守的に最新だけ残す）
 * @param {string[]} [args.families] 対象 family の限定（未指定＝全部）
 * @returns {{ entries: Array<{file:string, family:string|null, decision:'keep'|'delete'|'excluded'|'undeclared'|'skipped', reason:string}>, summary: object, indexRewrites: Array<{index:string, removed:string[]}> }}
 */
export function plan({ files, now = Date.now(), pins = [], readJson = null, families = null } = {}) {
  const pinSet = new Set([...pins].map(norm));
  const wanted = families ? new Set(families) : null;
  const entries = [];
  const byPolicy = new Map();

  for (const raw of files) {
    const file = norm(raw);
    if (!file.startsWith(`${DATA_ROOT}/`)) continue;
    const hits = datasetsFor(file);
    if (hits.some((x) => x.local)) continue; // 手元だけの生データは寿命の対象外
    if (hits.some((x) => x.immutable)) {
      entries.push({ file, family: null, decision: 'excluded', reason: 'immutable ledger' });
      continue;
    }
    if (!isDated(file)) continue; // 最新状態・台帳・索引など日付の無いものは寿命の対象外
    const matched = policiesFor(file);
    if (matched.length !== 1) {
      entries.push({ file, family: null, decision: 'undeclared', reason: hits.length === 1 ? `${hits[0].id} has no retain` : hits.length === 0 ? 'not in the catalog' : `matches ${hits.length} datasets` });
      continue;
    }
    const idx = POLICIES.indexOf(matched[0]);
    if (!byPolicy.has(idx)) byPolicy.set(idx, []);
    byPolicy.get(idx).push(file);
  }

  const indexRewrites = [];
  for (const [idx, list] of byPolicy) {
    const policy = POLICIES[idx];
    const rule = policy.rule;
    const items = list
      .map((file) => ({ file, ...snapshotStamp(baseOf(file)) }))
      .sort((a, b) => (a.stamp < b.stamp ? 1 : a.stamp > b.stamp ? -1 : a.file < b.file ? 1 : -1)); // 新しい順

    if (wanted && !wanted.has(policy.family)) {
      for (const it of items) entries.push({ file: it.file, family: policy.family, decision: 'skipped', reason: 'family not selected' });
      continue;
    }

    const keep = new Map(); // file → reason
    if (rule.keepAll) {
      for (const it of items) keep.set(it.file, 'keep-all');
    } else if (rule.keepNewest) {
      items.slice(0, rule.keepNewest).forEach((it, i) => keep.set(it.file, `newest ${i + 1}/${rule.keepNewest}`));
    } else if (rule.maxAgeDays) {
      const limit = now - rule.maxAgeDays * 86400000;
      items.forEach((it, i) => {
        if (i === 0) keep.set(it.file, `newest of ${policy.dataset}`);
        else if (it.time >= limit) keep.set(it.file, `within ${rule.maxAgeDays}d`);
      });
    }
    if (rule.keepNewestPerSection && readJson) {
      // 日ごとのレポート: 種類ごとに最新を含む日を残す（一度しか取っていない種類が日の寿命で消えないように）
      const seen = new Set();
      for (const it of items) {
        const sections = Object.keys(safeRead(readJson, it.file)?.reports ?? {}).filter((k) => !seen.has(k));
        if (!sections.length) continue;
        sections.forEach((k) => seen.add(k));
        if (!keep.has(it.file)) keep.set(it.file, `newest of ${sections.join(',')}`);
      }
    }
    if (rule.alsoKeepNewestWhere && readJson) {
      const { path, equals } = rule.alsoKeepNewestWhere;
      const hit = items.find((it) => getPath(safeRead(readJson, it.file), path) === equals);
      if (hit) keep.set(hit.file, `newest with ${path.join('.')}=${equals}`);
    }
    for (const it of items) if (pinSet.has(it.file)) keep.set(it.file, 'pinned by name');

    const removed = [];
    for (const it of items) {
      if (keep.has(it.file)) entries.push({ file: it.file, family: policy.family, decision: 'keep', reason: keep.get(it.file) });
      else {
        entries.push({ file: it.file, family: policy.family, decision: 'delete', reason: rule.keepNewest ? `older than newest ${rule.keepNewest}` : `older than ${rule.maxAgeDays}d` });
        removed.push(it.file);
      }
    }
    if (rule.index && removed.length) indexRewrites.push({ index: datasetPath(rule.index), removed });
  }

  // 不変条件: 中身を変えない台帳のファイルは決して delete にならない
  for (const e of entries) if (e.decision === 'delete' && isExcluded(e.file)) throw new Error(`invariant: immutable file planned for deletion: ${e.file}`);

  const count = (d) => entries.filter((e) => e.decision === d).length;
  const summary = {
    examined: entries.filter((e) => e.decision !== 'excluded').length,
    keep: count('keep'),
    delete: count('delete'),
    skipped: count('skipped'),
    excluded: count('excluded'),
    undeclared: entries.filter((e) => e.decision === 'undeclared').map((e) => e.file),
    byFamily: Object.fromEntries(FAMILIES.map((f) => [f, { keep: entries.filter((e) => e.family === f && e.decision === 'keep').length, delete: entries.filter((e) => e.family === f && e.decision === 'delete').length }])),
  };
  return { entries, summary, indexRewrites };
}

function safeRead(readJson, file) {
  try {
    return readJson(file);
  } catch {
    return null;
  }
}

/** 週次の索引（business.weekly-index）から削除済み path の週を落とす（純粋） */
export function filterWeeklyIndex(index, removedPaths) {
  const gone = new Set(removedPaths.map(norm));
  const weeks = (index.weeks || []).filter((w) => !gone.has(norm(w.path || '')));
  return { ...index, weeks };
}

/** seo-watchwords.json / business 台帳から「名前で参照される記録のパス」を抜く（純粋） */
export function collectPins({ watchwords = null, businessDocs = [] } = {}) {
  const pins = new Set();
  for (const w of watchwords?.watchwords || []) {
    // 「ファイル#枠」はファイルを残す
    if (w?.evidence?.kind === 'gsc' && typeof w.evidence.source === 'string') pins.add(norm(w.evidence.source.split('#')[0]));
  }
  // 新しいパス（data/…）と、台帳に残る旧パス（.claude/state/…）の両方を拾う
  const re = /(?<![A-Za-z0-9_.-])(?:data|\.claude\/state)\/[A-Za-z0-9_./-]+\.(?:json|md)/g;
  for (const text of businessDocs) for (const m of String(text).matchAll(re)) pins.add(norm(m[0]));
  return pins;
}
