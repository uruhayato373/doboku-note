import assert from 'node:assert/strict';
import test from 'node:test';
import yaml from 'js-yaml';
import { auditMainWorkflows, calledByWorkflow, checksOutDevelop } from '../scripts/lib/main-workflow-paths.mjs';

const wf = (ref, runs) => yaml.load(`
on: { schedule: [{ cron: '0 0 * * *' }] }
jobs:
  a:
    steps:
      - uses: actions/checkout@abc
${ref ? `        with: { ref: "${ref}" }` : ''}
${runs.map((r) => `      - run: |\n          ${r.split('\n').join('\n          ')}`).join('\n')}
`);

test('develop を checkout する workflow だけを対象にする（式で選ぶ形も）', () => {
  assert.equal(checksOutDevelop(wf('develop', ['echo'])), true);
  assert.equal(checksOutDevelop(wf("${{ github.event_name == 'schedule' && 'develop' || github.ref }}", ['echo'])), true);
  assert.equal(checksOutDevelop(wf('', ['echo'])), false);
  assert.equal(checksOutDevelop(wf('main', ['echo'])), false);
});

test('run の本文からリポジトリ内のファイルと npm script を抜き出す', () => {
  const doc = wf('develop', [
    'node scripts/a.mjs --ci',
    'node legacy/scripts/b.mjs plan --out .tmp/x.txt \\\n  && node --max-old-space-size=4096 scripts/sub/c.cjs',
    'npm run refresh-indexes && npm run -s quality:audit:ci -- --only x',
    'bash scripts/scheduled/d.sh; node .tmp/generated.mjs; node /tmp/e.mjs',
  ]);
  const r = calledByWorkflow(doc);
  assert.deepEqual(r.files.sort(), ['legacy/scripts/b.mjs', 'scripts/a.mjs', 'scripts/scheduled/d.sh', 'scripts/sub/c.cjs']);
  assert.deepEqual(r.npm.sort(), ['quality:audit:ci', 'refresh-indexes']);
});

test('working-directory のある step は、その場所からのパスとして読む', () => {
  const doc = yaml.load("jobs: { a: { steps: [{ uses: 'actions/checkout@x', with: { ref: develop } }, { run: 'node build.mjs', 'working-directory': 'tools/x' }] } }");
  assert.deepEqual(calledByWorkflow(doc).files, ['tools/x/build.mjs']);
});

test('main の定義が呼ぶパスをいまのツリーから消すと違反になる（2026-11-19 の集約の形）', () => {
  const workflows = [
    { name: 'sched.yml', doc: wf('develop', ['node legacy/scripts/build-doc-meta-index.mjs --ci', 'npm run gone']) },
    { name: 'main-only.yml', doc: wf('', ['node legacy/scripts/whatever.mjs']) },
  ];
  const moved = auditMainWorkflows(workflows, (p) => !p.startsWith('legacy/'), { other: 'x' });
  assert.deepEqual(moved.inScope, ['sched.yml']);
  assert.deepEqual(moved.missing, [
    { workflow: 'sched.yml', kind: 'file', target: 'legacy/scripts/build-doc-meta-index.mjs' },
    { workflow: 'sched.yml', kind: 'npm', target: 'gone' },
  ]);
  const shimmed = auditMainWorkflows(workflows, () => true, { gone: 'x' });
  assert.deepEqual(shimmed.missing, []);
  assert.equal(shimmed.files, 1);
  assert.equal(shimmed.npm, 1);
});
