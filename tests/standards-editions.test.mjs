import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';
import { datasetPath } from '../scripts/lib/datasets.mjs';
import { analyzeDocument, getCatalog } from '../scripts/lib/standards-structure.mjs';
import { editionDuplicateOf, validateEditionCanonical } from '../src/lib/standards-editions.mjs';

// 工事必携の要綱は九州・沖縄・近畿の冊子に同じものが入る（原本 PDF が別物なので SHA-256 では拾えない）。
// 設定 editionCanonical の 1 本だけを索引に載せ、他を noindex にする判定と、章を目次（outline）で切る仕組みの見張り。

const config = JSON.parse(readFileSync(join(REPO_ROOT, datasetPath('config.standards-structure')), 'utf8'));
const catalog = getCatalog();
const documentKeys = new Set(catalog.documents.map((d) => `${d.agencyId}/${d.documentId}`));

test('設定 editionCanonical が catalog と整合し、同じ収録が 2 つの群に入っていない', () => {
  assert.deepEqual(validateEditionCanonical(config, documentKeys), []);
  assert.ok((config.editionCanonical?.groups ?? []).length > 0, '群が 0 件（検査が成立しない）');
});

test('canonical でない文書だけが重複になり、冊子の項目は文書全体の索引を変えない', () => {
  assert.equal(editionDuplicateOf(config, 'okinawa/hikkei-07')?.canonical.document, 'kyushu/hikkei-common-10');
  assert.equal(editionDuplicateOf(config, 'kyushu/hikkei-common-10'), null);
  // 近畿の必携は 14 項（公衆災害防止対策要綱）だけが重複。冊子まるごとは索引に残る
  assert.equal(editionDuplicateOf(config, 'kinki/hikkei'), null);
  assert.equal(editionDuplicateOf(config, 'kinki/hikkei', 14)?.group.title, '建設工事公衆災害防止対策要綱');
});

test('設定の誤り（catalog に無い文書・2 群への重複・理由の欠け）を検出する', () => {
  const broken = {
    editionCanonical: {
      groups: [
        { title: 'A', canonical: { document: 'kyushu/hikkei-common-10', edition: 'R1' }, others: [{ document: 'okinawa/hikkei-07', edition: 'R1', reason: 'x' }] },
        { title: 'B', canonical: { document: 'nowhere/doc', edition: 'R1' }, others: [{ document: 'okinawa/hikkei-07', edition: 'R1' }] },
      ],
    },
  };
  const errors = validateEditionCanonical(broken, documentKeys);
  assert.ok(errors.some((e) => e.includes('nowhere/doc は catalog に無い')), errors.join('\n'));
  assert.ok(errors.some((e) => e.includes('okinawa/hikkei-07 が 2 つの群に入っている')), errors.join('\n'));
  assert.ok(errors.some((e) => e.includes('理由（reason）が空')), errors.join('\n'));
});

test('目次（outline）の項目が本文に無ければ解析を止める（黙って章を作らない）', () => {
  const document = catalog.documents.find((d) => d.agencyId === 'kyushu' && d.documentId === 'hikkei-common-09');
  const override = config.documents['kyushu/hikkei-common-09'];
  const broken = {
    ...config,
    documents: {
      ...config.documents,
      'kyushu/hikkei-common-09': { ...override, outline: [...override.outline, { page: 20, match: '第99章 存在しない章' }] },
    },
  };
  assert.throws(() => analyzeDocument(document, broken), /outline「第99章 存在しない章」が p20 の 0 行に一致/);
  // 正しい設定では行の割り当て漏れ・rejects・review が 0
  const analysis = analyzeDocument(document, config);
  assert.equal(analysis.audit.unassignedLines, 0);
  assert.equal(analysis.rejects.length, 0);
  assert.equal(analysis.reviewQueue.length, 0);
  assert.equal(analysis.chapters.length, 19);
});
