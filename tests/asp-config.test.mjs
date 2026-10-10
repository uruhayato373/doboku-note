import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { withSharedConnection } from '../scripts/lib/asp-config.mjs';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

// A8 の URL・口座・ブラウザの共通部分は config/a8-report-automation.json が正本。
// affiliate-asp.json の a8 には写さず、読み出し時に合成する（二重に持つと URL 移行で片方が取り残される）。
const readJson = (rel) => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));

const report = {
  a8: { baseUrl: 'https://a8.example', homePath: '/home', reAuthPattern: 'login', mediaId: 'a123' },
  browser: { authService: 'a8', channel: 'chrome', headless: false, timeoutMs: 30000 },
};
const read = (id) => (id === 'config.a8-report-automation' ? report : null);
const base = () => ({
  targetSiteName: 'x',
  asps: {
    a8: { label: 'A8', connectionFrom: 'config.a8-report-automation', siteSeparation: 'none', partneredPath: '/p', browser: { sessionPersistsAcrossProcesses: true } },
    afb: { label: 'afb', baseUrl: 'https://afb.example', browser: { authService: 'afb' } },
  },
});

test('a8 の接続（URL・口座・ブラウザ）を a8-report-automation の値から合成し、自分の値は残す', () => {
  const a8 = withSharedConnection(base(), read).asps.a8;
  assert.equal(a8.baseUrl, 'https://a8.example');
  assert.equal(a8.homePath, '/home');
  assert.equal(a8.reAuthPattern, 'login');
  assert.equal(a8.accountId, 'a123', 'accountId は a8-report-automation の mediaId');
  assert.deepEqual(a8.browser, { authService: 'a8', channel: 'chrome', headless: false, timeoutMs: 30000, sessionPersistsAcrossProcesses: true });
  assert.equal(a8.partneredPath, '/p');
  assert.equal(a8.siteSeparation, 'none');
});

test('ほかの ASP と connectionFrom の無い設定はそのまま、入力は書き換えない', () => {
  const cfg = base();
  const out = withSharedConnection(cfg, read);
  assert.deepEqual(out.asps.afb, cfg.asps.afb);
  assert.equal('baseUrl' in cfg.asps.a8, false, '入力を書き換えている');
  const noRef = { asps: { a8: { baseUrl: 'https://own.example' } } };
  assert.equal(withSharedConnection(noRef, read), noRef);
});

test('a8 に接続の写しが書かれていたら、黙って上書きせず例外で止める', () => {
  for (const [key, value] of [['baseUrl', 'https://old.example'], ['homePath', '/x'], ['reAuthPattern', 'x'], ['accountId', 'a999']]) {
    const cfg = base();
    cfg.asps.a8[key] = value;
    assert.throws(() => withSharedConnection(cfg, read), new RegExp(key), key);
  }
  const cfg = base();
  cfg.asps.a8.browser.channel = 'msedge';
  assert.throws(() => withSharedConnection(cfg, read), /browser に channel/);
});

test('参照先の設定が読めなければ例外（黙って空の接続にしない）', () => {
  assert.throws(() => withSharedConnection(base(), () => ({ a8: {}, browser: {} })), /接続.*読めない/);
});

test('実リポジトリ: a8 の接続は a8-report-automation.json と一致し、affiliate-asp.json に写しが無い', () => {
  const raw = readJson('config/affiliate-asp.json');
  const report2 = readJson('config/a8-report-automation.json');
  for (const k of ['baseUrl', 'homePath', 'reAuthPattern', 'accountId']) assert.equal(k in raw.asps.a8, false, `affiliate-asp.json の a8 に ${k} の写しがある`);
  const a8 = withSharedConnection(raw).asps.a8;
  assert.equal(a8.baseUrl, report2.a8.baseUrl);
  assert.equal(a8.homePath, report2.a8.homePath);
  assert.equal(a8.reAuthPattern, report2.a8.reAuthPattern);
  assert.equal(a8.accountId, report2.a8.mediaId);
  assert.equal(a8.browser.authService, 'a8', 'check-affiliate-wiring が ASP 名と一致を見る');
  for (const [k, v] of Object.entries(report2.browser)) assert.deepEqual(a8.browser[k], v, `browser.${k}`);
  // もしも・afb は従来どおり自分で持つ（A8 の合成が影響しない）
  assert.deepEqual(withSharedConnection(raw).asps.afb, raw.asps.afb);
  assert.deepEqual(withSharedConnection(raw).asps.moshimo, raw.asps.moshimo);
});
