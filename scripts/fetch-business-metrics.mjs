#!/usr/bin/env node
/** Calendar-period aggregates. Credentials and user identifiers never enter stored records. */
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { google } from 'googleapis';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { direction, duePeriods, records, currentRecords, samePeriod, saveRecord } from './lib/business-direction.mjs';
const root = process.cwd(), args = process.argv.slice(2);
dotenv.config({ path: '.env.local', quiet: true });
const field = (fieldName, value, matchType = 'EXACT') => ({ filter: { fieldName, stringFilter: { matchType, value } } });
async function run() {
  const c = direction(root), key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH, id = process.env.GA4_PROPERTY_ID;
  if (!key || !id) throw new Error('credentials-unavailable');
  if (id !== '419382901') throw new Error('property-mismatch');
  const credentials = JSON.parse(readFileSync(resolve(root, key), 'utf8'));
  const ga = new BetaAnalyticsDataClient({ credentials });
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/webmasters.readonly'] });
  const gsc = google.searchconsole({ version: 'v1', auth });
  const monthlyOnly = args.includes('--monthly');
  // GSC final data can lag. Skip only the unfinished period; the finished one is still fetched.
  const { due, skipped } = duePeriods(monthlyOnly ? ['monthly'] : ['weekly', 'monthly']);
  for (const s of skipped) console.log(`[business-metrics] ${s.cadence} ${s.period.startDate}〜${s.period.endDate} はGSC確定前（終了日から4日未満）のため取得しない`);
  if (!due.length) {
    if (monthlyOnly) throw new Error('gsc-final-data-not-yet-due');
    console.log('[business-metrics] 取得対象0件（全期間がGSC確定前）。記録なし'); return;
  }
  const pending = [];
  for (const { period } of due) {
    for (const qualification of ['all', ...c.qualifications.map(q => q.id)]) {
      const expressions = [field('country', 'Japan'), field('sessionDefaultChannelGroup', 'Organic Search')];
      if (qualification !== 'all') expressions.push(field('pagePath', `/exam/${qualification}/`, 'BEGINS_WITH'));
      const [users] = await ga.runReport({ property: `properties/${id}`, dateRanges: [period], metrics: [{ name: 'activeUsers' }], dimensionFilter: { andGroup: { expressions } } });
      const values = { organicUsers: Number(users.rows?.[0]?.metricValues?.[0]?.value ?? 0) };
      const eventExpressions = [field('country', 'Japan'), { filter: { fieldName: 'eventName', inListFilter: { values: ['note_cta_click', 'quiz_start', 'quiz_complete'] } } }];
      if (qualification !== 'all') eventExpressions.push(qualification === 'civil-construction-1' ? { orGroup: { expressions: [field('pagePath', `/exam/${qualification}/`, 'BEGINS_WITH'), field('pagePath', '/tools/kakomon-quiz')] } } : field('pagePath', `/exam/${qualification}/`, 'BEGINS_WITH'));
      const [events] = await ga.runReport({ property: `properties/${id}`, dateRanges: [period], dimensions: [{ name: 'eventName' }], metrics: [{ name: 'eventCount' }], dimensionFilter: { andGroup: { expressions: eventExpressions } } });
      values.noteCtaClicks = Number(events.rows?.find(r => r.dimensionValues?.[0]?.value === 'note_cta_click')?.metricValues?.[0]?.value ?? 0);
      if (['all','civil-construction-1'].includes(qualification)) for (const [event, metric] of [['quiz_start','quizStarts'],['quiz_complete','quizCompletions']]) values[metric] = Number(events.rows?.find(r => r.dimensionValues?.[0]?.value === event)?.metricValues?.[0]?.value ?? 0);
      const limited = users.metadata?.subjectToThresholding || events.metadata?.subjectToThresholding || users.metadata?.samplingMetadatas?.length || events.metadata?.samplingMetadatas?.length;
      pending.push({ kind: 'measurement', qualification, period, channel: 'GA4', subject: 'aggregate', coverage: limited ? 'partial' : 'complete', source: 'GA4 Data API properties/419382901・日本。自然検索人数は期間全体。資格別は正規URL配下、演習は1級土木ツールを含む。', values });
      const filters = [{ dimension: 'country', operator: 'equals', expression: 'jpn' }];
      if (qualification !== 'all') filters.push({ dimension: 'page', operator: 'includingRegex', expression: `^https://doboku-note\\.com/exam/${qualification}/` });
      const { data } = await gsc.searchanalytics.query({ siteUrl: 'sc-domain:doboku-note.com', requestBody: { ...period, type: 'web', dataState: 'final', dimensionFilterGroups: [{ filters }] } });
      pending.push({ kind: 'measurement', qualification, period, channel: 'GSC', subject: 'aggregate', coverage: 'complete', source: 'GSC Search Analytics API sc-domain:doboku-note.com・日本/Web/final・日付は太平洋時間。資格別は正規URL配下。', values: { gscClicks: Number(data.rows?.[0]?.clicks ?? 0) } });
    }
  }
  if (!args.includes('--commit')) { console.log(`[business-metrics] dry-run: ${pending.length}集計取得。--commitで追記`); return; }
  let count = 0;
  for (const r of pending) {
    const old = currentRecords(records(root), 'measurement').find(x => x.qualification === r.qualification && x.channel === r.channel && x.subject === r.subject && samePeriod(x.period, r.period));
    if (old && JSON.stringify(old.values) === JSON.stringify(r.values) && old.coverage === r.coverage) continue;
    saveRecord(root, { ...r, ...(old ? { supersedes: old.file } : {}) }); count++;
  }
  console.log(`[business-metrics] ${pending.length}集計検査、${count}記録追記。個人情報なし`);
}
// exit 1 = 取得失敗、exit 2 = 明示の --monthly が確定前で取得対象外（検査不成立）。
run().catch((e) => { const reason = ['credentials-unavailable', 'property-mismatch', 'gsc-final-data-not-yet-due'].includes(e.message) ? e.message : 'api-or-network-failed'; console.error(`[business-metrics] 取得不成立 (${reason})。未取得値は記録しません。`); process.exitCode = reason === 'gsc-final-data-not-yet-due' ? 2 : 1; });
