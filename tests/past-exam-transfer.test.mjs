import test from 'node:test';
import assert from 'node:assert/strict';
import { pendingFiles, jstDate } from '../scripts/past-exam-fetch.mjs';
import { buildPlan, findRemote } from '../scripts/drive-browser-transfer.mjs';

const cfg = { groups: [
  { id: 'past-exam-source-pdf', status: 'active', match: { pathRegex: '^content/sources/past-exams/[^/]+/[^/]+/[^/]+\\.pdf$' }, vaultDir: '原資料PDF/過去問', keyFrom: 'stripPrefix:content/sources/past-exams/' },
  { id: 'textbook-source-pdf', status: 'active', match: { pathRegex: '^content/sources/textbook/.+\\.pdf$' }, vaultDir: '原資料PDF/教材', keyFrom: 'stripPrefix:content/sources/textbook/' },
] };

test('pendingFiles は sourceUrl があり未取得の行だけを資格・年度で絞って返す', () => {
  const inv = { exams: {
    surveyor: { dir: 'content/sources/past-exams/測量士', years: [
      { year: 2026, files: [{ file: 'R08/a.pdf', sourceUrl: 'https://x/a.pdf', acquiredAt: null }, { file: 'R08/b.pdf', sourceUrl: 'https://x/b.pdf', acquiredAt: '2026-09-29' }] },
      { year: 2025, files: [{ file: 'R07/c.pdf', sourceUrl: null, acquiredAt: null }, { file: 'R07/d.pdf', sourceUrl: 'https://x/d.pdf', acquiredAt: null }] },
    ] },
    'pavement-1': { dir: 'content/sources/past-exams/１級舗装施工管理技術者', years: [{ year: 2026, files: [{ file: 'R08/e.pdf', sourceUrl: 'https://x/e.pdf', acquiredAt: null }] }] },
  } };
  assert.deepEqual(pendingFiles(inv).map((t) => t.repoPath), [
    'content/sources/past-exams/測量士/R08/a.pdf', 'content/sources/past-exams/測量士/R07/d.pdf', 'content/sources/past-exams/１級舗装施工管理技術者/R08/e.pdf',
  ]);
  assert.equal(pendingFiles(inv, { exam: 'surveyor', year: 2026 }).length, 1);
});

test('jstDate は UTC の夜でも JST の日付を返す', () => {
  assert.equal(jstDate(new Date('2026-09-29T16:00:00Z')), '2026-09-30');
});

test('buildPlan は Drive 台帳に無い group 内のファイルだけを vault フォルダごとに束ねる', () => {
  const plan = buildPlan('past-exam-source-pdf', [
    'content/sources/past-exams/測量士/R08/a.pdf',
    'content/sources/past-exams/測量士/R08/b.pdf',
    'content/sources/past-exams/測量士/R07/c.pdf',
    'content/sources/textbook/本/x.pdf',
  ], { cfg, manifest: { entries: { 'content/sources/past-exams/測量士/R08/b.pdf': { group: 'past-exam-source-pdf' } } } });
  assert.deepEqual(plan.folders, [
    { vaultPath: '原資料PDF/過去問/測量士/R07', folderId: null, files: ['content/sources/past-exams/測量士/R07/c.pdf'] },
    { vaultPath: '原資料PDF/過去問/測量士/R08', folderId: null, files: ['content/sources/past-exams/測量士/R08/a.pdf'] },
  ]);
  assert.throws(() => buildPlan('nope', [], { cfg, manifest: { entries: {} } }));
});

test('findRemote は同じフォルダの同名 1 件だけを返し、重複や別フォルダは null', () => {
  const listing = [
    { id: '1', parentId: 'F', title: 'a.pdf' },
    { id: '2', parentId: 'G', title: 'a.pdf' },
    { id: '3', parentId: 'F', title: 'b.pdf' }, { id: '4', parentId: 'F', title: 'b.pdf' },
  ];
  assert.equal(findRemote(listing, 'F', 'a.pdf').id, '1');
  assert.equal(findRemote(listing, 'F', 'b.pdf'), null);
  assert.equal(findRemote(listing, 'F', 'c.pdf'), null);
});
