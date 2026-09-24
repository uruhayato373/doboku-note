import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, unlinkSync, openSync, closeSync } from 'node:fs';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { kdpLiveBookIdsAsOf } from './kindle-catalog.mjs';

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
  const scopes = new Set(['all', ...c.qualifications.map(q => q.id)]);
  required(c.metrics.every(m => !m.appliesTo || (Array.isArray(m.appliesTo) && m.appliesTo.length > 0 && m.appliesTo.every(x => scopes.has(x)))), '指標の適用資格が不正です');
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
/**
 * GSC の確定データは終了日から4日未満だと揃わない。取得対象の期間はここだけで決める。
 * 未確定の期間は skip として返し、確定済みの期間の取得を巻き込んで止めない
 * （月初1〜4日の金曜に月次の throw で週次も含む fetch-metrics 全体が落ちた欠陥の是正）。
 */
export const GSC_FINAL_LAG_DAYS = 4;
export function duePeriods(cadences, today = jst()) {
  const due = [], skipped = [];
  for (const cadence of cadences) {
    const period = reviewPeriod(cadence, today);
    if (period.endDate > addDays(today, -GSC_FINAL_LAG_DAYS)) skipped.push({ cadence, period, reason: 'gsc-final-data-not-yet-due' });
    else due.push({ cadence, period });
  }
  return { due, skipped };
}
/** ISO 8601 の週キー（'2026-09-14' → '2026-W38'）。週次の期間（月〜日）と成長ダイジェストのファイル名が使う。 */
export function isoWeekKey(day) {
  required(validDay(day), '日付が不正です');
  const t = new Date(`${day}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}
/** 週キーの月〜日（'2026-W38' → { startDate: '2026-09-14', endDate: '2026-09-20' }）。 */
export function weekPeriod(key) {
  const m = /^(\d{4})-W(\d{2})$/.exec(String(key));
  required(m, '週キーが不正です（YYYY-Www）');
  const jan4 = new Date(Date.UTC(+m[1], 0, 4));
  const monday = new Date(jan4.getTime() - ((jan4.getUTCDay() || 7) - 1) * 86400000 + (+m[2] - 1) * 7 * 86400000);
  const startDate = monday.toISOString().slice(0, 10);
  return { startDate, endDate: addDays(startDate, 6) };
}
export const samePeriod = (a, b) => a?.startDate === b?.startDate && a?.endDate === b?.endDate;
export function records(root) {
  const dir = join(root, RECORDS);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => /^(measurement|snapshot|review|target)-[\w-]+\.json$/.test(f)).sort().map(f => ({ ...readJson(root, `${RECORDS}/${f}`), file: `${RECORDS}/${f}` }));
}
/**
 * 記録を検証するときの事業方針。レビュー/目標は参照するスナップショットに凍結された strategy を正とする
 * （重点資格を後から増やしても過去記録は不変＝「過去の目標は追記履歴に残す」。2026-09-15 に RCCM 追加で
 * 過去レビューが『重点資格をすべて確認』で偽赤になったのを是正）。スナップショット参照が無い記録は現行方針。
 */
export function strategyForRecord(record, rows, config) {
  const snap = record.snapshot ? rows.find(x => x.kind === 'snapshot' && x.file === record.snapshot) : null;
  return snap?.strategy?.qualifications && snap.strategy.metrics ? snap.strategy : config;
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
    required(['GA4', 'GSC', 'note', 'KDP', 'coconala', 'operations', 'instagram', 'cloudflare'].includes(r.channel), '計測元が不正です');
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
/** dir 配下で prefix + *.json に一致するファイル全部を名前順（＝日付昇順）で返す。無ければ []。 */
export function latestAll(root, dir, prefix) {
  if (!existsSync(join(root, dir))) return [];
  return readdirSync(join(root, dir)).filter(f => f.startsWith(prefix) && f.endsWith('.json')).sort()
    .map(f => ({ file: `${dir}/${f}`, data: readJson(root, `${dir}/${f}`) }));
}
/**
 * latestAll() が返す [{file, data}] の各 data[key]（日別行の配列）を date で合流させる。
 * 同じ date が複数 snapshot にあれば、後で処理した snapshot（＝名前順で後＝新しい）を採用する（後勝ち）。
 * 戻り値は date 昇順の配列。
 */
export function unionDaily(snapshots, key = 'daily') {
  const byDate = new Map();
  for (const snap of snapshots ?? []) {
    for (const row of Array.isArray(snap?.data?.[key]) ? snap.data[key] : []) {
      if (row?.date) byDate.set(row.date, row);
    }
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
/** rows（{date,...}[]）が period の全日を含めば complete、欠落があれば partial（欠落日数つき）。 */
export function coverageForPeriod(rows, period) {
  const have = new Set((rows ?? []).map(r => r.date));
  let missingDays = 0;
  for (let d = period.startDate; d <= period.endDate; d = addDays(d, 1)) {
    if (!have.has(d)) missingDays += 1;
  }
  return { coverage: missingDays === 0 ? 'complete' : 'partial', missingDays };
}
export const normalizeNoteTitle = value => String(value ?? '').normalize('NFKC').replace(/[【】｜|\s　・:：?？!！()（）\-—–―〜～「」『』［］\[\]]/g, '').toLowerCase();
export function noteArticleQualification(title, publishedItems = []) {
  const normalized = normalizeNoteTitle(title);
  const published = publishedItems.find(item => normalizeNoteTitle(item.title) === normalized);
  const slug = published?.slug ?? '';
  if (slug.startsWith('技術士総監/') || /総監|総合技術監理/.test(title)) return 'pe-comprehensive-management';
  if (slug.startsWith('RCCM/') || /RCCM/i.test(title)) return 'rccm';
  if (slug.startsWith('技術士建設部門/') || /技術士\s*建設部門|建設部門もくじ/.test(title)) return 'pe-construction';
  if (slug.startsWith('1級・2級土木/')) {
    if (/2級土木/.test(title) && !/1級土木|1級・2級土木|1・2級土木/.test(title)) return null;
    return 'civil-construction-1';
  }
  if (/1級土木|1級・2級土木|1・2級土木/.test(title)) return 'civil-construction-1';
  return null;
}
const sourceFact = (metric, value, period, source, qualification = 'all', coverage = 'complete', note = '') => ({ metric, value, period, source, qualification, coverage, note });
const monthsOf = (period) => [...new Set([period.startDate.slice(0, 7), period.endDate.slice(0, 7)])];
/**
 * note ダッシュボードの月次取得物（referrers-YYYY-MM / articles-pv-YYYY-MM）→ 事実。期間は取得物の月のまま返し、
 * 週へ按分しない（週次レビューでは「別期間の既存計測」に出る）。月の途中に取得したファイル（「今月」表示）は
 * 取得日までの値なので、期間を取得日で切って partial にする（月全体の値として月次セルへ入れない）。
 */
export function noteMonthFacts({ traffic, articles = null, publishedItems = [], qualifications = [], trafficPath, articlesPath }) {
  const month = { startDate: traffic?.period?.from, endDate: traffic?.period?.to };
  if (!validDay(month.startDate) || !validDay(month.endDate)) return [];
  const fetchedDay = traffic.fetchedAt ? jst(traffic.fetchedAt) : null;
  const midMonth = fetchedDay !== null && fetchedDay <= month.endDate;
  const period = midMonth ? { startDate: month.startDate, endDate: fetchedDay < month.startDate ? month.startDate : fetchedDay } : month;
  const partialNote = midMonth ? `${fetchedDay} 取得の月途中値（取得日当日は途中まで）。対象月の全期間ではない。` : '';
  const coverage = midMonth ? 'partial' : 'complete';
  const facts = [
    sourceFact('notePv', traffic.summary?.pageViews ?? null, period, trafficPath, 'all', coverage, `noteアクセス状況の対象月全記事。自己閲覧を含む。${partialNote}`),
    sourceFact('noteImpressions', traffic.summary?.impressions ?? null, period, trafficPath, 'all', coverage, `noteアクセス状況の対象月全記事。PVとは別指標。${partialNote}`),
  ];
  if (!articles) return facts;
  const rows = Array.isArray(articles.rows) ? articles.rows : [];
  const classified = rows.map(row => ({ row, qualification: noteArticleQualification(row.title, publishedItems) }));
  for (const qualification of qualifications) {
    const selected = classified.filter(x => x.qualification === qualification).map(x => x.row);
    const note = `記事別 ${selected.length}/${rows.length} 行を公開台帳とタイトル規則で資格帰属。未帰属記事があるため資格別は部分集計。${partialNote}`;
    facts.push(sourceFact('notePv', selected.reduce((sum, row) => sum + (Number(row.pageViews) || 0), 0), period, articlesPath, qualification, 'partial', note));
    facts.push(sourceFact('noteImpressions', selected.reduce((sum, row) => sum + (Number(row.impressions) || 0), 0), period, articlesPath, qualification, 'partial', note));
  }
  return facts;
}
/**
 * KDP 月次台帳の1か月分 → 事実。母数は catalog のうち対象月末までに LIVE だった本（kdpLiveBookIdsAsOf）。
 * 共有口座の他サイト書籍は書籍別行の bookId で除外し、口座合計は使わない。
 */
export function kdpMonthFacts({ entry, catalogBooks = [], attribution = [], qualifications = [], path }) {
  const period = { startDate: entry?.range?.start, endDate: entry?.range?.end };
  if (!validDay(period.startDate) || !validDay(period.endDate)) return [];
  const expectedBookIds = kdpLiveBookIdsAsOf(catalogBooks, period.endDate);
  const expected = new Set(expectedBookIds);
  const books = Array.isArray(entry.books) ? entry.books : [];
  const found = new Set(books.map(book => book.bookId).filter(Boolean));
  const matched = expectedBookIds.filter(id => found.has(id)).length;
  const coverage = entry.estimated === false && expectedBookIds.length > 0 && matched === expectedBookIds.length ? 'complete' : 'partial';
  const note = `${entry.estimated ? '推計値' : '確定値'}。doboku-note書籍 ${matched}/${expectedBookIds.length} 冊（対象月末までにLIVE）をcatalogへ紐付け（共有KDP口座の他サイト書籍は除外）。販売額・入金額ではない。`;
  const sum = list => list.reduce((total, book) => total + (Number(book.royalty) || 0), 0);
  const facts = [sourceFact('kdpRoyalty', sum(books.filter(book => expected.has(book.bookId))), period, path, 'all', coverage, `${note} 共有口座全体の合計は使わず、書籍別行を合算。`)];
  for (const qualification of qualifications) {
    const selected = books.filter(book => attribution.find(rule => rule.ids?.includes(book.bookId) || rule.prefixes?.some(prefix => book.bookId?.startsWith(prefix)))?.qualification === qualification);
    facts.push(sourceFact('kdpRoyalty', sum(selected), period, path, qualification, coverage, `${note} 書籍IDの資格帰属で集計。`));
  }
  return facts;
}
/** 'M月D日'（年なし）/'YYYY年M月D日' → YYYY-MM-DD。年なしは取得日から遡る直近の日付。時刻表示・相対表示は null（日付を確定できない）。 */
export function coconalaDmDate(dateText, fetchedDay) {
  const text = String(dateText ?? '').trim();
  const full = /^(\d{4})年(\d{1,2})月(\d{1,2})日$/.exec(text);
  const short = /^(\d{1,2})月(\d{1,2})日$/.exec(text);
  if (!full && !short) return null;
  const [y, m, d] = full ? [Number(full[1]), Number(full[2]), Number(full[3])] : [Number(fetchedDay.slice(0, 4)), Number(short[1]), Number(short[2])];
  const pad = n => String(n).padStart(2, '0');
  let day = `${y}-${pad(m)}-${pad(d)}`;
  if (!validDay(day)) return null;
  if (!full && day > fetchedDay) day = `${y - 1}-${pad(m)}-${pad(d)}`;
  return validDay(day) ? day : null;
}
/**
 * ココナラ購入前相談（DM）。DM 一覧はスレッドの最新日しか持たないので件数は復元できない。確定できるのは
 * 「期間終了後に一覧を全件取得し、運営通知を除く全スレッドの最新日が期間開始より前＝期間中に DM が1通も無い」
 * ときの 0 件だけ。それ以外は null（欠測）と理由を返し、0 にしない。資格別は全体が 0 件のときだけ 0 件。
 */
export function coconalaInquiryFacts({ snapshot, period, qualifications = [], path }) {
  const put = (value, coverage, note) => ['all', ...qualifications].map(q => sourceFact('coconalaInquiries', value, period, path, q, coverage, note));
  const tabOk = snapshot?.status === 'ok' && snapshot.scan?.tabs?.some(t => t.key === 'inquiries' && t.ok);
  const fetchedDay = snapshot?.fetchedAt ? jst(snapshot.fetchedAt) : null;
  if (!tabOk || !fetchedDay) return put(null, 'missing', '問い合わせ(DM)一覧を全件取得できていないため確認できない。');
  if (fetchedDay <= period.endDate) return put(null, 'missing', `DM一覧の取得（${fetchedDay}）が期間終了前のため、期間全体を確認できない。`);
  const threads = (Array.isArray(snapshot.inquiries) ? snapshot.inquiries : []).filter(t => !t.fromStaff && !t.oneWay);
  const dated = threads.map(t => coconalaDmDate(t.dateText, fetchedDay));
  if (dated.some(day => day === null)) return put(null, 'missing', 'DM一覧に日付を確定できない行があるため件数を確定できない。');
  const active = dated.filter(day => day >= period.startDate).length;
  if (active > 0) return put(null, 'missing', `期間開始以降に動きのあるDMスレッドが ${active} 件あり、一覧は最新日しか持たないため期間内の相談件数を確定できない。`);
  return put(0, 'complete', `${fetchedDay} 取得のDM一覧 ${threads.length} スレッド（運営通知除く）の最新日がすべて期間開始より前。期間中の購入前相談は0件。見積り依頼の取り下げ分は含まない。`);
}
/** ココナラ サービス分析（30日ローリング）→ 事実。期間は分析画面の窓のまま返し、週・暦月へ換算しない。 */
export function coconalaViewFacts({ snapshot, path }) {
  const p = snapshot?.period?.services;
  if (!p) return [];
  const period = { startDate: p.startDate ?? p.from, endDate: p.endDate ?? p.to };
  const services = Array.isArray(snapshot.services) ? snapshot.services.filter(s => s.ok !== false) : [];
  const sum = list => list.some(s => !Number.isInteger(s.views)) ? null : list.reduce((total, s) => total + s.views, 0);
  const rolling = 'サービス分析の30日ローリング。週・暦月へ換算しない。';
  const rccm = services.filter(s => s.serviceId?.startsWith('coconala-rccm-'));
  const civil1 = services.filter(s => /(^|-)1kyu(-|$)/.test(s.serviceId ?? ''));
  return [
    sourceFact('coconalaViews', snapshot.totals?.views ?? null, period, path, 'all', 'partial', `サービス分析の全体値。${rolling}`),
    sourceFact('coconalaViews', sum(rccm), period, path, 'rccm', 'partial', `RCCM出品 ${rccm.length} 件の合計。${rolling}`),
    sourceFact('coconalaViews', sum(civil1), period, path, 'civil-construction-1', 'partial', `1級専用出品 ${civil1.length} 件の合計。1・2級共通の出品は資格へ帰属できないため含まない。${rolling}`),
  ];
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
  const noteMonth = period.startDate.slice(0, 7);
  const noteTrafficPath = `.claude/state/metrics/note/referrers-${noteMonth}.json`;
  const noteArticlesPath = `.claude/state/metrics/note/articles-pv-${noteMonth}.json`;
  const publishedPath = '.claude/state/note-published.json';
  const publishedItems = existsSync(join(root, publishedPath)) ? readJson(root, publishedPath).items ?? [] : [];
  const qualificationIds = c.qualifications.map(q => q.id);
  // 月次の取得物は月の期間のまま載せる。期間が一致するレビュー（月次）だけがセルに使い、週次は別期間として表示する。
  for (const month of monthsOf(period)) {
    const trafficPath = `.claude/state/metrics/note/referrers-${month}.json`, articlesPath = `.claude/state/metrics/note/articles-pv-${month}.json`;
    if (!existsSync(join(root, trafficPath))) continue;
    const articles = existsSync(join(root, articlesPath)) ? readJson(root, articlesPath) : null;
    facts.push(...noteMonthFacts({ traffic: readJson(root, trafficPath), articles, publishedItems, qualifications: qualificationIds, trafficPath, articlesPath }));
  }
  const salesPath = '.claude/state/sales/sales-log.json';
  if (existsSync(join(root, salesPath))) {
    const sales = readJson(root, salesPath).sales.filter(s => s.date.slice(0, 10) >= period.startDate && s.date.slice(0, 10) <= period.endDate);
    const totalRevenue = sales.reduce((sum, sale) => sum + (Number(sale.price) || 0), 0);
    const traffic = existsSync(join(root, noteTrafficPath)) ? readJson(root, noteTrafficPath) : null;
    const trafficPeriod = { startDate: traffic?.period?.from, endDate: traffic?.period?.to };
    const salesComplete = samePeriod(trafficPeriod, period)
      && Number.isInteger(traffic?.summary?.salesYen)
      && traffic.summary.salesYen === totalRevenue
      && sales.every(sale => !String(sale.productId ?? '').startsWith('article:unknown-'));
    const salesCoverage = salesComplete ? 'complete' : 'partial';
    const salesNote = salesComplete
      ? `販売履歴 ${sales.length} 件・¥${totalRevenue.toLocaleString()}をnote月次売上表示と照合し一致。productId未解決0件。`
      : '台帳への登録分。note月次売上表示との一致またはproductId解決が未完のため網羅性は未確認。';
    for (const qualification of ['all', ...c.qualifications.map(q => q.id)]) {
      const selected = qualification === 'all' ? sales : sales.filter(s => c.salesAttribution.rules.find(rule => rule.ids?.includes(s.productId) || rule.prefixes.some(prefix => s.productId?.startsWith(prefix)))?.qualification === qualification);
      put('noteSales', selected.length, period, salesPath, qualification, salesCoverage, `${salesNote} 全体には重点資格外・複数資格商品を含む。`);
      put('noteRevenue', selected.reduce((sum, s) => sum + s.price, 0), period, salesPath, qualification, salesCoverage, `${salesNote} 販売額は利益・実受取ではない。`);
    }
  }
  const kdpPath = '.claude/state/sales/kdp-royalties.json';
  if (existsSync(join(root, kdpPath))) {
    const ledger = readJson(root, kdpPath);
    const catalogPath = 'scripts/kindle-published/catalog.json';
    const catalogBooks = existsSync(join(root, catalogPath)) ? readJson(root, catalogPath).books ?? [] : [];
    const months = monthsOf(period);
    for (const entry of Object.values(ledger.months ?? {}).filter(row => months.includes(String(row?.range?.start ?? '').slice(0, 7)))) {
      facts.push(...kdpMonthFacts({ entry, catalogBooks, attribution: c.kindleAttribution?.rules ?? [], qualifications: qualificationIds, path: kdpPath }));
    }
  }
  const cocoOrdersPath = '.claude/state/coconala/orders-snapshot.json';
  const cocoLogPath = '.claude/state/coconala/orders-log.json';
  if (existsSync(join(root, cocoOrdersPath))) {
    const snapshot = readJson(root, cocoOrdersPath);
    const orders = (snapshot.orders ?? []).filter(order => order.soldOn >= period.startDate && order.soldOn <= period.endDate);
    const log = existsSync(join(root, cocoLogPath)) ? readJson(root, cocoLogPath).orders ?? [] : [];
    const logByRoom = new Map(log.map(order => [String(order.talkroomId), order]));
    const fullScan = snapshot.status === 'ok' && snapshot.scan?.tabsOk === snapshot.scan?.tabsTotal && snapshot.scan?.tabsTotal > 0;
    const mapped = orders.every(order => Number.isInteger(order.priceYen) && order.priceYen >= 0 && logByRoom.has(String(order.talkroomId)));
    const coverage = fullScan && mapped ? 'complete' : 'partial';
    const sourcePeriod = period;
    const note = `取引管理 ${snapshot.scan?.tabsOk ?? 0}/${snapshot.scan?.tabsTotal ?? 0} タブ・対象月 ${orders.length} 件をorders-logへ突合。キャンセルは除外。`;
    put('coconalaOrders', orders.length, sourcePeriod, cocoOrdersPath, 'all', coverage, note);
    put('coconalaRevenue', orders.reduce((sum, order) => sum + (Number(order.priceYen) || 0), 0), sourcePeriod, cocoOrdersPath, 'all', coverage, `${note} 手数料控除前。`);
    for (const qualification of c.qualifications.map(q => q.id)) {
      const selected = orders.filter(order => {
        const logged = logByRoom.get(String(order.talkroomId));
        if (!logged) return false;
        if (logged.serviceId?.startsWith('coconala-rccm-')) return qualification === 'rccm';
        return qualification === 'civil-construction-1' && logged.grade === 1;
      });
      put('coconalaOrders', selected.length, sourcePeriod, cocoOrdersPath, qualification, coverage, `${note} serviceIdと級で資格帰属。`);
      put('coconalaRevenue', selected.reduce((sum, order) => sum + (Number(order.priceYen) || 0), 0), sourcePeriod, cocoOrdersPath, qualification, coverage, `${note} serviceIdと級で資格帰属。手数料控除前。`);
    }
  }
  const igSnapshots = latestAll(root, '.claude/state/metrics/instagram', 'ig-insights-');
  if (igSnapshots.length > 0) {
    const igDaily = unionDaily(igSnapshots, 'daily').filter(r => r.date >= period.startDate && r.date <= period.endDate);
    const { coverage: igCoverage } = coverageForPeriod(igDaily, period);
    const igFile = igSnapshots.at(-1).file;
    const igReach = igDaily.reduce((sum, row) => sum + (Number(row.reach) || 0), 0);
    put('igReach', igReach, period, igFile, 'all', igCoverage, 'アカウント日次リーチの合計（延べ）。ユニークではない。');
    const followersCount = igSnapshots.at(-1).data?.account?.followersCount;
    put('igFollowers', Number.isFinite(followersCount) ? followersCount : null, period, igFile, 'all', 'complete', '期間末時点のストック。');
  }
  const cfSnapshots = latestAll(root, '.claude/state/metrics/cloudflare', 'cf-zone-');
  if (cfSnapshots.length > 0) {
    const cfDaily = unionDaily(cfSnapshots, 'daily').filter(r => r.date >= period.startDate && r.date <= period.endDate);
    const { coverage: cfCoverage } = coverageForPeriod(cfDaily, period);
    const cfFile = cfSnapshots.at(-1).file;
    const cfNote = 'Cloudflare edge 集計・bot を含む・GA4 と一致しない。GA4 の bot 疑義の突合用。';
    put('cfRequestsJp', cfDaily.reduce((sum, row) => sum + (Number(row.jp?.requests) || 0), 0), period, cfFile, 'all', cfCoverage, cfNote);
    put('cfRequestsOther', cfDaily.reduce((sum, row) => sum + (Number(row.other?.requests) || 0), 0), period, cfFile, 'all', cfCoverage, cfNote);
  }
  const cocoPath = '.claude/state/coconala/analytics-snapshot.json';
  if (existsSync(join(root, cocoPath))) facts.push(...coconalaViewFacts({ snapshot: readJson(root, cocoPath), path: cocoPath }));
  if (existsSync(join(root, cocoOrdersPath))) facts.push(...coconalaInquiryFacts({ snapshot: readJson(root, cocoOrdersPath), period, qualifications: qualificationIds, path: cocoOrdersPath }));
  return facts;
}
export function buildReport(root, period = reviewPeriod('weekly'), now = new Date()) {
  const c = direction(root), history = records(root);
  required(validDay(period.startDate) && validDay(period.endDate) && period.startDate <= period.endDate && period.endDate < jst(now), '完了した計測期間を指定してください');
  const observations = currentRecords(history, 'measurement');
  const sources = sourceFacts(root, c, period);
  const cells = ['all', ...c.qualifications.map(q => q.id)].flatMap(qualification => c.metrics.map(metric => {
    const applicable = !metric.appliesTo || metric.appliesTo.includes(qualification);
    if (!applicable) return { qualification, metric: metric.id, value: null, coverage: 'not-applicable', source: null, note: 'この資格では現在この指標を運用対象にしていません。', target: null, applicable: false };
    const measured = observations.find(r => r.qualification === qualification && r.subject === 'aggregate' && samePeriod(r.period, period) && Object.hasOwn(r.values, metric.id));
    const auto = sources.find(r => r.qualification === qualification && r.metric === metric.id && samePeriod(r.period, period));
    const fact = measured ? { value: measured.values[metric.id], source: measured.file, coverage: measured.coverage, note: measured.source } : auto;
    const target = currentRecords(history, 'target').find(t => t.qualification === qualification && t.metric === metric.id && t.effectiveDate <= period.startDate);
    const elsewhere = [...new Set(sources.filter(r => r.qualification === qualification && r.metric === metric.id && r.value != null && !samePeriod(r.period, period)).map(r => `${r.period.startDate}〜${r.period.endDate}`))];
    const missingNote = elsewhere.length ? `この期間の集計はありません。${elsewhere.join('・')} の値は別期間の既存計測に表示し、この期間へ按分・換算しません。` : 'この資格・指標・期間の集計は未取得です。';
    return { qualification, metric: metric.id, value: fact?.value ?? null, coverage: fact?.coverage ?? 'missing', source: fact?.source ?? null, note: fact?.note ?? missingNote, target: target ?? null, applicable: true };
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
