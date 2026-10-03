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
import { join } from 'node:path';
import { loadConfig } from '../scripts/lib/video-content-check.mjs';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

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
  // 供給先が develop へ publish される経路に乗っているか（data/ の変更を台帳経由でまとめて add する）
  assert.match(wf, /ci-data\.mjs save [^\n]*--paths data/, '取得結果が退避されない');
  assert.match(wf, /ci-data\.mjs add --paths data/, 'data/ が commit 対象でない');
});

test('UTM 契約: source は youtube・medium は video・content は longform|shorts（正本は utm-templates.json の youtube.*）', () => {
  // 動画パックの契約 video-content.json に UTM の別宣言を持たない。検査が使う期待値は utm-templates.json から作る。
  assert.equal(JSON.parse(read('config/video-content.json')).utm, undefined, 'video-content.json に utm を持たせない');
  const { utm } = loadConfig(ROOT);
  assert.equal(utm.source, 'youtube');
  assert.equal(utm.medium, 'video');
  assert.deepEqual(utm.contentEnum, ['longform', 'shorts']);
});

test('動画成果ビューが読むスナップショット prefix と fetcher の出力名が一致する', () => {
  // fetcher は日ごとのレポートの枠 `${dimension}${suffix}` に書く（saveJson → writeReport）。
  // admin は台帳の ga4.campaign（latestSnapshot('ga4.campaign')）を読む。台帳の型と fetcher の名前がずれると永久に未取得になる。
  const fetcher = read('.claude/scripts/fetch-ga4-data.mjs');
  assert.match(fetcher, /reportIdOf\("ga4", `\$\{opts\.dimension\}\$\{suffix\}`\)/);
  const view = read('tools/admin-app/src/lib/video-outcomes.ts');
  assert.match(view, /latestSnapshot\('ga4\.campaign'\)/);
});

test('SNS join: レガシー Shorts 台帳と動画パック派生を混ぜない', () => {
  const src = read('tools/admin-app/src/lib/video-sns-join.ts');
  // 台帳（youtube-schedule.json）と派生（video-content-status.json）を別フィールドで返すこと
  assert.match(src, /legacyShorts/);
  assert.match(src, /packDerivatives/);
  assert.match(src, /youtube-schedule\.json/);
  assert.match(src, /video-content-status\.json/);
});
