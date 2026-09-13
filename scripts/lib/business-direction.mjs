import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, unlinkSync, openSync, closeSync } from 'node:fs';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export const DIRECTION = '.claude/config/business-direction.json';
export const RECORDS = '.claude/state/metrics/business';
export const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const jst = (now = new Date()) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date(now));
export const addDays = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
export const readJson = (root, file) => JSON.parse(readFileSync(join(root, file), 'utf8'));
const required = (ok, message) => { if (!ok) throw new Error(message); };
const validDay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s ?? '') && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
const nonempty = (s) => typeof s === 'string' && s.trim().length >= 3 && s.length <= 4000;
export function direction(root) {
  const c = readJson(root, DIRECTION);
  required(c.version === 1 && nonempty(c.positioning) && c.qualifications.length > 0, '事業方針が不正です');
  required(new Set(c.qualifications.map(q => q.id)).size === c.qualifications.length, '資格IDが重複しています');
  required(new Set(c.metrics.map(m => m.id)).size === c.metrics.length && c.metrics.every(m => nonempty(m.definition) && m.target === null), '指標定義が不正です。目標は履歴へ記録してください');
  return c;
}
export function reviewPeriod(cadence, today = jst()) {
  required(['weekly', 'monthly'].includes(cadence) && validDay(today), 'レビュー周期・日付が不正です');
  if (cadence === 'monthly') {
    const endDate = addDays(`${today.slice(0, 7)}-01`, -1);
    return { startDate: `${endDate.slice(0, 7)}-01`, endDate };
  }
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  const endDate = addDays(today, -((weekday + 6) % 7) - 1);
  return { startDate: addDays(endDate, -6), endDate };
}
export const samePeriod = (a, b) => a?.startDate === b?.startDate && a?.endDate === b?.endDate;
export function records(root) {
  const dir = join(root, RECORDS);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => /^(measurement|snapshot|review|target)-[\w-]+\.json$/.test(f)).sort().map(f => ({ ...readJson(root, `${RECORDS}/${f}`), file: `${RECORDS}/${f}` }));
}
export function currentRecords(rows, kind) {
  const replaced = new Set(rows.map(r => r.supersedes).filter(Boolean));
  return rows.filter(r => r.kind === kind && !replaced.has(r.file)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function validateRecord(record, config, history = [], now = new Date()) {
  const r = record, scopes = ['all', ...config.qualifications.map(q => q.id)];
  required(['measurement', 'review', 'target', 'snapshot'].includes(r.kind), '記録種別が不正です');
  required(scopes.includes(r.qualification), '対象資格が不正です');
  required(validDay(r.period?.startDate) && validDay(r.period?.endDate) && r.period.startDate <= r.period.endDate && r.period.endDate < jst(now), '計測は終了した期間の日付を指定してください');
  if (r.supersedes) {
    const old = history.find(x => x.file === r.supersedes);
    required(old && currentRecords(history, r.kind).some(x => x.file === old.file) && old.kind === r.kind && old.qualification === r.qualification && samePeriod(old.period, r.period), '訂正先は同じ種類・資格・期間の最新記録に限ります');
    if (r.kind === 'measurement') required(old.channel === r.channel && old.subject === r.subject, '異なる対象・チャネルの計測は訂正できません');
    if (r.kind === 'review') required(old.cadence === r.cadence, 'レビュー周期が異なります');
    if (r.kind === 'target') required(old.metric === r.metric, '指標が異なります');
  }
  if (r.kind === 'measurement') {
    required(['GA4', 'GSC', 'note', 'coconala', 'operations'].includes(r.channel), '計測元が不正です');
    required(nonempty(r.source) && r.source.length <= 500 && !/[?]|(?:token|password|secret|BEGIN PRIVATE KEY)/i.test(r.source), '出典は秘密情報・URLクエリを含めず記録してください');
    required(nonempty(r.subject) && ['complete', 'partial'].includes(r.coverage), '計測対象と完全性を指定してください');
    required(r.values && Object.keys(r.values).length > 0, '計測値がありません');
    for (const [key, value] of Object.entries(r.values)) {
      const metric = config.metrics.find(m => m.id === key && m.channel === r.channel);
      required(metric && (value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0 && Number.isInteger(value))), '計測値・指標が不正です');
    }
    required(!currentRecords(history, 'measurement').some(x => x.channel === r.channel && x.qualification === r.qualification && x.subject === r.subject && samePeriod(x.period, r.period) && x.file !== r.supersedes), '同じ計測があります。訂正先を指定すると履歴を残して更新できます');
  }
  if (r.kind === 'target') {
    required(config.metrics.some(m => m.id === r.metric) && Number.isFinite(r.value) && r.value >= 0 && ['at-least', 'at-most'].includes(r.direction), '目標値・方向が不正です');
    required(validDay(r.effectiveDate) && validDay(r.reviewDate) && r.reviewDate > r.effectiveDate && nonempty(r.reason), '目標の適用日・見直し日・設定理由が必要です');
    const baseline = history.find(x => x.file === r.snapshot && x.kind === 'snapshot');
    required(baseline && samePeriod(baseline.period, r.period), '基準となる計測スナップショットが必要です');
    const row = baseline.cells.find(x => x.metric === r.metric && x.qualification === r.qualification);
    required(row && row.value != null && row.coverage === 'complete', '目標には対象範囲が揃った実測基準が必要です');
  }
  if (r.kind === 'review') {
    required(['weekly', 'monthly'].includes(r.cadence), 'レビュー周期が不正です');
    const nextDay = addDays(r.period.endDate, 1);
    required(samePeriod(reviewPeriod(r.cadence, nextDay), r.period), '週次は月曜〜日曜、月次は暦月を指定してください');
    required(['complete', 'provisional'].includes(r.status) && ['findings', 'decision', 'nextAction'].every(k => nonempty(r[k])) && validDay(r.nextReviewDate) && r.nextReviewDate > jst(now), '判断・次の一手・次回日を記録してください');
    const snapshot = history.find(x => x.file === r.snapshot && x.kind === 'snapshot');
    required(snapshot && samePeriod(snapshot.period, r.period), 'レビュー期間と同じスナップショットが必要です');
    required(Array.isArray(r.qualificationsReviewed) && config.qualifications.every(q => r.qualificationsReviewed.includes(q.id)), '重点資格をすべて確認し、欠測も判断に含めてください');
    if (r.status === 'complete') required(config.qualifications.every(q => snapshot.cells.some(c => c.qualification === q.id && c.value !== null && c.coverage === 'complete')), '資格別の計測が不足しています。暫定レビューとして記録してください');
    required(!currentRecords(history, 'review').some(x => x.cadence === r.cadence && samePeriod(x.period, r.period) && x.file !== r.supersedes), '同じ期間のレビューがあります。訂正先を指定してください');
    required(Array.isArray(r.experimentIds) && r.experimentIds.every(x => typeof x === 'string' && x.length > 0 && x.length <= 120), '実験IDが不正です');
  }
  return r;
}
export function saveRecord(root, input, now = new Date()) {
  return withLock(root, () => saveUnlocked(root, input, now));
}
function saveUnlocked(root, input, now) {
  const history = records(root), c = direction(root);
  const allowed = ['kind', 'qualification', 'period', 'channel', 'source', 'subject', 'coverage', 'values', 'supersedes', 'metric', 'value', 'direction', 'effectiveDate', 'reviewDate', 'reason', 'snapshot', 'cadence', 'status', 'findings', 'decision', 'nextAction', 'nextReviewDate', 'qualificationsReviewed', 'experimentIds'];
  required(Object.keys(input).every(k => allowed.includes(k)), '未定義の記録項目があります');
  required(input.kind !== 'snapshot', 'スナップショットは専用コマンドで生成してください');
  const r = validateRecord(input, c, history, now);
  if (r.kind === 'review') {
    const experiments = readJson(root, '.claude/state/experiments.json').experiments;
    required(r.experimentIds.every(id => experiments.some(e => e.id === id)), '実験台帳にないIDです');
  }
  return appendRecord(root, { ...r, schemaVersion: 1, createdAt: new Date(now).toISOString(), strategyHash: hash(c) });
}
function withLock(root, action) {
  mkdirSync(join(root, RECORDS), { recursive: true });
  const lock = join(root, RECORDS, '.write-lock');
  let fd;
  try { fd = openSync(lock, 'wx'); } catch { throw new Error('別の記録が実行中です。完了後に再試行してください'); }
  try { return action(); } finally { closeSync(fd); unlinkSync(lock); }
}
function appendRecord(root, r) {
  mkdirSync(join(root, RECORDS), { recursive: true });
  const file = `${RECORDS}/${r.kind}-${r.createdAt.replace(/[:.]/g, '-')}-${randomUUID()}.json`;
  writeFileSync(join(root, file), `${JSON.stringify(r, null, 2)}\n`, { flag: 'wx' });
  return { ...r, file };
}
function latest(root, dir, prefix) {
  if (!existsSync(join(root, dir))) return null;
  const f = readdirSync(join(root, dir)).filter(f => f.startsWith(prefix) && f.endsWith('.json')).sort().at(-1);
  return f ? { data: readJson(root, `${dir}/${f}`), file: `${dir}/${f}` } : null;
}
/** Existing source ledgers remain authoritative. No customer details enter the report. */
export function sourceFacts(root, c, period) {
  const facts = [];
  const put = (metric, value, sourcePeriod, file, qualification = 'all', coverage = 'complete', note = '') => facts.push({ metric, value, period: sourcePeriod, source: file, qualification, coverage, note });
  const ga = latest(root, '.claude/state/metrics/ga4', 'ga4-channel-organic-');
  if (ga && ga.data.meta?.organicOnly && ga.data.meta?.japanOnly) {
    const row = ga.data.rows?.find(r => r.channel === 'Organic Search');
    if (row) put('organicUsers', row.activeUsers, ga.data.meta, ga.file);
  }
  const quiz = latest(root, '.claude/state/metrics/ga4', 'ga4-quiz-funnel-');
  if (quiz) for (const [event, metric] of [['quiz_start', 'quizStarts'], ['quiz_complete', 'quizCompletions']]) {
    const row = quiz.data.rows?.find(r => r.eventName === event);
    put(metric, row?.eventCount ?? null, quiz.data.meta, quiz.file, 'civil-construction-1', row ? 'complete' : 'partial', '無料演習ツールのみ。イベント欠落は0と確定しない。');
  }
  const salesPath = '.claude/state/sales/sales-log.json';
  if (existsSync(join(root, salesPath))) {
    const sales = readJson(root, salesPath).sales.filter(s => s.date.slice(0, 10) >= period.startDate && s.date.slice(0, 10) <= period.endDate);
    for (const qualification of ['all', ...c.qualifications.map(q => q.id)]) {
      const selected = qualification === 'all' ? sales : sales.filter(s => c.salesAttribution.rules.find(rule => rule.ids?.includes(s.productId) || rule.prefixes.some(prefix => s.productId?.startsWith(prefix)))?.qualification === qualification);
      put('noteSales', selected.length, period, salesPath, qualification, 'partial', '台帳への登録分。月別の取得完了証明がないため網羅性は未確認。');
      put('noteRevenue', selected.reduce((sum, s) => sum + s.price, 0), period, salesPath, qualification, 'partial', '登録分の販売額。利益ではない。全体には重点外・資格未帰属を含む。');
    }
  }
  const cocoPath = '.claude/state/coconala/analytics-snapshot.json';
  if (existsSync(join(root, cocoPath))) {
    const coco = readJson(root, cocoPath), p = coco.period?.services;
    if (p) for (const [field, metric] of [['views','coconalaViews'], ['orders','coconalaOrders'], ['salesYen','coconalaRevenue']]) put(metric, coco.totals?.[field] ?? null, { startDate: p.startDate ?? p.from, endDate: p.endDate ?? p.to }, cocoPath, 'all', 'partial', 'サービス分析の全体値。期間・欠測・マスクは元データを確認。');
  }
  return facts;
}
export function buildReport(root, period = reviewPeriod('weekly'), now = new Date()) {
  const c = direction(root), history = records(root);
  required(validDay(period.startDate) && validDay(period.endDate) && period.startDate <= period.endDate && period.endDate < jst(now), '完了した計測期間を指定してください');
  const observations = currentRecords(history, 'measurement');
  const sources = sourceFacts(root, c, period);
  const cells = ['all', ...c.qualifications.map(q => q.id)].flatMap(qualification => c.metrics.map(metric => {
    const measured = observations.find(r => r.qualification === qualification && r.subject === 'aggregate' && samePeriod(r.period, period) && Object.hasOwn(r.values, metric.id));
    const auto = sources.find(r => r.qualification === qualification && r.metric === metric.id && samePeriod(r.period, period));
    const fact = measured ? { value: measured.values[metric.id], source: measured.file, coverage: measured.coverage, note: measured.source } : auto;
    const target = currentRecords(history, 'target').find(t => t.qualification === qualification && t.metric === metric.id && t.effectiveDate <= period.startDate);
    return { qualification, metric: metric.id, value: fact?.value ?? null, coverage: fact?.coverage ?? 'missing', source: fact?.source ?? null, note: fact?.note ?? 'この資格・指標・期間の集計は未取得です。', target: target ?? null };
  }));
  const reviews = currentRecords(history, 'review');
  const due = ['weekly', 'monthly'].map(cadence => {
    const p = reviewPeriod(cadence, jst(now)), existing = reviews.find(r => r.cadence === cadence && samePeriod(r.period, p));
    return { cadence, period: p, record: existing?.file ?? null, due: !existing || existing.nextReviewDate <= jst(now), status: existing?.status ?? 'missing' };
  });
  const experiments = readJson(root, '.claude/state/experiments.json').experiments.filter(e => ['running','measuring'].includes(e.status) || e.watchStatus === 'pending-deploy').map(e => ({ id: e.id, title: e.title, status: e.status, nextReviewDate: e.next_check_date ?? null, overdue: e.next_check_date && e.next_check_date <= jst(now) }));
  const operatingBalance = ['all', ...c.qualifications.map(q => q.id)].map(qualification => {
    const receipts = cells.find(x => x.qualification === qualification && x.metric === 'netReceipts'), costs = cells.find(x => x.qualification === qualification && x.metric === 'costYen');
    return { qualification, value: receipts.coverage === 'complete' && costs.coverage === 'complete' && receipts.value != null && costs.value != null ? receipts.value - costs.value : null };
  });
  const followups = reviews.filter(r => r.status === 'provisional' && r.nextReviewDate <= jst(now));
  const seenTargets = new Set();
  const targetsDue = currentRecords(history, 'target').filter(t => { const key = `${t.qualification}:${t.metric}`; if (seenTargets.has(key)) return false; seenTargets.add(key); return t.reviewDate <= jst(now); });
  return { schemaVersion: 1, followups, targetsDue, operatingBalance, strategy: c, strategyHash: hash(c), period, cells, due, reviews, experiments, observations, sources, generatedAt: new Date(now).toISOString() };
}
export function snapshot(root, period, now = new Date()) {
  return withLock(root, () => snapshotUnlocked(root, period, now));
}
function snapshotUnlocked(root, period, now) {
  const report = buildReport(root, period, now);
  const sources = [...new Set(report.cells.map(c => c.source).filter(Boolean))].map(file => ({ file, sha256: createHash('sha256').update(readFileSync(join(root, file))).digest('hex') }));
  return appendRecord(root, { kind: 'snapshot', qualification: 'all', schemaVersion: 1, period, createdAt: new Date(now).toISOString(), strategyHash: report.strategyHash, strategy: report.strategy, cells: report.cells, sources });
}
export function assertLocalWrite(request) {
  const url = new URL(request.url), origin = request.headers.get('origin');
  const host = new URL(`http://${request.headers.get('host') ?? 'invalid'}`);
  required(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) && ['127.0.0.1', 'localhost', '[::1]'].includes(host.hostname) && host.port === url.port && origin === host.origin, 'ローカルの同一オリジンから記録してください');
  required(request.headers.get('content-type')?.startsWith('application/json') && Number(request.headers.get('content-length') ?? 0) <= 32768, 'JSONは32KB以内にしてください');
}
