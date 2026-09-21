/**
 * fetch-cloudflare-analytics.mjs / fetch-cloudflare-zone-config.mjs の run() を
 * fake fetchImpl（URL とメソッドで分岐）+ 一時 root で固定する。実 API は叩かない。
 */
import { strict as assert } from 'node:assert';
import test from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import process from 'node:process';
import { join } from 'node:path';
import { run as runAnalytics } from '../scripts/fetch-cloudflare-analytics.mjs';
import { run as runZoneConfig } from '../scripts/fetch-cloudflare-zone-config.mjs';

const FAKE_TOKEN = 'fake-token-do-not-leak-1234567890';

function makeRoot() {
  const root = mkdtempSync(join(tmpdir(), 'cf-fetch-'));
  mkdirSync(join(root, '.claude/config'), { recursive: true });
  writeFileSync(
    join(root, '.claude/config/cloudflare.json'),
    JSON.stringify({
      zoneName: 'doboku-note.com',
      graphql: 'https://api.cloudflare.com/client/v4/graphql',
      rest: 'https://api.cloudflare.com/client/v4',
      rulesetPhases: ['http_request_cache_settings', 'http_response_compression'],
      analytics: { windowDays: 7, topPaths: 50 },
    }),
  );
  return root;
}

function jsonResponse(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) };
}

const zoneLookupBody = { success: true, result: [{ id: 'zone123', plan: { name: 'Pro' } }] };

function dayGroup(date, jpRequests) {
  return {
    dimensions: { date },
    sum: {
      requests: jpRequests + 10,
      pageViews: jpRequests,
      bytes: 1000,
      cachedRequests: 5,
      threats: 0,
      countryMap: [{ clientCountryName: 'JP', requests: jpRequests, bytes: 900 }, { clientCountryName: 'US', requests: 10, bytes: 100 }],
      responseStatusMap: [{ edgeResponseStatus: 200, requests: jpRequests + 10 }],
    },
    uniq: { uniques: jpRequests },
  };
}

test('fetch-cloudflare-analytics: cf-zone ファイルを書き counts.daysReturned=7', async () => {
  const root = makeRoot();
  process.env.CLOUDFLARE_ANALYTICS_API_TOKEN = FAKE_TOKEN;
  const groups = Array.from({ length: 7 }, (_, i) => dayGroup(`2026-09-${14 + i}`, 100));
  const fetchImpl = async (url, opts) => {
    const u = String(url);
    if (u.includes('/zones?name=')) return jsonResponse(zoneLookupBody);
    if (u.includes('/graphql')) {
      const body = JSON.parse(opts.body);
      if (body.query.includes('httpRequests1dGroups')) {
        return jsonResponse({ data: { viewer: { zones: [{ httpRequests1dGroups: groups }] } } });
      }
      if (body.query.includes('httpRequestsAdaptiveGroups')) {
        return jsonResponse({ data: { viewer: { zones: [{ httpRequestsAdaptiveGroups: [{ sum: { requests: 5 }, dimensions: { clientRequestPath: '/exam/' } }] }] } } });
      }
      if (body.query.includes('firewallEventsAdaptiveGroups')) {
        return jsonResponse({ data: { viewer: { zones: [{ firewallEventsAdaptiveGroups: [{ count: 3, dimensions: { action: 'block', source: 'firewallManaged' } }] }] } } });
      }
    }
    throw new Error(`unexpected url: ${u}`);
  };

  const result = await runAnalytics({ fetchImpl, root, now: () => Date.parse('2026-09-21T01:00:00Z') });
  assert.equal(result.exitCode, 0);
  assert.equal(result.snapshot.counts.daysReturned, 7);
  assert.deepEqual(result.snapshot.fieldsUnavailable, []);
  assert.equal(result.snapshot.topPaths.rows[0].path, '/exam/');
  assert.equal(result.snapshot.botSignals.firewallEvents.byAction.block, 3);
  assert.deepEqual(result.snapshot.botSignals.botScoreBuckets, { unavailable: 'plan' });

  const outFile = join(root, '.claude/state/metrics/cloudflare/cf-zone-2026-09-21.json');
  assert.ok(existsSync(outFile));
  const written = readFileSync(outFile, 'utf8');
  assert.ok(!written.includes(FAKE_TOKEN), 'トークンが成果物に含まれてはいけない');
  delete process.env.CLOUDFLARE_ANALYTICS_API_TOKEN;
});

test('fetch-cloudflare-analytics: unknown field で 1 回だけ再試行し fieldsUnavailable に載る', async () => {
  const root = makeRoot();
  process.env.CLOUDFLARE_ANALYTICS_API_TOKEN = FAKE_TOKEN;
  const groups = Array.from({ length: 7 }, (_, i) => dayGroup(`2026-09-${14 + i}`, 50));
  let attempt = 0;
  const fetchImpl = async (url, opts) => {
    const u = String(url);
    if (u.includes('/zones?name=')) return jsonResponse(zoneLookupBody);
    if (u.includes('/graphql')) {
      const body = JSON.parse(opts.body);
      if (body.query.includes('httpRequests1dGroups')) {
        attempt += 1;
        if (attempt === 1) {
          return jsonResponse({ errors: [{ message: 'Cannot query field "threats" on type "httpRequests1dGroupsAdaptiveSum"' }] });
        }
        assert.ok(!body.query.includes('threats'), '再試行クエリから threats が落ちているはず');
        return jsonResponse({ data: { viewer: { zones: [{ httpRequests1dGroups: groups }] } } });
      }
      // topPaths / firewall probe は失敗させて unavailable 経路も確認する
      return jsonResponse({ errors: [{ message: 'internal error' }] });
    }
    throw new Error(`unexpected url: ${u}`);
  };

  const result = await runAnalytics({ fetchImpl, root, now: () => Date.parse('2026-09-21T01:00:00Z') });
  assert.equal(result.exitCode, 0);
  assert.deepEqual(result.snapshot.fieldsUnavailable, ['threats']);
  assert.equal(attempt, 2);
  assert.ok(typeof result.snapshot.topPaths.unavailable === 'string');
  assert.ok(typeof result.snapshot.botSignals.firewallEvents.unavailable === 'string');
  delete process.env.CLOUDFLARE_ANALYTICS_API_TOKEN;
});

test('fetch-cloudflare-analytics: 0 日は exit 2 で成果物を書かない', async () => {
  const root = makeRoot();
  process.env.CLOUDFLARE_ANALYTICS_API_TOKEN = FAKE_TOKEN;
  const fetchImpl = async (url) => {
    const u = String(url);
    if (u.includes('/zones?name=')) return jsonResponse(zoneLookupBody);
    if (u.includes('/graphql')) return jsonResponse({ data: { viewer: { zones: [{ httpRequests1dGroups: [] }] } } });
    throw new Error(`unexpected url: ${u}`);
  };

  const result = await runAnalytics({ fetchImpl, root, now: () => Date.parse('2026-09-21T01:00:00Z') });
  assert.equal(result.exitCode, 2);
  assert.ok(!existsSync(join(root, '.claude/state/metrics/cloudflare')));
  delete process.env.CLOUDFLARE_ANALYTICS_API_TOKEN;
});

test('fetch-cloudflare-analytics: トークン未設定は exit 1', async () => {
  const root = makeRoot();
  delete process.env.CLOUDFLARE_ANALYTICS_API_TOKEN;
  delete process.env.CLOUDFLARE_API_TOKEN;
  const result = await runAnalytics({ fetchImpl: async () => { throw new Error('should not fetch'); }, root });
  assert.equal(result.exitCode, 1);
  assert.equal(result.reason, 'auth-unavailable');
});

// --- zone-config ---

const settingsBody = { success: true, result: [{ id: 'brotli', value: 'on', editable: true }] };
const rulesetBody = (rules) => ({ success: true, result: { rules } });
const botManagementBody = { success: true, result: { fight_mode: false, enable_js: true } };

function zoneConfigFetch({ botStatus = 200, entrypointStatus = 200, rules = [{ description: 'a', action: 'block', expression: 'true', enabled: true }] } = {}) {
  return async (url) => {
    const u = String(url);
    if (u.includes('/zones?name=')) return jsonResponse(zoneLookupBody);
    if (u.includes('/settings')) return jsonResponse(settingsBody);
    if (u.includes('/rulesets/phases/')) {
      if (entrypointStatus === 404) return jsonResponse({ success: false, errors: [{ message: 'not found' }] }, 404);
      return jsonResponse(rulesetBody(rules));
    }
    if (u.includes('/bot_management')) {
      if (botStatus === 403 || botStatus === 404) return jsonResponse({ success: false, errors: [{ message: 'forbidden' }] }, botStatus);
      return jsonResponse(botManagementBody);
    }
    throw new Error(`unexpected url: ${u}`);
  };
}

test('fetch-cloudflare-zone-config: 初回は baseline を作る', async () => {
  const root = makeRoot();
  process.env.CLOUDFLARE_ANALYTICS_API_TOKEN = FAKE_TOKEN;
  const result = await runZoneConfig({ fetchImpl: zoneConfigFetch(), root, now: () => Date.parse('2026-09-21T01:00:00Z') });
  assert.equal(result.exitCode, 0);
  assert.equal(result.message, 'baseline created');
  assert.ok(existsSync(join(root, '.claude/state/cloudflare/zone-config-latest.json')));
  assert.ok(existsSync(join(root, '.claude/state/cloudflare/zone-config-baseline.json')));
  delete process.env.CLOUDFLARE_ANALYTICS_API_TOKEN;
});

test('fetch-cloudflare-zone-config: 設定変更を drift として検知し --accept-baseline で解消する', async () => {
  const root = makeRoot();
  process.env.CLOUDFLARE_ANALYTICS_API_TOKEN = FAKE_TOKEN;
  await runZoneConfig({ fetchImpl: zoneConfigFetch(), root, now: () => Date.parse('2026-09-21T01:00:00Z') });

  const changed = await runZoneConfig({
    fetchImpl: zoneConfigFetch({ rules: [{ description: 'a', action: 'block', expression: 'true', enabled: false }] }),
    root,
    now: () => Date.parse('2026-09-22T01:00:00Z'),
  });
  assert.equal(changed.exitCode, 2);
  assert.equal(changed.reason, 'drift');
  assert.ok(changed.diff.changed.length > 0);
  const driftPath = join(root, '.claude/state/cloudflare/zone-config-drift.json');
  assert.ok(existsSync(driftPath));
  const driftText = readFileSync(driftPath, 'utf8');
  assert.ok(!driftText.includes(FAKE_TOKEN));

  const accepted = await runZoneConfig({ fetchImpl: zoneConfigFetch(), root, argv: ['--accept-baseline'] });
  assert.equal(accepted.exitCode, 0);
  assert.ok(!existsSync(driftPath));

  const stable = await runZoneConfig({
    fetchImpl: zoneConfigFetch({ rules: [{ description: 'a', action: 'block', expression: 'true', enabled: false }] }),
    root,
    now: () => Date.parse('2026-09-23T01:00:00Z'),
  });
  assert.equal(stable.exitCode, 0);
  assert.equal(stable.message, 'no drift');
  delete process.env.CLOUDFLARE_ANALYTICS_API_TOKEN;
});

test('fetch-cloudflare-zone-config: bot_management 403/404 は unavailable として記録され drift にならない', async () => {
  const root = makeRoot();
  process.env.CLOUDFLARE_ANALYTICS_API_TOKEN = FAKE_TOKEN;
  await runZoneConfig({ fetchImpl: zoneConfigFetch({ botStatus: 403 }), root });
  const latest = JSON.parse(readFileSync(join(root, '.claude/state/cloudflare/zone-config-latest.json'), 'utf8'));
  assert.deepEqual(latest.config.botManagement, {});

  const second = await runZoneConfig({ fetchImpl: zoneConfigFetch({ botStatus: 403 }), root, now: () => Date.parse('2026-09-22T01:00:00Z') });
  assert.equal(second.exitCode, 0);
  delete process.env.CLOUDFLARE_ANALYTICS_API_TOKEN;
});

test('fetch-cloudflare-zone-config: entrypoint 404 は rules: [] として記録', async () => {
  const root = makeRoot();
  process.env.CLOUDFLARE_ANALYTICS_API_TOKEN = FAKE_TOKEN;
  const result = await runZoneConfig({ fetchImpl: zoneConfigFetch({ entrypointStatus: 404 }), root });
  assert.equal(result.exitCode, 0);
  const latest = JSON.parse(readFileSync(join(root, '.claude/state/cloudflare/zone-config-latest.json'), 'utf8'));
  assert.deepEqual(latest.config.rulesets.http_request_cache_settings, []);
  delete process.env.CLOUDFLARE_ANALYTICS_API_TOKEN;
});
