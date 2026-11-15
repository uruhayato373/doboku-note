import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { execPath } from 'node:process';

test('ページ一覧は公開対象の本文を重複なく列挙し、旧面と新面の可視表示を合算する', () => {
  const script = `
    import { getAffiliatePages, pageImpressions } from './tools/admin-app/src/lib/affiliate-pages.ts';
    import { getStandardDocuments } from './src/lib/standards.ts';
    import { getStandardChapters, isStandardChapterMerged, standardChapterPath } from './src/lib/standards-articles.ts';
    import { standardSectionPath } from './src/lib/standards-section-split.mjs';
    const expected = getStandardDocuments().filter(d => !isStandardChapterMerged(d.agencyId,d.documentId)).flatMap(d => getStandardChapters(d.agencyId,d.documentId).flatMap(c => c.splitBySection ? c.sections.map(s => standardSectionPath(d,c,s.number)) : [standardChapterPath(d,c)]));
    const data = await getAffiliatePages(Date.parse('2026-11-16T00:00:00+09:00'));
    const counts = pageImpressions([
      {page:'/standards/a/',placement:'standards-sidebar',eventName:'affiliate_cta_impression',eventCount:2},
      {page:'/standards/a',placement:'standards-rail',eventName:'affiliate_cta_impression',eventCount:3},
      {page:'/standards/a',placement:'standards-rail',eventName:'affiliate_cta_impression',eventCount:4},
      {page:'/standards/a',placement:'standards-rail',eventName:'affiliate_cta_click',eventCount:99}
    ]);
    process.stdout.write(JSON.stringify({ expected, paths:data.pages.filter(p=>p.pageKind==='standards').map(p=>p.path), articleCount:data.pages.filter(p=>p.pageKind==='doc').length, total:data.pages.length, distribution:data.distribution, example:data.pages.find(p=>p.path==='/standards/mlit/sekou-kanri-kijun/chapters/2-1'), counts:[...counts.get('/standards/a')] }));
  `;
  const data = JSON.parse(execFileSync(execPath, ['--conditions=react-server', '--import', 'tsx', '--input-type=module', '-e', script], { encoding: 'utf8' }));
  assert.ok(data.paths.length > 0);
  assert.ok(data.articleCount > 1500);
  assert.deepEqual([...data.paths].sort(), data.expected.sort());
  assert.equal(new Set(data.paths).size, data.paths.length);
  assert.equal(data.distribution.reduce((a, b) => a + b, 0), data.total);
  assert.equal(data.example.insertAt.length, 3);
  assert.equal(data.example.programs.find(p => p.slot === 'standards-rail').program, 'buildjob');
  assert.equal(data.example.programs.find(p => p.slot === 'standards-rail-2').program, 'kensetsu-jobs');
  assert.equal(data.example.programs.find(p => p.slot === 'standards-rail-3').program, 'dainishinsotsu-agent-neo');
  assert.ok(data.example.programs.every(p => !p.program.includes('⇄')));
  assert.deepEqual(data.counts, [['standards-sidebar', 2], ['standards-rail', 7]]);
});


test('基準書の右欄の新しい面は PC の見本ページを持つ', () => {
  const script = `
    import { affiliatePreviewSurfaces } from './tools/admin-app/src/lib/affiliate.ts';
    process.stdout.write(JSON.stringify(affiliatePreviewSurfaces().filter(s => s.slot.includes('standards') && s.slot.includes('rail'))));
  `;
  const surfaces = JSON.parse(execFileSync(execPath, ['--conditions=react-server', '--import', 'tsx', '--input-type=module', '-e', script], { encoding: 'utf8' }));
  assert.equal(surfaces.length, 6);
  for (const surface of surfaces) {
    assert.deepEqual(surface.widths, ['pc']);
    assert.equal(surface.path, surface.slot.startsWith('standards-list') ? '/standards' : '/standards/mlit/sekou-kanri-kijun/chapters/2-1');
    assert.doesNotMatch(surface.label, /固定|出し分け/);
  }
});
