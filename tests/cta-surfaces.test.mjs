import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';
import { loadTsModule } from './lib/load-ts.mjs';

// サイトの広い面の案内先の台帳（config/site-cta-surfaces.json・DN-1223）。季節の窓の決め方と、台帳読みに移したときに
// 以前のコード（hub-cta の 6 週間前・建設部門の口頭試験 89 日・技術士一次と主任技士の試験日まで）と同じ時期になることを固定する。
const { activeSeason, seasonWindow, surfaceLeadProductId, surfaceRow } = await loadTsModule('src/lib/cta-surfaces.ts');
const calendar = JSON.parse(readFileSync(join(ROOT, 'config/exam-calendar.json'), 'utf8')).exams;
const at = (date, clock) => Date.parse(`${date}T${clock}+09:00`);
const shift = (date, days) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

test('before-exam: days 日前の日の終わりの直後から、行事の日の終わりまで', () => {
  const second = calendar['civil-construction-1'].events.second.date;
  const season = surfaceRow('civil-construction-1').seasons.find((s) => s.kind === 'before-exam');
  const { start, end } = seasonWindow('civil-construction-1', season);
  assert.equal(end, at(second, '23:59:59'));
  assert.equal(end - start, 42 * 86_400_000);
  assert.equal(activeSeason('civil-construction-1', at(second, '12:00:00'))?.product, 'civil-1-chokuzen-pack');
  assert.equal(activeSeason('civil-construction-1', at(shift(second, 1), '00:00:00')), null);
});

test('after-event: 行事の日の 0 時から days 日間（建設部門の口頭試験は 11/4 なら 1/31 まで）', () => {
  const result = calendar['pe-construction'].events.writtenResult.date;
  const times = [at(shift(result, -1), '23:59:59'), at(result, '00:00:00'), at(shift(result, 88), '23:59:59'), at(shift(result, 89), '00:00:00')];
  assert.deepEqual(times.map((t) => activeSeason('pe-construction', t, 'after-event')?.product ?? null),
    [null, 'pe-construction-oral-guide', 'pe-construction-oral-guide', null]);
});

test('days の無い before-exam は行事の日までずっと（技術士一次は試験日まで直前パック、翌日から過去問 PDF）', () => {
  const exam = calendar['pe-first-stage'].events.exam.date;
  assert.equal(surfaceLeadProductId('pe-first-stage', at(shift(exam, -200), '12:00:00')), 'pe1-chokuzen-pack');
  assert.equal(surfaceLeadProductId('pe-first-stage', at(exam, '23:59:58')), 'pe1-chokuzen-pack');
  assert.equal(surfaceLeadProductId('pe-first-stage', at(shift(exam, 1), '00:00:00')), 'pe1-takuitsu-pdf');
});

test('もくじへ寄せる資格は季節外に先頭の商品を持たない（資格トップはもくじタイル）', () => {
  const second = calendar['civil-construction-2'].events.second.date;
  assert.equal(surfaceLeadProductId('civil-construction-2', at(shift(second, 30), '12:00:00')), undefined);
  assert.equal(surfaceLeadProductId('rccm', Date.now()), undefined);
  assert.equal(surfaceRow('no-such-category'), undefined);
});
