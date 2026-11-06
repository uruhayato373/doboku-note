import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { auditAdminPages } from '../scripts/lib/admin-pages.mjs';
import { REPO_ROOT as root } from '../scripts/lib/repository-paths.mjs';

const ledger = (pages, limit = 2) => ({ limit, pages });
const page = (question, kind = 'page') => ({ kind, question });

test('台帳どおりなら通る', () => {
  const l = ledger({ '/a': page('A は何か'), '/b': page('B は何か'), '/old': page('A へ転送', 'redirect') });
  assert.deepEqual(auditAdminPages(l, [{ route: '/a' }, { route: '/b' }, { route: '/old', redirects: true }]).errors, []);
});
test('台帳に無い画面と、台帳だけに残る画面を止める', () => {
  assert.match(auditAdminPages(ledger({}), [{ route: '/new' }]).errors[0], /台帳に無い画面/);
  assert.match(auditAdminPages(ledger({ '/gone': page('問い') }), []).errors[0], /台帳だけに残る画面/);
});
test('同じ問いの画面を止める', () => {
  const l = ledger({ '/a': page('同じ問い'), '/b': page('同じ問い') });
  assert.match(auditAdminPages(l, [{ route: '/a' }, { route: '/b' }]).errors[0], /同じ問いの画面/);
});
test('上限を超えた画面と、転送していない転送を止める', () => {
  const l = ledger({ '/a': page('A'), '/b': page('B') }, 1);
  assert.match(auditAdminPages(l, [{ route: '/a' }, { route: '/b' }]).errors[0], /上限を超えた/);
  assert.match(auditAdminPages(ledger({ '/x': page('転送', 'redirect') }), [{ route: '/x', redirects: false }]).errors[0], /転送と書いたが/);
});
test('転送と API は上限に数えない', () => {
  const l = ledger({ '/a': page('A'), '/x': page('転送', 'redirect'), '/api': page('画像', 'route') }, 1);
  assert.deepEqual(auditAdminPages(l, [{ route: '/a' }, { route: '/x', redirects: true }, { route: '/api' }]).errors, []);
});
test('実際の台帳は全ルートと合う', () => {
  assert.match(execFileSync('node', ['scripts/check-admin-pages.mjs'], { cwd: root, encoding: 'utf8' }), /違反 0 件/);
});
