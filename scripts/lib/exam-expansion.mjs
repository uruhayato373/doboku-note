/**
 * exam-expansion.mjs — 展開対象試験カタログ（.claude/config/exam-expansion-catalog.json）の
 * 検証・対応状況の集計・優先度スコアリングを行う pure module。
 *
 * 入力の読み込み（note-magazines.ts・coconala-services.ts などの TS）は CLI
 * （scripts/exam-expansion.mts）が行い、ここには配列・オブジェクトで渡す。
 * 市場スコアとゲートは数値から機械的に決め、人手の評点（scores）と混ぜない。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const CATALOG_PATH = '.claude/config/exam-expansion-catalog.json';
export const STATUSES = ['active', 'candidate', 'rejected'];
export const ESSAY_TYPES = ['experience', 'general', 'short', 'none'];
export const COMPETITION_LEVELS = ['low', 'mid', 'high', 'unknown'];
export const MANUAL_AXES = ['wtp', 'authenticity', 'competitionGap', 'assetReuse', 'evergreen'];

const isScore = (v) => Number.isInteger(v) && v >= 0 && v <= 3;
const nonempty = (s) => typeof s === 'string' && s.trim().length > 0;

/** 'latest.stages.second.examinees' のような dotted path で exam-stats の値を引く。 */
export function pick(obj, path) {
  return String(path).split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

/** 受験者数（人）を返す。statsRef は exam-stats.json から、候補は market.examinees から。未確認は null。 */
export function resolveExaminees(exam, examStats) {
  const ref = exam.market?.statsRef;
  if (ref) {
    const v = pick(examStats?.exams?.[ref.exam], ref.path);
    return Number.isFinite(v) ? v : null;
  }
  return Number.isFinite(exam.market?.examinees) ? exam.market.examinees : null;
}

export function marketScore(examinees, thresholds) {
  if (examinees == null) return null;
  return [...thresholds].sort((a, b) => b.min - a.min).find((t) => examinees >= t.min)?.score ?? 0;
}

/** 1 試験の重み付きスコア（0〜100）とゲート判定。 */
export function scoreExam(exam, scoring, examStats) {
  const examinees = resolveExaminees(exam, examStats);
  const market = marketScore(examinees, scoring.marketThresholds);
  const axes = { ...exam.scores, market: market ?? 0 };
  const totalWeight = Object.values(scoring.axes).reduce((s, a) => s + a.weight, 0);
  const raw = Object.entries(scoring.axes).reduce((s, [k, a]) => s + a.weight * (axes[k] ?? 0), 0);
  const score = Math.round((raw / (totalWeight * 3)) * 1000) / 10;
  const gates = [];
  if (exam.scores.authenticity === 0) gates.push('経験の範囲外');
  if (exam.scores.wtp === 0) gates.push('有料需要なし');
  if (examinees != null && examinees < scoring.gates.marketBelow) gates.push('市場過小');
  const flags = [];
  if (market == null) flags.push('市場未確認');
  if (exam.competition.level === 'unknown') flags.push('競合未調査');
  return { id: exam.id, examinees, market, score, gates, flags };
}

/** status ごとに並べる。候補は「ゲートなし → スコア降順」。 */
export function rankCatalog(catalog, examStats) {
  const rows = catalog.exams.map((e) => ({ exam: e, ...scoreExam(e, catalog.scoring, examStats) }));
  const byScore = (a, b) => (a.gates.length > 0) - (b.gates.length > 0) || b.score - a.score || a.exam.id.localeCompare(b.exam.id);
  return Object.fromEntries(STATUSES.map((s) => [s, rows.filter((r) => r.exam.status === s).sort(byScore)]));
}

/**
 * カタログの構造と、外部 SSOT との参照整合を検査する。errors を配列で返す（throw しない）。
 * refs: { examStats, profileQualifications, noteExamKeys, coconalaScopes, kindleSeries, siteDirs }
 */
export function validateCatalog(catalog, refs) {
  const errors = [];
  const err = (id, msg) => errors.push(`${id}: ${msg}`);
  if (catalog?.schemaVersion !== 1 || !Array.isArray(catalog.exams) || catalog.exams.length === 0) return ['カタログの schemaVersion / exams が不正'];
  const axes = catalog.scoring?.axes ?? {};
  for (const k of [...MANUAL_AXES, 'market']) if (!(axes[k]?.weight > 0)) err('scoring', `軸 ${k} の weight がない`);
  if (!Array.isArray(catalog.scoring?.marketThresholds) || !catalog.scoring.marketThresholds.some((t) => t.min === 0)) err('scoring', 'marketThresholds に min:0 の段がない');
  const ids = new Set();
  for (const e of catalog.exams) {
    const id = e.id ?? '(id なし)';
    if (!/^[a-z0-9-]+$/.test(e.id ?? '')) err(id, 'id は英小文字・数字・ハイフン');
    if (ids.has(e.id)) err(id, 'id が重複');
    ids.add(e.id);
    if (!nonempty(e.label) || !nonempty(e.issuer)) err(id, 'label / issuer が空');
    if (!STATUSES.includes(e.status)) err(id, `status は ${STATUSES.join('/')}`);
    if (!ESSAY_TYPES.includes(e.essay?.type) || !nonempty(e.essay?.summary)) err(id, 'essay.type / summary が不正');
    if (!nonempty(e.rationale) || !nonempty(e.nextAction)) err(id, 'rationale / nextAction が空');
    for (const k of MANUAL_AXES) if (!isScore(e.scores?.[k])) err(id, `scores.${k} は 0〜3 の整数`);
    if (e.scores && 'market' in e.scores) err(id, 'scores.market は受験者数から自動算出するので書かない');

    const m = e.market ?? {};
    if (m.statsRef) {
      const stat = refs.examStats?.exams?.[m.statsRef.exam];
      if (!stat) err(id, `statsRef.exam=${m.statsRef.exam} が exam-stats.json にない`);
      else if (pick(stat, m.statsRef.path) === undefined && pick(stat, m.statsRef.path.split('.').slice(0, -1).join('.')) === undefined) err(id, `statsRef.path=${m.statsRef.path} が exam-stats.json で解決できない`);
      if ('examinees' in m) err(id, 'statsRef と examinees を両方書かない（exam-stats.json が真実源）');
    } else {
      if (!(m.examinees === null || (Number.isInteger(m.examinees) && m.examinees >= 0))) err(id, 'market.examinees は 0 以上の整数か null');
      if (!nonempty(m.source) || !['official', 'secondary'].includes(m.confidence) || !nonempty(m.year)) err(id, 'market.source / confidence / year が不正');
      if (e.status === 'active') err(id, '対応中の資格は exam-stats.json に登録して statsRef で参照する');
    }

    const q = e.operatorQualification;
    if (q != null && !refs.profileQualifications.includes(q)) err(id, `operatorQualification「${q}」が content/note/プロフィール.md の personaQualifications にない`);
    if (q != null && e.scores?.authenticity < 3) err(id, '保有資格なら authenticity は 3');
    if (q == null && e.scores?.authenticity === 3) err(id, 'authenticity=3 は保有資格のときだけ');

    const c = e.competition ?? {};
    if (!COMPETITION_LEVELS.includes(c.level) || !Array.isArray(c.players) || !nonempty(c.basis)) err(id, 'competition.level / players / basis が不正');
    if (c.level === 'high' && e.scores?.competitionGap > 1) err(id, '競合 high なのに competitionGap>1');
    if (c.level === 'low' && e.scores?.competitionGap < 2) err(id, '競合 low なのに competitionGap<2');

    const cov = e.coverage ?? {};
    if (!Array.isArray(cov.siteDirs) || !Array.isArray(cov.kindleSeries) || !('noteExamKey' in cov) || !('coconalaScope' in cov)) { err(id, 'coverage の形が不正'); continue; }
    for (const d of cov.siteDirs) if (!refs.siteDirs.includes(d)) err(id, `coverage.siteDirs=${d} が content/site/ にない`);
    if (cov.noteExamKey != null && !refs.noteExamKeys.includes(cov.noteExamKey)) err(id, `coverage.noteExamKey=${cov.noteExamKey} が exam-brand.ts の ExamKey にない`);
    if (cov.coconalaScope != null && !refs.coconalaScopes.includes(cov.coconalaScope)) err(id, `coverage.coconalaScope=${cov.coconalaScope} が coconala-services.ts の CoconalaExamScope にない`);
    for (const s of cov.kindleSeries) if (!refs.kindleSeries.includes(s)) err(id, `coverage.kindleSeries「${s}」が Kindle catalog.json の series にない`);
    if (e.status === 'active' && cov.siteDirs.length === 0 && cov.noteExamKey == null) err(id, '対応中なのにサイト・note の対応先がない');
  }
  const claimed = (key) => catalog.exams.flatMap((e) => [e.coverage?.[key]].flat()).filter((v) => v != null);
  for (const key of ['siteDirs', 'noteExamKey', 'coconalaScope', 'kindleSeries']) {
    const seen = new Set();
    for (const v of claimed(key)) { if (seen.has(v)) err('coverage', `${key}=${v} が複数の試験に割り当てられている`); seen.add(v); }
  }
  // 対応先の取りこぼし（サイトに資格ディレクトリがあるのにカタログに無い）を検出する
  const covered = new Set(claimed('siteDirs'));
  for (const d of refs.siteDirs.filter((d) => refs.examSiteDirs?.includes(d) && !covered.has(d))) err('coverage', `content/site/${d} がどの試験にも割り当てられていない`);
  return errors;
}

/** content/site/<dir>/** の MDX を走査し、frontmatter の published で公開・非公開を数える。 */
export function countSiteDocs(root, dir) {
  const counts = { published: 0, unpublished: 0 };
  const walk = (p) => {
    for (const name of readdirSync(p)) {
      const full = join(p, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith('.mdx')) {
        const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(full, 'utf8'))?.[1] ?? '';
        if (/^published:\s*true\s*$/m.test(fm)) counts.published += 1;
        else counts.unpublished += 1;
      }
    }
  };
  walk(join(root, 'content', 'site', dir));
  return counts;
}

/**
 * 対応状況を集計する。inputs は CLI が実物から読み込んだもの。
 * inputs: { site: {dir: {published, unpublished}}, magazines: [{examKey, published}],
 *           coconala: [{scopes, status}], kindle: [{series, status}] }
 */
export function buildCoverage(exam, inputs) {
  const cov = exam.coverage;
  const site = cov.siteDirs.reduce((a, d) => ({ published: a.published + (inputs.site[d]?.published ?? 0), unpublished: a.unpublished + (inputs.site[d]?.unpublished ?? 0) }), { published: 0, unpublished: 0 });
  const mags = cov.noteExamKey == null ? [] : inputs.magazines.filter((m) => m.examKey === cov.noteExamKey);
  const coco = cov.coconalaScope == null ? [] : inputs.coconala.filter((s) => s.scopes.includes(cov.coconalaScope));
  const books = inputs.kindle.filter((b) => cov.kindleSeries.includes(b.series));
  return {
    site,
    note: { published: mags.filter((m) => m.published).length, total: mags.length },
    coconala: { listed: coco.filter((s) => s.status === 'listed').length, total: coco.length },
    kindle: { live: books.filter((b) => b.status === 'live').length, total: books.length },
  };
}
