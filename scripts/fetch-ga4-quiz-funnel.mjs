#!/usr/bin/env node
/** 1級土木 無料演習のPhase 0ファネルをGA4 Data APIから取得する。 */
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import dotenv from 'dotenv';
import { resolveWindow } from '../.claude/scripts/lib/ga4-snapshot.mjs';
import { QUIZ_FUNNEL_EVENT_NAMES } from './lib/quiz-premium-funnel.mjs';

dotenv.config({ path: '.env.local' });

const OUTPUT_DIR = '.claude/state/metrics/ga4';
const PAGE_PATH = '/tools/kakomon-quiz';
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const days = Number(value('--days', '28'));
if (!Number.isInteger(days) || days < 1 || days > 365) {
  throw new Error('--days は1〜365の整数で指定してください');
}

function clientFromEnv() {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!keyPath || !propertyId || !existsSync(keyPath)) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY_PATH / GA4_PROPERTY_ID と鍵実体が必要です');
  }
  return {
    client: new BetaAnalyticsDataClient({ credentials: JSON.parse(readFileSync(keyPath, 'utf8')) }),
    property: `properties/${propertyId}`,
  };
}

const eventFilter = {
  andGroup: {
    expressions: [
      { filter: { fieldName: 'eventName', inListFilter: { values: QUIZ_FUNNEL_EVENT_NAMES } } },
      { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'EXACT', value: PAGE_PATH } } },
      { filter: { fieldName: 'country', stringFilter: { matchType: 'EXACT', value: 'Japan' } } },
    ],
  },
};

async function run() {
  const { client, property } = clientFromEnv();
  const { startDate, endDate, windowKind } = resolveWindow({ days });
  const [summary] = await client.runReport({
    property,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
    dimensionFilter: eventFilter,
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
    limit: 100,
  });

  let placementRows = [];
  let placementStatus = 'available';
  try {
    const [placement] = await client.runReport({
      property,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'eventName' }, { name: 'customEvent:cta_placement' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: eventFilter,
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: 200,
    });
    placementRows = (placement.rows ?? []).map((row) => ({
      eventName: row.dimensionValues?.[0]?.value ?? '',
      placement: row.dimensionValues?.[1]?.value ?? '',
      eventCount: Number(row.metricValues?.[0]?.value ?? 0),
    }));
  } catch (error) {
    placementStatus = /customEvent:cta_placement|valid.*dimension/i.test(String(error?.message ?? error))
      ? 'custom_dimension_unavailable'
      : 'request_failed';
  }

  const data = {
    meta: {
      startDate,
      endDate,
      windowKind,
      days,
      pagePath: PAGE_PATH,
      country: 'Japan',
      eventNames: QUIZ_FUNNEL_EVENT_NAMES,
      placementStatus,
    },
    rows: (summary.rows ?? []).map((row) => ({
      eventName: row.dimensionValues?.[0]?.value ?? '',
      eventCount: Number(row.metricValues?.[0]?.value ?? 0),
      totalUsers: Number(row.metricValues?.[1]?.value ?? 0),
    })),
    placementRows,
  };

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const output = join(OUTPUT_DIR, `ga4-quiz-funnel-${stamp}.json`);
  writeFileSync(output, JSON.stringify(data, null, 2) + '\n');
  console.log(`[fetch-ga4-quiz-funnel] ${data.rows.length}イベント / ${startDate}〜${endDate} / ${output}`);
}

run().catch((error) => {
  console.error('[fetch-ga4-quiz-funnel] FAIL: ' + String(error?.message ?? error).slice(0, 240));
  process.exit(1);
});
