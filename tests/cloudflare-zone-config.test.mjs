/**
 * cloudflare-zone-config.mjs の正規化・差分検知を固定する。fetch はしない。
 */
import { strict as assert } from 'node:assert';
import test from 'node:test';
import { normalizeZoneConfig, diffZoneConfig, hasDrift } from '../scripts/lib/cloudflare-zone-config.mjs';

const rawFixture = () => ({
  settings: [
    { id: 'brotli', value: 'on', editable: true, modified_on: '2026-09-01T00:00:00Z' },
    { id: 'always_use_https', value: 'on', editable: true },
  ],
  rulesets: {
    http_request_cache_settings: {
      rules: [
        { id: 'r1', version: '2', description: 'cache static', action: 'set_cache_settings', expression: 'http.request.uri.path contains "/static/"', enabled: true, last_updated: '2026-09-01T00:00:00Z' },
      ],
    },
    http_response_compression: null,
    http_request_firewall_managed: { rules: [] },
    http_request_dynamic_redirect: null,
    http_request_firewall_custom: null,
  },
  botManagement: { fight_mode: false, enable_js: true, session_score_decay_interval: 900 },
  plan: { id: 'pro' },
});

test('normalizeZoneConfig: id/version/modified_on/editable/last_updated を落とし rules をソートする', () => {
  const normalized = normalizeZoneConfig(rawFixture());
  assert.deepEqual(normalized.settings, { brotli: 'on', always_use_https: 'on' });
  assert.deepEqual(normalized.rulesets.http_request_cache_settings, [
    { description: 'cache static', action: 'set_cache_settings', expression: 'http.request.uri.path contains "/static/"', enabled: true },
  ]);
  assert.equal(normalized.rulesets.http_response_compression, null);
  assert.deepEqual(normalized.rulesets.http_request_firewall_managed, []);
  assert.deepEqual(normalized.botManagement, { fight_mode: false, enable_js: true });
  assert.deepEqual(normalized.plan, { id: 'pro' });

  // ソート順の確認: description 昇順
  const multi = normalizeZoneConfig({
    rulesets: { http_request_firewall_custom: { rules: [
      { description: 'zzz-last', action: 'block', expression: 'true' },
      { description: 'aaa-first', action: 'block', expression: 'true' },
    ] } },
  });
  assert.deepEqual(
    multi.rulesets.http_request_firewall_custom.map((r) => r.description),
    ['aaa-first', 'zzz-last'],
  );
});

test('normalizeZoneConfig: botManagement.unavailable なら空オブジェクト', () => {
  const normalized = normalizeZoneConfig({ botManagement: { unavailable: true } });
  assert.deepEqual(normalized.botManagement, {});
});

test('diffZoneConfig: 同一設定は空の差分', () => {
  const normalized = normalizeZoneConfig(rawFixture());
  const diff = diffZoneConfig(normalized, normalized);
  assert.deepEqual(diff, { added: [], removed: [], changed: [] });
  assert.equal(hasDrift(diff), false);
});

test('diffZoneConfig: 設定値変更で changed に path/from/to', () => {
  const baseline = normalizeZoneConfig(rawFixture());
  const currentRaw = rawFixture();
  currentRaw.settings = currentRaw.settings.map((s) => (s.id === 'brotli' ? { ...s, value: 'off' } : s));
  const current = normalizeZoneConfig(currentRaw);
  const diff = diffZoneConfig(baseline, current);
  assert.deepEqual(diff.changed, [{ path: 'settings.brotli', from: 'on', to: 'off' }]);
  assert.equal(hasDrift(diff), true);
});

test('diffZoneConfig: ルール追加で added、削除で removed', () => {
  const baseline = normalizeZoneConfig(rawFixture());
  const currentRaw = rawFixture();
  currentRaw.rulesets.http_request_cache_settings.rules.push({
    id: 'r2', description: 'cache images', action: 'set_cache_settings', expression: 'http.request.uri.path contains "/img/"', enabled: true,
  });
  const current = normalizeZoneConfig(currentRaw);
  const diff = diffZoneConfig(baseline, current);
  assert.ok(diff.added.some((p) => p.startsWith('rulesets.http_request_cache_settings[')));
  assert.equal(hasDrift(diff), true);

  const removedRaw = rawFixture();
  removedRaw.rulesets.http_request_cache_settings.rules = [];
  const removedCurrent = normalizeZoneConfig(removedRaw);
  const removedDiff = diffZoneConfig(baseline, removedCurrent);
  assert.ok(removedDiff.removed.some((p) => p.startsWith('rulesets.http_request_cache_settings[')));
});

test('hasDrift: added/removed/changed いずれかがあれば true、全て空なら false', () => {
  assert.equal(hasDrift({ added: [], removed: [], changed: [] }), false);
  assert.equal(hasDrift({ added: ['x'], removed: [], changed: [] }), true);
  assert.equal(hasDrift({ added: [], removed: ['y'], changed: [] }), true);
  assert.equal(hasDrift({ added: [], removed: [], changed: [{ path: 'z', from: 1, to: 2 }] }), true);
});
