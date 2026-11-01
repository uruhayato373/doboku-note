// URL 検査の周回（1 日の上限を超える分を次の日の実行が続ける・DN-0825）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { continuable, mergeBatch, planInspection } from '../scripts/lib/inspection-cycle.mjs';
import { GscUrlInspection } from '../scripts/lib/dataset-schemas-search.mjs';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

const NOW = Date.parse('2026-10-29T02:10:00Z'); // 木曜
const urls = (n) => Array.from({ length: n }, (_, i) => `https://doboku-note.com/p${i + 1}`);
const ok = (url) => ({ url, inspected_at: '2026-10-28T02:30:00Z', index: { verdict: 'PASS', coverage_state: '送信して登録されました', robots_txt_state: null, page_fetch_state: null, google_canonical: null, user_canonical: null } });
const wed = (results, total, extra = {}) => ({ schemaVersion: 1, generated_at: '2026-10-28T03:00:00Z', partial: results.length < total, completed: results.length, total, cycle: { startedAt: '2026-10-28T02:05:00Z', runs: 1 }, results, ...extra });

test('新しい周回: sitemap の先頭から上限まで検査し、周回の開始を今にする', () => {
  const p = planInspection({ sitemap: urls(5), prior: null, mode: 'auto', now: NOW, cap: 3 });
  assert.equal(p.action, 'new');
  assert.deepEqual(p.toInspect, urls(3));
  assert.deepEqual(p.carried, []);
  assert.deepEqual(p.cycle, { startedAt: new Date(NOW).toISOString(), runs: 1 });
  assert.equal(p.remaining, 5);
});

test('続き: 前回の結果を引き継ぎ、残りだけを検査する（失敗した URL と sitemap から消えた URL は引き継がない）', () => {
  const site = urls(6);
  const prior = wed([ok(site[0]), ok(site[1]), { url: site[2], error: 'HTTP 500' }, ok('https://doboku-note.com/gone')], 7);
  const p = planInspection({ sitemap: site, prior, mode: 'continue', now: NOW, cap: 3 });
  assert.equal(p.action, 'continue');
  assert.deepEqual(p.carried.map((r) => r.url), [site[0], site[1]]);
  assert.deepEqual(p.toInspect, [site[2], site[3], site[4]]);
  assert.equal(p.remaining, 4);
  assert.deepEqual(p.cycle, { startedAt: '2026-10-28T02:05:00Z', runs: 2 });
});

test('続ける周回が無いとき: continue は何もしない・auto は新しい周回・new は未完了でも新しい周回', () => {
  const done = wed(urls(3).map(ok), 3);
  assert.equal(planInspection({ sitemap: urls(3), prior: done, mode: 'continue', now: NOW }).action, 'skip');
  assert.equal(planInspection({ sitemap: urls(3), prior: done, mode: 'auto', now: NOW }).action, 'new');
  const partial = wed([ok(urls(3)[0])], 3);
  assert.equal(planInspection({ sitemap: urls(3), prior: partial, mode: 'new', now: NOW }).action, 'new');
});

test('水曜の保存失敗で直前が先週の完了 batch のままなら、木曜に新しい周回を始める', () => {
  const lastWeek = { ...wed(urls(3).map(ok), 3), generated_at: '2026-10-21T03:00:00Z' };
  const p = planInspection({ sitemap: urls(5), prior: lastWeek, mode: 'continue', now: NOW, cap: 3 });
  assert.equal(p.action, 'new');
  assert.deepEqual(p.toInspect, urls(3));
  assert.deepEqual(p.cycle, { startedAt: new Date(NOW).toISOString(), runs: 1 });
  assert.equal(planInspection({ sitemap: urls(5), prior: null, mode: 'continue', now: NOW }).action, 'new');
});

test('今週の完了 batch がある木曜・金曜は再検査しない', () => {
  const done = wed(urls(3).map(ok), 3);
  for (const now of [NOW, Date.parse('2026-10-30T02:10:00Z')]) {
    assert.equal(planInspection({ sitemap: urls(3), prior: done, mode: 'continue', now }).action, 'skip');
  }
});

test('続けられるのは cycle のある未完了の batch で、開始から 3 日以内だけ（旧来の時間切れの partial は続けない）', () => {
  const partial = wed([ok(urls(3)[0])], 3);
  assert.equal(continuable(partial, NOW), true);
  assert.equal(continuable(partial, Date.parse('2026-11-01T02:06:00Z')), false);
  const { cycle, ...legacy } = partial;
  assert.equal(cycle.runs, 1);
  assert.equal(continuable(legacy, NOW), false);
  assert.equal(continuable(null, NOW), false);
});

test('merge: sitemap の順に並べ、今回の結果を優先し、sitemap の件数に対して完了・未完了を決める（型に合う）', () => {
  const site = urls(4);
  const stale = { ...ok(site[1]), inspected_at: '2026-10-21T00:00:00Z' };
  const half = mergeBatch({ sitemap: site, carried: [ok(site[0]), stale], fresh: [ok(site[1])], cycle: { startedAt: '2026-10-28T02:05:00Z', runs: 2 }, generatedAt: '2026-10-29T03:00:00Z' });
  assert.deepEqual(half.results.map((r) => r.url), [site[0], site[1]]);
  assert.equal(half.results[1].inspected_at, '2026-10-28T02:30:00Z');
  assert.deepEqual([half.partial, half.completed, half.total], [true, 2, 4]);
  const full = mergeBatch({ sitemap: site, carried: half.results, fresh: [ok(site[3]), ok(site[2])], cycle: half.cycle, generatedAt: '2026-10-30T03:00:00Z' });
  assert.deepEqual(full.results.map((r) => r.url), site);
  assert.deepEqual([full.partial, full.completed, full.total], [false, 4, 4]);
  assert.equal(GscUrlInspection.safeParse(half).success, true);
  assert.equal(GscUrlInspection.safeParse(full).success, true);
});

test('check-coverage-thresholds: 未検査の残る行が履歴に積まれたら赤（上限の件数ではなく inspected と sitemap の差で見る）', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'coverage-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const run = (entry) => {
    const history = join(dir, 'history.json');
    writeFileSync(history, JSON.stringify([entry]));
    try {
      execFileSync(process.execPath, [join(ROOT, '.claude/scripts/check-coverage-thresholds.mjs'), '--history', history], { encoding: 'utf8', stdio: 'pipe' });
      return 0;
    } catch (e) {
      return e.status;
    }
  };
  const base = { date: '2026-10-30', indexed_ratio: 0.85, discovered_not_indexed: 10, not_found: 0, redirect: 0 };
  assert.equal(run({ ...base, sitemap_urls: 2017, inspected: 2017, indexed: 1714 }), 0);
  assert.equal(run({ ...base, sitemap_urls: 2017, inspected: 1900, indexed: 1714 }), 1);
});
