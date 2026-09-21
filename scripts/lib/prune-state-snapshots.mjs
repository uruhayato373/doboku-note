// prune-state-snapshots（純粋ロジック）— `.claude/state/metrics/**` と `.claude/state/weekly-metrics/` に
// CI が積む日付付き snapshot の寿命表と、削除計画の算出。I/O を持たない（読み手は scripts/prune-state-snapshots.mjs）。
//
// 守りたい事故: 2026-09-14 時点で日付付き snapshot が 704 件（psi 299 / ga4 222 / gsc 110 …）git に無期限蓄積し、
// 読み手は全部 latest-1〜2 件しか見ていなかった。寿命が宣言されていないファイル＝「誰も消せないので永久に増える」
// なので、**未宣言の日付付きファイルは赤**（coverage 検査）にして、新しい系列が黙って増えるのを止める。
//
// 決して触らないもの（EXCLUDED_DIRS）: `metrics/business/**`（check-business-direction が削除を拒否する台帳）、
// `metrics/gsc/rank-watch/**`（check-seo-rank-watch「Rank history is immutable」）。plan() はこれらを delete に
// 入れない（tests/prune-state-snapshots.test.mjs が assert する）。
//
// pin（名前で参照されるので消せない）: `.claude/config/seo-watchwords.json` の `evidence.source`、business 台帳が
// `sources[]` で指す metrics パス。CLI が集めて `pins` に渡す。

const TS_FULL = /(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})/;
const TS_DATE = /(\d{4})-(\d{2})-(\d{2})/;
const TS_COMPACT = /(\d{4})(\d{2})(\d{2})_\d{8}/;
const TS_WEEK = /(\d{4})-W(\d{2})/;

export const METRICS_ROOT = '.claude/state/metrics';
export const WEEKLY_ROOT = '.claude/state/weekly-metrics';
export const SCAN_ROOTS = [METRICS_ROOT, WEEKLY_ROOT];

/** 削除計画から常に除外する dir（台帳・不変履歴）。末尾 `/` 無しで書き、prefix 一致で判定する */
export const EXCLUDED_DIRS = [`${METRICS_ROOT}/business`, `${METRICS_ROOT}/gsc/rank-watch`];

/**
 * 寿命表。1 ファイルは必ず 0 か 1 個の policy に一致する（2 個以上は設定ミス＝coverage 検査が赤）。
 * rule:
 *   { keepNewest: N }                          … 同 policy 内で新しい N 件を残す
 *   { maxAgeDays: D, keepNewestPerPrefix: 1 }  … D 日超を消す。ただし prefix（日付を除いた名前）ごとに最新 1 件は必ず残す
 *   'keep-all'                                 … 消さない（寿命を「無期限」と宣言するだけ）
 * keepNewestWhere: { prefix, path, equals } … JSON の path が equals のファイルのうち最新 1 件を追加で残す
 *   （ga4-cta-clicks-by-label は `meta.windowKind === "month"` の最新が EPC 分母。.claude/scripts/lib/ga4-snapshot.mjs pickByLabelSnapshot）
 * index: dir 内の索引 JSON。削除した path を `weeks[]` から落として書き直す（weekly-metrics/index.json）
 */
export const POLICIES = [
  { family: 'psi', dir: `${METRICS_ROOT}/psi`, match: /^psi-batch-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z?\.json$/, rule: { keepNewest: 14 } },
  { family: 'psi', dir: `${METRICS_ROOT}/psi`, match: /^psi-single-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z?\.json$/, rule: { keepNewest: 5 } },
  {
    family: 'ga4',
    dir: `${METRICS_ROOT}/ga4`,
    match: /^(ga4-[A-Za-z-]+|bot-audit)-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z?\.json$/,
    rule: { maxAgeDays: 90, keepNewestPerPrefix: 1 },
    keepNewestWhere: { prefix: 'ga4-cta-clicks-by-label-', path: ['meta', 'windowKind'], equals: 'month' },
  },
  {
    family: 'gsc',
    dir: `${METRICS_ROOT}/gsc`,
    match: /^gsc-(query|page|date|page-query)-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z?\.json$/,
    rule: { maxAgeDays: 90, keepNewestPerPrefix: 1 },
  },
  { family: 'url-inspection', dir: `${METRICS_ROOT}/url-inspection`, match: /^inspection-batch-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z?\.json$/, rule: { keepNewest: 6 } },
  { family: 'url-inspection', dir: `${METRICS_ROOT}/url-inspection`, match: /^inspection-single-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z?\.json$/, rule: { keepNewest: 2 } },
  { family: 'monetization', dir: `${METRICS_ROOT}/monetization`, match: /^coverage-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z?\.json$/, rule: { keepNewest: 4 } },
  { family: 'crosswalk', dir: `${METRICS_ROOT}/crosswalk`, match: /^crosswalk-\d{8}_\d{8}\.json$/, rule: { keepNewest: 8 } },
  { family: 'weekly-metrics', dir: WEEKLY_ROOT, match: /^\d{4}-W\d{2}\.json$/, rule: { keepNewest: 26 }, index: 'index.json' },
  // 寿命「無期限」を宣言するだけの行（消さない）。基準線・手動取得の証跡で、読み手が名前で参照する
  { family: 'affiliate', dir: `${METRICS_ROOT}/affiliate`, match: /-\d{4}-\d{2}-\d{2}\.json$/, rule: 'keep-all' },
  { family: 'gsc-ui', dir: `${METRICS_ROOT}/gsc-ui/ssot/diff`, match: /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z?\.json$/, rule: 'keep-all' }, // check-google-ui-ssot の marker↔history↔urls 整合が run 単位で参照
  { family: 'gsc', dir: `${METRICS_ROOT}/gsc`, match: /^coverage-diagnosis-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z?\.(json|md)$/, rule: 'keep-all' }, // 2026-04 の単発診断（analyze-gsc-coverage が読む）。増えない
  { family: 'notes', dir: `${METRICS_ROOT}/notes`, match: /-\d{4}-\d{2}-\d{2}\.md$/, rule: 'keep-all' },
  { family: 'instagram', dir: `${METRICS_ROOT}/instagram`, match: /^ig-insights-\d{4}-\d{2}-\d{2}\.json$/, rule: { maxAgeDays: 180, keepNewestPerPrefix: 1 } },
  { family: 'cloudflare', dir: `${METRICS_ROOT}/cloudflare`, match: /^cf-zone-\d{4}-\d{2}-\d{2}\.json$/, rule: { maxAgeDays: 120, keepNewestPerPrefix: 1 } },
];

export const FAMILIES = [...new Set(POLICIES.map((p) => p.family))];

const norm = (p) => p.replace(/\\/g, '/').replace(/^\.\//, '');
const dirOf = (p) => p.slice(0, p.lastIndexOf('/'));
const baseOf = (p) => p.slice(p.lastIndexOf('/') + 1);

export function isExcluded(file) {
  const f = norm(file);
  return EXCLUDED_DIRS.some((d) => f === d || f.startsWith(d + '/'));
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

/** 名前から日付以降を落とした prefix（`ga4-channel-2026-…json` → `ga4-channel`） */
export function prefixOf(basename) {
  return basename.replace(/[-_]?\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z?\.\w+$/, '').replace(/[-_]?\d{8}_\d{8}\.\w+$/, '').replace(/[-_]?\d{4}-\d{2}-\d{2}\.\w+$/, '');
}

export function policiesFor(file) {
  const f = norm(file);
  const dir = dirOf(f);
  const base = baseOf(f);
  return POLICIES.filter((p) => p.dir === dir && p.match.test(base));
}

const getPath = (obj, path) => path.reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);

/**
 * 削除計画を立てる。
 * @param {object} args
 * @param {string[]} args.files 走査対象（SCAN_ROOTS 配下の相対パス。tracked + untracked を渡す）
 * @param {number} [args.now] epoch ms（maxAgeDays の基準）
 * @param {Iterable<string>} [args.pins] 名前で参照されるため消せないパス
 * @param {(file:string)=>any} [args.readJson] keepNewestWhere の判定に使う（無ければその条件は無視＝保守的に prefix 最新だけ残す）
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
    if (!SCAN_ROOTS.some((r) => file.startsWith(r + '/'))) continue;
    if (isExcluded(file)) {
      entries.push({ file, family: null, decision: 'excluded', reason: 'immutable ledger dir' });
      continue;
    }
    if (!isDated(file)) continue; // latest-*.json / history.json / index.json 等は寿命の対象外
    const matched = policiesFor(file);
    if (matched.length !== 1) {
      entries.push({ file, family: null, decision: 'undeclared', reason: matched.length === 0 ? 'no policy declares a lifetime' : `matches ${matched.length} policies` });
      continue;
    }
    const policy = matched[0];
    const idx = POLICIES.indexOf(policy);
    if (!byPolicy.has(idx)) byPolicy.set(idx, []);
    byPolicy.get(idx).push(file);
  }

  const indexRewrites = [];
  for (const [idx, list] of byPolicy) {
    const policy = POLICIES[idx];
    const items = list
      .map((file) => ({ file, base: baseOf(file), ...snapshotStamp(baseOf(file)) }))
      .sort((a, b) => (a.stamp < b.stamp ? 1 : a.stamp > b.stamp ? -1 : a.file < b.file ? 1 : -1)); // 新しい順

    if (wanted && !wanted.has(policy.family)) {
      for (const it of items) entries.push({ file: it.file, family: policy.family, decision: 'skipped', reason: 'family not selected' });
      continue;
    }

    const keep = new Map(); // file → reason
    if (policy.rule === 'keep-all') {
      for (const it of items) keep.set(it.file, 'keep-all');
    } else if (policy.rule.keepNewest) {
      items.slice(0, policy.rule.keepNewest).forEach((it, i) => keep.set(it.file, `newest ${i + 1}/${policy.rule.keepNewest}`));
    } else if (policy.rule.maxAgeDays) {
      const limit = now - policy.rule.maxAgeDays * 86400000;
      const seenPrefix = new Set();
      for (const it of items) {
        const prefix = prefixOf(it.base);
        if (!seenPrefix.has(prefix)) {
          seenPrefix.add(prefix);
          keep.set(it.file, `newest of ${prefix}`);
          continue;
        }
        if (it.time >= limit) keep.set(it.file, `within ${policy.rule.maxAgeDays}d`);
      }
    }
    if (policy.keepNewestWhere && readJson) {
      const { prefix, path, equals } = policy.keepNewestWhere;
      const hit = items.find((it) => it.base.startsWith(prefix) && getPath(safeRead(readJson, it.file), path) === equals);
      if (hit) keep.set(hit.file, `newest ${prefix}* with ${path.join('.')}=${equals}`);
    }
    for (const it of items) if (pinSet.has(it.file)) keep.set(it.file, 'pinned by name');

    const removed = [];
    for (const it of items) {
      if (keep.has(it.file)) entries.push({ file: it.file, family: policy.family, decision: 'keep', reason: keep.get(it.file) });
      else {
        entries.push({ file: it.file, family: policy.family, decision: 'delete', reason: policy.rule.keepNewest ? `older than newest ${policy.rule.keepNewest}` : `older than ${policy.rule.maxAgeDays}d` });
        removed.push(it.file);
      }
    }
    if (policy.index && removed.length) indexRewrites.push({ index: `${policy.dir}/${policy.index}`, removed });
  }

  // 不変条件: 除外 dir のファイルは決して delete にならない
  for (const e of entries) if (e.decision === 'delete' && isExcluded(e.file)) throw new Error(`invariant: excluded file planned for deletion: ${e.file}`);

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

/** weekly-metrics/index.json から削除済み path の週を落とす（純粋） */
export function filterWeeklyIndex(index, removedPaths) {
  const gone = new Set(removedPaths.map(norm));
  const weeks = (index.weeks || []).filter((w) => !gone.has(norm(w.path || '')));
  return { ...index, weeks };
}

/** seo-watchwords.json / business 台帳から「名前で参照される metrics パス」を抜く（純粋） */
export function collectPins({ watchwords = null, businessDocs = [] } = {}) {
  const pins = new Set();
  for (const w of watchwords?.watchwords || []) {
    if (w?.evidence?.kind === 'gsc' && typeof w.evidence.source === 'string') pins.add(norm(w.evidence.source));
  }
  const re = /\.claude\/state\/(?:metrics|weekly-metrics)\/[A-Za-z0-9_./-]+/g;
  for (const text of businessDocs) for (const m of String(text).matchAll(re)) pins.add(norm(m[0]));
  return pins;
}
