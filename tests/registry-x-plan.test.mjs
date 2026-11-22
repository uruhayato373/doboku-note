/**
 * X の月次計画ごとの承認（DN-0612 P7）を固定する。
 * - 計画の投稿を台帳の行に結び、1 投稿ずつ本文と日時のハッシュを持つ
 * - 承認したあと本文を変えた投稿だけ承認が外れ、ほかの投稿は承認済みのまま
 * - 予約に入れた後の行は書き換えない。台帳に結べない投稿があれば止める
 * - publish-x の関門は、承認が今の本文・日時に一致し、指定の日時が承認した日時と同じときだけ通す
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { approvedRow, xApprovalBlock, xPlanApproval } from '../scripts/lib/registry-x-plan.mjs';

const DIR = 'content/sns/x/draft/201-civil1-foo';
const md = (a, b) => `# 題\n\n## Tweet 01: 型\n\n${a}\n\n---\n\n## Tweet 02: 型\n\n${b}\n`;
const plan = { schemaVersion: 2, month: '2026-12', posts: [
  { date: '2026-12-02', time: '07:40', slot: 'A', frame: 'x-c1-restart-2027', draft: '201-civil1-foo', tweet: 1 },
  { date: '2026-12-03', time: '12:20', slot: 'B', frame: 'x-c1-restart-2027', draft: '201-civil1-foo', tweet: 2 },
] };
const row = (n, over = {}) => ({
  id: `civil-construction-1/civil1-foo/x.post.t0${n}`, exam: 'civil-construction-1', channel: 'x', work: 'civil1-foo', account: 'x:main', format: 'post',
  variant: `t0${n}`, legacyKey: `draft/201-civil1-foo#${n}`, copy: `${DIR}/tweets.md#tweet/${n}`, status: 'draft', ...over,
});

function repo(text1 = '本文 1', text2 = '本文 2') {
  const root = mkdtempSync(join(tmpdir(), 'x-plan-'));
  mkdirSync(join(root, DIR), { recursive: true });
  mkdirSync(join(root, 'content/sns/x/campaigns'), { recursive: true });
  writeFileSync(join(root, DIR, 'tweets.md'), md(text1, text2));
  writeFileSync(join(root, 'content/sns/x/campaigns/2026-12-civil1.json'), JSON.stringify(plan));
  return root;
}
const regOf = (publications) => ({ works: [], publications, media: [] });
const approveAll = (r) => r.toWrite.map((x) => ({ ...approvedRow(x, '2026-11-21T00:00:00.000Z', r.plan), exam: x.exam, channel: 'x' }));

test('計画の投稿を台帳に結び、未承認の行を承認の対象にする', () => {
  const root = repo();
  try {
    const r = xPlanApproval(root, '2026-12-civil1.json', { reg: regOf([row(1), row(2)]) });
    assert.deepEqual(r.unresolved, []);
    assert.equal(r.toWrite.length, 2);
    assert.match(r.digest, /^[0-9a-f]{64}$/);
    const w = approvedRow(r.toWrite[0], '2026-11-21T00:00:00.000Z', r.plan);
    assert.equal(w.status, 'approved');
    assert.equal(w.publishAt, '2026-12-02T07:40:00+09:00');
    assert.equal(w.planSlot, 'x-c1-restart-2027');
    assert.deepEqual(w.approval, { by: 'user', at: '2026-11-21T00:00:00.000Z', contentSha256: r.toWrite[0].hash, scope: 'x-plan:2026-12-civil1.json' });
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('承認したあと本文を変えた投稿だけ承認が外れる', () => {
  const root = repo();
  try {
    const approved = approveAll(xPlanApproval(root, '2026-12-civil1.json', { reg: regOf([row(1), row(2)]) }));
    const same = xPlanApproval(root, '2026-12-civil1.json', { reg: regOf(approved) });
    assert.equal(same.toWrite.length, 0);
    writeFileSync(join(root, DIR, 'tweets.md'), md('本文 1', '本文 2 を直した'));
    const changed = xPlanApproval(root, '2026-12-civil1.json', { reg: regOf(approved) });
    assert.deepEqual(changed.toWrite.map((x) => x.id), ['civil-construction-1/civil1-foo/x.post.t02']);
    assert.notEqual(changed.digest, same.digest);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('予約に入れた後の行は書き換えず、台帳に無い投稿は結べないとして返す', () => {
  const root = repo();
  try {
    const r = xPlanApproval(root, '2026-12-civil1.json', { reg: regOf([row(1, { status: 'scheduled', publishAt: '2026-12-02T07:40:00+09:00' })]) });
    assert.equal(r.toWrite.length, 0);
    assert.equal(r.rows[0].locked, true);
    assert.equal(r.unresolved.length, 1);
    assert.match(r.unresolved[0], /import-x --folder 201-civil1-foo/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('xApprovalBlock: 承認が今の本文と日時に一致し、指定の日時が同じ分のときだけ通す', () => {
  const root = repo();
  try {
    const [a1] = approveAll(xPlanApproval(root, '2026-12-civil1.json', { reg: regOf([row(1), row(2)]) }));
    const reg = regOf([a1]);
    assert.equal(xApprovalBlock(root, a1, { reg, scheduledAt: '2026-12-01T22:40:00.000Z' }), null);
    assert.match(xApprovalBlock(root, a1, { reg, scheduledAt: '2026-12-02T08:00:00+09:00' }), /承認した日時/);
    assert.match(xApprovalBlock(root, { ...a1, approval: { by: 'user', contentSha256: null, grandfathered: true } }, { reg }), /ハッシュが無い/);
    writeFileSync(join(root, DIR, 'tweets.md'), md('本文 1 を直した', '本文 2'));
    assert.match(xApprovalBlock(root, a1, { reg }), /本文か日時が変わった/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
