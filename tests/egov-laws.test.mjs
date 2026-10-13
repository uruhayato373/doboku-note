import { strict as assert } from 'node:assert';
import test from 'node:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { egovLinksOf, linkIssues, registryIssues, amendedSince, isLawSource } from '../scripts/lib/egov-laws.mjs';
import { readDataset } from '../scripts/lib/dataset-io.mjs';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

const laws = {
  '327AC1000000180': { title: '道路法', lawNum: '昭和二十七年法律第百八十号', enforced: '2026-07-23', articles: ['1', '32', '32_2'] },
};

test('egovLinksOf: 法令 ID と条のアンカーを行番号つきで拾う', () => {
  const text = '前文\n[道路法第32条の2](https://laws.e-gov.go.jp/law/327AC1000000180#Mp-At_32_2)と[道路法](https://laws.e-gov.go.jp/law/327AC1000000180)';
  assert.deepEqual(egovLinksOf(text), [
    { lawId: '327AC1000000180', article: '32_2', line: 2 },
    { lawId: '327AC1000000180', article: null, line: 2 },
  ]);
});

test('linkIssues: 写しに無い法令 ID と、無い条を止める（e-Gov の画面は無い ID でも 200 を返す）', () => {
  const dir = mkdtempSync(join(tmpdir(), 'egov-'));
  const f = join(dir, 'a.mdx');
  writeFileSync(f, '[x](https://laws.e-gov.go.jp/law/327AC0000000180#Mp-At_18)\n[y](https://laws.e-gov.go.jp/law/327AC1000000180#Mp-At_99)\n[z](https://laws.e-gov.go.jp/law/327AC1000000180#Mp-At_32)');
  const { issues, links } = linkIssues([{ abs: f, rel: 'a.mdx' }], laws);
  assert.equal(links, 3);
  assert.equal(issues.length, 2);
  assert.match(issues[0], /327AC0000000180 が e-Gov の写しに無い/);
  assert.match(issues[1], /道路法 に条 99 が無い/);
});

test('registryIssues: 法令には e-Gov の法令 ID か、無い理由が要る', () => {
  const sources = [
    { id: 'road-act', title: '道路法', class: 'external-primary', egov: { lawId: '327AC1000000180' } },
    { id: 'river-act', title: '河川法', class: 'external-primary' },
    { id: 'work-style-reform-act', title: '働き方改革関連法', class: 'external-primary', egov: { none: '改正法の通称' } },
    { id: 'x-act', title: 'X', class: 'external-primary', egov: { lawId: '999AC0000000001' } },
    { id: 'jsce-concrete-spec-construction', title: '示方書', class: 'external-primary' },
  ];
  assert.equal(isLawSource(sources[4]), false);
  const { issues, checked } = registryIssues(sources, laws);
  assert.equal(checked, 4);
  assert.deepEqual(issues.map((x) => x.split(' ')[1]), ['river-act（河川法）:', 'x-act（X）:']);
});

test('amendedSince: 写しより後に施行された改正だけを出す（取得失敗は数えない）', () => {
  const fresh = { '327AC1000000180': { title: '道路法', enforced: '2027-04-01' }, '999AC0000000001': { error: 'x' } };
  assert.deepEqual(amendedSince(laws, fresh), [{ lawId: '327AC1000000180', title: '道路法', before: '2026-07-23', now: '2027-04-01' }]);
  assert.deepEqual(amendedSince(laws, { '327AC1000000180': { title: '道路法', enforced: '2026-07-23' } }), []);
});

test('実データ: 参考文献の台帳の法令はすべて e-Gov の法令 ID（か無い理由）を持ち、写しにある', () => {
  const sources = readDataset(REPO_ROOT, 'config.reference-sources').sources;
  const { issues, checked } = registryIssues(sources, readDataset(REPO_ROOT, 'config.egov-laws').laws);
  assert.ok(checked > 0);
  assert.deepEqual(issues, []);
});
