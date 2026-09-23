/**
 * 公開ページの見え方検査の画面幅（.claude/config/public-view-breakpoints.json）と、切り替わり幅の数え方を固定する。
 * 「ブレイクポイントごとに撮る」を約束しているので、設定のどの帯にも撮る幅が 1 つあることをテストで保証する。
 */
import { strict as assert } from 'node:assert';
import test from 'node:test';
import { boundaryOf, significantBreakpoints, breakpointDrift, uncoveredBands, loadBreakpointConfig, contextOptions } from '../scripts/lib/public-view-browser.mjs';

test('min/max-width を「下の帯の最大幅」にそろえる（max 480 と min 481 は同じ境目）', () => {
  assert.equal(boundaryOf('max', 480), 480);
  assert.equal(boundaryOf('min', 481), 480);
  assert.equal(boundaryOf('max', 527.9), 527);
  assert.equal(boundaryOf('min', 528), 527);
});

test('主要な切り替わり幅: 同じ境目の規則数を合算し、少ないものと実機より狭いものは除く', () => {
  const counts = { 'max-480': 10, 'min-481': 10, 'min-769': 423, 'max-299': 40, 'min-1280': 2 };
  assert.deepEqual(significantBreakpoints(counts, { minRules: 15, minWidth: 320 }), [480, 768]);
});

test('設定との差: 増えた幅と消えた幅を返す', () => {
  assert.deepEqual(breakpointDrift([360, 480, 768], [480, 768, 1024]), { added: [1024], removed: [360] });
});

test('設定の note・YouTube とも、切り替わり幅で区切ったすべての帯に撮る画面幅がある', () => {
  const cfg = loadBreakpointConfig();
  for (const svc of ['note', 'youtube']) {
    assert.deepEqual(uncoveredBands(cfg[svc].breakpoints, cfg[svc].viewports, cfg.minDeviceWidth), [], `${svc} に撮らない帯がある`);
  }
  assert.deepEqual(uncoveredBands([480, 768], [{ width: 390 }, { width: 1280 }]), ['481〜768']);
});

test('端末の種類ごとに UA・タッチ・倍率を変える', () => {
  const cfg = loadBreakpointConfig();
  const phone = contextOptions({ width: 390, height: 844, device: 'phone' }, cfg);
  const pc = contextOptions({ width: 1280, height: 900, device: 'desktop' }, cfg);
  assert.equal(phone.isMobile, true); assert.equal(phone.deviceScaleFactor, 2); assert.match(phone.userAgent, /iPhone/);
  assert.equal(pc.isMobile, false); assert.equal(pc.deviceScaleFactor, 1); assert.match(pc.userAgent, /Macintosh/);
});

test('やり直す価値のあるステータス: 5xx と、アクセス制限の 403・429（404 は本当の欠落なのでやり直さない）', async () => {
  const { isRetryableStatus } = await import('../scripts/lib/public-view-browser.mjs');
  for (const s of [500, 503, 403, 429]) assert.equal(isRetryableStatus(s), true, String(s));
  for (const s of [200, 301, 404, 410]) assert.equal(isRetryableStatus(s), false, String(s));
});
