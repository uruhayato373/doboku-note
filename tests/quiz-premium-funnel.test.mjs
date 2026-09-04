import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';
import { summarizeQuizPremiumFunnel } from '../scripts/lib/quiz-premium-funnel.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

async function loadClientContract() {
  const source = readFileSync(ROOT + 'src/lib/quiz/funnel.ts', 'utf8');
  const js = buildSync({
    stdin: { contents: source, loader: 'ts' },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
  }).outputFiles[0].text;
  return import('data:text/javascript,' + encodeURIComponent(js));
}

test('イベント契約は exam / placement / mode の列挙値だけを送る', async () => {
  const { buildQuizFunnelEvent, QUIZ_FUNNEL_EVENTS } = await loadClientContract();
  assert.deepEqual(QUIZ_FUNNEL_EVENTS, [
    'quiz_start', 'quiz_complete', 'review_start', 'premium_view',
    'premium_intent', 'email_interest', 'line_interest', 'note_cta_click',
  ]);
  const payload = buildQuizFunnelEvent('premium_intent', {
    exam: 'civil-1', placement: 'quiz_result', mode: 'random',
  });
  assert.deepEqual(Object.keys(payload.params).sort(), ['cta_placement', 'exam', 'mode', 'placement']);
  assert.equal(JSON.stringify(payload).includes('email'), false, '個人情報フィールドを持たない');
});

test('メニューのPremium案内は初回問題前に出さない', async () => {
  const { shouldShowMenuPremium } = await loadClientContract();
  assert.equal(shouldShowMenuPremium(0, 0), false);
  assert.equal(shouldShowMenuPremium(1, 2), false);
  assert.equal(shouldShowMenuPremium(2, 0), true);
  assert.equal(shouldShowMenuPremium(0, 3), true);
});

const snapshot = (quizUsers, viewUsers, intentUsers) => ({
  meta: { startDate: '2026-09-01', endDate: '2026-09-28', pagePath: '/tools/kakomon-quiz' },
  rows: [
    { eventName: 'quiz_start', totalUsers: quizUsers, eventCount: quizUsers + 10 },
    { eventName: 'premium_view', totalUsers: viewUsers, eventCount: viewUsers + 5 },
    { eventName: 'premium_intent', totalUsers: intentUsers, eventCount: intentUsers },
  ],
});

test('成功条件は100利用者・閲覧比5%以上・購入意向10人をすべて要求する', () => {
  assert.equal(summarizeQuizPremiumFunnel(snapshot(99, 100, 10)).status, 'collecting');
  assert.equal(summarizeQuizPremiumFunnel(snapshot(100, 200, 9)).status, 'collecting');
  assert.equal(summarizeQuizPremiumFunnel(snapshot(100, 200, 10)).status, 'ready');
});

test('未取得は0件でなくnot_measuredとして扱う', () => {
  const summary = summarizeQuizPremiumFunnel(null);
  assert.equal(summary.measured, false);
  assert.equal(summary.status, 'not_measured');
  assert.equal(summary.metrics, null);
});

test('Phase 0表示は共有エンジン全体でなくpremiumPilot設定へ限定する', () => {
  const client = readFileSync(ROOT + 'src/app/tools/kakomon-quiz/KakomonQuizClient.tsx', 'utf8');
  assert.match(client, /premiumPilot\?: boolean/);
  assert.match(client, /premiumPilot: true/);
  assert.match(client, /config\.premiumPilot && shouldShowMenuPremium/);
  assert.match(client, /config\.premiumPilot && \(/);
});

test('定期計測workflowが取得と判定を連続実行する', () => {
  const workflow = readFileSync(ROOT + '.github/workflows/fetch-metrics.yml', 'utf8');
  const fetchIndex = workflow.indexOf('node scripts/fetch-ga4-quiz-funnel.mjs');
  const reportIndex = workflow.indexOf('node scripts/report-quiz-premium-funnel.mjs');
  assert.ok(fetchIndex >= 0, 'GA4取得がworkflowにない');
  assert.ok(reportIndex > fetchIndex, '判定は取得後に実行する');
});
