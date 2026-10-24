// 自動化の台帳（config/automations.json）と実物の照合（DN-0817）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkAutomations, plistSchedule, workflowTriggers } from '../scripts/check-automations.mjs';

const plist = (inner) => `<plist><dict><key>StartCalendarInterval</key><dict>${inner}</dict></dict></plist>`;

test('plist の時刻を台帳の書き方にする（曜日あり・毎日・読めない）', () => {
  assert.equal(plistSchedule(plist('<key>Weekday</key><integer>6</integer><key>Hour</key><integer>9</integer><key>Minute</key><integer>30</integer>')), '土 09:30');
  assert.equal(plistSchedule(plist('<key>Hour</key><integer>4</integer><key>Minute</key><integer>17</integer>')), '毎日 04:17');
  assert.equal(plistSchedule('<plist/>'), null);
});

test('ワークフローの on から起動条件と cron を読む', () => {
  assert.deepEqual(workflowTriggers({ on: { schedule: [{ cron: '0 1 * * *' }], workflow_dispatch: null } }), { triggers: ['schedule', 'workflow_dispatch'], crons: ['0 1 * * *'] });
  assert.deepEqual(workflowTriggers({ on: 'push' }), { triggers: ['push'], crons: [] });
});

test('台帳に無い実物・実物の無い行・cron の違い・CI のログイン・存在しない読み手を止める', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'automations-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, '.github', 'workflows'), { recursive: true });
  mkdirSync(join(root, 'scripts', 'scheduled'), { recursive: true });
  writeFileSync(join(root, '.github', 'workflows', 'a.yml'), 'on:\n  schedule:\n    - cron: "0 1 * * *"\n');
  writeFileSync(join(root, '.github', 'workflows', 'stray.yml'), 'on: push\n');
  writeFileSync(join(root, 'scripts', 'scheduled', 'com.x.weekly.plist.tmpl'), plist('<key>Weekday</key><integer>6</integer><key>Hour</key><integer>9</integer><key>Minute</key><integer>30</integer>'));
  const base = { purpose: 'p', title: 't', readers: ['human'] };
  const ledger = { automations: [
    { ...base, id: 'a', runner: 'github-actions', source: '.github/workflows/a.yml', triggers: ['schedule'], schedule: ['0 2 * * *'], login: ['note'] },
    { ...base, id: 'weekly', runner: 'mac-launchd', source: 'scripts/scheduled/com.x.weekly.plist.tmpl', triggers: ['launchd'], schedule: ['土 09:30'], login: ['note'], readers: ['quality-audit:nope'] },
    { ...base, id: 'gone', runner: 'github-actions', source: '.github/workflows/gone.yml', triggers: ['push'], schedule: [], login: [] },
  ] };
  const { problems, inspected } = checkAutomations({ root, ledger, checkIds: new Set(['weekly-collect']), datasetIds: new Set(), authServices: new Set(['note']) });
  assert.deepEqual(inspected, { entries: 3, workflows: 2, plists: 1 });
  const text = problems.join('\n');
  assert.match(text, /stray\.yml が台帳に無い/);
  assert.match(text, /gone: 実物/);
  assert.match(text, /a: cron が違う/);
  assert.match(text, /a: GitHub Actions はログインしない/);
  assert.match(text, /weekly: 読み手 quality-audit:nope/);
  assert.doesNotMatch(text, /weekly: launchd の時刻/);
});
