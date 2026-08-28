// tests/video-outcomes-wiring.test.mjs
//
// 動画成果ビュー（DN-0110 Phase 3）の**配線**を機械で固定する。
//
// 守りたい事故: 計測は CI 供給が正（会社PCから GA4 を叩かない）なので、
// 「管理画面は campaign スナップショットを読むのに、CI がそれを取得していない」
// という配線切れが起きても、画面は静かに『未取得』を出し続けるだけで誰も気づかない。
// fetcher の dimension・workflow のステップ・UTM 契約の 3 点が揃っているかを固定する。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

test('GA4 fetcher が campaign 次元を解決できる（sessionCampaignName）', () => {
  const src = read('.claude/scripts/fetch-ga4-data.mjs');
  assert.match(src, /campaign:\s*"sessionCampaignName"/, 'DIMENSION_MAP に campaign が無い');
  assert.match(
    src,
    /campaignContent:\s*"sessionManualAdContent"/,
    'utm_content（longform/shorts）の切り分け用 dimension が無い',
  );
});

test('fetch-metrics.yml が campaign スナップショットを取得する', () => {
  const wf = read('.github/workflows/fetch-metrics.yml');
  assert.match(
    wf,
    /fetch-ga4-data -- --dimension campaign/,
    'campaign 取得ステップが無い＝管理画面は永久に「未取得」のまま',
  );
  // 供給先ディレクトリが develop へ publish される経路に乗っているか
  assert.match(wf, /git add[^\n]*\.claude\/state\/metrics\/ga4/, 'ga4 ディレクトリが commit 対象でない');
});

test('UTM 契約: campaign は packId・source は youtube・content は longform|shorts', () => {
  const cfg = JSON.parse(read('.claude/config/video-content.json'));
  assert.equal(cfg.utm.source, 'youtube');
  assert.equal(cfg.utm.medium, 'video');
  assert.equal(cfg.utm.campaign, '{packId}');
  assert.deepEqual(cfg.utm.contentEnum, ['longform', 'shorts']);
});

test('動画成果ビューが読むスナップショット prefix と fetcher の出力名が一致する', () => {
  // fetcher は `ga4-${dimension}${suffix}-${timestamp}.json` を書く（saveJson）。
  // admin は latestSnapshot('ga4', 'ga4-campaign') を読む。両者がずれると永久に未取得になる。
  const fetcher = read('.claude/scripts/fetch-ga4-data.mjs');
  assert.match(fetcher, /ga4-\$\{opts\.dimension\}\$\{suffix\}-\$\{timestamp\}\.json/);
  const view = read('tools/admin-app/src/lib/video-outcomes.ts');
  assert.match(view, /latestSnapshot\('ga4', 'ga4-campaign'\)/);
});

test('SNS join: レガシー Shorts 台帳と動画パック派生を混ぜない', () => {
  const src = read('tools/admin-app/src/lib/video-sns-join.ts');
  // 台帳（youtube-schedule.json）と派生（video-content-status.json）を別フィールドで返すこと
  assert.match(src, /legacyShorts/);
  assert.match(src, /packDerivatives/);
  assert.match(src, /youtube-schedule\.json/);
  assert.match(src, /video-content-status\.json/);
});
